# Crítica P7 — Dados e função (lente `dados`)

Crítico de contexto limpo, passada 7 do prontuário (`#/pacientes/:id`). Régua: `guia.md` §0–§1 e `PRODUCT.md`. Data da medição: 23/10/2026, 11:08–11:53 (America/Sao_Paulo), base local de verificação. Tudo o que gravaria passou por um adaptador em memória (`repo.useAdapter`) que registra a chamada e a descarta. Scripts, saídas e capturas: `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p7/dados/` (abaixo, `scratch/`).

> **Aviso sobre a base.** Durante a medição, **outra sessão** do Chromium compartilhado gravou 3 consentimentos reais na paciente Clara (auditoria `CONSENT_GIVEN` às 14:15:57Z, 14:16:01Z e 14:16:36Z, sessões `5078a9…` e `65e476…`: "Tratamento clínico" duas vezes e "Comunicação por e-mail"). Não foram meus scripts: eles só clicaram em pílulas, ou em botões de escrita com o adaptador em memória ativo. Por isso a pílula Consentimentos de Clara passou de 2 para 3 no meio da varredura. Quem coordena precisa limpar esses 3 registros (ids `728cad0a…`, `cdd79a9a…`, `63185336…`). O mesmo achado também está em D6.

## Vereditos

| Peça | Veredito | Motivo principal |
|---|---|---|
| P1 Palco anatômico e pílulas do palco | **REPROVA** | Uma alergia negativa ou vazia vira alerta vermelho (D3). As pílulas de estado não acompanham o relógio (D4). |
| P2 Colunas | **REPROVA** | Uma escala sem escore mostra "null" e plota um ponto em 0 (D9). O conflito alergia × medicação não pega sinônimo, marca nem classe (D8). Prescrição assinada e card de medicações se contradizem (D12). |
| P3 Navegação, seções e modais | **REPROVA** | O adendo é impossível (D1). A prescrição não checa alergia (D2). Duplo clique grava em dobro (D5). Consentimento é gravado com um clique (D6). Suspender não pede motivo (D7). Anexo aceita título vazio (D10). |
| P4 Faixa de consultas e estados | **REPROVA** | Uma consulta que já passou continua "Próxima · agora", sem virar Atrasado (D4). Remarcar com duplo clique grava duas vezes (D5). |

## Varredura dos 42 pacientes (base real)

Os scripts foram `scratch/s05-sweep.mjs` (visão geral), `scratch/s07-sections.mjs` e `scratch/s12-evol.mjs` (as 8 seções). A comparação é de `scratch/compare.py`, e o resultado está em `scratch/compare-out.json`. Para cada paciente, comparei o que a tela mostra com o que as regras do domínio dão a partir dos registros:

- nome;
- idade na barra e no card;
- nascimento;
- "desde" e "há N semanas";
- status;
- CID na barra e no card;
- alergias na barra e no palco, com a cor;
- faixa: data, estado e tipo de cada cápsula;
- trilha: "N de M realizadas" ou "N consultas", traços por estado e subtítulo de faltas e sem desfecho;
- alerta "sem desfecho": texto, data e hora;
- alerta "sem consentimento para teleconsulta";
- as 9 pílulas com contagem;
- responsável: nome, parentesco e telefone;
- próxima consulta;
- texto técnico (`undefined`, `null`, `NaN`, `[object`, `Invalid Date`);
- nas seções: subtítulo e número de itens da Linha do tempo, ordem cronológica, rótulos de estado, Evoluções, Medicações, Exames, Documentos, Escalas, Marcos e Consentimentos.

