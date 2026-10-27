# Crítica P8 — lente SISTEMA DE DESIGN (contexto limpo)

Data: 2026-10-26 · Tela: `#/pacientes/<id>` em `http://localhost:5173/admin.html` · Crítico: sonnet, contexto limpo.

## Método

- Referências lidas: `admin/styles/tokens.css`, `DesignCharlington.md`, `docs/redesign-paciente/guia.md` (§0, §3 e o resto de leitura), `docs/redesign-paciente/bar.md`, `patient-record.css`, `anatomy.css`, `overlays.css` e os trechos de `patients.css` citados. Não li `design-loop.md`, `critica-p*.md`, registros de conflitos, histórico git nem notas do Obsidian.
- Ferramenta: `.claude/design-loop/cdp.mjs` (shot e eval) e uma cópia da biblioteca dele na pasta de trabalho, com: Tab real por `Input.dispatchKeyEvent` (anéis de foco), mouse real por `Input.dispatchMouseEvent` (hover e clique), `elementFromPoint` em grade (área clicável), contraste calculado por amostragem de pixels da captura (fundo = mediana dos pixels mais afastados da cor do texto; textos recortados por `overflow` e ocultos foram descartados), 8 seções do painel, 7 diálogos abertos e fechados sem gravar, Clara, Rafael e Gael (Gael só para ver o aviso de documentos a emitir).
- Larguras: 1440×900, 1280×800, 390×844 (com emulação de toque, que o `cdp.mjs` liga em ≤480) e 1024×768 com toque (variável `TOUCH=1` na minha cópia da biblioteca).
- Capturas: `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/sistema/shots/` (os scripts de medição estão na pasta acima dela, `.../p8/sistema/*.js` e `*.mjs`).
- Nenhum botão que grava foi clicado. Nenhum 429 nem limite de sessão durante o trabalho.

### O que NÃO consegui testar

- Estados de erro de validação, desabilitado e toast: exigem clicar em botão que grava.
- Diálogos de envio de anexo (precisa de arquivo), prévia de anexo, Suspender medicação, Remover anexo e Revogar consentimento. Os diálogos abertos foram: Nova evolução, Adicionar adendo, Registrar aplicação, Registrar medicação, "Registrar nova informação" (consentimento), Emitir documento e Remarcar.
- A pílula azul "Próxima: …" renderizada com dado real: nenhum paciente de seed tem retorno futuro (só "Teste Crítico P8 Dados", com consulta atrasada hoje, que não abri). Medi o CSS real em um nó sintético (ver suspeitas).
- WebGL indisponível, `prefers-reduced-motion`, `forced-colors`, impressão, 1920 e a faixa 1180–1279.
- O verde de `.timeline__mark--documento` só por CSS (nenhum seed tem documento emitido).
- Carregando: vi apenas o esqueleto do 1440 (quadros a 60 ms).

## Vereditos

| Peça | Veredito | Motivo |
|---|---|---|
| P1 Palco anatômico | REPROVA | S8-1 (BLOQUEIA): em tela de toque os botões de camada saem do lugar; no celular 2 de 5 não recebem toque e o do coração cai fora do palco sobre o cabeçalho de Escalas. O resto (alertas, popover, controles a 1440) segue o sistema. |
| P2 Colunas | REPROVA | S8-2 (a seta ↗ de cada pasta tem o centro coberto pela pasta e o clique não faz nada) e S8-6 (quatro receitas de chamada para ação nos estados vazios da mesma coluna). Cartões, tipografia e tokens estão sólidos. |
| P3 Seções e diálogos | REPROVA | S8-3 (âmbar e verde como cor de categoria na linha do tempo), S8-4 (gramática de estado contraditória nas seções), S8-5 (botão Cancelar cortado no diálogo de evolução a 390) e S8-7 (faixa âmbar com `rgba` fora dos tokens). |
| P4 Faixa de consultas e estados | REPROVA | A faixa em si está alinhada (cápsulas e controles na mesma linha de base a 1440, 1280 e 1024), mas os estados falham: S8-6 (vazios) e S8-18 (esqueleto de carregamento não tem a forma das 3 colunas, como o guia §7 exige). No celular a faixa e o botão de camada se sobrepõem (causa em S8-1). |

Placar: 1 BLOQUEIA, 6 GRAVE, 16 MENOR, 2 suspeitas.

---

## BLOQUEIA

### S8-1 · Botões de camada fora do lugar em ponteiro de toque (celular e tablet)

