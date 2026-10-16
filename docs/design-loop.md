# Design-loop — página de progresso

Régua: [`bar.md`](bar.md) · Referências: REF 3 (AI Health) e REF 4 (Orvion)
Método: construtor → três críticos de contexto limpo → todos precisam passar.

---

## Rodada 1 — ESTRUTURA

**Peça:** Visão geral (3 papéis) · Lista de pacientes · Prontuário de 3 colunas
**Critérios:** hierarquia, densidade, ritmo do grid, "o médico acha em 3 segundos"

### Veredito dos críticos

| Crítico | Julga contra | Veredito |
|---|---|---|
| Acabamento | `bar.md` + saída renderizada, comparação cega com a REF 3 | **REPROVA** — 3 de 8 mecanismos passam |
| Sistema | `DesignCharlington.md` + `tokens.css`, medindo o DOM | **REPROVA** — escala tipográfica, grade de 4 e raio |
| Brief | o objetivo declarado, ignorando estética | **REPROVA** — 3 de 6 promessas cumpridas |

### Achados e o que foi feito

| # | Achado | Evidência do crítico | Correção |
|---|---|---|---|
| M1 | 5–6 tamanhos de texto por tela; 11, 12 e 13px conviviam sem criar hierarquia | Visão geral com 10/11/12/13/27/34px | `--t-caption` virou apelido de `--t-small`; escala de texto caiu para 10/12/13 + títulos |
| M2 | 5 a 10 manchas saturadas por tela (limite: 3) | Dois avatares "CC" azuis, badges de contagem azuis, ponto verde de praça | Avatar e badge voltaram ao neutro por padrão; ponto de praça virou cinza — praça é contexto, não estado clínico |
| M3 | Nenhuma métrica dominante: 5 números empatados em 34px, 4 deles zero, sem alvo | "o maior elemento da dobra é a saudação, não um número" | Uma métrica por papel ganha 48px e uma linha de alvo; a saudação caiu de 27px para 20px |
| M7 | Alvos de lista a 32px e 42px (mínimo 44); bento com 111px de borda irregular | Rail 42px, índice do prontuário 32px | Token `--row-min: 44px` aplicado; bento passou a `align-items: stretch` e fecha alinhado |
| M8 | Estado vazio do prontuário sem ação — beco sem saída | "Nada registrado ainda" sem botão, com 6 abas filtrando zero registros | Dois botões de saída; as abas de filtro somem enquanto a contagem for zero |
| Sistema C | `margin-top: 2px` fora da grade de 4, em 10 arquivos | — | Virou o token `--nudge`, documentado como correção óptica |
| Sistema E | `--ink-400` #868788 a **3,22:1** e `--ink-300` #8f8f8f a **2,89:1** sobre o canvas — ambos reprovam o AA de texto normal | Medição de contraste no DOM | `--ink-400` → `#6b6c6f` (4,70:1) · `--ink-300` → `#6e6e6e` (4,56:1). Os cinzas da marca ficam como `--brand-skyline` e `--brand-slate`, restritos a ícone e texto ≥18px |
| Extra | O próprio Future Blue `#0071e3` rende **4,20:1** como texto sobre o canvas — reprova também | Verificação própria, não apontada pelo crítico | Texto e ícone informativo passaram a `--blue-600` (5,89:1); o 500 fica para preenchimento, borda e traço, onde o mínimo é 3:1 |
| Extra | `--ink-200` (2,08:1) carregava placeholder, numeral do índice e frases de vazio | Verificação própria | Esses usos passaram a `--ink-300`; o 200 fica para decoração |
| Sistema B | `font-size` **11px** e **22px** fora da escala, em `style` inline | `Math.round(size * 0.34)` em `primitives.jsx:122` — um gerador, não um literal esquecido | Mapa explícito diâmetro→token (`initialsSize`). Aritmética sobre o diâmetro produzia um tamanho novo a cada avatar novo, e em estilo inline nenhuma auditoria do CSS o encontraria |
| Sistema C | `1px`, `2px`, `3px`, `5px` crus em `gap`/`padding`; raio `2px` em `.rail__marker` | 37 declarações em 11 arquivos | Todos normalizados para a escala; o marcador virou `--r-pill`. Medição final: **zero** tamanho fora da escala, **zero** raio fora de token, e em espaçamento só sobram `1.75px` e `2.5px` — resultado de `calc((1lh - 1em) / 2)` |

> **Sobre o `--nudge`, e por que o crítico estava certo.** Minha primeira
> resposta ao achado da grade foi transformar o `margin-top: 2px` no token
> `--nudge`. O crítico rejeitou: *"tokenizar muda a proveniência, não a
> geometria — documentar uma exceção não a converte em conformidade"*. Correto.
> A correção real foi trocar o número por `calc((1lh - 1em) / 2)`: centrar um
> ícone na primeira linha de um parágrafo não é uma decisão de espaçamento, é
> geometria derivada da métrica do tipo, e por isso não pertence à grade. Os
> valores fracionários que sobram na medição (1,75px, 2,5px) são a assinatura
> disso — nenhum humano escolheria 1,75px.
>
> **Exceção que permanece de pé:** a geometria da folha A4 timbrada
> (`.sheet-a4__*`) continua fora da grade — `140px 45px 110px 60px`, `7px`,
> `3px`. Não é layout de interface: é a posição do conteúdo dentro de um papel
> físico, conferida contra o timbrado impresso. Arredondar deslocaria o texto
> sobre o cabeçalho já impresso. A regra R3 manda preservar este template.

| Brief 5 | **Marcos inventava 38 atrasos a partir de banco vazio** — "o paciente de teste exibe *Atrasado 38* em vermelho" | `MilestonesView.jsx:64` convertia ausência de registro em `DELAYED` | Ausência voltou a ser `NOT_ASSESSED`. O aviso mudou de alerta âmbar ("atrasaram") para informativo azul ("ainda não avaliados — é o que falta perguntar"), e o marco vencido ganhou sublinhado tracejado em vez de vermelho. Verificado: **Atrasado 0 · Não avaliado 41** |
| Brief · lacuna mais grave | **As alergias sumiam abaixo de 1320px** — a coluna de contexto ia a `display:none` e não havia gaveta nem fallback | "1280 é largura de notebook comum" | As alergias subiram para o cabeçalho do paciente, visível em qualquer largura; o painel completo virou gaveta pelo botão "Resumo", que só aparece quando a coluna não cabe |
| Brief 5 | Gráficos vazios sem ação — o componente `Empty` dos gráficos não aceitava `action` | `charts/index.jsx:24-34` | `Empty` passou a aceitar `emptyAction`; a produção assistencial da Visão geral abre a agenda |

> **O achado mais grave da rodada inteira não foi visual.** O crítico de brief
> encontrou o painel afirmando 38 atrasos de neurodesenvolvimento num paciente
> sem nenhuma avaliação registrada. Não era um bug de exibição: a função de
> status convertia "não perguntamos" em "está atrasado". Num prontuário isso é
> pior do que um número errado — é o sistema produzindo achado clínico que
> ninguém constatou, exatamente o que a regra R2 existe para impedir. Nenhum
> dos dois críticos visuais pegou, porque ambos julgavam a forma.

> **Nota sobre o achado de contraste.** É o mais importante da rodada e não é
> um deslize de implementação: o Skyline Gray `#868788` é o token de texto
> secundário do próprio `DesignCharlington.md`. Ele passa no site público,
> onde o texto secundário tem 27px e o mínimo é 3:1. Num painel a 12px o
> mínimo é 4,5:1 e ele reprova. O design system da marca precisou ser
> adaptado, não apenas copiado.

---

## Rodada 2 — DADOS E COMPONENTES

**Peça:** gráficos, tabelas, KPIs, estados vazios e de carregamento
**Referências:** REF 1 (Callivio), REF 2 (Ledgerix), REF 6 (Convox)
**Critérios:** legibilidade do dado, honestidade da visualização, consistência entre gráficos
**Base de verificação:** IndexedDB local desta máquina com 12 pacientes, 235
agendamentos, 90 evoluções e 168 lançamentos — criada só para a crítica, nunca
vai para o repositório nem para o Supabase (que segue com 0 linhas).

### Defeitos encontrados antes dos críticos (ao montar a base)

| # | Defeito | Consequência | Correção |
|---|---|---|---|
| 1 | `EntryForm`, `SupplyForm`, `ProfessionalForm` liam `entry.id` com a prop já nula ao fechar | Fechar a gaveta **desmontava o painel inteiro** (tela branca) | Identidade do registro viaja dentro do form |
| 2 | Nenhuma fronteira de erro | Qualquer exceção de renderização = tela branca | `ErrorBoundary` por rota e na raiz |
| 3 | Grade do dia filtrava por sala | **Consulta sem sala e toda teleconsulta sumiam da agenda**, mas contavam no resumo | Coluna "Sem sala / remoto" |
| 4 | Dia da consulta lido em UTC (`inicio.slice(0,10)`) | Consulta após 21h aparecia no dia seguinte | `localDay()` em `core/periods.js` |

### Veredito dos críticos — 1ª passada

| Crítico | Veredito | Maior lacuna apontada |
|---|---|---|
| Brief | **REPROVA** (15 achados) | Gráficos não usavam o mesmo cálculo dos KPIs ao lado |
| Sistema | **REPROVA** (10 desvios) | Série de dados pintada com a tinta do trilho: 1,13:1 |
| Acabamento | **não executado** | Referências apagadas do diretório temporário; não autenticou |

### Correções da 1ª passada

