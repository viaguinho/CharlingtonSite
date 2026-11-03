# Crítica de fidelidade, passada 4: prontuário no estilo Quantis (tema claro)

- **Data:** 21/10/2026
- **Papel:** crítico de fidelidade, com contexto limpo. Não li críticas anteriores nem o código da página.
- **Base:** `bar.md` (7 mecanismos) e `guia.md` §0 e §2. Consultei também a §4.5 e a §4.6 só para não apontar como defeito o que o dono decidiu: o painel cobre o palco e a coluna direita, e o celular segue a ordem perfil → palco → escalas → pastas.
- **Capturas:** `.claude/design-loop/shots/prontuario-p4/*.png`, todas vistas, mais `medidas-1440.json` e `medidas-390.json`. Ampliei recortes e amostrei pixels para medir densidade de traço, ruído e cor.
- **Referência:** Dribbble 27474777, imagens 48076259 (composição inteira no monitor), 48076255 (corpo, popover e faixa), 48076257 (pastas e pílula do médico) e 48076258 (card de biomarcador). Vi as quatro no navegador, sem baixar.
- **Fora do escopo:** o dock lateral. As decisões do dono (tema claro, neutro + azul, cor só na anatomia, painel de seção largo, ausência de biomarcadores falsos) foram tratadas como premissas.

---

## 1. Régua: os 7 mecanismos

| # | Mecanismo | Veredito | Evidência |
|---|---|---|---|
| 1 | A anatomia é o maior objeto da tela | **PASSA** (no limite) | `medidas-1440`: palco com 576 px, ou 0,40 da janela (0,42 sem o dock de 76 px). Em `01-dobra-1440`, o busto aparece de y≈355 a y≈795 num palco de 600 px (276→876): 73% visíveis, cerca de 85% contando o peito sob a faixa. Não há moldura nem fundo próprio, e as colunas são cards. Ressalva: o palco só começa em y=276, porque 31% da dobra vai para o cabeçalho. |
| 2 | Plexo legível, uma estrutura por vez | **PASSA** (com ressalva) | Em repouso (`01`, `02`), as linhas são finas, os nós aparecem como anéis e não há área sólida. Em hover ou seleção (`10`, `11`, `12`, `15`), há uma única estrutura azul sólida, e as vizinhas recuam: a densidade de traço no pescoço cai de 0,40 para 0,04. Ressalvas: (a) sobre o sólido o plexo aparece como pontos soltos, sem linhas, e o sólido parece plástico azul liso; (b) o recuo de ~10% apaga a silhueta da cabeça; (c) em repouso, crânio, rosto e cérebro usam a mesma tinta e o rosto vira um novelo escuro (recorte de `01`, região 640–760 × 470–560). |
| 3 | Card de medida no padrão do biomarcador | **FALHA** | O que passa: número de 52 px contra título de 14 px (3,7×), peso 300, "/54" menor e mais claro, traço de 2 px âmbar ou verde antes do título, faixa tingida, linha-limite fina e último ponto com anel. **Falha:** o rodapé do Vanderbilt ocupa **3 linhas** ("Critérios parcialmente / atendidos / há 5 semanas") em `01-dobra-1440` e `02-dobra-1920`. A régua permite no máximo 2. |
| 4 | Um acento só | **FALHA** (leve) | Na visão geral passa: o azul preenchido aparece só no traço "Hoje" e nos marcadores ocultos da lista (o dock não conta), e vermelho, âmbar e verde aparecem só como estado. **Falha** em `30-painel-consentimentos`: o chip âmbar "Consentimento do responsável (art. 14, §1o)" aparece também nas linhas "Vigente". Ali o âmbar marca a categoria da base legal, não um estado. Observação: a pílula ativa está preenchida em **preto**, e não em azul como pede a §4.1, então o acento único da referência (o lima na pílula ativa) não tem tradução na tela. |
| 5 | Tudo que flutua sobre o palco é vidro | **PASSA** | Pílulas de alerta, cápsulas, controles e popover têm desfoque: o ruído da mesa (desvio de 6 níveis) cai para 0–1 dentro deles. O "+" assume o azul da mesa atrás dele (228, 236, 247). No popover, o azul do órgão vaza pela esquerda (`12`). Os cards têm raio de 28 px, e a medição só encontra borda somada a sombra nos botões do topo. Ressalva: no painel de seção, a cabeça e os cards desfocados atrás dele aparecem como manchas cinzentas (`30-painel-documentos` em ~720,500; `30-painel-medicacoes`). |
| 6 | A pasta é o herói do card de exames | **PASSA** (com ressalva) | A pasta ocupa ~88% da largura do card, tem aba e frente de vidro fosco, as folhas ficam atrás e abrem em leque no hover (`21`), "3 arquivos" fica no vidro, e título e data ficam no topo com `↗` (`20`). Ressalvas: a arte acetinada do fundo vaza como um retângulo de canto vivo no alto à direita, atrás das folhas (`20`, `03`); a 1024 px o rótulo sobe até a linha da aba, por cima das folhas pretas, e o "+" some (`41`); em "Pareceres", a folha do PDF quase não aparece. |
| 7 | Base do palco em faixa única | **PASSA** | Em `01` e `02`, as cápsulas formam uma fileira única com data, ponto e status (3 itens), o traço "Hoje" é fino, e os botões "+", "−" e "3D" são quadrados de vidro no canto inferior direito, na mesma linha de base da faixa. Ressalva: a 390 px aparece só uma cápsula, cortada e sobreposta ao peito (`42`). |

