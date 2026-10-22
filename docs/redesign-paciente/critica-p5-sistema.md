# Crítica de sistema, passada 5 — Prontuário do paciente

Data: 22/10/2026. Crítico de sistema (tokens, tipo, espaço, raio, elevação, alvos, z-index, alinhamento). Contexto limpo: não li críticas anteriores nem `design-loop.md`. Julguei pela tela e pelo DOM renderizado.

## 1. Método e ressalvas

**Régua:** `admin/styles/tokens.css`, `DesignCharlington.md`, `guia.md` §0, §3 e §4.6.

**Material:** as capturas de `shots/prontuario-p5` (lidas uma a uma) e `medidas-1440.json` / `medidas-390.json`. Rodei sondas somente leitura com `cdp.mjs eval`, sem clicar nem alterar dados:
- Sobre a visão geral: tamanhos de texto por área, contraste, alvos, sombras, raios, z-index, espaçamentos fora da escala, geometria das colunas, alinhamento de bordas e de texto.
- Em 1440, 1280, 1180, 1024 e 390.
- Nas 8 seções do painel, em 1440 (`?secao=linha-do-tempo|evolucoes|escalas|marcos|medicacoes|anexos|documentos|consentimentos`).

**Ressalvas:**
1. **Contraste de "Emitir documento" (1,12:1): artefato da sonda.** A sonda compõe o fundo só com `background-color`, e o `.btn--primary` usa preenchimento que ela não lê. Na captura o texto é branco sobre tinta, ≈ 19:1. O `.btn` global está fora do escopo e não conta.
2. **Contraste das demais áreas é aproximado.** Os fundos translúcidos foram compostos sobre `--canvas` plano, sem a aurora nem o plexo 3D. O texto sobre o canvas 3D (crédito e datas da faixa) não foi medido sobre pixel real.
3. **Popover da estrutura (`12-popover.png`) julgado só pela captura.** Abri-lo exigiria clique. Alvo do "×" e z-index do popover ficam **sem medida**; não reprovo por eles.
4. **Texto das pastas:** conforme combinado, o tamanho computado é ignorado (palco escalado por transform). Os valores `an-list__*` (lista oculta de teclado, 1×1 px) não entram nas contagens.
5. **Fora do escopo e não julgado:** dock, barra global, `.btn` global (borda + sombra, 40 px), modal "Editar ficha", `chip--info`. Cor por estrutura no modelo anatômico é exceção aprovada.
6. **Slug da seção Exames:** é `?secao=anexos`. `?secao=exames` não abre painel.
7. **Captura `40c-1366x768-2alertas.png` usa outro paciente.** Só ela mostra duas ou mais alertas no palco, então esse achado é medido na imagem e não na sonda.

## 2. Vereditos

| Peça | Veredito | Maior violação (com medida) |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | A tira de alertas corta ação e texto: em 390 o botão "Remarcar" fica em x 372–457 numa tela de 390 px; em 1366 "Sem consentimento par…" aparece cortado no meio da palavra (captura 40c). |
| P2 Colunas | **REPROVA** | O texto "Emergentes" extravasa o card de contagem de Marcos: sobra −4 px em 1180 e −3 px em 1024, com card de 88–89 px e padding de 12 px. |
| P3 Navegação e seções | **REPROVA** | Alvos de 21–24 px dentro do painel e no topo (mínimo 40): "Ver dados" 63×24, "escolha do computador" 146×21, breadcrumb "Pacientes" 58×21. Em 390 a tela usa 5 tamanhos de texto (11, 14, 22, 32, 52). |

---

## 3. P1 — Palco anatômico

### O que passou (com números)
- **Tamanhos de texto:** o palco usa só 14 px (42 nós) e 11 px (6 nós). A tela toda em 1440 tem 4 tamanhos: 11, 14, 32 e 52.
- **Alvos do palco em 44 px**, em todas as larguras medidas:
  - 5 botões do arco de camadas: 44×44.
  - Aproximar e afastar: 44×44.
  - Botão de vista "3D": 44×44.
  - Cápsulas da faixa de consultas: 48 px de altura.
  - "Remarcar": 40 px, igual a `--touch`.
- **Geometria:**
  - Em 1440 o palco ocupa 576×600 entre as colunas de 340 e 360, com vão de 20 px.
  - Em 1280 ocupa 504×500.
  - Em 1180 ocupa 404×500.
  - Em 1024 ocupa 660×480 e as escalas descem em grade de 2 (324 + 324 px).
  - Em 390 ocupa 358×420, a altura que o guia pede.
