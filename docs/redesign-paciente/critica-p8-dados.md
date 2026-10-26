# Crítica P8 · Dados e acabamento · Prontuário do paciente

- **Data:** 2026-10-26 (relógio da máquina: segunda, ~18h, America/Sao_Paulo)
- **Lente:** objetivo do produto (guia §0, §1, §4, §7; `bar.md`; `PRODUCT.md`). Verdade clínica, alergia, estados por data e hora, rótulos, números, acabamento que atrapalha a leitura de um dado.
- **Método:** `node .claude/design-loop/cdp.mjs shot|eval` no Chromium headless (porta 9333, base de verificação). Li o DOM, medi o SVG dos cards e conferi cada número contra os registros do repositório. Usei Clara (`16df5f04…`) e Rafael (`4579401a…`) **só para leitura**. Todas as gravações foram feitas num paciente criado para esta crítica, **"Teste Crítico P8 Dados"** (`a1bf23c1-4724-46b8-a3b5-ba00cb39afbf`, nascido em 26/10/2024, alergias "Dipirona" e "AAS"). As falhas de leitura e de gravação foram simuladas com `useAdapter` sobre o módulo que o app carrega (`/admin/data/repository.js?t=…`), sem tocar no Supabase.
- **Larguras:** 1440×900, 1280×800 e 390×844. Capturas em `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/cbcf76be-cefe-42e3-a291-5af0466638a7/scratchpad/p8/dados/shots/`.
- **O que NÃO consegui testar:**
  - **Criar o paciente pelo formulário.** Em `#/pacientes` › Novo paciente › Cadastrar paciente, a gravação falha com o aviso "Registro não encontrado." (duas tentativas). Pelo código, `newGuardian()` já nasce com `id`, então o submit chama `repo.update` num responsável que não existe. O formulário está fora do escopo, então isso não entra no veredito, mas me obrigou a criar o paciente de teste direto pelo repositório.
  - Ficaram sem teste: emissão de documento assinado (pede PIN e provedor), registro de marco, estado sem WebGL, papel sem permissão de escrita, 1920 px e impressão.
  - Hover do mouse no 3D: usei a lista de estruturas pelo teclado (`role=option`).
- **Resíduo de teste:** o paciente de teste ficou com medicações (Novalgina em uso, Aspirina suspensa), 1 evolução assinada com adendo, 3 aplicações de M-CHAT (uma com data de 20/12/2026), 1 anexo com data de 01/12/2026, consentimento de teleconsulta registrado e depois revogado, retorno remarcado para 05/11 e uma teleconsulta de hoje às 17:39 em "Confirmado".

## Vereditos

| Peça | Veredito | Motivo |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | O alerta "Sem consentimento para teleconsulta" some exatamente quando a teleconsulta está acontecendo (D8-3). |
| P2 Colunas | **REPROVA** | O card de medicação não avisa da Aspirina em paciente alérgico a AAS (D8-1). O gráfico das escalas pinta a faixa normal com a cor de risco (D8-5). Uma aplicação com data futura vira o "último escore" (D8-6). |
| P3 Seções e modais | **REPROVA** | Prescrição, registro de medicação e adendo aceitam Aspirina e Dorflex sem aviso (D8-1). A evolução não diz de qual consulta é (D8-2). A suspensão de medicação some da Linha do tempo (D8-4). Datas futuras são aceitas (D8-6). O nome original do arquivo fica gravado (D8-7). |
| P4 Faixa de consultas e estados | **REPROVA** | A faixa, o "Atrasado", o "Sem desfecho" e a remarcação estão corretos. Mas o estado de consentimento da teleconsulta depende de data e hora e falha justo no horário da consulta (D8-3). |

## Achados confirmados

### BLOQUEIA

**D8-1 · O aviso de alergia não reconhece "AAS" nem combinações que contêm dipirona**
- **Onde:** `allergyConflict.js`, usado em P3 (Registrar medicação, item da prescrição em Emitir documento, plano da evolução, adendo) e em P2 (card "Medicações em uso").
- **Evidência:** paciente de teste com alergias `["Dipirona", "AAS"]`.
  - **Registrar medicação:** "Aspirina", "Ácido acetilsalicílico", "Lisador", "Buscopan Composto" e "Dorflex" mostram só a faixa genérica "Alergias: Dipirona · AAS", sem a linha "O que foi digitado contém…". "Novalgina", "Metamizol" e "AAS 100 mg" disparam o aviso.
  - **Prescrição:** o item "Aspirina" e o item "Ácido acetilsalicílico" passam sem aviso. "Novalgina" mostra "Alergia declarada: Dipirona. Um item desta prescrição é, contém ou pertence à mesma família."
  - **Depois de registrar:** na Visão geral, Novalgina ganha o traço vermelho e "Alergia declarada a Dipirona: confirme antes de manter". **Aspirina aparece sem nenhuma marca** (captura `teste-overview-med.png`, `teste-med-lista.png`).
  - **Adendo:** "trocar por Dorflex se dor" é salvo sem aviso.
  - **Causa:** a família `['aspirina', 'acido acetilsalicilico', 'acetilsalicilico']` não tem "aas". A família da dipirona não tem as marcas combinadas.