**Placar:** 5 PASSA (3 com ressalva) e 2 FALHA.

---

## 2. Comparação cega: `02-dobra-1920` contra a referência

Pus as duas telas lado a lado e me perguntei o que um designer diria sem saber qual é a original.

**O que se reconhece logo como Quantis:**
- Três colunas, com um corpo em plexo no centro e cards flutuando nas laterais.
- Cards de medida com número enorme e fino, unidade pequena colada, traço colorido antes do título e mini gráfico de pontos com o último ponto em anel.
- Pastas de vidro com folhas atrás e a contagem no vidro.
- Faixa de cápsulas na base, com os controles quadrados à direita.
- Arco de camadas à esquerda do corpo, com ícones redondos.
- Pino com anel e popover de vidro com a cor do órgão vazando.

**O que denuncia que não é a referência**, da diferença mais forte para a mais fraca:

1. **Ponto focal trocado.** Na referência, o olho cai primeiro no corpo: é o objeto de maior contraste da tela, com dois sólidos coloridos. Em `02`, o olho cai antes no "Emitir documento" e na pílula ativa (os dois blocos pretos do topo), depois nos números 17, 14 e 2, depois nas folhas **pretas** das pastas. Só então chega ao busto. O busto é o maior objeto, mas é cinza médio em traço fino sobre branco azulado, e por isso não é o mais forte.
2. **Topo de página clássico.** Breadcrumb, nome de 32 px, linha de metadados e barra de pílulas ocupam 265 px em largura total antes do palco começar. Na referência, o nome mora no alto da coluna esquerda, a barra de pílulas flutua sobre o palco e o crânio encosta nela: o corpo usa a altura toda.
3. **Pouca densidade no centro a 1920 px.** O palco tem ~1055 px de largura, mas o busto ocupa ~670 px. O arco de camadas fica 250 px longe do ombro (ícones em x≈480–600, ombro a partir de x≈670). A faixa cobre só um terço do palco, centrada, com um vão grande até os controles. O corpo não passa por trás de nenhum card. Na referência, o corpo invade as bordas e as cápsulas cruzam o palco inteiro.
4. **Coluna direita estreita.** Ela tem 360 px (19% da tela), com cards em 2 colunas e um buraco sob o SNAP-IV. Na referência são cerca de 30%, com 3 colunas em alvenaria. A largura extra de 1920 px vira vazio no palco em vez de virar grade.
5. **A mesa não é pontilhada.** A matriz de pontos de ~22 px existe, mas some sob um granulado de areia (recorte ampliado do fundo de `01`). Na referência, a matriz é limpa e regular.
6. **Faixa sem a assinatura.** Faltam os pontos de estado `••••◉` e o ícone do tipo dentro de cada cápsula, além dos traços verticais finos entre elas.

