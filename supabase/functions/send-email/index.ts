/**
 * Edge Function · send-email
 *
 * Envio transacional. O documento clínico NÃO vai como anexo: vai um link
 * assinado com validade curta, que exige o navegador do responsável.
 * E-mail atravessa servidores que a clínica não controla; um PDF de laudo
 * anexado fica em caixa postal, backup e índice de busca de terceiro para
 * sempre.
 *
 * Secrets: EMAIL_API_KEY, EMAIL_FROM, EMAIL_PROVIDER_URL, APP_ORIGIN
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

const ALLOWED_TEMPLATES = new Set([
  'documento_disponivel',
  'confirmacao_consulta',
  'anamnese_previa',
  'recibo',
]);

/** Validade do link de acesso ao documento. */
const LINK_TTL_SECONDS = 72 * 60 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
    .from('usuarios').select('id, role, nome').eq('auth_id', auth.user.id).maybeSingle();

  if (!profile || !['doctor', 'reception', 'admin'].includes(profile.role)) {
    return json({ error: 'Seu perfil não pode enviar e-mails.' }, 403);
  }

  let payload: {
    pacienteId?: string;
    responsavelId?: string;
    template?: string;
    assunto?: string;
    documentoId?: string;
    variaveis?: Record<string, string>;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const { pacienteId, responsavelId, template, assunto, documentoId, variaveis = {} } = payload;

  if (!template || !ALLOWED_TEMPLATES.has(template)) {
    return json({ error: 'Modelo de e-mail não permitido.' }, 400);
  }

  const { data: consent } = await supabase
    .from('consentimentos')
    .select('id')
    .eq('paciente_id', pacienteId)
    .eq('finalidade', 'comunicacao_email')
    .is('revogado_em', null)
    .not('concedido_em', 'is', null)
    .maybeSingle();

  if (!consent) {
    return json({
      error: 'Não há consentimento vigente para comunicação por e-mail com esta família.',
    }, 403);
  }

  const { data: guardian } = await supabase
    .from('responsaveis').select('email, nome, autorizacoes').eq('id', responsavelId).maybeSingle();

  if (!guardian?.email) {
    return json({ error: 'O responsável não tem e-mail cadastrado.' }, 400);
  }

  // Documento só vai para quem tem autorização explícita de recebê-lo.
  if (documentoId && guardian.autorizacoes?.receberDocumentos !== true) {
    return json({
      error: 'Este responsável não está autorizado a receber documentos clínicos.',
    }, 403);
  }

  // ——— Link assinado, curto, em vez de anexo ———
  let link: string | null = null;
  if (documentoId) {
    const { data: doc } = await supabase
      .from('documentos').select('id, blob_id:hash_conteudo').eq('id', documentoId).maybeSingle();
    if (!doc) return json({ error: 'Documento não encontrado.' }, 404);

    const { data: signed, error: signError } = await supabase.storage
      .from('anexos')
      .createSignedUrl(`documentos/${documentoId}.pdf`, LINK_TTL_SECONDS);

    if (signError) {
      console.error('[send-email] falha ao gerar link', signError.message);
      return json({ error: 'Não foi possível preparar o documento para envio.' }, 500);
    }
    link = signed.signedUrl;
  }

  const apiKey = Deno.env.get('EMAIL_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  const providerUrl = Deno.env.get('EMAIL_PROVIDER_URL');
  if (!apiKey || !from || !providerUrl) {
    return json({ error: 'O provedor de e-mail não está configurado no servidor.' }, 503);
  }

  const nome = escapeHtml(String(variaveis.primeiroNome ?? guardian.nome ?? ''));
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0f1012;max-width:520px">
      <p>Olá${nome ? `, ${nome}` : ''}.</p>
      ${link
        ? `<p>Um documento da consulta está disponível. O link abaixo é pessoal e
             expira em 72 horas.</p>
           <p><a href="${escapeHtml(link)}"
                 style="display:inline-block;padding:12px 20px;background:#0f1012;color:#fff;
                        border-radius:999px;text-decoration:none">Abrir documento</a></p>`
        : `<p>${escapeHtml(String(variaveis.mensagem ?? ''))}</p>`}
      <p style="color:#868788;font-size:13px;margin-top:28px">
        Clínica Dr. Charlington M. Cavalcante — Neurologia Infantil.<br>
        Esta mensagem não contém informação clínica. Em caso de dúvida, fale com a recepção.
      </p>
    </div>
  `;

  try {
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [guardian.email],
        subject: assunto ?? 'Mensagem da clínica',
        html,
      }),
    });

    if (!response.ok) {
      console.error('[send-email] provedor recusou', response.status);
      return json({ error: 'O provedor de e-mail recusou o envio.' }, 502);
    }

    const result = await response.json().catch(() => ({}));

    await supabase.from('auditoria').insert({
      usuario_id: profile.id,
      papel: profile.role,
      acao: 'SEND',
      entidade: 'mensagens',
      entidade_id: pacienteId ?? null,
      detalhe: `canal=email template=${template}${documentoId ? ' com link de documento' : ''}`,
      hash_anterior: 'SERVER',
      hash: `srv-${crypto.randomUUID()}`,
    });

    return json({ messageId: result.id ?? null, sentAt: new Date().toISOString() });
  } catch (error) {
    console.error('[send-email] erro inesperado', error);
    return json({ error: 'Não foi possível enviar o e-mail.' }, 502);
  }
});
