# Prompt para o Antigravity — correções da passada 24 (painel administrativo Charlington)

> Cole tudo o que está abaixo da linha no Antigravity. Prompt fechado: contexto, regras, cada defeito com arquivo, correção e verificação.
> Origem: passada 24 da rodada 2 (dados e componentes), capturas de 06/10/2026 às 18h21. **Os três críticos reprovaram.** Defeitos 1 a 7 vêm do brief (verdade do dado), 8 a 10 do acabamento (Financeiro perdeu o teste cego e um texto quebrado) e 11 a 18 do sistema.
> Esta lista foi priorizada: os defeitos **1 a 5 e 11 a 13** são os que reprovam de verdade. Os demais são ajustes finos; faça-os depois.

---

Você vai corrigir defeitos num painel administrativo já construído. Trabalhe em pequenos passos e não refatore o que não foi pedido.

## Projeto

- Pasta: `/Users/iagolima/Downloads/Projetos/Site Charlington`
- Painel administrativo: pasta `admin/` (React 19 + Vite, HashRouter, sem TypeScript).
- Estilos: `admin/styles/` — `tokens.css` é a única fonte de cor, tipo, espaço, raio, sombra e tempo.
- Textos e comentários em português do Brasil.
- Compilar com: `npx vite build --outDir /tmp/build-charlington --emptyOutDir` (não escreva em `dist/`).

## Regras que não podem ser quebradas

1. Só mexa no que está listado abaixo.
2. **Não toque no menu vertical nem na pílula "Dashboard"**: `src/components/ui/floating-dock.*`, o componente `Rail` em `admin/components/Shell.jsx` e as regras `.rail*`, `.floating-dock*`, `.explore-pill*` em `admin/styles/layout.css`.
3. Nenhum dado fictício; nenhum valor literal de estilo fora dos tokens; nenhum token inexistente em `var()`.
4. Nunca remova a identificação do paciente (nome) de um bloco, linha ou etiqueta.
5. Uma correção não pode criar outro defeito: o `overflow-wrap: anywhere` aplicado em `.metric__target` para evitar vazamento passou a **quebrar números e horas no meio** (ver defeito 4). Antes de aplicar qualquer regra de quebra, confira que ela não parte tokens como "18h21".

---

## Defeito 1 — GRAVE · Um zero inventado: "R$ 0,00 em 01–06/07" onde não há registro

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, KPI "Recebido no período" (linha ~359: `target={history ? \`${money(prevRevenue)} em ${prevLabel}\` : noBase}`) e o mesmo padrão em `admin/modules/finance/FinanceScreen.jsx` (KPIs de Recebido e Pago).

**O que acontece:** em Relatórios › Trimestre, o card "Recebido no período" diz "R$ 0,00 em 01–06/07 até 18h28", enquanto "Atendimentos concluídos" e "Taxa de faltas", **na mesma faixa**, dizem "sem registro em 01–06/07 para comparar". Os títulos só começam em 07/08; não existe nada em julho. O zero afirma uma medida que não houve, e o mesmo período recebe duas descrições.

**Como corrigir:** o critério de "janela anterior sem registro" é **um só** para a faixa inteira, calculado uma vez — `prevHasRecords` considerando atendimentos **e** lançamentos financeiros do período anterior. Se não há registro na janela, **todos** os KPIs dizem "sem registro em 01–06/07 para comparar" e nenhum mostra "R$ 0,00 em …" nem selo de variação. Só diga "R$ 0,00 em …" se existir lançamento na janela e a soma for realmente zero.

**Como verificar:** em Relatórios e Financeiro, nos quatro períodos, nenhum KPI afirma zero para uma janela sem lançamentos, e todos os KPIs da faixa descrevem a janela anterior do mesmo jeito.

## Defeito 2 — GRAVE · "Semana completa" que tem três dias (ainda)

**Onde:** `admin/modules/reports/ReportsScreen.jsx` (`closedAverage`, linha ~216, e o texto da linha ~236) e `admin/core/periods.js` (`bucketsFor`).

**O que acontece:** em Relatórios › Trimestre, a barra "03/10" vale 5 e o texto diz "média de 5,0 por semana completa com atendimento (1 de 2 semanas)". A barra cobre só 01–03/10 (o trimestre começou numa quinta-feira); a semana real (28/09–03/10) teve 9 concluídos, 4 deles em 28–30/09. Nada na barra diz que está cortada, e a média subestima a semana.

