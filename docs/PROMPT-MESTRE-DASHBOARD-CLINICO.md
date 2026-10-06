# PROMPT-MESTRE — Reconstrução do Painel de Gestão Clínica
### Clínica Dr. Charlington M. Cavalcante · Neurologia Infantil (Campinas/SP · Fortaleza/CE)

> **Natureza deste documento.** Este é o *prompt executor* do projeto: o briefing técnico, funcional, visual e de segurança que qualquer agente (ou pessoa) deve seguir para reconstruir do zero a área `admin` da plataforma. É normativo — onde diz "deve", é requisito; onde diz "pode", é margem de decisão.
>
> **Versão:** 1.1 · **Data:** 15/09/2026 · **Escopo de alteração:** exclusivamente o painel administrativo. Nada fora dele pode ser tocado.

### Decisões de arquitetura fechadas com o cliente (15/09/2026)

| Decisão | Escolha | Consequência |
|---|---|---|
| **Backend** | **Supabase** | Postgres com Row Level Security **no banco** (não na aplicação) · Supabase Auth com MFA TOTP · Storage cifrado para anexos · **Edge Functions como BFF** para Bird ID/VIDaaS, WhatsApp Cloud API e e-mail. Segurança da Parte 7 é implementada de verdade, não apenas arquitetada. |
| **Stack da UI** | **React 19 + Vite** | React e Framer Motion já estão no projeto. Componentização real, componentes do 21st.dev aproveitáveis, prontuário de três colunas gerenciável. Nova entrada no `vite.config.js` apontando para o painel. |
| **Ritmo** | **Fases 0–9 em execução contínua**, incluindo as 3 rodadas de `/design-loop`, com apresentação ao final | Sem checkpoints intermediários de aprovação. |