- **Um recorte só** (`core/periods.js`): gráfico cobre exatamente o período do KPI, no grão do período (dia, semana, mês), com baldes vazios preservados.
- **Caixa divergente** (`CashFlowChart`): receita acima, despesa abaixo, mesma escala. Antes o saldo diário era truncado em zero — um dia com R$ 36.760 pagos virava barra vazia e trimestre/ano ficavam em branco.
- **Financeiro**: fluxo × posição separados e rotulados; "Em atraso" em R$ com contagem; prejuízo em vermelho, não em azul.
- **Relatórios**: taxa de faltas e barra de desfecho no mesmo universo (encerrados); rosca com legenda e centro = KPI; epidemiologia recortada pelo período.
- **Agenda**: faixa de KPIs segue a vista (dia, semana, mês); lista e ocupação mostram o mês da navegação; mapa de calor com números escritos e legenda.
- **Visão geral**: medidor "3/12 da capacidade" usava um 12 inventado → agora concluídas/agenda do dia.
- **Operações**: aba ativa preto-sobre-preto (hover mais específico que `.is-active`); coluna de estoque sem falsa escala comum.
- **Sistema**: família `--data-*` (toda marca ≥ 3:1, medido); `--signal-green-ink` e `--signal-amber-ink` escurecidos até AA; escala tipográfica com um único corpo (10 · 13 · 20 · 27 · 48); `<strong>` em 600; laços de animação tokenizados; eixos com três marcas e rótulos sem reticências.

**Medição após correção** (tela renderizada, alfa composto): barra 3,58:1 · segmentos 3,58–10,51:1 · chips 4,97–5,82:1 · 4 tamanhos de texto em Visão geral e Financeiro · 0 elementos em peso 700.

### Veredito dos críticos — 2ª passada (capturas headless, 16 telas)

| Crítico | Veredito | Maior lacuna apontada |
|---|---|---|
| Brief | **REPROVA** (14 achados) | "Mês" era 17/08–16/09 no Financeiro e setembro na Agenda, sem datas na tela; listas e tempos relativos datando errado |
| Sistema | **REPROVA** (8 desvios) | Mapa de ocupação e marcas de status em cores calculadas ou sinais brutos abaixo de 3:1 |
| Acabamento | **REPROVA** — perdeu os 3 testes cegos; só M4 passa | Nenhum número manda; azul caindo onde não significa nada (empate Dinheiro × Cartão) |

### Correções da 2ª passada

- **Períodos de calendário em todas as telas** (semana de domingo, mês, trimestre, ano até hoje) com o intervalo escrito sob o seletor; balde em curso listrado e avisado; baldes vazios contados em nota.
- **Tempo relativo por dias de calendário**, com uma escala só (dias → semanas → meses); datas iguais recebem o mesmo texto. "Última consulta" só conta atendimento concluído.
- **Financeiro**: recebido e pago em gráficos separados com eixo próprio em R$ (rótulos alinhados à barra); faixa com número dominante e unidade subordinada; aviso acionável de vencidos com filtro direto; inadimplência completa, do mais antigo ao mais novo, com data.
- **Relatórios**: faltas ÷ (concluídos + faltas), cancelamento fora; legenda com a mesma casa decimal do KPI; rosca trocada por ranking rotulado; epidemiologia em crianças distintas; aviso acionável do dia com mais faltas.
- **Visão geral**: quem está na recepção, desde que horas e há quanto tempo; laudos concluídos sem documento; pacientes sem retorno marcado.
- **Agenda**: status escrito em cada cartão (cor não é o único código); sala em manutenção bloqueada; "Confirmadas" sobre o que ainda vai acontecer.
- **Sistema**: status e sinais na família `--data-*`; ocupação em pontos de área proporcional (≥ 3:1) com legenda idêntica; ritmo de 10px e 13px tokenizado; ferramentas de card sem esmaecer; raios e vãos na escala; título de página abaixo do número dominante.
- **Acento**: ranking só destaca líder único; abas de modo, ícones de sala, "confirmado" e coluna de hoje saíram do azul.

### Veredito dos críticos — 3ª passada

| Crítico | Veredito | Maior lacuna apontada |
|---|---|---|
| Brief | **REPROVA** (12) — confirma que a aritmética interna agora fecha em todas as telas | Coerência entre telas: CID cortado sem aviso, agendamento de hoje ignorado em Pacientes, 28 laudos pendentes invisíveis em Documentos |
| Sistema | **REPROVA** (10) — nenhum texto reprova contraste; tipografia na escala | Listra de "em curso" a 1,90:1 e o mesmo "em curso" com dois códigos |
| Acabamento | **REPROVA** — M1, M4, M6 passam; perde os 3 testes cegos | O número não diz o que significa: falta variação, anotação e comparação na mesma escala |

### Correções da 3ª passada

- **Significado do número**: variação contra o mesmo trecho do período anterior (01–16/09 × 01–16/08) nos KPIs de Financeiro e Relatórios; valor escrito sobre o pico e sobre o período corrente; total e média no topo do gráfico.
- **Caixa acumulado**: recebido e pago somados dia a dia no mesmo eixo, valor final escrito na ponta, despesa tracejada.
- **Um código de "em curso"**: listras em dois azuis ≥ 3:1, em todo grão, com nota só quando a barra existe.
- **Coerência entre telas**: aba "A emitir" em Documentos com a mesma regra da Visão geral; próxima consulta inclui o pendente de hoje; filtro e aviso "sem retorno marcado"; atraso sem chegada explícito na Visão geral e na Agenda; espera em curso declarada fora da média; perfil epidemiológico completo, em linhas de altura única.
- **Honestidade**: faltas por dia em escala fixa (trilha = 50%) e alerta só com amostra mínima; percentuais iguais para contagens iguais; eixo sem meia-marca quebrada; zero dito como zero.
- **Sistema**: faltas e perdas numa só família (vermelho); azul fora de chip informativo, índice, ícones e marcos; anel para "não avaliado" na marca e na legenda; caixa alta com um só tracking; alturas de linha em token; estado de carga do `admin.html` fora de `<style>` embutido (a CSP sem `unsafe-inline` o bloquearia em produção).

### Veredito dos críticos — 4ª passada

| Crítico | Veredito | Maior lacuna apontada |
|---|---|---|
| Brief | **REPROVA** (12) — a soma entre telas fecha | Zero de comparação onde não há histórico; laudos pendentes da criança ausentes no prontuário |
| Sistema | **REPROVA** (10) — contraste, escala tipográfica e tokens de cor limpos | Mesmo conceito em duas cores (despesa, abaixo do mínimo); azul em "Emergente" |
| Acabamento | **REPROVA** — vence 2 de 3 testes cegos (Visão geral, Relatórios) | Colisão no eixo, vermelho decorativo, zeros no lugar da ausência |

### Correções da 4ª passada

- **Ausência ≠ zero**: sem histórico anterior, nenhuma variação é calculada e a tela diz "sem histórico anterior para comparar"; baldes antes do primeiro registro são ditos como tal.
- **Estado da consulta numa regra só** (`core/appointments.js`): atrasado sem chegada, por acontecer e em aberto são os mesmos em Visão geral, Agenda (dia, semana, lista), Relatórios e linha do tempo; confirmado distinguido por ícone.
- **Pendência onde se decide**: laudos a emitir no prontuário (aviso, contagem no índice e emissão já vinculada ao atendimento); títulos vencidos nas pendências da Visão geral para quem tem acesso ao financeiro; aviso acionável de confirmações na Agenda; manutenção de sala com ação.
- **Uma cor por conceito**: despesa em família neutra (linha tracejada); abaixo do mínimo sempre âmbar; emergente em âmbar; status informativo sem azul; aba ativa com um só token.
- **Leitura**: rótulos finais do caixa numa margem própria (nada cobre linha); eixo sem colisão; valor escrito em todas as barras quando cabem; linha do tempo com hora e vínculo evolução→consulta; aviso de que a grade de marcos não cobre a idade; tempo relativo em dias até 20, semanas até 12.
- **Sistema**: entrada escalonada com `--stagger`; nenhuma cor literal fora dos tokens; papéis de `--data-*` e de caixa alta documentados no token.

### Veredito dos críticos — 5ª passada

| Crítico | Veredito | Maior lacuna apontada |
|---|---|---|
| Brief | **REPROVA** (11) — totais batem entre todas as telas | Rótulos que dizem outra coisa: "emitidos" que são a emitir, "09:00" que é 09:30, "06/09" que é 10/09, "confirmada" que está atrasada |
| Sistema | **REPROVA** (9) — cor, contraste, escala, raio, sombra e tempo em token | Aba ativa com duas aparências; um marcador a 1,34:1; faltas em duas famílias |
| Acabamento | **REPROVA** — M1–M6 e M8 passam; só M7 falha; perde os 3 testes cegos | Card com lista colada à borda e linhas de 36px; excesso de rótulos disputando o card |

### Correções da 5ª passada

- **Rótulo = dado**: acumulado datado pelo último dia do balde ("até 12/09"); grade "Por horário" em faixas de hora ("09h"); prontuário com seção "Documentos" e pendência escrita ("9 a emitir"); aba "Atrasado" separada de "Confirmado"; próxima consulta mostra o atraso de hoje; unidade escrita junto do recorte de período.
- **Sem afirmação sem dado**: alerta de faltas sem frase de efeito e com amostra mínima de 5 faltas; "Recebido × pago" em valores absolutos no lugar de "32% × 68%"; saldo escrito sobre o caixa acumulado.
- **Totais que fecham**: o total de consultas da Agenda escreve a soma das partes (por acontecer, atrasadas, recepção, concluídas, faltas).
- **Sistema**: pílula e segmento com a mesma aparência de aba ativa; "acima do mínimo" como texto (sem marca abaixo de 3:1); faltas sempre na família vermelha; amostra da legenda idêntica à barra listrada; papel do texto de 10px escrito no token; líder de ranking decidido pelo valor exibido.
- **Grade de ocupação** com cinco tamanhos exatos (4–20px) até 5 agendamentos; eixo de barras com até 12 rótulos, de linha com até 6, sem colisão (verificado nos quatro períodos).

### 6ª passada

| Crítico | Veredito |
|---|---|
| Brief | não concluído — interrompido pelo limite de uso da sessão |
| Sistema | não concluído — interrompido pelo limite de uso da sessão |
| Acabamento | **REPROVA** — **vence os 3 testes cegos**; M1, M3, M4, M6, M8 passam; falham M2 (âmbar na espera média normal), M5 (Relatórios › Mês sem ação na dobra), M7 (alturas fora de linha-base) |

### Correções após a 6ª passada

