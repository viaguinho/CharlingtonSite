# Crítica P6: dados e acabamento (prontuário do paciente)

Crítico de dados e acabamento, contexto limpo, 22/10/2026. Régua: `guia.md` §0, §1, §4 e §7 e `PRODUCT.md`. A pergunta foi: o que a tela diz é verdadeiro, bate entre os lugares onde aparece, e cada ação faz o que diz?

## Método

- **Tela real.** Servidor em `http://localhost:5173`, base LOCAL de verificação, Chromium da porta 9333 numa aba própria. Usei um driver CDP próprio no scratchpad (mesmo login e mesmo congelamento de animação do `cdp.mjs`, mais teclado e mouse reais, eventos e script de início). Larguras: 1440×900, 1366×768, 1280×800, 1180×800, 1100×800, 1024×768 e 390×844 (com toque).
- **Pacientes da base.** Clara, Rafael, Pedro, Cecília e Gael, mais Gabriela Nunes Ferraz (`b233f720…`), Felipe e Nicolas. Também levantei a trilha contra a faixa de consultas dos 42 pacientes da base.
- **Estados que a base não tem.** Troquei o adaptador em memória, só na aba e só para leitura, com `repo.useAdapter`. O invólucro delega a leitura ao IndexedDB, devolve listas sintéticas para um paciente, faz `create`, `update`, `remove`, `putBlob` e `setMeta` lançarem erro e transforma `appendAudit` em no-op. Cenários montados:
  - 5 alertas simultâneos;
  - próxima consulta marcada;
  - paciente vazio;
  - nome social com 4 responsáveis;
  - conflito entre alergia e medicação;
  - medicações só suspensas;
  - 2 consultas sem desfecho;
  - check-in velho e check-in novo;
  - CARS-2 com meio ponto;
  - paciente de alta com 5 CIDs.
- **Nada foi gravado.** Nenhum formulário foi salvo, nenhum arquivo foi enviado e o Supabase e o painel do dono não foram usados. O seletor de arquivo foi só interceptado. Abrir um prontuário grava, como sempre, a entrada de auditoria de leitura do próprio app. Minha primeira leitura direta fez o mesmo, e as seguintes usaram `silent`.
- **Desempenho.** Contei as chamadas de desenho do WebGL em janelas de 2 s e li o console.
- **Arquivos.** Os scripts e as capturas estão em `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p6d/`. Abaixo, `p6d/` abrevia esse caminho.

## Vereditos

| Peça | Veredito | Maior falha |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | Com 2 consultas sem desfecho, a pílula de alerta mostra só a mais recente. A outra some dos alertas, junto com o Remarcar dela, enquanto a trilha diz "2 sem desfecho" e a faixa mostra as duas. |
| P2 Colunas | **REPROVA** | O card "Medicações em uso" lista a Dipirona sódica de uma paciente alérgica a dipirona sem nenhum aviso. O painel mostra o conflito. Além disso, a trilha discorda da faixa de consultas em todo paciente com laudo. |
| P3 Navegação e seções | **REPROVA** | Os modais "Adicionar adendo" e "Suspender medicação" cobrem a página inteira sem mostrar a alergia, em todas as larguras e com dados reais. |

## Falhas, da mais grave à menor

### 1. [P3, crítica] "Adicionar adendo" e "Suspender medicação" escondem a alergia
- **Onde:** `views/NotesView.jsx:287-303`, `AddendumDialog`, sem `AllergyNotice`; `views/MedicationsView.jsx:222-240`, `SuspendDialog`, sem `AllergyNotice`.
- **Reproduzir:** Clara (Dipirona) → pílula Evoluções → "Adicionar adendo". Depois, pílula Medicações → botão "Suspender" (−) do Metilfenidato.
- **Evidência:**
  - Nos dois modais não há `.pr-rx-allergy` dentro do diálogo.
  - O `elementFromPoint` sobre cada pílula de alergia (palco e painel) devolve o backdrop do modal, ou seja, nenhuma alergia fica no topo.
  - Reproduzido a 1440, 1024 e 390. A 390 a faixa grudada da barra também fica coberta.
  - Capturas: `p6d/clara-m-adendo.png`, `p6d/clara-m-suspender-med.png`, `p6d/adendo-390.png`, `p6d/suspender-390.png`, `p6d/adendo-1024.png`.