- **Por que bloqueia:** o sistema avisa em Novalgina e se cala em Aspirina. Para quem confia no aviso, esse silêncio parece um "liberado". "AAS" é a forma como a alergia costuma ser escrita no prontuário brasileiro. É a "receita que ignora alergia" desta lente.
- **Deveria:** "aas" entra na família do ácido acetilsalicílico. As marcas de uso corrente que contêm dipirona (Dorflex, Lisador, Buscopan Composto, Neosaldina já está) entram na família da dipirona. Enquanto a tabela for parcial, o aviso genérico deveria dizer que a checagem cobre só nomes conhecidos, em vez de um silêncio que parece liberação.
- **Reproduzir:** paciente com alergia "AAS" › Medicações › Registrar medicação › princípio ativo "Aspirina" › nenhum aviso específico › Registrar › Visão geral sem marca.

### GRAVE

**D8-2 · Evolução assinada sem a data da consulta, e "referente à consulta das 09:00" sem dia**
- **Onde:** P3, Evoluções (`NotesView.jsx:63`) e Linha do tempo (`TimelineView.jsx:171`).
- **Evidência:**
  - A evolução foi vinculada ao atendimento de **26/09/2026 09:00** e assinada hoje.
  - **Evoluções** mostra só "Evolução assinada · 26/10/2026 18:04 · agora". A data da consulta não aparece em lugar nenhum.
  - **Linha do tempo** põe a evolução em "Outubro de 2026" com "26/10/2026 18:04 · há 1 minuto · referente à consulta das 09:00". O texto lê como uma consulta de hoje às 09:00, que não existe.
  - A lista e a faixa ordenam por `assinadaEm`.
- **Deveria:** a data clínica da evolução é a da consulta: "Consulta de 26/09/2026 09:00 · assinada em 26/10/2026 18:04". A linha "referente à" sempre leva o dia, e a Linha do tempo agrupa pela data da consulta.
- **Reproduzir:** Evoluções › Nova evolução › vincular a uma consulta de outro dia › Assinar e travar › ver Evoluções e Linha do tempo.

**D8-3 · "Sem consentimento para teleconsulta" some quando a teleconsulta atrasa ou começa**
- **Onde:** P1 (pílulas do palco) e P4 (estados), `patientStates.js` (`teleNext` usa `isUpcoming`, `teleDone` só conta `concluido`).
- **Evidência:**
  - O paciente de teste tem o consentimento de teleconsulta **revogado** e uma **teleconsulta hoje às 17:39 em "Confirmado"**. Às ~18:15, as pílulas mostram só "Alergias Dipirona · AAS" e "Atrasado · Hoje 17:39, sem chegada · Teleconsulta · Remarcar". O alerta de consentimento não aparece (captura `teste-atrasado.png`).
  - `isUpcoming` deixa de valer 15 min depois do início. Status `aguardando` e `em_atendimento` também não entram.
  - Com o horário ainda futuro, a regra vale (Rafael mostra o alerta para as já realizadas).
- **Deveria:** o alerta vale para toda teleconsulta de hoje em aberto (atrasada, na recepção ou em atendimento), que é quando o médico vai abrir a chamada.
- **Reproduzir:** paciente sem consentimento de teleconsulta e com uma teleconsulta "Confirmado" que começou há mais de 15 min hoje › Visão geral.

**D8-4 · A suspensão de medicação não aparece na Linha do tempo**
- **Onde:** P3, Linha do tempo (`TimelineView.jsx:85`: só existe o evento "Início de …").
- **Evidência:** Aspirina foi suspensa hoje com o motivo "Alergia a AAS". Medicações › Histórico mostra "Aspirina 1 cp ao dia 26/10/2026 — 26/10/2026 · Alergia a AAS". A Linha do tempo mostra só "Início de Aspirina · 1 cp ao dia · 26/10/2026 · hoje", sem a suspensão e sem marca de que o remédio saiu de uso.
- **Deveria:** um evento "Suspensão de Aspirina · motivo" na data da suspensão. Ou, no mínimo, o item de início com "suspensa em dd/mm".
- **Reproduzir:** suspender qualquer medicação › Linha do tempo.

