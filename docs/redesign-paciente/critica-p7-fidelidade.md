# Crítica p7 — lente `fidelidade` (fidelidade à referência e acabamento)

Data: 23–26/10/2026. Rota `#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3` (Clara) e `#/pacientes/4579401a-c511-4131-a339-7588293467c6` (3 alertas), `http://localhost:5173/admin.html`, Chromium headless da 9333, aba própria, base de verificação.
Referência: Quantis — Health Intelligence System (Dribbble 27474777), 8 imagens grandes renderizadas a 1600×1200 (monitor inteiro, corpo, popover "Aortic Valve", barra/pílulas, clavícula, card eAG, perfil).

Nada foi gravado. Os modais (adendo, suspender, emitir, remarcar, prévia) foram só abertos e fechados com Esc. Os estados extremos (nome longo, 4 alergias, 5 diagnósticos, consulta atrasada hoje, paciente na recepção, 7 medicações) foram montados com um invólucro EM MEMÓRIA sobre o `idbAdapter`, com `put/putMany/destroy/putBlob/destroyBlob/setMeta/wipe` lançando erro.

**Sobre as evidências.** As minhas capturas ficavam em `scratchpad/p7/fidelidade/shots/`, e o scratchpad foi apagado quando o ambiente caiu. Os nomes delas aparecem como referência. As medidas abaixo foram tiradas do DOM e dos pixels antes da queda. Cada achado traz o passo para reproduzir, e onde dá ele aponta para as capturas `shots/prontuario-p7/` (`.claude/design-loop/shots/prontuario-p7/`), que continuam lá.

---

## 1. Os 7 mecanismos da `bar.md`

| # | Mecanismo | Veredito | Medida que sustenta |
|---|---|---|---|
| 1 | A anatomia é o maior objeto, ≥40% da largura útil, busto ≥75% da altura do palco, sem moldura | **PASSA** | 1440: palco 576 / largura útil 1316 = **43,8%**. Busto de y 362 a 832 = 470/600 = **78%** (pixels do canvas com as camadas flutuantes escondidas; linhas com ≥4 px de modelo; o brilho do canto foi descontado). 1920: 1056/1796 = **58,8%**; busto 638/780 = **82%**. Fundo do canvas igual ao da mesa nos cantos (com/sem canvas: 250,251,251 = 250,251,251), sem moldura. Fora das larguras da régua isso cai: 1366 = 70%, 1180 = 61–67%, 1024 = 48% (ver F10). |
| 2 | Plexo legível, uma estrutura por vez | **PASSA** | Em repouso: linhas de 1 px, nós em anel, nenhuma área preenchida (o cérebro é só linha azul). Em hover: uma estrutura sólida com o plexo branco por cima (lobo temporal ampliado 4×). As outras recuam: a tinta na região do cérebro cai de 841 para 179 no hover do coração (−79%), e a dos ombros cai de 1268 para 35 no hover do cerebelo. |
| 3 | Card de medida no padrão biomarcador | **PASSA** | Número 52 px / peso 300 contra título 14 px = **3,7×**. Unidade "/54" de 14 px, cinza 99,100,104, a 2 px do número. Traço vertical de 2 px antes do título, faixa de referência tingida, linha-limite, último ponto com anel e rodapé em ≤2 linhas ("Critérios parcialmente / atendidos"). |
| 4 | Um acento só (≤3 azuis preenchidos por dobra) | **PASSA** | Na dobra de 1440 e de 1920, fora do modelo e do dock: **0** fundos azuis preenchidos visíveis. A linha "Hoje" tem 2 px, e os `an-list__swatch` de 8×8 só aparecem com a lista aberta. Vermelho, âmbar e verde só aparecem como estado: pontos da faixa, traços das escalas, trilha de acompanhamento. Observação: a pílula ativa é **preta** (15,16,18), não azul. |
| 5 | Tudo que flutua é vidro; cards com raio ≥24 sem borda 1 px + sombra larga | **PASSA** | Pílulas de alerta, cápsulas, camadas, controles e popover têm `backdrop-filter: blur(24px) saturate(1.6)` sobre rgba(240,240,244,.72) (o popover usa .64). Cards com raio de **28 px** e borda de 0 px. Borda + sombra só no `.btn` global, que está fora de escopo. |
| 6 | A pasta é o herói do card de exames | **PASSA** | Pasta de 140 px num card de 164 px = **85%**. Tem aba e frente de vidro, as folhas saem em leque (−7,2°, +1,4°, +4,5°), "3 arquivos" fica sobre o vidro, e título, data e ↗ estão no topo. Mas o vidro não deixa ver as folhas (F12). |
| 7 | Base do palco em faixa única, controles na mesma linha de base | **FALHA** | A 1440, as cápsulas vão de y 790 a 838 (48 px) e os controles de 798 a 842 (44 px): as bases diferem **4 px** e os centros **6 px** (814 contra 820). Com 5 consultas, a última cápsula some embaixo dos controles ("Confirma…", F5). A 1180, a primeira cápsula vira um ponto solto na borda. |