**Modo de operação até as credenciais Supabase chegarem:** o painel funciona **local-first** com o `IndexedDBAdapter` cifrado. Quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` forem preenchidos em `.env.local`, o `repository.js` passa a usar o `SupabaseAdapter` sem nenhuma alteração de UI. As migrations SQL (schema + políticas RLS) e as Edge Functions são entregues prontas para deploy.

---

## PARTE 0 — REGRAS INVIOLÁVEIS DO PROJETO

Estas cinco regras prevalecem sobre qualquer outra instrução deste documento.

| # | Regra | Detalhe |
|---|-------|---------|
| **R1** | **Isolamento absoluto de escopo** | Alterar **apenas** os arquivos do painel: `admin.html`, `admin.css`, `admin.js` (e os novos módulos que os substituírem). É **proibido** tocar em `index.html`, `styles.css`, `script.js`, `updates.html`, `privacidade.html`, `termos.html`, `cookies.html`, `src/`, `particulas/`, `assets/` (exceto **adicionar** novos assets exclusivos do painel) e na configuração de build salvo para registrar novas entradas do painel. |
| **R2** | **Zero dados fictícios** | Nenhum paciente, valor financeiro, agendamento, terapeuta, KPI ou gráfico pode conter dado inventado, "de exemplo", "Lucas Silva", "R$ 950,00" ou números de preenchimento. O sistema nasce **vazio**, com *empty states* desenhados e um **wizard de configuração inicial**. Gráficos sem dados exibem estado "sem dados suficientes", nunca uma curva decorativa. |
| **R3** | **Preservar o papel timbrado** | O template de documentos clínicos — o preview em A4 com `assets/Papel - Campinas.jpg`, proporção `1/1.41`, padding `140px 45px 110px 60px`, camadas `z-index` e bloco de assinatura — **deve ser preservado e incrementado**, nunca descartado. É o único ativo herdado do painel atual. Ver **Parte 5.6**. |
| **R4** | **Segurança é requisito funcional** | Nenhum segredo (client_secret, API key, token) pode existir no código do navegador. A implementação atual viola isso em `admin.js:3710` (`SIGNATURE_API_CONFIG`) e deve ser corrigida na reconstrução. Ver **Parte 7**. |
| **R5** | **Paleta Charlington, layout das referências** | Das seis referências Behance extrai-se **estrutura, composição, densidade, tipos de gráfico, micro-interação e hierarquia**. A **cor** vem exclusivamente do design system Charlington. Nenhum lime/chartreuse, nenhum mint, nenhum azul-bebê das referências entra no produto. Ver **Parte 6.2**. |

---

## PARTE 1 — LEITURA DO PROJETO ATUAL

### 1.1 Stack e arquitetura

```
Site Charlington/
├── index.html · styles.css · script.js      → site público (INTOCÁVEL)
├── admin.html (168 KB) · admin.css (86 KB) · admin.js (214 KB)  → alvo da reconstrução
├── src/                                     → React islands (RippleDistortion, ParticleBackdrop)
├── assets/                                  → mídia (Papel - Campinas.jpg é crítico)
├── vite.config.js                           → MPA, 6 entradas HTML
└── DesignCharlington.md                     → design system extraído
```

- **Build:** Vite 5 · MPA com 6 entradas · React 19 disponível (islands via `@vitejs/plugin-react`) · Framer Motion 13 · Three/R3F/OGL para efeitos do site público.
- **Tailwind 4** está em `devDependencies` mas o painel atual não o usa — usa CSS puro com custom properties.
- **Persistência atual:** `localStorage` (`DrCharlingtonERP_DB`, chave única, JSON inteiro) + `IndexedDB` (`DrCharlington_FilesDB`, store `attachments`) para anexos binários.

### 1.2 O que existe hoje no painel

Sete abas monolíticas: `tab-dashboard`, `tab-agenda`, `tab-pacientes`, `tab-financeiro`, `tab-insumos`, `tab-auditoria`, `tab-funcionarios`.

**Acertos conceituais a manter:**
- Barra de governança com troca de papel (RBAC) e filtro por praça (RLS) — `doctor`, `sec-campinas`, `sec-fortaleza`, `financial`.
- Login com segunda etapa MFA.
- Log de auditoria (`logAuditor`) com usuário, perfil, praça, operação, IP.
- Anexos reais em IndexedDB (não base64 em localStorage).
- Portal de anamnese por token para o responsável.
- Split de repasse de terapeutas e fechamento mensal.
- Modo offline com fila de sincronização.

**Problemas estruturais a eliminar:**
| Problema | Evidência | Correção exigida |
|---|---|---|
| Segredos no cliente | `SIGNATURE_API_CONFIG` com `clientId`/`clientSecret`/CPF em `admin.js:3710` | BFF proxy; front nunca vê credencial |
| Dados fictícios embutidos | `DEFAULT_DATABASE` com "Lucas Silva Santos", CPF, valores; `USER_PROFILES` com nomes de secretárias | Base vazia + wizard |
| Senha em texto plano | `senha: "senha123"` no seed de funcionários | Argon2id no servidor; nunca no cliente |
| Monólito de 214 KB | Um `admin.js` com 4.000+ linhas, `window.*` global | Módulos ES por domínio |
| Estado global mutável | `db`, `session`, `activePatientId` como `let` globais | Store único com eventos |
| Datas hardcoded no futuro | `activeAgendaDate = "2026-05-25"` | Data real do sistema |
| `onclick=` inline no HTML | Centenas de ocorrências | Event delegation, CSP-safe |
| Estilo inline massivo | `style="..."` em quase todo elemento | Classes utilitárias + tokens |

### 1.3 Identidade do negócio

- **Especialidade:** Neurologia Infantil / Neuropediatria. Isso define o domínio clínico: TEA, TDAH, epilepsia, atraso do desenvolvimento neuropsicomotor, paralisia cerebral, cefaleias, distúrbios do sono e da linguagem.
- **Público real do atendimento:** a criança é o paciente; **o responsável legal é o interlocutor**. Toda comunicação, consentimento, agendamento e documento tem duas pontas.
- **Duas praças:** Campinas/SP (sede) e Fortaleza/CE (filial). Isolamento de dados por praça é requisito, não conveniência.
- **Equipe multidisciplinar:** o modelo de negócio inclui repasse a terapeutas (TO, fono, psicologia), portanto o financeiro é de rede, não de consultório único.
- **Tom da marca:** clínico, sereno, acolhedor, minimalista. Peso 300, espaço negativo generoso, azul como única cor saturada. Um painel de gestão não pode trair isso com um dashboard "SaaS agressivo".

---

## PARTE 2 — VISÃO DO PRODUTO

**O que estamos construindo:** um *prontuário eletrônico + ERP clínico* para uma rede de neuropediatria de duas praças, operado por 4 perfis, que substitui planilhas e WhatsApp desorganizado por um sistema único — bonito o bastante para o médico querer usar e rigoroso o bastante para sobreviver a uma auditoria do CFM e a um incidente de LGPD.

**Três promessas de produto:**
1. **O médico abre o painel e vê o dia dele em 3 segundos.** Não um mural de KPIs; a lista de quem chega, o que falta assinar, o que precisa de decisão.
2. **Qualquer dado sobre uma criança está a dois cliques.** Ficha, prontuário, escalas, exames, documentos, histórico de comunicação — uma tela, abas laterais, zero navegação em árvore.
3. **Nada que saia do sistema sai sem rastro.** Documento emitido, mensagem enviada, dado exportado, registro alterado — tudo no log imutável.

**Anti-promessas (o que o produto não é):** não é telemedicina completa, não é faturamento TISS/convênio automatizado na v1, não é app mobile nativo, não é BI self-service.

---

## PARTE 3 — ARQUITETURA TÉCNICA

### 3.1 Decisão de arquitetura

O painel deve nascer preparado para servidor, mas **funcionar local-first desde o dia 1**.

```
┌─────────────────────────────────────────────────────────┐
│  CAMADA DE APRESENTAÇÃO (admin/)                        │
│  HTML semântico + CSS tokens + módulos ES               │
│  React islands só onde há ganho real (gráficos, editor) │
├─────────────────────────────────────────────────────────┤
│  CAMADA DE DOMÍNIO (admin/core/)                        │
│  store.js · rbac.js · audit.js · validators.js          │
│  Entidades puras, sem DOM, testáveis                    │
├─────────────────────────────────────────────────────────┤
│  CAMADA DE PERSISTÊNCIA (admin/data/)                   │
│  repository.js — interface única                        │
│   ├─ IndexedDBAdapter  (v1, local-first, criptografado) │
│   └─ HttpAdapter       (v2, BFF → Postgres/Supabase)    │
├─────────────────────────────────────────────────────────┤
│  BFF (fora do repositório do front, documentado aqui)   │
│  Único lugar com segredos: Bird ID, VIDaaS, WhatsApp,   │
│  SMTP. Front fala só com o BFF, por sessão autenticada. │
└─────────────────────────────────────────────────────────┘
```

**Regra de ouro:** nenhum módulo de UI acessa `IndexedDB` ou `fetch` diretamente. Tudo passa por `repository.js`. Trocar de adapter não pode exigir tocar em uma linha de UI.

### 3.2 Estrutura de arquivos exigida

```
admin/
├── index.html                 # shell: <head>, app root, nada mais
├── styles/
│   ├── tokens.css             # ÚNICA fonte de cor/espaço/raio/sombra
│   ├── base.css               # reset, tipografia, foco visível
│   ├── layout.css             # grid do app, sidebar, topbar, bento
│   ├── components/            # um arquivo por componente
│   └── print.css              # @media print — documentos clínicos
├── core/
│   ├── store.js               # estado + pub/sub, imutável
│   ├── router.js              # hash router, transições de view
│   ├── rbac.js                # matriz de permissões, deny-by-default
│   ├── audit.js               # log append-only encadeado por hash
│   ├── crypto.js              # WebCrypto: AES-GCM, derivação de chave
│   ├── validators.js          # CPF, CNS, CID-10, datas, telefone BR
│   └── format.js              # BRL, datas pt-BR, idade em anos/meses
├── data/
│   ├── repository.js          # interface
│   ├── idb-adapter.js
│   ├── http-adapter.js
│   ├── schema.js              # definição das entidades + migrations
│   └── seed.js                # VAZIO. Só estruturas, zero registros.
├── modules/
│   ├── auth/ · overview/ · agenda/ · patients/ · clinical/
│   ├── documents/ · communication/ · finance/ · operations/
│   ├── reports/ · settings/ · audit/
├── components/                # biblioteca de UI reutilizável
├── charts/                    # renderizadores SVG próprios
└── assets/icons/              # sprite SVG único
```

### 3.3 Modelo de dados

Todas as entidades carregam: `id` (UUID v4), `praca` (`campinas` | `fortaleza`), `criadoEm`, `criadoPor`, `atualizadoEm`, `atualizadoPor`, `versao` (optimistic locking). Exclusão é **sempre lógica** (`excluidoEm`, `excluidoPor`, `motivoExclusao`) — prontuário não se apaga.

**Entidades principais:**

- `clinica` — razão social, CNPJ, praças, timbrados, dados do responsável técnico.
- `usuario` — nome, email, papel, praças permitidas, `mfaAtivo`, `ultimoAcesso`, `status`. **Sem campo de senha no cliente.**
- `paciente` — nome, nome social, data de nascimento, sexo, CPF, CNS, foto, praça de origem, status (ativo/inativo/alta), responsáveis vinculados, escola, convênio, alergias, condições, medicações em uso, observações de acessibilidade sensorial.
- `responsavel` — nome, CPF, parentesco, telefone, email, endereço, autorizações (retirar criança, receber documentos, consentimento de comunicação).
- `profissional` — externo ou interno; especialidade; regime de repasse (% ou fixo); dados bancários (criptografados em nível de campo).
- `agendamento` — paciente, profissional, sala, praça, início, fim, tipo (primeira consulta, retorno, teleconsulta, procedimento), status (agendado, confirmado, check-in, em atendimento, concluído, faltou, cancelado), origem, valor, observações.
- `atendimento` — vinculado ao agendamento; é a sessão clínica em si.
- `evolucao` — nota clínica em SOAP; CID-10 principal e secundários; conduta; assinada e travada após assinatura (imutável).
- `escalaAplicada` — instrumento (M-CHAT-R/F, SNAP-IV, ASQ-3, Vanderbilt, CARS-2, Conners, Denver II), respostas, escore, interpretação, data, quem aplicou.
- `marcoDesenvolvimento` — domínio (motor grosso, motor fino, linguagem, social, cognitivo), idade esperada, status observado, data.
- `anamnese` — token de acesso, respostas do responsável, status, data de preenchimento.
- `documentoClinico` — tipo, conteúdo, paciente, emissor, hash SHA-256 do conteúdo, provedor de assinatura, ID da assinatura, URL de verificação, timbrado usado. **Imutável após emissão.**
- `anexo` — metadados no store principal; binário em IndexedDB/objeto remoto; tipo, origem, hash.
- `mensagem` — canal (whatsapp/email), direção, paciente/responsável, template, status de entrega, timestamp.
- `lancamento` — financeiro; tipo (receita/despesa), categoria, centro de custo, praça, vencimento, pagamento, forma, status, vínculo com atendimento.
- `repasse` — profissional, competência, base de cálculo, percentual, valor, status.
- `insumo` — nome, praça, estoque, mínimo, unidade, validade, fornecedor.
- `sala` — nome, praça, recursos, status.
- `consentimento` — titular, finalidade, base legal, versão do texto, data, IP, revogação.
- `logAuditoria` — append-only, encadeado (`hashAnterior` + `hash`).

### 3.4 Migração dos dados existentes

Se houver `DrCharlingtonERP_DB` no `localStorage`, oferecer **importação assistida**: mostrar o que foi encontrado, deixar o usuário escolher o que migrar, descartar explicitamente qualquer registro de demonstração. Nunca migrar silenciosamente.

---

## PARTE 4 — MAPA DE MÓDULOS

Onze módulos. Cada um com: telas, permissões por papel, estados vazios, e ações auditáveis.

### 4.1 Autenticação e Sessão
- Login em duas etapas: credencial → **MFA TOTP** (RFC 6238, app autenticador).
- Opção de **WebAuthn/Passkey** como segundo fator preferencial.
- Recuperação de acesso por link expirável, nunca por pergunta secreta.
- Bloqueio progressivo após tentativas falhas; CAPTCHA a partir da 5ª.
- Timeout de inatividade **15 minutos**; aviso aos 13; re-autenticação obrigatória para: emitir documento, exportar dados, alterar permissão, ver dados bancários.
- Tela de **sessões ativas** com revogação por dispositivo.
- Seleção de praça ativa no login (quem tem acesso a mais de uma).

### 4.2 Visão Geral (Home do papel ativo)
**Não é uma tela só — é uma por papel.**

- **Médico:** agenda de hoje em timeline vertical · pacientes em espera com tempo decorrido · fila de pendências (documentos a assinar, resultados chegados, retornos vencidos) · próximos 3 aniversários de pacientes · atalho "iniciar atendimento".
- **Atendimento/Secretaria:** ocupação do dia e da semana · confirmações pendentes de WhatsApp · lista de espera com encaixe sugerido · check-ins · salas ocupadas agora.
- **Financeiro:** saldo do dia · a receber e a pagar em 7/30 dias · inadimplência · repasses do mês em aberto · comparativo entre praças.
- **Admin:** consolidado, saúde do sistema, últimos eventos de auditoria de risco, status das integrações.

Cada home tem um **cabeçalho de saudação** com nome real do usuário, data por extenso e um indicador de contexto (praça ativa).

### 4.3 Agenda e Atendimento
- **Vistas:** dia (timeline por sala/profissional), semana (grade), mês (densidade), lista (tabela filtrável).
- Drag-and-drop para reagendar com confirmação e registro em auditoria.
- **Bloqueios** de horário: férias, congresso, almoço, manutenção de sala — com recorrência.
- **Lista de espera** com critério (urgência, preferência de horário, praça) e sugestão automática de encaixe quando há cancelamento.
- **Check-in/Acolhimento:** o responsável chega, a recepção registra, o médico vê em tempo real. Tempo de espera cronometrado e visível.
- **Teleconsulta:** geração de sala, link enviado por WhatsApp/e-mail, registro de consentimento específico (Res. CFM 2.314/2022).
- **Confirmação automática:** disparo D-2 e D-1 por WhatsApp com resposta de confirmação processada.
- Detecção de conflito: mesma sala, mesmo profissional, mesmo paciente.

### 4.4 Pacientes — a espinha dorsal
Esta é a área que exige mais cuidado. É onde o produto se justifica.

#### 4.4.1 Lista de pacientes
Tabela densa e rápida: foto, nome, idade (anos e meses), responsável principal, última consulta, próxima consulta, status, praça. Busca instantânea por nome/CPF/telefone/CNS. Filtros combinados. Visualização em cards como alternativa.

#### 4.4.2 Ficha do paciente (cadastro)
Formulário em seções colapsáveis, salvamento incremental, validação em tempo real:
1. **Identificação** — nome completo, nome social, data de nascimento (idade calculada automaticamente em anos+meses), sexo, CPF, CNS, foto, naturalidade.
2. **Responsáveis** — múltiplos, com parentesco, contatos, endereço, e **matriz de autorizações**: pode retirar a criança, pode receber documentos, pode agendar, consentiu comunicação por WhatsApp.
3. **Contexto clínico** — queixa principal, história da gestação e parto, marcos do desenvolvimento, antecedentes familiares neurológicos, alergias, medicações em uso, comorbidades.
4. **Escola** — instituição, série, professor de referência, adaptações em vigor, contato pedagógico.
5. **Convênio/Particular** — operadora, plano, carteirinha, validade, ou regime particular com valor acordado.
6. **Perfil sensorial e de acolhimento** — campo específico de neuropediatria: gatilhos sensoriais, preferências, estratégias que funcionam, tempo de espera tolerado. Aparece em destaque no dia do atendimento.
7. **Consentimentos LGPD** — versionados, com data, IP e possibilidade de revogação.

#### 4.4.3 Prontuário Eletrônico (PEP)
Layout de **três colunas**: navegação lateral do paciente · conteúdo · painel de contexto.

- **Linha do tempo unificada** — consultas, documentos emitidos, exames anexados, escalas aplicadas, mensagens trocadas, mudanças de medicação. Filtrável por tipo, em ordem cronológica reversa.
- **Evolução clínica em SOAP** (Subjetivo, Objetivo, Avaliação, Plano) com editor de texto rico limitado e seguro. Autocompletar de CID-10 (base local, foco em G, F e R). Templates de evolução por tipo de consulta.
- **Travamento:** evolução assinada torna-se imutável. Correções entram como **adendo datado**, nunca como edição — exigência do CFM.
- **Escalas e instrumentos** — aplicação guiada com cálculo automático de escore e faixa interpretativa. Histórico comparativo do mesmo instrumento ao longo do tempo (gráfico de linha).
- **Marcos do desenvolvimento** — grade visual por domínio × faixa etária, com o que foi atingido, atrasado ou não avaliado.
- **Medicações** — lista ativa com posologia, data de início, e histórico de ajustes. Alerta de interação básica e de alergia declarada.
- **Anexos e pareceres** — upload de exames, laudos de imagem, relatórios de TO/fono/psicologia, relatórios escolares. Preview inline para PDF e imagem.
- **Painel de contexto (coluna direita)** — sempre visível: foto, idade, diagnósticos ativos, alergias em destaque vermelho, medicações em uso, perfil sensorial, próximo agendamento. É a "ficha de bolso" do médico.

#### 4.4.4 Anamnese digital
Link com token único enviado ao responsável antes da primeira consulta. Formulário responsivo, salvável em etapas, específico de neuropediatria (gestação, parto, desenvolvimento, sono, alimentação, comportamento, escola, histórico familiar). Ao ser submetido, entra no prontuário como documento de origem "responsável" — nunca se mistura com a nota do médico. Token expira; uso é auditado.

### 4.5 Área do Médico
Um espaço que existe só para o Dr. Charlington.

- **Meu dia** — agenda, tempo médio real de consulta, quantos atendidos, o que falta.
- **Pendências de assinatura** — fila de documentos aguardando assinatura digital, com assinatura em lote.
- **Biblioteca de templates** — evoluções, condutas, prescrições, relatórios. Editável pelo próprio médico, com variáveis (`{{paciente.nome}}`, `{{paciente.idade}}`, `{{data}}`, `{{responsavel.nome}}`).
- **Configuração de assinatura digital** — provedor ativo, status do certificado, validade, teste de conexão. (Credenciais no BFF; aqui só o status.)
- **Minhas métricas** — volume de atendimentos por período, distribuição de diagnósticos, taxa de retorno, tempo médio por tipo de consulta. Dados reais ou estado vazio.

### 4.6 Documentos Clínicos
O módulo que herda e amplia o papel timbrado. Detalhado na **Parte 5**.

### 4.7 Comunicação
- **Central unificada** — todas as mensagens por paciente, em thread, independente do canal.
- **WhatsApp Cloud API** (Meta) — não é automação de WhatsApp Web, é a API oficial. Templates HSM aprovados: confirmação de consulta, lembrete D-1, documento disponível, retorno sugerido, aniversário. Janela de 24h respeitada. Opt-in obrigatório registrado no consentimento.
- **E-mail transacional** — via BFF com provedor SMTP/API. Envio de documentos como anexo cifrado ou link expirável com senha.
- **Regras de automação** — configuráveis: "24h antes da consulta, enviar lembrete"; "documento assinado, notificar responsável"; "90 dias sem retorno, sugerir reagendamento". Cada regra tem liga/desliga e log de execução.
- **Nunca enviar dado clínico sensível no corpo da mensagem.** O WhatsApp notifica que há documento; o documento é acessado por link autenticado.

### 4.8 Financeiro e Administrativo
- **Fluxo de caixa** por praça e consolidado; entradas vinculadas a atendimentos.
- **Contas a receber** — particular, convênio, parcelamento, inadimplência com régua de cobrança.
- **Contas a pagar** — recorrentes (aluguel, folha, software) e avulsas, com vencimento e alerta.
- **Repasse de terapeutas** — cálculo por percentual ou valor fixo, fechamento mensal, comprovante de repasse, histórico.
- **Centro de custo por praça** — toda despesa é atribuída; rateio configurável para despesas compartilhadas.
- **DRE simplificada** — receita bruta, deduções, custos diretos, despesas, resultado, por competência.
- **Conciliação** — importação de extrato (OFX/CSV) e casamento com lançamentos.
- **Emissão de NFS-e** — integração municipal via BFF (Campinas e Fortaleza têm sistemas distintos; v1 pode exportar o lote).

### 4.9 Operações da Clínica
- **Estoque de insumos** — entrada, saída, mínimo, validade, alerta de reposição, consumo por atendimento.
- **Salas e recursos** — cadastro, disponibilidade, manutenção.
- **Equipe** — cadastro, papéis, escala de trabalho por praça, férias.
- **Fornecedores** — cadastro e histórico de compras.

### 4.10 Relatórios e BI
Relatórios reais, exportáveis em PDF e CSV, todos com recorte por período e praça:
- Produção assistencial (atendimentos por tipo/profissional/praça)
- Perfil epidemiológico da clínica (distribuição de CID-10)
- Taxa de absenteísmo e cancelamento
- Tempo médio de espera e de consulta
- Receita por origem e por praça
- Evolução de coorte (pacientes acompanhados há mais de 6/12/24 meses)
- Relatório de acesso a prontuário (quem viu o quê, quando) — exigência LGPD

### 4.11 Configurações e Governança
- **Identidade da clínica** — dados, praças, timbrados por praça, logotipos.
- **Usuários e permissões** — matriz RBAC editável, convite por e-mail, revogação.
- **Parâmetros clínicos** — tipos de consulta, durações padrão, salas, tabelas de valores.
- **Integrações** — status de WhatsApp, e-mail, assinatura digital, NFS-e. Configuração **sem exibir segredos**.
- **LGPD** — inventário de dados, relatório de consentimentos, atendimento a direitos do titular (acesso, portabilidade, correção, eliminação), registro de incidentes.
- **Auditoria** — busca no log imutável por usuário, entidade, período, tipo de operação. Exportável. Verificação de integridade da cadeia de hash.
- **Backup e restauração** — exportação cifrada completa, agendamento, teste de restore.

---

## PARTE 5 — DOCUMENTOS CLÍNICOS (módulo crítico, herda o papel timbrado)

### 5.1 Tipos de documento exigidos

| Tipo | Observação |
|---|---|
| **Prescrição simples** | Receituário comum |
| **Prescrição de controle especial** | Receituário azul (B) e amarelo (A) — layout, numeração e via do paciente/farmácia conforme Portaria 344/98 |
| **Atestado de comparecimento** | Do paciente e do acompanhante |
| **Atestado médico** | Com CID opcional mediante autorização expressa do responsável |
| **Laudo neurológico** | Estruturado |
| **Relatório para escola** | Linguagem acessível, foco em adaptações pedagógicas |
| **Relatório para plano de saúde / perícia** | Fundamentação técnica |
| **Encaminhamento multidisciplinar** | TO, fono, psicologia, com objetivo terapêutico e frequência |
| **Solicitação de exames** | EEG, RM, polissonografia, exames laboratoriais |
| **Declaração de acompanhamento** | Para trabalho do responsável |

### 5.2 O que se preserva integralmente

Do painel atual, manter — e melhorar — o seguinte:

```
Estrutura do preview A4 (PRESERVAR):
├── container: aspect-ratio 1/1.41, padding 140px 45px 110px 60px
├── <img> do timbrado: position absolute, inset 0, object-fit cover, z-index 1
├── faixa de identificação do paciente: nome + data, borda esquerda em Future Blue, z-index 2
├── título do documento: Future Blue, uppercase, hairline inferior
├── corpo: white-space pre-line, min-height reservada
└── bloco de assinatura: linha 140px, nome, selo de assinatura digital, link de verificação
```

Manter também a arquitetura **split-pane**: editor à esquerda, preview imutável à direita, sincronização ao digitar.

### 5.3 O que se incrementa

1. **Timbrado por praça.** Hoje só existe `Papel - Campinas.jpg`. O sistema deve aceitar upload de timbrado por praça e por tipo de documento, com pré-visualização e ajuste de margens seguras. Campinas é o default até que Fortaleza seja carregado.
2. **Editor de templates pelo próprio médico.** Hoje os templates estão *hardcoded* em `handleDocTypeChange()`. Devem virar entidade `templateDocumento`: nome, tipo, conteúdo com variáveis, favorito, praça, ordem. Criar, duplicar, editar, arquivar.
3. **Variáveis dinâmicas** resolvidas no momento da emissão: `{{paciente.nome}}`, `{{paciente.idade}}`, `{{paciente.dataNascimento}}`, `{{responsavel.nome}}`, `{{responsavel.cpf}}`, `{{data.extenso}}`, `{{consulta.horaInicio}}`, `{{consulta.horaFim}}`, `{{medico.nome}}`, `{{medico.crm}}`, `{{clinica.endereco}}`.
4. **Prescrição estruturada.** Em vez de texto livre: linhas de medicamento com campo de princípio ativo (autocompletar), concentração, forma, posologia, duração, quantidade. Renderiza como texto formatado no preview, mas armazena estruturado — o que permite alerta de alergia, histórico de medicação e relatório de prescrição.
5. **Numeração sequencial e QR de verificação.** Cada documento emitido recebe número sequencial por praça/ano e um QR code que aponta para a página pública de validação (hash + ID de assinatura).
6. **Assinatura digital via BFF.** O fluxo (Bird ID / VIDaaS / ICP-Brasil) permanece, mas: o front envia o **hash SHA-256** do conteúdo e o PIN/OTP ao BFF; o BFF detém as credenciais e fala com o provedor; o front recebe apenas `signatureId` e `verificationUrl`. **Nenhum `clientSecret` no navegador.**
7. **Assinatura em lote.** Fila de documentos pendentes, um PIN, todos assinados, cada um com registro individual em auditoria.
8. **Entrega.** Após assinar: imprimir, baixar PDF, enviar por e-mail, ou notificar por WhatsApp com link autenticado. A escolha é registrada.
9. **Imutabilidade.** Documento emitido não se edita. Correção gera novo documento com referência ao anterior e o original fica marcado como "substituído", jamais removido.
10. **`print.css` dedicado.** `@page { size: A4; margin: 0 }`, esconder toda a interface, renderizar apenas a folha, garantir que o timbrado saia na impressão (`print-color-adjust: exact`).

### 5.4 Templates iniciais

O sistema entrega **estruturas de template vazias e nomeadas**, não conteúdo clínico pronto. O médico preenche. Motivo: conteúdo clínico pré-escrito por um sistema é responsabilidade técnica do médico, não do software — e os templates atuais ("Risperidona 1mg/ml...") são exatamente o tipo de dado fictício que a regra **R2** proíbe carregar como padrão.

Exceção: os templates **atualmente em uso** em `admin.js` devem ser oferecidos ao médico em uma tela de importação, para ele revisar e aprovar um a um antes de virarem templates ativos.

---

## PARTE 6 — ESPECIFICAÇÃO VISUAL

### 6.1 Síntese das seis referências

Cada referência foi aberta, baixada em alta resolução e analisada. Segue o que foi extraído e o que entra no produto.

#### REF 1 — Callivio (CRM SaaS, call center)
| Padrão extraído | Aplicação no painel |
|---|---|
| Faixa de KPIs horizontal separada por **hairlines verticais**, sem bordas de card | Faixa superior da Visão Geral: 4 métricas do dia |
| Número gigante com **sufixo de unidade em corpo menor** (`10.8k`, `30s`, `3.3/5`) | Todos os KPIs numéricos |
| Chip de delta (`-52%`, `+23%`) alinhado ao topo do KPI | Comparativo com período anterior |
| Painel de boas-vindas em gradiente suave com **gauge radial** e número dominante | Cabeçalho da home do médico |
| Gráfico de barras com barras **fantasma translúcidas** e **uma barra destacada** com tooltip flutuante em pílula | Produção assistencial por dia |
| **Barras-tick verticais finas** como visual de distribuição/progresso | Distribuição de tipos de consulta, ocupação |
| Pílulas de aba no topo do conteúdo | Sub-navegação dentro dos módulos |
| Botões de ícone em quadrados arredondados no canto do card | Toolbar de cada widget |
| Fundos com **manchas de gradiente radial** muito suaves | Fundo do app, quase imperceptível |

#### REF 2 — Ledgerix (CRM/FMS financeiro)
| Padrão extraído | Aplicação |
|---|---|
| **Rail de ícones centralizado no topo**, item ativo em quadrado escuro | Alternativa considerada; ver decisão em 6.4 |
| **Breadcrumb** acima do título da página | Todas as telas internas |
| Cifra dominante alinhada à direita, rótulo minúsculo abaixo | Saldo/faturamento no Financeiro |
| Seletor de séries em **legenda com radio-dot** | Gráficos multi-série |
| **Abas de texto com sublinhado** (Semana/Mês/Trimestre/Ano) | Seletor de período universal |
| **Card de anotação flutuante sobre o gráfico**, com "×" e chip de variação | Insight automático sobre um pico/queda |
| Florestas de barras hairline; barras tipo candle | Densidade de agenda; amplitude de espera |
| **Barra de comando / busca global** em pílula escura com chips de sugestão | ⌘K global do painel |
| Chips de avatar-letra (A/B/C) pareados com rótulo | Identificação de profissional |
| Escala tipográfica: H1 36 semibold · Título 24 · Corpo 12 | Base da nossa escala (adaptada, ver 6.3) |

#### REF 3 — AI Health Platform ★ *referência primária*
Esta é a mais próxima do nosso domínio e deve ser a referência dominante para as telas clínicas.

| Padrão extraído | Aplicação |
|---|---|
| **Card de cabeçalho de paciente**: avatar circular + nome grande + linha de diagnóstico + "Dia 42 de reabilitação" | Cabeçalho do prontuário: nome + idade + diagnóstico ativo + "em acompanhamento há X meses" |
| **Chip de status verde suave** ("Optimal Form") | Status do paciente/atendimento |
| **Barra de progresso com preenchimento sólido + restante em hachura diagonal** | Progresso de tratamento, meta de sessões |
| Par de botões: secundário contornado + primário sólido escuro | Todo par de ações de formulário |
| **Coluna direita de mini-cards de métrica**: rótulo pequeno + valor grande + micro-visualização + nota de meta + texto de tendência colorido | Painel de contexto do paciente |
| Micro-visualizações distintas por métrica: barra hachurada com marcador-triângulo de meta, **gauge de arco tipo transferidor**, **faixa de 5 pontos** | Escalas, amplitude, escores |
| Valor com **denominador menor** (`4.2/10`) | Escores de escalas clínicas |
| **Pílulas flutuantes de navegação**, ativa em escuro | Navegação principal |
| **Gráfico previsto × realizado** (tracejado × sólido), tooltip com data e "↑ 3 dias adiantado", faixa vertical de destaque na coluna sob o cursor | Evolução de escore ao longo do tempo |
| **Textura de grade de pontos** sutil no canvas | Fundo das áreas de conteúdo |
| Cards de métrica em vidro sobre imagem | Cabeçalho com foto do paciente |
| Lista numerada 01–06 como índice de seção | Navegação lateral do prontuário |

#### REF 4 — Modern CRM / Orvion
| Padrão extraído | Aplicação |
|---|---|
| **Grid bento** de widgets de tamanhos variados | Layout da Visão Geral |
| Cabeçalho de card: título + botões circulares (filtro, comentário, expandir ↗) | Todo widget |
| Barra de ferramentas ao lado do título: ícones circulares + chips de intervalo de data + "+ Adicionar widget" + "Criar relatório" | Cabeçalho de cada módulo |
| **Rail vertical flutuante** de ícones circulares | Ações rápidas contextuais |
| Barra hachurada em destaque + chip de valor | Realce de dia/valor atípico |
| Área com preenchimento hachurado e pontos de dados | Séries acumuladas |
| **Pilha de avatares com contador "+6"** | Equipe presente na praça |
| Card de pessoa: avatar, nome, subtítulo, ↗, linha de compromisso com data/hora, rodapé com seletor de status + botão de e-mail + botão de ação primária escura | **Card de paciente na lista e card de agendamento** |
| Card inteiro tingido na cor de acento quando ativo/selecionado | Item selecionado na lista |
| Linhas de proporção com rótulo de % dentro da barra | Distribuição particular × convênio |

#### REF 5 — Clerio (CRM financeiro com IA)
| Padrão extraído | Aplicação |
|---|---|
| **Canvas tingido em gradiente** com cards brancos flutuando | Fundo das telas de destaque |
| Cards com raio muito alto (24–28px) e sombra quase imperceptível | Nossos cards de conteúdo |
| **Escala de régua com marcações finas** e marcador posicionado + tooltip em pílula | Escalas clínicas (ex.: faixa de escore de M-CHAT: baixo/médio/alto risco) |
| Porcentagem com **ponto colorido de status** ao lado | Indicadores com semáforo clínico |
| Micro-gráfico de barras-tick com dois rótulos nas extremidades (0% / 100%) | Medidores compactos |
| **Painel de IA/assistente como card do dashboard**, com bolhas de conversa e upload de arquivo | Assistente de resumo de exames (opcional, v2) |
| Tipografia de destaque com **segunda metade em cor clara** ("Designed to *be shared*") | Títulos de seção |

#### REF 6 — Convox (call center SaaS)
| Padrão extraído | Aplicação |
|---|---|
| Fonte **Outfit** Light/Regular/Medium; paleta `#EDF0F1` / `#C7D0D2` / `#202020` + acento pálido | Confirma nossa direção: cinza-claro + um acento |
| **Rail lateral esquerdo de ícones**, estreito, flutuante | Navegação principal — **adotado** |
| Card de KPI com **sparkline à direita** e rótulo com delta acima | KPIs secundários |
| **Barra de proporção dividida** com rótulos % nas duas pontas | Comparativos binários |
| **Gauge semicircular** com arco em acento e valor central | Ocupação da agenda, meta do mês |
| Card de sessão com foto, seletor de sentimento em três círculos e scrubber de áudio | Card de atendimento em curso |
| Chips de rótulo de seção em cinza claro, canto superior esquerdo | Rótulo de seção ("Visão Geral", "Operações") |
| Cards conectados por linha fina com setas em pílula entre eles | Fluxos (pipeline de atendimento, régua de cobrança) |