**D8-5 · A faixa do gráfico de escala é o intervalo NORMAL pintado com a cor do risco**
- **Onde:** P2, card de escala (`ScaleCard.jsx`, `DotPlot`; `.pr-scale--mid { --pr-band: var(--pr-band-mid) }`).
- **Evidência (SVG medido):**
  - **SNAP-IV de Clara:** a faixa desenhada vai de 0 a 14, que no catálogo é "Dentro do esperado" (tom `success`). O preenchimento é `rgba(241, 179, 28, 0.14)`, âmbar.
  - **Vanderbilt:** a faixa é 0–12, "Critérios não atendidos", também em âmbar.
  - **M-CHAT do paciente de teste:** o escore atual 5 é "Risco moderado" e a faixa 0–3 ("Baixo risco") aparece em âmbar.
  - Sem rótulo, o médico lê "zona âmbar = atenção". É justamente o contrário.
- **Deveria:** a faixa de referência tem a cor do que ela é (o esperado, neutro ou verde, como na referência). O risco atual fica no traço do título e na cor do ponto.
- **Reproduzir:** Visão geral de Clara › cards SNAP-IV e Vanderbilt.

**D8-6 · Aplicação de escala e exame com data futura são aceitos e viram "o mais recente"**
- **Onde:** P3 (Registrar aplicação, Identificar o anexo), refletido em P2.
- **Evidência:**
  - **Escala:** M-CHAT gravado com `aplicadaEm: "2026-12-20"` sem aviso. Na Visão geral, o card mostra **5/20 "em 7 semanas"** e "Risco moderado" como resultado atual (captura `teste-escala-card.png`). O escore 25 (acima do máximo 20) foi recusado, então a validação existe, mas não olha a data.
  - **Anexo:** gravado com `realizadoEm: "2026-12-01"`. A pasta "Imagem" mostra **01/12/2026** como data do exame mais recente, e a Linha do tempo diz "01/12/2026 · em 5 semanas".
  - A suspensão de medicação recusa data futura ("A data da suspensão não pode ser futura."), então a regra existe em outro diálogo.
- **Deveria:** data de aplicação e de realização com `max` = hoje e recusa como na suspensão.
- **Reproduzir:** Escalas › Registrar aplicação › M-CHAT, escore 5, data 20/12/2026 › Registrar › Visão geral.

**D8-7 · O anexo grava o nome original do arquivo, ao contrário do que diz o PRODUCT.md**
- **Onde:** P3, Exames › anexar.
- **Evidência:** o PRODUCT.md diz "Anexos são cifrados e nunca guardam o nome original". O registro criado tem `nomeArquivo: "eeg-teste.png"`, e o título vem preenchido com o nome do arquivo ("eeg-teste") na tela "Identificar o anexo". Nomes como "joao_silva_eeg.pdf" ficam em claro no registro.
- **Deveria:** não persistir `nomeArquivo` (ou guardar só a extensão) e não usar o nome do arquivo como título padrão.
- **Reproduzir:** Exames › Anexar arquivo › escolher um PNG › Salvar anexo › ler o registro em `ATTACHMENTS`.

### MENOR

**D8-8 · "º" sai como "o": "§ 1o", "2o ano"**
- **Onde:** Consentimentos ("Consentimento do responsável (art. 14, § 1º)") e Perfil sensorial › Escola ("2º ano").
- **Evidência:** o DOM tem "§ 1º" e "2º ano", mas a Urbanist desenha o ordinal como um "o" de corpo inteiro: "§ 1o", "2o ano" (`zoom-ordinal.png`, `zoom-ordinal2.png`). "§ 1o" se confunde com "§ 10".
- **Deveria:** fonte de reserva para U+00BA, ou `font-feature-settings: "ordn"` / `<sup>`.

**D8-9 · Nome comercial gravado e nunca mostrado**
- **Onde:** P2 e P3, Medicações.
- **Evidência:** Clara tem `nome: "Keppra"` e `nome: "Ritalina"`. A tela mostra só "Levetiracetam" e "Metilfenidato" (`InsightsColumn.jsx:125`, `MedicationsView.jsx:61`).
- **Deveria:** "Levetiracetam (Keppra)". A família costuma reconhecer o remédio pela marca.

**D8-10 · A Linha do tempo agrupa no mês errado o que tem data pura no dia 1**
- **Onde:** P3, `TimelineView.jsx:217` (`new Date('2026-12-01')` vira 30/11 21:00 local).
- **Evidência:** o exame de "01/12/2026" aparece sob "Novembro de 2026".
- **Deveria:** agrupar datas `AAAA-MM-DD` sem conversão de fuso.