- **Por que é erro:**
  - Regra §0.6 e regra forte desta passada: a alergia não pode sumir com modal aberto.
  - O adendo é texto clínico assinado, que muda conduta. A suspensão pede "motivo (efeito adverso…)".
  - Os outros 7 modais clínicos já trazem o aviso: Emitir documento, Remarcar, Nova evolução, Registrar medicação, Registrar aplicação, prévia de exame e folha de documento.
  - O registro de 21/10 diz "a alergia precisa aparecer em todo modal clínico".
- **Como corrigir:**
  - Colocar `<AllergyNotice patient={patient} …/>` no topo dos dois modais. As duas views já recebem `patient`. O adendo usa `typed={text}` para acusar o nome digitado.
  - Os confirmadores não clínicos ("Remover este anexo?", "Revogar") ficam a critério, mas também cobrem a alergia (`p6d/clara-m-remover-exame.png`).
- **Como verificar:** com os dois modais abertos a 1440 e a 390, a faixa "Alergias: Dipirona" fica visível e no topo.

### 2. [P2, alta] O card de medicações da visão geral esconde o conflito com a alergia
- **Onde:** `record/InsightsColumn.jsx:95-107`. O card lista as medicações sem a checagem `allergyConflict`, que só existe em `MedicationsView.jsx:37-40`.
- **Reproduzir:** adaptador em memória (`specConflict.js`) com Clara alérgica a "Dipirona" e a medicação ativa "Dipirona sódica 500 mg/mL, 10 gotas se febre".
- **Evidência:**
  - Visão geral: "Dipirona sódica | 500 mg/mL · 10 gotas se febre | Desde 12/10/2026", sem marcador (`medsConflictMarker: false`).
  - Painel Medicações: "Alergia declarada a Dipirona — confirme antes de manter.", com borda vermelha.
  - Capturas: `p6d/conflict-meds-card.png`, `p6d/conflict-meds-panel.png`.
- **Por que é erro:** a visão geral é onde o médico olha primeiro. Ali o único sinal de segurança medicamentosa que o sistema calcula some. Isso viola "nenhum alerta escondido" e a coerência entre card e painel.
- **Como corrigir:** extrair `allergyConflict` para um utilitário compartilhado (por exemplo em `record/`). No card, mostrar a mesma linha de conflito (ícone de alerta e "Alergia declarada a X") no item afetado, com tom de sinal vermelho.
- **Como verificar:** com o mesmo cenário, o card e o painel mostram o mesmo aviso.

### 3. [P2, alta] A trilha conta laudo só quando ele falha e discorda da faixa de consultas
- **Onde:** `record/ProfileColumn.jsx:105-112` e `:150`. `done` exclui `laudo`, mas `missed` e `pending` incluem laudo, e o total soma os três.
- **Reproduzir (base real, sem mock):**
  - Gabriela Nunes Ferraz (`#/pacientes/b233f720-ecaa-4490-b64e-106be265b9c7`). A faixa mostra laudo Concluído (13/08), Retorno Concluído (03/09), laudo Concluído (24/09) e laudo Sem desfecho (16/10). A trilha diz **"1 de 2 realizadas · 1 sem desfecho"**.
  - Gael. A faixa mostra 3 cápsulas "Concluído", Evoluções diz 3 e as 3 evoluções estão ligadas a esses 3 atendimentos. A trilha diz **"1 consulta · desde 25/08/2026"**, com um traço só.
  - Felipe. A faixa mostra laudo Concluído, 2 Retornos Concluídos e laudo Sem desfecho. A trilha diz "2 de 3": o laudo concluído não conta, mas o laudo sem desfecho entra no total.
  - Pedro. "0 de 4 realizadas · 3 faltas", contando 2 laudos faltados.
  - No levantamento dos 42 pacientes, todo paciente com laudo concluído mostra essa divergência (Miguel, Felipe, Heitor, Valentina, Théo, Nicolas, Benício, Bernardo, Davi, Gabriela, Helena, Lorenzo, Gael, Otávio).
