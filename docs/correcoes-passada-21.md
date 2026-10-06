# Prompt para o Antigravity — correções da passada 21 (painel administrativo Charlington)

> Cole tudo o que está abaixo da linha no Antigravity. É um prompt fechado: contexto, regras, cada defeito com arquivo e linha, a correção esperada e como verificar.
> Origem: passada 21 da rodada 2 (dados e componentes), capturas de 06/10/2026 às 05h33. Os três críticos reprovaram. Defeitos 1 a 9 vêm do crítico de brief (verdade do dado e da frase); 10 a 14, do crítico de acabamento (M7 e forma); 15 a 21, do crítico de sistema (aderência ao design system).

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

## Defeito 1 — GRAVE · Aviso clínico cortado no meio, justamente na parte que diz quando agir

**Onde:** `admin/modules/agenda/AgendaScreen.jsx:904` (chip dentro de `.appointment-detail__status`), estilos em `admin/styles/components/modules.css:257` e `admin/styles/components/overlays.css:121`.

**O que acontece:** no painel lateral de um agendamento de teleconsulta sem consentimento, o aviso renderiza "Sem consentimento para teleconsulta · registrar no prontuári" e para. O texto completo é "…registrar no prontuário **antes de atender**". Medido: a etiqueta tem 525 px dentro de um contêiner de 379 px, numa gaveta de 420 px. O corpo da gaveta rola, mas não há pista nenhuma de que falta texto.

**Por que é erro:** é um aviso clínico, e a parte invisível é exatamente a que diz o prazo da ação.

**Como corrigir:** a etiqueta precisa quebrar em várias linhas dentro da gaveta — use a variante que já existe para texto longo (`wrap`) e garanta `min-width: 0` / `flex-wrap: wrap` no contêiner do status. Nenhum aviso pode depender de rolagem horizontal. Se o texto ainda ficar longo, separe em duas linhas: a etiqueta curta ("Sem consentimento para teleconsulta") e, abaixo, a instrução ("Registrar no prontuário antes de atender").

**Como verificar:** abrir o detalhe de uma teleconsulta sem consentimento em 1280 px e ler a frase inteira sem rolar.

## Defeito 2 — GRAVE · "1 vigente" conta como consentimento o que a própria tela diz que não é

**Onde:** `admin/modules/patients/PatientRecordScreen.jsx:113-116` (contador da seção 08) e `admin/modules/patients/views/ConsentsView.jsx` (lista de finalidades e botão "Revogar", linhas ~160 a 190).

**O que acontece:** no prontuário, a barra lateral diz "08 Consentimentos · 1 vigente". O único item com registro é "Tratamento clínico (tutela da saúde)", que a mesma tela descreve como "Dispensa consentimento por ser tutela da saúde" e cuja linha diz "Responsável **informado** em 07/08/2026". As cinco finalidades que realmente dependem de consentimento estão todas em "Registrar consentimento". Ou seja: zero consentimentos concedidos, resumo dizendo "1 vigente". Em outra criança, "3 vigentes" pelo mesmo critério.

**Agrava:** o item de base legal própria oferece botão "Revogar" — revogar o que a linha acima diz que dispensa consentimento.

**Como corrigir:**

1. O contador conta **apenas** finalidades com `basis.requiresConsent` e consentimento vigente. Registro de informação ao responsável não entra.
2. Se não houver nenhum, o contador some (sem badge) ou diz "nenhum registrado", em tom neutro.
3. Em finalidade de base legal própria, troque "Revogar" por uma ação coerente — "Registrar nova informação ao responsável" — ou nenhuma ação. Revogação só existe onde houve concessão.

**Como verificar:** numa criança sem nenhum consentimento concedido, a seção 08 não pode exibir "1 vigente"; e nenhuma finalidade dispensada oferece "Revogar".

## Defeito 3 — GRAVE · Frase de indicador aritmeticamente falsa: "−1 faltas a mais"

