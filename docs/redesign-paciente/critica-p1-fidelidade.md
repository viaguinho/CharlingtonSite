# Crítica de fidelidade — prontuário, passada 1

Julgamento só da tela renderizada (capturas em `.claude/design-loop/shots/prontuario-p1/`) contra a referência Quantis (8 imagens) e a régua `bar.md`. Nenhum arquivo de código foi aberto.

**Placar da régua: 0 de 7 passam.**

---

## 1. Os 7 mecanismos

### 1. A anatomia é o maior objeto da tela — FALHA
- Largura: o palco tem 576 px a 1440, ou seja 40,0 % (`medidas-1440.json`). Passa, mas exatamente no limite. A cabeça em si tem cerca de 265 px (18 % da largura). Na referência o tronco ocupa cerca de 38 % da tela.
- Altura: no 01 o busto vai de y≈350 até o corte do palco em y=880, cerca de 88 % dos 600 px. Passa no número, mas só porque conta ombros que praticamente não se veem. Na região do pescoço e do tronco, a luminância mediana é 221 contra 229 do fundo, uma diferença de 8 níveis em 255. Os ombros só aparecem com o contraste realçado.
- Moldura: falha. Com a página rolada (20, 22), a 1024 (41) e na página inteira (03), o palco mostra um retângulo próprio, mais liso e claro que a mesa granulada. A borda inferior é reta e corta o tronco e o coração (22: corte em y≈680, com a base vermelha do coração decepada). Abaixo dele fica um vazio. Na referência o modelo some no fundo sem nenhuma aresta.
- As colunas laterais flutuam como cards: passa.

### 2. Plexo legível, uma estrutura por vez — FALHA
- Em repouso (01, 02), o cérebro é uma nuvem azul de milhares de nós, com arestas de 3 a 8 px. Com o contraste realçado, vira uma mancha sólida. Isso é ruído pontilhado, não um plexo. A referência tem triângulos grandes (20 a 60 px), nós brilhantes nos vértices e geometria que se consegue ler.
- Em repouso o cérebro já está azul. Sem nada em foco, já existe uma área colorida dominante.
- Hover (10): o temporal fica sólido, com as linhas por cima, e o resto clareia. Isso funciona. Mas o foco é azul sobre azul, então o recuo das demais estruturas é fraco. Na referência o amarelo e o vermelho saem de um plexo cinza.
- 11-hover-cerebelo mostra de novo "Temporal esquerdo", a mesma forma do 10, só com o marcador mais baixo. A captura do cerebelo não mostra o cerebelo.

### 3. Card de medida no padrão do biomarcador — FALHA
- Número de 52 px contra título de 14 px: 3,7×. Passa. O peso é fino e passa. A unidade "/54" é menor, mais clara e colada ao número: passa. O traço vertical colorido de 2 px está lá: passa.
- O gráfico é uma tira de cerca de 20 px de altura com 1 a 4 pontos quase alinhados (SNAP-IV 4, Vanderbilt 2, M-CHAT 1). Lê-se como barra de progresso, não como dispersão. O M-CHAT não tem linha-limite.
- Rodapé: o SNAP-IV ocupa 3 linhas ("Sintomas significativos" + "Aplicada há 20 dias · 4 aplicações" quebrada em duas) e o Vanderbilt ocupa 4, a 1440 e a 1920. A régua pede no máximo 2 linhas curtas.

### 4. Um acento só — FALHA
- Azul preenchido na dobra do 01: pílula ativa, item ativo do dock, dois marcadores de diagnóstico, quatro pontos e o anel do arco de camadas, ponto do "Confirmado", traço do "Hoje" e o cérebro inteiro em repouso. O `medidas-1440.json` lista 5 elementos.
- Não existe pílula de "próxima consulta" em nenhuma captura.
- Azul usado como enfeite: o fundo das pastas Imagem e Neurofisiológico é uma textura azul líquida e abstrata (20, 03, 41). Os ícones de medicação também ficam em círculos azuis (02, 22).