**Nota:** estrutura 7/10 (a gramática foi traduzida inteira), impacto 4/10 (a hierarquia visual da referência não chegou). Quem compara reconhece que uma tela descende da outra, mas não confunde as duas, e o motivo principal é o busto, que não manda na tela.

---

## 3. Veredito por peça

| Peça | Veredito | Maior lacuna |
|---|---|---|
| **P1** Palco anatômico | **REPROVA** | Em repouso, o busto não tem hierarquia de profundidade nem peso. Crânio e rosto, na mesma tinta do cérebro, viram um novelo, e o cérebro "super detalhado" só aparece quando se desliga o crânio (`13`). Além disso, a 1280 px o seletor de camadas cobre as pílulas de alerta e a alergia fica ilegível (`40-1280`). |
| **P2** Colunas | **REPROVA** | O mecanismo 3 falha no rodapé de 3 linhas do Vanderbilt. Nas pastas, a arte de fundo vaza em retângulo de canto vivo, e a 1024 px o rótulo "3 arquivos" sobe para cima das folhas pretas. |
| **P3** Navegação e seções | **REPROVA** | Responsivo: a 390 px o palco só aparece em y=1654 (`medidas-390`: `visivelNaDobra` −810), depois das pastas e do perfil sensorial, ao contrário da ordem da §4.6. A 1280 px as camadas cobrem a alergia, e a 1024 px a barra de pílulas corta "Consentimentos" em "C" sem nenhuma indicação. O painel, que é a arquitetura escolhida pelo dono e por isso não é questionado aqui, funciona, mas o vidro mostra manchas. |

---

## 4. Defeitos, do mais grave ao menor

### D1. A 1280 px, o seletor de camadas cobre as pílulas de alerta e esconde a alergia (P1/P3, grave)
**Evidência:** em `40-1280`, os 5 ícones (cérebro, crânio, gota, coluna, coração) viram uma fileira horizontal no alto do palco, em cima de "Alergias · Dipirona" e "Sem desfecho". Dá para ler só "…s / Di…ona". Isso fere a §0.6 ("Alergia nunca some em nenhuma largura") e empilha vidro sobre vidro.
**Correção:** na faixa de 1180 a 1439 px, mantenha o arco vertical à esquerda do palco, como a 1440. Se a fileira horizontal for necessária, ancore-a **abaixo** das alertas (`top: calc(altura das alertas + 12px)`) ou no canto inferior esquerdo, acima da faixa. As pílulas de alerta ficam sempre com `z-index` acima das camadas, e as duas nunca dividem a mesma âncora.

### D2. O busto em repouso não manda na tela: falta peso e hierarquia de profundidade (P1, grave)
**Evidência:** em `01` e `02`, o plexo é cinza médio com traço fino sobre fundo quase branco. Crânio, pele do rosto e cérebro usam a mesma tinta, e a região do rosto vira um aglomerado escuro (recorte ampliado de `01`). O cérebro, que é a estrela do recorte, só fica legível sem o crânio (`13`). Os blocos pretos do topo, os números das escalas e as folhas pretas das pastas atraem o olho antes do corpo. Na referência, o esqueleto é o branco mais forte e o envelope é um véu fraco por cima.
**Correção** (só na anatomia, onde a cor é permitida):
- Inverta a hierarquia. Crânio e pele em `--anat-*` grafite a 25–30%, **sem nós**.
- Cérebro em linhas azuis (o azul anatômico do cérebro) a ~70%, com nós de 2 px.
- Medula e coluna em grafite a 50%.
- Ombros e tórax como véu a 20%.
- Escureça a tinta da camada protagonista para algo como `--ink-600` com alfa de 0,6. Assim o cérebro aparece através do crânio em repouso, que é a "transparência em camadas" da §2.4.

### D3. No celular, o palco fica a duas telas de distância e a faixa sai cortada (P3/P1, grave)
**Evidência:**
- Em `42-celular` e `medidas-390`, a ordem é perfil, diagnósticos, pastas, perfil sensorial, "Agendar retorno" e **só depois** o palco, em y=1654. A §4.6 pede perfil → palco → escalas → pastas em carrossel.
- No palco, aparece uma única cápsula, cortada à esquerda ("…7 out 2026"), em cima do peito e do traço "Hoje".
- O crédito quebra em 2 linhas, e o topo do palco mostra as camadas mas não a alergia, que a §4.6 pede no palco **e** na barra.