**Como corrigir:**
1. O balde inicial **parcial** nunca entra em "semana completa" e é marcado como parcial (mesma marca clara que o gráfico já usa para "registros só a partir de…"), com a nota "03/10: só 3 dos 7 dias estão dentro do trimestre".
2. A média usa apenas semanas completas; se não houver nenhuma, escreva "nenhuma semana completa no período", sem número.
3. Nenhum texto pode chamar de "completo" um balde que `bucketsFor` marcou como `partial`.

**Como verificar:** no Trimestre, a primeira barra está marcada como parcial e fora da média.

## Defeito 3 — GRAVE · Espera e duração não dizem entre quais marcos medem

**Onde:** `admin/modules/reports/ReportsScreen.jsx` (KPIs "Duração média" e "Espera média") e o painel de detalhe do agendamento em `admin/modules/agenda/AgendaScreen.jsx` (ficha, linhas ~950 a 975).

**O que acontece:** em nenhum lugar está escrito que **espera = chegada até início do atendimento** e **duração = início até conclusão**. O painel mostra "Horário 08:00–08:40" (o horário **marcado**) ao lado de chegada 07:43, início 08:09 e conclusão 08:44 — 40 minutos de bloco contra 35 de duração real, sem dizer que o primeiro é o agendado. "Esperou 26 min" também pode ser lido como atraso sobre as 08:00. As vistas Dia e Semana desenham blocos "08:00–08:40" em consultas já concluídas, sem dizer que é o horário marcado.

**Como corrigir:**
1. Cada KPI diz o que mede em uma linha: "Espera = da chegada ao início do atendimento" e "Duração = do início à conclusão".
2. Na ficha do detalhe, rotule: "Horário marcado 08:00–08:40", "Chegada 07:43", "Início do atendimento 08:09", "Conclusão 08:44". O chip diz "Esperou 26 min (da chegada ao início)".
3. Nos blocos da agenda de consultas concluídas, o título (`title`) diz "horário marcado".

**Como verificar:** abrir um atendimento concluído: nenhum horário aparece sem dizer o que é.

## Defeito 4 — GRAVE · A hora quebra no meio do token ("até 18h3 / 9 para comparar")

**Onde:** `admin/styles/components/card.css`, regra de `.metric__target` (linha ~176, `overflow-wrap: anywhere`).

**O que acontece:** em Relatórios › Ano e Financeiro › Ano, as células 2, 3 e 5 quebram o texto no meio do token: "…até 18h3" numa linha e "9 para comparar" na seguinte. A hora vira um dígito solto, lido como contagem. A causa é `overflow-wrap: anywhere`, aplicado numa correção anterior para impedir vazamento do recuo.

**Como corrigir:** trocar por `overflow-wrap: break-word; hyphens: manual; text-wrap: pretty;` e **proteger os tokens** que não podem ser partidos: intervalos de data e horas com espaço não separável (` ` entre "até" e "18h21", entre "01–06/07" e "até"), ou `white-space: nowrap` num `<span>` em volta da data/hora. A frase pode quebrar nos espaços; o número nunca.

**Como verificar:** em Ano, nenhuma linha termina ou começa no meio de uma hora ou data.

## Defeito 5 — MÉDIO · O chip de variação não diz contra o quê compara

**Onde:** `admin/modules/finance/FinanceScreen.jsx`, KPIs de Recebido, Pago e Resultado.

**O que acontece:** o chip "−14,1%" (Mês) ou "+45,9%" (Semana) fica no card "Recebido", mas a base da comparação (R$ 4.390,00 em 01–06/09) só aparece no card "Resultado", que não tem chip. O card com o chip não diz contra o quê compara.

**Como corrigir:** toda célula que tem selo de variação traz, na própria linha de apoio, a base: "R$ 4.390,00 em 01–06/09". Se for o mesmo número de outra célula, repita-o.

## Defeito 6 — MENOR · Eixo do gráfico anual sem rótulo nos degraus

**Onde:** `admin/charts/index.jsx`, `ComparisonChart` (rótulos do eixo X) e `admin/modules/finance/FinanceScreen.jsx` (`buildFlowSeries`).

**O que acontece:** em Financeiro › Ano, o eixo mostra 31/01, 31/03, 31/05, 31/07 e 06/10. Os degraus de agosto e setembro — os únicos com dado — ficam sem rótulo; só dá para saber qual é qual contando o espaçamento.

**Como corrigir:** o eixo sempre rotula os pontos **que têm dado** (e o último), e omite os rótulos de meses vazios.

## Defeito 7 — MENOR · Selo vermelho ou verde sobre amostra minúscula

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, selos de Espera média e Taxa de faltas (aba Mês e Semana).

