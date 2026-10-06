# Prompt para o Antigravity — correções da passada 19 (painel administrativo Charlington)

> Cole tudo o que está abaixo da linha no Antigravity. É um prompt fechado: traz contexto, regras, cada defeito com arquivo e linha, a correção esperada e como verificar.

---

Você vai corrigir defeitos num painel administrativo já construído. Trabalhe em pequenos passos e não refatore o que não foi pedido.

## Projeto

- Pasta: `/Users/iagolima/Downloads/Projetos/Site Charlington`
- Painel administrativo: pasta `admin/` (React 19 + Vite, HashRouter, sem TypeScript).
- Persistência local: IndexedDB por trás de `admin/data/repository.js`; o mesmo contrato serve ao adaptador Supabase.
- Estilos: `admin/styles/` — `tokens.css` é a única fonte de cor, tipo, espaço, raio, sombra e tempo. Nenhum valor literal fora dele.
- Comentários e textos de interface em português do Brasil. Comentário só quando explica uma decisão; nada de comentário narrando o óbvio.
- Compilar com: `npx vite build --outDir /tmp/build-charlington --emptyOutDir` (não escreva em `dist/`).

## Regras que não podem ser quebradas

1. **Só mexa no que está listado abaixo.** Nada de reorganizar pastas, renomear componentes ou "melhorar" telas não citadas.
2. **Não toque no menu vertical nem na pílula "Dashboard" do topo.** São desenho manual do dono do produto: `src/components/ui/floating-dock.jsx`, `src/components/ui/floating-dock.css`, o componente `Rail` em `admin/components/Shell.jsx`, e as regras `.rail*`, `.floating-dock*` e `.explore-pill*` em `admin/styles/layout.css`. Se um ajuste parecer precisar disso, pare e relate em vez de alterar.
3. **Nenhum dado fictício.** Número que aparece na tela vem de registro; sem registro, a tela diz que não há. Nunca preencha com exemplo, média inventada ou valor provisório.
4. **Nenhum valor literal de estilo.** Use os tokens de `admin/styles/tokens.css`. Se precisar de um token que não existe, não invente `var()` — escolha o token existente mais próximo.
5. Preserve o comportamento de auditoria: o log é encadeado por hash (`admin/core/audit.js`); não altere o cálculo de hash nem a ordem de gravação.

## Defeito 1 — GRAVE · O filtro "Consentimento concedido" diz que não existe nenhum, com 109 no próprio log

**Onde:** `admin/modules/patients/views/ConsentsView.jsx` (funções `grant` e `revoke`, por volta das linhas 84 e 112), `admin/data/repository.js` (`create` e `update`), `admin/modules/audit/AuditScreen.jsx` (seletor de operações e estado vazio).

**O que acontece:** o seletor de operações da Auditoria oferece "Consentimento concedido" e "Consentimento revogado" (constantes `CONSENT_GIVEN` e `CONSENT_REVOKED`, já declaradas em `admin/core/audit.js`), mas nenhum código emite essas ações. Conceder consentimento chama `repo.create(STORES.CONSENTS, …)`, que grava a ação genérica `CREATE`; revogar chama `repo.update`, que grava `UPDATE`. Resultado medido: o filtro "Consentimento concedido" devolve 0 linhas e a mensagem "Nenhum evento encontrado", enquanto o log guarda 109 eventos "Criação · Consentimento" — os mesmos 109 que o inventário LGPD de `#/configuracoes` lista.

**Por que é erro:** quem audita o consentimento de teleconsulta de uma criança usa exatamente esse filtro, lê "Nenhum evento encontrado" e conclui que não há registro. E o painel de Consentimentos do prontuário afirma, por escrito, que "cada concessão e cada revogação gera um registro imutável no log de auditoria".

**Como corrigir:**

