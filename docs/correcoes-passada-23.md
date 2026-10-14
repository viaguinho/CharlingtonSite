# Prompt para o Antigravity — correções da passada 23 (painel administrativo Charlington)

> Cole tudo o que está abaixo da linha no Antigravity. Prompt fechado: contexto, regras, cada defeito com arquivo e linha, correção e verificação.
> Origem: passada 23 da rodada 2 (dados e componentes), capturas de 06/10/2026 às 16h16. **Os três críticos reprovaram.** Defeitos 1 a 8 vêm do brief (verdade do dado), 9 a 12 do acabamento (estados vazios e composição) e 13 a 24 do sistema (aderência ao design system).
> Antes de começar: na rodada anterior, o Antigravity (a) criou tokens que não existem (`--ink-700`, `--ink-a02`) e (b) trocou o **nome da criança** pelo estado no bloco da agenda. **Não faça nenhuma das duas coisas**: use apenas tokens que existem em `admin/styles/tokens.css` e nunca remova a identificação do paciente de um bloco ou linha.

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
3. Nenhum dado fictício; nenhum valor literal de estilo fora dos tokens; nenhum token novo sem necessidade (se criar, declare em `tokens.css` com o papel escrito).
4. Nunca remova a identificação do paciente (nome) de um bloco, linha ou etiqueta.
5. O log de auditoria é encadeado por hash: não altere o cálculo nem a ordem de gravação.

---

## Defeito 1 — GRAVE · O painel mostra "Esperou 47 min" quando não há hora de início

**Onde:** `admin/modules/agenda/AgendaScreen.jsx`, linhas ~877 a 881 (`waitEnd`, `waited`, `waitingNow`) e ~927 (chip "Esperou").

**O que acontece:** `const waitEnd = appointment.inicioAtendimento ?? appointment.fimAtendimento ?? null;` — quando falta o início, a espera cai para **chegada → conclusão**, ou seja, espera + o atendimento inteiro. Lido na tela, em atendimentos com chegada e "Início do atendimento: não registrado":

| Paciente | Chegada | Início | Conclusão | Painel mostra |
|---|---|---|---|---|
| Arthur Peixoto Aguiar (02/10) | 07:50 | não registrado | 08:37 | "Esperou 47 min" |
| Antonella Moura Cunha (28/09) | 07:40 | não registrado | 08:52 | "Esperou 1h 12 min" |
| Miguel Antunes Rezende (11/09) | 09:20 | não registrado | 10:17 | "Esperou 57 min" |

**Contradição entre telas:** em Relatórios, a "Espera média" **exclui** esses casos ("1 de 7 sem hora de início registrada"; média 21,7 min). O mesmo atendimento tem 47 min no painel e "fora do cálculo" em Relatórios. É o mesmo erro que já havia sido corrigido em Relatórios.

**Como corrigir:**
1. `waitEnd = appointment.inicioAtendimento ?? null` — **nunca** cair para `fimAtendimento`.
2. Sem início, o chip não diz "Esperou N min": diga "Espera não calculável: sem hora de início registrada", em tom neutro, e mostre a chegada e a conclusão separadas na ficha.
3. `waitingNow` continua valendo só para quem está em check-in, sem início, e não está sem desfecho.

**Como verificar:** abrir um atendimento concluído com chegada e sem início: nenhum chip afirma tempo de espera. Abrir um com início: espera = início − chegada, igual ao que Relatórios usa.

## Defeito 2 — GRAVE · "Duração média por tipo" contradiz "Tipos de atendimento" na mesma tela

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, `durationByType` (linhas ~126 a 137) e o card "Duração média por tipo" (~linhas 440 a 475).

**O que acontece:**
- Mês e Trimestre: "Tipos de atendimento" diz "Retorno 5 · 56%". Logo abaixo, "Duração média por tipo" diz "Nenhum tipo tem 5 atendimentos no período: amostra pequena". Um dos cinco retornos não tem hora de início, então só 4 entram na duração — e a tela não diz isso.
- Ano: Tipos mostra Retorno 48, Teleconsulta 16, Laudo 16, Primeira 6 (soma 86). Duração por tipo mostra "Retorno 39 atendimentos", "Teleconsulta 12", "Laudo 16", "Primeira 6" (soma 73). A palavra "atendimentos" tem dois valores para o mesmo tipo.

