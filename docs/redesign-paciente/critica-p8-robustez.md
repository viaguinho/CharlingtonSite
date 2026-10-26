# Crítica P8: robustez e acessibilidade do prontuário do paciente

- **Data:** 2026-10-26
- **Tela:** `#/pacientes/<id>` em `http://localhost:5173/admin.html`, no estado atual (branch `redesign-prontuario`, servidor dev).
- **Lente:** o que acontece quando as coisas não são ideais: teclado, leitor de tela, contraste, toque, zoom/reflow, preferências do sistema, WebGL, rede, falha de leitura e gravação, clique duplo, dados extremos e rota inválida.
- **Contexto limpo:** li só `bar.md`, `guia.md` e o código necessário para entender um comportamento. Não li design-loop, críticas anteriores, registro de conflitos, git nem o cofre.

## Método

- Chromium headless na porta 9333 com o perfil de verificação. Usei `cdp.mjs` para capturas simples e escrevi uma sonda própria (`probe.mjs`, no scratchpad) que mantém uma sessão CDP e envia **teclas e cliques reais** (`Input.dispatchKeyEvent` / `Input.dispatchMouseEvent`). A mesma sonda lê a árvore de acessibilidade (`Accessibility.getFullAXTree`), intercepta a rede (`Fetch.requestPaused` para atrasar ou derrubar o `busto.glb`) e emula mídia e janela (`prefers-reduced-motion`, `forced-colors`, `prefers-color-scheme`, 390, 320×568, 320×256 e 720×450 com DPR 2).
- **Nenhuma gravação chegou ao IndexedDB.** Montei um adaptador em memória (`repo.useAdapter`, importado pela URL `?t=` que o Vite serve de fato). Ele lê do IDB real e grava só num mapa da aba: `put`, `putBlob`, `appendAudit` e `setMeta` ficam interceptados, e o `wipe` fica bloqueado. Nesse adaptador simulei falha de leitura por loja, atraso de leitura, atraso de gravação e falha de gravação.
- Os dados extremos existem só na memória da aba, em dois pacientes sintéticos:
  - um paciente de 80 caracteres sem espaço, recém-nascido, com 3 responsáveis e 6 alergias, 7 diagnósticos, 300 consultas (mais 2 com data inválida, 1 em 2031 e 1 atrasada hoje), textos de 20 mil caracteres, escala acima do máximo e com data futura ou inválida, anexos sem binário e consentimento de teleconsulta vigente;
  - um paciente vazio, "Teste Crítico P8 Robustez".
- Clara e Rafael foram só lidos. Diálogos de gravação foram abertos e acionados apenas com o adaptador em memória.
- Contraste: deixei o texto transparente, capturei o fundo real (vidro, aurora e canvas), recompus a cor do texto pixel a pixel e calculei a razão WCAG do pior 5% e da mediana de cada trecho. Texto encoberto (`elementFromPoint`) ficou de fora.

## O que NÃO consegui testar

- Leitor de tela real (VoiceOver/NVDA). Avaliei só a árvore AX do Chromium e as regiões vivas.
- Perda de contexto real da GPU. Simulei com `WEBGL_lose_context`.
- Modo Supabase de verdade. A latência foi simulada com atraso no adaptador.
- Expiração de sessão por inatividade e bloqueio do cofre (fluxo do shell, fora de escopo), impressão, gestos de toque reais no palco (arrastar e pinçar), Firefox e Safari.
- Alto contraste do Windows real: só a emulação `forced-colors` do Chromium. A captura de página inteira saiu em mosaico (artefato da emulação), então julguei por estilo computado e por captura recortada do palco [C17].

## Vereditos