### 5. Tudo que flutua sobre o palco é vidro — FALHA
- O popover (12) é vidro de verdade: o azul do cérebro aparece desfocado do lado esquerdo. Os alertas e as cápsulas são foscos, mas tão densos que só se nota uma leve tinta azul quando passam sobre o cérebro (01, alerta "Sem desfecho").
- A barra de seções fixada no topo (20, 22) é opaca. A linha "Funciona Fone abafador…" do perfil some atrás dela sem nenhum vestígio desfocado.
- A barra também para a cerca de 30 px do topo: o conteúdo ("Acompanhamento 1 consulta", "Perfil sensorial") rola visível acima dela, e ela fica por cima do card do SNAP-IV.
- Os cards, com raio de cerca de 28 px e sem borda visível, passam.

### 6. A pasta é o herói do card de exames — FALHA
- A pasta ocupa cerca de 85 % da largura do card, tem aba, frente fosca e a contagem "3 arquivos" sobre o vidro. Título, data e ↗ estão no topo. Até aqui passa.
- Em repouso não há leque de folhas. Atrás da Imagem há textura azul abstrata. O leque só aparece aberto (21), e com rótulos truncados no meio da palavra ("TC d", "RM d", "RM de crâ"). Na referência as folhas são miniaturas de exame, sem texto, em leque desde o repouso.
- Entre a data e a pasta sobram cerca de 65 px vazios.
- O terceiro card (Pareceres) fica sozinho na linha e deixa um buraco à direita (03, 22, 41).
- A 1440 as pastas ficam abaixo da dobra. A 1920 começam em y≈845 e são cortadas pela dobra. Na referência elas estão na primeira vista.

### 7. Base do palco em faixa única — FALHA
- Funciona: fileira de cápsulas com no máximo 3 itens de texto, marcador "Hoje" e + − à direita quase na mesma linha de base (cerca de 4 px de diferença a 1440).
- Não é faixa única: o crédito "Modelos 3D: … CC BY 4.0, modificados" é uma segunda faixa de vidro do tamanho de um componente. A 1440 quebra em duas linhas, com "modificados" sozinho (01, 03, 20, 22).
- A 1440 a primeira cápsula está cortada no meio do ícone (01).
- No celular (42), a cápsula "Confirmado" cobre os botões + e −, e "Hoje" fica sobre o botão de vista.
- O rótulo "¾" do botão de vista não se entende. A referência usa "3D".

---

## 2. Comparação cega (02-dobra-1920 contra 48076259)

**A referência é melhor como peça de design, com folga.** Nela o corpo vai da barra do topo até a borda de baixo, e cards, alertas, popover e linha do tempo giram em volta dele. O corpo tem várias camadas: osso em textura de raio X, plexo de triângulos grandes com nós brilhantes e órgãos coloridos com volume. O olho vai direto a ele.

Na nossa tela, a 1920 o cabeçalho (breadcrumb, nome, meta, botões, pílulas) ocupa os primeiros cerca de 230 px. O modelo começa em y≈320 e é uma cabeça pálida de pontinhos. O tronco quase não existe. O peso visual fica dividido com o card de perfil e com os cards de escala, que têm mais contraste que o próprio modelo.

**A maior lacuna: o modelo anatômico não tem matéria nem contraste.** O cérebro é ruído azul, o crânio e o tronco quase não se distinguem do fundo (diferença de cerca de 8 níveis de luminância) e não há volume nem estrutura legível. O herói não sustenta a tela.

---

## 3. Veredito por peça

