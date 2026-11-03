# Crítica P7 — lente ROBUSTEZ E ACESSIBILIDADE (`robustez`)

Data: 2026-10-26. Tela: `#/pacientes/:id` em `http://localhost:5173/admin.html`, árvore de trabalho como estava no ar. Crítico de contexto limpo: não li `design-loop.md`, nenhum `critica-p*.md` anterior e nenhum código de UI de `admin/`. Para montar o adaptador em memória li apenas a camada de dados (`admin/data/repository.js`, `idb-adapter.js`, `schema.js`) e o rodapé de `format.js` (uma linha, para localizar o cálculo de idade depois de ver o erro na tela).

Método: driver CDP próprio no Chromium da porta 9333 (teclado real com `Input.dispatchKeyEvent`, `Accessibility.getFullAXTree`, emulação de mídia, `Fetch`/`Network`, `Page.addScriptToEvaluateOnNewDocument`). Dados extremos e falhas de leitura foram injetados por adaptador em memória somente leitura (`repository.useAdapter`), que delega leituras ao IndexedDB e rejeita `put/putMany/destroy/putBlob/setMeta/wipe`. Os testes de escrita (duplo clique) usaram uma variante que grava só na memória da aba. Nenhum registro foi gravado no IndexedDB por mim. Houve uma queda do Chromium e do scratchpad no meio da execução; os testes foram refeitos e as capturas citadas abaixo são as que sobreviveram ou foram regeradas.

Capturas: `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p7/robustez/shots/` (abreviada `shots/` abaixo). Pasta de capturas prontas `.claude/design-loop/shots/prontuario-p7/` listada de novo no fim: 29 arquivos (01 a 43 mais `medidas-1440.json` e `medidas-390.json`); a lista não mudou durante a minha execução.

## Vereditos por peça

| Peça | Veredito | Motivo principal |
|---|---|---|
| P1 Palco anatômico | APROVA | Teclado, leitor de tela, sem WebGL, perda de contexto, GLB lento e movimento reduzido passam. Só achados MENOR (R13, R14, R15, R20). |
| P2 Colunas | REPROVA | R1 (falha de leitura mostrada como "nenhuma medicação"), R6 (nome longo atrás dos botões), R7 (idade de recém-nascido errada). |
| P3 Navegação e seções | REPROVA | R2, R4 (skip link sai da página), R5 (foco perdido ao fechar 3 modais), R8 (gravação dupla), R9, R10. |
| P4 Faixa de consultas e estados | REPROVA | R1 (sem leitura de consultas a faixa e o alerta "sem desfecho" somem), R3 (uma data inválida derruba a tela inteira), R11 (303 paradas de Tab). |

Contagem: 1 BLOQUEIA, 10 GRAVE, 13 MENOR (24 achados confirmados) e 4 suspeitas.

## Achados confirmados

### BLOQUEIA

**R1 — Falha de leitura vira estado vazio "honesto", sem nenhum aviso** · P2/P3/P4
- Onde: `#/pacientes/<principal>` a 1440×900 e painel `?secao=medicacoes|consentimentos`. Adaptador em memória com `list('<store>')` lançando erro, uma store de cada vez.
- Evidência: `shots/50-falha-leitura-silenciosa.png` (falha em `medicacoes` + `agendamentos`). Texto medido: card de medicações = "Nenhuma medicação registrada. Confirme com o responsável antes de prescrever." (a paciente usa metilfenidato e levetiracetam); falha em `agendamentos` = trilha "Nenhuma consulta realizada", faixa de consultas inexistente e o alerta "Sem desfecho / Remarcar" desaparece; falha em `escalas` = "Nenhuma escala aplicada… Aplicar escala"; `marcos` = "Nenhum marco avaliado ainda"; `anexos` = "Anexar exame" sem pastas e a pílula "Exames 7" perde o contador; `consentimentos` = o painel mostra todas as finalidades como "Não registrado" com botão "Registrar consentimento", que gravaria duplicata de consentimento já existente. Nenhum toast, banner, ícone de erro ou botão "tentar de novo" em nenhum caso; console limpo (a exceção é engolida).
- Deveria: distinguir "sem registros" de "não consegui ler". Cartão/região afetada deve mostrar erro e ação de tentar de novo; nunca o texto de estado vazio nem ações de criação.
- Reproduzir: abrir a aba de verificação, `await import('/admin/data/repository.js')`, trocar o adaptador por um invólucro cujo `list('medicacoes')` rejeite, ir para a rota do paciente.