**Como corrigir:**
1. O detalhe de cada linha diz a base real: "39 de 48 com hora de início" (concluídos do tipo que entram na média, sobre o total do tipo).
2. A frase de amostra pequena usa a mesma base: "Nenhum tipo tem 5 atendimentos **com hora de início** no período (4 de 5 retornos…)".
3. Nunca escreva "N atendimentos" num card quando outro card da mesma tela diz outro N para o mesmo tipo sem explicar a diferença.

**Como verificar:** nos quatro períodos, os números dos dois cards fecham entre si, ou a diferença está escrita.

## Defeito 3 — MÉDIO · Abrangência das médias não está rotulada

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, KPIs "Duração média" e "Espera média" (~linhas 300 a 345).

**O que acontece:** a Duração média (29 min no Mês) inclui as 2 teleconsultas (8 de 9 com início). A Espera média usa só os presenciais (7). Só a aba Semana escreve "presenciais"; Mês, Trimestre e Ano não dizem por que o denominador cai de 9 para 7 (ou de 86 para 70). O cartão também não diferencia o que falta (início ausente, chegada ausente, ambos).

**Como corrigir:** em todos os períodos, a linha de apoio de cada KPI diz a base completa: "8 de 9 concluídos com hora de início · inclui 2 teleconsultas" e "7 presenciais com chegada · 1 sem hora de início".

## Defeito 4 — MÉDIO · "Semana completa" de três dias

**Onde:** `admin/modules/reports/ReportsScreen.jsx:230` (`por semana completa com atendimento`) e a construção dos baldes semanais em `admin/core/periods.js` (`bucketsFor`).

**O que acontece:** em Relatórios › Trimestre, o texto diz "média de 5,0 por semana completa com atendimento (1 de 2 semanas)". A semana rotulada 03/10 só tem 01/10 a 03/10, porque o trimestre começa em 01/10; a semana real (27/09 a 03/10) tem 9 concluídos. Chamar de "completa" um recorte de 3 dias, com valor pela metade, é rótulo que diz outra coisa.

**Como corrigir:** o balde inicial parcial nunca entra na conta de "semana completa" e é identificado como parcial na nota ("a semana de 03/10 tem só 3 dias dentro do trimestre"). Se não houver nenhuma semana completa, diga "nenhuma semana completa no período" em vez de uma média.

## Defeito 5 — MENOR · Frases que dizem o contrário do número

1. **`admin/modules/documents/DocumentsScreen.jsx`** — "R$ 8.680,00 já recebidos por todos os laudos": dois dos 16 laudos estão vencidos e não recebidos (R$ 620 cada). A soma está certa (14 × 620), mas a frase lida literalmente diz o contrário. Escreva "R$ 8.680,00 já recebidos por 14 dos 16 laudos".
2. **`admin/modules/agenda/AgendaScreen.jsx`** — em teleconsulta **já concluída** sem consentimento, o painel continua dizendo "registrar no prontuário antes de atender", que é instrução para consulta futura. Em consulta passada, escreva "atendimento realizado sem consentimento registrado".
3. **`admin/modules/reports/ReportsScreen.jsx`**, aba Semana — "+33,3%" em concluídos (4 contra 3), "−10 min" na duração (n=3 na semana anterior) e "+45,9%" no recebido, enquanto a taxa de faltas é recusada por "amostra pequena". Aplique o mesmo limiar (`MIN_COMPARE`) aos selos de variação de **todos** os KPIs, sempre.

## Defeito 6 — MENOR · Datas do log divergem das do prontuário sem aviso

**Onde:** `admin/modules/audit/AuditScreen.jsx` e a coluna "Quando".

**O que acontece:** o log diz "Consentimento concedido" em 06/10/2026 16:13:27, e o prontuário diz "Concedido em 07/08/2026". A coluna é o momento do **registro** no sistema, e nada diz isso. O log também lista "Consentimento concedido · Tratamento clínico", que o prontuário descreve como dispensado ("Responsável informado"). Linhas "Criação · Insumo · insumo 1fdba8…" têm o detalhe truncado e ilegível.