| Peça | Veredito | Maior lacuna |
|---|---|---|
| **P1 Palco anatômico** | **REPROVA** | O busto não tem presença: o cérebro é uma nuvem densa e azul já em repouso, o tronco é praticamente invisível e o palco revela um retângulo com borda reta que corta o tronco. Problemas menores: o hover no cerebelo cai no temporal, o popover cobre o alerta e o seletor de camadas, e a base tem duas faixas e uma cápsula cortada. |
| **P2 Colunas** | **REPROVA** | O card de perfil é alto e cheio de texto (cerca de 580 px a 1440) e empurra as pastas de exame, a assinatura da referência, para fora da primeira dobra a 1440 e a 1920. Problemas menores: pastas sem leque e com arte azul decorativa, Pareceres órfão, gráficos de escala em tira de 20 px, rodapés de 3 a 4 linhas, e a "próxima consulta" não aparece. |
| **P3 Navegação e seções** | **REPROVA** | Abrir uma seção troca o palco e a coluna direita por um cartão branco genérico de lista (30-*): a anatomia desaparece e o vocabulário da referência some. Na referência, as pílulas filtram os cards em volta de um modelo que fica sempre na tela. Problemas menores: a barra fixa é opaca e fatia o conteúdo, as pílulas são cortadas a 1024 ("C" de Consentimentos) e o "Voltar à visão geral" colide com a barra do topo no celular (43). |

---

## 4. Defeitos concretos (do mais grave ao menor)

1. **O modelo não se sustenta** (01, 02, 03)
   - O que acontece: o cérebro em repouso é uma massa azul de pontos com arestas de 3 a 8 px. Pescoço e tronco ficam com luminância 221 contra 229 do fundo.
   - Por que fere: mecanismos 1 e 2. A referência tem plexo de triângulos grandes, nós brilhantes e estrutura com volume.
   - Direção: plexo com bem menos nós e arestas longas (15 a 40 px a 1440). Uma camada estrutural com sombreamento tonal embaixo do plexo, para que crânio e tronco se leiam em silhouette no contraste normal. Em repouso, tudo neutro (cinza grafite sobre o claro), com cor só na estrutura em foco.

2. **O cabeçalho empurra o herói para baixo** (01, 40-1280)
   - O que acontece: o palco começa em y=280 de 900 (31 %). A 1280×800 o cabeçalho vai até y≈380 (47 %), a linha de meta quebra com "F90.0" sozinho e os controles do palco ficam cortados pela dobra.
   - Por que fere: mecanismo 1 e a composição da referência, em que a barra do topo é uma única fileira e o crânio sobe até a altura do nome.
   - Direção: cabeçalho em uma faixa só (voltar + nome + ID sobre a coluna esquerda, pílulas na mesma linha ou logo abaixo), com o modelo subindo até o topo da área de conteúdo, ao lado do nome. A meta nunca deve quebrar com item órfão.

3. **O palco tem caixa visível com corte reto** (20, 22, 41, 03)
   - O que acontece: o canvas tem fundo próprio, mais liso que a mesa granulada. A borda inferior reta corta tronco e coração e, com a página rolada, a caixa paira sobre um vazio.
   - Por que fere: mecanismo 1 ("sem moldura nem fundo de card").
   - Direção: o modelo deve se dissolver no fundo com máscara suave, sem nenhuma aresta e sem órgão cortado. Ao rolar, o palco não deve deixar um retângulo boiando.

4. **A barra de seções fixa é opaca e fatia o conteúdo** (20, 22)
   - O que acontece: o conteúdo rola visível acima da barra (uma faixa de cerca de 30 px). A barra esconde linhas inteiras do perfil sem desfoque e passa por cima do card do SNAP-IV.
   - Por que fere: mecanismo 5.
   - Direção: barra encostada no topo, em vidro onde o conteúdo de trás aparece desfocado, sem conteúdo nítido acima dela.

5. **A base do palco é poluída e colide** (01, 03, 42)
   - O que acontece: a primeira cápsula está cortada no meio do ícone. O crédito forma uma segunda faixa de vidro, em duas linhas com "modificados" órfão. No celular, a cápsula "Confirmado" cobre + e − e "Hoje" cai sobre o "¾", que já é ilegível como rótulo.
   - Por que fere: mecanismo 7.
   - Direção: uma faixa só, com cápsulas e controles na mesma linha de base e nada cortado no meio (esmaecer a borda ou começar numa cápsula inteira). Crédito em uma linha mínima e discreta, fora da faixa ou atrás de um botão "i". Botão de vista com rótulo claro ("3D" ou "Vista"). Sem sobreposição em nenhuma largura.