**D8-11 · Texto de revogação genérico para teleconsulta**
- **Onde:** P3, Consentimentos › Revogar (teleconsulta).
- **Evidência:** o diálogo diz "o sistema deixa de enviar mensagens por esse canal", mas teleconsulta não é canal de mensagem.
- **Deveria:** texto por finalidade ("as próximas teleconsultas passam a exigir novo consentimento").

**D8-12 · "Relacionado ao paciente" no popover sugere uma localização que ninguém mediu**
- **Onde:** P1, popover.
- **Evidência:**
  - "Lobo temporal, Esquerdo" e "Hipocampo, Esquerdo" mostram "Relacionado ao paciente · Neurofisiológicos 3 · Exames de imagem 3", e cada estrutura cortical repete os mesmos 3 EEG.
  - "Crânio" não mostra "TC de crânio".
  - Diante da família, "3 exames relacionados ao lobo temporal esquerdo" lê como achado no lobo temporal esquerdo.
- **Deveria:** "Exames do paciente que costumam avaliar esta região", ou só o link por tipo, sem a contagem como se fosse da estrutura.

**D8-13 · Pequenos rótulos que atrapalham a leitura**
- **Botão de confirmação vermelho:** "Registrar" em vermelho no diálogo de concessão de consentimento, que não é ação destrutiva.
- **"Sem chegada" em teleconsulta:** "Atrasado · Hoje 17:39, sem chegada · Teleconsulta". Teleconsulta não tem chegada.
- **Seção com três nomes:** "Exames" (pílula), "Exames e anexos" (coluna) e "Exames e pareceres" (painel).
- **Vínculo sem tipo:** a opção de vínculo da evolução mostra "26/09/2026 09:00" sem o tipo de consulta.
- **Adendo sem autor:** "Adendo · 26/10/2026 18:06".
- **Quebra no celular:** a 390 px, "(há 5 / semanas)" quebra dentro do parêntese no cabeçalho.
- **Recusa e confusão:** o aviso de alergia diz "O que foi digitado contém Dipirona" quando foi digitado "Novalgina". Seria melhor "Novalgina é dipirona".

## Suspeitas (não confirmadas como erro de tela)

- **"Nega alergias" vira "Nenhuma registrada".** "Nega alergias" (perguntado, negativo) e o campo vazio (nunca perguntado) caem no mesmo "Nenhuma registrada" (`declaredAllergies`). A regex `sem (reação…)` também descartaria uma entrada como "Sem reação grave; urticária com amoxicilina". Não reproduzi na tela.
- **Base legal exibida ≠ base gravada.** O consentimento de WhatsApp de Clara tem `baseLegal: "tutela_saude"` gravado, e a tela mostra "Consentimento do responsável (art. 14, § 1º)". A tela parece exibir o catálogo, não o registro. Pode ser só seed inconsistente.
- **Assinatura sem confirmação.** "Assinar e travar" assina em um clique, mesmo com aviso de alergia na tela. O cabeçalho do diálogo avisa que é irreversível.
- **Faixas por soma.** As faixas de SNAP-IV e Vanderbilt são definidas por soma no catálogo (`scales.js`). Esses instrumentos costumam ser pontuados por contagem de itens. É uma questão clínica para o dono, não de tela.

## O que está bom

- **Idade e datas relativas conferem.** "12a 7m" (23/03/2014), "2 anos" no aniversário, "há 3 semanas", "há 10 meses" e "Desde 22/07/2026 · há 3 meses" batem com os registros.
- **Falha de leitura é dita como falha.** Faixa "Não foi possível ler escalas, medicações e exames…". O card de medicação diz "Confirme com o responsável o que o paciente toma antes de prescrever", nunca "nenhuma medicação". A falha de gravação mantém o diálogo aberto com o que foi digitado.
- **A alergia não some.** Ela aparece no palco, no topo de cada painel, em todo diálogo que grava e na faixa do celular a 390 px.
- **Estados coerentes.** "Sem desfecho", "Atrasado" e "Faltou" são os mesmos nas pílulas, na faixa e na trilha. Remarcar recusa horário passado ("Escolha um horário que ainda não passou.") e atualiza a pílula "Próxima 05/11/2026 14:00 Retorno · em 10 dias" e a faixa.
- **Estados vazios honestos.** "Nenhuma medicação registrada. Confirme com o responsável antes de prescrever." e "Marco sem registro não conta como atraso."