- **Evidência:** `p6d/gabriela-crop.png`, `p6d/gael-crop.png` e a saída do levantamento.
- **Por que é erro:**
  - Regra forte: as contagens batem entre trilha e faixa.
  - A mesma consulta muda o denominador conforme o desfecho. Um laudo que acontece encolhe o "de M"; um que falha aumenta o "de M".
  - O cabeçalho ("em acompanhamento desde 25/08") e o eixo da trilha começam num laudo que a trilha não desenha.
- **Como corrigir:** escolher uma régua só. Ou o laudo conta como atendimento em todos os estados (o traço cheio, a falta e o sem desfecho), ou não conta em nenhum, e então a faixa precisa distinguir o laudo (rótulo do tipo na cápsula) e o "desde" não pode cair num laudo. A primeira opção é a mais simples e a mais coerente com Evoluções e com o cabeçalho.
- **Como verificar:** Gabriela fica "3 de 4 realizadas · 1 sem desfecho" e Gael "3 consultas", com o número de traços igual ao de cápsulas.

### 4. [P3, alta] A Linha do tempo contradiz a pílula e a faixa no check-in
- **Onde:** `views/TimelineView.jsx:158`. `displayStatus({ status, inicio })` descarta `tipo` e `checkInEm`, então `isUnresolved` nunca vê o check-in velho.
- **Reproduzir:**
  - (a) `specConflict.js`: retorno de hoje às 08:00, status "aguardando", check-in às 07:50, 8 h atrás. A pílula do palco diz "Sem desfecho | Retorno de 22/10/2026 08:00", a faixa diz "Sem desfecho" e a trilha conta "sem desfecho". Clicando a cápsula, a Linha do tempo abre no item que diz **"Aguardando"**.
  - (b) `spec5.js`, check-in de 25 min: a pílula e a faixa dizem "Na recepção", a Linha do tempo diz "Aguardando".
- **Evidência:** `p6d/conflict-timeline.png` e `p6d/m5-timeline.png`. Saída: `"Retorno | Aguardando | 22/10/2026 08:00 · há 8 horas"` contra `"Retorno em 22/10/2026, Sem desfecho"`.
- **Por que é erro:** o clique da faixa leva a um estado diferente do que a cápsula anunciou. Regra forte: os estados batem entre pílula, faixa, painel e Linha do tempo.
- **Como corrigir:** passar o agendamento inteiro (`event.appointment`) para `displayStatus` e usar o rótulo "Na recepção" de `visitState` para `aguardando`.
- **Como verificar:** nos dois cenários, o item da Linha do tempo diz o mesmo que a cápsula.

### 5. [P2, média-alta] "Nenhuma medicação registrada" com medicações registradas
- **Onde:** `record/InsightsColumn.jsx:41-43` e `:108-111`. O card conta só as ativas e usa a frase de ausência total.
- **Reproduzir:** `specSusp.js` com Metilfenidato suspenso há 5 dias ("Efeito adverso: insônia") e Levetiracetam suspenso há 30 dias.
- **Evidência:**
  - Card: "Nenhuma medicação registrada. Confirme com o responsável antes de prescrever.", com o link "Registrar +".
  - Painel: "Em uso: Nenhuma medicação em uso no momento | Histórico: Metilfenidato 24/06 a 17/10 · Efeito adverso: insônia | Levetiracetam…".
  - Capturas: `p6d/susp-card.png`, `p6d/susp-panel.png`.
- **Por que é erro:** a frase é falsa, porque há registro, e esconde uma suspensão recente por efeito adverso. O PRODUCT.md reserva "Nenhuma medicação registrada" para quando não há registro nenhum.
- **Como corrigir:**
  - Com histórico e sem ativas, dizer "Nenhuma medicação em uso" e a suspensão mais recente ("Metilfenidato suspenso em 17/10 · efeito adverso: insônia"), mantendo "Confirme com o responsável antes de prescrever.".
  - O link vira "Abrir".
- **Como verificar:** o card e o painel dizem a mesma coisa sobre o histórico.

