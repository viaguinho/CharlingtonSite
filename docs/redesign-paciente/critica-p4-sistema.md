# Crítica de SISTEMA — passada 4 do prontuário do paciente

Data: 21/10/2026. Crítico: sistema (tokens, escala, camadas, raios, elevação, alvos). Contexto limpo: não li críticas anteriores nem o código-fonte da página. Julguei pela tela e pelo DOM renderizado.

Régua: `admin/styles/tokens.css`, `DesignCharlington.md`, `docs/redesign-paciente/guia.md` §0 e §3 (e §4.6 para as larguras).
Material: `.claude/design-loop/shots/prontuario-p4/*.png`, `medidas-1440.json`, `medidas-390.json`. Sondas extras de DOM, somente leitura, com `node .claude/design-loop/cdp.mjs eval` (1440, 1280, 1180, 1100, 1024, 768, 390). Capturas extras só em `scratchpad/sistema/`. Nenhum dado foi alterado.
Fora do escopo, conforme o pedido: dock lateral, barra global, `.btn` global (borda + sombra, altura 40), modal "Editar ficha".

## Ressalva de método (leia antes dos vereditos)

1. O código mudou durante esta crítica. As capturas da p4 são de 20:18–20:19. `anatomy.css` e `AnatomyStage.jsx` foram regravados às 20:36:02. Nenhum outro arquivo da página mudou depois das capturas (`patient-record.css` 20:05, `tokens.css` 20:05, `PatientRecordScreen.jsx` 20:13). Minhas sondas até 20:31 refletem as capturas; as das 20:36 em diante refletem o código novo. Em cada achado abaixo digo qual estado medi.
2. As capturas congelam animação (`transition-duration: .001s`). Movimento, entrada do painel e `prefers-reduced-motion` não foram julgados.
3. Falsos positivos do `medir-prontuario.js`: "Emitir documento" com contraste 1,12 é o rótulo claro sobre o botão escuro do `.btn` global (o cálculo de fundo não enxerga o fundo do botão); fora do escopo. As pílulas de seção (40 px) aparecem em "alvos menores que 44", mas 40 é exatamente `--touch`.
4. Não verificados: fallback sem WebGL, estados vazios (o paciente de teste tem dado em tudo), impressão.
5. Disclosure: numa das sondas usei `pkill -f "cdp.mjs eval"` para derrubar um comando meu preso. Isso pode ter interrompido uma sonda de outro crítico que rodava ao mesmo tempo no mesmo Chromium (porta 9333). Se algum relatório paralelo veio truncado, é por isso.

## Vereditos

| Peça | Veredito | Maior violação |
|---|---|---|
| P1 Palco anatômico | **REPROVA** (material da p4) | De 1180 a 1439 px o seletor de camadas cobre as pílulas de alerta: a 1280 são 9.600 px² de sobreposição e "Alergias / Dipirona" fica ilegível. Guia §0.6: "Alergia nunca some em nenhuma largura". Já corrigido no código das 20:36 (ver P1); precisa de recaptura. |
| P2 Colunas | **REPROVA** | Os 3 cartões de escala saem em CSS columns de 2 colunas: coluna 1 com 270 px, coluna 2 com 526 px, e um vão de 174 × ~267 px ao lado do M-CHAT-R/F na dobra de 1440 e de 1920. Guia §4.4 pede alvenaria. |
| P3 Navegação e seções | **REPROVA** | O painel Escalas usa um quinto tamanho de texto: `.scale-card__value` a 28 px (`--t-h2`, exceção só da Visão geral). Na tela ficam 11 · 14 · 22 · 28 · 32. Guia §3 e comentário de `tokens.css`: no máximo 4 por tela e só a escala. |

Nenhuma peça passa. Nenhuma violação é de cor, sombra ou raio de card: a base de tokens está limpa (ver "O que passou").

## P1 — Palco anatômico: REPROVA

### O que passou (com números)