| Verificação | Pacientes conferidos | Divergem | Em quê |
|---|---|---|---|
| Nome, nascimento, idade (barra = card), status, CID, diagnósticos | 42 | 0 | — |
| Alergia na barra e no palco (texto e cor) | 42 | 0 | — |
| Faixa de consultas (data, estado, tipo) | 42 | 0 | — |
| Trilha (valor, traços, faltas, sem desfecho) | 42 | 0 | — |
| Alerta "sem desfecho" (barra, palco, painel) | 42 | 0 | — |
| "Desde (há N semanas)" | 42 | 1 | Henrique: "há 18 dias" (regra de menos de 3 semanas; não é erro) |
| Alerta "sem consentimento para teleconsulta" | 42 | 4 | Vicente, Samuel e Théo têm teleconsulta faltada: sem aviso, o que está certo. **Benício**: teleconsulta de 15/10 sem desfecho e sem consentimento, e nenhum aviso (D14). |
| Pílulas: Evoluções, Escalas, Marcos, Medicações, Exames, Consentimentos (sem "tratamento clínico") | 42 | 0 | — |
| Pílula Documentos ("N a emitir" = laudo concluído sem documento) | 42 | 0 | Felipe mostra "1 a emitir" e esconde que já existe 1 documento (D23) |
| Responsável | 42 | 0 | — |
| Linha do tempo: total = itens; ordem decrescente | 42 | 6 | Conta a consulta cancelada (João Pedro, Samuel, Isabela, Beatriz, Melissa, Arthur), mas a faixa não. Regra coerente; só observação. |
| Evoluções (subtítulo = registros) | 42 | 0 | — |
| Texto técnico na tela | 42 × 9 telas | 0 | — |

**Resumo:** na base real, os números batem entre todos os lugares em 42 de 42 pacientes. A única divergência de regra é a de Benício (D14). Os defeitos aparecem nas **ações** e nos **estados que a base não tem**. A base é rala: só Clara tem escalas, marcos, medicações e anexos, e nenhum paciente tem consulta futura. Esses estados vieram de 18 pacientes sintéticos em memória (`scratch/scen.js`, saída em `scratch/scen.json`, capturas em `scratch/shots/scen-*.png`).

**O que funcionou e foi conferido:**
- Alergia no topo de todos os modais clínicos: remarcar, suspender, adendo, emitir documento, prévia de exame, registrar medicação e registrar escala.
- Cinco alertas ao mesmo tempo, todos na barra e no palco.
- "Sem desfecho (2)" mostrando o mais recente.
- Virada do dia certa: 22/10 às 23:59 = sem desfecho; 23/10 às 00:01 = atrasado; 23/10 às 23:59 = futura de hoje.
- Idades de 29/02, 19a 11m e aniversário hoje.
- Nome social com o nome de registro.
- 3 responsáveis.
- Status Alta e Inativo.
- Consentimento revogado com teleconsulta futura gera aviso.
- Só medicações suspensas: frase honesta.
- Check-in velho vira "sem desfecho".
- Validações do remarcar: passado, vazio, fora do horário, Esc e "Manter horário" sem gravar.
- Depois de remarcar, a tela se atualiza: a pílula some e a próxima aparece.
- A revogação de consentimento atualiza o alerta e a contagem.
- Clique na cápsula abre a Linha do tempo rolada até o item, com destaque.
- Pasta ↗ filtra por origem.
- Folha da pasta abre a prévia; anexo sem arquivo dá aviso honesto.
- Formato e tamanho de upload validados, inclusive pelo conteúdo do arquivo.
- Faixa de escore da escala validada.
- Filtros de Marcos e da Linha do tempo corretos.
- O "voltar" do navegador fecha o painel.

## Achados confirmados (ordem de severidade)

### D1 · BLOQUEIA · P3 — "Adicionar adendo" nunca grava em evolução assinada
- **Onde:** `?secao=evolucoes`, 1440×900, qualquer paciente (todas as 95 evoluções da base estão assinadas e travadas).
- **Evidência:**
  - Com o texto preenchido, "Registrar adendo" mostra o toast "Este registro está travado e não pode ser alterado." e não grava nada (`scratch/s18-adendo.mjs`, saída `after.toast`; captura `scratch/shots/C-adendo-depois.png`).
  - O repositório recusa `update` em registro com `travada` antes de chegar ao adaptador, então o adaptador real falharia do mesmo jeito.
