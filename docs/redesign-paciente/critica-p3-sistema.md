# Crítica de sistema, passada 3 (última): prontuário do paciente

Crítico de contexto limpo. Julgado pela tela e pelo DOM (capturas de `.claude/design-loop/shots/prontuario-p3/`, `medidas-1440.json`, `medidas-390.json` e leituras extras somente de leitura com `cdp.mjs`), contra `tokens.css`, `DesignCharlington.md` e `guia.md` §0 e §3. Fora do escopo: dock, barra global, `.btn` global (inclui os 40 px de altura e o 1,12:1 de "Emitir documento", que é artefato da medição sobre botão preenchido), modal "Editar ficha".

Rota: paciente `16df5f04…`, larguras 1440, 1280, 1024 e 390. Dados não alterados.

## Vereditos

| Peça | Veredito | Maior violação |
|---|---|---|
| P1 Palco anatômico | **APROVA** | No celular (390) o palco (358×460) vem antes do perfil e tem 460 px; o guia §4.6 pede perfil primeiro e 420 px. |
| P2 Colunas | **APROVA** | Texto da pasta de vidro com corpo calculado fora da escala (34 px a 1440, 39,67 px a 1280/1024, 21,64 px a 390). Atenuante: é o rótulo da arte `GlassFolder`, redimensionado por transform. |
| P3 Navegação e seções | **REPROVA** | A 1024 o painel de seção tem 660×379 px, com cabeçalho de 145 px: sobram 234 px de corpo, o conteúdo é cortado e a base do palco vaza por baixo do painel. |

## O que passou (com números)

- Escala de tipo a 1440 e 1024: 11 · 14 · 32 · 52 (4 corpos, dentro da cota). Painel aberto: 11 · 14 · 22 (título do painel, 500) · 32.
- Raios todos em token: 12 (`--r-sm`), 18 (`--r-md`), 28 (`--r-card`), 999 (`--r-pill`), 50%. Painel com raio 28 e sombra `--e-4` + brilho interno.
- Z-index em token: pílulas sticky em 100 (`--z-sticky`); painel no celular em 300 (`--z-drawer`).
- Pílulas de seção: `<nav aria-label="Seções do prontuário">`, `aria-current="page"` na ativa, tabindex móvel (0/-1), 44 px de altura a 390 e 40 px (`--touch`) de 768 a 1440. Ativa em `--tab-active-bg` (tinta), a mesma gramática de aba. Foco visível com anel duplo (`--surface` + `--blue-500`).
- Foco visível definido para pílula, painel, fechar, alerta, pasta, escala, rail. Fechar mede 170×44.
- Painel aberto: palco e coluna direita ficam `inert` + `aria-hidden`; coluna esquerda continua à vista e ativa; foco cai no painel (`section` com `aria-label` = título). Esc fecha, devolve o foco à pílula da seção e limpa `?secao=` (testado a 390 e 1024).
- Alergia visível em todas as larguras: no palco (≥1024) e na faixa da barra de seções (a 390 em y=416; no painel, no cabeçalho).
- Sem rolagem lateral visível em 1440, 1280, 1024 e 390; console sem erros.
- Contraste do texto sobre o vidro do painel, amostrado nas capturas no pior ponto sem texto: fundo mais escuro (234,236,239), `--ink-400` rende 4,99:1 (mínimo amostrado nas 5 áreas), `--ink-900` 16:1.
- Nenhum corpo fora da escala dentro do painel (só 11, 14 e 22).
- Aviso de borda + sombra: só os `.btn` (fora do escopo); nenhum card do painel declara os dois.

## Violações, da mais grave à menor

### 1. Painel de seção a 1024 e 1280 não cobre o palco e fica espremido (P3, grave)
- Medida: a 1024 o painel mede 660×379 (sticky em y=301) com cabeçalho de 145 px (os dois alertas empilham); corpo útil de 234 px com conteúdo de 685 px. O palco tem 480 px, então 100 px dele, com a faixa de consultas e o "Hoje", ficam visíveis sob o painel (captura `panel-1024.png`, y≈700). A 1280 o painel termina em y=772 e a legenda do crédito do palco e o card "14" da coluna direita aparecem sem desfoque abaixo da borda. A 1440 sobra o anel "◉" de um card em y≈872.
- Regra: guia §4.5 ("cobre o palco e a coluna direita"; painel com `--rp-glass-strong`, `--glass-filter`).
- Correção: dar ao painel a altura do palco (e da coluna direita no 1280/1440) mais a base, não a do conteúdo; a 1024 deixar o painel ocupar a altura útil da janela (viewport menos barra) com o cabeçalho em linha única (alertas em uma fileira com rolagem, ou só o ícone da alergia + contagem). Esconder tudo que sobra atrás com o mesmo véu `--pr-stage-veil`.

### 2. Vazio de ~820×660 px ao lado do perfil a 1024 (P3 responsivo, grave)
- Medida a 1024: perfil 300×1301 em x=24; palco 660×480 em x=340 (y=301–781); a coluna direita só começa em y=1618 (largura 976). Entre y≈781 e 1618, à direita do perfil, a página fica vazia (captura `41-1024.png`).
- Regra: guia §4.6 (1024–1179: "a coluna direita desce para baixo do palco em grade de 2").
- Correção: a grade de escalas/medicações/marcos deve ocupar a coluna 2 logo abaixo do palco (grid com duas linhas), não esperar o fim do perfil. Alternativa: palco com altura que acompanhe a coluna.