**Onde:** `admin/modules/reports/ReportsScreen.jsx:558` (nota do card "Taxa de faltas por dia da semana").

**O que acontece:** em Relatórios › Ano, com segunda 15,8% (3 de 19), terça 21,7% (5 de 23), quarta 15,8% (3 de 19), quinta 23,5% (4 de 17) e sexta 8,7% (2 de 23), a nota imprime: "Nenhum dia se destaca: quinta, a maior taxa, tem **−1 faltas a mais** que terça, a seguinte." Quinta tem uma falta **a menos** que terça.

**Por que é erro:** a frase ordena por **taxa** e subtrai **contagem absoluta** — mistura duas grandezas e imprime o resultado negativo como prosa. No Trimestre a mesma frase sai certa só porque o sinal calha de ser positivo; o defeito é estrutural.

**Como corrigir:** compare o que foi ordenado. Como o ranking é por taxa, a diferença deve ser em pontos percentuais: "quinta, a maior taxa (23,5%), está 1,8 p.p. acima de terça, a seguinte". Se preferir manter a contagem, ordene por contagem. Trate os três casos — maior, igual e menor — sem nunca imprimir diferença negativa como "a mais".

**Como verificar:** nos quatro períodos, a frase final do card é verdadeira quando conferida contra as linhas acima dela.

## Defeito 4 — GRAVE · Selo de tendência construído sobre uma única observação

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, KPIs "Espera média", "Duração média" e "Atendimentos concluídos" (linhas ~270 a 325).

**O que acontece:** em Relatórios › Semana: "Espera média 14 min · **−6 min** · 1 presencial com chegada registrada"; "Duração média 41 min · **−11 min**" (2 atendimentos contra 1); "Atendimentos concluídos 2 · **+100%**" (1 no período anterior).

**Por que é erro:** uma variação derivada de uma única observação recebe o mesmo peso visual de uma tendência real. A tela já aplica limiar de amostra em dois outros lugares (taxa de faltas e duração por tipo) e não aplica aqui.

**Como corrigir:** use o mesmo limiar mínimo já definido no arquivo para todos os selos de variação dos KPIs: abaixo do mínimo, o selo não aparece e a nota diz o motivo ("1 presencial com chegada registrada: amostra pequena para comparar com o período anterior"). O valor do indicador continua visível.

**Como verificar:** nos quatro períodos, nenhum selo de variação aparece sobre amostra menor que o limiar.

## Defeito 5 — MÉDIO · "A última despesa" mostra R$ 1.450 onde saíram R$ 36.760

**Onde:** `admin/modules/finance/FinanceScreen.jsx:107` (`lastExpenseOut`) e `:209` (frase do KPI "Pago").

**O que acontece:** "Pago em 01–06/10 · R$ 0 · Nenhuma despesa vence neste trecho · a última foi **R$ 1.450,00 em 10/09**". Em 10/09 foram pagos seis títulos, somando **R$ 36.760,00**. A tela pega uma das seis linhas da mesma data e a chama de "a última".

**Como corrigir:** agregue por data: pegue o dia do último pagamento e some **todos** os títulos pagos naquele dia — "o último pagamento foi R$ 36.760,00 em 10/09 (6 títulos)". Com um só título, mantenha o singular.

**Como verificar:** o valor citado na frase é igual à soma dos títulos daquela data na aba A pagar.

## Defeito 6 — MÉDIO · Aviso fala "do mês" dentro da visão de trimestre

**Onde:** `admin/modules/finance/FinanceScreen.jsx:252`.

**O que acontece:** no Trimestre, com cabeçalho "4º trimestre de 2026 · 01/10 a 06/10, em curso", o aviso diz "R$ 36.760,00 vencem em 10/10 (6 títulos). **O resultado do mês** ainda não considera esse pagamento."

**Como corrigir:** a frase usa a palavra do período selecionado — "o resultado da semana / do mês / do trimestre / do ano" —, reaproveitando a expressão que o KPI já monta.

