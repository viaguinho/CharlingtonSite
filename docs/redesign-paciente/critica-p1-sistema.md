# Crítica de sistema — Prontuário do paciente, passada 1

Crítico: sistema/tokens (sonnet). Régua: `admin/styles/tokens.css` (fonte única), `DesignCharlington.md`, guia §0 e §3 (mais §4.3 a §4.6 onde a medição os cita). Não li código de página.

**Evidência usada**
- `medidas-1440.json` e `medidas-390.json`, mais as 24 capturas de `.claude/design-loop/shots/prontuario-p1/`.
- Sondagens extras de DOM só de leitura, no mesmo harness headless (`cdp.mjs eval`): texto por nó com tamanho, peso e cor; retângulos de controles; foco; `elementFromPoint`; raios; borda mais sombra.
- Amostragem de pixels nas capturas para contraste. O estimador do JSON só compõe `background-color`, então fica cego a degradê, vidro e plexo.

## Veredito por peça

| Peça | Veredito | Maior violação |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | A 390 px a régua de consultas (`an-rail`, x32–358 × y888–948) cobre os 3 botões de zoom e vista (`an-controls`, x210–358 × y904–948). Está em `42-celular.png`. Abaixo disso: o nome da alergia ("Dipirona") em 11 px, que o tokens proíbe para informação principal. |
| P2 Colunas | **REPROVA** | 11 px (`--t-micro`) usado para o que qualifica número e data de item: 14 linhas, cerca de 29 dos 52 nós de 11 px (tokens L125–128). Somam-se 6 marcas de risco em âmbar e verde com 1,87:1 e 2,29:1, abaixo dos 3:1 de marca de dado. |
| P3 Navegação e seções | **REPROVA** | No celular o botão "Voltar à visão geral" do painel fica atrás da barra global: 0 de 9 pontos amostrados alcançam o botão. O painel é `position:fixed; z-index:60` e a barra tem `z-index:210`. Está em `43-celular-painel.png`. |

## Violações, da mais grave à menor

### 1. [P3] Painel de seção no celular sem saída tocável
- **Onde:** `43-celular-painel.png`, elemento `.pr-panel__close`.
- **Medida:**
  - O botão ocupa x205–375 × y16–56 (170×40).
  - `elementFromPoint` em 9 pontos ao longo do botão devolve só controles da barra global: `chip--plaza`, `icon-btn`, `badge`, `avatar`. Zero acertos no botão.
  - O painel é `position:fixed; inset:0; z-index:60`. A barra tem `z-index:210`.
  - No celular não há Esc.
  - A 1440 o botão funciona: 9 de 9 pontos acertam.
- **Regra:** tokens L323–331, a escada de camadas (`--z-rail 200`, `--z-topbar 210`, `--z-drawer 300`, `--z-modal 400`). 60 não existe nela. Guia §4.5 e §4.6 ("O painel de seção vira tela cheia" e "Esc fecha").
- **Correção:** painel em `--z-drawer` (ou `--z-modal`), acima da barra e do dock. Cabeçalho do painel com recuo de área segura. O "×" fica visível e tocável com 44 px. Sem sobreposição com a barra global.

### 2. [P1] A régua de consultas esmaga os controles do palco a 390 px
- **Onde:** `42-celular.png`, recorte 600–1300 px.
- **Medida:**
  - `an-rail`: x32–358, y888–948.
  - `an-controls`: x210–358, y904–948.
  - Os botões `+`, `−` e `¾` ficam 100% dentro da régua. As cápsulas "Retorno em 07/10/2026" (x101–291, h52) cobrem `+` e parte de `−`. A marca "Hoje" fica por cima do `¾`.
  - Na captura `+` e `−` aparecem esmaecidos por trás do vidro.
  - A cápsula "Concluído" sai cortada à esquerda ("ncluído"), sem máscara de fade.
- **Regra:** guia §4.3 (controles de 44 px no canto inferior direito, linha do tempo "na base"); §4.6 (<1024 px mantém o palco usável, com pinça e arrasto). Alvos tocáveis não podem se sobrepor.
- **Correção:** abaixo de 768 px, empilhar. Controles numa linha acima da régua, ou régua abaixo do palco. Mínimo 8 px entre alvos. Máscara de fade nas bordas da régua.