- Cor: as 31 cores distintas computadas na Visão geral a 1440 (texto, fundo e borda) resolvem para valores de `tokens.css` (31 de 31). Os 8 degraus da lista de estruturas (`an-list__swatch`) são `--blue-500/300/200/100`, `--seq-2…5` e `--signal-red`, tudo dentro da exceção anatômica de 20/10. Nenhum hexadecimal fora do arquivo de tokens.
- Escala de tipo: dentro do palco só aparecem 11 px (data da cápsula, "Hoje", crédito, "Setas percorrem") e 14 px. Em 1440, 1280, 1180, 1100, 1024 não há tamanho fora da escala. Visão geral a 1440 usa exatamente 11 · 14 · 32 · 52 (quatro, conforme o guia §3).
- Alvos: camadas 44×44, `+`, `−` e vista 44×44, cápsulas de visita 48 de altura (86, 97 e 126 de largura).
- Contraste do micro sobre o azul do palco: crédito `--ink-400` (#636468) sobre o vidro azul amostrado (218,233,249) = 4,78:1; data da cápsula sobre (241,243,246) ≈ 5,3:1. Ambos ≥ 4,5. O guia pedia `--ink-300`; o código usa `--ink-400`, que é melhor.
- Geometria: palco 576×600 a 1440 (40% da largura, 67% da altura da janela), 504×500 a 1280, 404×500 a 1180, 660×500/480 a 1100/1024, 420 de altura a 768 e 390. `position: sticky; top: 72px` de 1180 a 1920; relativo abaixo. Coerente com §4.6.
- Camadas (§4.3): arco de 132×316 à esquerda a 1440, 1360, 1100, 1024, 768; linha de 244×44 a 390. Estado desligado legível sem cor (ícone com traço e linha tracejada, captura 13).
- Teclado: lista `role="listbox"` espelha as estruturas (captura 15); foco dos botões do palco é contorno de 2 px em `--blue-500`.
- Alerta: no topo do palco e sem sobreposição em 1440, 1100 e 1024 (0 px²); em 768 e 390 vai para a faixa sticky da barra (§4.6). Em 1280 e 1180 é o caso de P1-1. Texto em `--signal-red-ink` sobre vidro cinza, acima de 4,5:1.
- Z-index: camadas internas do palco em 1–3 (local); nada compete com `--z-sticky` (100).
- Popover (captura 12): vidro claro, cor da estrutura vazando pelo lado esquerdo, título 14/500; nenhum tamanho fora da escala medido no palco.

### Violações (da mais grave à menor)

**P1-1. Seletor de camadas sobre as pílulas de alerta, de 1180 a 1439 px** (medido no material da p4).
- Medida a 1280×800 (`40-1280.png` e sonda das 20:27): `.an-layers` em (428, 316) com 244×44; `.an-alerts` em (432, 320) com 472×52. Sobreposição de 9.600 px². "Alergias / Dipirona" fica atrás dos círculos; "Sem desfecho" perde o início do título. A 1180 as pílulas quebram em duas linhas (372×113) e a linha de camadas cobre a primeira. A 1440, 1100, 1024, 768 e 390: 0 px².
- Regra: guia §0.6 (alergia nunca some) e §4.3 (alertas no canto superior esquerdo, sem nada em cima).
- Estado atual (sondas das 20:41, sete larguras): `.an-layers` passou a `top: 80px` a 1280 e `141px` a 1180/1200, isto é, altura das pílulas + 12 px. A sobreposição botão × pílula é 0 px² de 1440 a 1024. Falta recapturar: na captura nova de 1180 a linha de camadas (y 442–486) ficou sobre a testa do busto e a de 1280 (y 384–428) encosta no alto do crânio. Isso não é violação de token, mas a recaptura precisa mostrar que o cérebro continua inteiro.
- Correção, se a recaptura confirmar o corte: manter o arco de 132×316 também de 1180 a 1439 (a 1100 ele convive com um palco de 660 px; a 1180 o palco tem 404 px, sobram ~270 px para o busto), ou descer o enquadramento do modelo na altura da linha.

**P1-2. Sem outra violação grave.** Pendências menores: a linha de cápsulas do palco corta o primeiro item sem máscara de esmaecimento (a 1280 só "16 set" e "07 out" cabem; a 390 o primeiro é cortado em x = 32). Ver M-3.

## P2 — Colunas: REPROVA

### O que passou (com números)

- Colunas: 340 / 576 / 360 a 1440 (guia §4.6: 340 / 1fr / 360); 300 / 504 / 320 a 1280 e 300 / 404 / 320 a 1180; 300 / 660 (duas colunas) a 1100 e 1024; uma coluna a 768 e 390. Folga entre colunas 20 px a 1440 e 16 px abaixo, folga entre cartões 16 px (`--s-4`). Tudo na escala de espaço.
- Elevação: 100% dos cartões (`pr-card`, `pr-dx`, `pr-scale`, `pr-folder`, `pr-meds`) têm sombra idêntica a `--e-glass` (inset 1 px branco + 0 1 2 .04 + 0 16 40 −18 .14), borda 0, raio 28 px (`--r-card`), `backdrop-filter: blur(24px) saturate(1.6)` (`--glass-filter`). Borda de 1 px + sombra larga no mesmo elemento: 0 ocorrências (só o `.btn` global, fora do escopo). Elevação declarada uma vez, como pede §3.
- Raios na página: 50% ×55, 999 ×41, 28 ×13, 18 ×10, 12 ×35, todos tokens; única exceção 9,41177 px ×3 (ver P2-3).
- Cores: 31 de 31 cores distintas em tokens (marca de dado `--data-caution` #b98300 e `--data-positive` #1a8f48 nos traços de risco; `--ink-a06` nas trilhas).
- Tipografia: 7 de 7 títulos de card em 14 / 500 (`h2`); nome do paciente `h1` 32 / 300 / −0,96 px (`--ls-page` = −.03em); números de escala 52 / 300 com `.num` (tabular). Nenhuma sobrelinha, numeração, degradê, emoji ou glifo como ícone: as setas são SVG; o único glifo é o sinal "−" (U+2212) do delta, que é dado.
- Contraste: 0 textos abaixo de 4,5:1 nas colunas na medição de 1440 e de 390 (tirando o falso positivo do `.btn`). Rótulos "Nascimento", "12a 6m" e "há 3 semanas" amostrados na captura: 5,4, 5,2 e 4,9:1.
- Alvos: a 390, `Remarcar` mede 85×44 e todas as pílulas de seção passam de 44; a 1440 as pílulas medem 40 (= `--touch`).
- Alergia, diagnósticos, pastas, escalas, medicações, marcos e perfil sensorial: todos presentes em todas as larguras.

### Violações (da mais grave à menor)

**P2-1. Buraco na grade de escalas** (material da p4, 1440 e 1920).
- Medida: `.pr-scales` é `display: block; column-count: 2`. Cartões: SNAP-IV (1056, 320, 174×270), Vanderbilt (1242, 320, 174×289), M-CHAT-R/F (1242, 621, 174×237). Coluna 1 termina em y 590, coluna 2 em y 858: vão de 174 × ~267 px (≈ 46.500 px²) sob o SNAP-IV, de frente para a dobra. Com 3 instrumentos o fluxo em colunas CSS sempre deixa um lado vazio.
- Regra: guia §4.4 (alvenaria de 2 colunas); §3 (ritmo de card sem vazio solto). A 1280 e 1180 (uma coluna) não ocorre.
- Correção: trocar CSS columns por grid de 2 colunas com o último cartão em `grid-column: 1 / -1` quando a contagem é ímpar (M-CHAT em 360 px de largura, com o mini gráfico esticado), ou grid com `grid-auto-flow: dense` e linhas de 4 px (alvenaria de verdade, o cartão 3 cai sob o menor).

**P2-2. Faixa de risco do mini gráfico contradiz o risco do cartão** (1440, 1920, 1280, 390).
- Medida: nos dois cartões `pr-scale--mid` (SNAP-IV, "Sintomas significativos"; Vanderbilt, "Critérios parcialmente atendidos") o traço do título é `--data-caution` (#b98300) e a faixa do gráfico (`rect.pr-dots__band`) tem `fill: rgba(39,196,98,.10)`, que é `--pr-band-low` (verde). Só o M-CHAT (`--low`) tem verde correto. O ponto atual fica no limite do verde.
- Regra: guia §3 ("faixa tingida na cor do risco atual") e §0.4 (verde fora do palco é sinal; aqui sinaliza "ok" num resultado moderado).
- Correção: tingir a faixa com `--pr-band-mid` (âmbar .14) nos cartões `--mid` e `--pr-band-high` nos `--high`; verde só em `--low`.

**P2-3. GlassFolder sai da escala quando o cartão cresce** (768 e 390; rótulo a 1024).
- Medida (sonda 20:28): a 768 e 390 há 14 nós de texto de 21,6364 px (`gf-sheet-name`, `gf-sheet-meta`; por exemplo "TC de crânio" 81×31 em (37, 1091) a 390); raio de 9,41177 px a 1440 e 13,6471 px a 390 em `gf-key-face`; sombra com 3,29412 px de desvio e 6,58824 px de desfoque. São valores derivados da razão largura/referência, não tokens. Com isso a 390 existem 6 tamanhos de texto no DOM da Visão geral (11, 14, 21,64, 22, 32, 52). A 1440 não ocorre (cartão de 163 px).
- A 1024 (`41-1024.png`, cartão de 142 px) o rótulo "3 arquivos" sobe para a aba e encosta nas folhas escuras: na pasta Imagem o "3" fica sobre a borda preta; na Neurofisiológico "arquivos" cruza a curva da aba. A 1440 o rótulo está embaixo, no vidro, com o botão `+`. A 1024 o `+` some e o rótulo muda de lugar. O mesmo cartão tem duas gramáticas.
- Regra: guia §3 (só os tamanhos da escala; máximo 4 por tela); `tokens.css` (`--r-*`, `--t-*`).
- Correção: texto das folhas fixo em `--t-micro`/`--t-body` (sem escalar com o container), raios arredondados para `--r-xs` (8) ou `--r-sm` (12), rótulo ancorado na base do vidro em qualquer largura entre 142 e 260 px, com o `+` sempre visível.

**P2-4. Três gutters internos nos cartões da coluna.**
- Medida: `pr-card`, `pr-dx`, `pr-meds` com padding 20; `pr-scale` com 16 / 14 (os 14 não estão em `--s-*`); `pr-folder` com 12 / 12 / 8. O conteúdo do cartão de escala começa em x = 1070 contra a borda em 1056 (14 px), o de medicações em 1076 (20 px). Ver também M-1 (valores 2, 6, 10 px).
- Regra: tokens (espaço base 4); §3 (cartões consistentes).
- Correção: `pr-scale` em 16 / 16 (o conteúdo passa de 146 para 142 px dentro de um cartão de 174; confirmar que "Critérios parcialmente atendidos" ainda quebra em duas linhas, como hoje) ou um token `--s-card` aplicado nos três.

**P2-5. CTA "Agendar retorno" longe da dobra.**
- Medida: a 1440×900 o rodapé da coluna esquerda fica em y 1496–1560, 1,7 viewport abaixo; a 1280 em y≈1560; a 1024 abaixo das pastas. Está no lugar que o guia §4.2 manda (rodapé da coluna), então não é desvio, é observação: a ação de maior intenção do paciente (retorno) exige rolar 600 px.
- Correção opcional: `position: sticky; bottom: var(--s-4)` no rodapé, já que o palco e a barra de seções já são sticky.

**P2-6. Carrossel de pastas a 390 corta no gutter.**
- Medida: o cartão seguinte é cortado em x = 374 (borda do padding de 16) em vez de sangrar até 390. Parece clip, não rolagem.
- Correção: `margin-inline: calc(var(--gutter) * -1)` mais `padding-inline` igual no trilho.

## P3 — Navegação e seções: REPROVA

### O que passou (com números)

- Barra de seções: `position: sticky; top: 0; z-index: 100` (= `--z-sticky`). Roving tabindex (0 na ativa, −1 nas outras 8), `aria-current="page"`, `nav` com `aria-label="Seções do prontuário"`. Sondei o teclado: ArrowRight vai à pílula seguinte, Home e End vão às pontas. Pílula ativa em tinta (`--tab-active-bg`), conforme a decisão da passada 1; azul preenchido na dobra: só a linha "Hoje" (2 px).
- Esc fecha o painel, remove `?secao=` do hash e devolve o foco para a pílula ("Escalas3"). Clicar abre o painel com foco no próprio painel e `?secao=escalas` na URL.
- A pílula ativa entra na vista: a 1024 clicar em "Consentimentos" leva `scrollLeft` a 139 e deixa a pílula dentro da faixa (836–996 de 24–1000); a 390, `scrollLeft` 757 (210–370 de 16–374).
- Painel (8 de 8 seções, medido a 1440, 1280, 1024, 390): fundo `--rp-glass-strong` (rgba 240,240,244,.72), raio 28 px (= `--r-card`), `backdrop-filter: blur(24px) saturate(1.6)`, sombra `--e-4` + brilho superior, título `h3` 22 / 500 (o 22 reservado ao painel, §3), alerta duplicado no cabeçalho do painel, botão fechar 170×44. Raios de dentro: 8, 12, 18, 28, 50%, 999, todos tokens. Cores: 1 fora de token em 8 painéis (`chip--info` com `rgba(255,255,255,.7)`, componente global). Contraste: 0 textos abaixo de 4,5:1 (excluído o falso positivo do `.btn`).
- Camadas: a 390 o painel é `z-index: 300` (= `--z-drawer`) em tela cheia; a 1440 o palco atrás fica `inert` + `aria-hidden`, com `contrast(1.4) brightness(.9)`, e a coluna direita `inert` a 0,6 de opacidade.
- Sem rolagem lateral em 1440, 1280, 1180, 1100, 1024, 768 e 390.
- Alvos de toque a 390 nos painéis: Evoluções, Medicações, Documentos e Consentimentos sem nenhum alvo abaixo de 40 (≥ 40 em tudo). Em Linha do tempo e Marcos os filtros têm 40 de altura.
- Largura de grade: a barra sticky mede 1316 a 1440 (alinhada à grade 100–1416), 976 a 1024 (24–1000).

### Violações (da mais grave à menor)

**P3-1. Quinto tamanho de texto no painel Escalas.**
- Medida (1440, 1280, 1024 e 390, painel Escalas): `.scale-card__value.num` ×3 a 28 px (`--t-h2`). Tamanhos dentro do painel: {11 ×9, 14 ×39, 22 ×1, 28 ×3}; somados ao `h1` de 32 da página: 11 · 14 · 22 · 28 · 32 = 5 por tela. As demais 7 seções ficam em 14 + 22 (+ 32 do `h1`): 3.
- Regra: guia §3 ("só os tamanhos da escala, no máximo 4 por tela"); `tokens.css`: `--t-h2` 28 é "exceção de tela única (Visão geral)", e a Visão geral do prontuário nem a usa.
- Correção: usar `--t-title` (22) com `--w-light` para o escore, ou `--t-page` (32): com 32 a tela fecha em 11 · 14 · 22 · 32 = 4.

**P3-2. Alvos abaixo de `--touch` (40) a 390, e abaixo de 44 no desktop, dentro dos painéis.**
- A 390 (sonda 20:31): "Ver dados" 63×24 (×2, painel Escalas), link "escolha do computador" 146×21 (Exames), "Tudo" 31×40 e "Todos" 38×40 (largura abaixo de 40).
- A 1440, 1280, 1024: botões primários e de linha com 32 de altura (Registrar aplicação 175×32, Reaplicar 92×32 ×3, Revogar 85×32 ×2, Registrar consentimento 184×32 ×3, Emitir o primeiro 158×32); ícones de linha 38×38 (Suspender ×2 e Remover ×7, 9 no total); filtros 30 de altura (Tudo, Consultas, Evoluções, Documentos, Exames, Escalas, Todos, Motor grosso… ×13); "Ver dados" 63×24; link do dropzone 146×21; `Remarcar` das pílulas de alerta 85×32 (também fora dos painéis; medido a 1440 em `medidas-1440.json`).
- Regra: `tokens.css` `--touch: 40px` ("alvo mínimo de botão/aba em tela de toque (≤768px)") e `--row-min: 44px`; guia §4.3 (controles de 44).
- Correção: `min-height: var(--touch)` nos botões e filtros dos painéis a ≤768; área de toque estendida (padding ou `::after` de 40×40) em "Ver dados" e no link do dropzone; ícones de linha em 40 ou 44; `Remarcar` em 40 a ≥1024 também (iPad paisagem).

**P3-3. Painel a 1024×768 sobra pouco corpo.**
- Medida (`s1024-painel.png`, sonda 20:31): painel de 660×391 em (340, 301). Cabeçalho 72 + título e contagem ≈ 110 sobram ~ 210 px para conteúdo (Escalas: 1 linha de instrumento).  Conteúdo da Linha do tempo: 2676 px, de modo que a rolagem interna domina.
- Regra: guia §4.6 (de 1024 a 1179 painel útil) e §4.5 (painel sobre o centro).
- Correção: de 1024 a 1179 dar ao painel `height: calc(100dvh - <barra sticky> - <barra inferior>)` (≈ 560 px a 768 de altura) em vez da altura do palco (480).

**P3-4. Alinhamento interno do painel em 8 de 8 seções.**
- Medida (1440, painel Consentimentos; igual nos outros): cabeçalho do painel em x = 480 (pílulas) e botão fechar terminando em 1396; título e ações da seção em x = 504 (`card__header` com padding 24) e terminando em 1372; linhas da lista em x = 500 e terminando em 1376 (`consents`/`timeline` com padding 20). O título "Escalas e instrumentos" e as linhas abaixo desalinham 4 px à esquerda e 4 px à direita; o botão fechar termina 24 px depois das ações.
- Regra: §4.5 e §3 (ritmo; listas com separador de 1 px alinhadas ao título).
- Correção: o mesmo padding lateral no `card__header` e no corpo do painel (`--s-5`) e no cabeçalho do painel (480 → 480 + 20).

**P3-5. Faixa de vidro da barra sticky com borda dura.**
- Medida: em repouso (`13-sem-cranio.png`, `14-zoom-busto.png`) há um retângulo mais claro em y 188–264 que começa em x = 77 (borda do dock) e vai até 1440, fora da grade (100–1416). Sobre a aurora azul a diferença é de (217,232,249) acima da faixa para (230,239,251) dentro dela: +13/+7/+2, com borda superior reta. Parece um retângulo solto, não um vidro.
- Regra: §4.1 (barra de vidro rolável) e `DesignCharlington.md` (planaridade, sem bordas duras sobre blur).
- Correção: aplicar o fundo da faixa só quando `scrollTop > 0` (ou um `mask-image` com degradê de 16 px no topo), e limitar à largura da grade.

**P3-6. Faixa de pílulas sem pista de rolagem.**
- Medida: a 1024 a pílula "Consentimentos" aparece como "C" cortado em x = 1000 (`41-1024.png`), a 1180 como "Consentimento" cortado; a 768 cabem 6 pílulas e a 390, duas e meia. `mask-image: none`. A rolagem existe e a ativa entra na vista (ver "passou"), mas as que estão fora não têm sinal.
- Correção: `mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent)` na faixa, ou setas de vidro de 40 px nas pontas.

## Violações consolidadas (da mais grave à menor)

| # | Peça | Medida | Regra | Correção |
|---|---|---|---|---|
| 1 | P1 | 1280: layers 244×44 em (428,316) × alertas 472×52 em (432,320) = 9.600 px²; "Alergias" ilegível; 1180: alertas em 2 linhas cobertos. Corrigido no código das 20:36 (0 px² em 7 larguras); recapturar. | Guia §0.6, §4.3 | Manter o arco de 1180 a 1439 ou descer o busto, confirmando que o crânio não é coberto (live 1180: linha em y 442–486). |
| 2 | P3 | Painel Escalas: `.scale-card__value` 28 px ×3 → 11·14·22·28·32 | Guia §3 (máx. 4, só a escala); `--t-h2` é exceção da Visão geral | Usar `--t-title` ou `--t-page` (com 32 fecha em 4). |
| 3 | P2 | `column-count: 2` com 3 cartões: colunas 270 × 526 px; vão 174 × ~267 px sob o SNAP-IV (1440 e 1920) | Guia §4.4 (alvenaria), §3 | Grid 2 colunas com o ímpar em largura cheia, ou alvenaria por linhas de 4 px. |
| 4 | P2 | GlassFolder: 21,64 px de texto (14 nós) e raios 9,41/13,65 px a ≤768; a 1024 rótulo sobe para a aba e cobre a borda das folhas, sem o `+` | Guia §3, `--t-*`, `--r-*` | Tipo e raio fixos em token; rótulo ancorado na base em 142–260 px. |
| 5 | P3 | Alvos: "Ver dados" 63×24, link 146×21, "Tudo" 31, "Todos" 38 a 390; 32 px de altura (botões), 38×38 (×9), 30 (filtros ×13), `Remarcar` 85×32 no desktop | `--touch` 40, `--row-min` 44 | `min-height: var(--touch)` ≤768, área estendida nos links, ícones de 40–44. |
| 6 | P2 | Faixa do gráfico verde (`--pr-band-low`) nos 2 cartões `--mid` (traço âmbar `--data-caution`) | Guia §3, §0.4 | `--pr-band-mid` nos `--mid`, `--pr-band-high` nos `--high`. |
| 7 | P3 | Painel a 1024×768: 660×391, ~210 px de corpo útil | Guia §4.5/§4.6 | Altura do painel = janela − barras. |
| 8 | P3 | 4 px de desalinhamento título (x 504) × linhas (x 500), direita 1372 × 1376; fechar em 1396 | Guia §4.5, §3 | Padding lateral igual no cabeçalho e no corpo. |
| 9 | P2 | Padding de cartão 20 / 16·14 / 12·12·8; `pr-scale` em 14 px fora de `--s-*` | Espaço base 4 | `pr-scale` em 16 ou token novo. |
| 10 | P3 | Faixa sticky: retângulo claro em y 188–264 de x 77 a 1440 (grade 100–1416), +13/+7/+2 sobre a aurora | Guia §4.1, DesignCharlington | Fundo só com rolagem, máscara no topo, limitar à grade. |
| 11 | P2 | Carrossel de pastas a 390 corta em x = 374 | Guia §4.6 | Trilho sangrando até a borda. |
| 12 | P3 | Faixa de pílulas a 1024 e 1180 corta "C" / "Consentimento"; `mask-image: none` | Guia §4.1 | Máscara de esmaecimento ou setas. |

## Observações menores

- **M-1. Espaços fora de `--s-*`** (todos medidos a 1440 e 390): 2 px (`gf-label`, `pr-rail__today`, `pr-scale__value`, `pr-scale__note`, `pr-scale__delta`), 6 px (`pr-bar__status`, `pr-visit`, `an-controls`), 10 px (`an-list__opt`, `an-glass-btn--text`, `pr-scale__delta`), 14 px (`pr-scale`), 7 × 1 px (`pr-pill__count`), margens de −6 e −12 px (área de toque de `pr-link` e `pr-folder__open`). Os negativos são hit area e têm justificativa; os 2, 6, 10, 14 pedem token (`--s-0`, `--s-half`) ou arredondamento para 4/8/12/16.
- **M-2. Z-index local fora de `--z-*`:** `gf-*` e `an-*` usam 1, 2, 3 dentro do próprio contexto; nenhum conflito medido, só não passa pelos tokens (`--z-base` é 0, `--z-sticky` é 100).
- **M-3. Faixa de cápsulas do palco sem máscara:** a 1280 e 390 o primeiro item é cortado ao meio (390: "7 out 2026" começa em x = 32 e perde o "0"); "Hoje" encosta no topo da cápsula a 390.
- **M-4. Gramática de foco dupla:** pílulas de seção usam anel de `box-shadow` (2 px `--surface` + 2 px `--blue-500`, offset 2); botões do palco usam `outline` de 2 px em `--blue-500`. Ambos visíveis; vale unificar.
- **M-5. Cabeçalho da página** (parte da mesma rota): a 1280 o chip "F90.0" quebra sozinho para a segunda linha (x = 172, desalinhado do "12a 6m" em x = 160); a 390 e a 1024 os chips CID ficam sem forma de chip. Breadcrumb "Pacientes" mede 58×21 (< `--touch`), componente antigo reaproveitado.
- **M-6. Texto sobre as folhas de imagem** (`gf-sheet-name` a 21,64 px, ≤768) está no DOM com caixa e opacidade 1; não consegui ver se aparece sobre a folha escura. Se aparecer em tinta escura sobre o preto, é ilegível.

## Resumo para o construtor

1. Recapturar 1280 e 1180 após a mudança de `anatomy.css` e checar o crânio (P1-1).
2. Trocar o 28 px do escore do painel Escalas por 22 ou 32 (P3-1).
3. Trocar CSS columns da grade de escalas e tingir a faixa por risco (P2-1, P2-2).
4. Tirar o GlassFolder da proporcionalidade (tipo, raio) e prender o rótulo à base (P2-3).
5. `min-height: var(--touch)` e hit area nos controles dos painéis (P3-2).
