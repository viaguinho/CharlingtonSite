# Crítica P7 — lente SISTEMA (tokens, tipografia, espaçamento, cor, vidro, alvos, foco, camadas, responsivo)

Crítico de contexto limpo. Pergunta: a tela obedece ao sistema que jurou seguir (`guia.md` §0–§3, `PRODUCT.md`, `tokens.css`) e o sistema é coerente dentro da página?
Método: Chromium headless (porta 9333), `getComputedStyle`/`getBoundingClientRect`, contraste por amostragem de pixels (texto escondido, captura, pior ponto = percentil 5 por linha de texto, descontando texto coberto pelo painel e cortado por overflow), varredura de Tab com captura antes/depois do foco. Paciente principal `16df5f04…`. Larguras 1920, 1440, 1366, 1280, 1180, 1024, 768, 390 × (visão geral + 8 seções), 7 modais (1440 e 390), popover, 23 larguras de fronteira (1920…360, incluindo 1441/1440/1439, 1181/1180/1179, 1025/1024/1023, 769/768/767, 641/640/639, 481/480/479) e cenários extremos em memória (nome longo, vazio, 5 alertas).

Aviso de proveniência: meus scripts e JSONs ficaram no scratchpad, que foi esvaziado na queda do ambiente. Os números abaixo foram lidos antes da perda; as capturas citadas como "(scratch)" não existem mais. Para reproduzir, use `.claude/design-loop/cdp.mjs eval` com `getComputedStyle` nos seletores citados. Onde a evidência ficou sem captura persistida, está dito.

## 0. Incidente de conduta (obrigatório declarar)

Ao sondar a seção Consentimentos cliquei em **"Registrar nova informação"** achando que abria um diálogo. O botão **grava na hora**: o toast "Registro de informação ao responsável salvo." apareceu e a linha passou a mostrar "Responsável informado em 23/10/2026 11:16 · versão 1.0". Foi **um** registro (tratamento clínico / tutela da saúde) para Clara Macedo Farias, na base local de verificação (perfil headless), mais as entradas de auditoria de leitura habituais. Nada foi gravado no painel do dono nem no Supabase. Não cliquei em nenhum outro botão que grave; os 7 modais (emitir documento, adendo, nova evolução, registrar medicação, suspender, registrar aplicação, remarcar) e a prévia de exame foram só abertos e fechados com Esc. Os cenários extremos usaram adaptador em memória com escrita bloqueada. Recomendo reverter esse registro de verificação ao refazer a base.

## 1. Veredito por peça

| Peça | Veredito | Motivo principal |
|---|---|---|
| P1 Palco anatômico | REPROVA | S5 (controles e alertas cobrem o cérebro a 1180 px e com 5 alertas), S2 (Remarcar 31 px), S4 |
| P2 Colunas | REPROVA | S1 (tecla "+" das pastas sem foco visível), S3 (texto abaixo de 4,5:1), S8 (nome de folha cortado e fora da escala no celular) |
| P3 Navegação e seções | REPROVA | S3 (metadados do cabeçalho 4,1–4,3:1 com painel aberto), S2, S18 |
| P4 Faixa e estados | REPROVA | S2 (ação Remarcar com 83×31 px nos estados "sem desfecho/atrasado"); cápsulas em si passam (48 px, tokens, tnum) |

Passam, com medida: nenhuma rolagem horizontal em nenhuma combinação largura×estado (`scrollWidth == innerWidth` nas 23 larguras e nas 9 telas × 8 larguras); nenhum hexadecimal em `patient-record.css`, `anatomy.css`, `glass-folder.css` (grep vazio); máximo de 4 tamanhos de texto visíveis por tela a 1440 (11/14/32/52 na visão geral; 11/14/22/32 nos painéis); azul `#0071e3` preenchido ≤ 1 elemento por dobra; anel de foco ≥ 3:1 em todos os que têm anel (mín. 3,81); sem `backdrop-filter` o contraste continua ≥ 4,5:1 (painel já desfoca o palco por `filter` próprio); 7 modais com campos idênticos (44 px, raio 18, borda 1 px `ink-a08`).

## 2. Inventário medido