### 6. [P1, média] A pílula "Sem desfecho" mostra 1 de 2 e o Remarcar do outro some
- **Onde:** `record/patientStates.js:24` pega só `[0]`; `record/AlertPills.jsx:22-30`.
- **Reproduzir:** `spec2u.js` com Retorno confirmado de 08/10 e Teleconsulta agendada de 19/10, ambos passados e sem desfecho.
- **Evidência:**
  - Alertas: "Sem desfecho | Teleconsulta de 19/10/2026 14:00 | Remarcar".
  - Trilha: "1 de 3 realizadas | 2 sem desfecho". Faixa: 08/10 Sem desfecho e 19/10 Sem desfecho.
  - O retorno de 08/10, que também é remarcável, não aparece em nenhum alerta.
  - Captura: `p6d/two-unresolved.png`.
- **Por que é erro:** um alerta escondido e uma contagem que não bate com a trilha. Com o check-in velho do item 4, o alerta escolhido não tem Remarcar e o confirmado remarcável fica sem ação na tela inicial.
- **Como corrigir:** mostrar "Sem desfecho (2)" com a mais recente e um "+1" que abre a Linha do tempo filtrada, ou uma linha por horário. Com 2 ou mais, preferir para o Remarcar o primeiro remarcável.
- **Como verificar:** com 2 sem desfecho, o número da pílula bate com o da trilha.

### 7. [P3, média] A 1024×768 o painel de seção abre como uma fresta
- **Onde:** `record/SectionPanel.jsx:42-62`, com `MIN_HEIGHT = 360` e o cabeçalho grudado com todos os alertas quebrando linha. A barra da página com a faixa de alergia ocupa até y=353.
- **Reproduzir:** a 1024×768, abrir Evoluções.
- **Evidência:**
  - Rafael, base real, 3 alertas: cabeçalho de 176 px e corpo visível de **179 px**, acima do dock (`p6d/rafael-1024-panel.png`).
  - `spec5.js`, 5 alertas: cabeçalho de 295 px e corpo visível de **60 px**. Só aparece o título "Evoluções clínicas" (`p6d/m5-1024-panel.png`).
  - Rolando a página, o painel gruda e o corpo sobe para 249 px (`p6d/m5-1024-panel-rolado.png`).
  - A 1366×768 com 5 alertas sobram 237 px.
- **Por que é erro:** a seção abre praticamente sem conteúdo e o usuário precisa descobrir que deve rolar a página, não o painel.
- **Como corrigir:**
  - No cabeçalho do painel, manter inteira e fixa só a alergia, com os demais alertas numa fileira rolável ou recolhíveis ("+3 alertas").
  - Ou, ao abrir, rolar a página até a barra de seções grudar, como já acontece depois da rolagem manual.
- **Como verificar:** a 1024×768 com 5 alertas, o corpo do painel fica com 240 px ou mais logo ao abrir.

### 8. [P3, média-baixa] "Registrar primeira evolução" não registra
- **Onde:** `views/TimelineView.jsx:191-193` chama `onGoToSection('evolucoes')` sem `{ create: true }`, e `NotesView` não aceita `intent`.
- **Reproduzir:** `specEmpty.js` (paciente vazio) → Linha do tempo → "Registrar primeira evolução".
- **Evidência:** abre o painel Evoluções no estado vazio, sem diálogo, e é preciso clicar de novo em "Escrever a primeira" (`p6d/empty-registrar-evolucao.png`). Na mesma tela, "Aplicar escala" e "Registrar +" de medicações abrem o formulário direto.
- **Por que é erro:** o botão não faz o que diz e quebra a regra dos irmãos.
- **Como corrigir:** passar `{ create: true }` e dar a `NotesView` o mesmo `intent` de Escalas e Medicações, abrindo `NoteComposer`.

### 9. [P2, média-baixa] Decimal com ponto numa tela em pt-BR
- **Onde:** `record/ScaleCard.jsx:66` (`Math.abs(delta)` cru) e `views/TimelineView.jsx:81` (`${s.escore}/${s.escoreMaximo}` cru).
- **Reproduzir:** `specCars.js` com CARS-2 em 34, 31,5 e 29. Meio ponto é a escala real da CARS-2.
- **Evidência:** o card mostra "−2.5 pontos". A Linha do tempo mostra "31.5/60". O próprio card escreve a parte decimal com vírgula ("28,5") (`p6d/cars-card.png`).
- **Como corrigir:** formatar com `toLocaleString('pt-BR')`, também no `aria-label` do gráfico.