| Peça | Veredito | Motivo |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | Quando o contexto WebGL se perde, o palco fica vazio, sem aviso e sem a lista de reserva (R8-4). Com consentimentos ilegíveis aparece um alerta falso de teleconsulta; com consultas ilegíveis, "Sem desfecho" some do palco sem aviso (R8-5). |
| P2 Colunas | **REPROVA** | Com a leitura de responsáveis falhando, o perfil afirma "Responsável: Nenhum cadastrado" (R8-6). É o caso "não consegui ler" virando "não há". |
| P3 Seções e modais | **REPROVA** | Clique duplo num marco cria registro duplicado quando a releitura é lenta (R8-1). Ao gravar ou falhar, o foco cai no `<body>` e escapa do diálogo (R8-2). A 400% o painel deixa 12 px de conteúdo (R8-3). "44 a emitir" no lugar de "2", e a Linha do tempo sem aviso quando faltam consultas (R8-7). |
| P4 Faixa e estados | **REPROVA** | Um paciente inexistente redireciona sem dizer nada, e o botão Voltar fica preso num laço (R8-8). A faixa em si está boa (ver "O que está bom"). |

---

## Achados confirmados

### BLOQUEIA

Nenhum.

### GRAVE

#### R8-1 · Clique duplo num marco cria dois registros do mesmo marco (P3)
- **Onde:** painel Marcos, botão de cada marco (`MilestonesView.jsx`, `cycle`, linhas 98–126).
- **Evidência:** com releitura de 400 ms (o que o modo servidor faz ao reler 9 tabelas), dois cliques reais com 150 ms de intervalo em "Segue objeto na linha média: Não avaliado" geraram **duas** gravações de ids diferentes (`0d7b7a49…@16045`, `be0d2d6b…@16246`). Resultado: dois registros `segue-objeto:atingido`. Com o IDB local e sem atraso, 150 ms gerou 1 gravação. Com 80 ms, o mesmo id foi gravado duas vezes (Não avaliado → Atingido → Emergente), ou seja, o duplo clique avança dois estados.
- **Causa (código):** `reload()` não é aguardado, e o `finally { setSaving(null) }` reabilita o botão antes de `recorded` atualizar. O segundo clique ainda vê `current` vazio e chama `repo.create` de novo.
- **Deveria:** manter o marco travado até a releitura terminar (aguardar o `reload`, ou atualizar `recorded` de forma otimista, ou usar uma trava por `marcoId` num `ref`). E não deixar o duplo clique pular dois estados.
- **Reproduzir:** adaptador em memória com `listDelay = 400`, paciente de teste com 3 anos, `?secao=marcos`, dois cliques a 150 ms num marco "Não avaliado". Depois conte os registros `marcos` daquele `marcoId`.

#### R8-2 · Ao gravar, o foco cai no `<body>` e sai do diálogo; o erro só vai para um toast educado (P3)
- **Onde:** todo `Modal` cujo botão de enviar usa `loading` (`Button` aplica `disabled` durante o envio). O trap de foco está em `Overlay.jsx`, linhas 39–48. Medi em "Registrar medicação". O mesmo padrão aparece em Nova evolução, Registrar aplicação, Remarcar, Emitir documento e Anexo.
- **Evidência (teclado real, gravação com falha e atraso de 500 ms):**
  - antes do Enter, o foco está em `BUTTON Registrar` dentro do diálogo;
  - durante a gravação, `activeElement = BODY`;
  - depois da falha, continua em `BODY`;
  - **Tab** depois da falha, ainda `BODY`: o foco saiu do documento, porque o trap só age quando o foco está no primeiro ou no último item.
  - O erro "Falha simulada de gravação" aparece só no toast `.toasts` com `role=status aria-live=polite`. O diálogo fica aberto e preserva os dados, o que está certo.
- **Deveria:** não tirar o foco do botão (usar `aria-disabled` em vez de `disabled`, ou devolver o foco ao botão ou ao diálogo quando o envio termina). Em erro, levar o foco à mensagem ou ao botão e anunciar de forma assertiva (`role=alert`), de preferência dentro do diálogo. Quando o foco estiver fora do diálogo, o trap deve recolocá-lo lá dentro.
- **Reproduzir:** adaptador em memória com `writeFail = true` e `writeDelay = 500`. Abra Medicações → "Registrar medicação", preencha, foque "Registrar", tecle Enter e depois Tab. Leia `document.activeElement`.