- **Deveria:** o adendo é o único caminho legal para corrigir uma evolução assinada. Ele precisa ser gravado sem alterar o original, como o próprio modal promete ("O adendo é datado e fica visível abaixo dela").
- **Reproduzir:** Miguel → Evoluções → "Adicionar adendo" → digitar → "Registrar adendo".

### D2 · BLOQUEIA · P3 — A prescrição não checa alergia
- **Onde:** "Emitir documento" → Prescrição médica, paciente Clara (alérgica a dipirona), 1440×900.
- **Evidência:**
  - Com "Dipirona", "dipirona", "DIPIRONA", "Dipirona sódica 500 mg", "Novalgina" ou "Metamizol" no princípio ativo, nenhum aviso aparece por item. Só fica a faixa fixa "Alergias: Dipirona" no topo (`scratch/s22-doc2.mjs`; `scratch/shots/E-emitir-dipirona.png`).
  - A prévia mostra "1. Dipirona" pronta para "Assinar e emitir".
  - O card de medicações e o modal "Registrar medicação" detectam o mesmo texto. A prescrição, que é o ponto de maior risco, não detecta.
- **Deveria:** aviso no item conflitante, idealmente com confirmação explícita antes de assinar.
- **Reproduzir:** Clara → Emitir documento → digitar "Dipirona" no item 1.

### D3 · GRAVE · P1/P2 — Alergia negativa ou vazia vira alerta vermelho
- **Onde:** visão geral, barra e palco, 1440×900; pacientes sintéticos `fake-d0` a `fake-d5`.
- **Evidência:**
  - `alergias` = "Nega alergias", "nenhuma", "Sem alergias conhecidas", "NKDA", "-" ou "" geram todos o alerta `pr-alert--danger` "Alergias …".
  - Com "" o alerta fica vermelho, só com a palavra "Alergias" e nada mais (`scratch/scen.json`; `scratch/shots/scen-fake-d2.png`).
  - Só a lista vazia vira o neutro "Nenhuma registrada".
- **Deveria:** reconhecer negação e vazio como "sem alergia registrada" (neutro), e nunca mostrar alerta vermelho sem substância.
- **Reproduzir:** adaptador em memória com `clinico.alergias: ['']` ou `['Nega alergias']`.

### D4 · GRAVE · P4/P1 — Os estados de tempo não se atualizam com a página aberta
- **Onde:** visão geral, 1440×900, `fake-t` com consulta de hoje às 11:50 e sem chegada.
- **Evidência:** às 11:49:26, 11:51:56 e 11:53:36 a tela mostra o mesmo texto: "Próxima 23/10/2026 11:50 Retorno · agora". A faixa continua "Confirmado" e o alerta "Atrasado" não aparece (`scratch/s37-tempo.mjs`; `scratch/shots/L-relogio.png`). O mesmo vale para "há N dias", "hoje" e para a passagem de futura para sem desfecho.
- **Deveria:** recalcular os estados derivados do relógio (por minuto, ou ao voltar o foco à aba).
- **Reproduzir:** consulta sintética para daqui a 1 minuto, abrir e esperar 3 minutos.

### D5 · GRAVE · P3/P4 — Duplo clique grava duas vezes
Evidências, todas com dois cliques seguidos no botão de confirmar:
- **Remarcar:** 2 `put` no agendamento, 2 `UPDATE` na auditoria e 2 toasts (`scratch/s16-remarcar2.mjs`, `okCalls`).
- **Registrar consentimento:** 2 registros `comunicacao_email` e 2 `CONSENT_GIVEN` (`scratch/s20-cons2.mjs`).
- **Salvar anexo:** 2 `putBlob`, 2 anexos e 2 `CREATE`; a contagem vai para "9 arquivos" (`scratch/s25f.mjs`).
- **Registrar medicação:** 2 registros "Dipirona" iguais, ambos "em uso" (`scratch/s26b.mjs`).
- **Deveria:** desabilitar o botão enquanto grava, e tornar a criação idempotente.