## 2. Vereditos por peça

| Peça | Veredito | Motivo principal |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | Em repouso, o coração, as artérias e o crânio não aparecem: o busto é uma nuvem cinza com só o cérebro em azul (F7). As pílulas de alerta e a fileira de camadas cobrem a cabeça em larguras comuns (F1, F2). Quando a camada está desligada, todos os botões ficam iguais (F3). O rótulo "Artérias" sobrepõe o "Hoje" (F6). |
| P2 Colunas | **REPROVA** | O vidro da pasta é opaco e as folhas não aparecem através dele (F12). Com 4 alergias, a linha da alergia quebra começando por "·" (F9). A meta do cabeçalho quebra desalinhada a 1280 (F14). |
| P3 Navegação e seções | **REPROVA** | Ao fechar o popover com Esc ou ×, o foco vai para o `<main>`, e um anel azul de 2 px contorna a página inteira (F4). No gráfico das Escalas os marcadores saem achatados em elipse (F8). No celular, o cabeçalho do painel ocupa cerca de 39% da altura (F11). |
| P4 Faixa de consultas e estados | **REPROVA** | Os controles não estão na mesma linha de base da faixa (M7). Com mais consultas, a faixa é cortada pelos controles no meio da palavra (F5). |

## 3. Comparação cega (recorte equivalente, sem rótulos)

| Peça | Melhor | A maior distância |
|---|---|---|
| P1 corpo | **Referência** | Na referência, as estruturas coloridas e sólidas (osso amarelo, pulmão vermelho) aparecem **em repouso** e contam a história do corpo de longe. No nosso palco em repouso, só o cérebro tem cor. Coração e artérias só existem no hover, e o crânio não se distingue da pele (cinza sobre cinza). Corpo sem rótulo: dá para reconhecer um busto e uma cabeça. O cérebro lê como cérebro (lobos azuis em malha). Coração e artérias, em repouso, não se distinguem: ficam invisíveis. Hover: legível, com uma estrutura de cada vez. |
| P2 cards e pastas | **Empate nos cards; referência nas pastas** | Os cards de escala seguem a gramática do biomarcador com a mesma força (número fino gigante, unidade colada, faixa, anel). Só a pílula de variação é neutra, onde a referência tinge pela cor do estado. A pasta de referência é vidro **escuro translúcido**: as radiografias aparecem através da frente. A nossa frente é quase opaca (degradê com alfa de 0,70 a 0,97), e as folhas só aparecem acima da borda. |
| P3 barra de seções | **Referência** | Na referência cada filtro é uma pílula solta, com respiro e ritmo próprios. A nossa é uma tira contínua de abas de texto com contadores. Lê como abas de app comum, sem o caráter de "pílulas sobre a mesa". A 1180 e a 1024 ela é cortada por fade, sem indicar que rola. |
| P4 faixa | **Referência** | As cápsulas de referência são uma fileira única e contínua sobre o corpo, com ícone, data, pontos e status, e os controles na mesma base. As nossas são fiéis no vidro, mas os controles ficam 4–6 px fora da base, e a fileira não se resolve quando há mais itens (corta embaixo dos controles). |

## 4. Achados confirmados (ordem de severidade)

### GRAVE