#### R8-3 · Painel de seção ilegível a 400% de zoom (P3)
- **Onde:** painel em tela cheia abaixo de 1024 px (`SectionPanel.jsx` e `patient-record.css`): cabeçalho do painel grudado, mais a barra de seções grudada.
- **Evidência:** a 320×256 CSS px (1280×1024 a 400%) com Medicações aberta, o painel começa em y=64 e o cabeçalho (nome, alergia, ×) ocupa 120 px. **O corpo começa em y=184.** O dock (fora de escopo) começa em 196, então sobram **12 px** de conteúdo. Mesmo descontando o dock, sobram 72 px. Na visão geral, a barra de seções grudada tem 120 px num viewport de 256. [C11a][C11b]. A 720×450 (200%) o corpo tem 229 px e dá para usar.
- **Deveria:** em janelas baixas (`@media (max-height: …)`), soltar a barra de seções e reduzir o cabeçalho do painel a uma linha (alergia + ×), ou soltá-lo. WCAG 1.4.10 (Reflow).
- **Reproduzir:** `Emulation.setDeviceMetricsOverride` com 320×256 e DPR 4. Abra qualquer seção e meça `.pr-panel__body` contra o topo do dock.

#### R8-4 · Perda do contexto WebGL deixa o palco vazio, sem aviso e com controles ativos (P1)
- **Onde:** `AnatomyStage.jsx` e `scene.js`. Não há nenhum ouvinte de `webglcontextlost`/`webglcontextrestored` (o grep não encontra).
- **Evidência:** depois de `getExtension('WEBGL_lose_context').loseContext()` (o console mostra `THREE.WebGLRenderer: Context Lost.`), o busto some e não aparece mensagem. `+`, `−` e `3D` continuam habilitados, e a lista de estruturas continua abrindo o popover ("Lobo frontal, lado direito…") sobre um modelo invisível [C8b]. Só um `restoreContext()` explícito trouxe o modelo de volta [C8c]. Um contexto derrubado pelo navegador (limite de contextos, reset da GPU) pode nunca voltar. O próprio código comenta que "na 14ª o Chrome derrubava o do fundo".
- **Deveria:** em `webglcontextlost`, mostrar a mesma lista de reserva do "sem WebGL", com "O modelo 3D parou de responder" e "Recarregar modelo". Em `webglcontextrestored`, reconstruir a cena.
- **Reproduzir:** `#/pacientes/<Clara>`, com o palco pronto rode `document.querySelector('.an-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`.

#### R8-5 · Alertas do palco afirmam estados que a tela não conseguiu ler (P1)
- **Onde:** `patientStates.js` (recebe `consents` e `appointments` sem saber que a leitura falhou) e `AlertPills.jsx`.
- **Evidência:**
  1. Paciente sintético com consentimento de teleconsulta **vigente** e teleconsulta marcada para 04/11. Lendo normalmente, os alertas são "Alergias…" e "Atrasado…". Com `consentimentos` ilegível, aparece **"Sem consentimento para teleconsulta · próxima em 04/11/2026"** [C3c].
  2. Clara com `agendamentos` ilegível: o palco mostra só "Alergias Dipirona". O "Sem desfecho · Retorno de 07/10/2026 10:00 · Remarcar" some, e a faixa também. Nada no palco diz que os estados são desconhecidos [C2a]. O aviso existe só no topo da página, e abaixo de 1024 px esse topo rola para fora.
- **Deveria:** com consentimentos ilegíveis, uma pílula neutra "Consentimento de teleconsulta: não foi possível verificar". Com consultas ilegíveis, uma pílula "Consultas: não foi possível ler; estados de agora desconhecidos" no lugar dos estados.
- **Reproduzir:** adaptador em memória com `failList = ['consentimentos']` (ou `['agendamentos']`). Navegue para fora e volte ao paciente.

