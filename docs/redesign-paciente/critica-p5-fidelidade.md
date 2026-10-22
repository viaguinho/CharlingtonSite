# Crítica de fidelidade, passada 5: prontuário do paciente

Crítico: fidelidade e acabamento (opus), com contexto limpo. Não li críticas anteriores, `design-loop.md` nem o código da página. Julguei pela tela.
Data: 22/10/2026. Rota de teste: `#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3` (Clara Macedo Farias) e, a 1366×768, a de Rafael Siqueira Bastos.

## Método

1. Régua: os 7 mecanismos de `bar.md`, mais o guia §0 e §2. Consultei §1, §4.5 e §4.6 só para separar defeito de decisão do dono.
2. Material: as 27 capturas em `.claude/design-loop/shots/prontuario-p5/`, todas em 1:1 (coordenadas abaixo em px da captura), e `medidas-1440.json` / `medidas-390.json`.
3. Ampliei recortes (×2 a ×4) do crânio, do cerebelo em hover, do lobo frontal selecionado, do ombro, dos alertas, da faixa de consultas, das pastas, das escalas, da trilha e das bordas cortadas a 1180, 1024 e 1366.
4. Medições extras pelo `cdp.mjs`, todas salvas no scratchpad:
   - lista dos botões do palco a 1440×900. A cápsula "Retorno em 25/08/2026, Faltou" existe em x 481, y 790;
   - material calculado das pílulas de alerta e dos controles;
   - amostragem de pixel e desvio-padrão do fundo do painel de seção;
   - contagem de pixels vermelhos dentro do modelo;
   - duas capturas com clique em "Coração" e "Vasos". Nenhuma mudou a tela, então não usei esse estado como evidência.
5. Referência: abri a página do Dribbble 27474777 no navegador e comparei a composição, a malha, as pastas e a base do palco. Não baixei nada.

## Os 7 mecanismos

| # | Mecanismo | Veredito | Evidência |
|---|---|---|---|
| 1 | A anatomia é o maior objeto | **PASSA** | Palco com 576 px, 40% de 1440 e 44% da largura útil (`medidas-1440.json`). Busto de y≈365 a y≈840 num palco de 600 px, cerca de 79% (`01`). O palco não tem moldura e fica sobre a mesa pontilhada. As colunas são cards flutuantes. A 1920 o busto ocupa cerca de 82% (`02`). |
| 2 | Plexo legível, uma estrutura por vez | **FALHA** | Em repouso as linhas não passam de 1 px e não há área sólida. Mas os nós só aparecem no cérebro e na coluna. A pele e o ombro não têm nó nenhum (`01`, região 520–1000 × 600–800). O cérebro é um emaranhado de cordas longas que atravessam o volume, e não uma malha de superfície (`01`, 620–860 × 360–560). Em seleção, a estrutura fica sólida e única, as outras recuam e o azul do cérebro some. Só que o plexo por cima da estrutura sólida quase não aparece: há sombreado de facetas e 2 ou 3 nós na borda (`15`, 655–790 × 380–500; `11`, 690–810 × 475–545). |
| 3 | Card de medida no padrão do biomarcador | **PASSA** | Número de 52 px contra título de 14 px (3,7×), peso 300. A unidade "/54" é menor, mais clara e colada ao número. Traço de 2 px âmbar ou verde antes do título. Gráfico de pontos com faixa tingida, linha-limite e último ponto com anel. Rodapé com no máximo 2 linhas (`01`, 1056–1416 × 320–612). |
| 4 | Um acento só | **PASSA** | Na dobra a 1440, o azul preenchido aparece só no traço de "Hoje" e no tom do cérebro. A pílula ativa é tinta escura, por decisão do dono. O azul de "Ver todas" e "7 arquivos" é texto de link, não preenchimento. Vermelho, âmbar e verde aparecem só como estado: faixa de risco, ponto fora da faixa, "Sem desfecho", "Faltou". |
| 5 | Tudo que flutua sobre o palco é vidro | **FALHA** | Cápsulas, controles, popover e barra de seções são vidro. A pílula **Alergias**, porém, sai opaca: o pixel (575, 300) e o (530, 338) dão #FFFFFF puro, enquanto a vizinha "Sem desfecho" dá (241, 242, 246) e o fundo do palco ao lado dá (235, 242, 249) (`01`). O CSS calculado das duas é idêntico (`rgba(240,240,244,.72)` + `blur(24px)`), mas na tela uma é papel e a outra é vidro. |
| 6 | A pasta é o herói do card de exames | **PASSA** | A pasta ocupa cerca de 88% da largura do card, tem aba, as folhas saem em leque atrás (miniaturas reais), o rótulo "3 arquivos" fica sobre a frente fosca e título e data estão no topo com `↗` (`03`, 100–440 × 815–1260; `21`, em leque no hover). |
| 7 | Base do palco em faixa única | **PASSA** (com ressalva, ver defeito 3) | Fileira de cápsulas com 3 itens (data, ponto, estado), traço fino de "Hoje", e `+ − 3D` quadrados de vidro no canto inferior direito, alinhados à mesma linha (centro y≈820, `01`). |