### GRAVE

**R2 — Falha ao ler o paciente deixa a área de conteúdo em branco** · P3 (tela toda)
- Evidência: `shots/50-falha-pacientes-tela-em-branco.png`. Com `get('pacientes', id)` rejeitando: sem h1, sem esqueleto, sem mensagem, sem retry (corpo com 97 caracteres: só barra superior). Console: `Uncaught (in promise) Error … PatientRecordScreen.jsx:99` (promessa rejeitada sem tratamento).
- Deveria: tela de erro com mensagem em português e botão de tentar de novo.

**R3 — Um registro com dado inválido derruba o prontuário inteiro; não há ErrorBoundary por região** · P4 (e todas)
- Evidência: `shots/43-errorboundary.png`. Um agendamento com `inicio: 'data-invalida'` → `RangeError: Invalid time value at VisitRail.jsx:72` → tela "Esta tela falhou ao carregar" (com "Tentar de novo" / "Recarregar o painel"). Alergia, medicações e tudo o mais somem junto. Também derrubam a tela inteira: paciente sem `clinico` (`TypeError … 'queixaPrincipal'` em `PatientForm.jsx:65`, formulário fora de escopo mas montado dentro da tela) e sem `perfilSensorial` (`'gatilhos'`). Ao voltar para a rota a tela continua caída (o dado continua ruim).
- Deveria: uma ErrorBoundary por região (palco, cada coluna, faixa, painel) e, no mínimo, a barra de alergia e o cabeçalho sobrevivendo a qualquer cartão quebrado.

**R4 — O primeiro item da tabulação, "Ir para o conteúdo", leva o usuário ao Dashboard** · P3 (página inteira; shell)
- Evidência: Tab 1 foca `a.skip-link` (`href="#conteudo"`); Enter muda `location.hash` para `#conteudo`, o roteador de hash cai em `#/` e o h1 passa de "Clara Macedo Farias" para "Bom dia, Charlington." (foco termina no `<main>`, na página errada).
- Deveria: mover o foco para `<main id="conteudo">` sem alterar o hash do roteador.
- Reproduzir: carregar a rota do paciente, `Tab`, `Enter`.

**R5 — Três modais perdem o foco ao fechar (vai para o `<body>`)** · P3/P2
- Evidência: "Adicionar adendo" (Evoluções), "Registrar medicação" (Medicações) e "Novo agendamento" (gatilho "Agendar retorno"): após Esc ou Cancelar, `document.activeElement === body` (o gatilho de adendo e de medicação continua no DOM; o de "Agendar retorno" é desmontado). Os demais modais voltam ao gatilho corretamente: suspender, remarcar, emitir documento, registrar aplicação, reaplicar, revogar, remover anexo, prévia de exame, nova evolução.
- Efeito: o usuário de teclado recomeça do topo da página (skip link) com 50+ paradas até onde estava.
- Reproduzir: foco no botão, Enter, Esc; ler `document.activeElement`.

**R6 — Nome longo sem espaço fica atrás dos botões "Editar ficha"/"Emitir documento"** · P2 (cabeçalho)
- Evidência: `shots/50-nome-80-sem-espaco.png`. Nome de 78 caracteres sem espaço: o h1 não quebra nem usa reticências, corre por baixo dos dois botões e o final do nome (a partir de "…ghijklmn") fica oculto. Nome de 80 caracteres COM espaços quebra bem em duas linhas e empurra o layout sem sobrepor (passa). Nome social de 86 caracteres com hífens: quebra em duas linhas (passa).
- Deveria: o nome do paciente nunca pode ficar oculto (quebra em qualquer ponto ou reticências com título completo acessível).

