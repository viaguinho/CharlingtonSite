# Prompt para o Antigravity — correções da passada 20 (painel administrativo Charlington)

> Cole tudo o que está abaixo da linha no Antigravity. É um prompt fechado: traz contexto, regras, cada defeito com arquivo e linha, a correção esperada e como verificar.
> Origem: passada 20 (rodada 2 — dados e componentes), em 05/10/2026. O crítico de acabamento APROVOU; o de brief e o de sistema reprovaram. Os defeitos 1 a 10 vêm do brief (verdade do dado); os defeitos 11 a 18, do sistema (aderência ao design system).

---

Você vai corrigir defeitos num painel administrativo já construído. Trabalhe em pequenos passos e não refatore o que não foi pedido.

## Projeto

- Pasta: `/Users/iagolima/Downloads/Projetos/Site Charlington`
- Painel administrativo: pasta `admin/` (React 19 + Vite, HashRouter, sem TypeScript).
- Persistência local: IndexedDB por trás de `admin/data/repository.js`; o mesmo contrato serve ao adaptador Supabase.
- Estilos: `admin/styles/` — `tokens.css` é a única fonte de cor, tipo, espaço, raio, sombra e tempo. Nenhum valor literal fora dele.
- Comentários e textos de interface em português do Brasil. Comentário só quando explica uma decisão.
- Compilar com: `npx vite build --outDir /tmp/build-charlington --emptyOutDir` (não escreva em `dist/`).

## Regras que não podem ser quebradas

1. **Só mexa no que está listado abaixo.**
2. **Não toque no menu vertical nem na pílula "Dashboard" do topo.** São desenho manual do dono do produto: `src/components/ui/floating-dock.jsx`, `src/components/ui/floating-dock.css`, o componente `Rail` em `admin/components/Shell.jsx`, e as regras `.rail*`, `.floating-dock*` e `.explore-pill*` em `admin/styles/layout.css`.
3. **Nenhum dado fictício.** Número na tela vem de registro; sem registro, a tela diz que não há.
4. **Nenhum valor literal de estilo.** Use os tokens existentes.
5. O log de auditoria é encadeado por hash (`admin/core/audit.js`): não altere o cálculo nem a ordem de gravação.

---

## Defeito 1 — GRAVE · A tela de dinheiro mostra lucro em outubro e esconde R$ 36.760,00 vencendo em 5 dias

**Onde:** `admin/modules/finance/FinanceScreen.jsx` — faixa de KPIs do Fluxo (linhas ~170 a 208) e o objeto `summary` (linhas ~81 a 100). Também a Visão geral, `admin/modules/overview/OverviewScreen.jsx`, que só mostra o que falta **receber**.

**O que acontece, medido em 05/10/2026:** o KPI diz "Resultado em outubro · R$ 2.590" (positivo) e "Pago em outubro · R$ 0 — Nenhuma despesa vence neste trecho". Na aba **A pagar da mesma tela** há 6 títulos pendentes, todos com vencimento em 10/10/2026: folha 19.600 + aluguel 8.400 + impostos 5.300 + contabilidade 1.450 + material 1.120 + sistema 890 = **R$ 36.760,00**. Caixa do mês (R$ 2.590) somado ao que há para receber (R$ 4.390) dá R$ 6.980 contra R$ 36.760 a pagar em cinco dias — e o painel comunica tranquilidade.

**Por que é erro:** o rótulo "em outubro" descreve o mês, mas o número é de 01 a 05/10; "Pago em outubro R$ 0" é falso como leitura do mês. A mesma tela, em outra aba, contradiz "nenhuma despesa vence". E o defeito é sistemático: entre os dias 1 e 9 de qualquer mês o painel sempre vai mostrar lucro cheio, e no dia 10 despencar.

**Como corrigir:**

1. No `summary` do Financeiro, calcule também:
   - `payable`: soma das despesas pendentes (todas, posição de hoje), espelhando o `receivable` que já existe;
   - `payableSoon`: despesas pendentes com vencimento entre hoje e os próximos 7 dias, com a data do primeiro vencimento.
