# Relatórios — redesign no estilo "Modern CRM Analytics" (16/10/2026)

Especificação fechada com o dono por /grill-me. É o prompt original, melhorado
com as decisões e os detalhes técnicos. Vale para quem constrói e para os
críticos do design-loop.

Referência: Behance 236915009 "Modern CRM & Analytics Platform" (Gulshan Ali /
Ibdai Studio). A tela-base é "Product Sales Performance". Da tela "Your Sales
Analysis" só entram dois gráficos: as barras do *Sales Funnel* e o mapa de
calor do *Order*. Nada do layout dela.

## 1. Escopo

- Muda só a rota `#/relatorios` (`admin/modules/reports/`). O menu vertical
  (Floating Dock, Rail, `.rail*`, `floating-dock.*`) e a barra do topo ficam
  intocados.
- Dados sempre reais. Nada fictício na interface. Sem dado → estado vazio que
  diz o que falta.
- Todos os cálculos que existiam continuam valendo, com as mesmas regras de
  amostra mínima, corte de horário e "sem histórico". As ressalvas saem do
  corpo do card e vão para o balão "Como ler".

## 2. Linguagem visual

| Elemento | Regra |
|---|---|
| Direção | Neutro + um acento azul da marca (`--blue-500` #0071e3) no lugar do lima #C7F33C. É a nova direção do painel; as outras telas migram depois. |
| Fonte | Urbanist (a do painel). Números grandes em peso 300, sem matriz de pontos. Títulos de card em 400–500. |
| Fundo | Cinza liso só na área de conteúdo dos Relatórios (`--rp-canvas`). O shader de fundo e o menu continuam como estão. |
| Card | Cinza-claro fosco (`--rp-card`), raio 28 px, padding 22–24 px, sem sombra visível, borda de 1 px quase branca no topo. |
| Vidro | Só no painel sobre o logo líquido (`backdrop-filter: blur(24px) saturate(1.4)`) e na barra de temas quando gruda no topo. |
| Botões redondos | 44 px, fundo `--rp-chip`; ativo/primário em tinta #111 com ícone branco. |
| Destaque de gráfico | Hachurado de listras grafite (45°, traço 1,5 px, passo 7 px) e etiqueta do valor em azul com texto branco. O azul é raro de propósito. |
| Pílulas | As da imagem do dono: 48 px de altura, totalmente arredondadas, fundo `--rp-pill` com brilho no topo e sombra suave; ativa em tinta. |

## 3. Estrutura da página

1. **Cabeçalho**: botão redondo ← (volta à Visão geral), trilha
   "Indicadores › Relatórios" com ícones de arquivo, título grande
   "Desempenho da clínica" e, à direita, a barra de ferramentas:
   `[lupa] [ajustes] [calendário●] [início] [fim] [+ Adicionar widget] [Criar relatório]`.
2. **Barra de temas** (pílulas grandes, gruda no topo ao rolar, com vidro):
   Resumo · Atendimentos · Comparecimento · Clínico · Pacientes · Financeiro.
   Clicar rola até a seção; a ativa acompanha a rolagem (IntersectionObserver).
3. **Seções** empilhadas, cada uma com cabeçalho curto e bento de 12 colunas
   (`grid-auto-flow: dense`).

### Resumo (o bento exato da referência)

| Card | Gráfico | Colunas |
|---|---|---|
| Continuidade do cuidado (no lugar do "Pro Version") | F | 4 × 2 linhas |
| Atendimentos por dia da semana ("Activity") | A | 3 |
| Comparação com o período anterior ("Comparison of Revenue") | B | 5 |
| Recebido ("Total Spend") | C | 4 |
| Formas de pagamento ("Virtual Cards") | D | 4 |

O card principal subiu de 3 para 4 colunas na construção: com 3, o painel de
vidro não comportava as duas colunas de número + barras. Na 2ª linha, Recebido
e Formas ficaram 4 + 4 (19/10): com 3 colunas o título "Formas de pagamento"
não cabia ao lado dos botões.

Card com até 460 px de conteúdo mostra dois botões (ajustes e ↗); o balão
"Como ler" sai e o texto continua no card ampliado. O título fica numa linha.

### Demais seções

- **Atendimentos**: Produção em 12 meses (E, 12) · Tipos de atendimento (D) ·
  Duração média por tipo (A) · Espera média (C) · Ocupação por dia e horário (E).
- **Comparecimento**: Compareceram × faltaram (D) · Faltas por dia da semana (A) ·
  Confirmações dos próximos 7 dias (com ação) · Faltas no período × anterior (B).
- **Clínico**: Perfil epidemiológico CID-10 (D) · Medicações mais prescritas (D) ·
  Documentos emitidos por tipo (A).
- **Pacientes**: Faixa etária (A) · Novos × retornos no tempo (B) ·
  Convênio × particular (D) · Situação dos pacientes (D).
- **Financeiro**: Recebido × anterior (B) · A receber e vencido (D) ·
  Despesas por categoria (A) · Receita × despesa no tempo (C) ·
  Ticket médio (extra, começa oculto).

## 4. Vocabulário de gráficos (`admin/charts/ref/`)

Todos em SVG, com cores lidas de tokens, hover com o valor, foco por teclado
(setas movem, Enter fixa), clique fixa o ponto, `prefers-reduced-motion` tira as
animações e cada um tem uma tabela equivalente no card ampliado.

- **A · RoundBars**: barras de raio 12 em cinza um tom abaixo do card; a barra
  em foco (pico, ou a clicada) vira hachurado com etiqueta azul em cima.
  Rótulos do eixo embaixo. Entrada: barras crescem da base, em cascata.
- **B · HatchBand**: duas linhas finas cinza com pontos pequenos; hachurado
  entre elas; linha vertical no ponto em foco com etiqueta azul (+9%). Rótulos
  das séries à esquerda (como 2023/2024).
- **C · SmoothCurve**: curva suave cinza com pontos escuros nos dados; sombra
  de área cinza-clara (a série de comparação); etiqueta azul no ponto em foco;
  mini-pílulas de contagem ao lado ("34 Wallets").
- **D · PercentPills**: linhas "rótulo · pílula com % dentro", a largura da
  pílula é a fatia.
- **E · TileHeatmap**: quadrados arredondados em escada de azuis
  (`--blue-050…--blue-600`), hachurados onde não há dado.
- **F · ContinuityCard**: logo líquido grande no topo (shader ao vivo, exceção
  só neste card) e um painel de vidro sobre a metade de baixo com duas colunas:
  número grande + barra azul de volume + barra cinza de comparação.

## 5. Funções reais

- **Período**: o calendário abre atalhos (Esta semana, Este mês, Este
  trimestre, Este ano, Últimos 30 dias) e um intervalo livre em dois meses;
  as pílulas de início/fim abrem o mesmo painel já na ponta certa. Comparação:
  `comparisonRange` (`modules/reports/period.js`).
- **Busca (lupa)**: a pílula vira campo; filtra os cards pelo título e pelas
  palavras-chave; Enter rola até o primeiro; Esc limpa.
- **Filtro (ajustes)**: tipo de atendimento. Recalcula tudo o que vem de
  atendimento (e a receita ligada a atendimento).
- **+ Adicionar widget**: gaveta com o catálogo por tema, mostrar/ocultar,
  subir/descer (teclado) e os extras. No card: × oculta (com "Desfazer"),
  arrastar reordena dentro da seção. Layout salvo por usuário (localStorage
  `charlington.reports.layout.<userId>`).
- **Criar relatório**: assistente (temas, período, unidade) → PDF no papel
  timbrado da unidade, com número, tabela e notas de leitura de cada card,
  mais o CSV com as mesmas tabelas.
- **Botões do card**: ↗ abre o card ampliado (gráfico grande, tabela, CSV do
  card); ajustes troca a visão quando o card tem mais de uma; balão abre
  "Como ler" com as ressalvas.
- **Continuidade do cuidado**: ↗ abre a lista de crianças sem retorno com
  "Agendar retorno" (Agenda abre o agendamento já com a criança, via
  `#/agenda?agendar=<pacienteId>`). Ajustes troca o limite: 60 / 90 / 180 dias.

## 6. Definições dos números novos

- **Com retorno marcado**: crianças com atendimento concluído no período que
  têm um agendamento futuro (agendado ou confirmado) depois do último
  concluído.
- **Sem consulta há +N dias**: pacientes "em acompanhamento" da unidade cujo
  último atendimento concluído foi há mais de N dias e que não têm nada
  agendado. Quem nunca foi atendido fica fora.
- **Faixa etária**: idade da criança na data do atendimento concluído; cada
  criança conta uma vez, na idade do último atendimento do período. Faixas:
  0–2, 3–5, 6–11, 12–17 e 18+.
- **Novos × retornos**: atendimentos concluídos do tipo "Primeira consulta"
  contra os demais, por balde do período.
- **Ocupação**: atendimentos não cancelados por dia da semana × hora de início.
- **Ticket médio**: recebido ÷ lançamentos de receita pagos no período.

## 7. Modelos por tarefa

- Opus: desenho, gráficos, cards, página, card principal e crítica de
  fidelidade/acabamento.
- Sonnet: peças isoladas com contrato fechado (painel de datas, assistente de
  relatório) e crítica de sistema.
- Haiku: build e checagens mecânicas (literais de cor, chaves de CSS).

## 8. Verificação

Design-loop com 3 críticos de contexto limpo, até 3 passadas, correções
aplicadas por quem constrói. Capturas: `.claude/design-loop/cdp.mjs` em
1440 × 900 e 390 × 844.