**Como corrigir:** rotule a coluna "Registrado em"; na ação de tratamento clínico, use "Responsável informado" em vez de "Consentimento concedido"; e mostre, em detalhe de insumo, o **nome** do insumo, não o identificador.

## Defeito 7 — MENOR · Cabeçalho do Financeiro com palavra órfã

**Onde:** `admin/modules/finance/FinanceScreen.jsx`, descrição da página.

**O que acontece:** "Fluxo de caixa, títulos a pagar e receber e repasse de terapeutas — Campinas / SP." quebra deixando "SP." sozinho na segunda linha.

**Como corrigir:** `text-wrap: balance` na descrição de página, ou texto mais curto.

## Defeito 8 — MENOR · Pequenos pontos de legibilidade nos dados

1. Em Financeiro, o herói "Resultado" (3.770) repete o "Recebido" (3.770) da célula ao lado quando não há despesa paga. Quando os dois forem iguais, a segunda célula deve dizer "igual ao resultado, sem despesa paga no trecho".
2. Em Relatórios › Mês, o chip "0%" ao lado do primeiro KPI não diz o que compara: com delta zero, mostre "sem variação" com a base ("0 em 01–06/09").

## Defeito 9 — ACABAMENTO, GRAVE · Dois estados vazios incompletos (M8)

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, card "Duração média por tipo" (frase "Nenhum tipo tem 5 atendimentos…") e `admin/modules/agenda/AgendaScreen.jsx`, KPI "Confirmadas por acontecer — · Nada por acontecer".

**O que acontece:** a régua exige ícone, frase que diz o que apareceria e ação. Em Relatórios, "Duração média por tipo" é só um parágrafo. Na Agenda Dia, o vazio do KPI tem ícone mínimo e nenhuma ação.

**Como corrigir:**
1. Duração por tipo vazia: use `EmptyState compact` com ícone `clock`, a frase ("Poucos atendimentos com hora de início por tipo para comparar") e a ação "Ver atendimentos sem início" (leva à Agenda, Lista, filtrada).
2. KPI vazio da Agenda Dia: ação "Agendar" (abre o novo agendamento no dia) ao lado do ícone.

## Defeito 10 — ACABAMENTO, MÉDIO · Em Relatórios o número fica longe da barra

**Onde:** `admin/modules/reports/ReportsScreen.jsx` e `admin/charts/index.jsx` (`CategoryBars`), `admin/styles/components/charts.css`.

**O que acontece:** em "Perfil epidemiológico", a barra termina em x≈537 e a contagem "4 crianças" está em x≈645, cerca de 100 px depois. O valor fica longe do dado que descreve, e os quatro cards abaixo da faixa de KPIs pesam igual.

**Como corrigir:**
1. Em `CategoryBars`, a contagem fica **logo após a barra** (alinhada ao fim da barra ou numa coluna fixa e curta junto dela), não na ponta direita do card.
2. Dê um ponto focal à tela: o card que responde à pergunta principal do período (produção) passa a ocupar a largura maior e vem primeiro; os demais ficam em tamanho menor.

## Defeito 11 — ACABAMENTO, MENOR · Branco morto por igualar altura de coluna

**Onde:** Visão geral, "Sua agenda de hoje" (cerca de 410 px vazios em 888, quase metade); Relatórios, "Comparecimento" (~200 px) e "Tipos de atendimento" (~100 px); Financeiro, "Em atraso".

**Como corrigir:** o card acompanha o conteúdo (`align-self: start`) em vez de esticar com a coluna vizinha, ou o conteúdo adicional útil preenche (por exemplo, na agenda do dia, os próximos atendimentos da semana). A altura final continua múltipla de 24 px.

## Defeito 12 — ACABAMENTO, MENOR · Pontos de composição

1. Visão geral: a célula "Laudos a emitir" vira parágrafo de cinco linhas em 13 px e estica a faixa inteira. Resuma a frase em uma ou duas linhas e leve o detalhe para a lista "Precisa de você".
2. Financeiro: a célula "Pago" quebra em seis linhas com cortes ruins. Encurte ("Nenhuma despesa vence neste trecho · último pagamento R$ 36.760,00 em 10/09").