## Defeito 7 — MÉDIO · Duas descrições diferentes da mesma janela vazia, lado a lado

**Onde:** `admin/modules/reports/ReportsScreen.jsx:277` e `:296` (e a constante `noBase` na linha 81).

**O que acontece:** em Relatórios › Trimestre, na mesma faixa: "Atendimentos concluídos 7 — **0** em 01–06/07 até 05h48" ao lado de "Taxa de faltas 12,5% — **sem registro** em 01–06/07 até 05h48 para comparar". "0" afirma um zero medido; "sem registro" afirma ausência de dado. São afirmações diferentes sobre o mesmo período.

**Como corrigir:** um critério só para toda a faixa. Se não houve nenhum registro na janela anterior, todos os KPIs dizem "sem registro em …"; se houve registro e o valor é zero, todos dizem "0 em …". A decisão é da janela, não de cada KPI.

**Como verificar:** nos quatro períodos, todos os KPIs da faixa descrevem a janela anterior da mesma forma.

## Defeito 8 — MÉDIO · "Eventos listados" não é o que está listado

**Onde:** `admin/modules/audit/AuditScreen.jsx:195`.

**O que acontece:** o KPI diz "Eventos listados **590**" enquanto o rodapé da tabela diz "Mostrando os **100** eventos mais recentes de 590". O número é o total do recorte, não o listado.

**Como corrigir:** o rótulo diz o que o número é — "Eventos no recorte" (ou "Eventos registrados", quando não há filtro) — e a linha de apoio diz quantos estão na tela: "mostrando os 100 mais recentes". Secundário: "Eventos de risco" deve dizer em uma linha o que conta como risco (exclusão, exportação, alteração de permissão, falha de entrada).

## Defeito 9 — MENORES · Frases e telas que entregam menos do que prometem

1. **`admin/modules/overview/OverviewScreen.jsx:191`** — "Consultas sem desfecho 1 · **A mais antiga** de 05/10 às 10:00": superlativo sobre um único item. Com um só, escreva "de 05/10 às 10:00".
2. **`admin/modules/agenda/AgendaScreen.jsx`, painel de uma consulta já concluída** — a gaveta mostra três linhas (status, hora da conclusão, "Corrigir desfecho") e cerca de 900 px vazios: sem responsável, contato, sala, valor, evolução ou consentimento. É a tela em que o médico abre o passado e não encontra nada. Preencha com o que já existe no registro: responsável e telefone, sala, tipo e valor, se houve evolução assinada e se havia consentimento vigente no caso de teleconsulta.
3. **`admin/modules/finance/FinanceScreen.jsx`, abas de A receber** (Todos / Pendentes / Vencidos / Recebidos) — sem contagem, enquanto as abas da Agenda trazem contagem em todas. Acrescente a contagem, como no resto do painel.

## Defeito 10 — ACABAMENTO, GRAVE · O conteúdo do bloco de consulta sai da caixa (falha M7)

**Onde:** `admin/modules/agenda/AgendaScreen.jsx` (vista Dia, bloco `.slot` dimensionado por duração) e `admin/styles/components/modules.css` (`.slot`, `.day-grid__cell`).

**O que acontece:** medido ao vivo — `.slot--info` com `clientHeight 48px`, `scrollHeight 55px`, `overflow: visible`. Um atendimento de 40 min numa escala de 72 px/hora resulta em 48 px de caixa para 55 px de conteúdo: a segunda linha ("Retorno · Confirmado") sai pela borda inferior e fica apoiada sobre a grade — e aparece centralizada, enquanto a linha de cima é alinhada à esquerda. Acontece em 100% dos blocos curtos.

**Por que é erro:** é a cláusula de ritmo da régua — altura de widget reconciliada com a linha-base — e também leitura: o texto flutua fora do bloco a que pertence.

**Como corrigir:** o conteúdo se adapta à altura disponível, em vez de vazar.