### 6.2 Tradução cromática — o passo obrigatório

As seis referências usam acentos que **não entram no produto**: lime `#CBEA4B`, mint `#75FB90`, azul-bebê `#A9CBEC`, lime pálido `#E9F87F`. Cada um tem um equivalente na nossa paleta:

| Papel na referência | Cor da referência | **Nossa cor** |
|---|---|---|
| Acento de destaque de dado | lime / mint | `--blue-500 #0071e3` |
| Chip de destaque com fundo | lime sólido | `--blue-050 #e8f2fd` com texto `--blue-600` |
| Card ativo/selecionado tingido | lime sólido | `--blue-050` com borda `--blue-200` |
| Preenchimento de barra destacada | lime | `--blue-500`, demais barras `--ink-alpha-08` |
| Botão primário | preto | `--ink-900 #0f1012` |
| Gauge/arco | lime | gradiente `--blue-300 → --blue-500` |
| Canvas tingido | azul-bebê | `--blue-050` a 40% sobre `--ghost-white` |
| Positivo / negativo / atenção | verde/vermelho genéricos | `--signal-green #27c462` · `--signal-red #ea4e3d` · `--signal-amber #f1b31c` — **uso exclusivamente semântico** (clínico/financeiro), nunca decorativo |

### 6.3 Tokens

