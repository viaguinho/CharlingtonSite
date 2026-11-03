# Crítica P6 — Fidelidade (prontuário do paciente)

Data: 22/10/2026. Crítico de fidelidade, contexto limpo: não li críticas anteriores, `design-loop.md` nem o código da página. Julguei pela tela.

## Método

- **Régua:** `bar.md` (7 mecanismos), `guia.md` §0 e §2. Usei §4.5 e §4.6 só para não apontar decisão do dono como defeito.
- **Material da passada:** as 27 capturas em `.claude/design-loop/shots/prontuario-p6/`, mais `medidas-1440.json` e `medidas-390.json`.
- **Capturas extras** (feitas com `cdp.mjs`, guardadas só no scratchpad): coração em foco, artérias em foco e hipocampo em foco (pela lista do palco, `ArrowDown` ×28, ×29 e ×12), "Aproximar" ×3, vista "Frente" e vista "Lateral". Fiz recortes ampliados de cabeça, ombros, cartões e pastas.
- **Referência:** abri a Dribbble 27474777 no navegador, sem baixar nada. Usei a 48076259 (monitor com a tela inteira), a 48076255 (corpo em perspectiva, ombro amarelo e pulmão vermelho), a 48076257 (pastas e ombro de perto) e a 48076258 (card eAG de perto).
- **Coordenadas:** em pixels da captura citada, no formato (x1–x2, y1–y2).
- **Fora do meu escopo:** o medidor aponta "Emitir documento" com contraste de 1,12. É falso positivo, porque o botão é texto branco sobre tinta e se lê bem nas capturas 01 e 02.

---

## Rodada do plexo (foco desta passada)

| Critério pedido | Resultado | Evidência |
|---|---|---|
| Cérebro com superfície e hemisférios, não um novelo | **FALHA** | Não há cordas longas atravessando o volume. Mesmo assim, o cérebro lê como uma **bola de rede**. Na vista "Frente" (extra, (680–830, 370–530)), não aparece fissura inter-hemisférica: a densidade de linhas no centro é igual à das bordas, e a frente e o fundo se somam. Na "Lateral" (extra, (640–830, 370–520)), a forma é um oval sem sulco lateral, sem polo temporal destacado e sem cerebelo separado. Em repouso a 1440 (01-dobra (668–830, 375–545)), a leitura é a mesma. A forma existe no modelo: o lobo frontal direito aceso em 15-lista-teclado (665–755, 380–475) tem contorno de lobo. Quem esconde a anatomia é o plexo. |
| Pele e ombros com nós e malha regular | **FALHA** | A 1920 (02-dobra (1080–1380, 700–960)), a malha é de **células irregulares de 30 a 100 px**, com quadriláteros e pentágonos misturados a triângulos. Os nós aparecem em cerca de 1 vértice a cada 10, e a malha não chega ao contorno: o ombro termina num véu liso, sem linhas. A 1440 (01-dobra (500–1010, 640–790)) é igual. A referência (48076255) tem uma triangulação densa, com nó claro em quase todo vértice. |
| Hierarquia de profundidade (véu na pele e no crânio, cérebro em destaque) | PASSA | 01-dobra: cérebro azul e mais denso, crânio em cinza fino e pele como véu branco translúcido. O cérebro é o primeiro objeto que o olho pega. Ressalva: o crânio vira uma mancha cinza no meio do rosto (defeito 6). |
| Estrutura selecionada com malha por cima do sólido | PASSA | Temporal (10-hover-temporal (755–825, 445–515)), cerebelo (11-hover-cerebelo (697–812, 475–545)) e coração (extra): sólido colorido com arestas e nós brancos por cima. O resto do cérebro recua para cinza. |
| Coração e artérias em vermelho quando em foco | **FALHA** no coração · PASSA nas artérias, com ressalva | O coração em foco (extra, (700–800, 740–800)) aparece **cortado pela borda e meio escondido sob a cápsula "07 out 2026"**. O pino fica sob a cápsula, em (751, 802), e a cor medida, rgb(238,169,162), é rosa-salmão. As carótidas, as vertebrais e o arco aórtico (extra, (700–790, 470–790)) são reconhecíveis e vermelhos, mas lavados, em rgb(205,136,129), contra rgb(50,109,170) do lobo azul em foco. |

**Veredito do plexo:** a hierarquia e o foco estão certos. A anatomia ainda não se lê: o cérebro não tem hemisférios, a pele não tem malha regular e o coração em foco não aparece inteiro.

---

## Os 7 mecanismos (`bar.md`)