- **M7**: cards do bento crescem até o próximo múltiplo de 24px (`core/useBaselineRhythm.js`) — Financeiro 456/456/456/456, Relatórios 432/432/576/576.
- **M5**: Relatórios sempre com ação na dobra — padrão de faltas quando existe, ou confirmações pendentes dos próximos 7 dias.
- **M2**: espera média sem cor de alerta; a espera ao vivo segue escrita.
- **Foco no gráfico**: valor do pico e do período corrente em destaque; demais valores em tinta secundária. Acumulado desenhado em degraus. Duração por tipo vira frase quando não há diferença. Composição do dia sem percentual abaixo de 10 consultas.
- **Rótulos**: variação ao lado do número (não quebra mais o rótulo); intervalo de datas indivisível; nome do paciente inteiro no bloco da agenda.

### 7ª passada — 3 REPROVA, corrigido

- **Brief**: aba "Atrasado" contava sempre 0 (`filter(isLate)` passava o índice como relógio) e ficava fora do card → vem logo após "Todos"; filtros vazios somem; faixa diz "fora 5 canceladas" (90 × 95). Quem está na recepção deixa de aparecer como "Próxima" (lista e prontuário). "Receita" → "Recebido no período". CID F90.0 sem o subtipo inventado. "Sem registros antes de" só quando não há histórico. Frase "sem diferença" exige 5 atendimentos por tipo. Empate do laudo mais antigo nomeado.
- **Acabamento**: faixa de KPIs preenche a célula (vão 31 → 24 px); "Composição do dia" (n=3) vira "Confirmações · próximos 7 dias" e as colunas fecham em 600 px. Caixa acumulado sem linha antes do primeiro lançamento, com o trecho dito. Espera acima de 4 h vira "chegou, sem atendimento" (registro a conferir). Soma do CID explicada. Saldo repetido três vezes removido; Em atraso sobe ao lado do caixa. Variação abaixo de 1 % / p.p. neutra. Estoque com ação. Emitidos vazio sem faixa 0/0/0.
- **Sistema**: legenda = marca (marcos com o ícone da grade; neutro cheio; tracejado em SVG); célula do mapa sem fundo de dado; nível 5 sem `--data-strong`; tabela com uma densidade e recuo de 20 px; barra de proporção com uma altura; ação de estado vazio sempre secundária; aviso de confirmação em âmbar em todas as telas, vermelho só para atraso; regra do destaque de faltas escrita.

### 8ª passada — acabamento REPROVA (só M7), corrigido

- Faixa de KPIs 161 px fora do bento e 168 dentro; faixa de aviso 62 px → ambas entram na linha-base de 24 (168 e 72 px em todas as telas).
- "Recebido e pago por tipo": as duas colunas passam a usar uma escala só.

### 9ª passada — 3 REPROVA, corrigido

- **Brief**: consulta passada sem desfecho (ontem "confirmada", criança "aguardando" desde ontem) sumia das somas ou virava "esperando há 16 h" → estado próprio **sem desfecho registrado**, com a mesma regra na Agenda (aba, KPI, aviso que leva ao dia), Visão geral, Relatórios, Pacientes e prontuário; as partes fecham o total (21 = 7+1+10+3; 97 nas abas). Comparação entre períodos corta no mesmo horário ("01–17/08 até 02h07"). Hoje sem registro é dito na nota e fica fora dos dias vazios. Colunas lado a lado com trilhos iguais.
- **Acabamento**: barra do período corrente listrada em neutro (azul só no menu ativo); taxa de faltas sem vermelho fixo; o número grande da Visão geral é o que pede ação (sem registro › na recepção › consultas do dia); confirmação com âmbar para "sem confirmação". Base de verificação refeita com agenda possível (uma consulta por criança por dia, "primeira consulta" só na primeira vez, hoje segue o relógio, responsável vinculado). Documentos a emitir: linha clicável no lugar de 28 botões iguais.
- **Sistema**: marcos com `--data-positive/negative` e sem anel; proporção principal em `--data-mid`; cabeçalho de card título + subtítulo em toda a Visão geral; "Ver dados" em 13 px no azul de texto de ação; amostra da listra com a forma da barra; margem do caixa em `--s-20`; contagem da aba sem 2 px fora da escala; sem desfecho/atrasado tracejado para não parecer "Faltou".

### 10ª passada — 3 REPROVA, corrigido

- **Brief**: Visão geral ganha "Recebido no mês"; "Caixa acumulado" vira "Recebido e pago acumulados" (a distância entre as linhas é o resultado); semanas rotuladas pelo último dia em toda tela; dia com mais faltas só é apontado com 2 faltas e 5 p.p. à frente do segundo; faltas seguidas (≥ 2) aparecem na Visão geral e na lista de pacientes; teleconsulta sem consentimento aparece na Visão geral e no cabeçalho do prontuário; "sem desfecho" é o único nome do estado; cancelados aparecem riscados na grade da semana; barras com valor até 31 barras.
- **Acabamento**: validade vazia em Operações com ícone, frase e ação; cabeçalho do prontuário sem sobreposição (faixa de alergia livre); grade do dia com linha de 72 px e meia hora na metade de baixo; tipos de atendimento com barra = fatia; colunas lado a lado dizem a escala; R$ 6.980 deixa de aparecer três vezes; "E mais N títulos" vira link; notas dos KPIs sem palavra solta.
- **Sistema**: azul fora do papel removido (faixa "Próxima" e dia corrente da semana neutros); faltas neutras em número e vermelhas em marca, em toda tela; um destaque por gráfico (o pico); mesmo formato de valor nos KPIs de dinheiro; sobrelinha do responsável em micro; traço e "nada registrado" com uma aparência; esqueleto de card com brilho; tempos e alturas de linha por token; número do mapa de calor em corpo; nada a menos de 20 px da borda do card.

### 11ª passada — 3 REPROVA, corrigido

- **Brief**: alerta clínico (faltas seguidas, sem desfecho) também na vista Cards de Pacientes; nota "sem registros antes" diz a semana inteira; base de comparação com horários de lançamento coerentes; contexto de número (nota do KPI, nota de gráfico, data de item de lista, recorte do período) em 13 px; média só sobre períodos fechados; manutenção de sala não pintada sobre dia passado; lista da Agenda em ordem de trabalho (registro que falta › hoje em diante › passado); "Última realizada".
- **Acabamento**: número dominante do Financeiro é o Resultado; aviso "sem desfecho" contado na agenda inteira, visível também no Dia.
- **Sistema**: laudo pendente em âmbar em toda a Visão geral; faixa etária atual neutra; um spinner (--dur-spin, tinta, sem azul); legenda da barra de proporção com a forma do segmento; esqueleto de rota com a forma da tela (faixa 168, cards 456); primeira fatia, meta e traços de gráfico só com tokens de dado; entrelinha do eixo e da data por token; rótulo de KPI com uma aparência; papéis escritos para `--ink-500` e para o número secundário em 20 px.

### 12ª passada — 3 REPROVA, corrigido

- **Brief**: "Última realizada" mostra só o que aconteceu (sem desfecho vai para Situação); mês inicial incompleto (jul, desde 20/07) em barra clara e dito na nota; média só sobre períodos completos, nomeados ("por mês completo (ago)"); A receber/A pagar sem seletor de período (posição de todos os títulos); faixa da Agenda diz o mês inteiro (01 a 30/09); tipo de atendimento no cartão da semana; horário das 09:30 começa na metade da linha; escala do perfil por CID e base da espera média ditas; último ponto do acumulado marcado como em curso.
- **Acabamento**: Pacientes ganha número dominante ("Precisam de atenção"); sinal de negativo no tamanho do número; Agenda destaca "Por acontecer" em vez de somar passado e futuro; barras de taxa de faltas neutras (vermelho só no dia apontado); marcos com contagem zero sem cor de estado; regra das faltas dita como fato ("1 falta a mais que o segundo"); Duração e Espera com a mesma gramática dos vizinhos (selo + base); botão "Novo lançamento" alinhado à borda.
- **Sistema**: data de item, status de bloco, metadados de marco, tooltip e iniciais em 13 px (`--ink-400`); foco de gráfico em `--data-accent`; situação do paciente com o mesmo chip da Agenda (Lista e Cards); avatar de linha com um tamanho; célula de tabela e título de vazio em `--ink-900`; abas inativas em `--ink-400`; líder único de duração com a regra do ranking; medidas de gráfico e grade na escala (`--s-*`); linha, fatia, medidor e legenda só com tokens de dado; spinner declarado uma vez.

### 13ª passada — acabamento APROVA; brief e sistema REPROVA, corrigido

- **Brief**: marco não avaliado conta a partir da idade ESPERADA (aos 16 meses, "Anda sem apoio" entra: 18, não 17); teleconsultas feitas sem consentimento entram na Visão geral e em "Precisam de atenção" (não só as marcadas); variação de duração calculada sobre os valores mostrados (45 − 43 = +2) e sem "−0"; KPIs do Financeiro dizem o período ("Resultado em setembro"); frase das faltas nomeia os dois dias; nota de arredondamento dos percentuais; Cards mostram a última realizada.
- **Sistema**: faltas por dia da semana em números, sem barra (a falta tem uma cor só, e o vermelho fica no dia apontado); selo de variação em 13 px; rótulo direto das linhas em corpo; legenda do mapa por horário igual ao número da célula; contador da aba ativa com `--tab-active-ink`.
- **Acabamento (sem regressão)**: sinal de negativo colado aos dígitos e o mesmo "−" nas comparações; cabeçalho de coluna à direita alinhado aos valores; sem ponto separador sobrando no cabeçalho do prontuário; "14 min" sem quebra.

### 14ª passada — acabamento APROVA; brief e sistema REPROVA, corrigido

