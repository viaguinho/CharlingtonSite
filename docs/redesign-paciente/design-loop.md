# Design loop — Prontuário (estilo Quantis, tema claro)

Régua: [bar.md](bar.md) · Guia: [guia.md](guia.md) · Referência: Quantis (Dribbble 27474777)
Método: 3 críticos de contexto limpo, veredito binário por peça. Todos precisam aprovar. Limite combinado com o dono: **3 passadas**, com as correções aplicadas por mim.

## Peças
| Peça | O que entra |
|---|---|
| P1 Palco anatômico | busto em plexo, hover/seleção, popover, seletor de camadas, alertas, faixa de consultas, controles, crédito |
| P2 Colunas | perfil + trilha, diagnósticos, pastas de exames, próxima consulta, escalas, medicações, marcos |
| P3 Navegação e seções | barra da página, pílulas, painel das 8 seções, responsivo (1280 / 1024 / 390) |

## Críticos
| Crítico | Julga contra | Modelo / esforço |
|---|---|---|
| Fidelidade | `bar.md` + capturas, em comparação cega com a referência | opus · alto |
| Sistema | `tokens.css` + `DesignCharlington.md` + guia §0/§3 + medições do DOM | sonnet · médio |
| Dados e acabamento | objetivo (guia §0, §1, §4, §7 + PRODUCT.md), interagindo com a tela | opus · alto |

## Passadas
| Passada | Fidelidade | Sistema | Dados e acabamento | Capturas |
|---|---|---|---|---|
| 1 | REPROVA P1 P2 P3 (0/7 mecanismos) | REPROVA P1 P2 P3 | REPROVA P1 P2 P3 | `.claude/design-loop/shots/prontuario-p1/` |
| 2 | REPROVA P1 P2 P3 (3/7 mecanismos) | REPROVA P1 P2 P3 | APROVA P1 P2 · REPROVA P3 | `.claude/design-loop/shots/prontuario-p2/` |
| 3 | REPROVA P1 P2 P3 (3/7 + 1 parcial) | APROVA P1 P2 · REPROVA P3 | APROVA P1 P2 · REPROVA P3 | `.claude/design-loop/shots/prontuario-p3/` |
| Final | lote pós-P3 aplicado, sem nova crítica | — | — | `.claude/design-loop/shots/prontuario-final/` |
| 4 | REPROVA P1 P2 P3 (5/7, 3 com ressalva) | REPROVA P1 P2 P3 | REPROVA P1 P2 P3 | `.claude/design-loop/shots/prontuario-p4/` |
| 5 | REPROVA P1 P3 · APROVA P2 (5/7 mecanismos, nota 7,0) | REPROVA P1 P2 P3 | REPROVA P1 P2 P3 | `.claude/design-loop/shots/prontuario-p5/` |
| 5b | lote pós-P5 aplicado, sem nova crítica | — | — | `.claude/design-loop/shots/prontuario-p5b/` |

## Passada 1 — maiores lacunas
- **Fidelidade:** o modelo não tinha matéria nem contraste (cérebro como nuvem azul em repouso, tronco invisível, caixa com corte reto); o cabeçalho empurrava o palco para y=280; pastas fora da dobra e sem leque; azul em 5 ou mais lugares.
- **Sistema:** no celular, o painel ficava atrás da barra global (z 60 contra 210) e os controles do palco ficavam embaixo da faixa de consultas; havia 11 px em informação principal, título de painel em 17 px, anel de foco invisível na pílula ativa e marcas de risco a 1,9–2,3:1.
- **Dados:** a alergia sumia com o painel aberto; os exames de crânio apareciam ligados a coluna, medula e mandíbula; "— F90.0" aparecia em 41 de 42 pacientes; `inert=""` virava falso no React 19.

## Passada 2 — maiores lacunas
- **Fidelidade:** o hover e o popover não apareciam nas capturas, e em repouso o cérebro e o coração liam como massa sólida. O painel era branco opaco, não vidro. O gráfico de escala estava achatado, com faixa de 12 px. As folhas das pastas ficavam na frente do vidro (placa preta de EEG).
- **Sistema:** a 1280 px os botões de camada cobriam a pílula de alergia. A 390 px o chip "Sem desfecho" quebrava em 5 linhas. Havia alvos de 23 a 32 px, linha de escala azul em repouso, texto cortado, 11 px em informação principal e z-index fora da escada.
- **Dados:** a alergia sumia ao rolar o painel ou abrir pela faixa de consultas, e no modal de medicação. O painel refluía a grade em vez de cobrir. A faixa dizia "Confirmado" para consulta sem desfecho e atrasada. O painel Marcos não listava os 4 registros. As ações de estado vazio não faziam o que diziam.