**Correção:**
- Reordene a coluna única para perfil → palco (420 px) → escalas → pastas em carrossel → diagnósticos, sensorial e retorno.
- Faixa com `scroll-snap`, máscara de fade nas bordas e rolagem inicial que mostre a cápsula de hoje inteira, a 8 px acima da base do busto.
- Crédito curto numa linha no celular ("BodyParts3D · HRA · CC BY 4.0").
- Pílula de alergia também no topo do palco.

### D4. Rodapé do card de escala com 3 linhas, a falha do mecanismo 3 (P2, médio)
**Evidência:** Vanderbilt em `01` e `02`: "Critérios parcialmente / atendidos / há 5 semanas".
**Correção:** leve a data para a linha da pílula de variação ("−6 pontos · há 5 semanas"). O rodapé fica só com a interpretação real, em até 2 linhas, com `text-wrap: balance`. Não use reticências, porque a interpretação é dado clínico e não pode ser cortada.

### D5. Pastas: a arte de fundo vaza em retângulo e o rótulo quebra a 1024 px (P2, médio)
**Evidência:**
- Em `20-pastas` e `03-pagina-1440`, um retângulo acetinado de canto vivo aparece no alto à direita, atrás das folhas, em Imagem, Neurofisiológico e Pareceres. Parece recorte errado, não arte.
- Em `41-1024`, "3 arquivos" sobe até a linha da aba, por cima das folhas pretas, e o "+" desaparece.
- Em Pareceres, a folha do PDF mostra só uma lasca, sem título nem data.
- A frente de vidro muda de aparência de uma pasta para outra: lisa na Imagem, acetinada no Neurofisiológico a 1024 px.

**Correção:**
- Recorte a arte com o mesmo contorno do fundo da pasta (aba e raio) ou tire a arte de trás das folhas.
- Fixe `aspect-ratio` na pasta e ancore o rótulo e o "+" em `bottom: 12px` da frente de vidro, em todas as larguras.
- Suba a folha do PDF ~16 px para que título e data apareçam acima do vidro.
- Use a mesma frente de vidro em todas as pastas.

### D6. O vidro do painel de seção mostra manchas em vez de profundidade (P3, médio)
**Evidência:** em `30-painel-documentos` e `30-painel-medicacoes`, a cabeça desfocada vira uma nódoa cinza em torno de (720, 500), e os cards da direita viram borrões claros. O painel parece uma folha fosca suja, não vidro sobre o corpo.
**Correção:** como manda a §4.5 ("desfoque e escurecimento leve" no palco), aplique o desfoque e a esmaecida **no próprio palco** (`filter: blur(6px)`, `opacity: .35`, escala de 0,98) e reduza o `backdrop-filter` do painel. Esconda a coluna direita (`opacity: 0`) enquanto ela estiver coberta. Adicione o reflexo especular suave no topo do painel (§2.5).

### D7. O acento sem tradução e o âmbar como categoria (P3/P2, médio-baixo)
**Evidência:**
- A pílula ativa e o "Emitir documento" estão preenchidos em preto (`01`, `02`), mas a §4.1 diz "pílula ativa preenchida em azul" e "primário azul". Na tela não sobra nenhum preenchimento azul.
- Em `30-painel-consentimentos`, o chip âmbar com relógio marca a base legal até em linhas "Vigente".
- "§1o" está com o "o" no lugar do ordinal.

**Correção:**
- Pílula ativa com o preenchimento do azul da marca, que é o único acento. Se o preto for decisão do sistema do admin, ela precisa ser registrada como exceção. Hoje ela contradiz a §4.1.
- Chip de base legal neutro, com o ícone em `--ink`. Âmbar só em "Não registrado" ou pendente.
- Trocar "§1o" por "§ 1º".

