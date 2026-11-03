# Crítica de SISTEMA · passada 6 · Prontuário do paciente

Crítico: sistema (tokens, tipo, contraste, alvos, camadas, elevação, alinhamento e ritmo). Contexto limpo: não li críticas anteriores nem `design-loop.md`. Julguei pela tela e pelo DOM renderizado, nunca pelo código-fonte da página.

## 1. Método e ressalvas

**Régua:** `admin/styles/tokens.css`, `DesignCharlington.md`, `guia.md` §0, §3 e §4.6.

**Onde medi:** Chromium headless da porta 9333 (perfil de verificação, nenhum dado alterado, nenhum processo encerrado).
- Paciente Clara (`16df5f04…`): visão geral em 1440×900, 1280×800, 1180×800, 1024×800 e 390×844 (toque); visão geral com o popover de estrutura aberto (1440); as 8 seções em 1440; Escalas, Evoluções e Medicações em 390 e 1024; hover simulado no cérebro (1440).
- Paciente Rafael (`4579401a…`, 3 alertas longos): 1440, 1366×768, 1280, 1180, 1024 e 390.

**Sondas:**
- `cdp.mjs eval` para inventário do DOM: tamanhos de texto (computado × escala de `transform`, ou seja, o tamanho visível), raios, espaçamentos, z-index, sombras, bordas e cores.
- Os 180 literais de cor de `tokens.css` foram comparados com as cores computadas (texto, fundo, gradiente, borda, anel, sombra, traço e preenchimento SVG).
- Escada de espaço usada: 4·8·12·16·20·24·28·32·40·48·64·80 (+44 e 76 de layout). Escada de z-index: 0·100·200·210·300·400·500·600.
- Alvos: grade `elementFromPoint` de 2 em 2 px, da caixa visível mais 24 px em volta; o retângulo dos pontos que acertam o elemento é a área clicável (erro de até +2 px).
- Contraste por pixel: uma cópia da ferramenta, só no meu scratchpad (`sist6/h.mjs`), captura a tela com todo texto transparente. Para cada texto visível compõe a cor computada (alfa × opacidade acumulada dos ancestrais) sobre os pixels de fundo reais sob o retângulo do texto (palco 3D, aurora e vidro incluídos). Reporto o **p5** (pior ponto, conforme o guia §3) e a mediana. Descartei texto oculto por outro elemento (`elementFromPoint`) ou recortado por ancestral.

**Ressalvas:**
- O busto gira sozinho, então o pior pixel sob o texto varia entre capturas. Por isso aparecem faixas (ex.: 4,02–4,14).
- Não medi pixels do canvas 3D (cores da exceção anatômica, plexo) nem o desenho das folhas das pastas (canvas). Não medi anel de foco.
- Falsos positivos descartados:
  - "Emitir documento" (botão escuro, já avisado).
  - Textos sob a sombra da barra inferior global em ≤1024 e atrás do painel de tela cheia em 390.
  - O "17" de 52 px em 390 (p5 1,09, mediana 19,4), cortado pela borda da viewport.
  - `fill: rgb(0,0,0)` em `<line>` SVG (não é pintado).
- Fora do escopo, como combinado: dock, barra global, `.btn` global (borda + sombra, altura 40), modal "Editar ficha" e `chip--info` global.
- Os `z-index` 1 a 3 do `GlassFolder` (18 elementos) ficam dentro de `.gf-root { isolation: isolate }` e não competem com a escada global. Registrei como observação, não como violação.

## 2. Vereditos

| Peça | Veredito | Maior violação (medida) |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | Cápsula da linha do tempo ("25 ago 2026 · Faltou"), um botão ativo, renderizada a `opacity: .4`: data de 11 px a **1,68–1,78:1** e status de 14 px a **2,53–2,61:1** (mín. 4,5) |
| P2 Colunas | **REPROVA** | **5 tamanhos de texto** na visão geral (11·14·22·32·52): os 3 contadores de Marcos usam 22 px/300, e o guia §3 reserva 22 ao título do painel (máx. 4 por tela) |
| P3 Navegação e seções | **REPROVA** | Painel Escalas em 390: datas do eixo recortadas em 3–4 px (lê-se "4/03/2026" e "30/09/202") e rótulo de faixa quebrado no meio da palavra ("significativ‑os"; "parcialmente" de 81 px numa caixa de 71 px) |