### 3. [P2, P1] `--t-micro` (11 px) carrega informação que o tokens manda ser corpo
- **Onde:** `01-dobra-1440.png`, `03-pagina-1440.png`, `22-coluna-direita.png`.
- **Medida:** 52 nós de texto em 11 px (JSON). Destes, cerca de 29 nós (14 linhas) estão em papéis que o tokens proíbe:
  - nota sob o escore, `Aplicada há 20 dias · 4 aplicações` (3 cartões);
  - chip de variação, `−5 pontos` (2);
  - data de pasta, `pr-folder__date` (3);
  - `Desde 22/07/2026`, `pr-meds__since` (2);
  - `desde 16/09/2026 (há 4 semanas)` no Acompanhamento (1);
  - rótulos de contagem, `Atingidos / Emergentes / Atrasados` (3).
  - No palco, "Dipirona" (a substância da alergia) e "Retorno de 07/10/2026 10:00".
- **Regra:** tokens L125–128 definem o micro como "só apoio… nunca a informação principal de um bloco, e nunca o que qualifica um número (nota sob KPI, nota de gráfico, data de item de lista): isso é corpo, em `--ink-400`". O guia §4.3 pede o alerta com "os mesmos textos" do cabeçalho.
- **Correção:**
  - Notas, datas e rótulos de contagem sobem para `--t-body` 14 em `--ink-400`.
  - O nome da alergia vira 14 px, `--w-medium`, `--ink-900`.
  - O micro fica só para contagem de pílula, mês e dia da régua, eixo de gráfico, dica de teclado e crédito.

### 4. [Todas] Escala de tipo estourada e fora da escala
- **Onde:** `medidas-1440.json` e `medidas-390.json` (`tamanhosDeTexto`); sondagem dos 8 painéis a 1440.
- **Medida:**
  - Bruto a 1440: `{11:52, 14:114, 20:7, 22:3, 24:7, 28:3, 32:1, 52:3}`, ou seja 8 valores. A 390 são 7 valores.
  - Fora do tokens: 20 e 24. Vêm de `gf-sheet-meta` (7) e `gf-sheet-name` (7), do GlassFolder, medidos antes do `transform: scale`. O 28 é `gf-title` (3).
  - Em tela esses textos medem 10–15 px de caixa, ou seja cerca de 8–12 px de corpo. Os de 8–9 px (data da folha) ficam abaixo do micro de 11 px.
  - Tamanhos realmente renderizados na Visão geral com a página rolada: 11, 14, 22, 32, 52 = 5. O 22 só aparece nos 3 números dos Marcos e no título do popover.
  - Na dobra a 900 px são 4: 11, 14, 32, 52.
  - Painéis das 8 seções: o título `card__title` renderiza em **17 px**, que não existe no tokens. Aparece nas 8 seções. O painel Escalas ainda traz o escore em 28 px, contra 52 px na Visão geral para o mesmo dado. Conjunto do painel Escalas: 11, 14, 17, 28, 32 = 5.
- **Regra:** tokens L115–142 ("Quatro tamanhos de texto por tela, no máximo… a escala só tem cinco": 11, 14, 22, 32, 52). Guia §3 ("só os tamanhos da escala… no máximo 4 por tela"). Não há justificativa no próprio tokens para 5 ou mais.
- **Correção:**
  - Título de painel de 17 para `--t-title` 22.
  - Números dos Marcos para 14/`--w-semibold`, ou 32/`--w-light` (a 32 não soma tamanho novo).
  - Título do popover em `--t-body` `--w-medium`, ou aceitar 22 só se os Marcos saírem do 22.
  - Escore do painel Escalas em 52.
  - Texto do GlassFolder: declarar como arte (`aria-hidden`, fora da conta) ou fixar o corpo renderizado em 11 px.