**F1 · GRAVE · P1. Pílulas de alerta cobrem a cabeça e o cérebro.**
- Onde: paciente 4579… (3 alertas), visão geral, a 1280×800, 1180×800, 1366×768 e 390×844.
- Evidência: com os pixels do canvas comparados com e sem as camadas flutuantes, a fração da cabeça (42% de cima do busto) coberta pelas pílulas é de **40,4% a 1280**, **59,6% a 1180**, 17,5% a 1366, 40,4% a 390 e 5,5% a 1440. O estado extremo (alergia longa + sem desfecho + atrasado) a 1440 empilha 3 pílulas de y 328 a 537 sobre x 476–815, e cobre o cérebro até a base. Na captura `40c-1366x768-2alertas.png` as pílulas descem até a testa.
- O que deveria acontecer: nenhuma peça flutuante cobre a cabeça. Com mais de 2 alertas, as pílulas deveriam ir para uma linha horizontal ou se recolher ("+2"), ou o modelo deveria descer para abrir espaço.
- Como reproduzir: abrir o paciente 4579… a 1280×800 e olhar o topo do palco.

**F2 · GRAVE · P1. A fileira de camadas atravessa a testa a 1180.**
- Onde: paciente 16df…, a 1180×800. Paciente 4579…, a 1366, 1180 e 390.
- Evidência: as camadas cobrem **27,5% da cabeça** do paciente 16df… a 1180, e 17,4% do 4579… a 1180. Os 5 botões redondos, em fileira horizontal, ficam sobre o topo do cérebro (`40b-1180.png`, faixa y ≈ 375–420).
- O que deveria acontecer: o seletor de camadas fica fora da silhueta, como o arco lateral a 1440.
- Como reproduzir: abrir a 1180×800.

**F3 · GRAVE · P1. Camada desligada perde o ícone.**
- Onde: 1440, botões de camada.
- Evidência: ao desligar qualquer camada, o ícone (cérebro, crânio, gota, coluna, coração) vira a **mesma barra diagonal**. Com quatro desligadas (captura `c-so-cerebro`), os quatro botões ficam idênticos e não dá para saber qual liga o quê. A única pista é o `aria-label`.
- O que deveria acontecer: manter o ícone, recuado ou riscado por cima, para que se veja qual camada está desligada.
- Como reproduzir: clicar em "Crânio", "Vasos", "Coluna e medula" e "Coração" no arco.

**F4 · GRAVE · P3. Fechar o popover leva o foco para o `<main>`, com anel azul na página inteira.**
- Onde: 1440, popover de qualquer estrutura.
- Evidência: depois do Esc, `document.activeElement` = `MAIN#conteudo`, com `outline: rgb(0,113,227) solid 2px` numa caixa de 76,0 × 1364×900. Aparece uma linha azul vertical em x ≈ 73–76 pela altura toda e na borda de cima (captura `esc-1-depois`). Fechar pelo × também manda o foco para o `MAIN`.
- O que deveria acontecer: o foco volta para a estrutura ou para o item da lista que abriu o popover, e o `<main>` não ganha anel visível.
- Como reproduzir: clicar no lobo frontal (≈740,396 a 1440) e apertar Esc.

**F5 · GRAVE · P4. A faixa de consultas é cortada pelos controles no meio da palavra.**
- Onde: 1440 e 1180, com 5 consultas (estado extremo em memória).
- Evidência: a 1440, a cápsula "23 out 2026 · Confirmado" termina em "Confirma" colada ao botão "+". A 1180, "23 out 2026 · Conf…" fica embaixo do "+", e a primeira cápsula vira um ponto solto na borda esquerda (também em `40b-1180.png`, x ≈ 425, y ≈ 790). No celular, a primeira cápsula também chega cortada ("ıet 2026").
- O que deveria acontecer: a faixa termina antes dos controles, com fade ou com uma seta de rolagem, e nunca corta um rótulo de estado no meio.
- Como reproduzir: o paciente precisa ter ≥5 consultas, ou usar o invólucro em memória.