- **Sem rolagem lateral** em nenhuma largura (`scrollWidth` igual à largura da janela).
- **Alergia nunca some:** visível em 1440, 1280, 1180, 1024 (faixa acima do perfil) e 390.
- **Contraste do texto no palco:** 0 de 48 nós de texto abaixo de 4,5:1 na aproximação. As cores usadas são `--ink-400` (99,100,104), `--ink-900`, `--signal-red-ink` e `--blue-600`.
- **Fonte:** só Urbanist.
- **Raios** só nos tokens: 50% nos botões, 999 px nas cápsulas e 28 px (`--r-card`) nos cards.
- **z-index:** os 2 locais do palco (`an-alerts`, `an-layers`, `an-base`, `an-credit-line` = 2) ficam dentro de `.pr-stage`, que tem `isolation: isolate`. Não vazam para a escada global. A barra de pílulas está em 100 (`--z-sticky`).
- **Cápsulas da faixa:** glass + `--e-glass`, sem borda (`border-top-width: 0`).

### Violações (da mais grave à menor)
1. **A tira de alertas corta ação e texto, sem sinal de que há mais** (alinhamento e ritmo; "alerta não some").
   - Medida em 390: o alerta "Sem desfecho" mede 328 px a partir de x = 137 e vai até x = 465. Em 390 de largura, "Remarcar" (85×44, x 372–457) fica **inteiro fora da tela**, 67 px além da borda. Na `42-celular.png` só se vê "Sem desfecho / Retorno de 07/10/2026 10:00", sem o botão.
   - Medida na captura 40c (1366×768, paciente com 2 alertas): o segundo alerta aparece como "Sem consentimento par…", cortado no meio da palavra na borda do palco (≈ x 990).
   - Correção: empilhar os alertas, ou passar para duas linhas com `flex-wrap`, nas larguras em que a soma excede o palco. A ação "Remarcar" tem de ficar sempre visível, como no painel de 390, onde os alertas já empilham (`43-celular-painel.png`).
2. **O mesmo componente `pr-alert--danger` declara duas elevações diferentes** (regra: elevação declarada uma vez, sem borda + sombra no mesmo elemento).
   - O alerta "Alergias" (113×52) tem fundo branco sólido e `box-shadow: inset 0 0 0 1px rgba(15,16,18,.06), 6px 0 14px -6px rgba(15,16,18,.12)`. Isso é um anel de 1 px (uma borda) e uma sombra com deslocamento horizontal de 6 px.
   - O irmão ao lado, "Sem desfecho" (329×56), usa vidro `rgba(240,240,244,.72)` com `--e-glass` (blur 40 px, sem anel).
   - Resultado: uma pílula é branca e plana, a outra é vidro cinza, os dois na mesma tira.
   - Correção: os dois com a receita de vidro `--e-glass` e fundo `--rp-glass-strong`. A distinção de gravidade fica no ícone e na cor do texto, que já a carregam.
3. **Data de item da faixa de consultas em `--t-micro` (11 px)** (tokens.css: micro não qualifica dado nem data de item de lista).
   - Medido: "25 ago 2026", "16 set 2026" e "07 out 2026" (`pr-visit__date`) estão em 11 px.
   - O próprio `tokens.css` diz que a data de item de lista é corpo, em `--ink-400`. O guia §4.3 pede só mês/ano.
   - Correção: mostrar "set 2026" em 11 px, que é o caso aprovado ("mês da faixa"), e deixar o dia no rótulo em 14 px; ou passar a data inteira para 14 px.
4. **Espaçamento fora da escala `--s-*`** (só tokens de espaço). Medido no palco:
   - `pr-visit`: padding 6 px (topo e base) e gap 6 px em 3 elementos.
   - `pr-rail__today`: padding e gap de 2 px.
   - `an-glass-btn` de texto: padding horizontal de 10 px.
   - A escala não tem 2, 6 nem 10.
   - Correção: 4 ou 8 px.
5. **z-index local 1–3 fora da escada** (`an-alerts`, `an-layers`, `an-base`, `an-credit-line` = 2; `pr-alert` = 1; `gf-*` = 1–3). Todos ficam dentro de contexto isolado, sem vazar para a escada global, então não há colisão medida. É violação de forma: devem usar `--z-base` ou um token local `--z-stage-*`. Menor.