Resultado: 5 de 7.

## Comparação cega com a referência

Comparei as duas telas sem olhar os rótulos, como faria quem as vê pela primeira vez.

- **Composição:** empate técnico. As 3 colunas sobre um palco, a barra em pílulas e a base com cápsulas e controles estão no mesmo lugar e na mesma hierarquia. A 1920 a nossa respira melhor que a referência.
- **Cards de medida:** os nossos chegam muito perto. Mesmo número fino, mesmo traço, mesmo gráfico de pontos com anel. Fica atrás por um detalhe de semântica (defeito 9).
- **Pastas:** perto, até mais legíveis, porque mostram a miniatura real. As folhas pretas pesam no tema claro, mas são o exame de verdade.
- **O corpo:** aqui a referência ganha por muito. Lá a malha é uma superfície triangulada e luminosa, com nós em todo vértice. Lê-se úmero, costelas e pulmão. Quando acende, a estrutura vira um objeto sólido com textura e a malha branca continua visível por cima. Aqui, em repouso, o cérebro parece um novelo azul e o resto do busto é uma névoa cinza sem nós. Quando acende, sai um recorte azul chapado. É o objeto que a régua diz ser o maior da tela, e é onde está a maior distância.
- **Painel de seção:** a referência não tem esse estado, mas o guia pede vidro com o palco desfocado atrás. Saiu uma placa cinza chapada, que destoa do resto (defeito 2).

**Nota: 7,0 / 10** em fidelidade. A estrutura e os cards estão em nível de referência. O corpo e o painel estão um degrau abaixo.

## Veredito por peça

| Peça | Veredito | Maior lacuna |
|---|---|---|
| **P1 Palco anatômico** | **REPROVA** | O plexo não lê como anatomia: o cérebro vira novelo, a pele e o ombro não têm nós, e na seleção a estrutura fica chapada sem o plexo por cima (mecanismo 2). Além disso, uma cápsula de consulta real fica invisível a 1440. |
| **P2 Colunas** | **APROVA** | As pastas, o herói do card de exames, ficam abaixo da dobra a 1440: só os títulos aparecem (y 815–900). |
| **P3 Navegação e seções** | **REPROVA** | O painel das 8 seções é uma placa cinza opaca e chapada (desvio-padrão de 0,0 a 0,6 no fundo), sem o palco desfocado atrás que o §1 e o §4.5 pedem. |

## Defeitos, do mais grave ao menor

### 1. [P1] O plexo não lê como anatomia, e a seleção sai sem plexo por cima
- **Evidência:**
  - `01-dobra-1440.png`, 620–860 × 360–560: o cérebro é feito de segmentos longos que cruzam o volume de lado a lado. Não há sulcos, hemisférios nem superfície. Os nós são poucas dezenas de anéis soltos.
  - `01`, 520–1000 × 600–800: a pele do pescoço e dos ombros tem linhas, mas nenhum nó nos vértices.
  - `15-lista-teclado.png`, 655–790 × 380–500, e `11-hover-cerebelo.png`, 690–810 × 475–545: a estrutura selecionada é um recorte azul sólido, com facetas, e quase nenhuma linha do plexo por cima.
  - Na referência, a malha branca continua nítida sobre a clavícula amarela e o pulmão vermelho.
- **Correção:**
  - Desenhar a malha da superfície (arestas dos triângulos da própria malha, sem ligar vértices distantes) e limitar o comprimento das arestas mostradas.
  - Pôr nós (pontos de 1,5 a 2 px a cerca de 35% de tinta) em uma fração fixa dos vértices de **todas** as camadas, inclusive pele e crânio.
  - Na estrutura em foco, desenhar o plexo dela por cima do sólido, com `depthTest` relaxado ou um pequeno deslocamento de polígono, em tinta clara a 50–60%, para a textura de malha continuar visível.

### 2. [P3] O painel de seção é uma placa cinza opaca e não mostra o palco desfocado
- **Evidência:**
  - `30-painel-evolucoes.png`: o fundo do painel dá luminância 240–241, com desvio-padrão de 0,38 em 1000–1400 × 560–800 e 0,0 em 470–1400 × 360–380.
  - Não sobra nenhum vestígio do busto nem da aurora azul que o palco tem nesse lugar (o palco varia de 229 a 249).
  - O cinza (239, 240, 244) é mais escuro que os cards brancos da coluna esquerda ao lado, e o painel parece de outro material. O mesmo acontece nas 8 seções (`30-painel-*.png`).
