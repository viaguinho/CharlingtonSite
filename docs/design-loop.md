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

## Rodada 3 — ACABAMENTO *(a executar)*

**Peça:** documentos clínicos, modais, transições, micro-interações, impressão
**Referências:** REF 5 (Clerio) + `DesignCharlington.md`
**Critérios:** nada parece inacabado; o painel é da mesma família do site público; o documento impresso sai perfeito

---

## Contagem

| | |
|---|---|
| Rodadas concluídas | 1 (construção + 3 críticos + correções) |
| Rodada 2 | 1ª passada: 2 REPROVA + 1 não executado · 2ª: 3 REPROVA · 3ª: 3 REPROVA · 4ª: 3 REPROVA · 5ª: 3 REPROVA · 6ª: acabamento REPROVA (vence os 3 cegos), brief e sistema interrompidos · 7ª: 3 REPROVA (acabamento vence os 3 cegos; falha M7 e M8) · 8ª: acabamento REPROVA só em M7 (vence os 3 cegos), brief e sistema interrompidos pelo limite · 9ª: 3 REPROVA (acabamento: M2 e perde o cego da Visão geral) · 10ª: 3 REPROVA (acabamento vence os 3 cegos, falha só M8) · 11ª: 3 REPROVA (acabamento vence os 3 cegos, falha só M3) · 12ª: 3 REPROVA (acabamento vence os 3 cegos, falha M2 e M3) · 13ª: **acabamento APROVA** (M1–M8 e os 3 cegos); brief e sistema REPROVA · 14ª: **acabamento APROVA**; brief e sistema REPROVA · 15ª: 3 REPROVA (acabamento vence os 3 cegos, falha só M7) · 16ª: 3 REPROVA (acabamento vence os 3 cegos, falha M2, M4 e M7 — M4 e M7 no menu manual) · 17ª: **sistema e acabamento APROVAM** (M1–M8 e os 3 cegos); brief REPROVA · 18ª: 3 REPROVA (acabamento falha só M2; sistema, 2 desvios; brief, 7 achados) · 19ª: **acabamento APROVA**; brief e sistema REPROVA · 20ª: **acabamento APROVA**; brief e sistema REPROVA · 21ª: 3 REPROVA (acabamento falha só M7) · 22ª: **acabamento APROVA** (M1–M8, 3×0 nos cegos); brief e sistema REPROVA |
| Rodadas pendentes | 2 (dados e componentes) e 3 (acabamento) |
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