Não medido: popover e foco de teclado (`:focus-visible`), ver ressalva 3.

---

## 4. P2 — Colunas (perfil, diagnósticos, pastas, escalas, medicações, marcos)

### O que passou (com números)
- **Larguras (§4.6):**
  - ≥ 1440: 340 / 576 / 360, gap 20.
  - 1180–1439: 300 / 1fr / 320, gap 16, com escalas em 1 coluna de 320 px.
  - 1024: 300 + 660, com a coluna direita em grade de 2.
  - < 1024: uma coluna de 358 px.
- **Elevação dos cards:** os 5 `pr-card` e os 3 `pr-scale` têm `border-top-width: 0` e a mesma receita (`--card-glass` + `--e-glass`, raio 28 px). Não há borda + sombra larga nos cards.
- **Cor de texto só em tokens:** 8 valores distintos, todos tokens (`ink-400`, `ink-600`, `ink-900`, `ink-950`, `surface`, `signal-red-ink`, `blue-600`, `blue-700`).
- **Marcas de dado:** o traço de risco usa `--data-caution` (185,131,0) e `--data-positive` (26,143,72); o ponto de risco alto usa `--data-negative` (217,67,47). Ambos em 2×14 px com 999 px de raio, como pede o guia.
- **Alvos:**
  - Abrir pasta (`pr-folder__open`): 44×44.
  - Adicionar arquivo (`gf-keyhit`): 44×44.
  - "Ver todas": 93×44. "Abrir": 64×44. "7 arquivos": 96×44.
  - Card "Anexar exame": 164×217.
  - "Agendar retorno": 340×64.
- **Tamanhos:** só 11, 14, 32 e 52. O 52 está nos 3 números de escala.
- **Contraste:** 0 nós abaixo de 4,5:1 nas colunas (aproximação).
- **Títulos de card:** `pr-card__title` em 14 px / 500, como o guia manda.
- **Sem texto cortado** (`overflow` e `scrollWidth`) nas colunas, nas 5 larguras.

### Violações (da mais grave à menor)
1. **O texto extravasa o card de contagem de Marcos** (alinhamento e ritmo).
   - Em 1180: card de 88 px, padding de 12 px, "Emergentes" com 18 px a mais que o miolo. O texto passa **4 px da borda direita** do card (folga −4 px). "Atrasados" fica com 8 px de folga à direita.
   - Em 1024: card de 89 px, "Emergentes" passa 3 px.
   - Na `41b-1024-medicacoes.png` o "s" de "Emergentes" encosta no card vizinho.
   - Correção: os 3 cards viram lista vertical (rótulo + número em linha), ou a grade passa a 1 coluna abaixo de 1280, ou o rótulo vai para 11 px. Preferir a lista vertical; 11 px não é a informação principal.
2. **Botão "+" das pastas com anel de 1 px e sombra larga no mesmo elemento** (elevação declarada uma vez).
   - `pr-folder__plus` (44×44, `Anexar exame`): `inset 0 0 0 1px rgba(15,16,18,.12), inset 0 1px 0 …, 0 1px 2px …, 0 16px 40px -18px rgba(15,16,18,.14)`.
   - O anel funciona como borda. A sombra de 16/40 px é a larga de `--e-glass`.
   - Correção: tirar o anel. O botão já se separa do card pelo vidro e pela sombra.
3. **Duas margens esquerdas de texto na coluna direita** (alinhamento).
   - Títulos dos cards de escala em x = 1072 e 1258 (padding 16 px).
   - Títulos de "Medicações em uso" e "Marcos do desenvolvimento" em x = 1076 (padding 20 px).
   - Os cards estão empilhados na mesma coluna e o texto desalinha 4 px.
   - Correção: padding de 20 nos `pr-scale` (`--s-5`), igual ao `pr-card`. Se o miolo do card de escala de 174 px apertar, só ele tem 16 px, mas então os títulos de card passam a 16 também.
4. **Espaçamento fora da escala `--s-*`.**
   - 7 px nos 6 `pr-pill__count` (padding horizontal).
   - 2 px (margem superior em datas e padding vertical em `pr-scale__delta` ×2).
   - 6 px em `pr-scale` e `pr-scale__value` (gap de 2 px).
   - 10 px em `an-glass-btn`.
   - Correção: 8 px para o contador; 4 px (`--s-1`) para os 2 px.