## 3. P1 · Palco anatômico

### O que passou (com números)
- **Geometria §4.6:** palco 576×600 em 1440, 504×500 em 1280, 404×500 em 1180, 660×500 em 1024 e 358×420 em 390.
- **Alvos do palco (≥44):**
  - 5 botões de camada 44×44 (área clicável 44–46).
  - Aproximar, Afastar e Mudar vista 44×44.
  - Fechar do popover 44×44; "Saiba mais" 103×44; linhas do popover 228×44; linhas da lista por teclado 196×44 (área 196×44).
  - "Remarcar": caixa visível 85×32, **área clicável 86×46** pelo `::after`, conta como 44.
  - Cápsulas de consulta 86–126×48. Em 390 os controles medem 44×46.
- **Tipo:** o palco usa só 11 e 14 px (pesos 400 e 500); o pino do hover usa 14 px.
- **Contraste (p5) com opacidade plena:**
  - "Alergias" e "Sem desfecho" 5,66:1; "Dipirona" e linhas de alerta 17,1:1; "Remarcar" 8,32:1; "3D" 16,3:1; "Concluído" 15,7:1.
  - Datas "16 set" e "07 out" 4,84–5,18:1.
  - Popover 8,3–17,9:1; rótulo do pino ("Cerebelo", hover simulado) 15,9:1.
- **Raios:** só 50%, 999, 28, 26, 18 e 12 px; nenhum fora do token.
- **Cor:** 0 cores fora do token no DOM do palco.
- **Elevação:** 0 elementos com borda + sombra larga. Alertas, cápsulas, botões de vidro e a barra de pílulas usam uma única `--rp-pill-shadow`.
- **Alinhamento:** recuo interno de 16 px (alertas em x=476=460+16; crédito 476–1020; controles terminam em 1020=1036−16). Trilho e controles compartilham a base y=842.
- **Colisão:** 0 pares de elementos de UI do palco se sobrepõem, em 5 larguras e com 3 alertas (Rafael: pilha de 131–191 px).

### Violações (da mais grave à menor)
1. **Cápsula esmaecida por opacidade (contraste).**
   - Medida: botão `pr-visit` ("Retorno em 25/08/2026, Faltou"; não está `disabled`) em `opacity: .4`.
   - Contraste p5 (mediana), Clara: 1440 data 1,68–1,75 (1,71–1,78) e "Faltou" 2,53–2,60 (2,56–2,61); 1280 data 1,72–1,78; 390 "Concluído" 2,58 e "16 set" 1,74. Rafael: 1440 data 1,76 e status 2,60; 1366 1,72 e 2,57; 1280 status 2,57; 1024 1,76 e 2,60; 390 1,74 e 2,57. Em 1180 há 2 (Clara) e 3 (Rafael) cápsulas em `opacity: .4`, mas só uma parcialmente visível; o contraste delas não foi medido.
   - Em 1440 a cápsula está **inteira dentro do palco** (x=481 ≥ 460) e só passa 3 px do trilho (484), mas é esmaecida do mesmo jeito.
   - Regra: texto ≥ 4,5:1 (guia §3).
   - Correção: tirar a `opacity` da cápsula. Se a sugestão de rolagem for desejada, usar `mask-image` em gradiente na borda do trilho. Só cobrir o que está de fato recortado e nunca abaixo de 4,5 no texto visível.
2. **Texto micro sobre o plexo abaixo de 4,5 no pior ponto.**
   - Crédito 11 px `--ink-300`: p5 **4,02–4,14** (mín. 3,24; mediana 4,46–4,6) em 1440, 1280, 1180 e Rafael 1366.
   - "Hoje" 11 px `--blue-600`: p5 **4,26–4,35** (mín. 3,81) em 1440 e 1180.
   - Regra: guia §3, "nunca abaixo de 4,5:1 no vidro: medir sobre o pior ponto do palco".
   - Correção: pôr os dois sobre chip de vidro (`--rp-glass`, como o rótulo do pino a 15,9:1) ou subir o crédito para `--ink-400`.