`admin/styles/tokens.css` é a **única** fonte de verdade. Nenhum hexadecimal solto em outro arquivo.

```css
:root {
  /* ——— Tinta ——— */
  --ink-900:#0f1012; --ink-950:#020201;
  --ink-600:#3d3e41; --ink-500:#6b6c6f;
  --ink-400:#868788; --ink-300:#8f8f8f; --ink-200:#c4c5c7;
  --ink-a04:rgba(15,16,18,.04); --ink-a06:rgba(15,16,18,.06);
  --ink-a08:rgba(15,16,18,.08); --ink-a12:rgba(15,16,18,.12);

  /* ——— Superfícies ——— */
  --canvas:#f2f2f4;          /* fundo do app */
  --surface:#fdfdfd;         /* cards */
  --surface-raised:#ffffff;  /* modais, popovers */
  --surface-sunken:#ececed;  /* poços, campos */

  /* ——— Azul (única cor saturada) ——— */
  --blue-050:#e8f2fd; --blue-100:#cfe4fb; --blue-200:#9fc9f7;
  --blue-300:#5ba4f0; --blue-500:#0071e3; --blue-600:#005bb8;
  --blue-a08:rgba(0,113,227,.08); --blue-a16:rgba(0,113,227,.16);

  /* ——— Sinais (uso semântico exclusivo) ——— */
  --signal-green:#27c462; --signal-green-bg:rgba(39,196,98,.10);
  --signal-amber:#f1b31c; --signal-amber-bg:rgba(241,179,28,.10);
  --signal-red:#ea4e3d;   --signal-red-bg:rgba(234,78,61,.10);

  /* ——— Tipografia ——— */
  --font:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --font-num:'Inter',ui-sans-serif,system-ui;   /* tabular-nums sempre em dados */
  --w-light:300; --w-regular:400; --w-medium:500; --w-semibold:600;

  --t-micro:10px;    --lh-micro:1.3;  --ls-micro:.04em;   /* rótulos caps */
  --t-caption:11px;  --lh-caption:1.4;
  --t-small:12px;    --lh-small:1.45;
  --t-body:13px;     --lh-body:1.5;
  --t-base:14px;     --lh-base:1.5;
  --t-lead:16px;     --lh-lead:1.4;   --ls-lead:-.01em;
  --t-title:20px;    --lh-title:1.25; --ls-title:-.02em;
  --t-h2:27px;       --lh-h2:1.2;     --ls-h2:-.02em;   /* display do design system */
  --t-metric:34px;   --lh-metric:1.05;--ls-metric:-.03em;
  --t-metric-lg:48px;--lh-metric-lg:1;--ls-metric-lg:-.035em;

  /* ——— Espaço (base 4) ——— */
  --s-1:4px;  --s-2:8px;  --s-3:12px; --s-4:16px; --s-5:20px;
  --s-6:24px; --s-8:32px; --s-10:40px;--s-12:48px;--s-16:64px;

  /* ——— Raio ——— */
  --r-xs:6px; --r-sm:10px; --r-md:14px; --r-lg:20px;
  --r-xl:26px; --r-pill:999px; --r-circle:50%;

  /* ——— Elevação (planaridade: borda antes de sombra) ——— */
  --e-0:none;
  --e-1:0 1px 2px rgba(15,16,18,.04);
  --e-2:0 4px 16px rgba(15,16,18,.05);
  --e-3:0 12px 32px rgba(15,16,18,.07);
  --e-4:0 24px 56px rgba(15,16,18,.10);

  /* ——— Vidro ——— */
  --glass:rgba(253,253,253,.72); --glass-border:rgba(255,255,255,.55);
  --blur:blur(20px);

  /* ——— Movimento ——— */
  --dur-1:120ms; --dur-2:200ms; --dur-3:320ms; --dur-4:480ms;
  --ease:cubic-bezier(.22,1,.36,1);
  --ease-in-out:cubic-bezier(.65,0,.35,1);

  /* ——— Layout ——— */
  --rail:76px; --rail-open:248px; --topbar:64px;
  --content-max:1440px; --gutter:24px;
}
```