1. Em `admin/data/repository.js`, aceite uma ação de auditoria semântica nas escritas, sem duplicar registro:
   - `create(store, data, { auditAction, auditDetail } = {})` → grave `audit.log({ action: auditAction ?? ACTIONS.CREATE, entity: store, entityId: record.id, detail: auditDetail ?? null })` no lugar do `audit.logCreate` atual.
   - `update(store, id, changes, { auditAction, auditDetail } = {})` → mesma ideia, caindo em `ACTIONS.UPDATE` quando nada for passado.
   - Um ato, um registro: não grave `CREATE` e `CONSENT_GIVEN` para a mesma concessão.
2. Em `ConsentsView.jsx`:
   - `grant(purpose)` passa `{ auditAction: ACTIONS.CONSENT_GIVEN, auditDetail: '<Finalidade> · versão <TEXT_VERSION> · responsável <nome do responsável>' }`.
   - `revoke()` passa `{ auditAction: ACTIONS.CONSENT_REVOKED, auditDetail: '<Finalidade> · versão <versão do registro>' }`.
   - Importe `ACTIONS` de `../../../core/audit.js`.
3. Em `AuditScreen.jsx`, o estado vazio de um filtro não pode soar como "não existe registro". Quando o filtro devolve 0 mas o log tem eventos, escreva quantos existem fora daquele recorte, por exemplo: "Nenhum evento de «Consentimento concedido». O log tem 592 eventos de outras operações."
4. A base local de verificação (`.claude/design-loop/seed-verificacao.js`) cria consentimentos por `repo.create`; passe a mesma opção lá, para que a base reflita o produto.

**Como verificar:** abrir `#/auditoria`, escolher "Consentimento concedido" e conferir que a contagem bate com o número de consentimentos vigentes do inventário LGPD em `#/configuracoes`. Revogar um consentimento no prontuário e ver o evento aparecer em "Consentimento revogado".

## Defeito 2 — GRAVE · A coluna DETALHE é "—" em 100% dos eventos, e o subtítulo promete "quem leu qual prontuário"

**Onde:** `admin/data/repository.js` (função `get`, chamada `audit.logRead(store, id)`), `admin/modules/audit/AuditScreen.jsx` (coluna DETALHE e o subtítulo da página, por volta da linha 162).

**O que acontece:** o subtítulo diz "Registro imutável e encadeado de tudo o que acontece no painel — inclusive de quem leu qual prontuário". Na tabela, a coluna DETALHE é `—` em todos os eventos, inclusive nos de Leitura: nunca se sabe qual prontuário foi lido.

**Por que é erro:** o rótulo promete o que o dado não entrega, e é justamente o registro que a clínica precisaria numa fiscalização. A nota de rodapé da tela explica que valores sensíveis (CPF, evolução clínica, dados bancários) ficam fora do log — o nome do prontuário lido não é nenhum desses.

**Como corrigir:**

1. Em `repository.get`, ao registrar leitura de prontuário, grave um detalhe legível. O nome do paciente deve ser resolvido **sem** passar de novo pelo `get` auditado (use o adaptador direto, para não gerar evento de leitura recursivo):
   - `pacientes` → `Prontuário de <nome>`;
   - `evolucoes`, `documentos`, `escalas`, `anamneses` → `<Entidade> de <nome do paciente>` (o registro tem `pacienteId`).
2. Faça o mesmo para escrita, quando houver paciente envolvido: criar evolução, emitir documento e agendar consulta devem dizer de quem.
3. Em `AuditScreen.jsx`, quando `detalhe` for nulo, nunca renderize `—` sozinho: mostre a entidade e o identificador curto do registro (por exemplo `registro 4f2ac1…`), que é o mínimo que permite rastrear.
4. Se depois disso alguma família de evento ainda não puder dizer "quem leu qual prontuário", ajuste o subtítulo para o que a tela realmente entrega — mas a primeira escolha é entregar o que ele promete.

**Como verificar:** filtrar "Leitura" em `#/auditoria` e confirmar que cada linha nomeia o prontuário. Nenhuma linha da tabela pode ficar com a coluna DETALHE vazia.

## Defeito 3 — MÉDIO · Nome de tabela do banco aparecendo como rótulo