| # | Mecanismo | Resultado | Evidência |
|---|---|---|---|
| 1 | A anatomia é o maior objeto | PASSA | O palco tem 576 px, 40% de 1440 e 44% da largura útil sem o dock (medidas-1440). O busto vai do topo da cabeça (y≈362) aos ombros sob a faixa (y≈845): cerca de 80% dos 600 px do palco. O palco não tem moldura e fica sobre a mesa pontilhada (01-dobra). A 1920, o busto ocupa a altura toda (02-dobra). |
| 2 | Plexo legível, uma estrutura por vez | PASSA (pela letra) | Em repouso: linhas finas, nós nos vértices e só véu translúcido, sem área sólida (01-dobra). Em hover: exatamente um sólido com plexo por cima, e o resto recua (10, 11). A legibilidade anatômica falha (ver acima e os defeitos 1, 2, 4 e 5). |
| 3 | Card de medida no padrão do biomarcador | PASSA | Número de 52 px em peso 300 contra título de 14 px (3,7×). "/54" menor, mais claro e colado. Traço âmbar de 2 px antes do título. Faixa tingida, linha-limite fina e último ponto com anel. Rodapé de 1 a 2 linhas (01-dobra (1056–1416, 320–620)). Bate com a 48076258. |
| 4 | Um acento só | PASSA | Na dobra, o único azul preenchido fora do modelo é o traço de "Hoje" (826, 795–838). O medidor também lista `an-list__swatch`, que fica fora da tela. Vermelho e âmbar só aparecem como estado: pílulas de alerta, pontos da faixa e ponto do SNAP-IV. |
| 5 | Tudo que flutua sobre o palco é vidro | PASSA | Pílulas de alerta, cápsulas, seletor, controles, popover e barra de seções são translúcidos com desfoque. Os cards têm raio de 28 px. Borda somada a sombra só nos dois botões do cabeçalho, que não são cards (medidas-1440). |
| 6 | A pasta é o herói do card de exames | PASSA | A pasta ocupa cerca de 145 dos 163 px do card (89%), com aba, frente fosca, folhas em leque, "3 arquivos" sobre a frente, e título e data no topo com ↗ (20-pastas (100–440, 295–515)). Ressalva no defeito 7. |
| 7 | Base do palco em faixa única | PASSA | Cápsulas com 2 itens (data e estado), traço fino de "Hoje", e `+ − 3D` quadrados de vidro no canto inferior direito, na mesma linha de base (01-dobra (490–1020, 790–845)). |

**7/7 pela régua.** As reprovações abaixo vêm do foco da passada (plexo) e do responsivo, não de um mecanismo isolado.

---

## Comparação cega com a referência

Com as duas telas lado a lado e sem legenda, um designer reconhece a mesma família **na moldura**: 3 colunas sobre um palco único, cards flutuando, número fino com unidade colada, gráfico de pontos com faixa tingida, pastas de vidro, cápsulas na base, seletor radial à esquerda do corpo, popover com a cor da estrutura vazando e pino com anel. A tradução para o tema claro está coerente.

**No corpo, não reconhece.** A referência é um esqueleto denso e luminoso. O plexo se adensa onde há osso, por isso coluna, costelas e crânio se leem sem rótulo, e os órgãos destacados são sólidos saturados com textura interna. Aqui há um manequim de poucos polígonos, pálido, com uma bola de rede azul dentro da cabeça. O que se lê de imediato é "cabeça com cérebro". Os lobos, o crânio e o coração não se leem.

**Nota de semelhança: 6/10.** Composição 8, cards e colunas 8, navegação 7, corpo 4.

---

## Vereditos por peça

| Peça | Veredito | Maior lacuna |
|---|---|---|
| **P1 Palco anatômico** | **REPROVA** | O cérebro não tem superfície nem hemisférios e lê como bola de rede. O coração em foco sai cortado e sob a faixa de consultas. |
| **P2 Colunas** | **APROVA** | A frente da pasta é opaca. Na referência, é vidro fumê que deixa ver as folhas (defeito 7). |
| **P3 Navegação e seções** | **REPROVA** | A 1366×768, 1180 e 390 px, a fileira de camadas e a pilha de alertas caem em cima da cabeça e escondem o cérebro. |

---

## Defeitos, do mais grave ao menor