2. Acrescente à faixa do Fluxo um KPI **"A pagar em aberto"**, irmão de "A receber em aberto", com `target` dizendo o vencimento mais próximo: "R$ 36.760,00 vencem em 10/10".
3. Quando `payableSoon` existir, mostre uma faixa de aviso na aba Fluxo (tom âmbar, o mesmo das pendências), acima dos cards: "R$ 36.760,00 vencem em 10/10 (6 títulos). O resultado do mês ainda não considera esse pagamento." com botão "Ver títulos" levando à aba A pagar.
4. Corrija o rótulo do recorte parcial: quando o período em curso não terminou, o KPI deve dizer o trecho, não o mês inteiro — "Resultado em 01–05/10" (o painel já tem `rangeShort`). Reserve "em outubro" para mês fechado.
5. Na Visão geral, o bloco "Precisa de você" já lista títulos vencidos a receber; acrescente um item equivalente para o que vence a pagar nos próximos 7 dias, com valor, quantidade e data.

**Como verificar:** em qualquer dia anterior ao vencimento das despesas fixas, a aba Fluxo e a Visão geral precisam dizer quanto vai sair e quando. Nenhum KPI pode chamar de "outubro" um recorte de cinco dias.

## Defeito 2 — GRAVE · "Nenhuma despesa paga no período" num mês com 6 despesas lançadas

**Onde:** `admin/modules/finance/FinanceScreen.jsx`, card "Pago por categoria", linhas ~413 a 423.

**O que acontece:** em outubro o card mostra o estado vazio "Nenhuma despesa paga no período" com o botão "+ Lançar despesa", enquanto existem 6 despesas já lançadas, pendentes, vencendo em 10/10.

**Por que é erro:** a frase é tecnicamente verdadeira e praticamente uma mentira, e o botão convida a lançar o que já está lançado — risco de duplicar lançamento.

**Como corrigir:** o estado vazio precisa distinguir "não há despesa" de "há despesa, ainda não paga". Quando existirem despesas pendentes no período, escreva: "Nenhuma despesa paga ainda neste período · 6 títulos somando R$ 36.760,00 vencem em 10/10", e troque a ação para "Ver títulos a pagar" (leva à aba A pagar). Mantenha "Lançar despesa" apenas quando não houver nenhuma despesa, paga ou pendente.

**Como verificar:** no dia 05/10 o card não pode oferecer "Lançar despesa" como única leitura, nem afirmar ausência de despesa.

## Defeito 3 — MÉDIO-GRAVE · O painel do agendamento oferece "Registrar falta" numa consulta concluída

**Onde:** `admin/modules/agenda/AgendaScreen.jsx`, bloco "Avançar o atendimento", linhas ~899 a 915.

**O que acontece:** em consultas com estado **Concluído** e **Faltou**, a esteira continua inteira — "Confirmada", "Fez check-in", "Iniciar atendimento", "Concluir", "Registrar falta" —, nenhum botão desabilitado, nenhum marcado como estado atual, e "Concluir" segue como botão primário numa consulta já concluída.

**Por que é erro:** "avançar" não descreve o que a esteira faz num atendimento terminado, e um clique acidental em "Registrar falta" reescreve o desfecho de uma consulta realizada. A taxa de faltas alimenta Relatórios e o alerta "faltou às N últimas" do prontuário: o dado errado vira sinal clínico sobre uma criança.

**Como corrigir:**

1. Marque o estado atual: o botão correspondente ao `status` recebe `aria-current="true"` e aparência de selecionado, sem ação.
2. Desabilite as transições que não fazem sentido a partir do estado atual. Com desfecho registrado (`concluido`, `faltou`, `cancelado`), a esteira fica inteira desabilitada.
3. Troque o rótulo da seção quando houver desfecho: "Desfecho registrado" em vez de "Avançar o atendimento", com uma linha dizendo qual é e quando foi.
4. Para corrigir um desfecho errado, ofereça uma ação explícita e única — "Corrigir desfecho" — que reabre a esteira. Correção de prontuário é ato deliberado, não efeito colateral de um clique.

**Como verificar:** abrir uma consulta concluída e confirmar que nenhum botão de transição está clicável, e que a tela diz o desfecho e a hora.

## Defeito 4 — MÉDIO · A vista Dia não representa duração, e oferece horário já ocupado

**Onde:** `admin/modules/agenda/AgendaScreen.jsx` — `HourRow`, células de hora e o botão de slot livre (linhas ~426 a 478); estilos `.day-grid__cell` e `.slot` em `admin/styles/components/modules.css`.

**O que acontece:** a grade tem uma célula fixa de 72 px por hora e nenhum bloco é posicionado ou dimensionado por duração. A consulta das 09:30 ocupa visualmente a faixa inteira das 09:00, como se começasse às 09:00. Ao mesmo tempo a célula das 10:00 oferece "Agendar às 10:00 em Consultório 2", embora a consulta anterior (retorno de 60 min, conforme Configurações) ainda esteja em curso.