#### R8-6 · "Responsável: Nenhum cadastrado" quando a leitura dos responsáveis falha (P2)
- **Onde:** `ProfileColumn.jsx`, `ProfileCard` (linhas 55–87). O componente trata consultas e exames ilegíveis, mas não `STORES.GUARDIANS`.
- **Evidência:** Clara com `responsaveis` ilegível. O aviso do topo diz "Não foi possível ler responsáveis", mas o card afirma **"Responsável · Nenhum cadastrado"**. Lido normalmente, o card mostra "Roberta Farias · Mãe · (19) 90000-0015" (sonda 02).
- **Deveria:** "Não foi possível ler os responsáveis", no mesmo padrão de "Não foi possível ler as consultas".
- **Reproduzir:** `failList = ['responsaveis']` e reabra o prontuário.

#### R8-7 · Pílula de documentos e Linha do tempo erram quando uma loja falha (P3)
- **Onde:** `PatientRecordScreen.jsx`. Nos `counts.documentos` (linhas 237–241), `issued` vem de `record.documents`, que fica vazio na falha. E `SECTION_STORES` não inclui `linha-do-tempo`.
- **Evidência:**
  1. Paciente sintético com 42 laudos concluídos, 40 deles já emitidos. Lendo normalmente: **"Documentos 2 a emitir"**. Com `documentos` ilegível: **"Documentos 44 a emitir"** (sonda 16).
  2. Clara com `agendamentos` ilegível: o painel Linha do tempo abre com "17 registros" (o normal é 20) e não traz nenhum aviso dentro do painel (sonda 02). Abaixo de 1024 px o painel é tela cheia e o aviso do topo fica inerte e coberto, então não há aviso visível em lugar nenhum.
- **Deveria:** sem os documentos, a pílula não mostra pendência (ou mostra "?"). A Linha do tempo mostra o aviso embutido quando qualquer fonte dela falhou: consultas, evoluções, documentos, exames, escalas ou medicações.
- **Reproduzir:** `failList = ['documentos']` (ou `['agendamentos']`) e abra a pílula correspondente.

#### R8-8 · Paciente inexistente: redireciona calado e prende o botão Voltar (P4)
- **Onde:** `PatientRecordScreen.jsx:131`, com `if (!raw) { navigate('/pacientes'); return; }` (empilha, não usa `replace`).
- **Evidência:** a partir de Clara, `#/pacientes/nao-existe-123` vira `#/pacientes` sem nenhuma mensagem sobre o paciente (o único aviso visível é o banner próprio da lista). `history.back()` volta ao id inexistente, que redireciona de novo. Depois de dois "Voltar" a rota continua `#/pacientes` (sonda 04). Quem chega por um link velho (notificação, mensagem, outra unidade) não sabe o que aconteceu e não consegue voltar para onde estava.
- **Deveria:** um estado "Paciente não encontrado" com link para a lista, ou `navigate('/pacientes', { replace: true })` com um aviso.
- **Reproduzir:** abra Clara, troque o hash para um id inexistente e use Voltar duas vezes.

### MENOR

#### R8-9 · GLB com falha ou lento: mensagem que culpa o navegador e nenhuma saída (P1)
- **Evidência:** com o `busto.glb` derrubado (`Fetch.failRequest`), aparece "Não foi possível abrir o modelo 3D **neste navegador**." e não há "Tentar de novo" [C8d]. Com o GLB retido, o palco ainda mostra "Abrindo o modelo 3D" aos 20 s, sem prazo e sem a lista de reserva [C8e]. O que está bom: Enter na lista durante a carga avisa "O modelo 3D ainda está carregando", e os controles ficam desabilitados.
- **Deveria:** separar erro de rede de falta de WebGL, oferecer "Tentar de novo" e, depois de um prazo (por exemplo 15 s), oferecer a lista de reserva.

#### R8-10 · Alvos de toque abaixo de 44 px no celular (P1/P2)
- **Evidência:** a 390 px com toque emulado: "Remarcar" do alerta tem 85×40; os botões de camada, em coluna, têm 40×40 (também a 720 px); o link "Pacientes" da trilha tem 58×21. O guia §8.3 pede ≥ 44 px no celular.
- **Deveria:** 44 px de altura nesses controles quando `pointer: coarse`.