## Correções aplicadas depois da passada 1
| Achado | Correção |
|---|---|
| Alergia some com o painel aberto | O cabeçalho do painel repete a alergia e os estados de agora, em todas as larguras |
| Fundo tabulável atrás do painel | `inert={true}`; o aviso do console sumiu |
| Painel do celular sem fechar | O painel usa `--z-drawer` (300) e ganhou cabeçalho próprio, com fechar de 44 px e área segura |
| Diagnóstico "— F90.0" | Código lido do texto, descrição tirada do catálogo CID-10 |
| Trilha esconde faltas | Escala a partir do primeiro atendimento, faltas e sem desfecho desenhados, concordância certa |
| Faltava o "+" das pastas | Permissão corrigida para `patients.clinical`; "Aplicar escala" entrou no card vazio |
| Cápsula não leva ao item | A linha do tempo rola até a consulta clicada |
| Vanderbilt com dois máximos | Vale o máximo gravado na aplicação; eixo = escala inteira, gráfico de 96 px; semeadura de verificação corrigida |
| PDF sem arquivo: erro em inglês, duas vezes | Mensagem em português e pedido único (guarda de StrictMode) |
| Chaves cruas na linha do tempo | Rótulo do tipo do exame |
| Pílula de Escalas: 7 contra 3 | Conta instrumentos |
| Marcos: "1 atrasado" que o painel não mostra | Só marcos do catálogo, último registro de cada |
| Responsável principal no "+" | Mantida a ordem da ficha |
| 11 px em informação principal | Notas, datas, rótulos e nome da alergia em corpo 14 |
| Números dos marcos em 22 e título do painel em 17 | Marcos em 32 leve; título do painel em 22 |
| Anel de foco invisível | Anel duplo (superfície + azul) na pílula, nas pastas e nas ações |
| Marcas de risco abaixo de 3:1 | `--data-positive/caution/negative` |
| Azul fora do lugar | Pílula ativa em tinta (`--tab-active-bg`); diagnóstico e ícones de medicação em neutro; arte das pastas fria e clara |
| Alvos menores que 44 px no celular | Área de toque de 44 px em links, ações e pílulas |
| Pastas sem leque e estreitas demais | Leque já em repouso; a largura acompanha o card; o texto das folhas some quando ficaria ilegível |
| `--ink-300` a 4,47:1 | `#6a6a6a` (4,74:1); comentário da escala de tipo atualizado no tokens |
| Palco: presença, máscara, base, popover, relação com exames, arco azul | Corrigidos pelo agente do palco |

**Não aplicados, com motivo:**
- **Painel cobrindo o palco** (fidelidade P3): é a arquitetura escolhida pelo dono no /grill-me.
- **Azul no dock:** o dock é intocável.
- **Borda + sombra nos botões globais `.btn`:** é componente do painel inteiro, fora do escopo desta página.
- **Foco depois de Esc em "Editar ficha":** está no componente global de modal.

## Lote final (depois da passada 3)
- **Alergia:** fica fixa no topo dos modais "Emitir documento", "Nova evolução", "Registrar aplicação" e "Remarcar" (`record/AllergyNotice.jsx`).
- **Painel:** cobre o palco inteiro em 1024, 1280 e 1440. O cabeçalho é compacto e opaco. Não há mais rolagem lateral, e as 8 seções seguem uma gramática só.
- **Colunas:** a 1024, a coluna direita vem logo abaixo do palco. A 390, o perfil vem antes do palco.
- **Busto:** a câmera ficou 12% mais perto e o busto ocupa 85% do palco a 1440. O plexo está mais firme e o cérebro mais azul em repouso.
- **Popover e lista:** viraram vidro, ao lado da estrutura, com traço-guia.
- **Base do palco:** fica em uma linha em todas as larguras.
- **Card de escala:** gráfico de 64 px, faixa do intervalo real e interpretação tirada do que foi gravado.
- **Pastas e trilha:** rótulo e "+" em vidro; a trilha usa a mesma régua de estados das pílulas.

**Pendências conhecidas:**
- `chip--warning` a 4,44:1 em `primitives.css`, componente global.
- "Neurofisiológico" hifeniza no card estreito.
- A 390, o arco de camadas fica sobre o rosto.
- A 1024, o painel passa sob a barra do dock.