- **Brief**: aviso "Sem consentimento" na Agenda (Dia, Semana, Lista e detalhe); Situação em Pacientes lista todas as pendências da criança, com laudos a emitir, e a faixa ganha "Laudos a emitir"; média do trimestre diz as semanas completas sem atendimento que ficaram de fora; dia passado na Agenda não diz "Confirmadas 0" (diz a consulta sem desfecho); faixa de fluxo do Financeiro só na aba Fluxo; "crianças atendidas"; idade limite visível em cada marco; duração por tipo com os valores; rótulos do acumulado com um arredondamento só.
- **Sistema**: um componente de situação (chip) em toda tela, com regra única de ícone (perigo e atenção sempre com ícone, demais nunca); CID com aparência de código, distinta de estado; alergias como texto na faixa; sala em manutenção sem listrado (reservado ao período em curso); horário da Agenda › Lista em 13 px e lista no recuo de 20 px; eixo da grade do dia e sobrelinha da linha do tempo em `--ink-400`; data da saudação fora de `.eyebrow`; iniciais do avatar grande e denominador de KPI com altura de linha por token; valor negativo sempre "R$ −X".

### 15ª passada — 3 REPROVA, corrigido

- **Acabamento (M7)**: toda linha de tabela com 72 px (uma ou duas etiquetas); cards com tabela na linha-base de 24; abas de período com largura fixa (não andam ao trocar de período).
- **Brief**: aba filtrada vazia diz "nenhum nesta aba", não "o sistema começa vazio" (Pacientes e títulos); faixas com esqueleto enquanto carregam, nunca "0" ou "nenhuma falta" antes dos dados (Pacientes, Relatórios, Documentos, Agenda); aviso de vencidos só em Fluxo e A receber, dizendo "a receber"; "Próximos 7 dias" em dias de calendário (amanhã a hoje + 7) e a lista de dias usa a mesma janela, com sem confirmação por dia; sala em manutenção com contorno tracejado e motivo escrito; "27 para 12 crianças"; média "no único mês completo"; legenda de semanas com cada exclusão contada.
- **Sistema**: "Agendado" em âmbar, como "sem confirmação", em toda tela; marca de cancelado e de manutenção com 3:1 ou mais; bloco de consulta da Semana igual ao do Dia (fundo do tom, horário 13 px, nome 500); barra do período em curso fica azul sob cursor e foco; linha "Pago" como série de fundo (`--data-soft`, papel escrito no token); estado vazio de KPI com a mesma aparência em Agenda e Operações; nota dos marcos em 13 px.
- **Fora do loop**: entre 12h08 e 12h10 a barra lateral foi trocada por um Floating Dock (outra sessão). Por decisão do usuário, entra na 16ª passada.

### 16ª passada — 3 REPROVA, corrigido

- **Acabamento (M2, M4, M7)**: links de texto ("Ver dados", "Ver os outros N títulos") em tinta sublinhada, azul só sob cursor; Financeiro e Agenda com linha própria de controles alinhada à esquerda; sala em manutenção como um bloco único da primeira à última hora; linha de hora sempre 72 px (09:30 desenhado meia linha abaixo). Base de verificação: sem atendimento em feriado (07/09) e retorno a cada 21 dias ou mais (42 crianças).
- **Brief**: "Documentos pendentes" vira "Laudos a emitir" (assinatura à parte); abas de Pacientes sem "0" enquanto carrega; Lista da Agenda com títulos "Registro pendente / De hoje em diante / Já passaram"; espera média só de presenciais; "Ver dados" diz "sem registro" antes do primeiro dado; criança acima da faixa da grade de marcos recebe estado próprio (escalas + grade como histórico), sem pendências falsas; "Consultas hoje" cita a cancelada; datas de faltas em "a, b e c".
- **Sistema**: coluna de hoje na Semana sem fundo sob os blocos (contraste 4,40 → acima de 4,5); contador de aba e selo de variação com altura de linha por token.
- **Menu vertical**: é desenho manual do usuário. As críticas sobre ele (item ativo azul com halo, cores fora de token, alvos de 42 px) foram levadas ao usuário e **não** aplicadas; a partir da 17ª passada o menu fica fora do veredito.

### 17ª passada — **sistema e acabamento APROVAM**; brief REPROVA, corrigido

- **Sistema: APROVA.** Contraste sem nenhuma reprovação, 4 tamanhos por tela, azul só em foco/cursor/ordenação, sombra de repouso só `--e-1`, nada invadindo o recuo do card, legenda idêntica à marca. Desvios menores corrigidos depois: anel do CID como borda (não sombra), iniciais de 20 px com `--ls-title`, recuo do índice do prontuário na escala.
- **Acabamento: APROVA.** Vence os três testes cegos e passa M1–M8 pela primeira vez.
- **Brief: REPROVA**, corrigido: rótulo de ponta do gráfico inteiro abaixo de R$ 10 mil ("R$ 4.670", não "R$ 5 mil"); semana sem vencimento não mostra "Pago R$ 0 · −100%" em verde, e diz onde a despesa caiu; "Precisam de atenção" declara a criança que soma duas situações; "Pedir confirmação" mostra a condição de opt-in e vira "Registrar consentimento" sem nenhuma família autorizada (a base de verificação passou a ter opt-in de mensagens); sem falta no período a frase não inventa "a maior taxa"; o botão do aviso some quando já se está no dia; esqueleto de rota com a forma da tela (cabeçalho, faixa, aviso e cards); log de auditoria paginado com o total declarado; copy deixa de prometer duas unidades quando o usuário só tem uma.

### 18ª passada — 3 REPROVA, corrigido

- **Acabamento (M2)**: "Concluído" é o estado normal do dia e ficou neutro em toda tela; verde, âmbar e vermelho só carregando ação. Consulta sem desfecho passou a ter trilho vermelho cheio (era tracejado, mais fraco que os onze verdes ao redor).
- **Sistema**: fim da família monoespaçada não tokenizada (Auditoria, Documentos, Configurações) — Inter com numerais tabulares; esqueleto de carregamento com a superfície, a borda e a elevação do card que ele vira (era mais escuro que o canvas e clareava ao carregar); barra de marcação deixa de usar azul como preenchimento de dado.
- **Brief**: espera passa a ser chegada → início do atendimento ("Esperou 12 min"), e só quem está mesmo na recepção mostra "Esperando há"; consulta sem desfecho ganha "o horário passou há N"; laudo pago e não emitido mostra o valor já recebido na Visão geral e em Documentos; rótulo diz "atendimentos de laudo concluídos, documento não emitido"; Pacientes ganha filtro e botão "Ver quem" para as que precisam de atenção; rótulo de ponta do gráfico usa o mesmo valor do KPI; consulta cancelada aparece riscada também na vista Dia; KPIs de Comunicação ganham denominador e período; consulta encerrada não oferece "Cancelar consulta".

### 19ª passada — **acabamento APROVA**; brief e sistema REPROVA (corrigido no Antigravity)

- **Acabamento: APROVA** (M1–M8 e os três cegos). Ressalvas sem reprovação: espaço morto no pé de dois cards.
- **Brief: REPROVA** — filtro "Consentimento concedido" dizia "nenhum evento" com 109 no log; coluna DETALHE sempre "—" contra a promessa de registrar quem leu qual prontuário; nome de tabela como rótulo; "Concedido em" em finalidade dispensável; contador ambíguo em Consentimentos.
- **Sistema: REPROVA** — esqueleto de carregamento sem a forma do seu par; `var()` para tokens inexistentes; regra de líder aplicada em dois dos três rankings.
- Correções entregues em `docs/correcoes-passada-19.md` e aplicadas pelo usuário no Antigravity.

### 20ª passada — **acabamento APROVA**; brief e sistema REPROVA

- Base recriada para 05/10/2026 (o relógio avançou); 18 capturas às 16h08.
- **Acabamento: APROVA** de novo. Maior lacuna: até 200 px de folga morta em cards que igualam altura com a coluna vizinha.
- **Brief: REPROVA** — o painel afirma lucro em outubro e não mostra R$ 36.760,00 vencendo em 10/10; "Nenhuma despesa paga no período" num mês com 6 despesas lançadas; consulta concluída ainda oferece "Registrar falta"; vista Dia não representa duração e oferece horário ocupado; "sem histórico anterior" onde há histórico; selo de variação sobre amostra de 1 a 3; "5 pendentes" em Consentimentos contando o opcional; KPI da Auditoria não acompanha o filtro.
- **Sistema: REPROVA** — esqueleto promete duas colunas onde vem faixa de 1156; "Confirmado" e "Concluído" com a mesma aparência (1,78:1 entre si); estado do atendimento com três aparências e dois vermelhos; abas com quatro gramáticas para dois papéis; marca de período em curso ausente no gráfico do Financeiro; `var(--line)` e `var(--nudge)` inexistentes; `--ls-micro` no lugar de `--ls-eyebrow`; recuo de 36 px fora da escala; faixas de KPI sem número dominante em Auditoria e Comunicação.
- Correções descritas em `docs/correcoes-passada-20.md`, para o usuário aplicar no Antigravity.

### 21ª passada — 3 REPROVA (correções no Antigravity)

- Base recriada para 06/10/2026; 18 capturas às 05h33.
- **Acabamento**: vence os três testes cegos, falha **M7** — bloco de 40 min com 48 px de caixa para 55 px de conteúdo (regressão do posicionamento por duração); rótulo de ponta assentado na linha-guia errada; trimestre degenerando em linha de 2 marcas; três barras idênticas num card inteiro.
- **Brief**: aviso "registrar no prontuário antes de atender" cortado na gaveta; "1 vigente" contando o que dispensa consentimento (e "Revogar" nele); "−1 faltas a mais" (ordena por taxa, subtrai contagem); selo de tendência sobre n=1; "a última despesa R$ 1.450" onde saíram R$ 36.760; aviso falando "do mês" no trimestre; duas descrições da mesma janela vazia; "Eventos listados" ≠ listados.
- **Sistema**: marca de período em curso ausente no gráfico de linha (e invisível quando o valor é zero); bloco de agenda com "Confirmado" e "Concluído" idênticos; `--success` com barra neutra; Documentos trocando de seção com gramática de recorte; esqueleto genérico (erra a faixa em 8 de 9 rotas); 10 px carregando dado de tabela; anel de foco com dois azuis.
- Correções descritas em `docs/correcoes-passada-21.md` (21 defeitos).

### 22ª passada — **acabamento APROVA**; brief e sistema REPROVA