## Defeito 13 — SISTEMA, GRAVE · A marca de período em curso não aparece no gráfico de linha

**Onde:** `admin/styles/components/charts.css:729` (`.compare__line.is-current { opacity: 0.4; }`) e `:193-195` (`.chart__note-swatch--line`), mais `admin/charts/index.jsx` (`currentLast`).

**O que acontece:** o trecho em curso é redesenhado por cima do traço opaco da própria série, com opacidade 0,4. O resultado é um trecho visualmente idêntico ao resto — "trecho mais claro" não existe na tela. O swatch da nota tem opacidade 0,4 e dá 2,12:1 contra o fundo, abaixo dos 3:1 exigidos para marca de dado. A legenda mostra uma linha clara que o gráfico não tem.

**Como corrigir:**
1. **Não** sobrepor: ao desenhar a série principal, pare no penúltimo ponto, e desenhe o último trecho **só** como `is-current`, com a mesma hachura/tracejado curto das barras, em cor ≥ 3:1 (`--data-strong` para Recebido, `--data-soft` para Pago).
2. O swatch da nota reproduz **exatamente** esse traço, com a mesma cor e ≥ 3:1 (sem usar opacidade para marcar estado).

**Como verificar:** em Mês e Ano, o último trecho da linha é visivelmente diferente do restante; o swatch da nota é igual a ele.

## Defeito 14 — SISTEMA, MÉDIO · Contraste 4,37:1 nos blocos "Concluído" da agenda

**Onde:** `admin/styles/components/modules.css` — `.slot--neutral`, `.week-slot--neutral`.

**O que acontece:** texto de 13 px em `--ink-400` sobre o fundo composto (`--ink-a08` sobre o card) mede 4,37:1, abaixo de 4,5:1.

**Como corrigir:** nos blocos preenchidos, o texto secundário usa `--ink-500` (ou o fundo passa a `--ink-a04`). Conferir os dois com o contraste real compondo alfa.

## Defeito 15 — SISTEMA, MÉDIO · O mesmo estado tem duas aparências (Dia × Semana)

**Onde:** `.slot__state` e `.week-slot` em `admin/styles/components/modules.css`.

**O que acontece:** no Dia, o rótulo de "Agendado" é âmbar e o de "Faltou"/"Sem desfecho" é vermelho; na Semana, os mesmos estados saem em cinza. Fundo e barra são idênticos nas duas vistas.

**Como corrigir:** a regra de cor do rótulo de estado é uma só, aplicada aos dois componentes. Mantenha o **nome** da criança em ambos.

## Defeito 16 — SISTEMA, MÉDIO · O esqueleto ainda não bate com a rota

**Onde:** `admin/App.jsx`, `ROUTE_SHAPE` e `RouteFallback`.

**O que acontece, medido (esqueleto × real):**
- Largura da faixa: 1154 px (x=101) × 1156 px (x=100), em todas as rotas.
- Altura: Financeiro Mês 192 × 240; Relatórios Mês 216 × 192.
- Topo: Financeiro 291 × 279; Operações 213 × 186 (descrição de duas linhas contra uma real); Documentos e Pacientes 213 × 205; Visão geral 165 × 161.
- Bloco principal: o esqueleto desenha um card de 566 px onde a rota tem 1156 (Agenda, Pacientes, Operações, Documentos); na Visão geral, 456 × 888.
- Controles: Financeiro — "Novo lançamento" em y=220 no esqueleto e y=143 real; períodos e seção viram 3 blocos de 270×54, 330×38 e 175×38 contra 400×30 e 319×38 reais. Operações 270×38 × 287×38. Agenda 270×38 × 315×34.
- Alertas de 72 px da rota real não aparecem no esqueleto de Financeiro, Relatórios e Agenda.