### 1. [P1] O cérebro lê como bola de rede, sem hemisférios nem lobos
- **Evidência:** vista "Frente" (extra, (680–830, 370–530)). Não há fissura no topo, e o centro é tão denso quanto as bordas: as arestas de trás e da face medial se somam às da frente. Vista "Lateral" (extra, (640–830, 370–520)): oval liso, sem sulco lateral nem polo temporal, e o cerebelo não se separa. Repouso a 1440 (01-dobra (668–830, 375–545)) e "Aproximar" ×3 (extra, (610–900, 380–680)) mostram o mesmo emaranhado.
- **Correção:**
  - (a) Não ligar vértices de hemisférios opostos: descartar a aresta quando `sign(x)` dos extremos difere, ou quando o ângulo entre as normais passa de 60°. Afastar os hemisférios ±1,5 mm em X para a fissura abrir em vista frontal.
  - (b) Atenuar mais forte o que está de costas e o que é face medial. Por exemplo, alfa × `smoothstep(0.05, 0.45, dot(n, v))`: o centro esvazia e a silhueta se adensa, como numa casca.
  - (c) Reforçar linhas de feição: arestas da malha original com ângulo diedro acima de 25–30° (sulcos), com um degrau de alfa a mais que as arestas do grafo.
  - (d) Dar uma película azul muito leve ao sólido do cérebro em repouso, com borda de Fresnel (`--anat-brain-rest`), para haver superfície e não só linhas.
  - **Aceite:** na vista "Frente", a 1440, a fissura aparece como uma faixa vazia de pelo menos 4 px no topo, e na "Lateral" o lobo temporal se destaca embaixo.

### 2. [P1] O coração em foco sai cortado, fica sob a faixa de consultas e lê rosa
- **Evidência:** extra "coração em foco".
  - O sólido aparece só de y 742 a 790. A metade de baixo some sob a cápsula "07 out 2026 · Sem desfecho" (680–805, 790–850) e sob a borda do palco.
  - O pino fica embaixo da cápsula, em (751, 802), e não se vê.
  - A cor medida é rgb(238,169,162), contra rgb(50,109,170) do lobo azul em foco. As artérias também ficam lavadas, em rgb(205,136,129).
- **Correção:**
  - Ao focar uma estrutura, mover o alvo da câmera para o centro da caixa da estrutura e aproximar até a caixa caber na área livre do palco. A área livre começa abaixo da última pílula de alerta e termina 24 px acima da faixa de consultas.
  - Enquanto o foco estiver fora da cabeça, baixar a faixa para 30% de opacidade.
  - Desenhar o sólido vermelho depois do véu da pele (`renderOrder` maior e véu sem `depthWrite`) e na mesma luminância do azul em foco (L* ≈ 50).
  - **Aceite:** com o coração em foco, o sólido inteiro e o pino ficam visíveis acima da faixa.

### 3. [P3] A 1366×768, 1180 e 390 px, camadas e alertas cobrem a cabeça
- **Evidência:**
  - **1366×768** (40c): a pilha de alertas (432–965, 292–424) cobre o topo do crânio, e a fileira de 5 botões de camada (430–672, 437–480) fica sobre o cérebro (640–770, 395–520).
  - **1180** (40b): a fileira (430–672, 441–487) fica sobre a testa. Os botões de coluna e coração ficam em cima da cabeça (575–672, 441–487).
  - **390** (42-celular): os alertas (32–355, 818–945) e a fileira (30–290, 958–1005) comem cerca de 45% dos 420 px do palco. A cabeça (150–280, 935–1060) só aparece dos olhos para baixo.
- **Correção:**
  - Em modo compacto, manter o seletor de camadas na vertical, colado à borda esquerda do palco (como a 1440), ou levá-lo para a linha de base ao lado de `+ − 3D`.
  - Calcular o topo seguro (fundo da última pílula + 12 px) e deslocar o enquadramento com `camera.setViewOffset` ou com o alvo da câmera, para o crânio começar abaixo dele.
  - Abaixo de 1180, a alergia já fica grudada na barra de seções. A pílula repetida no palco é a que mais empurra a fileira para cima da cabeça no celular: tirá-la do palco nessa faixa libera cerca de 56 px. Isso confirma a decisão do dono, sem ir contra ela.
  - **Aceite:** em 1366×768, 1180 e 390, nenhum controle ou pílula intercepta a caixa do crânio.

### 4. [P1] Pele e ombros sem malha regular e com nós raros
- **Evidência:** 02-dobra-1920 (1080–1380, 700–960): células de 4 a 6 lados com 30 a 100 px, nó em cerca de 1 vértice a cada 10, e a malha para antes do contorno, que fica num véu liso. 01-dobra (500–1010, 640–790) é igual. O rosto em 3/4 é um oval sem feições (01-dobra (640–830, 365–600)).
- **Correção:**
  - Na pele, usar triangulação de verdade: Delaunay sobre os pontos do disco de Poisson, ou k-vizinhos com k=6 completando os triângulos. Assim todas as células ficam triangulares.
  - Raio do Poisson de 14 a 20 px de tela a 1440, uniforme.
  - Nó em todo vértice (1,5–2 px, `--anat-node`).
  - Arestas até a silhueta.
  - **Aceite:** no recorte do ombro a 1920, as células são triângulos de tamanho parecido (razão máx./mín. ≤ 2,5) e há nó em cada canto.