3. **Elevação declarada duas vezes no popover e na lista por teclado.**
   - `box-shadow` com 5 camadas = `--e-glass` + `--e-2`: duas sombras longas de blur 40 px (`0 16px 40px -18px` a .14 e `0 18px 40px -16px` a .16).
   - Elementos: `.an-popover` (248×244) e `.an-list` (208×264).
   - Regra: elevação declarada uma vez.
   - Correção: um único token (`--e-glass` ou `--e-3`).
4. **Espaço fora da escala no palco.**
   - 6 px de padding vertical nas 3 cápsulas; gap de 6 px nos 3 status; botão de vista com padding lateral de 10 px; "Hoje" com 2 px.
   - Popover com padding **14/10/10/18** (assimétrico); lista com padding 6 e linhas `0 10px` com gap 10.
   - Regra: tokens de espaço. Correção: 4, 8, 12 ou 16.
5. **`z-index` literais 1 a 4 no palco, fora da escada.**
   - 9 elementos: pino 1 (×2), SVG 1, alertas 2, camadas 2, base 2, crédito 2, popover 3, lista 4.
   - Contidos por `isolation: isolate` em `.pr-stage` e `.an-stage`, então não vazam. É violação de tokenização, não de empilhamento.
   - Correção: tokens locais `--z-stage-*` em `tokens.css`, ou ordem do DOM.

## 4. P2 · Colunas (esquerda, direita e pastas)

### O que passou (com números)
- **Grade §4.6:** 340/576/360 em 1440 (gap 20); 300/504/320 em 1280 e 300/404/320 em 1180 (gap 16, escalas em 1 coluna); 300+660 em 1024, com a coluna direita abaixo do palco em grade de 2 (324+324, M‑CHAT 660, Medicações 322 + Marcos 322); 358 em 390.
- **Cards:**
  - Raio 28 em todos (Perfil, Diagnósticos, Perfil sensorial, Medicações, Marcos, 3 escalas e 4 cards de pasta); a pílula "Agendar retorno" tem 999.
  - Sombra única `--rp-pill-shadow`; borda 0. O "Anexar exame" usa um anel inset de `--ink-a06` sem sombra externa.
- **Ritmo vertical:** 16 px entre cards nas duas colunas e 12 px dentro das grades de escalas e pastas.
- **Alvos (≥40):**
  - "Ver todas" 94×46; "Abrir" 66×46 (×2); "7 arquivos" 98×46.
  - Abrir pasta 44×40 (×3); cartão de pasta 142×82; "Anexar exame" 164×217; "Agendar retorno" 340×64.
  - Trilha 300×85; cards de escala 174×294 e 360×245.
- **Contraste (p5, texto de opacidade plena):** mínimo 5,27 (esquerda) e 5,41 (direita) em 1440; 4,91–5,54 entre 1280 e 1024; 5,2–5,8 em 390. Exceção: "Ver todas" teve p5 4,42 em 1 de 6 capturas (mediana 4,83); registrei como observação.
- **Cor:** 0 cores fora do token. Marcas de dado dentro dos tokens: traço `--data-caution` (185,131,0, 3,27:1) e `--data-positive` (26,143,72, 4,07:1); pontos `--data-negative`, `--data-mid` e `--data-strong`.
- **Tipo:** Urbanist em 100% dos nós, pesos 300/400/500.

### Violações (da mais grave à menor)
1. **Quinto tamanho de texto na tela.**
   - Medida: 11, 14, **22**, 32 e 52 px, em 1440, 1280, 1180 e 1024. Os 22 px/300 estão nos 3 `dd.num` de "Marcos do desenvolvimento" (Atingidos 2, Emergentes 1, Atrasados 1).
   - Regra: máx. 4 tamanhos por tela; guia §3 fixa 11·14·32·52 na visão geral e reserva 22 ao título do painel.
   - Em 390 são 4, porque o h1 desce para 22.
   - Correção: contadores em `--t-page` (32, tamanho já existente na tela) ou 14/500.