- Onde: P1 (`.an-layers__btn`), com efeito em P4 (faixa de consultas coberta) e em P2 (cai sobre o cabeçalho "Escalas").
- Evidência medida (390×844, toque ligado, Clara):
  - `data-layers="column"`, mas cada botão mantém `style="left: 80.07px; top: 53.6px"` etc. (coordenadas do arco) e o `position` computado é `relative`, não `static`.
  - Posições reais: Cérebro y 960–1000, Crânio 1052–1092, Vasos 1152–1192, Coluna e medula 1252–1292, Coração 1345–1385; o palco termina em y 1322. O Coração fica 63 px fora do palco, em cima de `.pr-insights__head` ("Escalas · Ver todas").
  - `elementFromPoint` em grade 7×7: Cérebro, Crânio e Vasos 100%; Coluna e medula 14% (o centro cai em `.pr-visit__status`, a cápsula "Concluído" cobre o botão); Coração 0% (o centro cai em `.pr-insights__head`).
  - 1024×768 com toque: `data-layers="column"`, x 392–432 (deveria ser 352 em coluna reta), Coração bottom 916 contra palco bottom 913.
  - Causa localizada: `anatomy.css:727-731` (`@media (pointer: coarse) { .an-stage[data-layers="column"] .an-layers__btn { position: relative } }`) soma o `left/top` inline do arco ao fluxo da coluna; o modo coluna de `anatomy.css:682-684` assume `position: static`.