**Onde:** `admin/modules/audit/AuditScreen.jsx`, mapa `ENTITY_LABELS` (por volta da linha 45).

**O que acontece:** a coluna OPERAÇÃO mostra "Criação **responsaveis**", "Criação **insumos**", "Criação **salas**" — minúsculo, plural, sem acento — ao lado de rótulos corretos como "Criação Paciente" e "Criação Consentimento". O mapa só cobre nove entidades; o resto cai no nome cru da store.

**Por que é erro:** nome de tabela não é rótulo de interface; quem lê o log não conhece o esquema do banco.

**Como corrigir:**

1. Complete `ENTITY_LABELS` com todas as stores de `admin/data/schema.js` (`STORES`), no singular e com acento: Responsável, Insumo, Sala, Bloqueio de agenda, Marco do desenvolvimento, Medicação, Mensagem, Automação, Repasse, Modelo de documento, Profissional, Anamnese, Atendimento, Clínica, Usuário, Arquivo de anexo, Lançamento financeiro, Log de auditoria, Configuração interna.
2. O fallback nunca pode imprimir a chave crua: use "Registro do sistema" quando a store for desconhecida.
3. Deixe um comentário curto no mapa dizendo que toda store nova precisa entrar ali.

**Como verificar:** carregar `#/auditoria` sem filtro e confirmar que nenhuma etiqueta da coluna OPERAÇÃO aparece em minúsculas ou no plural do banco.

## Defeito 4 — MÉDIO · "Concedido em" numa finalidade que a própria tela diz dispensar consentimento

**Onde:** `admin/modules/patients/views/ConsentsView.jsx`, por volta da linha 164 (`Concedido em ${dateTime(record.concedidoEm)} · versão ${record.versaoTexto}`), lista `PURPOSES` a partir da linha 27.

**O que acontece:** a finalidade "Tratamento clínico (tutela da saúde)" traz a descrição "Dispensa consentimento por ser tutela da saúde, mas o responsável deve ser informado" e, logo abaixo, "Concedido em 19/07/2026 09:00 · versão 1.0".

**Por que é erro:** o verbo registra uma concessão que a própria tela acabou de dizer ser dispensável. O que foi registrado é a **informação ao responsável**, não um consentimento.

**Como corrigir:**

1. Quando `purpose.basis.requiresConsent` for falso, o texto do registro passa a ser "Responsável informado em `<data>` · versão `<versão>`".
2. Ajuste, na mesma condição, o rótulo do botão e a mensagem de sucesso: "Registrar que o responsável foi informado" e "Registro de informação ao responsável salvo".
3. O chip "Base legal própria" continua como está.

**Como verificar:** abrir um prontuário em Consentimentos e conferir que só as finalidades que exigem consentimento usam a palavra "Concedido".

## Defeito 5 — MENOR · O contador "08 Consentimentos · 1" não diz o que conta

**Onde:** `admin/modules/patients/PatientRecordScreen.jsx`, linha 113 (`consentimentos: record.consents.filter((c) => !c.revogadoEm).length || null`).

**O que acontece:** o índice do prontuário mostra "08 Consentimentos · 1". O vizinho, "07 Documentos · 1 a emitir", nomeia o que conta; este não. São 1 vigente entre 6 finalidades.

**Como corrigir:** use o mesmo formato de objeto que Documentos já usa (`{ value, tone, hint }`) e escreva o que o número é: `1 vigente` — e, se houver finalidade que exige consentimento e ainda não tem registro, prefira a pendência, como Documentos faz.

**Como verificar:** o índice do prontuário mostra "08 Consentimentos · 1 vigente" (ou a pendência equivalente).

## Defeito 6 — Sistema · O esqueleto de carregamento não tem a forma da tela que ele vira

**Onde:** `admin/App.jsx`, componente `RouteFallback` (por volta da linha 28); classe `.skeleton--card` em `admin/styles/components/card.css`.

**O que acontece (medido contra `#/relatorios` real):**