2. **Recuo interno inconsistente, em zigue‑zague de 4 px na mesma coluna.**
   - Esquerda: Perfil e Diagnósticos com texto em x=120 (padding 20); título das pastas em x=116 (card com padding 12/12/8/12, título a +16); Perfil sensorial de novo em 120.
   - Direita: traço dos cards de escala em x=1072 (padding 16, texto a +26=1082); Medicações e Marcos com título em x=1076 (padding 20).
   - Regra: alinhamento e ritmo (padding 20 nos cards de coluna).
   - Correção: padding `--s-5` (20) em todos os cards das colunas, ou 16 em todos.
3. **Espaço fora da escala.** 21 elementos:
   - `pr-link` com margem −6 (×4); `dd` com margin-top 2 (×6); `dt` com gap 6 (×3); `pr-scale__delta` com padding vertical 2 (×2); `pr-scale__value` com gap 2 (×3); `pr-folder__date` com margin-top 2 (×3).
   - Correção: 4, 8 ou 12; para estender a área de toque usar `::after`.

## 5. P3 · Navegação e seções (barra, pílulas, painel, responsivo)

### O que passou (com números)
- **Pílulas:**
  - 40 px de altura em ≥1024 (área 40–42) e 44 em 390; ativa em `--ink-900`; contraste p5 ≥ 5,05 na barra.
  - A pílula ativa rola para dentro da vista (scrollLeft 59 em 1180, 139 em 1024 e 757 em 390).
  - Barra grudada com `z-index` 100 (`--z-sticky`).
- **Painel, as 8 seções em 1440:**
  - Exatamente 4 tamanhos (11·14·22·32) em todas; contraste p5 do painel ≥ 4,91 (Escalas) e ≥ 4,95 (Exames); mínimo do topo 5,31.
  - Raio 28; `--e-4` mais o realce inset de 1 px; borda 0; blur 24 px.
  - Cabeçalho sticky com `z-index` 100; camada com `z-index` 0.
  - Em 390 o painel é `fixed` com `z-index` 300 (`--z-drawer`) e termina em y=784, exatamente no topo do rail global (sem sobreposição).
- **Alvos no painel:** "Voltar à visão geral" 170×44 (44×44 em 390); "Remarcar" 86×44; "Ver dados" 64×44 (caixa 63×24, `::after`); Reaplicar 92×40; Suspender 40×40; abas internas 40; botões primários 40.
- **Layout §4.6:**
  - 1440 em 340/1fr/360; 1280 e 1180 em 300/1fr/320; 1024 com direita abaixo do palco; 390 em coluna única com palco de 420 px, pílulas coladas e painel em tela cheia.
  - A alergia aparece no topo do palco em todas as larguras e na faixa da barra abaixo de 1024.
- **Tokens:** raios 8/12/18/28/999/50%; 0 cores fora do token (a exceção `rgba(255,255,255,.7)` é do `chip--info`, fora do escopo); 0 pares borda + sombra larga (só `.btn`, fora do escopo).

### Violações (da mais grave à menor)
1. **Painel Escalas em 390: texto recortado e palavra quebrada no meio.**
   - Eixo de datas recortado pelo card (limites 16–374): "14/03/2026" em x=13–67 (3 px), "30/09/2026" em 321–378 (4 px), "23/04/2026" em 12–69 (4 px), "10/09/2026" em 322–377 (3 px). Na tela lê-se "4/03/2026" e "30/09/202". Em 1024 o recorte é de 1 px.
   - Rótulos de faixa: "Critérios parcialmente atendidos" tem caixa de 71 px com palavra de 81 px ("parcialmente"); "Sintomas significativos" tem caixa de 77 px com "significativos" de 77 px, e na tela quebra em "significativ‑os".
   - Regra: alinhamento e tipografia legível; data clínica não pode perder dígito.
   - Correção: `padding-inline` mínimo de ~28 px no card do gráfico em ≤480, ou rótulos de ponta com `text-anchor` start/end; rótulos de faixa em 2 linhas com `overflow-wrap: normal` e `hyphens: none`, ou texto curto.
