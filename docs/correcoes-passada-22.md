# Correções da passada 22 (painel administrativo Charlington)

> Passada 22 da rodada 2 (dados e componentes), capturas de 06/10/2026 às 11h54.
> **Acabamento: APROVA** (M1–M8 e os três testes cegos). **Brief: REPROVA** (defeitos 1 a 11). **Sistema: REPROVA** (defeitos 12 a 20). Os itens 21 a 26 são dívidas que o acabamento registrou sem reprovar.
> Formato: prompt fechado, pronto para colar no Antigravity.

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
3. Nenhum dado fictício; nenhum valor literal de estilo fora dos tokens.
4. O log de auditoria é encadeado por hash: não altere o cálculo nem a ordem de gravação.

---

## Defeito 1 — GRAVE · "Espera média" e "Duração média" são a mesma medida partida ao meio

**Onde:** `admin/modules/reports/ReportsScreen.jsx` (função `summarizeProduction`, cálculo de `waits` e `durations`), o painel de detalhe em `admin/modules/agenda/AgendaScreen.jsx`, e a base local de verificação `.claude/design-loop/seed-verificacao.js` (campo `inicioAtendimento`).

**O que acontece, medido nos 7 presenciais concluídos de outubro:** em todos, "Esperou" = horário marcado − chegada, e "Duração" = conclusão − horário marcado. Somados, dão exatamente conclusão − chegada. Existe uma única medida de relógio (chegada e conclusão), partida no horário agendado, e cada metade recebe um nome.

Consequências:
- "Espera média 12 min" não mede espera. Nos sete casos a família chegou **antes** da hora, então o número é a antecedência da chegada. Se o consultório atrasar 40 minutos, o indicador não se move — exatamente o que a recepção precisaria ver.
- "Duração média 39 min" afirma a duração de um atendimento sem que exista registro de quando ele começou.

**Causa:** a base de verificação grava `inicioAtendimento` igual ao horário agendado, e nenhuma tela mostra esse campo, então o problema fica invisível.

**Como corrigir:**

1. **Base de verificação** (`.claude/design-loop/seed-verificacao.js`): `inicioAtendimento` passa a ser uma hora real e independente — depois da chegada e do horário marcado, variando por atendimento (alguns começam adiantados, outros atrasados). `fimAtendimento` continua depois do início.
2. **Relatórios**: espera = `inicioAtendimento − checkInEm`; duração = `fimAtendimento − inicioAtendimento`. Atendimento sem `inicioAtendimento` **sai das duas médias**, e a nota diz quantos ficaram de fora ("3 de 9 sem hora de início registrada").
3. Quando nenhum atendimento do período tiver hora de início, os dois KPIs mostram "—" e dizem "sem registro de início de atendimento no período" — nunca um número derivado do horário agendado.
4. **Painel de detalhe do agendamento**: a ficha mostra "Início do atendimento" ao lado de chegada e conclusão; sem registro, escreve "não registrado".

**Como verificar:** abrir três atendimentos concluídos e conferir que espera + duração **não** fecha com conclusão − chegada; e que um atendimento sem hora de início não entra nas médias.

## Defeito 2 — MÉDIO · O tracejado carrega dois significados no mesmo gráfico

**Onde:** `admin/charts/index.jsx` (`ComparisonChart`: série `dashed` com `8,4` e trecho `is-current` com `3,3`) e `admin/styles/components/charts.css`.

**O que acontece:** a série "Pago" é tracejada porque é uma série; o trecho do período em curso de **ambas** as séries também é tracejado. A 2 px de traço, 8/4 e 3/3 não se distinguem. O rodapé diz "Trecho tracejado: 06/10 ainda está em curso", enquanto a linha "Pago" inteira é tracejada por outro motivo.