1. Quando a altura do bloco for menor que a necessária para duas linhas, mostre **uma** linha (horário + nome) e leve o tipo e o estado para o `title`/tooltip, ou reduza a linha secundária a uma etiqueta curta.
2. `overflow: hidden` no bloco, com `min-height` igual à altura de uma linha, e o texto nunca centralizado quando a linha de cima é alinhada à esquerda.
3. Mantenha a escala de 72 px por hora e o posicionamento por duração que já existem.

**Como verificar:** medir `scrollHeight` contra `clientHeight` em todos os blocos da vista Dia: nenhum pode exceder.

## Defeito 11 — ACABAMENTO, MÉDIO · Rótulo de fim de série assentado na linha-guia errada

**Onde:** `admin/charts/index.jsx` (`ComparisonChart`, rótulos de ponta) e o card "Recebido e pago acumulados" em `admin/modules/finance/FinanceScreen.jsx`.

**O que acontece:** o rótulo "R$ 2.700" aparece assentado na linha-guia de "R$ 3 mil", cerca de 28 px acima do ponto que ele anota. Quem varre o gráfico da esquerda lê 2.700 na altura de 3.000.

**Como corrigir:** alinhe verticalmente o rótulo ao **y do último ponto** da série, com um deslocamento mínimo só para não encostar na linha; quando duas séries terminarem próximas, afaste-as entre si, nunca em direção a uma linha-guia.

**Como verificar:** em Semana, Mês, Trimestre e Ano, a base do rótulo coincide com o ponto final da linha.

## Defeito 12 — ACABAMENTO, MÉDIO · O gráfico de trimestre degenera em linha com duas marcas

**Onde:** `admin/modules/finance/FinanceScreen.jsx`, card "Recebido e pago acumulados" na visão Trimestre.

**O que acontece:** com seis dias de histórico, a visão de trimestre desenha uma linha com duas marcas no eixo (03/10 e 06/10) e deixa 55% da área do gráfico vazia.

**Como corrigir:** quando o número de pontos com dado for menor que um mínimo (3 ou 4), troque o gráfico por um estado esparso: os valores escritos ("Recebido R$ 2.700 · Pago R$ 0, em 2 dias com lançamento") e a frase dizendo que o trimestre mal começou. O gráfico volta quando houver pontos suficientes.

**Como verificar:** no primeiro mês de um trimestre, a tela não mostra uma linha quase vazia.

## Defeito 13 — ACABAMENTO, MENOR · Três barras idênticas ocupando um card inteiro

**Onde:** `admin/modules/finance/FinanceScreen.jsx`, card "Recebido e pago por tipo" → coluna "Recebido por forma de pagamento".

**O que acontece:** Pix, Dinheiro e Cartão com R$ 900,00 cada: três barras de comprimento idêntico num card de largura total. A barra não codifica nada.

**Como corrigir:** quando todos os valores forem iguais (ou a diferença for menor que um limiar), troque as barras por uma linha de texto — "Pix, dinheiro e cartão: R$ 900,00 cada, 3 recebimentos" — e devolva o espaço ao card.

## Defeito 14 — ACABAMENTO, MENOR · Excesso de manchas de alerta na Visão geral

**Onde:** `admin/modules/overview/OverviewScreen.jsx`.

**O que acontece:** a tela chega a ter cerca de doze marcas vermelhas e âmbar simultâneas (KPIs, lista de pendências, tarjas). Quando quase tudo é cor de alerta, a cor deixa de sinalizar.

**Como corrigir:** mantenha a cor **apenas** no que exige ação hoje — consulta sem desfecho, título vencido, laudo a emitir — e deixe em tinta neutra o que é rotina com contagem (teleconsulta sem consentimento marcada para dias à frente, faltas repetidas já conhecidas). O ícone continua distinguindo o tipo de pendência.

**Como verificar:** contar as manchas saturadas da primeira dobra: no máximo cinco, cada uma correspondendo a uma ação de hoje.

## Defeito 15 — SISTEMA, GRAVE · A marca de "período em curso" não existe no gráfico de linha