## Passada 4 (pedida pelo dono depois do fechamento) — maiores lacunas
- **Fidelidade:** o busto em repouso não tem hierarquia (crânio, rosto e cérebro na mesma tinta). O rodapé do Vanderbilt tem 3 linhas. No celular o palco fica a duas telas de distância. A arte das pastas vaza em retângulo.
- **Sistema:** a 1280 as camadas cobriam a alergia (regressão da correção do celular, já corrigida antes do lote). A grade de escalas tem um vão sob o SNAP-IV. O escore do painel de Escalas está em 28 px (5 tamanhos na tela). As pastas usam tipo e raio fora da escala. Há alvos pequenos nos painéis.
- **Dados:** entre 1024 e 1179 a alergia some ao rolar. Com alertas em 2 linhas, os botões de camada caem sob a faixa de consultas. No celular o palco prende a rolagem. A trilha não bate com a faixa ("1 falta" contra 3). A pílula Marcos conta registros descartados.

## Correções aplicadas depois da passada 4 (22/10/2026)
| Achado | Correção |
|---|---|
| Alergia some ao rolar entre 1024 e 1179 | Abaixo de 1180 os alertas saem do palco e grudam na barra de seções (a faixa que antes só existia abaixo de 1024) |
| Camadas sobre a faixa de consultas com alertas em 2 linhas; 5 alertas cobrem a cabeça | Alertas do palco numa fileira só, de altura fixa (alergia presa no início, os outros rolam com borda esmaecida). O arco vira fileira quando não cabe entre os alertas e a faixa (`data-layers`, medido em `AnatomyStage`) |
| Camadas na testa a 1180/1280 | O arco vale de novo de 1180 a 1439; a fileira só no palco com menos de 400 px |
| Palco prende a rolagem no celular | `touch-action: pan-y` no canvas abaixo de 1024: o arrasto vertical rola a página e o horizontal gira |
| Ordem no celular | Perfil → palco → escalas → pastas → diagnósticos, sensorial e retorno (`display: contents` + `order`) |
| Trilha: "1 falta" contra 3 | Toda falta conta (a de laudo também); "desde" é o início do eixo |
| Pílula Marcos conta descartados | `recordedMilestones()`, a mesma régua do card e do painel |
| "Aguardando" na faixa contra "Na recepção" no alerta | Faixa diz "Na recepção" |
| Medicações vazio no painel cita "painel de contexto" | Frase de segurança ("Confirme com o responsável antes de prescrever"); o mesmo texto antigo corrigido na ficha |
| Folhas das pastas sem nome acessível | `aria-label` com nome e data em cada folha |
| Cabeçalho do painel a 390: pílula sob o × | Nome e × na primeira linha, alertas empilhados e inteiros abaixo |
| Foco volta à pílula errada ao fechar por "Visão geral" | O foco fica na pílula clicada |
| Buraco na grade de escalas | Grade de 2 colunas; o ímpar final ocupa a linha |
| Faixa verde em cartão moderado | A faixa leva a cor do risco atual |
| Rodapé do Vanderbilt em 3 linhas | Data na linha da variação; rodapé só com a interpretação, sem reticências |
| Padding 14 no cartão de escala | 16 |
| Escore de 28 px no painel de Escalas | 32 (a tela fica em 11 · 14 · 22 · 32) |
| Alvos pequenos nos painéis | Botões, filtros e ícones com 40 px; "Ver dados" e o link da área de soltar com área de 44; breadcrumb com 44 no celular |
| Desalinhamento de 4 px no painel | Cabeçalho, título da seção e linhas na mesma margem |
| Busto sem hierarquia em repouso | Pele e crânio viram véu (linha leve, quase sem nó); cérebro mais azul e com mais nós, visível através do crânio |
| Hover apaga a cabeça | Vizinhas a 42% (antes 30%) |
| Arte das pastas vaza em retângulo | Fundo liso em todas as pastas |
| Rótulo da pasta sobe para a aba a 1024 | Fica na base, ao lado do "+" |
| Vidro do painel com manchas | Sob o painel, o palco desfoca, esmaece e recua; a coluna direita sai de cena |
| Barra de pílulas cortada sem pista | Borda esmaecida do lado que esconde pílulas |
| Faixa grudada com borda dura em repouso | O vidro da barra só aparece quando ela gruda |
| Mesa pontilhada afogada no granulado | Ponto da mesa de .07 para .10 |
| Cápsula cortada na faixa | Correção do encaixe (o `reduce` devolvia sempre o alvo), reposição ao redimensionar, e a cápsula que a borda corta some inteira; no celular de toque o "+" e o "−" saem (a pinça aproxima) e a faixa ganha largura |
| Crédito em 2 linhas no celular | Versão mínima numa linha ("BodyParts3D © DBCLS · HRA · CC BY 4.0") |
| "F90.0" sozinho na segunda linha | Códigos CID quebram juntos |
| Carrossel de pastas corta no respiro | O trilho sangra até a borda da tela |
| Chip âmbar de base legal em linha "Vigente" | Neutro; âmbar só quando falta o consentimento. "§ 1º" |

