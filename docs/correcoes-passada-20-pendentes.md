# Prompt para o Antigravity — o que ficou faltando da passada 20

> Conferi o repositório depois da sua rodada: 11 dos 18 defeitos de `docs/correcoes-passada-20.md` estão aplicados. Os 7 abaixo continuam como estavam. Cole tudo o que está abaixo da linha.

**Já aplicados, não mexa:** KPI "A pagar em aberto" e aviso do que vence; estado vazio de "Pago por categoria"; esteira do atendimento com desfecho registrado e "Corrigir desfecho"; blocos da agenda posicionados por duração; contador de Consentimentos ("vigentes"); KPI da Auditoria acompanhando o filtro; esqueleto com faixa de largura total; `role="button"` nas linhas de tabela.

---

Você vai corrigir 7 defeitos num painel administrativo já construído. Trabalhe em pequenos passos e não refatore o que não foi pedido.

## Projeto

- Pasta: `/Users/iagolima/Downloads/Projetos/Site Charlington`
- Painel administrativo: pasta `admin/` (React 19 + Vite, HashRouter, sem TypeScript).
- Estilos: `admin/styles/` — `tokens.css` é a única fonte de cor, tipo, espaço, raio, sombra e tempo.
- Textos e comentários em português do Brasil.
- Compilar com: `npx vite build --outDir /tmp/build-charlington --emptyOutDir` (não escreva em `dist/`).

## Regras que não podem ser quebradas

1. Só mexa no que está listado abaixo.
2. **Não toque no menu vertical nem na pílula "Dashboard"**: `src/components/ui/floating-dock.*`, o componente `Rail` em `admin/components/Shell.jsx` e as regras `.rail*`, `.floating-dock*`, `.explore-pill*` em `admin/styles/layout.css`.
3. Nenhum dado fictício; nenhum valor literal de estilo fora dos tokens.

## Pendente 1 — "Confirmado" e "Concluído" continuam com a mesma aparência

**Onde:** `admin/styles/components/primitives.css:134` (`.chip--neutral`) e `:138` (`.chip--info`).

**O que acontece:** as duas etiquetas têm o mesmo fundo (`--ink-a06`), mesmo raio, mesma altura e mesmo padding; mudam só a tinta (`#3d3e41` contra `#0f1012`), com 1,78:1 entre si. Em `#/agenda` → Lista elas aparecem lado a lado e não se distinguem.

**Como corrigir:** separe por forma, não por cor nova. "Concluído" (`chip--neutral`) continua preenchido; "Confirmado" (`chip--info`) passa a contornado: `background: transparent`, `border: 1px solid var(--ink-a12)`, `color: var(--ink-900)`. Ajuste o padding para a altura continuar 22 px com a borda.

**Como verificar:** na Lista da Agenda, dá para separar os dois estados sem ler o texto.

## Pendente 2 — O estado do atendimento ainda tem duas famílias de cor

**Onde:** `admin/styles/components/modules.css` — `.slot` (linha ~89), `.slot--muted` (~106), `.slot--danger` (~111), `.week-slot` (~182), `.week-slot--muted` (~199) e as demais variantes de tom.

**O que acontece:** o trilho à esquerda dos blocos da agenda usa `--data-soft` e `--data-negative`, que são marcas de gráfico. O mesmo "Faltou" sai em `#d9432f` na agenda e em `#b32f20` (família de sinal) na Visão geral e na Lista.

**Como corrigir:** trocar os `--data-*` dos blocos pelos tokens de sinal — repouso `--ink-a12`, atenção `--signal-amber-ink`, erro `--signal-red-ink`, neutro concluído `--ink-a12`. Nenhum `--data-*` fora de gráfico. O fundo de cada tom continua como está.

**Como verificar:** a mesma consulta mostra o mesmo vermelho na Visão geral, na Agenda Dia, na Semana e na Lista.

## Pendente 3 — As abas ainda usam quatro gramáticas para dois papéis

**Onde:** `admin/modules/documents/DocumentsScreen.jsx:41`, `admin/modules/operations/OperationsScreen.jsx:32`, `admin/modules/communication/CommunicationScreen.jsx:76`, `admin/modules/settings/SettingsScreen.jsx:42` (todos sem `variant`, caindo em pílula) contra `admin/modules/agenda/AgendaScreen.jsx` e `admin/modules/patients/PatientsScreen.jsx:244` (segmento) e `PatientsScreen.jsx:341` (sublinhado).

**O que acontece:** trocar de seção aparece como segmento em duas telas e como pílula em quatro; recortar lista aparece como sublinhado em Pacientes e como pílula em Documentos.