**Onde:** `admin/charts/index.jsx` (`ComparisonChart`) e o card "Recebido e pago acumulados" em `admin/modules/finance/FinanceScreen.jsx`, nos quatro períodos. Comparar com `admin/styles/components/charts.css:177` (`.bars__col.is-current .bars__fill`).

**O que acontece:** o cabeçalho declara "01/10 a 06/10, **em curso**", mas as linhas são polilinhas únicas — sem classe de período corrente, sem trecho hachurado, sem ponto marcado. A única sinalização é a frase de rodapé. No mesmo painel, o gráfico de barras hachura a coluna do período em curso e publica a legenda correspondente.

**Agravante medido:** mesmo nas barras a marca some quando o valor é zero. A coluna de hoje recebe `class="bars__col is-current"` e o preenchimento carrega o gradiente certo, mas mede `height: 0`, porque `.bars__fill.is-zero { min-height: 0 }` e a coluna não tem pintura própria. O leitor vê a hachura no Ano e não vê nada no Mês.

**Por que é erro:** é a regra que o próprio sistema nomeia, e hoje ela se expressa de três formas — hachura, frase e nada — conforme a tela.

**Como corrigir:**

1. O trecho final da linha, quando o último balde é o período corrente, recebe a mesma marca: traço hachurado ou tracejado com o mesmo par `--data-mid` / `--data-strong`, e o ponto final marcado.
2. A legenda do card ganha a mesma nota que as barras usam ("Trecho hachurado: out, ainda em curso"), mantendo a frase explicativa.
3. Na coluna de barra com valor zero no período corrente, desenhe a marca mesmo assim: um talo de altura mínima com a hachura, ou a hachura no fundo da própria coluna. Zero medido tem de ser visível como zero do período em curso.

**Como verificar:** nos quatro períodos do Financeiro e nas barras da Visão geral e dos Relatórios, o período em curso tem a mesma marca visual, inclusive quando o valor é zero.

## Defeito 16 — SISTEMA, GRAVE · "Confirmado" e "Concluído" são idênticos no grid da agenda

**Onde:** `admin/styles/components/modules.css` — `.slot--info` (~linha 110) e `.week-slot--info` (~linha 200); não existe regra para a variante neutra.

**O que acontece:** medidos, os dois estados dão exatamente o mesmo resultado: fundo `rgba(15,16,18,.04)` e barra esquerda `2px rgba(15,16,18,.12)`. Só o texto separa. Na aba **Lista da mesma tela** eles se distinguem (a etiqueta de "Confirmado" é contornada) — ou seja, a correção anterior entrou na etiqueta e não chegou ao bloco do grid.

**Como corrigir:** leve a mesma distinção ao bloco: "Confirmado" ganha contorno (borda de 1 px em `--ink-a12`) com fundo transparente, e "Concluído" mantém o fundo preenchido; ou use a própria etiqueta dentro do bloco. A regra vale igual nas vistas Dia e Semana.

**Como verificar:** na vista Semana, distinguir os dois estados sem ler o texto.

## Defeito 17 — SISTEMA, MÉDIO · O bloco verde quebra o padrão dos próprios blocos

**Onde:** `admin/styles/components/modules.css:109` e `:203` (`.slot--success`, `.week-slot--success`).

**O que acontece:** `--warning` usa fundo âmbar com barra `--signal-amber-ink`; `--danger` usa fundo vermelho com barra `--signal-red-ink`; `--success` usa fundo verde com barra **`--ink-a12`**, neutra.

**Como corrigir:** usar `var(--signal-green-ink)` na barra, para que as três variantes tintas sigam o mesmo par de fundo e traço.

## Defeito 18 — SISTEMA, MÉDIO · Documentos troca de seção com a gramática de recorte

**Onde:** `admin/modules/documents/DocumentsScreen.jsx:42` (`variant="underline"`).