### D6 · GRAVE · P3 — Consentimento é gravado com um clique, sem confirmação
- **Onde:** `?secao=consentimentos`.
- **Evidência:**
  - "Registrar consentimento" e "Registrar nova informação" gravam na hora: o consentimento com `concedidoEm` = agora e o primeiro responsável, sem diálogo e sem registrar como a família consentiu (`scratch/s19-cons.mjs`, `scratch/s20-cons2.mjs`).
  - "Revogar" pede confirmação. A assimetria é o problema.
  - Prova de uso real: as 3 gravações acidentais de outra sessão na base de verificação (ver o aviso no topo), uma delas "Tratamento clínico" duplicado.
- **Deveria:** confirmar quem consentiu, por qual meio e a versão do texto, com um passo explícito.

### D7 · GRAVE · P3 — Suspender medicação não pede motivo
- **Onde:** Medicações → "—" (Suspender).
- **Evidência:** com o motivo vazio, "Suspender" grava `suspensaEm` = agora e `motivoSuspensao: null`. Não há como informar a data da suspensão. A auditoria registra só "Registro de Clara Macedo Farias" (`scratch/s17-acoes1.mjs`, `B_empty`; `scratch/shots/B-suspender.png`).
- **Deveria:** motivo obrigatório, data editável, e a auditoria dizendo qual medicação foi suspensa.

### D8 · GRAVE · P2/P3 — O conflito alergia × medicação só pega a substring literal
- **Onde:** card "Medicações em uso", seção Medicações e "Registrar medicação"; `fake-c` (alergias Dipirona, Penicilina, Sulfa, ibuprofeno).
- **Evidência:**
  - Detecta "DIPIRONA MONOIDRATADA", "Ibuprofeno", "Penicilina G benzatina" e "Sulfametoxazol" (este por sorte de substring).
  - **Não detecta** "Metamizol sódico" (que é dipirona), "Novalgina" (marca da dipirona) nem "Amoxicilina" (penicilina) (`scratch/scen.json`, `fake-c.meds`; `scratch/s26-med.mjs`, `nov`).
  - Na base real ficam expostos Heitor (alergia a penicilina) e Cecília (alergia a amoxicilina).
- **Deveria:** sinônimos e classes no mínimo para os pares comuns (dipirona/metamizol/marcas; penicilinas/amoxicilina/ampicilina; AINEs).
- **Sem falso positivo:** paracetamol e "Nega alergias" com dipirona não geraram conflito.

### D9 · GRAVE · P2 — Escala sem escore mostra "null" e inventa um ponto
- **Onde:** coluna direita, card de escala, `fake-h` (M-CHAT-R/F com `escore: null`).
- **Evidência:** número grande "null/20" e o ponto do gráfico desenhado em 0 (`scratch/shots/scen-fake-h.png`, card M-CHAT à esquerda; `scratch/scen.json`, `bad: ['null']`).
- **Deveria:** mostrar "—" ou "Sem escore registrado" e não plotar o ponto.

### D10 · GRAVE · P3 — Anexo aceita título vazio
- **Onde:** Exames → Anexar arquivo → "Identificar o anexo".
- **Evidência:** com o TÍTULO\* vazio ou só com espaços, "Salvar anexo" grava `titulo: ""` e mostra "Anexo salvo e cifrado.". A lista ganha uma linha sem nome, só com "Exame de imagem (RM, TC, US) · 23/10/2026 · 1,0 KB" (`scratch/s25e.mjs`, `scratch/s25f.mjs`; `scratch/shots/G-titulo-vazio.png`).
- **Deveria:** bloquear com uma mensagem, como o asterisco promete.

### D11 · GRAVE · P1–P4 — Cada abertura do prontuário grava duas leituras na auditoria
- **Evidência:**
  - Auditoria real: pares de `READ pacientes` "Prontuário de Clara Macedo Farias" no mesmo milissegundo (14:18:34.472Z, ids `5165d47d` e `fb3027c9`; `scratch/s11-audit.mjs`).
  - No adaptador em memória: exatamente 2 entradas por paciente aberto, nos 18 sintéticos (`scratch/scen.json`, `calls`).