**Como corrigir:** `ROUTE_SHAPE` deve conter, por rota, as medidas reais lidas acima: largura cheia (1156), altura da faixa daquela rota, número de linhas da descrição, largura e altura dos controles, presença e quantidade de alertas, e a divisão e altura do bloco principal. O esqueleto usa a mesma largura de conteúdo (`x=100`, `w=1156`). **Como verificar:** entrar em cada rota com carga fria: o topo do primeiro card real não muda mais que a altura de uma linha.

## Defeito 17 — SISTEMA, MÉDIO · Segunda fonte ainda é baixada

**Onde:** `admin.html:27` (`<link rel="preload" href="/admin/assets/fonts/urbanist-normal-latin.woff2" …>`) e os arquivos `admin/assets/fonts/urbanist-*.woff2`.

**O que acontece:** o `<link rel="preload">` ainda requisita a Urbanist a cada carga, embora nenhum `@font-face` nem elemento a use (os 617 elementos medidos usam Inter).

**Como corrigir:** remova o `<link rel="preload">` da Urbanist em `admin.html` e, se nada mais a referencia, apague os quatro `urbanist-*.woff2`.

## Defeito 18 — SISTEMA, MENOR · Cor literal em dado e na autenticação

**Onde:**
- `admin/styles/components/charts.css:180` e `:186` — `rgba(0, 0, 0, 0.1)` na listra (`.bars__col.is-current .bars__fill` e `.chart__note-swatch`): preto, fora da paleta de tinta. Use `var(--ink-a12)`.
- `admin/styles/components/auth.css` — `rgb(220,38,38)`, `rgb(15,23,42)`, `rgb(30,41,59)`, `rgb(255,255,255)`, `rgba(15,23,42,.08–.25)`, `rgba(255,255,255,.5/.75)`; sombras `0 20px 40px -15px` e `0 10px 20px -5px` fora de `--e-*`; `.auth__claim` com 32 px/600 (a escala vai até 27 px); botão com `0.9375rem` e raio `0.75rem`; `.auth__dot` azul decorativo.

**Como corrigir:** trocar pelos tokens (`--signal-red-ink`, `--ink-900`, `--ink-600`, `--surface`, `--ink-a08/12`, `--e-2`/`--e-3`, `--t-title`, `--t-body`, `--r-sm`) e tirar o azul do `.auth__dot` (use `--ink-200`).

## Defeito 19 — SISTEMA, MENOR · Conteúdo invadindo o recuo

**Onde:**
- `.metric__target` em Relatórios › Ano (células 2 e 5) e Financeiro › Ano (células 2 e 3): `scrollWidth 172 > clientWidth 167`, o texto ("01/01–06/10/2025 até 16h57…") passa 5,4 px do padding.
- `.appointment-list__date` em Agenda › Lista (`admin/styles/components/modules.css:250`): texto de 77 px numa coluna de 72 px, encostando no avatar.

**Como corrigir:** `overflow-wrap: anywhere` e `min-width: 0` em `.metric__target`; largura de 80 px (`var(--s-20)`) em `.appointment-list__date`.

## Defeito 20 — SISTEMA, MENOR · Taxonomia e estado com aparências sobrepostas

**Onde:** `admin/styles/components/primitives.css` (`.chip--code`, `.chip--muted`, `.chip--neutral`), Relatórios (CID em `<strong>`), prontuário (CID em `<span>` cinza).

**O que acontece:**
- O código CID tem três aparências: chip `--ink-a04` no prontuário, `<strong>` simples em Relatórios, `<span>` cinza numa lista do prontuário.
- "Cancelado" (`chip--muted`) tem o mesmo fundo `--ink-a04`, raio e peso do chip de código.
- "Concluído" e "Campinas / SP" são idênticos (`chip--neutral`).

**Como corrigir:** um componente `CidCode` único, usado em todo lugar, com aparência própria de taxonomia (por exemplo, sem fundo e com borda inferior pontilhada, ou numerais tabulares em peso 500) e nunca igual a nenhum chip de estado. O chip de unidade ("Campinas / SP") ganha uma forma própria (contornado, `--r-pill`), diferente de "Concluído".

## Defeito 21 — SISTEMA, MENOR · Líder de ranking com duas gramáticas