**Como corrigir:** o período em curso não pode usar o mesmo dispositivo que identifica a série. Use para "em curso" a mesma marca listrada das barras (hachura `--data-mid`/`--data-strong`) ou opacidade reduzida do traço, e **acrescente o swatch na nota**, como as barras já fazem — a legenda reproduz a marca. A série "Pago" continua tracejada.

**Como verificar:** em Mês e Ano, distinguir, sem ler a nota, o que é "Pago" e o que é "em curso".

## Defeito 3 — MÉDIO · "Nenhum dia se destaca" contradiz a tabela acima

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, nota do card "Taxa de faltas por dia da semana" (~linha 558).

**O que acontece:** em Relatórios › Mês, com segunda 33,3% (1 de 3), terça 0,0% (0 de 2), quinta 0,0% (0 de 3) e sexta 0,0% (0 de 2), a nota diz "Nenhum dia se destaca: segunda, a maior taxa (33,3%), está 33,3 p.p. acima de terça, a seguinte". A frase afirma uma conclusão e apresenta, na mesma linha, a evidência que a desmente.

**Como corrigir:** aplique o limiar de amostra que o arquivo já usa noutros blocos. Abaixo do mínimo de atendimentos encerrados por dia, não conclua: escreva "Poucos atendimentos por dia no período para comparar os dias da semana". Acima do mínimo, mantenha a frase atual.

## Defeito 4 — MÉDIO · A violação de consentimento some na tela de consentimentos

**Onde:** `admin/modules/patients/views/ConsentsView.jsx`.

**O que acontece:** o cabeçalho do prontuário destaca "Sem consentimento para teleconsulta · 1 já realizada", mas dentro do painel de Consentimentos a finalidade "Atendimento por teleconsulta" aparece com o botão "Registrar consentimento", visualmente idêntica a "Uso de imagem" e "Pesquisa acadêmica", que nunca foram exercidas. O fato com consequência jurídica desaparece na tela que deveria auditá-lo.

**Como corrigir:** a finalidade **já exercida sem consentimento** recebe destaque próprio na lista: etiqueta de atenção dizendo quantos atendimentos já ocorreram sem base legal e desde quando, e posição no topo da lista. Finalidade nunca exercida continua neutra.

**Relacionado:** no detalhe de um agendamento de teleconsulta sem consentimento, "Iniciar atendimento" e "Concluir" estão livres. Peça confirmação explícita antes de avançar ("Não há consentimento registrado para teleconsulta. Registrar agora ou seguir assim mesmo?").

## Defeito 5 — MENOR · "8 títulos vencidos" não diz a direção

**Onde:** `admin/modules/overview/OverviewScreen.jsx`, item de pendência de títulos vencidos.

**O que acontece:** a linha diz "8 títulos vencidos · R$ 3.940,00"; a linha abaixo diz "6 títulos a pagar vencem em até 7 dias". Sem a direção, o leitor não sabe se o valor é a receber ou a pagar.

**Como corrigir:** escreva "8 títulos **a receber** vencidos", como a faixa do Financeiro já faz.

## Defeito 6 — MENORES · Cinco pontos de leitura

1. **`admin/modules/documents/DocumentsScreen.jsx`** — um laudo de hoje ("há 2 horas") está na mesma pilha âmbar de um de 10/08 ("há 8 semanas"), e os dois contam igual no KPI. Separe por idade: destaque o que passou de um limiar (por exemplo 7 dias) e deixe o do dia em tom neutro.
2. **`admin/modules/agenda/AgendaScreen.jsx` › Lista** — o grupo "Já passaram, do mais recente ao mais antigo" não inclui as consultas de **hoje** que já passaram, porque o agrupamento é por dia enquanto o rótulo fala de horário. Ou agrupe por instante, ou mude o rótulo para "De dias anteriores".
3. **`admin/modules/agenda/AgendaScreen.jsx` › Lista** — a aba "Todos 40" inclui as 2 canceladas, enquanto o KPI diz "de 38 em outubro … fora 2 canceladas". Dois totais convivem e só um se explica: a aba deve dizer "Todos (com cancelados)" ou trazer a mesma base do KPI.
4. **`admin/modules/audit/AuditScreen.jsx`** — a coluna "Quando" mostra hora e minuto; dois eventos do mesmo minuto aparecem como "agora" e "há 1 minuto". Num log que se diz imutável e encadeado, mostre os segundos.
5. **`admin/modules/overview/OverviewScreen.jsx`** — "Teleconsulta sem consentimento: 7 crianças / 7 já realizadas · 2 marcadas": o número 7 aparece duas vezes com significados diferentes. Reescreva para que cada número diga o que conta.