5. **Cada pasta tem sombra e anel próprios** (`gf-sheet`: anel 0,5 px + `0 10px 26px -8px`; `gf-key-face`: anel 1 px + sombra curta). São 2 receitas de sombra fora de `--e-*`. Só aceitável por serem peças do desenho da pasta (folha de papel e tecla). Registro como menor.

---

## 5. P3 — Navegação e seções (barra, pílulas, painel das 8 seções, responsivo)

### O que passou (com números)
- **Pílulas:**
  - 40 px de altura (`--touch`), 101–160 px de largura; em 390 ficam acima de 44.
  - Ativa em `--tab-active-bg` (rgb 15,16,18) com texto `--surface`, sem borda e sem sombra. Inativa em `--ink-600` (61,62,65), 14 px / 500.
  - Contador de 20×20, 11 px, `--ink-a06`.
  - Barra sticky em z = 100 (`--z-sticky`), vidro com `--e-glass`.
- **Painel de seção:**
  - 956×596 em 1440, raio 28 px, `--rp-glass-strong` com `blur(24px) saturate(1.6)`, `--e-4` (`0 8px 24px … , 0 44px 100px -30px …`), sem borda (`border-top-width: 0`). Elevação declarada uma vez.
  - Cabeçalho sticky em z = 100.
  - Sem texto vazando para fora do painel nas 8 seções.
- **Tamanhos no painel:** 11 / 14 / 22 / 32 = 4 em todas as 8 seções (22 só no título do painel; 32 no nome e no escore 17/54 de Escalas). O título do painel está sempre a 22 px / 500.
- **Alvos no painel, medidos nas 8 seções:** nenhum botão do painel fica abaixo de 40 px, exceto os dois da lista abaixo.
- **Alinhamento da barra:** voltar 44×44 (x = 100) e nome em x = 160. Breadcrumb em 100 e pílulas com o primeiro texto em x = 120, mesma margem do texto dos cards (120).
- **Barra em 1440:** "Editar ficha" e "Emitir documento" terminam em x = 1416, a mesma borda direita do conteúdo (100 + 1316).
- **Responsivo:**
  - A barra de pílulas rola na horizontal em ≤ 1180 e 1024. Em 390 as pílulas passam a 7 cortadas por rolagem, que é o desenho previsto.
  - Alergia em faixa abaixo de 1024, como o guia manda.
- **Sem texto abaixo de 4,5:1** no painel (aproximação), nas 8 seções.
- **Hex e estilo inline:** 0 `style` inline com cor em todo o painel.

### Violações (da mais grave à menor)
1. **Alvos abaixo de 40 px** (regra: ≥ 40 px, `--touch`). Medidos:
   - **"Ver dados"** (`chart__data-toggle`, painel Escalas): 63×24, em 2 gráficos.
   - **"escolha do computador"** (link do `dropzone`, painel Exames): 146×21.
   - **Breadcrumb "Pacientes"**: 58×21, em todas as larguras. O guia §4.1 manda manter o componente `Breadcrumb`, mas o alvo continua em 21 px de altura.
   - Correção: área de clique mínima de 40 px de altura com `padding-block` ou `min-height: var(--touch)`, sem mudar o tamanho do texto. Para o breadcrumb, `min-height: var(--touch)` com alinhamento ao centro.
2. **Em 390 a tela usa 5 tamanhos de texto: 11, 14, 22, 32, 52** (máximo 4 por tela).
   - O nome do paciente cai para 22 px (`--t-title`) enquanto os números do tally de Marcos ficam em 32 px (`--t-page`). Em 1440 o nome é 32 px e o 22 não aparece.
   - Correção: pôr os 3 números do tally em `--t-title` (22 px). Fica 11 / 14 / 22 / 52, 4 tamanhos, e o 32 sai da tela.
3. **A barra de seções corta uma pílula inteira em 1180 e 1024.**
   - Em 1180 a trilha tem 1056 px visíveis para 1115 px de conteúdo. "Consentimentos" sai 55 px.
   - Em 1024 a trilha tem 976 px e a mesma pílula sai 135 px (sobram ≈ 25 px de uma pílula cortada ao meio).
   - Em 1280 e 1440 a trilha cabe (1115 px).
   - Mostra o nome cortado como se fosse erro.
   - Correção: máscara de fade na borda direita (ou seta de rolagem) quando há overflow, ou encurtar os rótulos a partir de 1180 (por exemplo, sem os contadores).
