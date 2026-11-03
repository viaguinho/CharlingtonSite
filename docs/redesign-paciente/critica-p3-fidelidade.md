# Crítica de fidelidade — passada 3 (última)

> Crítico: fidelidade e acabamento (contexto limpo, sem ler críticas anteriores nem o código).
> Base: `bar.md` (7 mecanismos), `guia.md` §0 e §2, capturas em `.claude/design-loop/shots/prontuario-p3/`, e a referência Quantis (Dribbble 27474777, imagens 48076253, 48076259 e 48076255 vistas pelo CDN).
> Fora de julgamento, por decisão do dono: o dock lateral; o painel de seções cobrindo palco e coluna direita; alertas sem pino; a página neutra + azul, com cores só na anatomia; tema claro.

---

## 1. Os 7 mecanismos

| # | Mecanismo | Veredito | Evidência |
|---|---|---|---|
| 1 | A anatomia é o maior objeto | **FALHA** (por pouco) | Largura: palco de 576 px a 1440, ou 40% da tela e cerca de 42% da largura útil (`medidas-1440.json`). Passa, no limite. Altura: em `01-dobra-1440` o busto vai de y≈380 (topo do crânio) até y≈790, onde some atrás das cápsulas. São ~410 px de um palco de 600 px (y 276→876), **~68%**, abaixo dos 75%. Em `02-dobra-1920` são ~74% (y 405→975 num palco de 780 px). O palco não tem moldura e fica sobre a mesa pontilhada, que aparece de leve no recorte de 1920. Nessa parte, passa. |
| 2 | Plexo legível, uma estrutura por vez | **PASSA** | Em repouso (`01`, `02`), linhas de 1 px, nós visíveis e nenhuma área sólida. No hover (`10-hover-temporal`, `11-hover-cerebelo`), só uma estrutura fica sólida em azul, com pino de anel e rótulo de vidro, e o resto do busto clareia de forma visível. Ressalva: em repouso o cérebro é um novelo escuro sem forma de cérebro, e o coração aparece como uma caixa de arame no peito (`02`, x≈940–1040, y≈870–960). |
| 3 | Card de medida no padrão do biomarcador | **FALHA** | O número de 52 px peso 300 contra o título de 14 px dá 3,7×. Unidade `/54` menor e mais clara, traço de 2 px âmbar/verde, seta de tendência, anel no último ponto e rodapé em 2 linhas: tudo certo. Mas a faixa de referência só funciona no SNAP-IV. No Vanderbilt a faixa bege ocupa a área inteira do gráfico e **não há linha-limite visível**. No M-CHAT-R/F (`01`, `03`) é um **bloco verde-menta com um único anel**, sem linha nem faixa. Na referência (48076259) a faixa é estreita e o gráfico tem uns 40 px de altura. Aqui o gráfico é um retângulo tingido de ~120 px, e é a maior mancha de cor da coluna direita. |
| 4 | Um acento só | **PASSA** | Na dobra de 1440 (`01`), o azul preenchido aparece só no traço "Hoje", no último tique do Acompanhamento e no ícone ativo do dock (fora de escopo). A pílula ativa é de tinta. `azulPreenchidoNaDobra` só lista a amostra da lista oculta e a linha de hoje. Vermelho e âmbar aparecem só como estado (alertas, pontos de status, traços). Ressalva: os blocos bege e verde dos gráficos são estado, mas na prática viram superfície decorativa (ver mecanismo 3). |
| 5 | Tudo que flutua sobre o palco é vidro | **FALHA** | Pílulas de alerta, cápsulas, seletor de camadas e controles são translúcidos (`palco` de `01`). O painel de seções é vidro e mostra o palco desfocado à direita (`30-painel-*`). Mas o **popover** (`12-popover`) tem fundo chapado: desvio-padrão de luminância de 1,2 numa faixa onde o palco atrás tem 6,1. O plexo da face nem escurece o vidro, e só o vazamento azul da borda esquerda parece vidro. A **lista de teclado** (`15-lista-teclado`) é branco opaco (luminância 249, desvio de 0,5) e esconde metade do busto. Raio dos cards de 28 px, sem borda somada a sombra larga. Passa nessa parte. |
| 6 | A pasta é o herói do card de exames | **PASSA** (com ressalvas) | Em `20-pastas` e `02` (recorte a 1920), a pasta fosca ocupa ~88% da largura do card, tem aba e frente de vidro, as folhas saem em leque atrás (as miniaturas reais de RM e EEG em `21-pasta-aberta`), o rótulo "3 arquivos" fica no vidro, e título, data e `↗` ficam no topo. Ressalvas: o rótulo some no Neurofisiológico em `03-pagina-1440` e `41-1024`; a pasta de PDF (Pareceres) mostra folhas brancas sem título nem data. |
| 7 | Base do palco em faixa única | **PASSA** a 1440/1920, **FALHA** a 1280 e 390 | Em `01` e `02`, cápsulas de vidro com 2 itens de texto (data + estado com ponto), traço fino de "Hoje" e `+ − 3D` quadrados de vidro na mesma linha de base. Em `40-1280` os controles sobem para y≈684, acima das cápsulas (y≈748). Em `42-celular` também ficam acima da faixa. |