### 5. [P3] Anel de foco invisível na pílula ativa
- **Onde:** `f-pill-c.png`, `.pr-pill.is-active` ("Visão geral"). Captura de apoio no scratchpad: `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/fa3072cc-0f10-4c5d-9158-a0e60c4c0020/scratchpad/critica-p1-sis/f-pill-c.png`.
- **Medida:**
  - `:focus-visible` dá `outline: solid 2px rgb(0,113,227)`, `outline-offset:-2px`, sobre fundo `rgb(0,113,227)`. Contraste 1:1.
  - A captura com foco não mostra anel nenhum.
  - Pelo guia §4.1 (tabindex móvel) a pílula ativa é a parada de Tab.
  - Pastas: `.pr-folder .gf-hit` tem `outline: none`. O único indício de foco é o sublinhado de 1 px em "3 arquivos" (`f-folder-c.png`).
- **Regra:** foco visível (checagem de sistema). Tokens L53–67 (azul como preenchimento: o anel azul não pode ficar sobre o próprio azul).
- **Correção:** anel externo com `outline-offset: 2px`. Para pílula preenchida, anel duplo: `box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--blue-500)`. Pasta com anel de 2 px ao redor do cartão.

### 6. [P2] Marcas de risco abaixo de 3:1
- **Onde:** `01-dobra-1440.png`, traço de 2×14 px antes de "SNAP-IV", "Vanderbilt" e "M-CHAT-R/F". O mesmo acontece nos 3 traços dos Marcos ("Atingidos", "Emergentes", "Atrasados").
- **Medida (pixel):**
  - `--signal-amber` `#f1b31c` sobre `#ffffff` = **1,87:1**.
  - `--signal-green` `#27c462` = **2,29:1**.
  - `--signal-red` `#ea4e3d` = 3,71:1, passa.
  - São 6 marcas, 4 delas abaixo de 3:1. O texto vizinho ("Sintomas significativos", "Baixo risco") evita depender só da cor, mas a marca continua sendo a leitura rápida.
- **Regra:** tokens L82–88 e L93–98 ("toda marca que carrega informação tem 3:1 ou mais sobre `--surface`"; `--data-positive`, `--data-caution`, `--data-negative` existem para isso: 4,07, 3,27 e 4,31). O guia §3 manda `--signal-*` para o traço, mas o próprio tokens exige o `--data-*` para marca de dado.
- **Correção:** traço em `--data-caution` (âmbar), `--data-positive` (verde) e `--data-negative` (vermelho). `--signal-*` fica só em fundo tingido e texto `*-ink`. Alinhar o guia §3 ao tokens.

### 7. [P3] Pílula ativa em azul contraria `--tab-active-bg` e o resto do painel
- **Onde:** `01-dobra-1440.png`, `30-painel-*.png` (comparar com `shots/relatorios-p3/02-dobra-resumo.png`).
- **Medida:** `pr-pill is-active` com fundo `rgb(0,113,227)`, 101×40. O tokens declara `--tab-active-bg: var(--ink-900)` e `--tab-active-ink: var(--surface)`. Em Relatórios a aba ativa é pílula de tinta. No cabeçalho do prontuário passam a coexistir "Emitir documento" em tinta/preto e a pílula ativa em azul.
- **Regra:** tokens L48–51 ("Aba ativa — pílula e segmento compartilham o mesmo estado"). Guia §3 e §4.1 pedem azul. É conflito entre guia e tokens.
- **Correção:** decidir uma gramática. Ou o prontuário usa `--tab-active-bg` (tinta) como as demais telas, ou o tokens registra o azul como novo estado de aba e as outras telas migram. Não manter duas.

### 8. [P3, header] Borda de 1 px junto com sombra larga nos botões
- **Onde:** botões globais `btn btn--secondary btn--md` ("Editar ficha") e `btn btn--primary btn--md` ("Emitir documento"). Aparecem em todos os painéis, também nas variantes `--sm` e `--md` dos painéis. `medidas-*.json` → `bordaMaisSombra`.
- **Medida:**
  - Secundário: borda 1 px `rgba(15,16,18,.08)` mais `0 1px 2px, 0 10px 28px -14px` (= `--e-1`).
  - Primário: borda 1 px `rgb(2,2,1)` mais `0 6px 16px -8px rgba(15,16,18,.55)`.
  - Os cartões (`pr-card`, `pr-scale`, painel) não repetem o defeito.