**R7 — Idade de recém-nascido calculada com erro de 1 dia, e "—" no dia do nascimento** · P2 (barra e cartão do paciente)
- Evidência (fuso America/Sao_Paulo, hoje 23/10/2026): nascido 22/10 → "0 dias"; 17/10 → "5 dias"; 08/10 → "14 dias" (real: 15); 24/09 → "28 dias" (real: 29); nascido hoje → "—" (deveria ser "0 dias"/"recém-nascido"); a partir de 1 mês os valores conferem. Data de nascimento futura (05/05/2031) mostra a data e "—" sem nenhum aviso; data inválida mostra "—" em idade e em data.
- Deveria: contagem de dias exata, nascido hoje com texto, e aviso quando a data de nascimento é futura ou ilegível.
- Obs.: em neuropediatria o atendimento neonatal é rotina; a idade errada em dias é dado clínico errado.

**R8 — Botões de gravação direta gravam duas vezes com dois cliques rápidos; consentimento grava sem confirmação** · P3
- Evidência (adaptador em memória, escrita simulada com atraso de 150 ms, dois `click()` no mesmo tick): "Remarcar" 2 gravações, "Registrar medicação" 2 REGISTROS DISTINTOS (medicação duplicada), "Suspender" 2, "Registrar nova informação" 2 registros, "Registrar consentimento" 2 registros. Com cliques reais espaçados ≥ 90 ms o botão já está travado (1 gravação), logo a janela é curta mas real (toque duplo, Enter repetido, rede/IndexedDB lento). Com adaptador que rejeita, "Registrar consentimento" tenta gravar na hora (toast de erro bruto) sem confirmação.
- Deveria: trava síncrona (ref) no primeiro disparo e confirmação para ações que criam registro legal (consentimento).
- Observação: outros críticos relataram o mesmo no banco real, com gravações acidentais na paciente Clara.

**R9 — Nomes acessíveis idênticos e sem contexto em ações clínicas** · P3/P2
- Evidência (AX tree dos painéis): "Suspender" ×2 (ícone com `aria-label="Suspender"`, não diz qual medicação), "Revogar" ×2, "Registrar consentimento" ×3 (o nome da finalidade está só no texto vizinho), "Reaplicar" ×3, "Ver dados" ×2, "Remarcar" ×2 no painel, "Abrir" ×2 nos cartões Medicações em uso e Marcos. Um leitor de tela ouvindo a lista de botões não sabe qual medicação suspende nem qual consentimento revoga. (Bom contraponto: "Remover RM de crânio — controle" e as cápsulas "Retorno em 07/10/2026, Sem desfecho" têm nome completo.)
- Deveria: `aria-label` ou `aria-describedby` com o objeto ("Suspender Metilfenidato").

**R10 — Com `forced-colors: active` some o estado ativo e as bordas** · P3/P2
- Evidência: `shots/32-forced-colors.png`. A pílula ativa "Visão geral" fica idêntica às demais (só `aria-current`, sem marca visível); cartões sem qualquer borda (nada separa Perfil, Diagnósticos e escalas do fundo); contadores das pílulas perdem a bolha; pontos de status das cápsulas (Faltou/Concluído/Sem desfecho) e o marcador "Hoje" desaparecem; a coluna de escalas e o busto continuam legíveis.
- Deveria: usar cores de sistema (`ButtonText`, `Highlight`, bordas `1px solid CanvasText`) nas pílulas ativas, cartões e marcadores.

**R11 — Faixa de consultas não tem navegação por setas: 303 paradas de Tab com 300 consultas** · P4
- Evidência: `shots/50-300-consultas.png`; `document.querySelectorAll('.pr-rail button').length === 303`, todas `tabindex` 0. Passar pela faixa exige 303 Tabs (e Shift+Tab para voltar). Pacientes de acompanhamento longo terão 100+.
- Deveria: tabindex móvel (uma parada, setas dentro) como nas pílulas de seção, que já fazem isso.