**Escala tipográfica — nota de adaptação.** O design system público define 10/14/18/27px, pensado para leitura editorial espaçosa. Um painel de gestão precisa de mais densidade. A escala acima **preserva 10, 14 e 27** como âncoras (micro, base, h2) e **interpola** os degraus intermediários (11, 12, 13, 16, 20) e os degraus de métrica (34, 48). O peso 300 permanece para títulos; dados numéricos usam 400–500 para legibilidade em corpo pequeno. `font-variant-numeric: tabular-nums` é obrigatório em toda tabela e KPI.

### 6.4 Layout do aplicativo

```
┌──────────────────────────────────────────────────────────────┐
│ ▓ RAIL 76px        │  TOPBAR 64px                            │
│  logo              │  breadcrumb · ⌘K busca · praça ·        │
│  ──────            │  notificações · avatar                  │
│  ◉ visão geral     ├─────────────────────────────────────────┤
│  ○ agenda          │  CABEÇALHO DO MÓDULO                    │
│  ○ pacientes       │  eyebrow · título 27/300 · toolbar      │
│  ○ documentos      ├─────────────────────────────────────────┤
│  ○ comunicação     │                                         │
│  ○ financeiro      │  CONTEÚDO — grid bento 12 col           │
│  ○ operações       │  gutter 24px, max 1440px                │
│  ○ relatórios      │                                         │
│  ──────            │                                         │
│  ○ configurações   │                                         │
│  avatar/sair       │                                         │
└──────────────────────────────────────────────────────────────┘
```

- **Rail colapsado por padrão** (76px, só ícones + tooltip), expansível a 248px com rótulos, estado persistido por usuário. Vem da REF 6.
- **Item ativo:** fundo `--blue-050`, ícone e rótulo em `--blue-500`, indicador vertical de 3px à esquerda em `--blue-500`.
- **Topbar em vidro** (`--glass` + `--blur`), fixa, com hairline inferior `--ink-a06`.
- **Grid bento:** 12 colunas. Widgets ocupam 3/4/6/8/12 colunas e 1/2 linhas. Altura de linha base 180px.
- **Prontuário do paciente:** layout de três colunas `280px | 1fr | 320px` — navegação do paciente, conteúdo, painel de contexto. Em <1280px o painel direito vira gaveta.
- **Responsividade:** o painel é desktop-first (uso real é em consultório). Abaixo de 1024px, rail vira bottom bar, bento vira coluna única, tabelas viram cards. Abaixo de 768px, apenas as funções essenciais de consulta — não se edita prontuário no celular.

### 6.5 Biblioteca de componentes

Cada item abaixo é um componente a construir, com todos os estados (padrão, hover, foco, ativo, desabilitado, carregando, erro, vazio).

**Superfícies:** `Card` (padrão, elevado, tingido, contornado) · `Panel` · `Sheet` (gaveta lateral) · `Modal` · `Popover` · `Tooltip` · `Divider` (hairline)

**Navegação:** `Rail` · `RailItem` · `Topbar` · `Breadcrumb` · `TabsPill` (REF 3) · `TabsUnderline` (REF 2) · `SegmentedControl` · `Stepper` · `IndexList` (01–06, REF 3)

**Dados:** `MetricTile` (rótulo + valor + sufixo + delta) · `MetricStrip` (faixa com hairlines, REF 1) · `MiniMetricCard` (com micro-viz, REF 3) · `DataTable` (virtualizada, ordenável, seleção, densidade ajustável) · `PatientCard` (REF 4) · `AppointmentCard` · `Timeline` · `EmptyState` · `Skeleton`

**Entrada:** `TextField` · `TextArea` · `Select` · `Combobox` (com busca, para CID-10 e medicamentos) · `DatePicker` (pt-BR) · `TimePicker` · `Checkbox` · `Radio` · `Switch` · `FileDrop` · `RichTextEditor` (restrito e sanitizado) · `SearchGlobal` (⌘K, REF 2)

**Feedback:** `Badge` · `Chip` (neutro, azul, verde, âmbar, vermelho) · `DeltaChip` (▲/▼ + %) · `StatusDot` · `Alert` · `Toast` · `ProgressBar` (sólido + hachura, REF 3) · `ProgressRing`

**Ação:** `Button` (primário escuro, secundário contornado, ghost, perigo) · `IconButton` (circular e quadrado arredondado) · `ButtonGroup` · `FAB`