**Tamanhos de texto (px)** — visão geral 1440: 11 (12 trechos: contagem das pílulas, data da cápsula, "Hoje", crédito), 14 (148), 32 (h1, `dd.num`), 52 (número da escala). Painéis: + 22 (título da seção). Pesos 300/400/500/600. Linha: corpo 1,5; micro 1,3–1,64; 52 px com 1,0; tracking −0,28 px nos títulos de card. Sem texto < 11 px. Fora da escala: **21,64 px** (`.gf-sheet-name`, `.gf-sheet-meta`) a 768 e 390.

**Espaçamento fora da escala (4·8·12·16·20·24·28·32·40·48·64·80)** — 1 px (padding de contagem de pílula, gap de cápsula, chips), 2 px (`dd.num` margin, gap de `.pr-scale__value`, `.gf-label`, "Hoje", pílula de alergia), 3,5 px (ícone/marca de marco), 6 px (cápsula de consulta, `pr-bar__status`, `dt`, camadas, controles), 7 px (contagem de pílula, lateral), 10 px (opções da lista, botão "3D", `.gf-sheet-head`; rótulo do pino `3px 10px`), 11 px (chip info), 26 px (`.ruler--warning/--success` padding-top), −6 px (`.pr-link` margin, usado para ampliar alvo). Fora do escopo: `main.shell__content` padding-bottom 84 px.

**Raios** — 8, 12, 18, 26, 28, 32 (modal), 50 %, 999, mais frações do componente da pasta (8,35 / 9,41 / 13,65 px em `.gf-key-face`). Cards 28 px (todos ≥ 24). Painel 28 (≥1024) e 28/28/0/0 (≤1023).

**Cores fora de token** — computadas: nenhuma cor de texto/fundo/borda fora do conjunto de tokens (diferenças vistas são compostos de sombra dos próprios tokens). grep: 3 CSS limpos; `charts.css` tem 6 literais (linhas 172, 183, 192, 197, 520, 977: `rgba(255,255,255,.3–.45)` e `rgba(15,16,18,.16/.08)`), ver S19.

**Vidro** — blur(24px) saturate(1.6) em tudo que flutua, exceto `gf-front` blur(22px) saturate(1.5) e `gf-key-face` blur(10px). Fundos distintos: cards gradiente branco .86→.64; controles/alertas/cápsulas/zoom `rgba(240,240,244,.72)`; trilho das pílulas e popover `rgba(246,246,249,.64)`; painel `rgba(255,255,255,.55)` (≥1024) e `rgba(250,250,252,.84)` (≤1023). Nenhum elemento opaco flutua sobre o palco. Existe `@supports not (backdrop-filter…)`.

**Camadas** — painel `fixed` z 300 (≤1023) / `sticky` (≥1024); pílulas `sticky` 100; topbar 210; rail 200/210; toasts 600; palco: pino 1, alertas/camadas/base/popover 2–3. Sem sobreposição indevida entre painel, shell e toasts.

## 3. Achados confirmados (ordem de severidade)

**S1 — GRAVE — P2.** A tecla "+" das pastas (`button.gf-keyhit`, "Adicionar arquivo a Imagem/Neurofisiológico/Pareceres", 44×44) recebe foco por Tab mas **não mostra indicador**: `outline: none`, `box-shadow: none`; diferença de pixels antes/depois do foco = 0–43 px e contraste do pixel mais alterado 1,09–1,21:1 (mín. exigido 3:1). Ocorre nas 9 telas a 1440. Deveria: o mesmo anel de 2 px azul das demais. Reproduzir: Tab até "Adicionar arquivo a Imagem" e comparar com `getComputedStyle(document.activeElement)`.

**S2 — GRAVE — P4/P1/P3.** `button.pr-alert__action` ("Remarcar") mede **83×31 px** (≥768) e **85×32 px** (390), tanto na barra do palco quanto no painel; alvo mínimo 40 (44 no celular). Sonda `elementFromPoint` confirma que não há área de clique extra. Deveria: altura ≥ 40/44. Reproduzir: visão geral ou qualquer seção, `getBoundingClientRect()` do botão.