**Por que é erro:** a representação não corresponde à grandeza, e o convite para agendar induz a conflito de sala.

**Como corrigir:**

1. Posicione e dimensione o bloco pela duração real: topo proporcional ao minuto de início, altura proporcional à duração prevista (use a duração padrão do tipo, definida em Configurações, quando não houver `fim`).
2. O bloco deve escrever o intervalo ("09:30–10:30"), não só o início.
3. O botão de agendar só aparece em faixa realmente livre: considere sobreposição com o intervalo das consultas vizinhas na mesma sala. Faixa coberta por uma consulta em curso não oferece "+".
4. Mantenha a linha de hora na grade de 24 px (a altura da hora pode continuar 72 px; o que muda é o posicionamento interno).

**Como verificar:** na vista Dia, uma consulta das 09:30 começa na metade da faixa das 09:00 e termina onde a duração indica; o horário coberto por ela não oferece agendamento.

## Defeito 5 — MÉDIO · "Sem histórico anterior para comparar" onde há histórico

**Onde:** `admin/modules/reports/ReportsScreen.jsx:81` e `admin/modules/finance/FinanceScreen.jsx:79` (constante `noBase`), aplicada nos KPIs de ambas as telas.

**O que acontece:** na aba **Trimestre**, os KPIs dizem "sem histórico anterior para comparar", enquanto a aba Ano, ao lado, mostra 92 atendimentos concluídos e R$ 40.070 recebidos no mesmo ano. As abas Mês e Semana nomeiam o trecho comparável ("11 em 01–05/09 até 16h07"); o Trimestre não.

**Por que é erro:** há histórico; o que falta é registro **naquele trecho** do trimestre anterior (01–05/07). A frase atual afirma uma ausência maior do que a real.

**Como corrigir:** a frase deve nomear o trecho que ficou sem registro, no mesmo padrão das outras abas: "Sem registro em 01/07–05/07 para comparar". Só use "sem histórico anterior" quando não houver nenhum registro antes do período atual, em nenhuma data.

**Como verificar:** trocar entre Semana, Mês, Trimestre e Ano em Relatórios e Financeiro: toda ausência de comparação nomeia o trecho.

## Defeito 6 — MÉDIO · Taxa de faltas compara amostras de 1 a 3 consultas como se fosse tendência

**Onde:** `admin/modules/reports/ReportsScreen.jsx`, KPI "Taxa de faltas" (linhas ~285 a 300) e o cálculo de `previous`.

**O que acontece:** na Semana: "Taxa de faltas 33,3% · −66,7 p.p. · 1 de 3 esperados · 100,0% em 27–28/09" — o comparativo de 100% vem de um período com **um** agendamento. No Mês: "25,0% · +25 p.p. · 2 de 8 esperados". Uma criança a mais move 12,5 pontos, e o selo vermelho dá a isso peso de tendência.

**Por que é erro:** a mesma tela aplica limiar de amostra em dois outros lugares ("Nenhum tipo tem 5 atendimentos no período: amostra pequena para comparar a duração"; "Um só dia com atendimentos encerrados: nada a comparar") e não aplica nenhum ao indicador de maior consequência clínica.

**Como corrigir:** use o mesmo limiar mínimo de amostra que já existe no arquivo (`MIN_TYPE_SAMPLE`, ou uma constante irmã explícita) para o selo de variação da taxa de faltas: abaixo do mínimo, não mostre o selo e escreva a razão — "2 de 8 esperados: amostra pequena para comparar com o período anterior". O número da taxa continua aparecendo, sempre com a fração bruta ao lado.

**Como verificar:** nas quatro abas de período, nenhum selo de variação de taxa aparece sobre amostra menor que o limiar.

## Defeito 7 — MENOR · "5 pendentes" em Consentimentos conta o que é opcional

**Onde:** `admin/modules/patients/PatientRecordScreen.jsx`, linhas ~113 a 120 (contagem da seção 08).

**O que acontece:** o índice do prontuário mostra "08 Consentimentos — 5 pendentes" em âmbar. Entre os 5 estão "Uso de imagem" e "Pesquisa acadêmica (dados anonimizados)", que são opcionais e podem nunca ser pedidos. Duas seções acima, a mesma tela aplica o critério oposto e correto: "Os 41 marcos sem registro não são pendência".

**Por que é erro:** critério contraditório dentro do mesmo prontuário, e como quase toda criança terá cerca de 5, o alerta vira ruído.