- Correções da 21ª aplicadas por mim (o Antigravity não gravou nada); base recriada e 18 capturas às 11h54 de 06/10.
- **Acabamento: APROVA** — M1–M8 e os três cegos (3×0). Dívidas registradas: branco morto por coluna igualada (até 46% de um card), faixa virando parágrafo no Ano, chip sem seta, grade de ocupação vazia, verde em "Disponível", fila de laudos sem ação por linha.
- **Brief: REPROVA** — "Espera média" e "Duração média" são a mesma medida (chegada→conclusão) partida no horário agendado, sem registro de início; tracejado com dois significados no mesmo gráfico; "Nenhum dia se destaca" contra 33,3% × 0,0%; violação de consentimento invisível na tela de consentimentos; "8 títulos vencidos" sem direção; cinco menores.
- **Sistema: REPROVA** — esqueleto erra a faixa em 9 de 9 rotas (salto de 185 a 523 px); `chip--info` idêntico a `chip--code`; faixa de Comunicação com o dominante na última célula; bloco da vista Dia sem rótulo de estado; cursor apaga a hachura de período em curso; `var()` para tokens inexistentes; literal de cor; Urbanist carregada sem uso.
- Lista completa em `docs/correcoes-passada-22.md`.
- **Ferramenta**: `cdp.mjs` passou a reconhecer os campos da tela de login redesenhada (a semeadura travava).

### 23ª passada — 3 REPROVA

- Correções da 22ª aplicadas pelo Antigravity; conferidas item a item, com três regressões corrigidas por mim (tokens inexistentes, nome da criança removido do bloco compacto, aba "Todos" renomeada). Base recriada e 18 capturas às 16h16 de 06/10.
- Os críticos rodaram em Sonnet 5.5 (o usuário trocou o modelo na sessão); os dois primeiros lançamentos bateram no limite de uso.
- **Acabamento: REPROVA** — vence Visão geral e Financeiro por margem estreita, **perde o teste cego de Relatórios** (número longe da barra, quatro cards de peso igual); M8 falha em dois estados vazios incompletos (Duração média por tipo e KPI da Agenda Dia). Gráfico do Financeiro/Mês com série "Pago" em R$ 0 sem lançamento e vazio do Trimestre sem ícone/ação **foram corrigidos por mim antes do relançamento**.
- **Brief: REPROVA** — painel do agendamento mostra "Esperou 47 min" sem hora de início (cai para chegada→conclusão), contradizendo a Espera média de Relatórios; "Duração média por tipo" contradiz "Tipos de atendimento"; abrangência das médias não rotulada; "semana completa" de 3 dias; frases menores.
- **Sistema: REPROVA** — marca de período em curso invisível no gráfico de linha (swatch a 2,12:1); contraste 4,37:1 nos blocos "Concluído"; estado com duas aparências entre Dia e Semana; esqueleto ainda fora das medidas reais; preload da Urbanist; cor literal em dado e na autenticação; conteúdo invadindo o recuo; CID com três aparências; líder de ranking com duas gramáticas; troca de seção do prontuário sem a gramática do sistema.
- Lista completa em `docs/correcoes-passada-23.md` (24 defeitos), para o usuário aplicar no Antigravity.

### 24ª passada — 3 REPROVA

- Correções da 23ª aplicadas pelo Antigravity e conferidas; apenas a frase "R$ 8.680 por 14 dos 16 laudos" terminada por mim. Base recriada e 18 capturas às 18h21 de 06/10.
- **Acabamento: REPROVA** — M1–M8 passam; **perde o teste cego do Financeiro** para a referência do mesmo domínio (duas faixas de alerta empurram o gráfico para baixo da dobra, o mesmo valor repetido três vezes, gráfico de 3 degraus com 60% vazio). Ganha Visão geral e Relatórios. Defeito novo: `overflow-wrap: anywhere` parte horas e datas no meio.
- **Brief: REPROVA** — "R$ 0,00 em 01–06/07" onde não há registro (mesmo período descrito de duas formas na faixa); "semana completa" de 3 dias, ainda; espera e duração não dizem entre quais marcos medem; chip de variação sem a base ao lado. A correção central da espera foi **confirmada**: 61 casos, média 23,1, zero divergências entre painel e Relatórios.
- **Sistema: REPROVA** — marca de período em curso (4/4) confunde-se com o tracejado da série "Pago" (8/4); regra de líder falha no Perfil epidemiológico; esqueleto ainda erra posição e alertas; contraste 3,29:1 no item ativo do índice do prontuário; CID com duas aparências; seletor de período em duas posições; segunda fonte de tokens em `boot.css`.
- Lista priorizada em `docs/correcoes-passada-24.md` (18 defeitos; 1–5 e 11–13 reprovam de verdade).
- **Observação de processo**: a rodada 2 ocupa 24 passadas. Cada crítico novo encontra itens finos diferentes dos anteriores, e várias correções geram defeitos novos (tokens inexistentes, quebra de texto). Ver a recomendação ao usuário no registro da conversa.

### 25ª passada — 3 REPROVA, com saldo muito menor (defeitos corrigidos por mim)

- O Antigravity informou ter terminado, mas o projeto não tinha nenhuma alteração desde as 18h30; apliquei eu os defeitos que reprovam de verdade (1 a 5 e 11 a 13 da lista da 24ª). Critério novo nos prompts dos críticos: reprovar só por falha que fere o brief ou por regra do sistema violada; ajustes finos vão para "observações menores". Base recriada, 18 capturas às 22h28 de 06/10.
- **Brief: REPROVA, 3 achados** — (1) o Resumo do paciente dizia "Nenhuma medicação em uso" sem haver registro, contradizendo a aba Medicações: **achado clínico real, corrigido** ("Nenhuma medicação registrada. Confirme com o responsável antes de prescrever"); (2) a janela anterior não era descrita em Duração, Espera e Pago: **corrigido**; (3) leitura de prontuário duplicada no log: **artefato do StrictMode em desenvolvimento**, não do produto compilado; sem alteração. Confirmados: zero inventado eliminado, "nenhuma semana completa no período", espera do painel = Relatórios (61 casos, 0 divergências).
- **Sistema: REPROVA, 2 desvios, ambos corrigidos** — (1) três tracejados no gráfico de linha (grade, "sem lançamentos", período em curso): grade e vazio agora contínuos, tracejado só do período em curso; (2) esqueleto 23 px abaixo da rota real: medido de novo após o ajuste, diferença de ±1 px em Relatórios, Operações e Agenda, 7 px em Financeiro e Documentos (descrição de duas linhas, depois ajustada).
- **Acabamento: REPROVA** — M1–M8 passam; perde 2 dos 3 testes cegos. **A referência do teste de Relatórios mudou** (cards de pesquisa do Ledgerix, em vez da Convox, de indicadores), e o próprio crítico diz que ela "não serve numa clínica". Buracos entre cards (até 360 px na Visão geral) continuam: composição, não erro.
- Saldo: sistema caiu de 18 defeitos para 2; brief de 7 achados para 3, um deles clínico.

### Fechamento da rodada 2 — por decisão do usuário (06/10/2026)

Rodada 2 encerrada na 25ª passada, **por limiar e não por unanimidade**: sistema com 2 desvios (corrigidos) e brief com 3 achados (2 corrigidos, 1 artefato de desenvolvimento) restantes; M1–M8 passam há várias passadas. Critério de fechamento aceito: nenhum defeito aberto de verdade do dado, da regra do sistema ou de segurança clínica.

**Pendências de composição levadas à rodada 3 (não bloqueiam):**
- Buracos entre cards que igualam altura: até 360 px na Visão geral ("Sua agenda de hoje"), 168 px em Relatórios Mês, ~100–130 px em "Produção assistencial".
- Testes cegos: o acabamento perdeu o Financeiro (duas faixas de alerta, valores repetidos) e Relatórios (referência trocada para cards de pesquisa, não comparável) na 25ª; hierarquia de número só na primeira célula da faixa.
- Ajustes finos listados em `docs/correcoes-passada-24.md` (defeitos 6–10, 14–18): `boot.css` com tokens duplicados, CID com duas aparências, seletor de período em duas posições, `@media print` com `#fff` literal, micro em notas.
- Esqueleto: Financeiro e Documentos ainda a poucos pixels da rota real; Visão geral sem os blocos 3 e 4.

## Rodada 3 — ACABAMENTO *(concluída por limiar, 08/10/2026)*

**Peça:** documentos clínicos, modais, transições, micro-interações, impressão
**Referências:** REF 5 (Clerio) + `DesignCharlington.md`
**Critérios:** nada parece inacabado; o painel é da mesma família do site público; o documento impresso sai perfeito

### Trabalho antes da 1ª passada (07/10/2026)
- **Impressão**: `admin/core/print.js` imprime só a folha A4 (marca como ocultos os irmãos de cada ancestral do elemento). Verificado em PDF real: atestado, laudo e prescrição com itens saem em **uma página**, timbrado intacto.
- **Documento**: médico e CRM gravados em `assinatura.medico` e impressos; a impressão entra na auditoria; número do documento 9 pt na folha impressa.
- **QR de verificação** (novo): `admin/components/QRCode.jsx`, SVG vetorial gerado com a biblioteca `qrcode` (um `<path>`, sem `dangerouslySetInnerHTML` nem estilo inline). Só aparece quando a assinatura traz URL de verificação. Lido do PDF por leitor de código (Vision): decodifica para a URL do documento. No painel real a URL vem do provedor de assinatura; sem provedor configurado não há QR (nada fictício).
- **Responsivo**: Visão geral no celular (regra de grade perdia especificidade), agenda de hoje com o selo descendo para a linha de baixo, "Próximos 7 dias" empilhado, abas rolando; menu vertical do dono: a coluna de ícones agora se esconde até 1024 px (mesmo ponto em que o `layout.css` vira o rail em barra inferior) e o hambúrguer assume. Editado a pedido dele em `src/components/ui/floating-dock.css`.
- **Modal de emissão**: faixa vazia de 40 px entre o conteúdo e o rodapé eliminada (`.doc-split` cancelava só a margem, não a altura).