4. **Chip de código no cabeçalho desalinha 12 px quando quebra de linha.**
   - Em ≤ 1280 o grupo "G40.9 / F90.0" quebra para a segunda linha em x = 160, a mesma margem do texto acima (x = 160), mas o texto do primeiro chip começa em x = 172 (`padding-left: 12px` do chip, fundo transparente).
   - Correção: `margin-left: -12px` no primeiro chip da linha, ou o chip só desenha fundo e padding quando o fundo existe.
5. **Elevação com anel + sombra no estado vazio de Documentos.** `empty__icon`: `inset 0 0 0 1px rgba(15,16,18,.06), …, 0 10px 28px -14px`. Mesma regra do item 1 de P1 (borda + sombra larga). Correção: tirar o anel.
6. **Espaçamento fora da escala** no painel: 6 px em `consent__state` (12 elementos), 26 px em `ruler` (3 elementos) e 11 px em `chip` (2 elementos), na seção Consentimentos e Escalas. Correção: 8, 24 e 12 px.
7. **Observação, sem regra violada:** o bloco sticky (barra de pílulas + faixa de alertas) ocupa 120 px de 768 (15,6%) em 1024 e 124 px de 844 (14,7%) em 390. É peso alto sobre a área de leitura; considerar não colar a faixa de alertas, só as pílulas.

---

## 6. Tabela consolidada

| # | Peça | Violação | Medida | Regra | Correção |
|---|---|---|---|---|---|
| 1 | P1 | Tira de alertas corta ação e texto | Em 390 "Remarcar" em x 372–457 (tela de 390); em 1366 "Sem consentimento par…" cortado | Alinhamento e ritmo; alerta não some | Empilhar alertas; "Remarcar" sempre visível |
| 2 | P2 | "Emergentes" extravasa o card de contagem | −4 px em 1180, −3 px em 1024 (card de 88–89 px) | Alinhamento e ritmo | Lista vertical ou 1 coluna |
| 3 | P3 | Alvos abaixo de 40 px | "Ver dados" 63×24; "escolha do computador" 146×21; breadcrumb 58×21 | Alvos ≥ 40 px | `min-height: var(--touch)` |
| 4 | P3 | 5 tamanhos de texto em 390 | 11, 14, 22, 32, 52 | Máximo 4 tamanhos por tela | Tally de Marcos em 22 px |
| 5 | P1 | `pr-alert--danger` com 2 receitas de elevação | "Alergias": anel 1 px + sombra 6/14 deslocada; "Sem desfecho": vidro + `--e-glass` | Elevação declarada uma vez | Mesma receita de vidro nos dois |
| 6 | P2 | Botão "+" com anel + sombra larga | `pr-folder__plus`: anel 1 px + `0 16px 40px -18px` | Sem borda + sombra larga | Tirar o anel |
| 7 | P3 | Pílula "Consentimentos" cortada | 55 px em 1180; 135 px em 1024 | Alinhamento e ritmo | Fade de borda ou rótulos curtos |
| 8 | P3 | Chip de código desalinhado ao quebrar | Chip em x = 172, texto acima em x = 160 | Alinhamento | `margin-left: -12px` |
| 9 | P2 | Títulos de card desalinhados na coluna direita | x = 1072 (escalas) × 1076 (medicações, marcos) | Alinhamento | Padding 20 nas escalas |
| 10 | P1 | Data de item da faixa em 11 px | 3 datas `pr-visit__date` | Micro não qualifica item de lista | Corpo 14 px, ou só mês/ano |
| 11 | P3 | `empty__icon` com anel + sombra larga | `0 0 0 1px` + `0 10px 28px -14px` | Sem borda + sombra larga | Tirar o anel |
| 12 | P1/P2/P3 | Espaçamento fora de `--s-*` | 2, 6, 7, 10, 11 e 26 px em 12 classes | Só tokens de espaço | 4, 8, 12 e 24 px |
| 13 | P1 | z-index local 1–3 | `an-*` e `gf-*` em contexto isolado | Escada global | Tokens locais; sem colisão medida |
| 14 | P2 | Sombras de pasta fora de `--e-*` | `gf-sheet`, `gf-key-face`: 2 receitas | Elevação nos tokens | Peça de desenho da pasta; menor |

**Vereditos finais:** P1 REPROVA, P2 REPROVA, P3 REPROVA.