### MENOR

**R12 — Esc no painel devolve o foco à pílula, não ao gatilho** · P3
- Evidência: abrir pelo cartão de escala, "Ver todas", "7 arquivos", pasta, cápsula ou trilha e fechar com Esc → foco em `button.pr-pill` (Escalas/Exames/Linha do tempo), não no gatilho (gatilho conectado, `activeElement !== gatilho`). Quando aberto pela própria pílula volta nela (correto).

**R13 — Modelo 3D que falha ao baixar: mensagem culpa o navegador e não há "tentar de novo"** · P1
- Evidência: GLB com 404 ou 503 → `an-stage--fallback` com "Não foi possível abrir o modelo 3D neste navegador." (console: `[anatomia] modelo 3D indisponível HttpError … 404`). O fallback é útil (lista de estruturas por acordeão, painel e colunas intactos). Sair para `#/pacientes` e voltar recarrega o modelo; recarregar a página exige novo login. Sem WebGL a mensagem é correta; com falha de rede ela é enganosa.
- Passa: GLB lento (9 s) mostra "Abrindo o modelo 3D" (`role=status`) e os controles já respondem; GLB corrompido cai no fallback.

**R14 — Perda de contexto WebGL deixa o palco em branco sem mensagem** · P1
- Evidência: `WEBGL_lose_context.loseContext()` → busto some, nenhuma mensagem, camadas/lista continuam ativas; `restoreContext()` → cena volta sozinha (com o estado de camada mantido). Lacuna só durante a perda.

**R15 — Oito alergias fazem a pílula crescer (143 px) e cobrir a cabeça do busto** · P1
- Evidência: `shots/50-8-alergias.png`. Nada é cortado (todas visíveis), mas a pílula ocupa o topo do palco, empurra a pílula "Sem desfecho" e o menu de camadas para baixo e cobre cérebro e crânio.

**R16 — Sem limite de altura em cartões com muitos itens** · P2
- Evidência: 40 medicações → cartão com 4.290 px e página com 5.545 px (colunas desencontradas); 12 diagnósticos → 839 px; 60 anexos → pastas mostram "20 arquivos" em 3 pastas e "Anexar exame" (ok). Sem "ver todas" nem limite.

**R17 — ID inexistente ou malformado na URL redireciona em silêncio para a lista** · P3
- Evidência: `#/pacientes/0000…`, `#/pacientes/abc`, `#/pacientes/%00`, `#/pacientes/<script>` → `#/pacientes` sem mensagem "Paciente não encontrado" (`shots/40-id-inexistente.png`). `?secao=` inválida ou em maiúsculas abre a visão geral e mantém o valor na URL (aceitável).

**R18 — A 320 px (zoom 400%) a barra superior transborda 35 px** · P3 (shell)
- Evidência: `shots/33-zoom400-alto.png`: `.shell__content` 355/320, avatar fora da tela; a grade de pastas rola horizontalmente por dentro (carrossel, aceitável). 640 px (200%) sem perda; 390 px sem rolagem lateral.

**R19 — O texto ignora o tamanho de fonte do navegador** · P2/P3
- Evidência: `html{font-size:20px}` não muda nada (h1 32 px, corpo 14 px). Só o zoom amplia. `shots/32-fonte20.png`.

**R20 — Movimento reduzido: o fundo animado continua** · shell
- Evidência: com `prefers-reduced-motion: reduce` o busto não gira (`shots/31-rm-diff.png` só difere no fundo), o painel abre sem animação (`animation: none`) e a pasta não gira; mas o canvas de fundo do shell (`canvas.shell__bg`) segue mudando de gradiente/granulado.