### 10. [P2/P3, baixa] O cabeçalho cala diagnósticos e o status de alta
- **Onde:** `PatientRecordScreen.jsx:244` (`slice(0, 3)` sem indicador) e `:237`.
- **Reproduzir:** `specAlta.js`, com status "alta" e 5 CIDs.
- **Evidência:** a barra diz "em acompanhamento desde 16/09/2026 (há 5 semanas) · Alta · G40.9 · F90.0 · F84.0". Faltam R62.0 e G80.1, sem "+2", embora o card liste os 5. A frase "em acompanhamento" convive com "Alta" (`p6d/alta-1440.png`).
- **Como corrigir:** chip "+2". Com status diferente de ativo, trocar por "primeiro atendimento em …".

### 11. [P1, baixa] A lista de estruturas vazia promete "Setas percorrem · Enter abre"
- **Onde:** `anatomy/AnatomyStage.jsx:511`.
- **Reproduzir:** Clara → desligar as 5 camadas → Tab até a lista.
- **Evidência:** a lista abre com 0 opções e a dica "Setas percorrem · Enter abre". Enter não faz nada (`p6d/layers-alloff.png`).
- **Como corrigir:** com `options.length === 0`, dizer "Todas as camadas estão ocultas. Ligue uma camada para percorrer as estruturas."

### 12. [P3, baixa] Exames filtrado diz "7 arquivos" sobre uma lista de 3
- **Onde:** `views/AttachmentsView.jsx:161`.
- **Reproduzir:** Clara → popover do Lobo frontal → "Neurofisiológicos 3". O mesmo acontece pela seta ↗ da pasta.
- **Evidência:** o subtítulo diz "7 arquivos", a linha "Mostrando só: Exame neurofisiológico" e a lista tem 3 itens (`p6d/clara-pop-after.png`).
- **Como corrigir:** com filtro, "3 de 7 arquivos".

### 13. [P3, baixa] Sobra um separador no painel de medicações
- **Onde:** `views/MedicationsView.jsx:65`.
- **Evidência:** sem concentração aparece "· 2,5 mL de 12/12 h" (`p6d/conflict-meds-panel.png`). O card da visão geral já filtra o vazio.
- **Como corrigir:** `[concentracao, posologia].filter(Boolean).join(' · ')`.

## O que passou

### P1 Palco anatômico
- **Alergia.** Fica visível e no topo em todas as 7 larguras e em 5 posições de rolagem (0 a 100%). Fica no palco grudado a partir de 1180 e na barra de seções abaixo disso. Com 5 alertas longos, todos ficam inteiros, sem corte, dentro do palco, sem cobrir o arco nem a faixa, com `scrollWidth` igual a `clientWidth`.
- **Popover.** "Relacionado ao paciente" bate com as pastas: Lobo frontal mostra Neurofisiológicos 3 e Exames de imagem 3, iguais às pastas "3 arquivos". O clique abre Exames filtrado com 3 itens. Esc fecha e devolve o foco à lista.
- **Camadas.** Desligar Cérebro tira as 24 estruturas da lista (sobram 6), fecha o popover e apaga o pino.
- **Faixa de consultas.** Cada cápsula de Clara e Pedro abre a Linha do tempo no item certo e visível sob o cabeçalho do painel. O "Hoje" fica no lugar certo com consultas de hoje antes e depois de agora.
- **Teclado.** Tab entra na lista, as setas percorrem, Enter abre o popover com o foco nele e Esc volta à lista.
- **Sem WebGL.** Com o WebGL anulado no início da página, aparecem a mensagem exata, as 30 estruturas em botões com "O que faz" e relações que funcionam, os alertas, a faixa e o crédito, e a página segue inteira a 1440 e a 390.
- **Desempenho.** 0 desenhos em 2 s com o painel aberto, com o palco fora da tela no celular e com `prefers-reduced-motion` em repouso. A rotação automática só roda sem preferência de movimento reduzido. Console limpo ao abrir e fechar as 8 seções.