**O que acontece:** Espera "+1 min" em vermelho (22 contra 21 min, com 6 casos) e Taxa de faltas "−8,2 p.p." em verde (1 de 10 contra 2 de 11). Ruído de amostra pequena apresentado como piora ou melhora.

**Como corrigir:** o selo só tem cor de sinal (verde/vermelho) quando a amostra dos dois períodos passa do limiar **e** a variação passa de um mínimo (por exemplo 10% ou 5 minutos). Abaixo disso, neutro, ou sem selo, com a nota do n.

## Defeito 8 — ACABAMENTO, GRAVE · O Financeiro perde o teste cego para a referência

**Onde:** `admin/modules/finance/FinanceScreen.jsx`.

**O que acontece:** a referência (mesmo domínio) tem um herói, um gráfico anotado e muito espaço. O nosso:
- empilha **duas faixas de alerta** de 72 px antes do gráfico, empurrando o gráfico para baixo da dobra (começa em y≈711);
- repete o mesmo dado: R$ 3.940 no KPI, na faixa vermelha e na lista "Em atraso"; R$ 36.760 no KPI e na faixa; "Resultado" e "Recebido" mostram o mesmo R$ 3.770;
- desenha um gráfico de três degraus com 60% do campo vazio e a legenda "Trecho mais claro" para um trecho que está tracejado.

**Como corrigir:**
1. Funda as duas faixas em **uma só** (uma linha por assunto, no mesmo bloco: "8 títulos a receber vencidos · R$ 3.940,00 | 6 títulos a pagar vencem em 10/10 · R$ 36.760,00") com um botão por assunto.
2. Remova do KPI o que a faixa já diz (os KPIs "A receber em aberto" e "A pagar em aberto" ficam, mas sem repetir o vencido em texto).
3. Quando "Resultado" e "Recebido" forem iguais, a segunda célula diz "igual ao resultado: sem despesa paga no trecho", em corpo menor.
4. Gráfico com poucos pontos: a mensagem e a anotação vão **dentro** do gráfico (rótulo direto no ponto), em vez de um campo vazio.
5. A legenda do trecho em curso reproduz a marca real (ver defeito 11).

**Como verificar:** na primeira dobra (800 px) do Financeiro, o herói, os KPIs e o início do gráfico aparecem, e nenhum valor se repete sem necessidade.

## Defeito 9 — ACABAMENTO, MÉDIO · Em pares de cards, uma coluna termina muito antes da outra

**Onde:** Visão geral ("Sua agenda de hoje": coluna esquerda termina em y=929, a direita em y=1289, 360 px de vazio e gráfico de largura total para 19 eventos); Relatórios (produção ~90 px de vazio abaixo de "Ver dados"; Perfil 408 ao lado de Comparecimento 240).

**Como corrigir:** o card que ficaria com vazio passa a acompanhar o conteúdo (`align-self: start`) ou recebe conteúdo útil do mesmo assunto (na agenda do dia, os atendimentos dos próximos dias). Alturas continuam múltiplas de 24 px.

## Defeito 10 — ACABAMENTO, MENOR · Linha de base dos números na faixa de KPIs

**Onde:** `admin/styles/components/card.css` (`.metric`, `.metric__value-row`).

**O que acontece:** em Financeiro, o herói (48 px) está em y≈369 e os números das células vizinhas em y≈357 — não dividem linha de base.

**Como corrigir:** alinhe as células pela linha de base do primeiro texto do número (`align-items: baseline` na faixa ou altura fixa da linha do valor).

## Defeito 11 — SISTEMA, GRAVE · A marca de período em curso se confunde com o tracejado da série "Pago"

**Onde:** `admin/styles/components/charts.css:729` (`.compare__line.is-current { stroke-dasharray: 4 4; }`) e `:193-195` (`.chart__note-swatch--line`); `admin/charts/index.jsx` (tooltips e `aria-label` das zonas).

**O que acontece, medido:**
- A série "Pago" é tracejada 8/4 (`--data-soft`); o trecho em curso é tracejado 4/4. As duas marcas diferem só no comprimento do traço, 8 contra 4, no mesmo traço de 2 px. Na captura do Ano elas se confundem.
- A nota diz "Trecho mais claro", mas o trecho em curso tem a mesma cor da linha cheia (`rgb(61,62,65)`, 10,51:1). A legenda não bate com a marca.
- Ao passar o cursor, a barra em curso continua listrada, mas o tooltip mostra só "06/10 / 2"; o tooltip do degrau mostra só "Até 06/10 / Recebido… / Pago…". Nenhum diz "em curso". O `aria-label` das barras diz "(em curso)"; o das zonas do degrau não.
- Barra em curso com valor zero vira uma faixa de 3 px com listras de 4 px e contraste de cerca de 1,18:1 entre listra e base: a listra é quase ilegível.