**Placar: 3 passam, 3 falham e 1 passa só nas larguras da régua.**

---

## 2. Comparação cega: `02-dobra-1920` contra a referência

**O que um observador vê primeiro, sem saber qual é qual.**

- **Referência (48076253):** o corpo é o objeto. O esqueleto branco e luminoso vai da barra do topo até a faixa de exames, com duas estruturas sólidas (ombro amarelo, pulmão vermelho) que puxam o olho na hora. As três colunas encostam no corpo, e a faixa de cápsulas corre centralizada embaixo dele, de borda a borda. Os cards da direita são pequenos e densos, três por linha, com gráficos de linha fina.
- **Nossa a 1920:** o olho vai primeiro para o **nome "Clara Macedo Farias"** e para o **botão preto "Emitir documento"**, depois para os **blocos bege e menta dos gráficos** da direita. Só então chega ao busto. Ele é cinza-claro sobre fundo claro, sem nenhum ponto de cor em repouso, e flutua no meio de um palco de ~1050 px com ~200 px de ar de cada lado. A faixa do topo (migalha, nome, metadados, pílulas) consome **276 px (26% da altura)** antes do palco começar. A faixa de consultas são 3 cápsulas presas à esquerda, e os controles ficam a ~500 px delas, na outra ponta, sem nada no meio.

**Reconhecível como família Quantis?** Sim. Busto em plexo, arco de camadas com nós, pílulas de alerta de vidro, cards de medida com traço de estado e anel, pastas de vidro e faixa de cápsulas com "Hoje": os componentes estão todos lá e bem desenhados.

**Onde ganhamos:** honestidade dos dados (estado vazio real, sem biomarcador inventado), legibilidade em tema claro, popover e painel com conteúdo útil para a família, e pastas com miniatura real. A coluna esquerda é mais clara que a da referência.

**Onde perdemos:** presença e contraste do modelo. Na referência o 3D é o herói. Aqui ele parece um esboço a lápis, e numa comparação cega ganha quem tem o corpo dominante. Perdemos também na coesão da base (a faixa da referência é um trilho único, a nossa é um grupo solto) e na densidade da coluna direita, onde nossos gráficos são grandes e pesam pela cor, não pelo dado.

**Veredito da comparação: a referência ainda vence na dobra.** Por pouco, e quase só por causa do palco.

---

## 3. Veredito por peça