| peça | esqueleto hoje | o que realmente vem |
|---|---|---|
| 1º bloco após o cabeçalho | dois blocos lado a lado, 566×168 e 566×72 | faixa de KPIs única, 1156×216 |
| sobrelinha | 96×10 | 496×13 |
| título | 216×28 | 496×25 |
| descrição | 432×14 | 496×20 |
| botão do cabeçalho | 168×36 em x=1088 | 150×38 em x=1106 |

**Por que é erro:** as 11 rotas abrem com cabeçalho e uma faixa de KPIs de largura total. O esqueleto promete duas colunas onde vem uma faixa só, e usa alturas de linha que não existem no sistema — o layout salta quando os dados chegam.

**Como corrigir:** refazer `RouteFallback` com a forma real: sobrelinha 13 px, título 25 px, descrição 20 px, botão 150×38 à direita; depois **um** bloco de largura total com 216 px (a faixa de KPIs); depois os cards do conteúdo (456 e 216), mantendo o passo de 24 px entre blocos. Continue usando a classe `card` do `Skeleton` (superfície, borda e elevação do card).

**Como verificar:** trocar de rota e medir: o primeiro bloco depois do cabeçalho tem a largura do conteúdo e 216 px de altura; ao carregar, nenhum elemento salta de posição.

## Defeito 7 — Sistema · Três `var()` apontando para tokens que não existem

**Onde:**

- `admin/styles/components/forms.css:396` → `border-color: var(--blue-400) !important;`
- `admin/styles/components/forms.css:358` → `color: var(--ink-700);`
- `admin/styles/components/modules.css:657` e `:680` → `font-size: var(--t-xs);`

**O que acontece:** `--blue-400`, `--ink-700` e `--t-xs` não existem em `tokens.css`. O `border-color` cai para `currentColor` e o contorno do hover fica azul escuro em vez de um azul claro; `--ink-700` herda a cor do pai; `--t-xs` cai para 13 px por acaso.

**Como corrigir:** trocar pelos tokens existentes — `--blue-300` no contorno de hover, `--ink-600` no texto e `--t-micro` no tamanho. Não crie tokens novos para isso. Depois, varra o CSS em busca de qualquer outro `var(--…)` que não resolva e corrija do mesmo jeito.

**Como verificar:** nenhuma declaração pode depender de token inexistente; o hover do botão de adicionar responsável mostra contorno azul claro.

## Defeito 8 — Sistema · A regra de destacar o líder vale em dois dos três rankings da mesma tela

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, card "Duração média por tipo" (por volta da linha 435, `CategoryBars … emphasis={() => 'plain'}`), comparado com "Tipos de atendimento" e "Perfil epidemiológico" na mesma tela.

**O que acontece:** os outros dois rankings pintam o líder com a cor de dado forte; a duração deixa todas as barras na cor média, inclusive a maior. A escolha é proposital (diferença pequena não merece coroa), mas a tela não diz isso quando mostra as barras — e o mesmo componente fica com duas aparências sem explicação.

**Como corrigir:** manter a regra, mas torná-la visível. Quando as barras aparecem sem líder destacado, a nota do card deve dizer por quê, no mesmo lugar em que hoje aparece a ressalva de amostra: "Nenhum tipo é destacado: a diferença entre eles está dentro da variação normal." Quando a diferença for relevante (o mesmo limiar que o código já usa), destaque o líder como nos outros dois rankings.

**Como verificar:** em `#/relatorios`, nos quatro períodos, todo `CategoryBars` ou destaca o líder ou explica por escrito por que não destaca.

## Ao terminar

1. `npx vite build --outDir /tmp/build-charlington --emptyOutDir` sem erro.
2. Abrir `#/auditoria`, `#/pacientes/<id>` (Consentimentos), `#/relatorios` e uma troca de rota qualquer, conferindo os itens de verificação acima.
3. Relatar, item a item, o que foi alterado e em qual arquivo — e o que não foi possível fazer, se for o caso, sem inventar solução.