**Como corrigir:**
1. A série "Pago" **deixa de ser tracejada**: identifique-a por cor/espessura (`--data-soft`, 2 px sólido) e pelo rótulo direto na ponta. Assim o tracejado fica reservado a uma única coisa: **período em curso**.
2. O trecho em curso das duas séries usa o mesmo tracejado, na mesma cor da série, e o swatch da nota é igual a ele. A nota diz "Trecho tracejado", não "mais claro".
3. Tooltips e `aria-label` de barras **e** de degraus dizem "em curso" quando o balde é o corrente.
4. Barra em curso com zero: base de 3 px em `--data-strong` com listra de contraste ≥ 3:1 (ou borda superior listrada), não `--data-mid` sólido.

**Como verificar:** no Ano e no Mês do Financeiro, distinguir "Pago" de "em curso" sem ler a nota; passar o cursor em qualquer balde corrente e ler "em curso".

## Defeito 12 — SISTEMA, MÉDIO · A regra de líder de ranking falha no "Perfil epidemiológico"

**Onde:** `admin/charts/index.jsx` (`CategoryBars`, regra de líder) e Relatórios › Ano › Perfil epidemiológico.

**O que acontece:** F90.0 tem 8 crianças contra 7 do segundo (líder único, +14%) e ficou `--plain` (`--data-mid`). Em outras telas líderes com vantagem menor são destacados em `--data-strong`: Financeiro Ano, Cartão: 13.170 contra 12.380 (+6%); Relatórios Ano, Duração por tipo: 38 min contra 35 min (+9%). Relatórios Mês e Trimestre destacam o líder com o mesmo componente.

**Como corrigir:** uma só regra: todo ranking com **líder único** (maior valor sem empate) usa `--data-strong` no líder, sem exceção por tamanho da lista ou da vantagem. Empate: ninguém destacado.

## Defeito 13 — SISTEMA, GRAVE · O esqueleto ainda erra a posição, a altura e os alertas

**Onde:** `admin/App.jsx`, `ROUTE_SHAPE` e `RouteFallback`.

**O que acontece, medido (esqueleto × real):**

| Rota | Faixa de KPIs: esqueleto | real | Alertas | Controles |
|---|---|---|---|---|
| `#/` | 566×96, meia largura, sem cabeçalho | 1156×192 em y=161 | — | — |
| Financeiro | y=244, h 240 | y=279, h 216 | 1 bloco; real tem 2 (y=519 e 615) | y=181; real y=201 |
| Relatórios | y=260, h 192 | y=186, h 240 | 1 em y=477; real em y=450 | x=100,y=181; real x=698,y=108 |
| Agenda | y=240, h 168 | y=244, h 192 | 1 em y=433; real y=460 | ok |
| Pacientes | y=186 | y=205 | nenhum; real tem 1 em y=469 | y=123; real y=143 |
| Operações | ok | ok | nenhum; real tem 1 em y=378 | ok |
| Documentos | y=186 | y=205 | — | y=123 e x=856; real y=143 e x=848 |

Também: o esqueleto tem 1 px de recuo (x=101, 1154 de largura; real x=100, 1156); os blocos de cabeçalho têm largura fixa (320 e 360), enquanto o real varia de 206 a 508 px.

**Como corrigir:**
1. **Pare de estimar à mão.** Meça cada rota carregada (topo, altura e largura de cabeçalho, controles, cada alerta e a faixa de KPIs) e grave esses números em `ROUTE_SHAPE`. Use `x=100`, largura 1156.
2. A Visão geral precisa de **cabeçalho** (saudação) e faixa de largura cheia no esqueleto (hoje ele desenha um bloco de 566×96 sem cabeçalho).
3. Alertas: o esqueleto traz exatamente a quantidade de blocos de 72 px que a rota real traz, na posição real.
4. Relatórios: o seletor de período vai na linha do título, à direita (x≈698, y≈108).
5. A largura dos blocos do cabeçalho segue a da rota (206 a 508 px).

**Como verificar:** com carga fria em cada rota, a diferença de posição e altura entre esqueleto e página carregada é no máximo de uma linha (≤ 20 px).

## Defeito 14 — SISTEMA, MÉDIO · Contraste abaixo do mínimo no item ativo do índice do prontuário