| Peça | Veredito | Maior lacuna |
|---|---|---|
| **P1 Palco anatômico** | **REPROVA** | O busto não domina. Ocupa ~68% da altura do palco a 1440, é de baixo contraste em repouso e não tem foco de cor. Somam-se o popover e a lista de teclado opacos, que cobrem o próprio modelo (mecanismos 1 e 5). |
| **P2 Colunas** | **REPROVA** | O gráfico dos cards de escala vira bloco tingido. Falta a linha-limite em 2 de 3 cards, e o M-CHAT é um retângulo menta com um ponto só (mecanismo 3). Perfil, trilha, diagnósticos, pastas, medicações e marcos estão bons. |
| **P3 Navegação e seções** | **REPROVA** | `medidas-1440.json` marca **rolagem lateral a 1440**, e a 390 a pílula "Sem desfecho" é cortada e esconde a ação **Remarcar** (`42-celular`). A barra, as pílulas e o painel de 8 seções estão fiéis e bem executados. A reprovação vem só do responsivo. |

---

## 4. Defeitos, do mais grave ao menor, com correção

1. **Busto pequeno e apagado no palco (P1, mecanismo 1).** ~68% da altura a 1440 (`01`), ~74% a 1920 (`02`). As linhas em tinta clara somem nos ombros, e nada tem cor em repouso.
   *Correção:* aproximar a câmera inicial ~12% e baixar o alvo, para o topo do crânio ficar a ~24 px abaixo das pílulas de alerta e os ombros entrarem por trás da faixa de cápsulas, como na referência. O critério é busto ≥ 78% da altura do palco nas duas larguras. Subir `--anat-line` para o teto da faixa do guia (18%) só na cabeça e no pescoço. Deixar o cérebro em repouso com `--anat-brain-rest` um degrau mais azul, para que ele seja o ponto focal sem virar área sólida.

2. **Gráfico do card de escala vira bloco de cor (P2, mecanismo 3).** Vanderbilt sem linha-limite, M-CHAT-R/F só um retângulo menta (`01`, `03`, recorte de `cards`).
   *Correção:* a faixa tingida deve ter a altura proporcional ao intervalo de referência real, nunca a área inteira do gráfico. Sempre desenhar a linha-limite de 1 px no topo da faixa. Limitar a altura do gráfico a ~64 px, sem o vão vazio entre a pílula de variação e o gráfico. Com uma aplicação só, mostrar o anel sobre a linha-limite e "1 aplicação" no rodapé, em vez da faixa cheia.

3. **Popover e lista de teclado opacos e por cima do modelo (P1, mecanismo 5).** O popover (`12`) tem fundo chapado e cobre a cabeça. A estrutura selecionada vai parar na borda de cima, meio escondida. A lista (`15`) é branca opaca sobre meio busto.
   *Correção:* usar o mesmo vidro das pílulas de alerta (`--rp-glass-strong` com alfa ~0,6 e `--glass-filter`), para o plexo atrás aparecer como sombra desfocada. Ancorar o popover ao lado da estrutura, do lado com mais espaço livre, com um traço-guia curto até o pino, e nunca sobre o busto. A lista de teclado vai para a lateral do palco (sobre a área vazia à direita do busto), também em vidro.

4. **Rolagem lateral a 1440 (P3).** `medidas-1440.json` → `"rolagemLateral": true`. A 390 está `false`.
   *Correção:* achar o elemento que passa da largura (provavelmente o palco ou o canvas 3D com `width: 100vw`, ou a barra de pílulas) e usar `max-width: 100%` ou `min-width: 0` no item da grade. A página não pode rolar na horizontal em nenhuma largura de desktop.

5. **Base do palco quebra fora de 1440/1920, e o alerta é cortado no celular (P1 e P3, mecanismo 7).** A 1280 (`40`) e a 390 (`42`) os controles sobem acima das cápsulas. A 390 a pílula "Sem desfecho" é cortada na borda e **Remarcar fica fora da tela**, e o crédito termina em "CC…".
   *Correção:* uma única linha flexível, com a faixa em `flex: 1; overflow-x: auto` e os controles com `flex: none` no fim. Abaixo de 480 px, empilhar as pílulas de alerta em coluna, de largura inteira, com a ação visível, e quebrar o crédito em 2 linhas.