**Onde:** `admin/charts/index.jsx` (`CategoryBars`) e o card "Taxa de faltas por dia da semana" (`rate-list`).

**O que acontece:** em `category-bars`, o líder único leva `--data-strong` mesmo com margem pequena (F90.0 com 8 contra 7; Emissão de laudo com 38 contra 35 min). No `rate-list`, a líder não é destacada ("Nenhum dia se destaca"), e quando destaca usa outra marca (ponto vermelho e `--signal-red-ink`, não barra escura).

**Como corrigir:** uma regra e uma marca para todo ranking: o líder só é destacado quando a diferença para o segundo passa de um limiar mínimo (por exemplo 20% do valor ou 2 unidades), e a marca é sempre `--data-strong`. Em `rate-list`, use a mesma marca; a cor de sinal fica para o significado clínico (faltas), não para liderança.

## Defeito 22 — SISTEMA, MENOR · Troca de seção do prontuário sem a gramática do sistema

**Onde:** `admin/styles/components/patients.css:176` (`.record__nav`).

**O que acontece:** as oito seções do prontuário trocam de seção mostrando o item ativo só com peso 500 e cor `--ink-950`, sem a pílula `--tab-active-bg`. Em todas as outras telas a troca de seção usa segmento ou pílula.

**Como corrigir:** item ativo com `background: var(--tab-active-bg); color: var(--tab-active-ink); border-radius: var(--r-xs)`, como no segmento.

## Defeito 23 — SISTEMA, MENOR · Tipografia e papéis do micro

**Onde:** `admin/styles/components/modules.css` (`.week-day__weekday`, `.week-day__num`, `.week-day__count`) e `admin/styles/components/primitives.css` (avatar).

**O que acontece:**
- `.week-day__weekday` em 10 px/400 caixa alta; o sobrelinha do sistema é 10 px/600 com `--ls-eyebrow`.
- `.week-day__num` em 20 px com altura de linha 30 px e espaçamento normal; o token `--t-title` pede 1,25 e −0,02em.
- `.week-day__count` ("4 consultas") em 10 px qualificando número.
- Iniciais de avatar de 13 px com `letter-spacing: −0,26px` (token de título aplicado ao corpo).

**Como corrigir:** `weekday` com `font-weight: var(--w-semibold)` e `letter-spacing: var(--ls-eyebrow)`; `num` com `line-height: var(--lh-title); letter-spacing: var(--ls-title)`; `count` em `--t-body` na tinta `--ink-400`; avatar com `letter-spacing` do corpo quando o tamanho for ≤ 30 px.

## Defeito 24 — SISTEMA, MENOR · "Em manutenção" com duas aparências, e cursor sobre a barra do período corrente

1. **"Em manutenção"** é âmbar na etiqueta e no KPI de Operações e no cabeçalho da coluna da Agenda Dia, e bloco tracejado cinza (`--ink-a12`, texto neutro) no corpo da coluna. Escolha uma só: o corpo da coluna usa também o âmbar de sinal na borda e no título.
2. **`admin/styles/components/charts.css`** — `.bars__col.is-current .bars__fill` vem **depois** de `.bars__col.is-active .bars__fill`, com a mesma especificidade: a barra corrente mantém `--data-mid` ao passar o cursor e perde o azul de cursor das demais. A listra persiste, mas a marca do zero corrente existe só como `--data-mid` sólido (`min-height: 3px`). Garanta o mesmo estado de cursor em toda barra e que o zero corrente mostre a listra, não cor sólida.

## Ao terminar

1. `npx vite build --outDir /tmp/build-charlington --emptyOutDir` sem erro.
2. Varrer as folhas de estilo em busca de qualquer `var(--…)` que não resolva em `tokens.css`.
3. Conferir `#/agenda` (Dia, Semana, Lista e o detalhe de uma consulta concluída com e sem hora de início), `#/relatorios` (quatro períodos), `#/financeiro` (Fluxo nos quatro períodos), `#/documentos`, `#/auditoria`, `#/pacientes/<id>`, `#/` — e o esqueleto, visível ao entrar em cada rota com carga fria.
4. Relatar item a item o que foi alterado e em qual arquivo, e o que não foi possível fazer.