**Como corrigir:** só conte como pendência a finalidade **necessária para o que a clínica já faz** com aquela criança — por exemplo, teleconsulta sem consentimento quando há teleconsulta marcada ou realizada, e comunicação sem opt-in quando há mensagem a enviar. Finalidade opcional sem registro aparece como "não registrado", em tom neutro, nunca como pendência âmbar.

**Como verificar:** uma criança sem teleconsulta e sem mensagens não pode exibir alerta âmbar em Consentimentos.

## Defeito 8 — MENOR · O KPI da Auditoria não acompanha o filtro

**Onde:** `admin/modules/audit/AuditScreen.jsx:195` ("Eventos registrados").

**O que acontece:** com o filtro "Leitura" aplicado, a tabela mostra 6 linhas e o KPI continua "Eventos registrados 631", sem dizer que é o total e não o resultado filtrado.

**Como corrigir:** quando houver filtro ou busca ativa, o KPI deve dizer os dois números: valor = eventos no recorte, `target` = "de 631 no total". Sem filtro, mantenha como está.

**Como verificar:** aplicar cada filtro e conferir que o número do KPI corresponde ao que a tabela mostra.

## Defeito 9 — MENORES · Rótulos que prometem o que a tela não entrega

Corrija os quatro, todos de texto ou de alvo:

1. **`admin/modules/agenda/AgendaScreen.jsx`, descrição da página:** promete "quanto tempo cada família está esperando", mas a espera só aparece dentro do painel de detalhe. Ou a vista Dia/Lista mostra a espera em curso de quem fez check-in, ou a descrição deixa de prometer isso.
2. **`admin/modules/communication/CommunicationScreen.jsx`:** "Famílias com opt-in 32/42" usa como denominador o número de **crianças**. Ou conte famílias (responsáveis distintos), ou escreva "crianças com opt-in".
3. **`admin/modules/overview/OverviewScreen.jsx`:** o item "Teleconsulta sem consentimento: 5 crianças" tem botão que leva a **um** prontuário. Leve para a lista de Pacientes já filtrada por esse motivo (o filtro "Precisam de atenção" já existe), ou nomeie a criança para a qual o botão leva.
4. **`admin/modules/settings/SettingsScreen.jsx`:** o cartão de timbrado lista apenas "Campinas / SP" e o texto afirma que "Fortaleza usa o mesmo arquivo", sem Fortaleza na lista. Escreva o que é verdade para as unidades cadastradas.

## Defeito 10 — MENOR · Linha de tabela clicável sem papel acessível

**Onde:** `admin/components/DataTable.jsx` (linhas `<tr class="is-clickable" tabindex="0">`), usado em Pacientes, Documentos, Operações e Auditoria.

**O que acontece:** a linha inteira abre o registro, mas não tem `role` nem rótulo de ação: para leitor de tela é uma linha comum com foco.

**Como corrigir:** dê à linha clicável `role="button"` e um `aria-label` dizendo o que abre ("Abrir prontuário de Heitor Barbosa Vilela"), ou mantenha a navegação por um elemento focável dentro da linha, com rótulo. Garanta que Enter e Espaço façam o mesmo que o clique.

**Como verificar:** navegar por teclado numa tabela e confirmar que cada linha anuncia o que faz.

## Defeito 11 — Sistema, GRAVE · O esqueleto de carregamento não desenha a faixa de KPIs que ele vira

**Onde:** `admin/App.jsx`, componente `RouteFallback`.

**O que acontece (medido em 5 rotas):** o cabeçalho do esqueleto casa exato com o real (linhas de 13, 25 e 20 px em x=100, largura 496). Dali para baixo, não. O esqueleto promete **três cartões de 566 px de largura** (dois lado a lado), enquanto toda rota abre com **uma faixa de KPIs de 1156 px**:

| rota | faixa real | o esqueleto promete |
|---|---|---|
| `#/` | y161 · largura 1156 · altura 216 | y186 · largura 566 · altura 216 |
| `#/agenda` | y244 · 1156 · 168 | idem |
| `#/pacientes` | y205 · 1156 · 240 | idem |
| `#/financeiro` | y279 · 1156 · 192 | idem |
| `#/relatorios` | y186 · 1156 · 216 | idem |

O botão do cabeçalho também diverge: esqueleto 150×38 com **raio 10 px**; os reais têm 156 a 187 px de largura e **raio de pílula**.