- **Correção:**
  - Deixar o palco visível atrás, pausado e desfocado: o último quadro do canvas com `filter: blur(…)` e escurecimento leve.
  - Baixar a opacidade do vidro do painel para que esse quadro apareça como borrão de cor.
  - Clarear o tom do vidro para ficar no mesmo branco dos cards.

### 3. [P1] Consulta real invisível na faixa, mas ainda focável
- **Evidência:**
  - A 1440 existe o botão "Retorno em 25/08/2026, Faltou" em x 481, y 790 (medição DOM), mas a captura `01` (recorte 440–580 × 770–850) mostra só fundo. A cápsula está apagada pela máscara de borda.
  - A 1920 ela aparece (`02`, 815–890 × 975–1015).
  - A 1180 só "07 out 2026" sobra (`40b`, 475–595 × 715–765). No celular também sobra uma só (`42`).
  - Quem navega por teclado cai num alvo invisível, e quem olha não sabe que existe uma falta registrada.
- **Correção:**
  - Não deixar a máscara zerar uma cápsula inteira. Ou ela aparece pelo menos com 40% de opacidade, ou sai do fluxo e entra um contador "+1 anterior" à esquerda, focável, que rola a faixa.
  - A faixa deve rolar na horizontal com o mesmo apagamento usado na barra de seções.

### 4. [P1] Alertas cortados no meio da frase e ação "Remarcar" fora da vista
- **Evidência:**
  - `40c-1366x768-2alertas.png`, 790–990 × 300–340: o título do alerta sai como "Sem consentimento par", apagado no meio da palavra. Não dá para saber para quê.
  - `40b-1180.png`, 555–800 × 320–370: a pílula "Sem desfecho" perde o botão "Remarcar", que a 1280 está lá (`40`, 790–870 × 345).
  - `42-celular.png`, 140–390 × 390–435: a mesma pílula é cortada na borda da tela.
- **Correção:**
  - Alertas não podem ser cortados por máscara. Abaixo de uma largura mínima, quebrar em 2 linhas com o título inteiro, ou empilhar as pílulas.
  - Manter "Remarcar" sempre visível. No pior caso, só o ícone, com rótulo acessível.

### 5. [P1] A pílula de alergia é opaca entre vidros
- **Evidência:** `01`, pixel (575, 300) = (255, 255, 255), contra (241, 242, 246) da pílula ao lado e (235, 242, 249) do palco. Visualmente, uma pílula é papel branco e a outra é vidro (`01`, 478–588 × 295–345 contra 598–920 × 295–345). O mesmo aparece em `10`, `11`, `12`, `13`, `14` e `15`.
- **Correção:** tirar a camada branca que está por baixo ou dentro da pílula de alergia. Se a intenção for destacar a alergia, usar o mesmo vidro com o tom de perigo no ícone e no título, que já existe, e não um fundo sólido.

### 6. [P2] As pastas ficam abaixo da dobra a 1440 × 900
- **Evidência:** `01`, 100–440 × 815–900: só aparecem "Imagem 30/09/2026 ↗" e "Neurofisiológico 05/09/2026 ↗". A pasta, que é o herói do mecanismo 6, começa abaixo de y 900. Na referência as pastas fazem parte da primeira leitura.
- **Correção:** encurtar o card de perfil, que tem cerca de 110 px de folga entre "Mãe · (19)…" e a trilha. Uma alternativa é levar "Diagnósticos ativos" para uma linha compacta dentro do perfil. A meta é que a pasta apareça pelo menos até o rótulo "3 arquivos" a 1440 × 900.

### 7. [P1] A lista de estruturas por teclado cobre metade do crânio
- **Evidência:** `15-lista-teclado.png`, a lista ocupa 816–1024 × 368–632, por cima da metade direita da cabeça, enquanto o palco tem área livre em 860–1036 × 640–780 e à esquerda do seletor radial.
- **Correção:** ancorar a lista na borda direita do palco, fora da silhueta do busto, ou abaixo do seletor radial, à esquerda. Um recuo de 24 px para dentro do palco basta para ela não cobrir o modelo.