**S3 — GRAVE — P2/P3.** Texto 14 px abaixo de 4,5:1 no pior ponto (p5) sobre a aurora: `--ink-400` em "12a 7m" 4,17, "23/03/2014" 4,21, "em acompanhamento desde" 4,20, chips "G40.9"/"F90.0" 4,18–4,21, "há 5 semanas" 4,34, "Pacientes" (breadcrumb) 4,11, em 1440/1366/1280/1180/1024 com o painel aberto (a mancha da aurora muda por estado e largura; na visão geral a 1440 passam com 4,5–4,9). Link `button.pr-link` "7 arquivos" (`--blue-600`) 4,23–4,28 (mín. 3,88) na visão geral a 1440/1366/1280. Deveria: ≥ 4,5:1 medido no pior ponto (regra do guia §3 e `PRODUCT.md`). Corrigir escurecendo o tom de apoio da barra ou dando-lhe fundo.

**S5 — GRAVE — P1.** A 1180–1181 px (palco com 404–405 px) a fileira de camadas (5 botões de 44 px, y≈464) e a pilha de alertas cobrem a cabeça e o cérebro, que é o foco do modelo; o arco vira fileira quando o palco cai abaixo de ~500 px. Com 5 alergias + sem desfecho + atrasado + sem consentimento a 1440 a pilha desce até y≈590 e a fileira de camadas passa a cobrir o pescoço. Deveria: o modelo continuar legível; camadas fora da área da cabeça ou pilha recolhida. Evidência: captura 1180 closed e 1440 "alertas" do scratch (perdidas); reproduzir a 1180×800 e com o adaptador em memória.

**S8 — GRAVE — P2 (celular/tablet).** A 768 e 390 px o carrossel de pastas mostra `.gf-sheet-name`/`.gf-sheet-meta` com **21,64 px** (fora da escala 11/14/22/32/52) em caixa de 122–129×32 com `overflow:hidden`/reticências: "RM de crânio com contraste" (269 px em 129), "EEG com privação de sono" (255 em 123), "RM de crânio — controle", "Parecer fonoaudiológico", etc. cortados **sem `title`**. Medido por DOM; não confirmei por captura se o texto está visível na dobra. Deveria: tamanho do corpo (14) e nome completo acessível (title ou quebra).

**S18 — GRAVE — P3 (fora da lente, observado).** "Registrar nova informação" (Consentimentos) grava um registro jurídico (base legal, versão 1.0) com um clique, sem confirmação nem desfazer; só aparece um toast. Ver §0.

**S4 — MENOR — P1/P2.** Largura do palco não é monótona: 590 px a 1366, **663 px a 1439** (grade 300/1fr/320) e **576 px a 1440** (grade 340/1fr/360), 577 a 1441; só volta a 663 perto de 1527 px. O herói é menor na largura-alvo do consultório do que 1 px abaixo.

**S6 — MENOR — P3/P1 (celular).** A 390 px: botões de camada e de vista 43×43 (< 44); `tabs__item` 40 px de altura; `btn--sm` 40 px (global, fora de escopo); `icon-btn` "Suspender"/"Remover" 40×40. O próprio token `--touch` é 40, mas a régua do projeto pede 44 no celular.

**S7 — MENOR — P3.** "Ver dados" (`chart__data-toggle`) 63×24 em desktop (34 de área efetiva a 390); breadcrumb "Pacientes" 58×21 a 768 e 390.

**S9 — MENOR — P4/P3.** `span.ruler__tip` ("Sintomas significativos") em 11 px: é o que qualifica o número, e o guia manda corpo 14 em `--ink-400`. Datas de eixo (`is-first/is-last`) em 11 px são apoio, ok.

**S10 — MENOR — P2/P3/P4.** `tabular-nums` aplicado por classe `.num`, não por regra: `07/10/2026 10:00` (`.pr-alert__nowrap`), `22/07/2026` (`.pr-meds__since`, `.med__since`), `timeline__time`, `consent__meta`, chips de CID, "3 arquivos" e "3D" ficam sem; `23/03/2014` e a data das pastas têm. Mesma natureza (data), duas aparências.

**S11 — MENOR — todas.** Lista de espaçamentos fora da escala no §2 (1, 2, 3,5, 6, 7, 10, 11, 26, −6 px).