**Clínicos (específicos do domínio):** `PatientHeader` · `ContextPanel` · `SOAPEditor` · `PrescriptionLine` · `ScaleForm` · `ScaleResultGauge` (régua com marcador, REF 5) · `MilestoneGrid` · `DocumentPreview` (o papel timbrado) · `SignatureQueue` · `ConsentBadge`

### 6.6 Ícones

**Sprite SVG único** (`assets/icons/sprite.svg`), `<use href="#icon-nome">`. Traço 1.5px, grade 24px, `stroke: currentColor`, `stroke-linecap: round`, `fill: none`. Sem biblioteca externa, sem emoji na interface (o painel atual usa 📝📄🏙️🌊 — todos devem sair).

Conjunto mínimo: `home · calendar · users · user-plus · file-text · prescription · certificate · stethoscope · brain · message-circle · whatsapp · mail · wallet · trending-up · trending-down · package · door · chart-bar · chart-line · shield · lock · key · settings · search · filter · plus · minus · check · x · chevron-{up,down,left,right} · arrow-up-right · more-horizontal · download · upload · print · paperclip · clock · alert-triangle · info · bell · logout · eye · eye-off · edit · trash · copy · refresh · signature · qr-code`

### 6.7 Gráficos

Renderizadores **SVG próprios**, sem biblioteca pesada. Justificativa: controle total do traço fino e do comportamento de estado vazio, e nenhuma dependência nova no bundle.

| Gráfico | Especificação |
|---|---|
| `BarChart` | Barras fantasma `--ink-a06`; barra destacada `--blue-500`; tooltip em pílula flutuante acima da barra (REF 1); grid horizontal hairline; sem eixo Y visível, rótulos ao lado da última barra |
| `LineChart` | Traço 1.5px; série prevista tracejada `--ink-300`, série real sólida `--blue-500`; pontos só em hover; faixa vertical de destaque `--blue-a08` sob o cursor (REF 3) |
| `AreaChart` | Preenchimento em gradiente `--blue-a16 → transparent`; opção de hachura diagonal (REF 4) |
| `Sparkline` | 40×16px, sem eixos, dentro de `MetricTile` (REF 6) |
| `TickBars` | Série de barras verticais de 2px com gap 2px, parcial em `--blue-500`, resto em `--ink-a08` (REF 1/5) |
| `Gauge` | Arco semicircular 180°, trilho `--ink-a08`, progresso em gradiente azul, valor central (REF 6) |
| `ProtractorGauge` | Quarto de círculo com hachura, para amplitude/escore (REF 3) |
| `RulerScale` | Régua de ticks finos com marcador e tooltip em pílula, faixas rotuladas (REF 5) |
| `DonutChart` | Anel fino (8px), no máximo 5 fatias, tons de azul + cinza para "outros" |
| `HeatGrid` | Grade de ocupação por hora × dia, intensidade em tons de `--blue` |
| `StackedRatioBar` | Barra única segmentada, % dentro do segmento, rótulos nas pontas (REF 6) |

**Regras de todos os gráficos:**
- Sem dados → componente `EmptyState` com ícone, frase honesta ("Sem atendimentos registrados neste período") e ação sugerida. **Nunca uma curva decorativa.**
- Dados insuficientes (n<3) → exibir os pontos, não a tendência.
- Toda cor de série tem rótulo textual acessível; cor nunca é o único portador de informação.
- Tabela equivalente acessível via `<figcaption>` ou botão "ver dados".
- `prefers-reduced-motion` desliga a animação de entrada.

### 6.8 Movimento e transição entre telas

Movimento discreto e funcional. Framer Motion já está no projeto para as ilhas React; para o restante, CSS.

| Evento | Especificação |
|---|---|
| Troca de módulo | Saída: `opacity 1→0`, `translateY 0→-8px`, 120ms. Entrada: `opacity 0→1`, `translateY 12px→0`, 320ms `--ease`. Sem cruzamento. |
| Entrada do grid bento | Stagger de 40ms por widget, `opacity` + `translateY 16px`, máximo 8 itens animados |
| Abertura de modal | Backdrop `opacity` 200ms; card `scale .96→1` + `opacity`, 320ms `--ease` |
| Gaveta lateral | `translateX 100%→0`, 320ms `--ease` |
| Hover de card | `translateY -2px` + sombra `--e-2 → --e-3`, 200ms |
| Hover de linha de tabela | Apenas `background`, 120ms — sem movimento (evita tremor em listas longas) |
| Contadores numéricos | Count-up 480ms `--ease-in-out` na primeira renderização, nunca em atualização |
| Barras/linhas de gráfico | Crescimento a partir da base, stagger 30ms, 480ms |
| Feedback de salvamento | Checkmark desenhado por `stroke-dashoffset`, 400ms |
| Skeleton | Shimmer 1.4s linear infinito, `--ink-a04 → --ink-a08` |
| Troca de paciente no prontuário | Crossfade do painel de contexto 200ms; conteúdo com slide de 8px |

`@media (prefers-reduced-motion: reduce)` → todas as durações para 1ms, nenhuma transformação. Obrigatório.

### 6.9 Áreas de imagem

A referência 3 usa fotografia com tratamento duotone e cards de vidro sobrepostos. Aplicações no nosso painel:

1. **Foto do paciente** — avatar circular 64px no cabeçalho do prontuário, 40px na lista, 32px em cards. *Fallback*: iniciais sobre `--blue-050`, texto `--blue-600`.
2. **Cabeçalho da home do médico** — faixa com o timbrado/identidade visual em gradiente suave, sem foto de banco de imagens.
3. **Preview do timbrado** — área de configuração com pré-visualização real do papel carregado.
4. **Anexos** — grade de miniaturas de exames com lightbox.
5. **Logotipo da clínica** — `assets/logo.svg` (vetorial, já existe) no rail e nos documentos.
6. **Assinatura digitalizada** — upload opcional, exibida no bloco de assinatura dos documentos.

**Proibido:** fotos de banco de imagens genéricas, ilustrações 3D decorativas, gradientes chamativos. O painel é uma ferramenta de trabalho.

### 6.10 Acessibilidade (requisito, não opcional)

- Contraste **AA mínimo**: 4.5:1 para texto normal, 3:1 para texto ≥18px e para elementos gráficos. `--ink-400` sobre `--surface` atinge 4.6:1 — ok para rótulos; **não usar** `--ink-300` para texto essencial.
- Foco visível em todo elemento interativo: `outline: 2px solid var(--blue-500); outline-offset: 2px`. Nunca `outline: none` sem substituto.
- Navegação completa por teclado, incluindo agenda e tabelas. `Esc` fecha modal e devolve foco ao gatilho.
- Landmarks ARIA, `aria-live` para toasts e resultados de busca, `aria-describedby` em campos com erro.
- Alvos de toque ≥44px no modo compacto.
- Rótulos em português, claros, sem jargão de sistema.

---

## PARTE 7 — SEGURANÇA E PROTEÇÃO DE DADOS

Dados de saúde de crianças são, na LGPD, **dado pessoal sensível de titular menor de idade** — a combinação de maior proteção legal existente no Brasil. Esta parte não é opcional.

### 7.1 Marco legal aplicável

| Norma | Exigência prática |
|---|---|
| **LGPD (Lei 13.709/2018)** | Art. 11, II, "a" e "f": tratamento de dado de saúde dispensa consentimento quando necessário para **tutela da saúde** por profissional de saúde — mas comunicação de marketing, lembrete por WhatsApp e compartilhamento com terceiros **exigem consentimento específico**. Art. 14: dado de criança e adolescente exige **consentimento específico de ao menos um dos pais ou responsável legal**, em destaque. |
| **Res. CFM 1.821/2007** | Prontuário eletrônico: guarda mínima de **20 anos** a partir do último registro; eliminação do papel só com sistema certificado **SBIS-CFM nível NGS2**; assinatura digital **ICP-Brasil** obrigatória. |
| **Res. CFM 2.314/2022** | Telemedicina: registro em prontuário, consentimento do paciente/responsável, segurança da transmissão. |
| **Portaria SVS/MS 344/98** | Receituário de controle especial: numeração, vias, identificação do emitente e do comprador. |
| **Lei 14.510/2022** | Telessaúde no SUS e privado; sigilo e segurança dos dados. |
| **Código de Ética Médica** | Sigilo profissional; acesso ao prontuário restrito e rastreável. |

**Entregável obrigatório do projeto:** Registro de Operações de Tratamento (ROPA) e base para o Relatório de Impacto (RIPD), gerados a partir do inventário de dados do módulo de Configurações.

### 7.2 Autenticação

- Senha: mínimo 12 caracteres, verificação contra lista de senhas vazadas (k-anonymity via HIBP no BFF), **hash Argon2id** (`m=64MB, t=3, p=4`) **no servidor**. O navegador jamais processa, armazena ou transmite hash de senha.
- **MFA TOTP obrigatório** para todos os perfis. Códigos de recuperação de uso único, exibidos uma vez.
- **WebAuthn/Passkey** como alternativa preferencial ao TOTP.
- Rate limiting: 5 tentativas / 15 min por conta + por IP; backoff exponencial; bloqueio com notificação por e-mail.
- Sessão: cookie `HttpOnly; Secure; SameSite=Strict`, **nunca token em `localStorage`**. Rotação de token a cada renovação. Expiração absoluta em 8h.
- **Step-up authentication**: re-inserção de senha ou MFA para emitir documento, exportar dados, alterar permissões, visualizar dados bancários ou excluir registro.

### 7.3 Autorização