#### R8-11 · Alto contraste forçado: botões de vidro sem contorno (P1)
- **Evidência:** em `forced-colors: active`, `+`, `−`, `3D` e as camadas ligadas medem `border-style: none`. O `.an-glass-btn { border: 0 }` de `anatomy.css:113`, importado depois de `patient-record.css`, anula a regra de `forced-colors` (`patient-record.css:1236`). "Remarcar" dentro da pílula vira texto sem contorno [C17].
- **Deveria:** levar a regra de `forced-colors` dos botões de vidro para `anatomy.css`, ou aumentar a especificidade.

#### R8-12 · Faixa e atalhos abrem o painel, mas o foco não vai ao item e não volta à origem (P4)
- **Evidência:** Enter na cápsula "Retorno em 25/08/2026, Faltou" abre a Linha do tempo com o item destacado (`is-focused`). O foco, porém, vai para a `<section>` do painel. Esc devolve o foco à pílula "Linha do tempo" no topo, e não à cápsula de origem (sonda 05). O mesmo vale para "Ver todas", os cards de escala e as pastas.
- **Deveria:** focar o item destacado (com `tabindex=-1`). Ao fechar, devolver o foco ao gatilho real quando ele não for uma pílula.

#### R8-13 · Carga e nova tentativa sem anúncio (P4)
- **Evidência:** o esqueleto é todo `aria-hidden` (5 blocos) e nenhuma região de status traz texto durante uma leitura de 2,5 s [C15]. "Tentar de novo" no aviso não muda nada durante a nova leitura: 0 mutações em 300 ms, o botão não desabilita e não há `aria-busy`. Se falhar de novo, o aviso fica idêntico e o `role=alert` não é reanunciado (sonda 15).
- **Deveria:** "Carregando prontuário…" em `role=status`. No retry, mostrar estado de espera e, se falhar de novo, dizer isso ("Ainda não foi possível ler medicações").

#### R8-14 · Datas inválidas e instrumento desconhecido viram lixo ou somem (P2/P3)
- **Evidência:**
  - A Linha do tempo abre com o grupo **"Invalid Date"** no topo (`TimelineView.jsx:217`, `new Date(...).toLocaleDateString`), e os itens sem data ficam acima dos mais recentes, porque a ordenação é por texto [C3b].
  - O card de escala elege como "atual" a aplicação de data ilegível ("20/54 · −50 pontos · —"), porque `byInstrument` ordena `aplicadaEm` como texto.
  - Uma escala com `instrumentoId` fora do catálogo conta na pílula ("Escalas 2"), mas o card some (`ScaleCard` retorna `null`).
- **Deveria:** usar o mesmo `parseDate` do `format.js`, mandar sem data para um grupo "Sem data" no fim, ordenar por tempo e mostrar o instrumento desconhecido com o nome gravado.

#### R8-15 · Texto sem quebra sai dos cards (P1/P2)
- **Evidência:**
  - Uma URL realista em Perfil sensorial ("Ver https://www.exemplo-escola-inclusiva.org.br/…/estrategias-para-sala-de-espera-2026.pdf") ultrapassa o `dd`: `scrollWidth` 296 contra 212, cerca de 64 px além da borda do card.
  - Com tokens longos sem espaço, a pílula de alergia do palco vaza por baixo da coluna de escalas (parte da alergia fica encoberta) [C3a]. O nome de medicação corta na borda da janela, e o título de anexo de 300 caracteres corta no painel.
  - O h1 de 80 caracteres quebra bem.
- **Deveria:** `overflow-wrap: anywhere` em valores de `dd`, no texto das pílulas de alerta, no nome de medicação e no título de anexo.

---

## Suspeitas (não confirmadas)