### D8. Recuo exagerado no hover (P1, baixo)
**Evidência:** em `10`, `11` e `15`, a densidade de traço fora da estrutura cai para ~10%. A cabeça quase desaparece, a estrutura flutua sem contexto e o rótulo aponta para o vazio. A §4.3 fala em 40%. Sobre o sólido, o plexo aparece só como pontos (`11`, `15` ampliados).
**Correção:** vizinhas a 35–40% e envelope a ~20%. Por cima do sólido, desenhe as **linhas** do plexo em branco a 50%, com borda Fresnel, para a estrutura parecer tecido e não plástico.

### D9. O arco de camadas não se alinha com os ícones nem com o corpo (P1, baixo)
**Evidência:** em `01`, os ícones ficam em y≈447, 495, 551, 607 e 655, mas os nós do arco ficam em y≈477, 511, 551, 591 e 627. Só o nó do meio aponta para o seu ícone. A 1920 px, o arco fica ~250 px longe do ombro (`02`).
**Correção:** use o mesmo centro e o mesmo ângulo para ícone e nó, em raios r e r+40. Ancore o arco à caixa do busto (por exemplo, `left` = centro do busto − 0,42 × largura do busto), não à borda do palco.

### D10. A 1920 px, a largura extra vira vazio (P1/P3, baixo)
**Evidência:** em `02`, o palco tem ~1055 px e o busto ~670 px, a faixa ocupa um terço do palco e a coluna direita fica em 2 colunas, com 19% da tela.
**Correção:**
- A partir de ~1760 px, alargue a coluna direita para ~520 px e use 3 colunas de escalas, como a grade da referência.
- Ajuste a câmera pela altura do palco, para o busto ocupar pelo menos 80% dela.
- Deixe o canvas sangrar por trás das colunas: elas são vidro e aguentam, e o corpo passando por trás é um dos mecanismos da referência.
- Alinhe a faixa ao início do palco, como a 1440 px.

### D11. A barra de pílulas é cortada a 1024 px sem indicar a rolagem (P3, baixo)
**Evidência:** em `41-1024`, "Consentimentos" aparece como "C" na borda direita, sem fade nem seta.
**Correção:** `mask-image` com fade nas duas bordas, `scroll-snap` e padding horizontal menor das pílulas nessa faixa de largura. Se as 9 couberem com 12 px a menos de padding, melhor ainda.

### D12. Mesa pontilhada afogada no granulado (P1, baixo)
**Evidência:** no recorte ampliado do fundo de `01`, a matriz de ~22 px está lá, mas o granulado tem desvio de 6 níveis por canal e cobre os pontos.
**Correção:** reduza o granulado a ≤ 2% ou remova. Pontos de 1 px em `--ink-a10` a cada 22 px, com máscara radial em torno do palco.

### D13. Detalhes menores
- **Faixa:** cápsulas sem ícone do tipo e sem `••••◉`, e sem traços separadores. A §4.3 pede mês e ano em duas linhas, ícone e pontos de estado (`02`).
- **Painel Escalas** (`30-painel-escalas`): o gráfico é uma curva grossa sem pontos nem faixa e quebra a linguagem do card. Reuse o gráfico de pontos do card em tamanho grande.
- **Metadados:** a 1280 px e a 390 px, "F90.0" fica sozinho na segunda linha (`40-1280`, `42`). Mantenha o grupo de códigos com `white-space: nowrap`.
- **Painel no celular** (`43`): "Retorno de 07/10/202" é cortado pelo "×" sem reticências. Use `min-width: 0` e reticências, ou quebre a pílula em duas linhas.

---

## 5. O que está certo e não pode regredir

- Hover e seleção com **uma** estrutura sólida, pino com anel, rótulo em pílula e linha fina até o popover (`10`, `12`, `15`).
- Popover de vidro com o azul do órgão vazando pela esquerda e linhas "Relacionado ao paciente" com contagem e `↗` (`12`).
- Cards de escala com o gráfico de pontos fiel (faixa tingida, linha-limite e anel no último ponto) e a pílula de variação neutra.
- Palco fixo enquanto as colunas rolam (`20`, `22`): o corpo nunca sai de vista no desktop.
- Painel de seção com as alertas repetidas no cabeçalho e "Voltar à visão geral" (`30-*`).
- Faixa, controles e crédito na mesma linha de base a 1440 px e a 1920 px.