- **Regra:** guia §3 ("sem borda de 1 px junto com sombra larga (declarar elevação uma vez só)"). Tokens L155–160, as elevações `--e-*`.
- **Correção:** botão secundário só com `--e-1` ou só com borda. Primário só com a sombra de elevação do token, sem borda da mesma cor do fundo.

### 9. [P1, P2, P3] Alvos de toque menores que o mínimo no celular
- **Onde:** `medidas-390.json` → `alvosMenoresQue44`.
- **Medida (390 px):**
  - Abaixo de 40 px (`--touch`):
    - `pr-link` ×4: "7 arquivos" 96×32, "Ver todas" 93×32, "Abrir" ×2 64×32.
    - `pr-folder__open` ×3, 32×32.
    - `pr-alert__action` "Remarcar", 72×32.
    - `an-layers__btn` ×5, 38×38 (a 1440 têm 44).
    - Link "Pacientes" do Breadcrumb, 58×21.
  - Em 40 px: as 9 `pr-pill` e os botões "Editar ficha" e "Emitir documento".
  - Os 40 px cumprem o `--touch` do tokens, mas não os 44 px pedidos para celular.
  - Os botões do palco (`+`, `−`, `¾`) têm 44 e passam.
- **Regra:** tokens L314–315 (`--row-min: 44px`; `--touch: 40px` para botão e aba ≤768 px). Guia §4.3 (controles de 44 px). O tokens e o guia divergem entre si, 40 contra 44.
- **Correção:**
  - Camadas do arco para 44 px a 390 px.
  - `pr-link`, `pr-folder__open` e `pr-alert__action` com área de toque de 44 px (padding ou `::after`).
  - Decidir um único mínimo (44 recomendado) e ajustar `--touch`.
  - Breadcrumb com altura de toque.

### 10. [P1] Crédito do palco abaixo de 4,5:1 sobre o vidro azulado
- **Onde:** `01-dobra-1440.png`, `.an-credit` ("Modelos 3D: Human Reference Atlas…").
- **Medida (pixel, 11 px, `--ink-400` `#636468`):**
  - Mediana de fundo `(212,225,238)` = **4,45:1**; pior 10% dos pontos 3,94:1.
  - Com a página rolada o fundo muda e a mediana vira 5,5:1. O contraste varia com o que está atrás do vidro.
  - O JSON não acusa, porque só compõe `background-color`.
- **Regra:** tokens L15–25 (texto ≥ 4,5:1 no canvas). Guia §3 ("nunca abaixo de 4,5:1 no vidro: medir sobre o pior ponto do palco"). O guia §4.3 prescreve `--ink-300`, que é pior: ver observação sobre `--ink-300` abaixo.
- **Correção:** crédito em `--ink-600`, ou cápsula com `--rp-glass-strong` opaca o bastante. Quebrar em uma linha (a 1440 quebra com "modificados" órfão).

## Falsos positivos e conferências

- **"Emitir documento", contraste 1,12:1 (`textosAbaixoDoAA`): falso positivo.** O botão tem fundo em degradê quase preto (`btn--primary`); a captura mostra texto branco legível. O estimador só compõe `background-color`. Não é violação.
- **Rolagem lateral:** `false` a 1440 e a 390. A barra de pílulas rola por dentro a 1024 e a 390, por desenho.
- **Elevação de cartão:** `pr-card`, `pr-scale`, painel e pastas não têm borda mais sombra. O defeito é só dos botões (item 8).
- **Raios:** 50%, 999px, 28px, 18px e 12px estão no tokens. Fora dele: 3px em 35 elementos `gf-lines > i`, as linhas de texto da folha do GlassFolder. Com 2–6 px de altura são visualmente pílulas e deviam usar `--r-pill`.
- **Cor de texto:** as 10 cores de texto computadas na tela mapeiam para tokens: `--ink-400`, `--ink-600`, `--ink-500`, `--ink-900`, `--ink-950`, `--surface`, `--blue-600`, `--blue-700`, `--signal-red-ink` e `--gf-sheet-ink`. Nenhuma cor solta.
- **Contraste geral:** mais de 50 nós de 11 e 14 px em `--ink-400` e `--ink-600` sobre vidro medem 5,0:1 ou mais (mediana). Passam. "Hoje" (`--blue-600`, 11 px) mede 4,82:1 de mediana e 4,51:1 no pior ponto. Passa com folga zero.
- **Sinais fora do modelo:** vermelho nas pílulas de alerta, âmbar e verde só como estado, e `--anat-*` só dentro do palco. Papéis corretos, salvo o item 6 (contraste).
- **Foco nos demais controles:** botões, `an-glass-btn`, `pr-link` e `pr-bar__back` têm anel de 2–3 px, visível.
- **Console:** sem erros.