## Defeito 7 — SISTEMA, GRAVE · O esqueleto não modela a faixa de KPIs em nenhuma rota

**Onde:** `admin/App.jsx`, `RouteFallback`.

**O que acontece, medido em 9 rotas:** o esqueleto desenha no lugar da faixa um card de **566 px** com outro ao lado; a página carregada traz uma faixa única de **1156 px**. O primeiro card real salta de 185 a 523 px em relação ao que o esqueleto prometeu. O esqueleto também desenha sempre duas linhas de descrição (em Relatórios e Agenda a descrição real tem uma), e os controles aparecem em posição e largura erradas (em Financeiro, 561 px fora na horizontal).

**Como corrigir:** o esqueleto é componente. Para cada rota, reproduza: número real de linhas de descrição; posição, largura e altura reais dos controles do cabeçalho; e a faixa de KPIs **como faixa de largura cheia**, com a altura daquela rota. O mapa por rota já existe no arquivo — ele precisa estar correto e a faixa precisa ocupar as 12 colunas antes dos cards.

**Como verificar:** entrar em cada rota com carga fria e medir: o topo do primeiro card real não pode mudar mais que a altura de uma linha em relação ao esqueleto.

## Defeito 8 — SISTEMA, MÉDIO · "Confirmado" e "G40.9" são a mesma etiqueta

**Onde:** `admin/styles/components/primitives.css` (`.chip--info` e `.chip--code`).

**O que acontece:** as duas regras computam idênticas — borda 1 px `--ink-a12`, fundo transparente, tinta `--ink-900`, 13 px/500, raio 6, altura 22. Estado de agendamento e código CID-10 ficam iguais, inclusive em linhas vizinhas da mesma lista. Adjacente: `chip--muted` ("Cancelado") e `chip--neutral` ("Concluído") têm fundos a 1,02:1 entre si.

**Como corrigir:** taxonomia e estado não podem ser a mesma etiqueta. Mantenha o estado como está e dê ao código uma aparência própria de taxonomia — por exemplo fundo `--ink-a04` sem borda e numerais tabulares —, garantindo que "Cancelado" e "Concluído" também se separem por mais que 1,02:1.

## Defeito 9 — SISTEMA, MÉDIO · A faixa de KPIs inverte a ancoragem em Comunicação

**Onde:** `admin/modules/communication/CommunicationScreen.jsx`.

**O que acontece:** o número dominante é a **última** célula da faixa; nas outras oito rotas com faixa ele é sempre a primeira.

**Como corrigir:** mover a métrica destacada para a primeira posição.

## Defeito 10 — SISTEMA, MÉDIO · Na vista Dia o bloco não diz o estado

**Onde:** `admin/modules/agenda/AgendaScreen.jsx` (bloco compacto da vista Dia).

**O que acontece:** em 05/10, "Marina Queiroz Lemos" (sem desfecho registrado) e "Joaquim Peixoto Aguiar" (faltou) renderizam ambos em vermelho **sem nenhum texto de estado** — dois estados diferentes com a mesma aparência. Na Semana os mesmos dois trazem o rótulo. Adjacente: na Semana, "Confirmado" e "Concluído" têm preenchimentos a 1,04:1, e só a palavra os separa.