### 3. Cabeçalho do painel consome o espaço útil nas larguras estreitas (P3)
- Medida: a 390 o cabeçalho do painel mede 197 px de 720 (27%) antes do título (botão fechar + dois alertas empilhados); a 1024, 145 de 379 (38%).
- Regra: o painel serve ao conteúdo; guia §4.5 (cabeçalho com título, contagem, ações e ×).
- Correção: alertas numa só linha compacta (`pr-alerts--compact` já existe) abaixo de 1180, e o `×` na mesma linha deles.

### 4. Caixa dentro de caixa e gramáticas diferentes entre as 8 seções (P3)
- Medida: Linha do tempo e Marcos são listas planas. Evoluções, Escalas e Medicações usam cartões com borda de 1 px. Consentimentos usa seis cartões de 876 px, raio 18, borda sólida e fundo tingido verde/âmbar. Exames tem área tracejada. Subtítulos de grupo mudam: "OUTUBRO DE 2026" e "EM USO" em 11 px caixa alta; "Registrados (4)" em 14 px sentence case; rótulos SOAP em 11 px caixa alta. Documentos não tem subtítulo de contagem (as outras sete têm).
- Regra: guia §4.5 ("cards internos sem caixa dentro de caixa, listas com separadores de 1 px em `--ink-a06`"); `tokens.css` (sobrelinha em caixa alta só para apoio).
- Correção: um único padrão de lista (separador de 1 px, sem borda por item); fundo tingido só no estado (consentimento ativo) como faixa lateral de ponto de estado, não como cartão cheio; subtítulo de grupo igual em todas.

### 5. Alvo de toque do "Remarcar" do alerta: 32 px (P3)
- Medida: `.pr-alert__action` 85×32 em 1440, 1024 e 390 (no painel também). `--touch` = 40; guia §8 pede 44 no celular.
- Correção: `min-height: var(--touch)` (44 a 390) mantendo a área visual de 32 com padding.

### 6. Rolagem horizontal oculta de 38 px (P3/P2)
- Medida: `#conteudo` tem `scrollWidth` 1402 > `clientWidth` 1364 a 1440 (1242 > 1204 a 1280), `overflow-x: hidden`; `scrollLeft = 100` resulta em 38. A origem é `.pr-pills` (`scrollWidth` 1378 > 1316) mais as pastas (348 > 340). O medidor marca `rolagemLateral: true`.
- Regra: guia §8.3 (sem rolagem lateral). O foco por teclado pode deslocar o layout em 38 px.
- Correção: cortar o transbordo na origem (`overflow-x: clip` em `.pr-pills`, `min-width: 0` nos filhos da grade) em vez de depender do `hidden` do contêiner.

### 7. Ordem e altura da coluna única a 390 (P1)
- Medida: bloco do palco em y=484 (358×460), perfil em y=960. O guia §4.6 pede barra, perfil e depois palco de 420 px.
- Correção: reordenar ou justificar; reduzir o palco a 420.

### 8. Filtro e vidro do painel diferentes do especificado (P3, baixa)
- Medida: `backdrop-filter: blur(10px) saturate(1.4)` e fundo `--card-glass` (branco .86→.64); o guia pede `--rp-glass-strong` + `--glass-filter` (blur 24 saturate 160). O painel é mais transparente que o previsto, daí as manchas fantasmas da coluna direita visíveis (a 1440, em y≈385 à direita do título).
- Correção: usar `--rp-glass-strong` e `--glass-filter`; contraste não é afetado hoje (≥ 4,99:1), mas a mancha distrai.

### 9. Chip âmbar com 4,44:1 (P3, baixa)
- Medida: `chip--warning` ("Consentimento do responsável…", 14 px, `--signal-amber-ink` sobre o tom âmbar do cartão): 4,44:1 pela medição composta, abaixo de 4,5.
- Correção: escurecer o chip sobre o cartão tingido (ou tirar o tingimento do cartão, ver item 4).

### 10. Micro 11 px carregando informação (P2/P3, baixa)
- Medida: nos consentimentos, "Responsável informado em 09/08/2026 09:00 · versão 1.0" e "Concedido em …" em 11 px; no rail, a data da consulta (`pr-visit__date`) em 11 px.
- Regra: `tokens.css` ("nunca o que qualifica um número… data de item de lista: isso é corpo, em `--ink-400`").
- Correção: 14 px em `--ink-400`.

### 11. Texto da pasta de vidro fora da escala (P2, baixa)
- Medida: `gf-title` 34 px (1440), 39,67 px (1280/1024), 21,64 px (390), mais `gf-sheet-name`/`gf-sheet-meta` a 390. É texto de arte escalado por transform, com tamanho renderizado perto de 13 px. Aparece no medidor como corpo fora da escala.
- Correção: fixar o corpo em token (`--t-body`) no CSS escopado `.pr-folder` ou declarar a exceção do componente.

### 12. Linha de metadados quebra com código órfão (P3, baixa)
- Medida: a 1280 e 1024 "F90.0" cai sozinho na segunda linha, e os chips de CID não têm fundo nem separador visíveis (a 1440 ficam em uma linha).
- Correção: agrupar os CID num único elemento que quebra junto.

## Resumo para a decisão

P1 e P2 aprovam. P3 reprova por causa do painel nas larguras de 1024 e 1280 (não cobre o palco, corpo útil de 234 px a 1024) e do vazio a 1024. Os itens 1 a 5 se corrigem só com CSS e reorganização da grade; nenhum depende de lógica.