### P2 Colunas
- **Perfil.** Nascimento, idade, sexo e responsável com parentesco e telefone. Com 4 responsáveis: "Responsáveis (4)" e os nomes. Sem dados: "Não informado" e "Nenhum cadastrado".
- **Nome social.** O h1 e a trilha de navegação usam o nome social, com "Nome de registro: …". O cabeçalho do painel a 390 usa o nome social. Consentimentos usa o nome de registro (titular legal).
- **Trilha sem laudo.** Clara, Rafael e Cecília batem com a faixa ("1 de 3 · 1 falta · 1 sem desfecho" e "3 de 4 · 1 sem desfecho").
- **Próxima consulta** (`specNext.js`). A pílula "Próxima 28/10/2026 09:30 · Retorno · em 6 dias", o anel da trilha "próxima 28/10/2026" e a cápsula "28/10 Confirmado" batem. Remarcar abre o diálogo da consulta certa com a alergia. Sem próxima, "Agendar retorno" abre a agenda com a paciente preenchida.
- **Estados vazios honestos.** "Nenhum diagnóstico registrado.", "Nenhuma consulta realizada", "Anexar exame" com a dica, "Nenhuma escala aplicada…", "Nenhuma medicação registrada. Confirme com o responsável antes de prescrever." (palavra por palavra) e "Marco sem registro não conta como atraso".
- **Pastas.** A soma por grupo (3, 3 e 1) é igual a "7 arquivos", à pílula e ao painel. O `+` da pasta, o card "Anexar exame" e o botão do painel abrem o seletor de arquivo real, conferido pelo evento `Page.fileChooserOpened`. A folha da pasta aberta abre a prévia do exame com a alergia.
- **Escalas.** 3 cards, igual à pílula 3 e ao painel "3 instrumentos aplicados". Delta e seta corretos (SNAP-IV 22 → 17 = −5, Vanderbilt 20 → 14 = −6). A interpretação e o risco são os gravados, e o primeiro ponto do SNAP-IV fica vermelho (risco alto gravado).
- **Marcos.** 2 atingidos, 1 emergente e 1 atrasado = 4, igual à pílula e a "Registrados (4)". O último registro está certo.
- **Medicações** (base real). 2 em uso, iguais à pílula e a "2 em uso".

### P3 Navegação e seções
- **Contagens.** Pílulas e painel batem nas 8 seções:
  - Clara: Evoluções 1, Escalas 3, Marcos 4, Medicações 2, Exames 7, Consentimentos 2, iguais a 2 "Vigente".
  - Gael: "2 a emitir", igual a "2 atendimentos de laudo concluídos sem documento".
  - Cecília: Documentos 1.
  - Gabriela: Consentimentos 3, iguais a 3 "Vigente".
  - Rafael: violação de teleconsulta igual a "2 já realizadas".
- **`?secao=`.** O link direto abre o painel com o foco nele. O voltar do navegador fecha e devolve o foco à pílula. Uma seção inválida cai na visão geral.
- **Teclado.** Setas e Enter nas pílulas abrem a seção. Esc fecha e devolve o foco à pílula.
- **Celular.** A 390 o painel ocupa a tela inteira, com tudo por trás `inert`.
- **Alergia no painel.** O cabeçalho do painel mostra a alergia nas 8 seções a 1440, 1180, 1100, 1024 e 390, também depois de rolar o painel e a página até o fim.
- **Alergia nos modais.** Aparece e continua grudada ao rolar o corpo, a 1024 e a 390, em: Emitir documento, Remarcar, Nova evolução, Registrar medicação, Registrar aplicação e Reaplicar, prévia de exame e folha da prescrição de Cecília ("Alergias: Amoxicilina").

## Observações (fora do escopo, sem reprovar)
- **Base de demonstração.** M-CHAT-R/F aplicado numa paciente de 12 anos. Marcos de 2 a 5 anos registrados para 12 anos. Laudo com status "Faltou". F90.0 descrito como "Distúrbio…" na ficha de Clara e como "Distúrbios…" no catálogo.
- **Agenda.** O "Agendar retorno" chegou ao formulário com a paciente preenchida. Não avaliei o horário padrão.
- **Permissões.** Só o papel Médico lê o prontuário (`patients.record`), então o estado "sem permissão de escrita" não é alcançável por papel real. Não testei.
- **Não testado.** O modal "Identificar o anexo", porque exigiria carregar um arquivo no input. Pela leitura do código, ele também não traz a alergia.
