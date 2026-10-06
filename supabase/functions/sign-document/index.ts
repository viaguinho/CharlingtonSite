/**
 * Edge Function · sign-document
 *
 * Este arquivo é o BFF da assinatura digital, e existe por um motivo só:
 * manter a credencial do provedor fora do navegador.
 *
 * No painel anterior, `admin.js` trazia isto no código entregue a qualquer
 * visitante:
 *
 *     const SIGNATURE_API_CONFIG = {
 *       birdid: { clientId: "...", clientSecret: "...", cpf: "00361562306" }
 *     }
 *
 * Qualquer pessoa com o painel aberto lia o segredo do Bird ID e o CPF do
 * médico no DevTools. Aqui, o cliente envia apenas:
 *
 *     { provider, hash, pin, documentType }
 *
 * — o resumo SHA-256 do documento e o código que o próprio médico acabou de
 * digitar. O `client_secret` e o CPF do certificado vivem em variáveis de
 * ambiente da função, no servidor, e nunca saem dele.
 *
 * Variáveis de ambiente necessárias (Supabase › Edge Functions › Secrets):
 *   BIRDID_BASE_URL, BIRDID_CLIENT_ID, BIRDID_CLIENT_SECRET, BIRDID_CPF, BIRDID_ALIAS
 *   VIDAAS_BASE_URL, VIDAAS_CLIENT_ID, VIDAAS_CLIENT_SECRET, VIDAAS_CPF
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

const PROVIDERS = {
  birdid: {
    baseUrl: Deno.env.get('BIRDID_BASE_URL'),
    clientId: Deno.env.get('BIRDID_CLIENT_ID'),
    clientSecret: Deno.env.get('BIRDID_CLIENT_SECRET'),
    cpf: Deno.env.get('BIRDID_CPF'),
    alias: Deno.env.get('BIRDID_ALIAS'),
    label: 'Bird ID',
  },
  vidaas: {
    baseUrl: Deno.env.get('VIDAAS_BASE_URL'),
    clientId: Deno.env.get('VIDAAS_CLIENT_ID'),
    clientSecret: Deno.env.get('VIDAAS_CLIENT_SECRET'),
    cpf: Deno.env.get('VIDAAS_CPF'),
    alias: Deno.env.get('VIDAAS_ALIAS'),
    label: 'VIDaaS',
  },
} as const;

const SHA256_HEX = /^[0-9a-f]{64}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  // ——— 1. Autenticação: só usuário logado no painel assina ———
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado.' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) return json({ error: 'Sessão inválida.' }, 401);

  // ——— 2. Autorização: só o médico assina documento clínico ———
  const { data: profile } = await supabase
    .from('usuarios')
    .select('id, nome, role, crm')
    .eq('auth_id', auth.user.id)
    .maybeSingle();

  if (!profile || !['doctor', 'admin'].includes(profile.role)) {
    return json({ error: 'Seu perfil não pode assinar documentos clínicos.' }, 403);
  }

  // ——— 3. Validação de entrada ———
  let payload: { provider?: string; hash?: string; pin?: string; documentType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const { provider, hash, pin, documentType } = payload;

  if (!provider || !(provider in PROVIDERS)) {
    return json({ error: 'Provedor de assinatura desconhecido.' }, 400);
  }
  // O cliente envia o RESUMO, nunca o documento. Conteúdo clínico não
  // atravessa a fronteira de rede para um terceiro.
  if (!hash || !SHA256_HEX.test(hash)) {
    return json({ error: 'Resumo do documento ausente ou malformado.' }, 400);
  }

  const config = PROVIDERS[provider as keyof typeof PROVIDERS];
  if (!config.clientId || !config.clientSecret || !config.baseUrl) {
    return json({
      error: `As credenciais do ${config.label} não estão configuradas no servidor.`,
    }, 503);
  }
  if (!pin) {
    return json({ error: 'PIN ou código OTP obrigatório.' }, 400);
  }

  try {
    // ——— 4. OAuth2 client_credentials com o provedor ———
    const tokenResponse = await fetch(`${config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.json().catch(() => ({}));
      console.error('[sign-document] falha de autenticação no provedor', tokenResponse.status);
      return json({
        error: detail.error_description ?? 'O provedor de assinatura recusou as credenciais.',
      }, 502);
    }

    const { access_token: accessToken } = await tokenResponse.json();

    // ——— 5. Assinatura do resumo ———
    const signResponse = await fetch(`${config.baseUrl}/oauth/signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        cpf: config.cpf,
        pin,
        hash,
        alias: config.alias,
        hash_algorithm: 'SHA256',
      }),
    });

    if (!signResponse.ok) {
      const detail = await signResponse.json().catch(() => ({}));
      console.error('[sign-document] assinatura recusada', signResponse.status);
      return json({
        error: detail.error_description ?? 'O provedor recusou a assinatura. Verifique o PIN e a validade do certificado.',
      }, 502);
    }

    const result = await signResponse.json();

    // ——— 6. Registro em auditoria, do lado do servidor ———
    // O log não depende de o cliente ter registrado: assinar é evento demais
    // para confiar no navegador.
    await supabase.from('auditoria').insert({
      usuario_id: profile.id,
      papel: profile.role,
      acao: 'SIGN',
      entidade: 'documentos',
      detalhe: `provedor=${provider} tipo=${documentType ?? 'desconhecido'}`,
      risco: false,
      // A cadeia do cliente continua sendo a principal; esta entrada é um
      // contraponto gravado pelo servidor.
      hash_anterior: 'SERVER',
      hash: `srv-${crypto.randomUUID()}`,
    });

    return json({
      signatureId: result.signature_id ?? result.id ?? null,
      verificationUrl: result.verification_url ?? 'https://verificador.iti.gov.br/',
      signedAt: new Date().toISOString(),
      provider: config.label,
    });
  } catch (error) {
    // A mensagem do erro interno não volta ao cliente: ela pode conter a URL
    // do provedor, cabeçalhos ou fragmentos da credencial.
    console.error('[sign-document] erro inesperado', error);
    return json({ error: 'Não foi possível concluir a assinatura digital.' }, 502);
  }
});