**Não aplicados, com motivo:**
- **"Agendar retorno" abre a Agenda às 09:00 de hoje já passado:** o padrão de horário é do módulo da Agenda, fora do escopo desta página.
- **Painel de 391 px a 1024×768 sem rolar:** o painel começa onde começa a grade; ao rolar ele gruda e cresce até o pé da janela.
- **Texto das folhas a 21,6 px no DOM:** é o tamanho antes da escala do palco da pasta; na tela ele mede 14 px.
- **Arco e ícones em raios diferentes, coluna direita a 1920, faixa sem ícone de tipo nem `••••◉`:** mudanças de composição, não de correção; ficam para o dono decidir.
- **Pílula ativa em preto, não azul:** decisão da passada 1 (`--tab-active-bg`), mantida.

## Passada 5 — maiores lacunas
- **Fidelidade:** o plexo ainda não lê como anatomia (cérebro de cordas longas, pele sem nós, estrutura selecionada sem malha por cima); o painel é uma placa cinza opaca; cápsula real sumia na faixa; alertas cortados; pílula de alergia opaca entre vidros; pastas abaixo da dobra a 1440×900.
- **Sistema:** alertas cortados na tira; "Emergentes" passava do card; 5 tamanhos de texto a 390; alvos abaixo de 40; duas elevações no mesmo alerta.
- **Dados:** a folha da prescrição emitida e a prévia de exame cobriam a alergia; alertas além do 2º ficavam fora da vista; a faixa escondia cápsulas e contradizia a trilha; dois "desde" diferentes (cabeçalho e trilha).

## Correções aplicadas depois da passada 5 (22/10/2026)
| Achado | Correção |
|---|---|
| Alertas cortados / fora da vista | Todos quebram linha e ficam inteiros, no palco, no cabeçalho do painel e a 390; na barra grudada abaixo de 1180 fica só a alergia. Medido: 3 alertas dentro do palco a 1440, 1280 e 1024 |
| Alergia some em modal | `AllergyNotice` na folha do documento emitido (`DocumentSheet`) e na prévia de exame |
| Sem alergia registrada, a tela calava | A pílula de alergia sempre existe: neutra, "Nenhuma registrada" |
| Faixa esconde cápsula | A cápsula cortada fica a 40% de opacidade (não some) e rola à vista ao receber o foco |
| Dois "desde" | Trilha e cabeçalho usam o mesmo `firstVisit`; o eixo começa no que vier antes |
| "1 consulta" ao lado de 3 cápsulas | "1 de 3 realizadas"; a próxima consulta virou anel na trilha |
| "Emergentes" passa do card | Contagem em grade que quebra linha (`auto-fit`) |
| 5 tamanhos a 390 | Contagem de Marcos em 22 px (11 · 14 · 22 · 52) |
| Painel cinza opaco | Vidro mais claro (`--pr-panel-glass`) e palco desfocado a 80% atrás |
| "§ 1º" e chip âmbar em "Vigente" | Já corrigidos na rodada anterior |

**Não aplicados, com motivo (ficam para decisão do dono):**
- **Plexo como anatomia** (malha de superfície, nós em todas as camadas, plexo sobre o sólido em foco): é trabalho de modelo 3D (`scene.js`), com risco de repetir o "novelo" já descartado; precisa de uma rodada própria.
- **Pastas na dobra a 1440×900:** exigiria encurtar o perfil ou mover os diagnósticos; muda a composição escolhida.
- **Arco de camadas ancorado à cabeça a 1024/1280, lista por teclado sobre o crânio, SNAP-IV com 2 pontos cinza, trilha rala:** acabamento menor, sem risco de dado.
- **Data de 11 px na cápsula, anel do "+" da pasta, sombras da pasta fora de `--e-*`:** dependem do desenho do componente de pasta do dono.
- **Cobertura de coração e artérias em vermelho:** não verificado pelo crítico; falta capturar com o coração em foco.