**R21 — Semântica de leitor de tela com imperfeições** · P1/P3
- Evidência (AX): lista "Alertas do paciente" contém `status` (alergia, `aria-live=polite`) no lugar de `listitem` (lista de 2 itens anuncia 1); painel de seção usa H3 sem H2 (H1 → H3) com as colunas ainda visíveis; `Canvas ""` decorativo do shell sem `aria-hidden`; link "Mensagens Internas" contém `<button>` (interativo aninhado, shell). Pontos positivos: canvas com `role=img` e descrição longa, camadas com `aria-pressed`, listbox com `aria-activedescendant`.

**R22 — Valores inválidos aparecem como "Invalid Date" e geram erros de React** · P3
- Evidência: anexo, escala ou evolução com data corrompida → "Invalid Date" na Linha do tempo; escore `NaN`/`null`/texto → avisos `Received NaN for the … attribute` (y, height, cy, y1, y2) no console, gráfico das escalas quebrado. Dados que a UI normal não deveria produzir, mas o prontuário não os trata.

**R23 — Rascunho de "Nova evolução" se perde ao recarregar, sem aviso** · P3
- Evidência: texto digitado + `Page.reload` → login → rota restaurada, modal e texto perdidos; sem `beforeunload`. Obs. fora de escopo (`components/ui/`): o combobox de CID/atendimento do modal perde o foco ao tabular para as sugestões (foco cai no `<body>` quando a lista fecha).

**R24 — Alvos de toque abaixo de 44 px a 390 px** · P2/P3
- Evidência: "Editar ficha" e "Emitir documento" 40 px de altura, "Remarcar" (pílula) 32 px, link "Pacientes" do breadcrumb 21 px. Nenhum abaixo de 24 px, exceto o breadcrumb. O restante ≥ 44 px (zoom +/−/3D 44, cápsulas 48).

## Suspeitas (não confirmadas)

- **S1 — Leitura que nunca termina fica em esqueleto para sempre**: com `list('agendamentos'|'medicacoes'|'pacientes')` pendurado, a tela mostra os 5 esqueletos além de 2,5 s, sem mensagem de tempo esgotado. Confirmar: manter `hang` por 30 s+ e ver se algum aviso aparece.
- **S2 — Sessão/cofre bloqueado no meio do uso**: não testei `idbAdapter` lançando "cofre bloqueado" com a tela aberta; R1 sugere que cada leitura mostraria estado vazio. Confirmar: bloquear o cofre (logout em outra aba) e abrir uma seção.
- **S3 — Gravação dupla com clique real**: com eventos de mouse espaçados de 90 ms a trava funcionou; o relato dos outros críticos pode vir de IndexedDB lento ou toque. Confirmar medindo o tempo entre os dois cliques que duplicam no banco real (R8 já reproduz com dois cliques no mesmo tick).
- **S4 — Leitor de tela real (VoiceOver/NVDA)** não foi usado; tudo vem da árvore de acessibilidade do Chromium. Confirmar a fala de "Suspender", do painel (foco no `section` com `aria-label`) e do alerta de alergia em um leitor real.

## Testado e passou