**S12 — MENOR — todas.** Anel de foco em 5 estilos: contorno 2 px azul com `outline-offset` de **1** (links, abrir pasta, Remarcar), **2** (botões), **3** (voltar), **4** (trilha); pílula ativa usa duplo `box-shadow` 2+2 px com `outline: none`; `gf-hit` não tem anel (só o levantar da pasta, contraste de pixel 15:1); `input.sr-only` (arquivo, seção Exames) recebe foco com anel em elemento de 1×1 px, invisível.

**S13 — MENOR — todas.** Vidro do mesmo papel (superfície que flutua) com receitas diferentes: popover usa `rgba(246,246,249,.64)` e não o `--rp-glass-strong` (.72) que o guia pede; o painel muda de receita por largura (.55 branco ≥1024; .84 ≤1023) e o painel de maior carga de texto é o mais translúcido; pasta com blur 22/150 % e tecla com blur 10 px; cápsulas da faixa e controles do palco em .72, trilho das pílulas em .64.

**S14 — MENOR — P2.** "Anexar exame" (`.pr-folder--add`) e a pílula "Agendar retorno" (`.pr-next--empty`) usam anel inset de 1 px em vez da sombra de vidro dos cards vizinhos: dois blocos irmãos com elevação diferente. Botão secundário global (`--e-1` + borda 1 px) ao lado do botão de voltar de vidro (`--e-glass`): observação, `.btn` é fora de escopo.

**S15 — MENOR — P2/P3.** Raios: modal 32 (`--r-xl`) × painel 28; alertas 26; blocos de marcos 18 dentro de card de 28 com padding 20 (regra do tokens: o interno desce em degraus, aqui o interno é maior que o padding permitiria); teclas da pasta com raios fracionários.

**S16 — MENOR — P3.** De 1024 a 1179 px, com painel aberto, "Alergias · Dipirona" aparece duas vezes na mesma dobra (faixa sob as pílulas e cabeçalho do painel).

**S17 — MENOR — P1/P3.** Os `modal` são opacos (`rgb(255,255,255)`, sem blur) enquanto o resto do que flutua é vidro; empilhamento do palco usa 1/2/3 soltos em vez dos tokens `--z-*`.

**S19 — MENOR — P2 (suspeita de uso).** `charts.css` (alterado na árvore, usado pelo painel de Escalas) tem 6 literais `rgba(...)` fora de `tokens.css`; não confirmei qual deles é renderizado no prontuário.

## 4. Suspeitas (não confirmadas)

- Contraste 2,87:1 em `p.chart__note` ("Poucos registros…", Escalas a 1280/1180), 3,09:1 em "Linguagem · Atingido · 12/02/2026" (Marcos a 1366): vieram de uma passada sem tratamento de corte por overflow; o mesmo padrão em Exames a 1440 (3,17–3,2) **desapareceu** ao tratar o corte (era a sombra do painel sob texto cortado). Confirmar rolando o painel até o item e medindo o pixel de fundo.
- Modal "Emitir documento": 3 textos < 4,5:1 a 1440 e 1 a 390; a lista se perdeu. Confirmar medindo textos de `.modal--full`.
- Ícones (peso de traço, tamanhos, alinhamento ótico) e `alt` de imagens: coletei o inventário, mas não o analisei antes da queda. Não opino.
- Texto "Saiba mais" do popover e altura 44 px do botão: ok; popover cobre o lado direito do busto a 1440 (observação P1).

## 5. Observações (não são defeito)

Pastas abaixo da primeira dobra a 1440×900 (decisão pendente do dono). Alergia presente em todas as larguras. Cenários extremos a 1440: nome social+registro longos quebram em duas linhas sem estourar; 12 escalas, 10 medicações, 16 exames, 95 evoluções, 185 consultas e contadores de pílula ("17 a emitir", "95") sem corte nem rolagem horizontal; estado vazio mostra 11/14/32 px. Pílulas rolam com máscara de esmaecimento quando excedem (≤1279); sem excesso não há máscara. Fronteiras: 1179→1180 coluna direita sobe/desce sem quebra; 640/641 escalas passam de 1 para 2 colunas; 480/481 não muda nada por viewport (o crédito do modelo troca por container, abaixo de ~500 px de palco).

## 6. Contagem

GRAVE 6 (S1, S2, S3, S5, S8, S18) · MENOR 13 (S4, S6, S7, S9–S17, S19) · BLOQUEIA 0 · Suspeitas 4.