- **Deveria:** uma leitura por abertura. O registro legal (CFM/LGPD) fica inflado e "quantas vezes foi lido" deixa de ser verdade.

### D12 · GRAVE · P2 — Prescrição assinada não aparece em "Medicações em uso"
- **Evidência:**
  - Cecília tem prescrição assinada em 26/09 (Levetiracetam 3 mL 12/12 h e ácido fólico), mas o card diz "Nenhuma medicação registrada. Confirme com o responsável antes de prescrever." (`scratch/dump-all.json`, `DOCUMENTS` × `MEDICATIONS`).
  - João Pedro tem laudo "em uso regular de levetiracetam" e nenhuma medicação.
  - A frase de segurança é literalmente verdadeira, mas o prontuário sabe mais do que o card diz.
- **Deveria:** o card citar a última prescrição emitida, ou oferecer registrá-la como medicação.

### D13 · MENOR · P2 — Idade de recém-nascido com um dia a menos
- **Evidência:**
  - Nascido em 22/10 aparece como "0 dias", em 21/10 como "1 dia", em 20/10 como "2 dias", em 24/09 como "28 dias".
  - Nascido hoje aparece como "—", que parece dado ausente.
  - A virada de mês está certa: 23/09 dá "1 mês" (`scratch/s36-idades.mjs`).
- **Deveria:** 1, 2, 3 e 29 dias; nascido hoje, "0 dias" ou "recém-nascido".

### D14 · MENOR · P1/P4 — Teleconsulta sem desfecho e sem consentimento não gera aviso
- **Evidência:** o aviso só aparece com teleconsulta realizada ou futura. Benício (real) tem teleconsulta de 15/10 "sem desfecho" e nenhum consentimento de teleconsulta, e mesmo assim não há aviso (`scratch/compare.py`).

### D15 · MENOR · P3 — "Fechar" na emissão de documento descarta o que foi digitado sem perguntar
- **Evidência:** com o item "Dipirona" digitado, "Fechar" fecha direto, sem diálogo (`scratch/s22-doc2.mjs`, `closeDlg: []`). Não conferi se o rascunho volta ao reabrir. No adendo o rascunho volta, o que é bom.

### D16 · MENOR · P4 — "Outro motivo" na remarcação não abre campo de texto
- **Evidência:** a auditoria grava só "(Outro motivo)" (`scratch/s16-remarcar2.mjs`, `outroCalls`).

### D17 · MENOR · P3 — Remoção de anexo e auditoria genéricas
- **Evidência:** a remoção confirma, mas não pede motivo, e a auditoria grava "Removido pelo usuário". Suspensão e criação gravam "Registro de <paciente>", sem dizer o quê (`scratch/s24-exames2.mjs`).

### D18 · MENOR · P2/P3 — Anexo sem arquivo exibido como se existisse
- **Evidência:** o "Parecer fonoaudiológico" de Clara tem `blobId: null`. A lista mostra "117,2 KB" e a pasta mostra "1 arquivo" com folha; só ao clicar aparece "Arquivo indisponível" (`scratch/s23-exames.mjs`).

### D19 · MENOR · P3 — Registro de escala
- **Evidência:** aceita escore fracionado "17,5" no SNAP-IV, que é soma inteira. Com valor fora da faixa (99, −3), a prévia ainda mostra uma interpretação ("Sintomas acentuados" / "Dentro do esperado") antes do erro (`scratch/s27b.mjs`).

### D20 · MENOR · P4 — Faixa com cápsula futura cortada
- **Evidência:** com 5 alertas, a cápsula "28 out 2026 · Confirmad…" fica cortada sob os controles + − 3D, a 1440×900 (`scratch/shots/scen-fake-a.png`, cerca de 780,820).

