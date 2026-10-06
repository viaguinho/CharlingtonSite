# Segurança e implantação — painel de gestão clínica

Este documento fecha a lacuna entre o que o código garante e o que só a
configuração do servidor garante. Sem os cabeçalhos e as configurações desta
página, boa parte das defesas construídas no código fica sem efeito.

---

## 1. Cabeçalhos HTTP obrigatórios

Configure no servidor que entrega `/admin.html` (Vercel, Netlify, Nginx ou o
que for). A CSP abaixo é a que o painel foi construído para respeitar: sem
`unsafe-inline`, sem `unsafe-eval`, sem terceiros.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' https://djrgtbnrvbemcplaznch.supabase.co wss://djrgtbnrvbemcplaznch.supabase.co;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  upgrade-insecure-requests

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), microphone=(), camera=(self), payment=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cache-Control: no-store            # apenas para /admin.html
```

**Por que `style-src 'self'` é possível aqui:** a fonte Inter é auto-hospedada
em `admin/assets/fonts/`. Nenhuma requisição sai para `fonts.googleapis.com`,
o que também impede que o IP de quem usa o painel vaze para um terceiro a
cada carregamento.

**Exemplo para Vercel** (`vercel.json`):

```json
{
  "headers": [{
    "source": "/admin.html",
    "headers": [
      { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://djrgtbnrvbemcplaznch.supabase.co wss://djrgtbnrvbemcplaznch.supabase.co; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests" },
      { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Referrer-Policy", "value": "no-referrer" },
      { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=(self), payment=()" },
      { "key": "Cache-Control", "value": "no-store" }
    ]
  }]
}
```

> **Verificação:** depois do deploy, rode o painel e confira o console. Se
> aparecer qualquer violação de CSP, algo entrou no bundle que não deveria —
> investigue antes de liberar o acesso da equipe.

---

## 2. Configuração do Supabase

### 2.1 Estado atual — **já provisionado**

| | |
|---|---|
| Organização | **Clinica Charlington Cavalcante** (separada da AcervoBar) |
| Projeto | `clinica-charlington` |
| Referência | `djrgtbnrvbemcplaznch` |
| URL | `https://djrgtbnrvbemcplaznch.supabase.co` |
| Região | **South America (São Paulo)** · `sa-east-1` |
| Plano | Free — ver a ressalva em 2.6 |

Executado em 16/09/2026:

- [x] Projeto criado com **"Automatically expose new tables" desligado** e
      **"Enable automatic RLS" ligado**, já na criação.
- [x] `0001_schema.sql` aplicada — 24 tabelas, 25 triggers.
- [x] `0002_rls.sql` aplicada — 58 políticas.
- [x] `0003_hardening.sql` aplicada.
- [x] Verificado: **24 de 24 tabelas com RLS ativa**, nenhuma de fora.
- [x] Verificado: banco **vazio** — 0 pacientes, 0 usuários, 0 registros de auditoria.
- [x] **Cadastro público desligado** (`Allow new users to sign up` = off).
      Conta se cria por convite, nunca por auto-cadastro.
- [x] `.env.local` preenchido e confirmado no `.gitignore`.
- [x] Conexão testada ponta a ponta: o painel entra em modo servidor e recebe
      a rejeição de credencial vinda do Supabase.

**Ainda pendente, e depende de você** (envolve senha, que eu não manuseio):

- [ ] Criar o primeiro usuário em Authentication › Users (seção 3 abaixo).
- [ ] Ativar o TOTP no primeiro acesso e guardar os códigos de recuperação.
- [ ] Aplicar as configurações de sessão e MFA da seção 2.2.
- [ ] Guardar a senha do banco — ela foi gerada pelo próprio Supabase e não foi
      copiada por mim. Se não estiver salva, redefina em
      **Settings › Database › Database password**: é reversível e não afeta o
      painel, que autentica por chave pública + JWT, nunca por essa senha.

### 2.1.1 Formato das chaves

O Supabase migrou para chaves `sb_publishable_…` (pública) e `sb_secret_…`
(secreta). O projeto usa a **publishable**, que é segura no navegador porque
não concede acesso sozinha — quem autoriza é o JWT da sessão avaliado pelas
políticas RLS. A chave secreta **não** está no repositório, não está no
`.env.local` e não deve entrar em nenhum dos dois: ela pertence às Edge
Functions.

### 2.2 Authentication

| Configuração | Valor | Por quê |
|---|---|---|
| Enable email provider | ✅ | Único método de entrada |
| Confirm email | ✅ | Impede cadastro com e-mail alheio |
| Enable signups | ❌ **desligado** | Conta se cria por convite do administrador, não por auto-cadastro |
| Minimum password length | 12 | NIST SP 800-63B |
| Password requirements | Lista de senhas vazadas ✅ | Comprimento pesa mais que complexidade artificial |
| JWT expiry | 3600 s | |
| Refresh token rotation | ✅ | Token roubado tem vida curta |
| Refresh token reuse interval | 10 s | |
| MFA (TOTP) | ✅ **obrigatório** | Ver 2.3 |
| Session inactivity timeout | 900 s | Espelha o timeout do cliente |
| Session time-box | 28800 s | Expiração absoluta de 8 h |
| Rate limiting (sign-in) | 5 / 15 min | |

### 2.3 MFA obrigatório

O Supabase não força MFA por configuração. A obrigatoriedade é aplicada em
duas camadas:

1. **No cliente** — `LoginScreen` exige o segundo fator quando existe fator
   verificado, e o primeiro acesso leva ao cadastro do TOTP.
2. **No banco** — adicione a política abaixo para que quem não ativou MFA não
   consiga ler prontuário, mesmo autenticado:

```sql
create or replace function mfa_verificado() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

-- Aplicar a cada política de leitura de conteúdo clínico:
alter policy evolucoes_leitura on evolucoes
  using (
    mfa_verificado()
    and eh_medico()
    and exists (select 1 from pacientes p where p.id = evolucoes.paciente_id and na_praca(p.praca))
  );
```

### 2.4 Secrets das Edge Functions

Em **Edge Functions › Secrets**. Nenhum destes valores pode aparecer em
`.env.local`, no repositório ou em qualquer arquivo entregue ao navegador.

```
APP_ORIGIN=https://www.charlingtoncavalcante.com.br

BIRDID_BASE_URL=https://api.birdid.com.br/v0
BIRDID_CLIENT_ID=…
BIRDID_CLIENT_SECRET=…
BIRDID_CPF=…
BIRDID_ALIAS=…

VIDAAS_BASE_URL=https://api.vidaas.com.br/v0
VIDAAS_CLIENT_ID=…
VIDAAS_CLIENT_SECRET=…
VIDAAS_CPF=…

WHATSAPP_PHONE_ID=…
WHATSAPP_TOKEN=…

EMAIL_API_KEY=…
EMAIL_FROM=clinica@clinicacharlington.com.br
EMAIL_PROVIDER_URL=https://api.resend.com/emails
```

Deploy:

```bash
supabase functions deploy sign-document send-whatsapp send-email
```

### 2.6 Plano Free — o que ele não entrega

O projeto está no plano Free, que serve para construir e validar. Antes de
guardar prontuário real, três limites pesam:

| Limite do Free | Consequência para uma clínica |
|---|---|
| Sem backup diário automático | Perda de dado não tem de onde voltar |
| Sem Point-in-Time Recovery | Não dá para desfazer um erro de ontem |
| Projeto **pausa após 7 dias sem atividade** | O painel simplesmente para de responder |
| 500 MB de banco · 1 GB de storage | Anexos de exame consomem isso rápido |

Guarda legal de 20 anos (Res. CFM 1.821/2007) sem backup automático é uma
contradição. **Recomendação: subir para Pro antes do primeiro paciente real.**

### 2.5 Backup

Supabase faz backup diário automático nos planos pagos. Além disso:

- **Point-in-Time Recovery** ligado (exige plano Pro).
- Exportação semanal cifrada para armazenamento fora da Supabase — a regra
  3-2-1 exige uma cópia fora do provedor principal.
- **Teste de restauração trimestral**, registrado com data e responsável.
  Backup que nunca foi restaurado é uma hipótese, não um backup.

---

## 3. Primeiro usuário

O painel não permite auto-cadastro. Para criar a conta do administrador:

1. Supabase → **Authentication › Users › Add user**, com e-mail e senha forte.
2. Copiar o `id` (UUID) do usuário criado.
3. No SQL Editor:

```sql
insert into usuarios (auth_id, nome, email, role, plazas, crm, mfa_ativo)
values (
  'COLE-O-UUID-AQUI',
  'Charlington Moreira Cavalcante',
  'charlington@clinicacharlington.com.br',
  'admin',
  '{campinas,fortaleza}',
  '173176-SP',
  false
);
```

4. Entrar no painel, cadastrar o TOTP e **guardar os códigos de recuperação
   fora do sistema**.
5. A partir daí, os demais usuários são convidados pelo próprio painel.

---

## 4. Checklist antes de liberar o acesso da equipe

- [ ] `npm run check:security` passa sem achados
- [ ] `npm run check:security:legacy` **falha** — prova de que o verificador funciona
- [ ] Console do navegador sem violação de CSP no painel em produção
- [ ] Nenhuma requisição para domínio de terceiro na aba Network
- [ ] `npm audit` sem vulnerabilidade alta ou crítica **que alcance produção** — ver 4.1 para o risco aceito de Vite/esbuild, restrito ao servidor de desenvolvimento
- [ ] RLS ativa em todas as tabelas: `select tablename, rowsecurity from pg_tables where schemaname = 'public'` — todas `true`
- [ ] Teste de isolamento: entrar com um usuário só de Fortaleza e confirmar que a lista de pacientes de Campinas volta vazia
- [ ] Teste de papel: entrar como Atendimento e confirmar que o prontuário não abre
- [ ] MFA ativo em todas as contas
- [ ] `select * from verificar_cadeia_auditoria()` retorna `valido = true`
- [ ] Restauração de backup testada e registrada
- [ ] Busca por dado fictício: `grep -ri "lucas silva\|senha123" admin/` sem resultado

---

## 4.1 Dependências — risco aceito e documentado

`npm audit` acusa duas vulnerabilidades (1 alta, 1 moderada), ambas em
**Vite e esbuild**, e ambas afetando **apenas o servidor de desenvolvimento**:

| Pacote | Severidade | Natureza |
|---|---|---|
| `vite` | alta | Path traversal no tratamento de `.map` de dependências otimizadas; bypass de `server.fs.deny` em caminhos alternativos do Windows |
| `esbuild` | moderada | Qualquer site aberto no navegador pode fazer requisições ao servidor de desenvolvimento e ler a resposta |

**Por que não foram corrigidas:** a correção é `vite@8`, três versões maiores
acima da atual. O `vite.config.js` é compartilhado com o site público, que este
projeto está proibido de alterar — subir o bundler por três majors para
resolver um problema que não alcança o artefato publicado é a troca errada.

**Verificação de que não alcança produção:**

```bash
grep -o "vite[a-zA-Z_-]*" dist/assets/admin-*.js | sort | uniq -c
#   13 vite__mapDeps   ← helper de pré-carregamento gerado, ~10 linhas
#    1 viteUserByEmail ← falso positivo: "inviteUserByEmail" do SDK do Supabase
```

Nenhum código de Vite ou esbuild é servido ao navegador. O que vai para
produção é HTML, CSS e JavaScript estáticos.

**Mitigação enquanto a correção não acontece:**

- O `vite.config.js` **não** define `server.host`, então o servidor de
  desenvolvimento escuta apenas em `localhost` — não fica exposto à rede.
- Nunca rodar `npm run dev -- --host` em rede compartilhada.
- Reavaliar quando o site público for migrado para Vite 8; aí a atualização
  vale para os dois.

---

## 5. Resposta a incidente

Se houver suspeita de acesso indevido a dado de paciente:

1. **Conter** — revogar as sessões do usuário suspeito
   (`Authentication › Users › Sign out user`) e, se necessário, desativar a
   conta.
2. **Preservar** — exportar o log de auditoria do período **antes** de
   qualquer correção, e rodar `verificar_cadeia_auditoria()` para registrar
   o estado da cadeia.
3. **Avaliar** — usar `acessos_ao_prontuario(<uuid do paciente>)` para
   levantar exatamente quem acessou o quê e quando.
4. **Comunicar** — incidente com risco relevante aos titulares exige
   comunicação à **ANPD** e às famílias afetadas em prazo razoável
   (LGPD, art. 48). A comunicação descreve a natureza do dado, os titulares
   envolvidos, as medidas adotadas e os riscos.
5. **Registrar** — o incidente e a resposta entram no registro da clínica,
   que é documento de defesa em eventual fiscalização.

---

## 6. O que mudou em relação ao painel anterior

| Vulnerabilidade | Antes | Agora |
|---|---|---|
| Segredo do Bird ID no navegador | `admin.js:3710`, legível no DevTools | Edge Function `sign-document`; o cliente envia só hash + PIN |
| CPF do médico no código | Literal em `SIGNATURE_API_CONFIG` | Variável de ambiente no servidor |
| Senha em texto plano | `senha: "senha123"` no seed | Supabase Auth, Argon2id, nunca no cliente |
| Autorização | Filtro em JavaScript | Políticas RLS no Postgres |
| Isolamento entre praças | Filtro na aplicação | `na_praca()` nas políticas do banco |
| Dados em repouso | `localStorage` em claro | AES-256-GCM local; Postgres + Storage cifrados no servidor |
| Prontuário editável | `update` livre | Trigger `evolucao_imutavel` — correção só por adendo |
| Documento editável | `update` livre | Trigger `documento_imutavel` — correção só por substituição |
| Auditoria | Array em `localStorage` | Tabela append-only encadeada por hash, com trigger bloqueando update/delete |
| CSP | Inexistente; centenas de `onclick=` | Sem `unsafe-inline`; nenhum handler inline |
| Fonte | `fonts.googleapis.com` | Auto-hospedada |
| Verificação automatizada | Nenhuma | `check-secrets.mjs` na build |