## Observações menores (fora das 10)

- **Corte seco do palco.** O modelo e o véu terminam numa borda horizontal reta no limite da caixa do palco. Aparece em `22-coluna-direita.png` e `03-pagina-1440.png`, com o torso cortado e arestas laterais visíveis. Guia §3: a matriz de pontos deve "apagar nas bordas com máscara radial". Falta máscara de fade em toda a caixa, não só nos pontos.
- **`¾` como rótulo de vista.** Glifo unicode em 14 px (renderiza minúsculo) no botão de vista. Guia §3 proíbe glifo unicode como ícone. Usar ícone de `Icon.jsx` ou texto "Frente/Lateral/Topo".
- **Arte do GlassFolder.**
  - O tokens L333–337 diz "tom claro apenas", mas registra as receitas `profundo` e `grafite`. A pasta "Neurofisiológico" renderiza quase preta (`--gf-art-profundo-1`, `#050b16`) ao lado de pastas claras.
  - As pastas "Imagem" e "Neurofisiológico" têm marmoreado azul saturado (`--gf-art-azul-5`) ocupando mais área que qualquer ação, numa cor reservada a interação (DesignCharlington, "Don't").
  - Está tokenizado e o guia §1 aprova "arte gerada nos azuis". Fica como risco de decoração.
- **Azul como estado.** `pr-dx__dot` ×2 (7×7) usa `--blue-500` para estado de diagnóstico, e os nós do arco de camadas são azuis decorativos. Azul é papel de interação; estado seria `--signal-*` ou neutro.
- **Chip de variação.** "−5 pontos" (queda no SNAP-IV, que é melhora) vem tingido de âmbar. A cor acompanha a faixa de risco, não a direção. Pode ler como alerta.
- **Raio concêntrico.** `pr-sensory` (18 px) dentro do cartão de 28 px com cerca de 20 px de respiro. O tokens L149–151 pede raio interno ≈ externo menos o respiro, ou seja cerca de 8.
- **Painel Escalas.** O rótulo do SVG "dentro do esperado" sai cortado ("entro do esperado") à esquerda do cartão (`30-painel-escalas.png`).
- **Cabeçalho a 1280 e 390.** O chip "F90.0" quebra para uma segunda linha sem alinhar à margem esquerda dos metadados (`40-1280.png`, `42-celular.png`).
- **Popover.** Medido só com "Lobo temporal esquerdo" (mancha `--blue-600`): "O que faz" em `--ink-500` rende 5,16:1 de mediana e 4,44:1 no pior ponto. Com estruturas escuras (`--anat-amigdala` e `--anat-tronco`, `seq-5`, ou `--anat-osso`, `--ink-600`) a mancha pode derrubar o texto abaixo de 4,5:1. Não medido nessas estruturas.
- **Defeitos no próprio tokens.**
  - O comentário L121–124 ainda lista "micro 10 · corpo 13 · título 20", e o código declara 11, 14, 22.
  - `--ink-300` (`#6e6e6e`) é anunciado com 4,56:1 no canvas e mede **4,47:1** sobre `#eef0f3`. Qualquer texto em `--ink-300` sobre o canvas (como prescreve o guia §4.3 para o crédito) reprova.
  - O tokens L115 afirma que "a escala só tem cinco" tamanhos, mas L132–142 declaram sete (11, 14, 22, 28, 32, 40, 52).