**F6 · GRAVE · P1/P4. O rótulo "Artérias" sobrepõe o "Hoje".**
- Onde: 1440, hover em Artérias (pino no arco aórtico, perto da base do palco).
- Evidência: o rótulo do pino fica em ≈ (790,796), em cima do texto "Hoje" da faixa (814–840 × 790–804). Os dois textos se cruzam (captura `h-arterias`, região 300–400 × 500–530 do palco).
- O que deveria acontecer: o rótulo do pino evita a faixa e os controles, ou sobe acima da estrutura quando o pino fica a menos de ~60 px da base.
- Como reproduzir: passar o mouse em ≈ (748,714) a 1440.

**F7 · GRAVE · P1. Em repouso, coração, artérias e crânio não aparecem.**
- Onde: 1440 e 1920, repouso.
- Evidência: o recorte do peito em repouso (y 360–590 do palco) mostra só o plexo da pele. O coração e os vasos não têm traço próprio, e o crânio é o mesmo cinza da pele. Comparado com a referência (`ref-6`, `ref-1`), onde as estruturas coloridas e sólidas aparecem em repouso, essa é a maior distância de P1.
- O que deveria acontecer: em repouso, o coração e as artérias já se distinguem pelo menos pelo plexo tingido (vermelho fraco), como o cérebro tingido de azul. O hover continua sendo o único estado sólido.
- Como reproduzir: abrir a 1440 sem mexer o mouse.

**F8 · GRAVE · P3. Marcadores achatados no gráfico das Escalas.**
- Onde: `?secao=escalas`, a 1440, gráfico da Vanderbilt (2 aplicações).
- Evidência: os pontos saem como elipses vazadas de ≈10×6 px, um "0" deitado, em vez de círculos (região x 480–1400 × y 540–640 depois de rolar o painel até o fim).
- O que deveria acontecer: círculos, ou seja, o SVG não pode escalar os marcadores de forma não uniforme.
- Como reproduzir: abrir a seção Escalas e rolar o painel até a Vanderbilt.

### MENOR

**F9 · MENOR · P1/P2. Linha da alergia quebra começando por "·".**
- Onde: 1440 e 1366, com 4 alergias (em memória).
- Evidência: a pílula mostra "Dipirona · Amoxicilina com clavulanato · Látex" e, na linha seguinte, "· Ibuprofeno", com o separador abrindo a linha.
- O que deveria acontecer: o separador fica no fim da linha de cima, ou cada alergia vai como item sem quebra interna.

**F10 · MENOR · P1. Abaixo de 1440 o busto encolhe no palco.**
- Evidência: o busto ocupa 70% da altura do palco a 1366, 61–67% a 1180 e **48%** a 1024 (269 de 556 px), com cerca de 140 px vazios acima e abaixo. A 1920, o arco de camadas fica ≈150 px à esquerda da cabeça, desconectado do modelo (`02-dobra-1920.png`).
- O que deveria acontecer: o enquadramento acompanha a altura do palco em todas as larguras.

**F11 · MENOR · P3. No celular, o cabeçalho do painel come cerca de 39% da tela.**
- Onde: 390×844, qualquer `?secao=`.
- Evidência: barra do topo (64) + cabeçalho do painel (120) + pílula "Sem desfecho" fazem o título da seção começar em y ≈ 330 de 844 (`43-celular-painel.png`).
- O que deveria acontecer: o cabeçalho encolhe ao rolar, ou as pílulas de alerta, fora a alergia, ficam no corpo da seção.

**F12 · MENOR · P2. O vidro da pasta é opaco.**
- Evidência: `gf-tint` vai de alfa 0,70 a 0,97 sobre `blur(22px)`. As folhas que estão atrás da frente (a ≈ 961–1044 da frente) não aparecem; só a borda de cima delas aparece (`20-pastas.png`).
- O que deveria acontecer: frente translúcida, com as folhas aparecendo esfumadas através do vidro, como na referência.

**F13 · MENOR · P1. Zoom e vistas degradam o modelo.**
- Evidência: no zoom máximo, o plexo vira triângulos grandes e esparsos, e o cérebro perde o detalhe. Na vista "Topo", os ombros viram uma elipse em volta da cabeça e não dá para ler o que é aquilo. No hover do crânio, ele vira um bloco grafite opaco que esconde o cérebro e passa a ser o objeto mais pesado da tela.
- O que deveria acontecer: limitar o zoom máximo à densidade da malha, e na vista de topo esconder ou recortar o tórax.