6. **Faixa de consultas curta e presa à esquerda a 1920 (P1).** Em `02`, 3 cápsulas à esquerda e controles a ~500 px, com nada entre eles. Na referência a faixa é um trilho centrado sob o corpo.
   *Correção:* centralizar o grupo de cápsulas no eixo do busto (ou deixar o trilho com a largura do busto e um fio fino de 1 px ligando as cápsulas ao "Hoje"), com os controles na mesma linha de base, à direita.

7. **Camadas com efeito quase invisível (P1).** `13-sem-cranio` mal se distingue de `01`: a silhueta da cabeça continua, e o ícone desligado só fica um pouco mais cinza.
   *Correção:* no estado desligado, ícone a 40% com traço em diagonal ou anel vazio, e o nó do arco saindo do ícone. Ao desligar o crânio, fazer o cérebro ganhar um degrau de contraste, para a mudança se ler no modelo.

8. **Pastas inconsistentes (P2, mecanismo 6).** O rótulo "3 arquivos" e o `+` somem no Neurofisiológico em `03` e `41`, mas aparecem em `20`. As folhas de PDF (Pareceres) são brancas e vazias. Os `+` pretos em cada pasta são as marcas mais pesadas da coluna esquerda.
   *Correção:* desenhar o rótulo de contagem independentemente do carregamento das miniaturas. A folha de PDF ganha título e data em 2 linhas de 11 px. O `+` por pasta aparece só em hover ou foco (ou vira botão de vidro com contorno), porque o card "Anexar exame" já cobre a ação.

9. **Painéis de seção perdem a gramática da referência (P3).** Em `30-painel-escalas` a série vira uma linha lisa sem pontos, faixa nem anel, e o medidor usa barras laranja saturadas. Em `30-painel-consentimentos` há cartões inteiros tingidos de verde e âmbar.
   *Correção:* reutilizar no painel o mesmo gráfico de pontos com faixa e anel dos cards. Usar `--data-caution` no segmento ativo do medidor. Cartões de consentimento neutros, com o traço de 2 px de estado antes do título, como nos biomarcadores.

10. **Painel no celular sem identidade do paciente (P3).** Em `43-celular-painel` o nome e as pílulas somem, e sobram "Voltar à visão geral" e os alertas.
    *Correção:* cabeçalho do painel no celular com o nome do paciente (14 px, medium) acima do título da seção.

11. **Sobrelinhas em maiúsculas nos painéis (P3).** "OUTUBRO DE 2026", "SETEMBRO DE 2026", "EM USO", "SUBJETIVO/OBJETIVO/AVALIAÇÃO/PLANO" (`30-painel-linha-do-tempo`, `-evolucoes`, `-medicacoes`). O guia §3 proíbe sobrelinha.
    *Correção:* caixa de frase, `--t-body`, `--w-medium`, `--ink-400`. No SOAP, a letra no círculo já faz o papel de rótulo.

12. **Detalhes de barra (P3).** A 1024 (`41`) a pílula "Consentimentos" é cortada em "C" sem indício de rolagem. A 1280 e a 390, o "F90.0" quebra sozinho numa linha nova.
    *Correção:* `mask-image` de esmaecimento no fim da barra de pílulas, com rolagem por encaixe. Agrupar os chips de CID com `white-space: nowrap` para quebrarem juntos.

13. **Coração em repouso parece caixa (P1).** Em `02`, no peito, um retângulo de arame.
    *Correção:* conferir a malha (provavelmente a caixa envolvente invisível do raycast está aparecendo no plexo) ou reduzir o plexo do coração em repouso à densidade das linhas do tórax.

14. **Pílula de variação neutra (P2).** "−5 pontos" e "−6 pontos" em cinza. Na referência a pílula é tingida pelo estado.
    *Correção:* fundo `--data-positive` suave quando a variação é melhora, e `--data-caution` suave quando é piora, com texto em tinta.

**Nota sobre as medidas:** `textosAbaixoDoAA` marca "Emitir documento" com contraste de 1,12. Nas capturas o texto é branco sobre botão de tinta, perfeitamente legível. É falso positivo do medidor (fundo amostrado na página, não no botão), não defeito.