**Por que é erro:** o esqueleto é componente, e é o único que mente sobre o que vai aparecer — o salto vertical medido vai de 25 a 93 px, e uma faixa inteira troca por duas colunas.

**Como corrigir:**

1. O primeiro bloco depois do cabeçalho passa a ser **um só**, de largura total (span 12), com 216 px de altura.
2. O retângulo do botão usa `var(--r-pill)` e 168 px de largura.
3. Os cartões do conteúdo vêm depois desse bloco, mantendo o passo de 24 px.
4. Se for simples passar a altura da faixa por rota (168, 192, 216, 240), melhor; se não for, use 216 para todas — o erro cai de 93 px para no máximo 48.

**Como verificar:** trocar de rota e medir: o primeiro bloco após o cabeçalho tem 1156 px de largura; ao carregar, nada salta mais que a altura de uma linha.

## Defeito 12 — Sistema, GRAVE · "Confirmado" e "Concluído" são a mesma etiqueta

**Onde:** `admin/styles/components/primitives.css:134` (`.chip--neutral`) e `:138` (`.chip--info`); aparecem lado a lado em `#/agenda` → Lista.

**O que acontece:** as duas etiquetas têm o mesmo fundo (`--ink-a06`), o mesmo raio, a mesma altura, o mesmo padding e o mesmo tipo. A única diferença é a tinta: `#0f1012` contra `#3d3e41` — **1,78:1 entre si**, ou seja, indistinguíveis.

**Por que é erro:** são estados semanticamente opostos (uma consulta que ainda vai acontecer e uma que terminou), e o leitor não consegue separá-los de relance.

**Como corrigir:** separe por **forma**, não por cor nova — o painel reserva cor para o que pede ação. Deixe "Concluído" como etiqueta preenchida (`--ink-a06`, tinta `--ink-600`) e "Confirmado" como etiqueta **contornada**: fundo transparente, borda de 1 px em `--ink-a12`, tinta `--ink-900`. Aplique a mesma distinção onde o estado aparece como ponto ou traço.

**Como verificar:** na Lista da Agenda, as duas etiquetas se distinguem sem leitura do texto.

## Defeito 13 — Sistema, GRAVE · O estado do atendimento tem três aparências, e "Faltou" tem duas cores

**Onde:** `admin/modules/agenda/AgendaScreen.jsx` (blocos `.slot` da vista Dia e `.week-slot` da Semana) e `admin/styles/components/modules.css` (regras `.slot--*`); comparado com as etiquetas de `#/` e da Lista.

**O que acontece:** na Visão geral e na Lista, o estado é uma etiqueta (`#b32f20` sobre fundo vermelho claro, da família de sinal). Na vista Dia, é texto corrido em `#6b6c6f` com uma barra de 2 px à esquerda em `--data-soft` ou `--data-negative` (`#d9432f`, da família de **dado**). O mesmo "Faltou" aparece em dois vermelhos diferentes dependendo da tela.

**Por que é erro:** o token diz que os sinais têm uso exclusivamente semântico e que os `--data-*` são marcas de gráfico. Um conceito tem uma aparência.

**Como corrigir:**

1. Os blocos da agenda passam a usar a **mesma etiqueta** de estado das outras telas (o componente `Chip`, em tamanho pequeno), em vez de texto em tinta fraca.
2. A barra à esquerda do bloco, se continuar existindo, usa os tokens de **sinal** (`--signal-red-ink`, `--signal-amber-ink`, `--ink-a12` para repouso), nunca os `--data-*`.
3. Nenhum `--data-*` fora de gráfico.

**Como verificar:** abrir a mesma consulta na Visão geral, na Agenda Dia, na Semana e na Lista: o estado tem a mesma cor e a mesma forma nas quatro.

## Defeito 14 — Sistema, MÉDIO · As abas trocam de gramática conforme a tela

**Onde:** `admin/modules/documents/DocumentsScreen.jsx:41`, `admin/modules/operations/OperationsScreen.jsx:32`, `admin/modules/communication/CommunicationScreen.jsx:76`, `admin/modules/settings/SettingsScreen.jsx:42`, `admin/modules/patients/PatientsScreen.jsx:244` e `:341`, `admin/modules/agenda/AgendaScreen.jsx` (abas de visão).

**O que acontece:** dois papéis, quatro aparências.
- *Recorte de lista, com contador:* Documentos usa pílula (altura 28, ativo em pílula preta); Pacientes usa sublinhado (altura 30, ativo em peso 500).
- *Trocar de sub-visão:* Agenda e Pacientes usam segmento (calha, raio 10, altura 38); Operações usa pílula (sem calha, altura 28).