### Rodada 3 · 1ª passada — **sistema APROVA**; brief e acabamento REPROVA, corrigido
- **Sistema: APROVA**, sem achado que reprove. Observações: alvos de toque ≤ 40 px no celular (corrigido com `--touch: 40px`), breakpoint 520 px solto, `bottom: 76px` do overlay amarrado à altura do rail, foco da paleta, tokens em `print.css`.
- **Brief: REPROVA, 3 achados clínicos reais, corrigidos** — (1) a idade impressa usava o dia da reimpressão e não o da emissão ("22 meses" num documento de 24/09 em que eram 21): agora `age(nascimento, assinadoEm)`; (2) a assinatura em lote apagava `assinatura.medico` e a folha caía num nome fixo, além de gravar a chave crua do provedor ('birdid'): o lote preserva o médico e grava o rótulo, e o nome fixo saiu (aparece "Profissional não identificado"); (3) texto longo invadia assinatura, QR e rodapé do timbrado: o modal mede a pré-visualização (que tem a mesma proporção da impressão) e **bloqueia "Assinar e emitir"** com aviso quando o corpo não cabe em uma folha (≈1,6 mil caracteres). Verificado: 2.400 caracteres travam, 600 liberam. Observações guardadas: linha "Responsável" não gravada no documento; `[período — preencher]` do atestado médico passa na validação; o gatilho `documento_imutavel` não congela `paciente_id`/`tipo`/`numero`/`titulo`/`praca`; número consumido antes da assinatura; hash cobre só tipo, texto, itens e paciente.
- **Acabamento: REPROVA, 2 achados, corrigidos** — (1) na Agenda (Dia) o nome do paciente ficava com 3 px nos cards compactos e quebrava letra por letra: o bloco curto passou a duas linhas (nome em cima, situação embaixo); (2) o documento hifenizava e justificava ("le-vetiracetam"): `text-align: left; hyphens: manual`. Também: o foco inicial dos modais cai no primeiro campo e não no X.
- Observações do acabamento mantidas: transições de saída ausentes nos overlays; o par modal+gaveta tem menos "clima" que a REF 5 (neutro, só o A4 carrega identidade); busca estreita e tabela cortada em Documentos no celular; "Recebido no mês" órfão no tablet.

### Rodada 3 · 2ª passada — **sistema APROVA**; brief e acabamento REPROVA (1 achado cada), corrigido
- **Sistema: APROVA.** Observações: comentário velho sobre `.is-compact`, abas com dois blocos `@media` em sequência, medição do modal sem refazer no resize, `bottom: 76px` do overlay, `rgba()` literais em `auth.css` e nos balões do chat (dívida fora do escopo).
- **Brief: REPROVA, 1 achado, corrigido** — a medição do "texto não cabe numa folha" valia só com a folha em 460 px; abaixo de ~550 px de janela a folha encolhe, o texto reflui e **o modal bloqueava até o documento vazio no celular**. Agora a medida é feita numa cópia invisível sempre com 460 px (`.doc-measure`), refeita quando a fonte termina de carregar. Verificado em 390 e 1280 px: texto padrão e laudo de 1.000 caracteres liberam; 2.400 travam. Confirmados pelo crítico: idade na emissão correta nos três PDFs, lote preserva o médico, hifenização removida, QR decodifica para a URL impressa nos três, sem QR sem URL, timbrado intacto. Junto: os itens da prescrição agora resolvem `{{variáveis}}` antes de gravar/hash/imprimir e entram em "variáveis sem valor"; rodapé do modal quebra em linhas no celular.
- **Acabamento: REPROVA, 1 achado, corrigido** — Agenda/Dia no celular: colunas de sala de ~110 px deixavam o nome do paciente ilegível nos cards curtos. Abaixo de 640 px a coluna tem 168 px (a grade rola na horizontal) e o card curto mostra nome em cima e situação embaixo, sem o horário (que fica no eixo e no painel de detalhe). Confirmados: documento sem hifenização, foco inicial no primeiro campo, bloqueio de texto longo. Observações: o par modal + gaveta tem menos "clima" que a REF 5; botão desabilitado sem o motivo ao lado; aba "Modelos" cortada e busca estreita em Documentos no celular; sem animação de saída nos overlays.
- Também nesta fase: dados de demonstração carregáveis pelo dono (`admin/dev/`, ver `dec-dados-demonstracao-no-painel-do-dono-so-dev-e-removiveis` no cofre); a regra `.bento-full` no rodapé de Configurações.

### Rodada 3 · 3ª passada — **sistema e brief APROVAM**; acabamento REPROVA (1 achado), corrigido
- **Sistema: APROVA.** Build de produção rodado numa pasta temporária: nenhuma marca da base de demonstração no pacote; ramo `import.meta.env.DEV` elimina o módulo; sem estilo inline novo.
- **Brief: APROVA.** Bloqueio de texto longo testado nos 11 tipos de documento em 390 e 1280 px (limite do laudo ≈1.267 caracteres nas duas larguras; laudo de 1.260 coube numa página A4); itens da prescrição resolvem `{{variáveis}}`; mecanismo da demonstração recusa o modo servidor e a remoção preserva o que o dono criou sem vínculo. Observações atendidas na hora: laudo de epilepsia da demonstração ligado a paciente com G40.9; atestado de comparecimento gerado a partir de uma consulta concluída; datas de nascimento sem deslocamento de fuso; QR com zona de silêncio de 4 módulos (norma) e 20 mm impresso; selo da assinatura em 8 pt. Os três QR decodificam a 1.600 e 2.400 px.
- **Acabamento: REPROVA, 1 achado, corrigido** — o aviso "Dados de demonstração" empurrava a barra superior para 528 px no celular (rolagem horizontal, pílula "Dashboard" espremida, lupa por cima). No celular o aviso vira só o ícone (texto mantido para leitor de tela) e a barra reduz o espaçamento enquanto ele existe: página em 390 px, pílula inteira e sem sobreposição. Confirmados: Agenda/Dia em 390 px com nomes inteiros, modal de emissão sem travar sem motivo, documento impresso sem defeito.

### Rodada 3 · 4ª passada (só acabamento) — REPROVA (1 achado), corrigido
- **Confirmado:** o aviso "Dados de demonstração" não estoura mais a barra (página igual à janela em 360, 375, 390, 480, 640, 768 e 1280 px; pílula inteira; sem sobreposição); M1–M8 passam; documento impresso aprovado nos três PDFs (folha única, QR de 20 mm com zona de silêncio, idade da emissão, sem hifenização).
- **Achado, corrigido:** Visão geral no celular, "Sua agenda de hoje": nome do paciente com 47 px ("Heito…") e a linha de tipo quebrando em três. A correção da 1ª passada dependia de quebra automática de linha e falhava com selo curto ("Concluído"). Agora, em ≤640 px, grade fixa de duas linhas: avatar à esquerda, nome em cima (184 px) e selo embaixo.
- Também: o foco inicial das gavetas com formulário cai no primeiro campo (antes, no X).
- **Varredura própria**, para não depender de achar defeito do mesmo tipo passada a passada: as 11 telas do painel em 360 e 390 px, medindo rolagem horizontal e blocos de texto longo com menos de 80 px de largura (fora tabelas e grade da agenda): nenhum.

### Rodada 3 · 5ª passada (só acabamento) — REPROVA (3 achados de celular), corrigidos
- **Confirmado:** Visão geral em 390 px com o nome inteiro; o resto do que a 4ª confirmou.
- **Achados, todos de largura no celular, corrigidos:** (1) Agenda › Lista: linha em três colunas espremidas, nome com ~70 px quebrando palavra por palavra e selo sobre o nome; título do card com ~50 px sob as abas. Agora: data e hora em cima, avatar e nome ao lado, selos embaixo; (2) Prontuário: título "Linha do tempo" com ~35 px sob as abas e botão "Emitir documento" cortado. Cabeçalho de card passa a quebrar (ações descem), ações do paciente quebram; (3) Financeiro e Relatórios: `.period-tabs` com 400 px fixos empurrava a página para 416 px e cortava "Novo lançamento" e "Exportar CSV". Agora `min(400px, 100%)`.
- **Mais, achado por varredura melhorada:** cabeçalho de Documentos com 408 px dentro de 358 (colunas do cabeçalho agora limitadas à largura da tela); busca da tabela com 240 px contra 316 do filtro abaixo.
- **Lição:** a varredura da 4ª passada só olhava texto isolado e deixou passar defeitos de cabeçalho de card e de largura fixa. A nova varredura (`varredura2.js`) procura qualquer elemento que passe da borda fora de uma área com rolagem e títulos com menos de 90 px, em 19 telas e abas, e fica limpa em 390 px (as legendas só para leitor de tela são falso positivo conhecido).

### Rodada 3 · 6ª passada (só acabamento) — REPROVA; 5 de 6 achados corrigidos, 1 pendente do dono
- **Confirmado na tela:** os quatro pontos da 5ª passada (Agenda › Lista, cabeçalho do prontuário, abas de período, cabeçalho e busca de Documentos).
- **Corrigidos (só CSS, 390 px):** Prontuário › Consentimentos (texto com ~85 px; agora empilha, ação desce e o selo quebra linha); Configurações › Acessos e Operações › Equipe (e-mail quebrando letra por letra; selos descem); Operações › Salas (situação sobre o nome); Relatórios › Semana (selo `.delta` mais largo que a métrica; agora quebra); Documentos › Modelos (botões do cabeçalho do card quebram).
- **Pendente, fora do meu alcance:** `AgendaScreen.jsx` foi alterado às 11:45 por edição do dono (entraram "eventos": `isEvent`, `slot--event`, título e ícone) e a linha `const compact = blockHeight < 64;` sumiu enquanto ainda é usada (linhas ~483–495): a Agenda inteira (Dia, Semana, Por horário) abre "Esta tela falhou ao carregar" (`ReferenceError: compact is not defined`). Não alterei o arquivo (edição manual do dono é preservada). Dia/Semana/Por horário ficam sem avaliação até a correção.
- **Varredura de celular** (`varredura-celular.js`), agora com sobreposição entre irmãos e colunas de texto com menos de 48 px, em 29 telas e abas: limpa em 390 px (Agenda não medível pelo erro acima).