**O que acontece:** "A emitir · Emitidos · Fila de assinatura · Modelos" troca de seção, mas usa o sublinhado — que em todas as outras telas está reservado a recorte (período em Financeiro e Relatórios, filtro de lista em Pacientes e na Lista da Agenda). Comunicação tem um conjunto estruturalmente igual ("Conversas · Automações · Modelos") e usa segmento. Documentos ainda é a única tela com ícones nas abas, criando uma terceira aparência do mesmo componente.

**Como corrigir:** trocar para `variant="segment"`, como nas outras seções, e remover os ícones das abas para a aparência ser a mesma. O contador de "A emitir" permanece.

**Como verificar:** percorrer as 11 rotas: navegar entre seções tem uma aparência só; recortar lista tem outra.

## Defeito 19 — SISTEMA, GRAVE · O esqueleto continua genérico demais

**Onde:** `admin/App.jsx`, `RouteFallback`.

**O que acontece (medido em 9 rotas):**
- a faixa de KPIs do esqueleto é sempre 216 px; a real mede 144 (`#/auditoria`), 168 (Agenda, Documentos, Comunicação, Operações), 192 (Financeiro), 216 (Relatórios) e 240 (Visão geral, Pacientes). Acerta 1 rota em 9, e chega a errar 72 px;
- a terceira linha do cabeçalho é 20 px no esqueleto; a descrição real ocupa 39 px (duas linhas) em 6 das 9 rotas;
- a ferramenta do cabeçalho é um bloco de 150×38 com raio 10 px; o real é pílula de raio 999 px em 4 rotas, segmento de raio 10 px em 4, sublinhado de 30 px e raio 0 em 1 — e em Relatórios e Pacientes são **dois** controles, não um;
- a primeira fileira do bento é 7+5 no esqueleto e 8+4 em Relatórios.

**Como corrigir:** o esqueleto precisa de variação por rota, não de um desenho médio. Passe ao `RouteFallback` o formato da tela que vai entrar (altura da faixa, uma ou duas linhas de descrição, tipo e quantidade de controles, divisão do bento) — um mapa simples por rota resolve, já que a rota é conhecida no momento do fallback. Use raio de pílula para botão e raio de segmento para abas.

**Como verificar:** entrar em cada rota com carga fria e medir: a faixa do esqueleto tem a altura da faixa real daquela rota, e nenhum bloco salta mais que a altura de uma linha.

## Defeito 20 — SISTEMA, MENOR · Texto de 10 px carregando dado de tabela

**Onde:** `admin/styles/components/modules.css:510` (`.audit-hash`), coluna "Elo" de `#/auditoria`.

**O que acontece:** 100 células em 10 px na tinta `--ink-300`. O contraste passa, mas o papel do token diz que micro é para eixo, rótulo de valor sobre barra, contagem de filtro e sobrelinha — "nunca a informação principal de um bloco".

**Como corrigir:** célula de tabela é corpo: 13 px. Se o elo ficar longo demais, mostre os primeiros caracteres com reticência **declarada** e o valor completo no título.

## Defeito 21 — SISTEMA, MENOR · Anel de foco com dois azuis

**Onde:** `admin/styles/components/modules.css:670-672`.

**O que acontece:** o foco do painel inteiro é `2px solid var(--blue-500)`, mas o detalhe do limite de erro usa `--blue-600`.

**Como corrigir:** usar `--blue-500`, que é o token de foco; `--blue-600` é tinta de texto e ícone.

## Ao terminar

1. `npx vite build --outDir /tmp/build-charlington --emptyOutDir` sem erro.
2. Conferir `#/agenda` (Dia, Semana, Lista, o detalhe de uma teleconsulta sem consentimento e o de uma consulta concluída), `#/pacientes/<id>` (Consentimentos), `#/relatorios` (quatro períodos), `#/financeiro` (quatro períodos e as abas de A receber), `#/documentos`, `#/auditoria`, `#/` — e o esqueleto, visível ao entrar em cada rota com carga fria.
3. Relatar item a item o que foi alterado e em qual arquivo — e o que não foi possível fazer, sem inventar solução.