Matriz RBAC **deny-by-default**, avaliada no servidor. A verificação no cliente é apenas conveniência de UI e nunca é a fronteira de segurança.

| Recurso | Médico/Admin | Atendimento | Financeiro |
|---|---|---|---|
| Prontuário (ler) | ✅ total | ⛔ | ⛔ |
| Prontuário (escrever) | ✅ | ⛔ | ⛔ |
| Ficha cadastral | ✅ | ✅ (sua praça) | ⛔ |
| Agenda | ✅ | ✅ (sua praça) | 👁 leitura |
| Documentos clínicos | ✅ emitir/assinar | 👁 status | ⛔ |
| Financeiro | ✅ | 👁 valor da consulta | ✅ |
| Dados bancários de terceiros | ✅ com step-up | ⛔ | ✅ com step-up |
| Auditoria | ✅ | ⛔ | 👁 próprios |
| Configurações/usuários | ✅ | ⛔ | ⛔ |
| Exportação de dados | ✅ com step-up | ⛔ | ✅ financeiro |

**RLS por praça:** todo registro carrega `praca`. Toda consulta filtra pela praça ativa do usuário. Um usuário de Fortaleza não pode, por nenhum caminho, listar pacientes de Campinas. Na v2 (Postgres/Supabase), isso é **Row Level Security no banco**, não filtro na aplicação.

### 7.4 Criptografia

- **Em trânsito:** TLS 1.3 exclusivamente; HSTS com `max-age=31536000; includeSubDomains; preload`.
- **Em repouso (v1, local-first):** o store IndexedDB é cifrado com **AES-256-GCM** via WebCrypto. Chave derivada da senha do usuário com **PBKDF2 (600.000 iterações, SHA-256)** ou Argon2id via WASM, mantida apenas em memória durante a sessão. Ao bloquear a tela ou expirar a sessão, a chave é descartada e o store fica ilegível.
- **Em repouso (v2, servidor):** criptografia de disco + **criptografia em nível de campo** para CPF, CNS, dados bancários, conteúdo de evolução clínica e anexos, com **envelope encryption** e chaves em KMS. Rotação anual de DEK.
- **Anexos:** cifrados antes de gravar; nome de arquivo não revela conteúdo clínico.
- **Hash de documento:** SHA-256 do conteúdo canônico, armazenado com o documento, base da verificação de integridade e da assinatura.

### 7.5 O problema dos segredos — correção obrigatória

**Situação atual (vulnerabilidade real):**
```js
// admin.js:3710 — EXPOSTO A QUALQUER VISITANTE
const SIGNATURE_API_CONFIG = {
  birdid: { clientId: "...", clientSecret: "...", cpf: "00361562306" }
}
```
Qualquer pessoa com o painel carregado lê essas credenciais no DevTools. Além do segredo, há **CPF do médico em código-fonte**.

**Arquitetura obrigatória:**
```
Navegador  ──POST /api/documents/{id}/sign { pin }──►  BFF
                                                        │ detém client_secret
                                                        │ calcula/valida hash
                                                        ▼
                                              Bird ID / VIDaaS / ICP-Brasil
Navegador  ◄── { signatureId, verificationUrl, signedAt } ──  BFF
```
O mesmo vale para WhatsApp Cloud API (token), SMTP, NFS-e e qualquer integração futura. **Regra absoluta: se é segredo, não existe no bundle do navegador.** Verificação automatizada: um script de CI que falha o build se encontrar padrões de chave (`client_secret`, `api_key`, `Bearer `, chaves de 32+ caracteres) nos arquivos do painel.

### 7.6 Cabeçalhos e política de conteúdo

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}';
  style-src 'self' 'nonce-{RANDOM}';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' https://api.clinicacharlington.com.br;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), microphone=(), camera=(self), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

**Consequência direta para o código:** CSP com nonce e sem `unsafe-inline` **elimina** os `onclick=` inline e os `style=` inline que dominam o `admin.html` atual. Não é uma preferência de estilo — é uma dependência da política de segurança.

Fontes: a fonte Inter deve ser **auto-hospedada** (`admin/assets/fonts/`), removendo a dependência de `fonts.googleapis.com` — que hoje impede `style-src 'self'` e vaza o IP do usuário para terceiro.

### 7.7 Defesas de aplicação

| Vetor | Defesa exigida |
|---|---|
| **XSS** | Proibido `innerHTML` com dado de usuário. Renderização por `textContent` ou template com escape. Editor rico: sanitização por allowlist estrita (DOMPurify com perfil restrito), no servidor **e** no cliente. |
| **CSRF** | `SameSite=Strict` + token anti-CSRF por sessão em toda mutação. |
| **Clickjacking** | `frame-ancestors 'none'`. |
| **IDOR** | Toda leitura verifica posse/permissão no servidor. IDs são UUID v4, nunca sequenciais. |
| **Enumeração** | Login e recuperação respondem igual para conta existente ou não. |
| **Injeção** | Queries parametrizadas; nenhuma concatenação de SQL. |
| **Upload malicioso** | Allowlist de MIME real (magic bytes, não extensão); limite de 25 MB; varredura antivírus no BFF; servido com `Content-Disposition: attachment` e `X-Content-Type-Options: nosniff`; **nunca** executado a partir do domínio da aplicação. |
| **Prototype pollution** | `Object.freeze` em configurações; `JSON.parse` com reviver que descarta `__proto__`. |
| **Dependências** | `package-lock.json` versionado; `npm audit` no CI; Dependabot; nenhuma dependência nova sem justificativa registrada. |
| **Vazamento em log** | Logs nunca contêm PII/PHI. Identificação por UUID. |
| **Dado em URL** | Proibido CPF, nome ou ID de paciente em query string (vai para histórico, referer e logs de proxy). |
| **Clipboard/impressão** | Documento impresso carrega marca de origem; cópia em massa de prontuário é evento de auditoria de risco. |

### 7.8 Auditoria imutável

```js
registro = {
  id, timestamp,          // ISO 8601 com timezone
  usuarioId, papel, praca,
  acao,                   // CREATE|READ|UPDATE|DELETE|SIGN|EXPORT|LOGIN|LOGIN_FAIL|PERMISSION_CHANGE
  entidade, entidadeId,
  camposAlterados,        // nomes apenas; valores sensíveis não vão para o log
  ip, userAgent, sessaoId,
  hashAnterior,           // encadeamento
  hash                    // SHA-256(conteúdo + hashAnterior)
}
```

- **Append-only.** Nenhum caminho da aplicação altera ou remove registro de auditoria.
- **Cadeia verificável**: função de verificação de integridade disponível na UI; quebra da cadeia gera alerta.
- **Leitura de prontuário é evento auditável** — exigência do CFM e da LGPD.
- Retenção do log: **mínimo 6 meses** (LGPD, Marco Civil art. 15 por analogia) — recomendado 5 anos, alinhado ao prontuário.
- Eventos de risco geram alerta ativo: acesso fora do horário, volume anormal de leitura, exportação em massa, falhas de login sequenciais, mudança de permissão.

### 7.9 Ciclo de vida do dado

| Etapa | Regra |
|---|---|
| Coleta | Minimização: só o que tem finalidade declarada. Cada campo do formulário tem justificativa. |
| Consentimento | Versionado, com data, IP e texto exato apresentado. Revogável em um clique. Comunicação por WhatsApp/e-mail exige opt-in separado do consentimento de tratamento clínico. |
| Retenção | Prontuário: 20 anos do último registro (CFM). Financeiro: 5 anos (fiscal). Comunicação: 2 anos. Log: 5 anos. |
| Eliminação | Ao fim da retenção, anonimização irreversível preservando dado estatístico. Nunca exclusão física de prontuário dentro do prazo legal. |
| Portabilidade | Exportação do prontuário completo em PDF + JSON estruturado, a pedido do titular/responsável, com identificação verificada. |
| Incidente | Procedimento documentado: contenção, avaliação, **comunicação à ANPD e aos titulares em prazo razoável**, registro. |
| Backup | 3-2-1: 3 cópias, 2 mídias, 1 fora do local. Cifrado. **Teste de restauração trimestral registrado.** |

### 7.10 Checklist de segurança do build

Antes de qualquer entrega, todos verdes:

- [ ] Nenhum segredo em `admin/**` (script de CI passa)
- [ ] Nenhum `onclick=` / `on*=` inline
- [ ] Nenhum `innerHTML` com dado de usuário
- [ ] CSP sem `unsafe-inline` e sem `unsafe-eval`
- [ ] Inter auto-hospedada; zero requisição a domínio de terceiro
- [ ] Todo endpoint de mutação exige CSRF token
- [ ] Toda rota verifica RBAC + RLS no servidor
- [ ] Store local cifrado; chave descartada ao bloquear
- [ ] Timeout de sessão e step-up implementados
- [ ] Log de auditoria encadeado e verificável
- [ ] `npm audit` sem vulnerabilidade alta ou crítica
- [ ] Headers de segurança configurados no servidor de produção
- [ ] Nenhum dado fictício remanescente (busca por "Lucas", "Silva Santos", "senha123", CPFs de exemplo)

---

## PARTE 8 — SKILLS E FERRAMENTAS DE EXECUÇÃO

### 8.1 Skills a acionar