### Rodada 3 · retomada (08/10/2026)
- O dono corrigiu a Agenda (eventos agora sem emoji) e pediu para **remover da Agenda a coluna "Recepção Central"**, porque todas as consultas acontecem no único ambiente, a Sala de Atendimento Neuropediátrico. Feito em `AgendaScreen.jsx` (arquivo dele, mudança pedida): a grade mostra só essa sala e a consulta ligada a outra sala aparece nela (só exibição, nada é gravado). A sala continua cadastrada em Operações e disponível como local de evento nas Mensagens; apagá-la do banco não resolveria, porque `normalizeClinicRooms()` a recria. Verificado: uma coluna na largura toda em 1280 e 390 px, e Dia, Semana, Lista e Por horário abrem.

### Rodada 3 · 7ª passada (só acabamento) — REPROVA (3 achados), corrigidos
- **Confirmado:** Agenda com sala única nas quatro vistas em 1280, 768 e 390 px, sem a coluna da Recepção, consulta nunca some, novo agendamento não pede sala; as seis telas corrigidas na 6ª; prontuário (8 abas), Pacientes, Documentos, Comunicação, Financeiro, Operações, Auditoria, Configurações, Mensagens, modais e os três PDFs (página única, QR, timbrado).
- **Achados, corrigidos:**
  1. **Folha do documento no celular (critério c).** Em 390 px a pré-visualização quebrava: o título caía sobre a assinatura e o corpo, o selo e o QR se sobrepunham, porque a folha encolhia só na largura e o texto refluía. Agora a folha é sempre desenhada em 460 px e reduzida inteira (`.sheet-fit` + `transform: scale`, escala 0,69 em 390 px), como a cópia de medida do modal já fazia. A impressão não muda (as regras de `print.css` anulam a escala): três PDFs de uma página e QR decodificando nos três.
  2. **Pacientes › Cards:** o selo "Teleconsulta sem consentimento" empurrava as ações do rodapé do card para fora. O rodapé quebra linha no celular (nenhum elemento fora do card nos 42 cartões).
  3. **Relatórios › Semana:** o selo "sem variação (7 em 27–30/09 até 12h40)" é um `Chip`, não um `.delta`, e passava por cima da coluna vizinha. Selos dentro da métrica agora quebram linha.
- **Varredura de celular** agora abre também Pacientes › Cards e ignora elementos invisíveis (dicas do gráfico que se alternam): 30 telas e abas, limpa em 390 e 360 px; em 768 só um falso positivo (título curto de Integrações).
- Observações guardadas: Skyline ilegível em 390 px (o Mapa está certo); linha do usuário em Acessos/Equipe ~8 px fora do padding; selo "2 a emitir" desce no menu lateral do prontuário; área de rolagem pequena no modal de emissão em 390 px.

### Rodada 3 · 8ª passada (só acabamento) — REPROVA (1 achado), corrigido
- **Confirmado:** a folha do documento em 390 e 360 px (inteira, reduzida, sem sobreposição; impressão em página única); Pacientes › Cards e Relatórios › Semana; sem defeito em 9 modais/gavetas e estados vazios em 390 px, nem em 8 telas em 768 px.
- **Achado, corrigido (`PatientForm.jsx`):** a gaveta "Nova ficha de paciente" dizia "Só o nome e a data de nascimento são obrigatórios", mas a regra exige também nome e telefone de um responsável; ao tocar em "Cadastrar paciente" nada ficava destacado na tela (o campo com erro estava abaixo da dobra). Agora o texto diz o que é obrigatório (nome e nascimento da criança, nome e telefone de um responsável) e o erro leva o foco e a rolagem ao primeiro campo inválido. A regra do responsável obrigatório é do dono e foi mantida.
- Observações guardadas: paleta ⌘K corta o placeholder em 390 px; Mensagens (do dono) rola até o campo de digitação ao abrir e deixa um ponto solto em "· Ramal 101"; abas de período de Relatórios em 768 px começam recuadas; foco inicial da gaveta de detalhe cai no X (não há campo).

### Rodada 3 · 9ª passada (fechamento, três críticos) — brief APROVA; sistema e acabamento REPROVAM, corrigido
- **Brief: APROVA.** QR dos 3 PDFs decodifica para a URL impressa (página única, zona de silêncio de 4 módulos, 20 mm); o interior da folha e as margens 140/45/110/60 não mudaram (só o invólucro de escala); demonstração fora do build de produção; Agenda com sala única sem consulta sumindo da grade, nada gravado; `PatientForm` com a regra de validação intacta; modal de emissão sem falso bloqueio em 390 px.
  - Observações do brief atendidas: (1) eventos criados nas Mensagens com local "Recepção Central" apareciam na Agenda como "Sala de Atendimento" por causa do remapeamento da sala (regressão minha): a grade continua exibindo na sala de atendimento, mas o detalhe mostra o local gravado (`salaIdOriginal`, `allRooms`); (2) demonstração: Alice saía masculino, queixas incompatíveis com a idade (criança de 2 anos com "dificuldade de leitura") e atestado de comparecimento vindo de teleconsulta: corrigidos. A criação/remoção das salas na demonstração foi alterada por outra mão para as duas salas oficiais e mantida.
- **Sistema: REPROVA, 1 achado, erro meu, corrigido** — as regras `.demo-actions`/`.demo-badge` tinham caído no meio da lista de seletores `.consent-note, .audit-note, .report-note, .form-note` de `patients.css`, e as notas de Consentimentos, Auditoria e Relatórios perdiam alinhamento, fonte, cor e espaço. Lista restaurada e regras da demonstração em bloco próprio; medido: 13 px, alinhado ao topo, gap de 8 px. Auditoria de todos os CSS (chaves balanceadas). O resto passou (cascata dos blocos `@media`, `calc()`, tokens, CSP, demonstração fora do pacote).
- **Acabamento: REPROVA, 3 achados, corrigidos** — (1) Agenda › Lista em 768–1000 px: o título do card encolhia a 0–200 px sob as abas. O cabeçalho de card agora quebra em qualquer largura (título numa linha em 390, 768, 1024 e 1280 px); (2) Financeiro › "Recebido por forma de pagamento" em 390 px: valor até a borda e trilha sumida; agora rótulo e valor na primeira linha e a trilha na largura toda, embaixo; (3) Configurações › Papel timbrado parecia inacabado (caixa tracejada vazia e botão "Enviar timbrado" sem função): o envio agora funciona. Aceita JPG/PNG de até 6 MB, mínimo de 800 px, proporção A4 retrato (recusa paisagem e PDF), guarda no cofre local e vale na pré-visualização e na impressão; "Usar o padrão" volta ao timbrado de Campinas. Testado: arquivo válido, paisagem e PDF recusados, impressão em página única com timbrado enviado, volta ao padrão. O texto dos documentos já assinados não muda, só o papel.
- **Varredura de celular** passou a achar também largura zero e texto colado na borda do cartão: limpa em 768 e 1024 px; em 390 px acusa só "Próximos 7 dias · 08/10 a 14/10" sobreposto no painel de agenda da Visão geral, que é peça nova do dono (`overview/AgendaPanel.jsx` e `agenda-panel.css`, criados às 16:10 e ainda em edição): relato, sem correção.
- Observações guardadas: tabelas em 390 px cortam a coluna "Situação" dentro do card; toast "Descreva o lançamento." cobre o campo Observações; KPI "Faltas" sozinho na última linha; "Nenhum dado de demonstração carregado" aparece com a base já populada (a base de verificação não é a demonstração).

### Rodada 3 · retomada com o painel de agenda do dono pronto (08/10/2026)
- O dono terminou o novo painel de agenda da Visão geral (`overview/AgendaPanel.jsx`, `agenda-panel.css`: Dia, Semana, Mês e Lista) e autorizou corrigir o que estivesse espremido. A varredura de celular passou a abrir também essas vistas.
- **Corrigido (CSS):** (1) "Próximos 7 dias · 09/10 a 15/10" ficava numa coluna de 58 px e quebrava em quatro linhas; agora o título ocupa a linha e a contagem desce; (2) Semana no celular: colunas de 84 px cortavam o nome do paciente ("Arthur ..."); agora 132 px por dia, com a grade rolando na horizontal; (3) "Precisa de você": o aumento dos botões de ícone para 40 px mais o novo botão "Remarcar" deixavam o texto com 144 de 316 px; agora o texto ocupa a linha inteira e os botões ficam à direita, embaixo; (4) Operações › Salas em 360 px: a coluna tinha mínimo fixo de 320 px, maior que o espaço útil; agora `min(320px, 100%)`.
- **Varredura de celular** (33 telas e abas, incluindo as vistas do painel de agenda): limpa em 360, 390 e 1024 px; em 768 só aparece um falso positivo na vista Mês (conferido na captura). Falsos positivos conhecidos: legendas só para leitor de tela, texto em linha dentro de alertas, dicas do gráfico que se alternam.