| Área | Resultado |
|---|---|
| Só teclado, ordem de tabulação (1440×900) | 52 paradas, ordem lógica (cabeçalho → pílulas → coluna esquerda → palco → faixa → direita); skip link existe (mas ver R4). |
| Foco visível | Anel azul 2 px (`rgb(0,113,227)`) em todos os botões, pílula ativa com anel duplo, pastas com anel no cartão, listbox com item ativo destacado. Exceção só no dock (fora de escopo). |
| Pílulas de seção | Tabindex móvel: Setas, Home e End movem o foco, Enter abre; foco entra no painel (`section` com `aria-label`), `inert` no palco e na coluna direita enquanto aberto; Tab não escapa; Esc fecha e devolve o foco à pílula. Todas as 8 seções. |
| Lista de estruturas (listbox) | Alcançável por Tab; setas, Home, End (com rotação), Enter abre o popover (`role=dialog`, foco nele), Esc fecha e volta à lista; estrutura destacada no busto. |
| Pastas de exames | Enter abre/fecha a pasta (`aria-expanded`), "Abrir exames" e "Adicionar arquivo" abrem o painel (e o seletor de arquivo, no segundo caso). |
| Modais (13 testados) | `role=dialog`, `aria-modal=true`, nome acessível, foco inicial dentro, Tab/Shift+Tab ficam dentro (exceto o combobox de "Nova evolução", componente `ui`), Esc fecha. Foco volta ao gatilho em 10 de 13 (R5 nos outros 3). |
| Equivalentes de ponteiro | Arrastar/pinça: botões Aproximar, Afastar e "Mudar vista" (3 vistas); hover por estrutura: listbox; sem rotação livre por teclado (observação). |
| Leitor de tela (AX tree) | Landmarks (nav "Seções do prontuário", "Consultas do paciente", `complementary`, `region` por cartão), h1 único, títulos H2 por cartão, nenhum botão/link/campo sem nome (exceto o listbox do combobox `ui`), campos dos modais todos rotulados, canvas `role=img` com descrição longa, estados `aria-pressed`/`expanded`/`current`. |
| Preferências | `prefers-reduced-motion`: busto e painel sem movimento (R20 só o fundo). `prefers-color-scheme: dark`: a página continua clara e legível, modal legível (`color-scheme: light`). Zoom 200% (640 px) sem perda; 390 px sem rolagem lateral; 768, 1024 sem sobreposição. |
| Falhas de infraestrutura | Sem WebGL: fallback em português com lista de estruturas, resto da página útil (`shots/50-sem-webgl.png`). Perda/restauração de contexto: recupera. GLB lento: loader. GLB 404/503: fallback (R13). GLB corrompido: fallback. Offline após carregar: painéis e modais funcionam (app local). |
| Dados extremos | Paciente vazio (estados vazios com ação), 8 alergias (sem corte, R15), 12 diagnósticos, 40 medicações, 300 consultas (faixa rola e ancora em "Hoje"), 60 anexos (pastas "20 arquivos"), consulta em 2099 e em 1900, nascimento 19a11m e 20 anos, nascimento ausente ("Não informado"), nome de 80 caracteres com espaços, texto com `<script>`, `&`, aspas, emoji e HTML (aparece como texto, `window.__xss` nunca setado, nenhum elemento injetado). |
| Formulários com 5.000 caracteres | Adendo, suspender, registrar medicação, nova evolução, remarcar e emitir documento aceitam o texto, o modal mantém os botões visíveis e sem rolagem lateral; "Emitir documento" avisa "O texto não cabe em uma folha" e trava a emissão. |
| Navegação e concorrência | Voltar/avançar com painel aberto (cada painel é uma entrada do histórico); trocar de paciente sem recarregar não vaza camada desligada, popover nem painel; abrir/fechar painel 20× e 15× com Esc sem erro nem `inert` preso; redimensionar 1440→390→844×390→1440 mantém canvas (576×600) e sem rolagem lateral; aba congelada/ativada volta ao normal; recarregar com modal aberto pede login e restaura rota e painel. |
| Console | Limpo em todos os cenários, exceto: 404 do GLB (esperado), `Received NaN` (R22), `RangeError`/`TypeError` das telas derrubadas (R3) e a promessa rejeitada de R2. Nenhum aviso de chave/props/`act` do React. |

## Observações fora da contagem

- Banco de verificação poluído por outro crítico: na paciente Clara existem consentimentos criados em 23/10/2026 14:15:57 e 14:16:36 UTC (`tratamento_clinico` ×2) e 14:16:01 (`comunicacao_email`) que não vieram desta lente (meus cliques foram sempre contra o adaptador que rejeita escrita; o que gravei em memória sumiu com a aba).
- Decisões do dono respeitadas: pastas abaixo da dobra, textos "O que faz", ausência de nervos e medula, dock, `.btn` global, modal "Editar ficha" e `components/ui/` não foram julgados (os achados R18, R20, R21 e R23 citam shell ou `ui` apenas como contexto).