**Como corrigir:** fixe a regra e aplique em todas as telas — **segmento** para trocar de visão ou de seção (Dia/Semana/Lista, Lista/Cards, A emitir/Emitidos/Fila/Modelos, Insumos/Salas/Equipe, seções de Configurações e de Comunicação) e **sublinhado** para recortar a lista que está abaixo (situação do paciente, situação do agendamento), sempre com contador. Nenhuma tela usa `variant="pill"` para esses dois papéis.

**Como verificar:** percorrer as 11 rotas: toda troca de seção tem a mesma aparência; todo recorte de lista tem a mesma aparência.

## Defeito 15 — Sistema, MÉDIO · A marca de "período em curso" não vale no gráfico do Financeiro

**Onde:** `admin/charts/index.jsx` (`ComparisonChart`) e o card "Recebido e pago acumulados" em `admin/modules/finance/FinanceScreen.jsx`.

**O que acontece:** nas barras da Visão geral e dos Relatórios, o dia corrente vem listrado e com a nota "Barra listrada: 05/10, ainda em curso". No Financeiro, sob o mesmo recorte declarado no cabeçalho ("01/10 a 05/10, em curso"), o último trecho da linha "Recebido" é sólido, sem marca e sem nota.

**Como corrigir:** o trecho do período ainda em curso recebe a mesma marca das barras — traço listrado ou tracejado do mesmo par de tokens — e o card ganha a nota correspondente, no mesmo lugar em que as outras telas a colocam.

**Como verificar:** em Semana, Mês, Trimestre e Ano, o último trecho da linha indica se o período fechou.

## Defeito 16 — Sistema, MÉDIO · Dois `var()` apontando para token que não existe

**Onde:** `admin/styles/components/modules.css:658` → `border-top: 1px solid var(--line);` e `admin/styles/components/documents.css:320` → `margin-top: var(--nudge);`.

**O que acontece:** `--line` e `--nudge` não existem em `tokens.css`. A borda nunca é desenhada e a margem é morta.

**Como corrigir:** trocar por tokens existentes — `var(--ink-a06)` na borda e um degrau da escala (`var(--s-1)`) na margem. Depois, varra a folha em busca de qualquer outro `var(--…)` que não resolva em `:root` e corrija do mesmo jeito.

**Como verificar:** nenhuma declaração depende de token inexistente.

## Defeito 17 — Sistema, MENOR · Duas entrelinhas para o mesmo papel de caixa alta

**Onde:** `admin/styles/components/forms.css:8` (`.field__label`).

**O que acontece:** o rótulo de campo usa `--ls-micro` (0,1 px), enquanto todo o resto do mesmo papel — sobrelinha, cabeçalho de tabela, mês da linha do tempo, rótulo de alergia — usa `--ls-eyebrow` (0,6 px).

**Como corrigir:** trocar para `var(--ls-eyebrow)`, que é o papel declarado para texto curto em caixa alta.

## Defeito 18 — Sistema, MENORES · Recuo fora da escala e faixa de KPIs sem número dominante

1. **`admin/styles/components/forms.css:48`** → `.input.has-icon { padding-left: calc(var(--s-8) + var(--s-1)); }` resolve em 36 px, único valor fora da base 4 no painel. Use `var(--s-8)` (32) ou `var(--s-10)` (40), ajustando a posição do ícone.
2. **`admin/modules/audit/AuditScreen.jsx` e `admin/modules/communication/CommunicationScreen.jsx`** → a faixa de KPIs não tem número dominante: três métricas de 20 px, enquanto sete telas usam o número de 48 px. Promova a métrica que responde à tela (em Auditoria, "Eventos registrados"; em Comunicação, "Famílias com opt-in") a `featured`, como nas demais.

## Ao terminar

1. `npx vite build --outDir /tmp/build-charlington --emptyOutDir` sem erro.
2. Abrir `#/financeiro` (quatro períodos e quatro abas), `#/`, `#/agenda` (Dia, Semana, Lista e o detalhe de uma consulta concluída), `#/relatorios` (quatro períodos), `#/pacientes` e `#/pacientes/<id>`, `#/documentos`, `#/operacoes`, `#/comunicacao`, `#/configuracoes` e `#/auditoria`, conferindo os itens de verificação — inclusive o esqueleto, visível ao trocar de rota.
3. Relatar, item a item, o que foi alterado e em qual arquivo — e o que não foi possível fazer, sem inventar solução.