### Rodada 3 · 10ª passada — sistema (sonnet) e brief (opus) APROVAM; acabamento (opus) REPROVA, corrigido
- **Modelos por tarefa:** checagem mecânica em haiku (build de produção, chaves de CSS, estilo inline, literais: passou nas 5 verificações), sistema em sonnet, brief e acabamento em opus (o fable exigia créditos de uso extras e foi trocado por opus).
- **Sistema: APROVA.** Cascata de todos os blocos `@media`, tokens, `calc()`, cartão do timbrado (input escondido com botão visível, `alt`, português), CSP.
- **Brief: APROVA.** Timbrado próprio: validações em português (GIF, 600 px, paisagem, quadrada, bytes inválidos e 6 MB recusados); com um timbrado de teste salvo, os três documentos assinados ficaram idênticos byte a byte (número, hash, status), os três PDFs saíram em uma página, com o mesmo texto e o QR na mesma posição, decodificando para a URL impressa; leitura da meta que falha não quebra a folha; teste removido. Agenda: reatribuição só na exibição; remarcação grava só início, fim e status. PatientForm: regra intacta, foco no primeiro campo inválido. Observações atendidas: impressão espera o timbrado decodificar (`img.decode()`); comentário de `customLetterhead.js` corrigido (em modo servidor vai para a tabela de metadados; tolerância de ±3,5%); botões do timbrado com nome acessível por unidade; atestado da demonstração concorda em gênero; "Remarcar" com alvo de toque de 40 px; base de verificação sem as duas contradições (laudo de epilepsia em paciente com G40.9; "o paciente").
- **Acabamento: REPROVA, 2 achados, corrigidos** — (1) **crase no modelo do atestado de comparecimento** ("compareceu a consulta" → "à consulta"), que sairia em todo atestado assinado (`documentTemplates.js`; também na demonstração e na base de verificação); documentos já assinados não mudam; (2) **painel de agenda da Visão geral, busca ativa em 390 px:** o botão "Limpar" entrava na linha dos filtros e os três encolhiam a ~63 px, perdendo a seta; agora "Limpar" desce para a linha de baixo e os filtros ficam com 100 px cada. Observações atendidas: no "Novo lançamento" o erro agora aparece no próprio campo e o foco vai até ele (antes só um aviso flutuante que cobria os campos); texto do papel timbrado sem o jargão "herdado do painel anterior"; um timbrado vermelho de teste deixado por um crítico foi removido da base.
- Observações mantidas: nomes truncados na Semana do painel mesmo com 132 px; anel de foco retangular em botão de filtro em pílula; indicador "agora" do Dia como traço solto no rodapé; Dia sem resultado ainda desenha a grade vazia (a Lista tem estado vazio melhor); lista de pacientes por cima do formulário no Novo agendamento em 768 px; pílula "Dashboard" vazia em 360 px (peça do dono).
- **Observação sobre código do dono (relatada):** `normalizeClinicRooms()` em `repository.js` roda a cada carga da Agenda, de Operações e da sessão, também em modo servidor; renomeia salas, reatribui `salaId`, apaga salas fisicamente e grava sem auditoria; não filtra por praça.

### Rodada 3 · 11ª passada (só acabamento, opus) — REPROVA (1 achado), corrigido
- **Confirmado:** crase no modelo do atestado de comparecimento; "Novo lançamento" marca Descrição e Valor com a mensagem e leva o foco ao campo; Papel timbrado sem jargão; varredura manual em 390 px de Pacientes (Lista e Cards), das 8 abas do prontuário, Documentos (4 abas), Comunicação, Operações, Relatórios e Auditoria, sem defeito de largura que reprove.
- **Achado, corrigido:** no painel de agenda da Visão geral, com o filtro de Situação ativo o contador ("Situação 1") pedia ~108 px num botão de 100 e quem encolhia era a seta, que virava um traço. Agora cada filtro tem a largura do próprio conteúdo e a seta e o contador não encolhem: medido com Situação e Sinais ativos, botões de 115, 88 e 98 px, setas de 13 px, página em 390 px.
- Observações atendidas: respiro entre a etiqueta "Base legal própria" e o botão em Consentimentos; ações dos cards de paciente sempre à direita, mesmo quando descem de linha.
- Observações mantidas: "painel anterior" nos textos de Documentos › Modelos (é o nome real da função de importar modelos legados) e duas chamadas para importar na mesma tela; aba "Modelos" cortada na rolagem; seletor de Auditoria sem a largura da busca; contador "3" de Evoluções no alto da linha.

## Fechamento da rodada 3 — por limiar (08/10/2026)

Rodada 3 encerrada na 11ª passada, **por limiar e não por unanimidade na mesma passada**, como na rodada 2: sistema e brief aprovaram na 10ª; o único achado do acabamento na 11ª foi corrigido e medido, e o restante são observações de acabamento (nomes truncados na Semana do painel, anel de foco retangular em filtro em pílula, grade vazia no Dia sem resultado, "clima" menor que o da REF 5). Nenhum defeito aberto de dado, de regra do sistema, de segurança clínica ou de documento impresso.

**Pendências que não bloqueiam:** composição (buracos entre cards na Visão geral, hierarquia da faixa de KPIs); animações de saída dos overlays; Skyline ilegível em 390 px; tabela larga que rola dentro do card; pílula "Dashboard" estreita em ≤ 390 px e `normalizeClinicRooms()` em `repository.js` (peças do dono, relatadas).

**Para a finalização do projeto:** apagar `admin/dev/` e as ligações da demonstração (`SettingsScreen.jsx`, `Shell.jsx`, `.demo-*` em `patients.css`); restaurar `.env.local` a partir de `.env.local.parked` quando o painel for ligado ao Supabase (a demonstração some por desenho nesse modo); decisão do dono sobre a auditoria de segurança (`auditoria-seguranca-2026-10-05`).

---

## Redesign visual — vidro, gradiente com sentido, matriz de pontos (14/10/2026)

**Pedido do dono:** reformulação visual do painel inteiro no estilo das 11 referências, preservando todas as funções; alinhado por /grill-me (decisão `dec-redesign-painel-vidro-claro-multicolor-por-sentido` no cofre). Só o menu vertical fica fora.
**Régua:** [`bar-redesign.md`](bar-redesign.md) · **Passadas:** 2 (pedido do dono) · **Correções:** aplicadas por mim (exceção pontual).

**Peças**

| Peça | Telas | Capturas |
|---|---|---|
| 1 · Visão geral | hero com régua de tiques, assistente, agenda, produção; celular; movimento | `shots/redesign-pN/p1-*` |
| 2 · Telas de dados | Financeiro, Relatórios (calendário de pontos), Pacientes (Lista e Cards) | `p2-*` |
| 3 · Fluxos e entrada | Agenda, Documentos, prontuário, modal, gaveta, paleta, Operações, Configurações, login com logo líquido | `p3-*` |

**Críticos:** brief (opus, só o objetivo), sistema (sonnet, tokens e DOM medidos), acabamento (opus, régua + comparação cega com a REF Superpower/CreditPros).

### 1ª passada

| Crítico | Peça 1 | Peça 2 | Peça 3 | Maior lacuna |
|---|---|---|---|---|
| Brief | … | … | … | … |
| Sistema | … | … | … | … |
| Acabamento | … | … | … | … |

---

## Contagem

| | |
|---|---|
| Rodadas concluídas | 3 (a 2 e a 3 fechadas por limiar, por decisão do dono na 2 e mesmo critério na 3) |
| Rodada 2 | 1ª passada: 2 REPROVA + 1 não executado · 2ª: 3 REPROVA · 3ª: 3 REPROVA · 4ª: 3 REPROVA · 5ª: 3 REPROVA · 6ª: acabamento REPROVA (vence os 3 cegos), brief e sistema interrompidos · 7ª: 3 REPROVA (acabamento vence os 3 cegos; falha M7 e M8) · 8ª: acabamento REPROVA só em M7 (vence os 3 cegos), brief e sistema interrompidos pelo limite · 9ª: 3 REPROVA (acabamento: M2 e perde o cego da Visão geral) · 10ª: 3 REPROVA (acabamento vence os 3 cegos, falha só M8) · 11ª: 3 REPROVA (acabamento vence os 3 cegos, falha só M3) · 12ª: 3 REPROVA (acabamento vence os 3 cegos, falha M2 e M3) · 13ª: **acabamento APROVA** (M1–M8 e os 3 cegos); brief e sistema REPROVA · 14ª: **acabamento APROVA**; brief e sistema REPROVA · 15ª: 3 REPROVA (acabamento vence os 3 cegos, falha só M7) · 16ª: 3 REPROVA (acabamento vence os 3 cegos, falha M2, M4 e M7 — M4 e M7 no menu manual) · 17ª: **sistema e acabamento APROVAM** (M1–M8 e os 3 cegos); brief REPROVA · 18ª: 3 REPROVA (acabamento falha só M2; sistema, 2 desvios; brief, 7 achados) · 19ª: **acabamento APROVA**; brief e sistema REPROVA · 20ª: **acabamento APROVA**; brief e sistema REPROVA · 21ª: 3 REPROVA (acabamento falha só M7) · 22ª: **acabamento APROVA** (M1–M8, 3×0 nos cegos); brief e sistema REPROVA · 23ª: 3 REPROVA (acabamento perde o cego de Relatórios e falha M8) · 24ª: 3 REPROVA (acabamento perde o cego do Financeiro; M1–M8 passam) · 25ª: 3 REPROVA (sistema 2 desvios e brief 3 achados, todos corrigidos; acabamento perde 2 cegos, M1–M8 passam) |
| Rodada 3 | 1ª passada: **sistema APROVA**; brief 3 achados e acabamento 2 achados, todos corrigidos · 2ª passada: **sistema APROVA**; brief e acabamento 1 achado cada, corrigidos · 3ª passada: **sistema e brief APROVAM**; acabamento 1 achado, corrigido · 4ª (só acabamento): 1 achado, corrigido · 5ª (só acabamento): 3 achados de celular, corrigidos · 6ª (só acabamento): 5 achados corrigidos; Agenda quebrada por edição do dono (corrigida por ele) · 7ª (só acabamento): 3 achados, corrigidos · 8ª (só acabamento): 1 achado, corrigido · 9ª (fechamento): brief APROVA; sistema 1 achado e acabamento 3, corrigidos · 10ª: sistema e brief APROVAM; acabamento 2 achados, corrigidos · 11ª (só acabamento): 1 achado, corrigido; **rodada fechada por limiar** |
| Rodadas pendentes | nenhuma |
| Críticos executados | 3 de 9 — acabamento, sistema e brief, **os três REPROVA** |
| Achados corrigidos | 15 |
| Rodada 1 | correções aplicadas e verificadas na tela |

Referências da crítica: `.claude/design-loop/refs/` (fora do git, baixadas de novo após o diretório temporário ser limpo).

Verificador de contraste reutilizável: [`scripts/check-contrast.js`](../scripts/check-contrast.js)
— cole no console em cada tela. Não é teste de build porque contraste depende
da composição alfa em tempo de execução: ler `rgba(15,16,18,.08)` como se fosse
opaco gera falso positivo em massa, e foi exatamente o que aconteceu na
primeira tentativa de medir.

O freio real desta execução é você acompanhando e mandando parar.