2. **Alvo do breadcrumb abaixo de 40.**
   - "Pacientes": caixa 58×21, área clicável **60×22** (`elementFromPoint`) em 1440, 1280, 1180 e 1024. Só em 390 o `::after` leva a 60×46.
   - Regra: alvos ≥ 40 (`--touch`).
   - Correção: `::after` com inset −9 px também em ponteiro fino.
3. **Faixa de alergia duplicada em 1024.**
   - Em 1024 a barra tem 116 px (64 px em 1180) porque exibe a faixa `pr-pills__alerts` e, ao mesmo tempo, o palco mostra os mesmos alertas (2 colunas ainda).
   - Guia §4.6: a faixa é só para < 1024.
   - Correção: breakpoint `max-width: 1023px` na faixa.
4. **Espaço fora da escala.**
   - Contagem da pílula com padding 1/7 (×6); gap 6 no status da barra; margem 2 no botão voltar; `ruler` do painel Escalas com padding-top 26 (×3); ícones com margin-top 3,5.
   - Correção: 4, 8, 12 ou 24.

## 6. Tabela consolidada

| # | Peça | Violação | Medida | Regra | Gravidade |
|---|---|---|---|---|---|
| V1 | P1 | Cápsula com `opacity: .4` (botão ativo) | 1,68–1,78:1 (data), 2,53–2,61:1 (status); 1440, 1366, 1280, 1024 e 390 (Clara e Rafael) | contraste ≥ 4,5 | alta |
| V2 | P3 | Painel Escalas em 390: datas cortadas e rótulo quebrado | 3–4 px cortados em 4 rótulos; caixa 71 < palavra 81 | alinhamento, legibilidade | alta |
| V3 | P2 | 5º tamanho de texto (22 px nos contadores de Marcos) | 11·14·22·32·52 em 4 larguras | máx. 4 tamanhos | média-alta |
| V4 | P1 | Crédito e "Hoje" abaixo de 4,5 no pior ponto | p5 4,02–4,14 (mín. 3,24) e 4,26–4,35 (mín. 3,81) | contraste, guia §3 | média |
| V5 | P1 | Popover e lista com duas sombras longas empilhadas | `--e-glass` + `--e-2`, 2 camadas de blur 40 px | elevação declarada uma vez | média |
| V6 | P3 | Breadcrumb "Pacientes" | área clicável 60×22 (≥1024) | alvo ≥ 40 | média |
| V7 | P2 | Recuo interno 16/20/12 misturado na coluna | texto em x=116/120 e 1072/1076 | alinhamento e ritmo | média-baixa |
| V8 | P3 | Faixa de alergia duplicada em 1024 | barra de 116 px contra 64 px; alerta 2× | guia §4.6 | baixa |
| V9 | P1 | Espaço fora da escala | 6, 10 e 14/10/10/18 px (≥ 10 elementos) | tokens de espaço | baixa |
| V10 | P2 | Espaço fora da escala | 2, 6 e −6 px (21 elementos) | tokens de espaço | baixa |
| V11 | P3 | Espaço fora da escala | 1/7, 6, 26 e 3,5 px (≈ 14 elementos) | tokens de espaço | baixa |
| V12 | P1 | `z-index` literais 1 a 4 no palco | 9 elementos, contidos por `isolation` | escada global de z-index | baixa |

**Observações sem reprovação:** "Ver todas" (P2) com p5 de 4,42 numa captura (mediana 4,83); `z-index` 1–3 do GlassFolder isolados; painel em 1024×800 com só 360 px de altura (cabeçalho de 72 px + ~288 px de conteúdo), por consequência do empilhamento barra + pílulas + faixa, sem regra violada.