**Onde:** `admin/styles/components/table.css:220-235` (`.index-list button.is-active`, `.index-list__pending--warning`, `.index-list__count`).

**O que acontece:** sobre o fundo escuro do item ativo (`#0f1012`), "1 a emitir" (13 px, `--signal-amber-ink` `#855f00`) mede 3,29:1 e o contador "2" de Evoluções (10 px, `#6b6c6f`) mede 3,63:1. O âmbar-ink só é validado sobre fundo claro.

**Como corrigir:** no item ativo, o texto de pendência e o contador usam `--tab-active-ink` (claro); o ícone de atenção, se precisar de cor, usa `--signal-amber-bg`.

## Defeito 15 — SISTEMA, MÉDIO · O código CID tem duas aparências e quase igual a estado

**Onde:** `admin/styles/components/primitives.css` (`.chip--code`, `.cid-code`, `.chip--info`).

**O que acontece:** `.chip--code` (cabeçalho do prontuário): tinta `--ink-900`, peso 500, sem fundo e sem borda. `.cid-code` (linha do tempo, Relatórios): `--ink-950`, peso 500, numerais tabulares, sem padding. O estado "Confirmado" (`.chip--info`) usa a mesma base e também é transparente, diferindo do código só por uma borda de 1 px `rgba(15,16,18,.12)`.

**Como corrigir:** um único componente `CidCode` (ou uma única classe) em todo lugar, com aparência própria de taxonomia — por exemplo, sublinhado pontilhado, numerais tabulares, peso 500 — e **nunca** transparente com borda como um chip de estado.

## Defeito 16 — SISTEMA, MENOR · Seletor de período em duas posições

**Onde:** `admin/modules/finance/FinanceScreen.jsx` e `admin/modules/reports/ReportsScreen.jsx` (`PeriodTabs`).

**O que acontece:** no Financeiro fica em x=100, y=201, abaixo do cabeçalho. Em Relatórios fica em x=698, y=108, na linha do título, ao lado de "Exportar CSV". A aparência está certa nas duas; a posição, não.

**Como corrigir:** o mesmo papel (recorte de período) na mesma posição: use a linha própria abaixo do cabeçalho (`stacked`) em Relatórios, como no Financeiro, e mantenha "Exportar CSV" à direita do título.

## Defeito 17 — SISTEMA, MENOR · Cor literal e duplicação de tokens

**Onde:**
- `admin/styles/boot.css` (carregado no `<head>`): contém um `:root` com os tokens copiados em hexadecimal — uma segunda fonte de verdade. Reduza ao mínimo necessário para a primeira pintura (fundo e tinta), usando `var()` quando possível, e nunca duplique a paleta.
- Blocos de impressão (`html, body`, `.shell…`, `.doc-preview…`): `rgb(255,255,255)` literal → `var(--surface-raised)`.
- `.compare__void` (`admin/styles/components/charts.css:692`): linha vertical de 1 px em `--ink-a20` (cerca de 1,56:1) delimitando trecho sem dado → use `--ink-200` (≥ 3:1).

## Defeito 18 — SISTEMA, MENOR · Micro e valores fora dos tokens

1. `.week-day__count` ("N consultas", 10 px; `modules.css:164`) e `.compare__void` ("sem lançamentos", 10 px): micro só para eixo, rótulo de valor, contagem de filtro e sobrelinha. Nota que qualifica número é corpo (`--t-body`, `--ink-400`).
2. `.chip--info` com `padding` de 7 px (`primitives.css`): único valor fora da base 4; compensa a borda. Use `box-shadow: inset 0 0 0 1px var(--ink-a12)` no lugar da borda, com padding `var(--s-2)`.
3. `line-height` 1.6, 1.65, 1.15 e 1.3em (soap, consentimento, notas, auth), `letter-spacing` .38em e −.025em, `font-size: .8125rem` (`.auth__error-badge`): trocar por `--lh-*`, `--ls-*` e `--t-*`. A folha A4 de pré-visualização (5,5 a 10,5 px) é escala de papel e pode permanecer, com comentário dizendo isso.

## Ao terminar

1. `npx vite build --outDir /tmp/build-charlington --emptyOutDir` sem erro.
2. Varrer as folhas em busca de `var(--…)` sem definição.
3. Conferir `#/financeiro` (quatro períodos), `#/relatorios` (quatro períodos), `#/` , `#/agenda` (detalhe de um atendimento concluído), `#/pacientes/<id>` — e o esqueleto, entrando em cada rota com carga fria.
4. Relatar item a item o que foi alterado e em qual arquivo.
