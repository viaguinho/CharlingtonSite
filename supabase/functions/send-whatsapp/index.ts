/**
 * Edge Function · send-whatsapp
 *
 * Envio por WhatsApp Cloud API (Meta). Duas regras que o servidor impõe e o
 * cliente não pode contornar:
 *
 *  1. CONSENTIMENTO. Sem consentimento vigente de comunicação por WhatsApp
 *     registrado para aquela criança, a função recusa. É o art. 14 da LGPD:
 *     dado de criança exige consentimento específico do responsável.
 *
 *  2. NADA DE CONTEÚDO CLÍNICO. Apenas modelos (HSM) previamente aprovados
 *     são aceitos, e o corpo livre é rejeitado. Mensagem de WhatsApp fica no
 *     aparelho, na nuvem da Meta e na tela de bloqueio de quem estiver por
 *     perto — diagnóstico não vai por ali. Documento se entrega por link
 *     autenticado.
 *
 * Secrets: WHATSAPP_PHONE_ID, WHATSAPP_TOKEN, APP_ORIGIN
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

/** Modelos aprovados. Qualquer nome fora desta lista é recusado. */
const ALLOWED_TEMPLATES = new Set([
  'confirmacao_consulta',
  'lembrete_vespera',
  'documento_disponivel',
  'sugestao_retorno',
  'aniversario',
]);

/** Parâmetros que jamais podem ir numa mensagem. */
const FORBIDDEN_KEYS = [
  'diagnostico', 'cid', 'medicacao', 'prescricao', 'laudo',
  'evolucao', 'escore', 'conteudo',
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado.' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return json({ error: 'Sessão inválida.' }, 401);

  const { data: profile } = await supabase
    .from('usuarios').select('id, role').eq('auth_id', auth.user.id).maybeSingle();

  if (!profile || !['doctor', 'reception', 'admin'].includes(profile.role)) {
    return json({ error: 'Seu perfil não pode enviar mensagens.' }, 403);
  }

  let payload: {
    pacienteId?: string;
    responsavelId?: string;
    template?: string;
    parametros?: Record<string, string>;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const { pacienteId, responsavelId, template, parametros = {} } = payload;

  if (!pacienteId || !responsavelId) {
    return json({ error: 'Paciente e responsável são obrigatórios.' }, 400);
  }
  if (!template || !ALLOWED_TEMPLATES.has(template)) {
    return json({
      error: 'Modelo não aprovado. Só é possível enviar modelos previamente aprovados pela Meta.',
    }, 400);
  }

  // ——— Nenhum parâmetro pode carregar conteúdo clínico ———
  const offending = Object.keys(parametros).filter(
    (key) => FORBIDDEN_KEYS.some((f) => key.toLowerCase().includes(f)),
  );
  if (offending.length) {
    console.warn('[send-whatsapp] tentativa de enviar conteúdo clínico', offending);
    return json({
      error: 'Mensagens não podem conter informação clínica. Envie um link autenticado.',
    }, 400);
  }

  // ——— Consentimento vigente ———
  const { data: consent } = await supabase
    .from('consentimentos')
    .select('id, concedido_em, revogado_em')
    .eq('paciente_id', pacienteId)
    .eq('finalidade', 'comunicacao_whatsapp')
    .is('revogado_em', null)
    .not('concedido_em', 'is', null)
    .maybeSingle();

  if (!consent) {
    return json({
      error: 'Não há consentimento vigente para comunicação por WhatsApp com esta família.',
    }, 403);
  }

  // ——— Telefone do responsável ———
  const { data: guardian } = await supabase
    .from('responsaveis').select('telefone, nome').eq('id', responsavelId).maybeSingle();

  if (!guardian?.telefone) {
    return json({ error: 'O responsável não tem telefone cadastrado.' }, 400);
  }

  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
  const token = Deno.env.get('WHATSAPP_TOKEN');
  if (!phoneId || !token) {
    return json({ error: 'A integração com o WhatsApp não está configurada no servidor.' }, 503);
  }

  const to = `55${String(guardian.telefone).replace(/\D/g, '')}`;

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: 'pt_BR' },
          components: [{
            type: 'body',
            parameters: Object.values(parametros).map((text) => ({ type: 'text', text })),
          }],
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[send-whatsapp] recusado pela Meta', response.status, result?.error?.code);
      return json({ error: 'O WhatsApp recusou o envio.' }, 502);
    }

    await supabase.from('auditoria').insert({
      usuario_id: profile.id,
      papel: profile.role,
      acao: 'SEND',
      entidade: 'mensagens',
      entidade_id: pacienteId,
      detalhe: `canal=whatsapp template=${template}`,
      hash_anterior: 'SERVER',
      hash: `srv-${crypto.randomUUID()}`,
    });

    return json({
      messageId: result.messages?.[0]?.id ?? null,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[send-whatsapp] erro inesperado', error);
    return json({ error: 'Não foi possível enviar a mensagem.' }, 502);
  }
});