- **S1 · Contraste do link "7 arquivos"** (`.pr-link`, rgb(0,91,184)) a 1440: **4,24:1** no pior 5% do fundo e 4,67:1 na mediana. Pode ser só a granulação da textura do fundo. Os demais textos medidos (visão geral, painel de Escalas, Linha do tempo, Clara e Rafael com estados abertos) passaram de 4,5:1.
- **S2 · Paciente com exclusão lógica** (`excluidoEm`) abre como "Em acompanhamento", com "Emitir documento" disponível e sem aviso. Hoje não há caminho na interface para excluir paciente; o risco aparece se dados migrados ou do servidor trouxerem registros excluídos.
- **S3 · Emitir documento com responsáveis ilegíveis** recebe `guardians = []`, e o documento pode sair sem o responsável. Não exercitei.
- **S4 · Contexto WebGL vazado quando o GLB falha:** depois do fallback ainda existe um `.an-canvas` no DOM, e a cena só é descartada ao desmontar. Não medi o impacto.
- **S5 · "Tentar de novo" duas vezes:** `load()` não cancela a leitura anterior, então uma resposta antiga pode chegar depois da nova e sobrescrevê-la. Visto só no código.

## O que está bom

- **Sem WebGL:** o fallback é completo. Tem a mensagem em `role=status`, 30 estruturas em botões com `aria-expanded` e 44 px, alertas, faixa e crédito [C8a].
- **Falha de leitura por loja:** o aviso no topo nomeia o que faltou e tem "Tentar de novo". As 7 seções com loja própria trocam o conteúdo por "Não foi possível ler…", sem botão de criar. As colunas distinguem consultas, exames, escalas, marcos e medicações; a de medicações inclui "Confirme com o responsável o que o paciente toma antes de prescrever". O paciente ilegível tem tela própria com nova tentativa que funciona.
- **Teclado:**
  - tabindex móvel nas pílulas de seção (setas, Home, End) e na faixa (258 cápsulas, 1 parada de Tab, Home e End funcionam);
  - listbox com `aria-activedescendant`; o popover recebe foco e Esc devolve à lista;
  - o painel recebe foco, e Esc ou × devolvem à pílula;
  - os diálogos prendem o foco e devolvem ao gatilho;
  - o anel de foco é de 2 px azul com halo branco em tudo.
- **Árvore AX:** nenhum controle sem nome; regiões nomeadas; pílula ativa com `aria-current`; gráficos de escala com `role=img` e todos os escores no rótulo; canvas com descrição.
- **Movimento reduzido:** o busto fica parado (0% de pixels mudando em 2,5 s, contra 12,6% sem a preferência) e as transições caem para 1 ms. O tema escuro do sistema não quebra nada: a página continua clara e íntegra.
- **Gravação:** clique duplo protegido em medicação (0 ms entre cliques) e em anexo (1 blob e 1 registro). Na falha, o diálogo fica aberto com os dados. O rascunho de evolução sobrevive a Esc e a clique no fundo.
- **Dados extremos:** 300 consultas renderizam na hora; as 2 datas ilegíveis viram o aviso "2 consultas com data ilegível ficaram de fora"; 6 alergias na faixa grudada a 390 px aparecem inteiras. A 390, 320 e 720 px não há rolagem lateral na página. O único excesso a 320 px é a barra do topo, fora de escopo.

## Capturas

- [C2a] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/02-readfail-agendamentos.png
- [C3a] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/03-extremo-1440.png
- [C3b] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/03-extremo-linha-do-tempo.png
- [C3c] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/03-consent-falha-alerta-crop.png
- [C8a] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/08-sem-webgl.png
- [C8b] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/08-contexto-perdido.png
- [C8c] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/08-contexto-restaurado.png
- [C8d] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/08-glb-falha.png
- [C8e] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/08-glb-lento-20s.png
- [C11a] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/11-320x256.png
- [C11b] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/11-320x256-painel.png
- [C15] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/15-esqueleto.png
- [C17] /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/shots/17-forced-palco.png
- Sondas e adaptador em memória (reexecutáveis): /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/probe.mjs, /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/mem.js, /private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/robustez/fake.js