**Como corrigir:** o bloco compacto precisa carregar o estado de alguma forma legível — ícone de estado ao lado do horário, ou o rótulo abreviado no lugar do nome quando o bloco for muito curto. E a distinção entre Confirmado e Concluído, no grid, não pode depender só do preenchimento: use o contorno que a etiqueta já usa.

## Defeito 11 — SISTEMA, MÉDIO · O cursor apaga a marca de "em curso"

**Onde:** `admin/styles/components/charts.css` (`.bars__col.is-active .bars__fill`).

**O que acontece:** passar o cursor na barra do período corrente troca a listra por azul sólido (`background-image: none`), removendo a informação de que o período está incompleto.

**Como corrigir:** o estado de cursor muda a cor de base, mas preserva a hachura do período em curso.

## Defeito 12 — SISTEMA, MENOR · `var()` apontando para tokens inexistentes

**Onde:** `admin/styles/components/modules.css:818-822` (`--color-surface-success`, `--color-border-success`, `--color-success`, `--color-text-success`, `--color-text-primary`, `--radius-md`, `--space-3`, `--space-4`) e `admin/styles/components/auth.css:251` (`--ink-700`).

**Como corrigir:** trocar pelos tokens existentes (`--signal-green-bg`, `--signal-green-ink`, `--r-sm`, `--s-3`, `--s-4`, `--ink-600`). Se a regra não é usada por nenhum elemento, remova-a.

## Defeito 13 — SISTEMA, MENOR · Cor literal fora dos tokens

**Onde:** `admin/styles/components/documents.css:194` (`rgba(15,16,18,.035)`) e `admin/styles/base.css` (`#ffffff` em `html, body` e nos contêineres da casca, depois sobrescrito por `--canvas`).

**Como corrigir:** usar `--ink-a04` no primeiro caso e `--canvas` / `--surface` nos demais.

## Defeito 14 — SISTEMA, MENOR · Fonte carregada e nunca usada

**Onde:** `admin/styles/tokens.css:103` (`--font-display: 'Urbanist'`) e os `@font-face` de Urbanist em `admin/styles/base.css`.

**O que acontece:** a família é baixada (dois arquivos woff2 no build) e nenhum elemento a usa — 100% do texto computa Inter.

**Como corrigir:** remover o token e os `@font-face`, ou dar à Urbanist um papel escrito no sistema. Enquanto não houver papel, ela não deve ser baixada.

## Dívidas registradas pelo acabamento (não reprovam, mas valem a correção)

15. **Branco morto por igualar altura de coluna:** 409 px vazios em "Sua agenda de hoje" (46% de um card de 888), 170 px no "Perfil epidemiológico", 141 px na "Produção assistencial". Deixe o card acompanhar o conteúdo em vez de esticar com a coluna vizinha.
16. **Faixa virando parágrafo:** em Relatórios › Ano, quatro das cinco colunas repetem a mesma frase de três linhas sobre o período anterior. É um fato do período: escreva uma vez, fora das células.
17. **Chip "0%" sem seta** ao lado de quatro chips com seta, em Relatórios › Mês.
18. **Grade de ocupação quase toda vazia** entre 12h e 19h na Agenda › Por horário: corte a grade na faixa de atendimento real.
19. **Verde em "Disponível"** nas salas (Operações): estado normal não leva cor de sinal.
20. **Documentos › A emitir:** 16 linhas iguais sem ação por linha nem em lote, e o KPI sozinho num card de largura cheia.

## Ao terminar

1. `npx vite build --outDir /tmp/build-charlington --emptyOutDir` sem erro.
2. Conferir `#/relatorios` (quatro períodos), `#/agenda` (Dia, Semana, Lista e o detalhe de um atendimento concluído), `#/pacientes/<id>` (Consentimentos), `#/financeiro` (Fluxo nos quatro períodos), `#/documentos`, `#/comunicacao`, `#/auditoria` e `#/` — e o esqueleto, visível ao entrar em cada rota com carga fria.
3. Relatar item a item o que foi alterado e em qual arquivo.