**F14 · MENOR · P2. Meta do cabeçalho quebra desalinhada.**
- Onde: 1280×800 (`40-1280.png`).
- Evidência: a segunda linha da meta ("G40.9 F90.0") começa ≈12 px à direita do início da primeira ("12a 7m").
- O que deveria acontecer: a quebra alinha com a primeira linha.

**F15 · MENOR · P3. A barra de seções é cortada sem indicar que rola.**
- Onde: 1180 e 1024.
- Evidência: o texto "Consentimentos" chega cortado ("Consentim…") num fade à direita, sem seta nem sombra que avise que a barra rola (`40b-1180.png`).

**F16 · MENOR · P4. Controles fora da linha de base da faixa.**
- Evidência: bases a 838 e 842, centros a 814 e 820 (M7).
- O que deveria acontecer: cápsula e botão com a mesma altura, ou centralizados no mesmo eixo.

**F17 · MENOR · P2. Breadcrumb com nome longo desalinha no celular.**
- Onde: 390, nome de 68 caracteres (em memória).
- Evidência: "Pacientes" fica na primeira linha, e o nome quebra em 2 linhas com o chevron desalinhado. O h1 vai a 5 linhas (176 px).

**F18 · MENOR · P1. A base do coração some atrás da cápsula da faixa.**
- Evidência: no hover do coração a 1440, o ápice desce para baixo da cápsula "07 out 2026". O vidro da cápsula só tinge 7 níveis de vermelho (232,228,231 contra 225,225,230): na prática a ponta do órgão fica escondida.
- O que deveria acontecer: o enquadramento inicial deixa o coração inteiro acima da faixa.

## 5. Suspeitas (não confirmadas)

- **S1.** Clicar no ponto onde o hover acusou "Coração" a 1366, 1280 e 1920 não abriu o popover (3 de 3), e a 1440 abriu. Pode ser só atraso do rótulo durante a varredura. Para confirmar: a 1366, passar o mouse no peito até aparecer "Coração", esperar 300 ms e clicar no mesmo ponto.
- **S2.** O popover a 1920 para o Cerebelo abre em (968,754), perto da faixa e a ≈200 px da estrutura, com uma linha-guia longa. Ele pode encostar na faixa com mais consultas. Para confirmar: repetir com 5 consultas em memória.
- **S3.** Clicar na pasta (`gf-hit`) só abre o leque e não navega. Se o dono espera que abra a prévia, isso é defeito de fluxo, não de acabamento. Para confirmar: perguntar ao dono.

## 6. O que vi nas capturas extras

- Hover em frontal, parietal e temporal esquerdos, cerebelo, tronco encefálico, mandíbula, crânio, coluna cervical, coração e artérias: uma estrutura sólida por vez, com o plexo por cima e o resto recuado. As artérias aparecem em dois trechos separados (pescoço e arco aórtico) com um vão no meio.
- Pela lista de teclado (30 estruturas): o hipocampo, o tálamo e a medula acendem de dentro do crânio e leem bem. A lista de estruturas fica sobre o lado direito da cabeça (822–1018 × 392–622) e cobre o lobo parietal quando ele é o selecionado.
- Vistas: Frente e Lateral leem bem, Topo não (F13). Ao girar, o modelo responde sem quebrar. Ao desligar camadas, o cérebro fica mais saturado sem o crânio.
- Painéis a 1440: as 8 seções abrem cobrindo o palco e a coluna direita, com o cabeçalho de vidro e a alergia visíveis, e o texto legível. Não há fade na rolagem: o conteúdo é cortado seco na borda do cabeçalho. Em Documentos, o estado vazio é honesto e oferece "Emitir o primeiro".
- Painéis a 390: a ordem é cabeçalho → alergia → sem desfecho → seção. Na legenda da faixa das Escalas, os rótulos se hifenizam em 3 linhas ("parcial-mente"), apertado.
- Modais (abertos e fechados com Esc): adendo, suspender, emitir (tela cheia com prévia do papel timbrado), remarcar e prévia de exame. Todos mostram a alergia no topo, e nenhum defeito visual foi encontrado.

## 7. Contagem

BLOQUEIA 0 · GRAVE 8 (F1–F8) · MENOR 10 (F9–F18) · suspeitas 3.