- Deveria: camadas empilhadas em coluna reta dentro do palco, 40 px (alvo estendido a 44 px por `::before`), sem cobrir a faixa de consultas (guia §4.3, bar.md #5/#7; escada de camadas `--an-z-float` única para alertas, camadas e base).
- Reproduzir: `TOUCH=1 node coarse.mjs 1024 768` ou `node .claude/design-loop/cdp.mjs shot '#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3' x.png --w 390 --h 844 --eval "await __sleep(4500); document.getElementById('conteudo').scrollTo(0,800)"`. Capturas: `m390-stage.png`, `m390-b.png`, `coarse-1024.png`.

---

## GRAVE

### S8-2 · A seta ↗ das pastas tem o centro coberto pela pasta

- Onde: P2, `.pr-folder__open` (3 cards em Clara).
- Evidência medida: 1440: botão 44×44 em (216,464); em grade 11×11, só 40% dos pontos chegam ao botão, 54 de 121 caem em `.gf-root` e o centro (238,486) também. Clique real com `Input.dispatchMouseEvent` no centro: o hash não muda e nada abre. 390: 65% clicável. `.gf-root` é `position: relative; z-index: auto` e entra por baixo do botão por causa de `.pr-folder__stage { margin-top: calc(var(--s-3) * -1) }` (`patient-record.css:439`); o botão é `position: static` em ≥769 px (a regra `position: relative` só vale em ≤768, `patient-record.css:1137`).
- Deveria: ação ↗ à direita do título, tocável em toda a área de 44 px (guia §4.2.3, bar.md #6; ordem de empilhamento definida, não por acaso).
- Reproduzir: `node hit2.mjs 1440 900` e `node clickfolder.mjs` (scripts da pasta de trabalho). Captura: `click-folder-open.png`.

### S8-3 · Linha do tempo usa âmbar (e verde) como cor de categoria

- Onde: P3, painel Linha do tempo (`.timeline__mark--escala`, `.timeline__mark--documento`).
- Evidência medida: `.timeline__mark--escala` computa `background rgba(241,179,28,.12)` e `color rgb(118,84,0)` em todas as linhas de escala (7 dos 20 registros de Clara); `patients.css:336-337` ainda define `--documento` com `--signal-green-bg/ink`. Marcas de consulta, evolução, exame e medicação são cinza neutro. Uma escala aplicada não é um estado de atenção.
- Deveria: guia §0.4 e `tokens.css` ("Sinais — uso exclusivamente semântico, nunca decorativo"): fora do palco 3D, âmbar e verde são sinal. Categoria diferencia-se por ícone, em neutro.
- Reproduzir: `node cdp.mjs eval '#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3?secao=linha-do-tempo' tl.js --w 1440 --h 900`. Captura: `p-linha-do-tempo.png`.

### S8-4 · Estado codificado de quatro formas, com gravidade contraditória

- Onde: P3 (Consentimentos, Linha do tempo, Marcos) e P4 (pílulas de alerta).
- Evidência medida (Rafael, Consentimentos): a mesma condição "sem consentimento de teleconsulta" aparece como pílula âmbar no topo (`.pr-alert--warning`, texto `rgb(118,84,0)`) e como vermelho nas linhas (`.consent__state.is-danger` com traço `rgb(217,67,47)` e texto `rgb(179,47,32)`, mais `chip--danger` com `rgba(234,78,61,.1)` e uma faixa `chip--danger chip--wrap` de 597×28, radius 18). As outras 4 linhas têm um chip `chip--warning` âmbar idêntico ("Consentimento do responsável (art. 14, § 1º)") ao lado de "Não registrado" cinza, e uma linha tem `chip--info`. O mesmo texto do chip muda de cor (âmbar, vermelho, cinza, branco) sem mudar de significado.
  - Codificações de estado medidas só no painel: traço de 2×14 px (Consentimentos), chip tingido de 24 px (Linha do tempo: `chip--danger` "Sem desfecho registrado", "Faltou"), disco sólido saturado de 20 px com ícone branco (Marcos: `milestone__mark` `rgb(217,67,47)`, `rgb(185,131,0)`, `rgb(26,143,72)`) e ponto de 7 px (faixa de consultas). A visão geral usa ainda traço de 2 px nos cards e pontos nos diagnósticos.
- Deveria: `patient-record.css:934-938` define o contrato do painel ("estado vira marca (traço de 2px) ou rótulo, nunca cartão tingido") e guia §3 ("uma gramática só"); a mesma condição tem uma só cor de gravidade.
- Reproduzir: `node cdp.mjs eval '#/pacientes/4579401a-c511-4131-a339-7588293467c6?secao=consentimentos' <script de consent> --w 1440 --h 900`; capturas `r-consent.png`, `p-marcos-b.png`, `p-linha-do-tempo.png`.

### S8-5 · Diálogo "Nova evolução clínica" corta o botão Cancelar a 390

- Onde: P3, rodapé do diálogo.
- Evidência medida (390×844): modal x 12–378; botões do rodapé: Cancelar −49,3→48,5, Salvar rascunho 56,5→197,8, Assinar e travar 205,8→353. Os 3 botões somam ~402 px num rodapé útil de 318 px (padding 24); `justify-content: flex-end` empurra o primeiro para fora e `.modal { overflow: hidden }` o recorta: só "lar" aparece. (Registrar medicação, Remarcar e Emitir documento a 390 cabem.)
- Deveria: rodapé que quebra linha ou empilha em largura estreita; nenhum botão de um diálogo que grava fica fora da tela.
- Reproduzir: `node dialogs.mjs 390 844 390 evolucao`. Captura: `dlg-390-evolucao.png`.

### S8-6 · Quatro receitas de "estado vazio com ação" na mesma coluna

- Onde: P2 e P4 (estados), Rafael a 1440 (sem escala, sem medicação, sem marco, sem exame, sem retorno).
- Evidência medida: Escalas = texto + pílula preta `.pr-action` "Aplicar escala"; Medicações e Marcos = só texto, com o link "Registrar +" azul no cabeçalho; Exames = cartão tracejado de `inset 1px` com tile quadrado de 44 px (raio 12) e "Anexar exame"; Retorno = pílula de 64 px azul clara (`--blue-050`, anel `--blue-100`) "Agendar retorno". Cabeçalhos também variam: "Escalas · Abrir ↗" (vazio) contra "Escalas · Ver todas ↗" (com dado) e "Registrar +".
- Deveria: bar.md #4 (um acento só) e guia §7 (estado vazio honesto e com ação): uma receita única de vazio, com a ação no mesmo lugar.
- Reproduzir: `node run1.mjs '#/pacientes/4579401a-c511-4131-a339-7588293467c6' 1440 900 shots/r1440`. Capturas: `r1440.png`, `r1440-y700.png`.

### S8-7 · Faixa âmbar de "laudos a emitir": cor fora dos tokens e cartão tingido no painel

- Onde: P3, painel Documentos (`.ops-alert`, `DocumentsView.jsx:104`, CSS em `patients.css:742-756`).
- Evidência medida (Gael): `background-image: linear-gradient(100deg, rgba(255,236,200,.92), rgba(255,246,228,.78))` (valores literais, também `rgba(255,222,222,…)` no `--danger`), borda de 1 px `rgba(255,255,255,.92)` somada a sombra larga, raio 26 (não 28), texto em peso 600, 916×96. Ocupa a faixa x 480–1396, enquanto título, linhas e botão da seção ficam em 500–1376 (ver S8-8). O `.consent-warning` usa a mesma regra.
- Deveria: `tokens.css` ("Única fonte de verdade para cor… Nenhum hexadecimal fora deste arquivo"), guia §0.3 (cor nova vira token), panel grammar ("nunca cartão tingido") e bar.md #5 (sem borda de 1 px somada a sombra larga). Pílula de alerta no mesmo padrão `.pr-alert--warning`.
- Reproduzir: `node cdp.mjs eval '#/pacientes/dfd69e7d-2489-4a94-b545-6ec89a77ef52?secao=documentos' banner.js --w 1440 --h 900`. Captura: `gael-docs.png`.

---

## MENOR

### S8-8 · Margem esquerda do painel em duas colunas

- Evidência: em todas as seções, cabeçalho (pílula de alergia), título, linhas, zona de soltar e botões começam em x 500 e terminam em 1376; a segunda fileira de estados (`.pr-panel__states`) e a faixa `.ops-alert` ocupam 480–1396 (20 px para fora). Confirmado em Linha do tempo, Evoluções, Exames, Consentimentos e Documentos; a 390 as pílulas começam em 16 e o título em 36. O comentário de `patient-record.css:824-825` diz que "pílulas, título, linhas e × começam e terminam juntos".
- Deveria: uma só borda de conteúdo (`--s-5` + `--s-5`).
- Reproduzir: `edges.js` nas 5 seções.

### S8-9 · Rótulos dos diálogos em eyebrow

- Evidência: `.field__label` computa 11px, peso 600, `text-transform: uppercase`, `letter-spacing: 0.88px` (`--ls-eyebrow`), cor `rgb(99,100,104)`, nos 6 diálogos com campo (todos menos o de consentimento). O painel da mesma tela força `.soap__label` e subtítulos de grupo em 14px, sentence case, sem sobrelinha.
- Deveria: guia §3 (proibido sobrelinha/eyebrow) e `DesignCharlington.md` (sentence case, "não force caixa alta"); tokens.css só prevê caixa alta para sobrelinha e cabeçalho de tabela. É estilo global do formulário (também usado na ficha, fora do escopo): decisão do sistema, não só da página.

### S8-10 · Peso 600 e títulos de instrumento em dois pesos

- Evidência: a visão geral usa só 300, 400 e 500. Aparece 600 em: título e valores do popover (`.an-pop__title`, `.an-pop__val`), `h4` do instrumento no painel Escalas (SNAP-IV 600 no painel contra 500 no card `pr-scale__title`), letras SOAP, rótulos de formulário, `strong` do aviso de marcos.
- Deveria: guia §3 ("Títulos de card em `--t-body`, `--w-medium`").

### S8-11 · Ícones: cinco tamanhos e traço renderizado de 0,55 a 1,25 px

- Evidência: todos com `stroke-width 1.5` em viewBox 24, renderizados a 12, 14, 16, 18 e 20 px, e o "+" da pasta a 8,3 px com `stroke 1.6` (≈0,55 px de traço). Três botões de 44 px na mesma tela usam ícone de tamanhos diferentes: voltar 18, abrir pasta 16, camadas e zoom 20. Traço efetivo: 0,88 px (14), 1,0 (16), 1,13 (18), 1,25 (20).
- Deveria: um passo de tamanho por contexto (inline 14, botão 16 ou 20, não os dois) e traço visual constante.

### S8-12 · Anel de foco e hover sem receita única

- Evidência (Tab real, 32 paradas): `outline 2px --blue-500` com `outline-offset` 1 (links, ↗, Remarcar), 2 (maioria), 3 (voltar), 4 (`.pr-trail`); pílula de seção e `.pr-action` sem outline e com anel duplo em `box-shadow` (`0 0 0 2px --surface, 0 0 0 4px --blue-500`); pasta com a mesma receita de duplo anel via `:has()`. Hover (mouse real): `translateY(-2px)` + sombra (escala, cápsula), `translateX(-2px)` (voltar), tinta de fundo (pílula `--ink-a06`, link `--blue-a08`, `.pr-folder--add`), só sombra (botões de vidro e camadas), nada no `.pr-card`.
- Deveria: um anel de foco e uma linguagem de hover por tipo de controle (tokens.css lista só `--dur-*` e `--ease`).

### S8-13 · Famílias de vidro e de raio

- Evidência: vidro de cartão = gradiente 0,86→0,64; pílulas, cápsulas, camadas e controles = `rgba(240,240,244,.72)` (`--rp-glass-strong`); faixa de pílulas, popover e lista de estruturas = `rgba(246,246,249,.64)` (`--rp-glass`); painel = `rgba(255,255,255,.55)` mais cabeçalho opaco; modal opaco. Superfícies grandes: cartão e painel 28 px, popover e lista 26 px, modal 32 px, `.ops-alert` 26 px, dropzone 18 px. O guia pede popover em `--rp-glass-strong` (§3).
- Deveria: bar.md #5 e guia §3 (uma receita de vidro, raio de cartão `--r-card`).

### S8-14 · Espaçamento fora da escala

- Evidência: `anatomy.css` tem 50 declarações de `padding/margin/gap/top/left/right/bottom` em px literal e nenhuma com `--s-*`; `patient-record.css` 11 contra 64 em token. Valores fora da base 4: 3, 5, 6, 7, 10, 14 e 18 px (`padding: 14px 10px 10px 18px` no popover, `padding: 5px` na cápsula, `gap: 6px`). `.timeline__mark` fixo em 27 px; "ícone em círculo" mede 26 (alerta), 27 (linha do tempo), 28 (medicação). Sombra azul própria `0 14px 30px -14px var(--blue-a24)` em `.pr-next` fora de `--e-*`.
- Deveria: `tokens.css` (espaço, sombra e raio em uma só fonte).

### S8-15 · Token redefinido na página e tokens mortos

- Evidência: `.pr { --ink-400: var(--ink-500); --glass-filter: blur(16px) … }` (`patient-record.css:94-99`): o texto secundário computa `rgb(85,86,90)` na página e `rgb(99,100,104)` nos diálogos (fora de `.pr`); o desfoque é 16 px (token: 24). `--pr-panel-filter` é declarado e nunca usado; `--anat-nervo` (âmbar) segue em `tokens.css:437` e `estruturas.js:197` mantém a estrutura `nervos` como `opcional`, embora nenhuma camada a mostre.
- Deveria: um nome de token, um valor; sobras removidas.

### S8-16 · Azul em marcador que não é interação

- Evidência: "Hoje" (rótulo `--blue-700` e traço `--blue-500` de 1×32 px na faixa de consultas) e o traço de hoje da trilha do perfil (`.pr-trail__today`, `--blue-500`) são azuis e não clicáveis.
- Deveria: `DesignCharlington.md` (azul "reservado para indicar interação") e guia §3 ("azul não é estado"); marcador de hoje em tinta.

### S8-17 · Corpo micro em data de item e frase de apoio

- Evidência: `.pr-visit__date` (11 px) é a data completa de um item de lista ("25 ago 2026"); `.an-pop__label` é uma frase de duas linhas em 11 px ("Exames do paciente que costumam avaliar esta região").
- Deveria: `tokens.css:126-129` (micro nunca qualifica um número nem é data de item de lista: isso é corpo, `--ink-400`). O guia §3 permite só "o mês da faixa de consultas": regras divergentes.

### S8-18 · Esqueleto de carregamento sem a forma da página

- Evidência: quadro a 60 ms: título, dois botões, um cartão largo de ~240 px, uma barra fina e outro cartão largo, em uma coluna de 1316 px; 160 ms depois entra a grade de 3 colunas (340 / 576 / 360).
- Deveria: guia §7 ("esqueleto na forma das 3 colunas"). Captura: `load-1440-0.png`.

### S8-19 · Mesma coisa em duas formas entre visão geral, painel e diálogos

- Evidência: aviso de alergia = pílula de vidro neutra com texto vermelho (palco e cabeçalho do painel) e barra cheia `rgba(234,78,61,.1)` de raio 18 nos diálogos (`.pr-rx-allergy`); ícone de medicação = círculo de 28 px na visão geral e quadrado de raio 8 no painel; marcas de ícone em círculo (linha do tempo, Marcos) contra quadrado de raio 8 (Exames, medicação, letras SOAP); faixa verde do gráfico de pontos em todo card de escala (inclusive os de tique âmbar).
- Deveria: um desenho por entidade; a faixa só em verde se o resultado for baixo risco (a nota de `patient-record.css:646` declara "intervalo esperado": a cor lê "tudo bem" sob tique âmbar).

### S8-20 · Camada desligada com ícone abaixo de 3:1 (cálculo)

- Evidência: `.an-layers__btn:not(.is-on) svg { opacity: .55 }` sobre `--ink-500`: ≈2,5:1 contra o vidro (cálculo a partir dos computados `color rgb(85,86,90)`, `opacity .55`, fundo ≈ `rgb(252,253,253)`). O estado já é dito por anel tracejado e risco; o risco (1,5 px, `--ink-600`) pesa mais que o ícone.
- Deveria: 3:1 para o glifo de um controle (não é desabilitado).

### S8-21 · Rodapé do diálogo e alvo de fechar

- Evidência (1440): rodapé com padding `16px 24px` contra corpo e cabeçalho `20px`; borda direita do último botão em x 1005 (Registrar medicação) contra campos terminando em 1009: 4 px de desalinhamento. Botão × do modal `icon-btn--square` 38×38 (1440), 40×40 (390), contra 44 px do × do painel e dos demais alvos da página.
- Deveria: bordas alinhadas (`--s-5`) e alvos de 44 px do prontuário (`--touch` 40 é o piso do sistema).

### S8-22 · Combobox abre sozinho e cobre o rótulo seguinte

- Evidência: em Nova evolução clínica o `autoFocus` abre a lista "Selecione a consulta correspondente" e ela cobre o rótulo "S — Subjetivo" (captura `dlg-1440-evolucao.png`, `dlg-390-evolucao.png`).
- Deveria: foco no campo sem lista aberta; a lista abre ao digitar ou ao clicar.

### S8-23 · Cápsulas das datas e cantos cortados no celular

- Evidência (390): a primeira cápsula da faixa está em x −75…11 e a segunda em 19…116; o texto "et 2026 / Concluído" aparece cortado no limite do esmaecimento de 24 px (a máscara esconde só o início). Rafael a 1440 tem "3 set 2026" cortado do mesmo modo.
- Deveria: a cápsula cortada pelo esmaecimento é intencional (comentário em `patient-record.css:725`), mas o corte deixa o "3" e o "s" soltos; recuar o scroll-padding para a primeira cápsula inteira ou esmaecer por inteiro.

---

## Suspeitas (não reproduzidas com dado real)

1. `.pr-next` (pílula azul "Próxima: …"): `.pr-next__label` e o último `span` usam `--blue-050` sobre `--blue-500`. Em nó sintético com as classes reais, computa `rgb(232,242,253)` sobre `rgb(0,113,227)` = 4,15:1 em 14 px, peso 400 (abaixo de 4,5:1). A sombra azul própria também sai de `--e-*`. Alta confiança; falta um paciente de seed com retorno futuro para ver renderizado. Se confirmado, sobe para GRAVE (guia §3: rótulos nunca abaixo de 4,5:1).
2. Popover aberto no celular: não o abri a 390, então não medi se ele cobre a faixa de camadas deslocada por S8-1.

## O que está bom

- Escala de tipo respeitada: visão geral 11 · 14 · 32 · 52, painel 11 · 14 · 22 · 32, diálogos 11 · 14 · 22. Nenhum texto abaixo de 11 px (o 6–10 px do diálogo de documento é o papel timbrado, fora do escopo). Pesos 300, 400, 500 na visão geral.
- Nenhum hexadecimal ou `rgba` solto em `patient-record.css`, `anatomy.css` e nos `.jsx` do prontuário; raios dos cartões todos em `--r-card` (28), sem borda de 1 px somada a sombra larga nos cartões da visão geral.
- Contraste medido por pixel em Clara, Rafael e Gael: 8 seções, popover aberto e visão geral a 1440; o pior texto mede 5,1:1 (⌘K da barra do topo) e o pior do prontuário 5,13:1. Sem texto abaixo de 4,5:1.
- Ritmo vertical: lacunas de 16 px entre cartões nas duas colunas e 12 px nas grades internas, medidas; barra, faixa de pílulas e grade alinhadas a 20–24 px.
- Camadas: escada global (`--z-sticky` 100, rail 200, topbar 210, modal 400) respeitada; os z-index do palco (1–4) ficam em contexto isolado; painel no celular em `--z-drawer` entre a barra de cima (64 px) e o dock (791 px), sem sobreposição.
- Faixa de consultas e controles `+ − 3D` na mesma linha de base a 1440, 1280 e 1024; crédito do modelo sempre visível; alerta nunca some (a 390 vira faixa na barra).
- Estados vazios dos painéis seguem uma receita única (círculo de 48 px, 36 px na variante compacta de Exames, título 500, texto, ação secundária).
- Anéis de foco visíveis em todos os controles percorridos (cor `--blue-500`, 2 px); alvos de 44 px reais em quase tudo, e os pequenos têm área ampliada por `::after`.