### 8. [P2] A trilha de acompanhamento é rala e o rótulo "1 consulta" engana
- **Evidência:** `01`, 120–420 × 545–560: são 4 marcas de 6 a 12 px numa linha pontilhada de 300 px, que de longe parece vazia. O rótulo diz "1 consulta", mas a faixa do palco mostra 3 (Faltou, Concluído, Sem desfecho) e o rodapé diz "1 falta · 1 sem desfecho". Na referência, a trilha é uma série densa de traços com comprimentos variados.
- **Correção:** dar comprimento proporcional a cada marca (por exemplo, o intervalo até a consulta seguinte), engrossar para 3 px e trocar o rótulo para "3 consultas · 1 concluída".

### 9. [P2] O gráfico do SNAP-IV pinta só um dos pontos fora da faixa
- **Evidência:** `01`, 1072–1214 × 495–545: os pontos 2 e 3 estão acima da linha-limite, fora da faixa tingida, mas saem cinza. Só o primeiro sai vermelho. Na referência, o ponto fora da faixa é o que muda de cor.
- **Correção:** usar a mesma regra para todo ponto além do limite (cor de estado), ou desenhar a faixa até o limite clínico real que separa o vermelho do cinza.

### 10. [P3] Manchas cinza no painel em tela cheia do celular
- **Evidência:** `43-celular-painel.png`, 230–390 × 240–400: dois borrões cinza atrás do título "Evoluções clínicas", que parecem sujeira.
- **Correção:** no modo tela cheia, esconder o canvas e os elementos do palco atrás do painel, ou trocar o borrão por um fundo liso.

### 11. [P2] Os cards de marcos ficam apertados a 1024
- **Evidência:** `41b-1024-medicacoes.png`, 795–885 × 520–545: "Emergentes" encosta na borda direita do mini-card. O traço vermelho de "Atrasados", presente a 1440 (`03`, 1307 × 1210), some (`41b`, 900 × 531).
- **Correção:** abaixo de 1180, reduzir o padding lateral dos mini-cards ou empilhar o rótulo. Manter o traço de estado em todas as larguras.

### 12. [P1] O seletor radial se descola do busto a 1024 e encosta no ombro a 1280
- **Evidência:**
  - `41-1024.png`: o arco e os ícones ficam em 370–485 × 670–910, à altura do pescoço e ombro, longe da cabeça (360–700) que ele controla.
  - `40-1280.png`, 445–520 × 590–680: os ícones de coluna e coração caem sobre o plexo do ombro esquerdo.
- **Correção:** ancorar o seletor ao terço superior do palco, com a mesma distância vertical da cabeça em todas as larguras, e garantir 24 px livres entre o ícone mais externo e a silhueta.

### Observação (não é defeito demonstrável)
Em nenhuma captura de repouso há pixel vermelho dentro do modelo: a contagem em `01`, `02`, `13` e `14` deu 0. Não consegui acender o coração (o clique em "Coração" e em "Vasos" não mudou a tela), então não posso afirmar que o vermelho do coração e das artérias funciona. A 1440, a região do coração (≈ 720–790 × 750–800) fica atrás das cápsulas da faixa. Vale o construtor anexar uma captura do coração em foco na próxima passada.

## O que está certo e não pode regredir

- O palco sem moldura sobre a mesa pontilhada, com 40–44% da largura e o busto preenchendo cerca de 80% da altura. A 1920 é a melhor tela do conjunto.
- Os cards de escala: número de 52 px em peso 300, unidade menor e clara, traço de 2 px no tom do risco, gráfico de pontos com faixa, linha-limite e anel no último ponto, rodapé curto.
- A faixa da base: cápsulas de vidro com 3 itens, traço fino de "Hoje", e `+ − 3D` quadrados de vidro na mesma linha.
- A seleção de uma estrutura por vez, com as outras recuadas, o pino com anel e o rótulo em pílula (`10`, `11`). O popover claro com "Relacionado ao paciente" e as contagens reais de exames (`12`).
- As pastas com aba, frente fosca, miniaturas reais em leque, rótulo de contagem no vidro e `+` de envio (`20`, `21`).
- A pílula ativa em tinta escura e a barra de seções em vidro com apagamento na borda quando rola.
- A alergia visível em todas as larguras: no palco, no cabeçalho do painel, na barra grudada a 1024 e no celular.
- O painel que cobre o palco e a coluna direita e deixa o perfil à vista. No celular ele vira tela cheia.
- Os estados vazios honestos e com ação ("Aplicar escala", "Registrar"), sem dado inventado (`40c`).
- Os dados todos reais: nenhum biomarcador, peso ou "idade biológica" fictício.
- O responsivo segue o §4.6 nas 4 larguras, sem rolagem lateral (`medidas-*.json`).
- O crédito do modelo (BodyParts3D / HRA, CC BY 4.0) no canto do palco, abreviado nas larguras menores.