| Fase | Skill | Uso |
|---|---|---|
| Toda a construção visual | **`frontend-design`** (`.agents/skills/frontend-design`) | Skill primária de UI: disciplina de layout, hierarquia, densidade |
| Sistema de design | **`design:design-system`** | Auditar consistência de tokens, documentar variantes e estados dos componentes |
| Direção estética | **`awesome-design-skills`** → perfis `clean`, `minimal`, `refined`, `professional`, `premium` | Calibrar o acabamento sem trair a marca |
| Interações | **`gsap-skills`** / Framer Motion | Transições entre telas e entrada de dados |
| Componentes base | **`shadcn-ui-complete`** + **`components.json`** | Padrões de composição e acessibilidade |
| Gráficos | **`dataviz`** | **Obrigatória antes de escrever a primeira linha de gráfico.** Define paleta categórica acessível, forma, marcas, legendas |
| Acabamento | **`impeccable`** | Passada final de qualidade sobre as telas principais |
| Revisão de acessibilidade | **`design:accessibility-review`** | Antes de cada rodada de design-loop |
| Crítica | **`anthropic-skills:design-loop`** | **3 rodadas obrigatórias** ao final — ver Parte 9 |
| Segurança | **`security-review`** | Após a implementação, antes da entrega |
| Qualidade de código | **`simplify`** e **`code-review`** | Ao fim de cada fase de implementação |

### 8.2 MCP 21st.dev

Autorizado pelo cliente para acelerar a camada gráfica. Uso disciplinado:

1. **Buscar** com `search` (type: `component`) por: `stat card`, `KPI metric`, `area chart card`, `data table`, `command palette`, `calendar scheduler`, `timeline`, `file upload`, `sidebar navigation`, `avatar group`, `progress ring`, `empty state`.
2. **Recuperar** com `get_component` apenas os que realmente entram no produto — a recuperação é cota paga.
3. **Adaptar antes de integrar** — todo componente importado é reescrito para:
   - usar **nossos tokens** (`tokens.css`), nunca as cores originais;
   - remover dependências de Tailwind/shadcn não instaladas, ou instalá-las de forma justificada;
   - respeitar CSP (sem estilo inline, sem `eval`);
   - ter texto em **português**;
   - passar na revisão de acessibilidade.
4. **Registrar** em `docs/COMPONENTES-IMPORTADOS.md`: origem, autor, licença, o que foi alterado.

Candidatos já identificados na busca inicial: *Advanced Stats* (#19070), *Progress Metric Card* (#15024), *Stat Card* (#26138), *Weekly KPI Chart* (#2503) — este último especialmente alinhado à estética de barras verticais minimalistas das REF 1 e 5.

Também disponíveis: `search` com `type: theme` para checar consistência cromática, e `search_logo` se for preciso um ícone de marca de integração (WhatsApp, Google).

### 8.3 Verificação visual durante o desenvolvimento

Usar o navegador embutido (`preview_start` + `mcp__Claude_Browser__*`) para abrir o painel em execução, navegar, capturar tela e comparar com esta especificação a cada entrega de fase. Nenhuma fase é dada como concluída sem verificação visual real da tela rodando — não basta o código parecer correto.

---

## PARTE 9 — PLANO DE EXECUÇÃO

### Fase 0 — Fundação *(nada visível ainda)*
`tokens.css` · `base.css` · sprite de ícones · Inter auto-hospedada · `store.js` · `repository.js` + `idb-adapter.js` com cifragem · `schema.js` · `rbac.js` · `audit.js` · `router.js` · shell do app (rail + topbar) · scripts de CI de segurança.
**Saída:** shell navegável com todos os módulos vazios e o design system aplicado.

### Fase 1 — Acesso e governança
Login + MFA · gestão de sessão · wizard de configuração inicial (clínica, praças, usuários, salas, tipos de consulta, valores) · configurações · auditoria.
**Saída:** é possível criar a clínica do zero e entrar com um usuário real.

### Fase 2 — Pacientes e prontuário *(a fase mais longa e mais importante)*
Lista · ficha completa · prontuário de três colunas · linha do tempo · evolução SOAP · CID-10 · escalas · marcos · medicações · anexos · anamnese digital · painel de contexto.
**Saída:** o médico consegue cadastrar, atender e registrar uma criança de ponta a ponta.

### Fase 3 — Agenda e atendimento
Vistas dia/semana/mês/lista · bloqueios · lista de espera · check-in · fluxo de atendimento · teleconsulta.
**Saída:** a recepção opera o dia.

### Fase 4 — Documentos clínicos
Papel timbrado preservado e ampliado · editor de templates · prescrição estruturada · receituário de controle especial · numeração + QR · assinatura via BFF · assinatura em lote · `print.css` · entrega.

### Fase 5 — Comunicação
WhatsApp Cloud API · e-mail · central de mensagens · regras de automação · gestão de opt-in.

### Fase 6 — Financeiro e operações
Fluxo de caixa · a pagar/receber · repasses · centro de custo · DRE · conciliação · estoque · salas · equipe.

### Fase 7 — Relatórios e BI
Biblioteca de relatórios · exportação PDF/CSV · dashboards por papel completos.

### Fase 8 — Endurecimento
`security-review` · checklist da Parte 7.10 · varredura de dado fictício · teste de restore de backup · `simplify` · `code-review`.

### Fase 9 — Três rodadas de `/design-loop`

**Rodada 1 — Estrutura.** Alvo: Visão Geral (3 papéis), Lista de Pacientes, Prontuário.
Referência de comparação: REF 3 (AI Health) + REF 4 (Orvion).
Critérios: hierarquia, densidade, ritmo do grid, o médico encontra o que precisa em 3 segundos.

**Rodada 2 — Dados e componentes.** Alvo: todos os gráficos, tabelas, KPIs, estados vazios e de carregamento.
Referência: REF 1 (Callivio) + REF 2 (Ledgerix) + REF 6 (Convox).
Critérios: legibilidade do dado, honestidade da visualização, consistência entre gráficos, qualidade dos estados vazios.

**Rodada 3 — Acabamento.** Alvo: documentos clínicos, modais, transições, micro-interações, responsividade, impressão.
Referência: REF 5 (Clerio) + design system Charlington.
Critérios: nada parece inacabado; o painel parece da mesma família do site público; o documento impresso está perfeito.

Cada rodada: construir → três críticos de contexto limpo avaliam → corrigir → repetir até consenso de que a nossa versão supera a referência no critério da rodada.

### Fase 10 — Entrega
`DESIGN.md` do painel · `COMPONENTES-IMPORTADOS.md` · ROPA/inventário LGPD · manual do usuário por papel · relatório de segurança.

---

## PARTE 10 — CRITÉRIOS DE ACEITE

O projeto está pronto quando **todas** as afirmações abaixo são verdadeiras e verificáveis:

**Funcional**
1. É possível configurar a clínica do zero, sem nenhum dado pré-existente, e chegar a um atendimento completo registrado.
2. Uma criança pode ser cadastrada, atendida, ter evolução registrada, escala aplicada, exame anexado, documento emitido e assinado, e o responsável notificado — sem sair do painel.
3. Os quatro papéis veem exatamente o que devem ver, e nada além.
4. O isolamento entre Campinas e Fortaleza é inviolável pela interface.
5. O documento em papel timbrado sai da impressora idêntico ao preview.

**Visual**
6. Nenhuma tela usa cor fora de `tokens.css`.
7. Nenhum lime, mint ou azul-bebê das referências sobreviveu.
8. Todo gráfico tem estado vazio desenhado e honesto.
9. O painel e o site público são reconhecíveis como a mesma marca.
10. Nenhum emoji na interface; todos os ícones são SVG do sprite.
11. Três rodadas de `/design-loop` concluídas com consenso dos críticos.

**Segurança**
12. Checklist da Parte 7.10 integralmente verde.
13. Nenhum segredo no bundle do navegador.
14. Log de auditoria encadeado, verificável e append-only.
15. Store local cifrado; chave descartada ao bloquear.
16. `security-review` sem achado alto ou crítico.

**Escopo**
17. `git diff` não mostra alteração em nenhum arquivo do site público.
18. Busca por dado fictício no código retorna zero resultados.

---

## APÊNDICE A — Glossário de domínio

**PEP** Prontuário Eletrônico do Paciente · **SOAP** Subjetivo/Objetivo/Avaliação/Plano · **CID-10** Classificação Internacional de Doenças · **CNS** Cartão Nacional de Saúde · **TEA** Transtorno do Espectro Autista · **TDAH** Transtorno de Déficit de Atenção e Hiperatividade · **DNPM** Desenvolvimento Neuropsicomotor · **M-CHAT-R/F** rastreio de autismo 16–30 meses · **SNAP-IV / Vanderbilt / Conners** escalas de TDAH · **ASQ-3 / Denver II** rastreio de desenvolvimento · **CARS-2** escala de avaliação de autismo · **TO** Terapia Ocupacional · **NGS2** Nível de Garantia de Segurança 2 (SBIS-CFM) · **RLS** Row Level Security · **RBAC** Role-Based Access Control · **BFF** Backend For Frontend · **ROPA** Registro de Operações de Tratamento · **RIPD** Relatório de Impacto à Proteção de Dados · **ANPD** Autoridade Nacional de Proteção de Dados

## APÊNDICE B — Referências consultadas

| # | Projeto | URL |
|---|---|---|
| 1 | Callivio — CRM SaaS | behance.net/gallery/225485473 |
| 2 | Ledgerix — CRM/FMS Dashboard | behance.net/gallery/232976091 |
| 3 | AI Health Platform Dashboard ★ | behance.net/gallery/251598713 |
| 4 | Modern CRM & Analytics (Orvion) | behance.net/gallery/236915009 |
| 5 | Clerio — CRM Financial AI | behance.net/gallery/232759773 |
| 6 | Convox — Call Center SaaS | behance.net/gallery/225853541 |

Design system interno: `DesignCharlington.md` · Imagens de referência arquivadas em alta resolução durante a extração.

---

*Fim do prompt-mestre. Qualquer decisão não coberta aqui deve ser resolvida na direção que melhor sirva a quem usa o painel todo dia — o médico e a equipe da clínica.*