### 5. [P1] O pino opaco esconde a estrutura pequena e corta as artérias
- **Evidência:**
  - Hipocampo em foco (extra, (750–785, 462–495)): o sólido de cerca de 25 px some sob o disco claro do pino, de cerca de 32 px. Vê-se só uma borda azul.
  - Artérias em foco (extra, pino em (742, 634)): o disco interrompe as carótidas entre y 614 e 654, e o vaso parece partido na base do pescoço.
  - Na referência (48076255), o pino é um ponto pequeno dentro de um anel fino, com o centro transparente.
- **Correção:**
  - Pino com anel de 1 px e ponto de 6 px, sem preenchimento no disco.
  - Quando a caixa da estrutura na tela for menor que 48 px, deslocar o pino 28 px para fora, com linha-guia de 1 px, e aproximar a câmera até a estrutura ocupar pelo menos 80 px. Vale para hipocampo, amígdala, núcleos da base e tálamo.

### 6. [P1] O crânio vira uma mancha cinza no meio do rosto
- **Evidência:** 01-dobra (670–790, 490–585) e o recorte da cabeça a 1920 (02-dobra (900–1060, 560–700)). Órbitas, maxila, mandíbula e coluna cervical se sobrepõem num aglomerado escuro e sem forma. Na referência, o crânio é a parte mais legível do corpo.
- **Correção:**
  - No crânio, aplicar a mesma atenuação de costas do defeito 1 (b) e espaçamento maior que o do cérebro.
  - Reforçar só as arestas de feição (órbitas, arco zigomático, borda da mandíbula), com diedro acima de 30°.
  - Baixar o alfa das arestas internas da coluna cervical quando a câmera está de frente.

### 7. [P2] A frente da pasta é opaca, não vidro
- **Evidência:** 21-pasta-aberta, card "Imagem", frente (108–253, 430–505). As folhas acabam na borda da frente, e nada aparece através dela. Na referência (48076257, "Tomography"), a frente é vidro fumê e as folhas aparecem borradas por trás.
- **Correção:** frente com `--gf-glass` a 55–65% de opacidade e `backdrop-filter: blur(10px)`, para a silhueta escura das folhas aparecer através dela. Manter a contagem e o `+` sobre o vidro.

---

## O que está certo e não pode regredir

- **Composição a 1440 e 1920:** 3 colunas com palco de pelo menos 40% da largura e busto de cerca de 80% da altura, sem moldura, sobre a mesa pontilhada. Os cards flutuam e o palco fica fixo ao rolar (22-coluna-direita).
- **Hierarquia de profundidade em repouso:** cérebro azul em destaque, crânio cinza fino e pele como véu.
- **Foco de uma estrutura:** um só sólido colorido com plexo branco por cima, o resto recuando para cinza, e rótulo do pino em vidro (10, 11).
- **Popover de vidro claro:** a cor da estrutura vaza pela esquerda, há a etiqueta "Esquerdo", "Saiba mais" e "Relacionado ao paciente" com contagens reais (12-popover (772–1020, 535–772)).
- **Artérias em foco:** carótidas, vertebrais e arco aórtico reconhecíveis (extra).
- **Lista de 30 estruturas por teclado no palco,** com "Setas percorrem · Enter abre" (15-lista-teclado).
- **Cards de escala no padrão do biomarcador:** número 52/300, unidade colada, traço de risco de 2 px, faixa tingida, último ponto com anel e rodapé curto.
- **Pastas:** a pasta domina o card, as folhas saem em leque, a contagem fica sobre a frente e ↗ no topo.
- **Base do palco:** cápsulas com 2 itens, traço de "Hoje" e `+ − 3D` na mesma linha de base.
- **Pílulas e painel:** pílula ativa em tinta. O painel cobre o palco e a coluna direita, deixa a coluna esquerda visível e repete os alertas no cabeçalho com "Voltar à visão geral" (8 capturas 30-painel-*).
- **Celular:** o painel abre em tela cheia, com nome, × e alertas (43-celular-painel).
- **Abaixo de 1180:** a alergia fica grudada na barra de seções (41b).
- **Atribuição:** "BodyParts3D © DBCLS · CC BY 4.0" fica visível sob a faixa.