6. **Pastas fora da dobra, sem leque e com arte azul** (01, 02, 20, 21, 03)
   - O que acontece: as pastas não aparecem na primeira vista a 1440 nem a 1920. Em repouso, o fundo da pasta é textura azul abstrata e o leque só surge ao abrir, com rótulos truncados ("TC d", "RM de crâ"). Pareceres fica órfão e sobram cerca de 65 px vazios acima de cada pasta.
   - Por que fere: mecanismos 4 e 6.
   - Direção: compactar o perfil para que as pastas entrem na primeira dobra. Folhas em leque desde o repouso, como miniaturas neutras de exame sem texto. Grade sem card órfão. Pasta subindo para perto do título.

7. **Os gráficos das escalas parecem barra de progresso** (01, crop dos cards)
   - O que acontece: faixa tingida de cerca de 20 px com 1 a 4 pontos quase colineares. O M-CHAT não tem linha-limite e tem cerca de 80 px de vazio entre o número e o gráfico. Os rodapés têm 3 a 4 linhas.
   - Por que fere: mecanismo 3.
   - Direção: a faixa deve ocupar cerca de 25 a 30 % da altura do card, com pontos espalhados em relação à linha-limite, linha-limite sempre presente e anel no último ponto. Rodapé com uma frase de estado e uma linha curta de metadado.

8. **O azul vaza para fora do lugar** (01, 02, 22)
   - O que acontece: marcadores de diagnóstico, pontos do arco de camadas, ícones de medicação, arte das pastas e o cérebro em repouso estão em azul. Não existe pílula de próxima consulta.
   - Por que fere: mecanismo 4.
   - Direção: esses elementos em neutro. Azul só em três lugares: pílula ativa, pílula da próxima consulta (que precisa existir na faixa) e estrutura em foco.

9. **Interação no modelo com falhas** (11, 12, 15)
   - O que acontece: o hover no cerebelo seleciona o temporal. O popover (cerca de 350×330 px) cobre o alerta "Sem desfecho", o seletor de camadas e quase todo o cérebro, e usa parágrafo enciclopédico sem chip de estado. A lista por teclado cobre o rótulo do hover ("Fro…").
   - Por que fere: mecanismo 2 e o popover da referência, que é compacto (título, chip de risco, 3 linhas chave-valor) e fica ao lado da estrutura sem escondê-la.
   - Direção: cada estrutura acessível no hover. Popover ao lado da estrutura, curto, com estado do paciente em pares chave-valor e chip, sem cobrir alertas, controles nem a própria estrutura. Lista sem tampar rótulos.

10. **Painéis de seção genéricos e com erros visíveis** (30-*, 43)
    - O que acontece: a anatomia some. O botão primário flutua cerca de 70 px à esquerda do "Voltar", em outra linha de base. "entro do esperado" aparece cortado no painel de Escalas. Identificadores crus "exame_imagem" e "parecer_fono" aparecem na Linha do tempo. Aparece "1 registros". A visão geral mostra "1 Atrasados" em vermelho, enquanto o painel de Marcos diz que não há pendência. No celular, "Voltar à visão geral" fica sob os ícones da barra do topo.
    - Por que fere: P3 e o princípio da referência de modelo sempre presente.
    - Direção: painel como card de vidro com o modelo ainda visível (reduzido ou deslocado). Ações agrupadas no canto direito na mesma linha de base. Nenhum rótulo cortado, nenhum identificador técnico, plural correto e contagens coerentes entre a visão geral e o painel.

---

Observação: o `medidas-1440.json` aponta contraste de 1,12 no rótulo "Emitir documento". Na tela o rótulo aparece branco sobre preto e legível, então não entrou como defeito.