**Como corrigir:** fixe a regra e aplique: `variant="segment"` para trocar de seção ou visão (Documentos, Operações, Comunicação, Configurações, Agenda, Pacientes Lista/Cards) e `variant="underline"` para recortar a lista que está abaixo, sempre com contador (situação do paciente, situação do agendamento, abas de Documentos quando filtram a mesma lista). Nenhuma tela fica com a pílula nesses dois papéis.

**Como verificar:** percorrer as 11 rotas: toda troca de seção tem a mesma aparência, e todo recorte de lista tem a mesma aparência.

## Pendente 4 — Dois `var()` apontando para token que não existe

**Onde:** `admin/styles/components/modules.css:658` → `border-top: 1px solid var(--line);` e `admin/styles/components/documents.css:320` → `margin-top: var(--nudge);`.

**O que acontece:** `--line` e `--nudge` não existem em `tokens.css`: a borda nunca desenha e a margem é morta.

**Como corrigir:** `var(--ink-a06)` na borda e `var(--s-1)` na margem. Depois varra a folha inteira em busca de qualquer outro `var(--…)` que não resolva em `:root`.

## Pendente 5 — Rótulo de campo com a entrelinha errada

**Onde:** `admin/styles/components/forms.css:8` (`.field__label`).

**O que acontece:** usa `--ls-micro` (0,1 px), enquanto todo o resto do mesmo papel — sobrelinha, cabeçalho de tabela, mês da linha do tempo, rótulo de alergia — usa `--ls-eyebrow` (0,6 px).

**Como corrigir:** trocar para `var(--ls-eyebrow)`.

## Pendente 6 — Recuo fora da escala e faixa de KPIs sem número dominante

1. **`admin/styles/components/forms.css:48`** → `.input.has-icon { padding-left: calc(var(--s-8) + var(--s-1)); }` resolve em 36 px, único valor fora da base 4. Use `var(--s-10)` (40 px) e ajuste a posição do ícone para continuar centrado.
2. **`admin/modules/audit/AuditScreen.jsx:195`** e **`admin/modules/communication/CommunicationScreen.jsx:170`** → as faixas não têm número dominante: três métricas de 20 px, enquanto sete telas usam o número de 48 px. Marque como `featured` a métrica que responde à tela — "Eventos listados" na Auditoria, "Famílias com opt-in" em Comunicação.

## Pendente 7 — Frases que ainda prometem ou negam mais do que o registro

1. **`admin/modules/reports/ReportsScreen.jsx:81` e `admin/modules/finance/FinanceScreen.jsx:79`** (constante `noBase`): a frase "sem histórico anterior para comparar" aparece na aba Trimestre, enquanto a aba Ano mostra 92 atendimentos e R$ 40.070 no mesmo ano. Deve nomear o trecho que ficou sem registro — "Sem registro em 01/07–05/07 para comparar" —, como já fazem Semana e Mês. Reserve "sem histórico anterior" para quando não houver nenhum registro em data alguma antes do período.
2. **`admin/modules/reports/ReportsScreen.jsx`, KPI "Taxa de faltas"** (linhas ~285 a 300): o selo de variação aparece sobre amostras de 1 a 3 consultas ("−66,7 p.p." comparado com um período de 1 agendamento). Aplique o mesmo limiar mínimo que o arquivo já usa em outros blocos (`MIN_TYPE_SAMPLE` / `MIN_NOSHOW_SAMPLE`): abaixo do mínimo, sem selo, e a frase diz o motivo — "2 de 8 esperados: amostra pequena para comparar com o período anterior".
3. **`admin/modules/agenda/AgendaScreen.jsx:144`**: a descrição promete "quanto tempo cada família está esperando", e a espera só existe dentro do painel de detalhe. Ou a vista Dia e a Lista mostram a espera em curso de quem fez check-in, ou a descrição deixa de prometer.
4. **`admin/modules/communication/CommunicationScreen.jsx:170`**: "Famílias com opt-in 32/42" usa como denominador o número de crianças. Conte famílias (responsáveis distintos) ou escreva "crianças com opt-in".
5. **`admin/modules/settings/SettingsScreen.jsx:173`**: o cartão de timbrado afirma que Fortaleza usa o mesmo arquivo, sem Fortaleza na lista. Escreva o que é verdade para as unidades cadastradas.

## Ao terminar

1. `npx vite build --outDir /tmp/build-charlington --emptyOutDir` sem erro.
2. Conferir `#/agenda` (Dia, Semana, Lista), `#/documentos`, `#/operacoes`, `#/comunicacao`, `#/configuracoes`, `#/relatorios` (Trimestre) e `#/auditoria`.
3. Relatar item a item o que foi alterado e em qual arquivo.