### D21 · MENOR · P2/P4 — Textos
- "0 de 1 realizadas" deveria ser "realizada".
- O rótulo do rodapé alterna entre "Agendar retorno" e "Sem retorno agendado — agendar retorno" conforme haja alerta.
- No cabeçalho das Escalas, "Abrir ↗" e "Ver todas ↗" variam.
- (`scratch/sweep-resumo.txt`, `scratch/scen.json`)

### D22 · MENOR · P3 — Detalhes de função
- Upload de PDF "eeg-…" já vem com o tipo "Exame de imagem".
- A aba de domínio dos Marcos diz "Os 37 marcos sem registro" contando todos os domínios.
- A Linha do tempo lista "Início de <medicação>" em Tudo, mas não tem filtro de Medicações.
- (`scratch/s25b.mjs`, `scratch/s28-filtros.mjs`)

### D23 · MENOR · P3 — Pílula Documentos esconde o que existe
- **Evidência:** Felipe tem 1 documento assinado e a pílula mostra só "1 a emitir" (`scratch/compare-out.json`).

### D24 · MENOR · P2 — "Agendar retorno" sugere um horário que já passou
- **Evidência:** leva a `#/agenda` com Clara selecionada (bom), mas sugere 23/10 às 09:00, já passado às 11:40 (`scratch/s34-links2.mjs`; `scratch/shots/K-agendar.png`).

### D25 · MENOR (observação) · P3 — A folha impressa da prescrição não traz as alergias
- **Evidência:** `scratch/shots/E-emitir-dipirona.png`. A alergia aparece no modal, mas não na folha que sai da clínica.

## Suspeitas (não confirmadas)

- **Somente leitura (`can.write = false`):** não deu para exercitar. Pelo `rbac.levelFor`, só `doctor` tem `patients.record` (3); `reception`, `finance` e `admin` têm 0. Tentei injetar a troca de papel antes da carga com `Page.addScriptToEvaluateOnNewDocument`, mas o adaptador não subiu a tempo. **Como confirmar:** login com um usuário de papel `reception` na base de verificação e abrir `#/pacientes/:id`; deve aparecer "sem acesso", sem dado clínico.
- **Check-in com status `confirmado` e `checkInEm` de hoje:** não aparece "Na recepção" (`fake-i`, faixa "Confirmado"). Depende de a agenda gravar `status: 'aguardando'` junto do check-in. **Como confirmar:** fazer check-in na Agenda com o adaptador em memória e ler o `put`.
- **Base legal:** os consentimentos de WhatsApp, e-mail e teleconsulta na base têm `baseLegal: 'tutela_saude'`, mas a tela mostra "Consentimento do responsável (art. 14, § 1º)". A tela ignora o campo gravado: se o dado estiver certo, a tela mente; se estiver errado (semente), a tela corrige em silêncio. **Como confirmar:** um registro com base legal diferente da padrão da finalidade.
- **Domínio dos marcos:** os 4 marcos de Clara têm `dominio: 'motor_grosso'` gravado, mas a tela mostra o domínio do catálogo (Motor fino, Linguagem, Cognitivo), o que provavelmente é o certo. É erro da semente. **Como confirmar:** registrar um marco pela tela e ler o `put`.
- **Baixar exame:** a prévia só tem "Fechar" e a lista só tem abrir e remover, então não há como baixar o arquivo. **Como confirmar:** checar se a versão anterior da tela oferecia o download (guia §0.2).
- **Remarcar sem checar dia e conflito:** a sugestão padrão é sábado (24/10) e é aceita, e não testei horário ocupado por outro paciente na mesma sala. **Como confirmar:** criar uma consulta sintética de outro paciente no mesmo horário e remarcar para ele.
- **Documento em rascunho ou aguardando assinatura** (`fake-h`, "Documentos 2"): não inspecionei o painel. **Como confirmar:** `#/pacientes/fake-h?secao=documentos` com `scratch/scen.js`.

## Contagem

| Severidade | Achados |
|---|---|
| BLOQUEIA | 2 (D1, D2) |
| GRAVE | 10 (D3–D12) |
| MENOR | 13 (D13–D25) |
| Suspeitas | 7 |
