# Crítica p11 — Dados clínicos e robustez/acessibilidade

Crítico de contexto limpo, passada 11, 03/11/2026. Julga, não corrige. Tela `#/pacientes/:id`, paciente de verificação Clara (`16df5f04-4169-4ac5-a458-1668c6221ec3`, alergia Dipirona).

## Método

- **Leitura do código**: `PatientRecordScreen.jsx`, `record/*` (AlertPills, AllergyNotice, VisitRail, SectionPanel, ProfileColumn, InsightsColumn, ScaleCard, patientStates, allergyConflict), `anatomy/AnatomyStage.jsx`, `views/MedicationsView.jsx`, trechos de TimelineView, DocumentsView, AttachmentsView, NotesView, `documents/ClinicalDocumentModal.jsx`, `components/Overlay.jsx`, `ErrorBoundary.jsx`, `core/appointments.js`, `core/format.js`, `patient-record.css`. Documentos lidos: `guia.md`, `bar.md`, `PRODUCT.md`, `alergias-tabela-e-fontes.md`.
- **Checagem de alergia em Node**: bateria própria de **259 casos** (negação, ressalva, famílias, marcas, siglas, plurais, acentos, caixa, texto livre, objeto × texto, vazios e malformados) mais 25 sondas avulsas, importando `allergyConflict.js` direto. Script: `<scratchpad>/p11/bateria-alergia.mjs`.
- **Tela**: Chrome headless próprio na porta **9444**, com cópia da base de verificação num perfil do scratchpad (nunca a 9333 nem o perfil do projeto). Depois de entrar, o repositório foi trocado por um **adaptador em memória** (lojas de pacientes, responsáveis, consultas, evoluções, escalas, marcos, medicações, anexos, documentos, consentimentos e modelos; auditoria só em memória e nunca listada). `mode() === 'memoria'` conferido antes de cada cenário e a lista de escritas terminou vazia em todos. Os casos de dado ruim foram montados só na memória.
- **Medição**: varredura de rolagem com `elementFromPoint` (alergia visível e não coberta) em 40+ tamanhos de janela, de 320×256 a 1920×1080; teclado real por CDP (`Input.dispatchKeyEvent`: Tab, Shift+Tab, setas, Home/End, Enter, Esc); árvore de acessibilidade (`Accessibility.getFullAXTree`); WebGL bloqueado (`getContext('webgl*') → null`) e contexto perdido (`WEBGL_lose_context`); `prefers-reduced-motion` emulado, com hash de quadros do canvas (fundo do shell congelado para isolar o 3D); alvos de toque e contraste pelo script `medir-prontuario.js` do projeto.
- **Zoom**: simulado pela janela em px CSS (200% de 1280×800 = 640×400; 400% de 1280×1024 = 320×256).

## O que NÃO consegui testar

- Leitor de tela real (NVDA, VoiceOver): só a árvore de acessibilidade do Chrome.
- Toque e pinça reais no canvas; só mouse e teclado por CDP.
- Aparelho sem GPU de verdade: o "sem WebGL" foi simulado.
- **Diálogo "Confirme sua identidade"**: aberto a partir de "Assinar e emitir" (provedor ICP-Brasil, sem PIN) e fechado com Esc. Senha não digitada: emissão, assinatura e gravação **não testadas**. Nenhum outro botão que grava foi clicado.
- Zoom real do navegador e zoom só de texto; `forced-colors`; impressão; modo Supabase; Firefox e Safari.
- Contraste do texto das pílulas de vidro sobre o plexo 3D: a medida é só pelo DOM.
- Falha ao decifrar uma miniatura de exame.

## Veredito por peça

| Peça | Veredito | Motivo principal |
|---|---|---|
| P1 Palco anatômico e alertas | **REPROVA** | B2: a pílula diz "Nenhuma registrada" para uma ficha que afirma alergia. B3: a 200 e 400% de zoom a faixa da alergia corta alergias para fora da tela. G1: a alergia some no fim da rolagem com janelas de 521 a 575 px de altura. |
| P2 Colunas | **REPROVA** | B1: a coluna "Medicações em uso" mostra Topiramato sem aviso para "Alergia a topiramato (rash)". G2: um diagnóstico malformado derruba o prontuário inteiro, alergia junto. |
| P3 Seções e modais | **REPROVA** | B1: a prescrição de "Topiramato 25 mg" sai sem aviso e com "Assinar e emitir" liberado. G2: uma view que quebra dentro do painel derruba a tela inteira. G3: a 400% os diálogos clínicos perdem a alergia. A pilha de diálogos e o foco funcionam. |
| P4 Faixa de consultas e estados | **APROVA** | Falhas de leitura nunca viram "vazio". O id inexistente é dito. Datas ilegíveis saem com aviso. 300 consultas abrem em janela de 40. Sobram só achados MENORES (M8–M10). |

Contagem: **3 BLOQUEIA · 7 GRAVE · 14 MENOR**.

---

## BLOQUEIA

### B1. A camada "texto literal" só casa o texto INTEIRO da alergia: qualquer palavra a mais desliga o aviso para o próprio fármaco
- **Peças**: P2 (coluna de medicações) e P3 (prescrição, medicação, evolução).
- **Reproduzir**: na ficha, alergia `Alergia a topiramato (rash)`. Medicação registrada: Topiramato (Topamax). Na Visão geral, a coluna mostra "Topiramato (Topamax) 25 mg à noite" **sem** "Alergia declarada…". Em Emitir documento › Prescrição, o item "Topiramato 25 mg" não gera `.doc-allergy-hit`, e "Assinar e emitir" fica habilitado.
- **Evidência**: `allergyConflict.js:136-152`. `termsFor` usa o texto inteiro como termo (`new Set(af)`) e só o quebra em `+ / &` e ` e | com | mais `. "alergia a topiramato (rash)" nunca está dentro de "topiramato 25 mg". Na bateria, falham: `Alergia a topiramato`, `Topiramato (rash)`, `Topiramato - rash cutâneo`, `Levetiracetam: irritabilidade grave` e `Reação a risperidona`, todos contra o próprio fármaco. `Alergia a levetiracetam` × `{nome: 'Keppra', principioAtivo: 'Levetiracetam'}` também não avisa. O defeito atinge todo fármaco fora das famílias: levetiracetam, valproato, topiramato, clobazam, risperidona e metilfenidato, o formulário diário da neuropediatria. A prescrição também não mostra a frase "Sem correspondência automática…" (ver M1): nada diz ao médico que a checagem não reconheceu o item. Captura: `<scratchpad>/p11/shots/s18-alergia-frase-topiramato.png`.
- **Correção**: tirar do texto da alergia parênteses, pontuação e prefixos ("alergia a", "reação a") e casar cada palavra significativa (5 letras ou mais, fora do enchimento e de sintomas) contra o medicamento.

### B2. A "negação pura" engole afirmações: o enchimento inclui verbos e nomes que AFIRMAM alergia
- **Peças**: P1 (pílula), e por consequência todos os avisos e modais.
- **Reproduzir**: na ficha, uma pílula `Sem alergia medicamentosa; alergia alimentar`. O palco mostra **"Alergias · Nenhuma registrada"** (neutra). O mesmo vale para `Nega alergias; tem reação adversa a medicamento`, `Nega alergia medicamentosa e tem alergia alimentar`, `Nega alergia medicamentosa. Possui alergia alimentar.`, `Sem alergia a medicamentos, apresenta alergia a alimentos` e `Nenhuma alergia medicamentosa, relata alergia ambiental` (7 casos na bateria, em lista e em texto solto).
- **Evidência**: `allergyConflict.js:88-104`. O `FILLER` contém `tem, tinha, possui, refere, relata, apresenta, ha, reacao, adversa, medicamento, alimentar, ambiental`. Com um negador em qualquer posição e o resto todo no enchimento, o item inteiro some. Na lista da ficha, `;` e `.` dentro de uma pílula não separam itens (`allergyTexts` só divide o texto solto). Isso contraria a decisão do dono ("negação só vale se o texto inteiro for negação mais enchimento"): o texto afirma uma alergia. Captura: `<scratchpad>/p11/shots/s07-alergia-negacao-afirma.png`.
- **Correção**: dividir cada item em orações (`; . ,`, " e ", "mas") e só tratar como negação quando toda oração tem negador. Tirar do enchimento os verbos afirmativos (tem, possui, apresenta, refere, relata, há).

### B3. Com janela baixa (zoom de 200 a 400%), a faixa da alergia é uma linha sem quebra cortada pela borda: da 3ª alergia em diante, nada aparece
- **Peças**: P1 (faixa da visão geral) e P3 (cabeçalho do painel).
- **Reproduzir**: 5 alergias (`Dipirona (anafilaxia em 2023)`, `Amoxicilina — urticária generalizada`, `Látex`, `Carbamazepina (DRESS)`, `Proteína do leite de vaca`).
  - Janela 320×256 (400%): a única alergia da visão geral mostra `Dipirona (anafilaxia em 2023) · Amoxicilin`. Látex, Carbamazepina e Proteína do leite **não aparecem em nenhuma posição de rolagem**. Não há reticência nem como abrir.
  - Janela 640×400 (200% de um notebook 1280×800): some `Proteína do leite de vaca`.
  - No painel a 320×256, a reticência corta até a primeira: `Dipirona (anafilaxia em 20…`.
- **Evidência**: `patient-record.css:1268-1271` (`flex-wrap: nowrap`, `max-width: none`, `white-space: nowrap`) e `:1277-1280` (painel). O `li` mede 842 px dentro de `#conteudo` com `overflow-x: hidden`. Abaixo de 1180 px de largura, a pílula do palco fica `display: none` (`:1060`) e a da barra fica `display: none` com até 520 px de altura (`:1258`), então a faixa é a única cópia. Medida: 42 de 128 caracteres visíveis a 320 px e 94 de 128 a 640 px. Capturas: `<scratchpad>/p11/shots/s03-320x256-y400.png`, `s04-320x256-medicacoes.png`, `s25-640x400.png`.
- **Correção**: a faixa quebra linha (`flex-wrap: wrap`) e nunca usa reticência em alergia. Se faltar altura, mostrar "Alergias (5): …" com as demais em segunda linha, nunca escondidas.

---

## GRAVE

### G1. A alergia sai de vista em janelas específicas: no fim da rolagem com 521 a 575 px de altura, e no primeiro quadro a 320×568
- **Peça**: P1.
- **Reproduzir**: (a) janela 1440×540 (ou qualquer largura ≥ 1180 com altura entre 521 e ~575): rolar até o fim. O palco grudado é solto pelo fim da grade e sobe para baixo da barra de seções, e nenhuma alergia fica visível nos últimos ~40 px. (b) Janela 320×568: ao abrir, a alergia da barra está em y = 511–606, sob o botão do dock no pé.
- **Evidência**: varredura em 35 combinações (`s14-alturas`). Falham todas as larguras 1180, 1280, 1366, 1440 e 1920 nas alturas 521 e 560. A 576 px passa. `elementFromPoint` no centro da pílula devolve `.pr-pill`. A faixa mínima (`max-height: 520px`) não cobre essa banda. Capturas: `<scratchpad>/p11/shots/s15-1440x540-fim.png`, `s03-320x568-y0.png`.
- **Correção**: estender a regra da faixa mínima até ~600 px de altura, ou mostrar a alergia na barra de seções sempre que o topo do palco estiver sob ela. No celular, pôr a alergia antes do cabeçalho.

### G2. Um registro malformado derruba o prontuário inteiro, alergia junto (sem fronteira de erro no cabeçalho nem no painel)
- **Peças**: P2 (cabeçalho e coluna) e P3 (painel).
- **Reproduzir**:
  - (a) `clinico.diagnosticos = 'G40.9'` (texto): a tela vira "Esta tela falhou ao carregar" (`diagnosticos.slice(...).map is not a function`).
  - (b) `diagnosticos = [{ cid: 'G40.9', descricao: 'Epilepsia' }]`: o mesmo ("Objects are not valid as a React child").
  - (c) Um anexo legado sem `realizadoEm` e sem `criadoEm`: a visão geral aguenta (a pasta usa `?? ''`), mas abrir **Exames** derruba a tela inteira (`AttachmentsView.jsx:210`, `undefined.localeCompare`). `DocumentsView.jsx:44` tem o mesmo padrão.
  - Depois da queda, o Voltar do navegador não recupera, porque a fronteira da rota é chaveada por `pathname` (`App.jsx:169`) e `?secao=` não muda o pathname. Só "Tentar de novo" recupera.
- **Evidência**: `PatientRecordScreen.jsx:377-388` (chips do cabeçalho fora de qualquer `ErrorBoundary`). `SectionPanel.jsx:91-95` e `PatientRecordScreen.jsx:466-490` (as views dentro do painel sem fronteira). O próprio código promete que "um registro ruim nunca derruba a barra, a alergia e o resto". Captura: `<scratchpad>/p11/shots/s19-crash-exames.png`.
- **Correção**: pôr um `ErrorBoundary` em volta do corpo do painel, com fallback `RegionFailed` que mantém o cabeçalho com a alergia. Normalizar os diagnósticos (`Array.isArray`, código em `d.codigo ?? d.cid ?? String(d)`). Usar `?? ''` nas duas ordenações.

### G3. A 400% (320×256) os diálogos clínicos perdem a alergia
- **Peça**: P3.
- **Reproduzir**: janela 320×256.
  - **Emitir documento**: a faixa "Alergias: Dipirona" rola junto com o corpo e fica fora de vista em 6 das 7 posições de rolagem.
  - **Nova evolução clínica**: cabeçalho e rodapé deixam 40 px de corpo. A faixa vem depois do seletor de consulta e nunca aparece inteira: fica coberta pelo rodapé e cortada em "Alergias: Dipi…".
  - O modal de medicação passa.
- **Evidência**: no modal de documento a `.pr-rx-allergy` (sticky) fica dentro de `.doc-notice`, que não gruda no `modal__body` rolável (`ClinicalDocumentModal.jsx:240`, `patient-record.css:853-860`). Na evolução, a faixa não é o primeiro filho do corpo. Capturas: `<scratchpad>/p11/shots/s05-320x256.png`, `s24-evolucao-320.png`.
- **Correção**: com até 520 px de altura, pôr a faixa de alergia no cabeçalho do diálogo (fora do corpo rolável) e esconder a descrição do título.

### G4. Grafias comuns de sulfametoxazol + trimetoprima quebram a decisão "dois sentidos"
- **Peças**: P2 e P3 (checagem).
- **Reproduzir** (alergia × medicamento, nenhum avisa):
  - `Sulfametoxazol-trimetoprima` (hífen), `SMX/TMP`, `SMX+TMP` ou `TMP-SMX` × `Trimetoprima`.
  - `SMZ-TMP` × `Bactrim`.
  - `SMZ-TMP` × `Sulfametoxazol + trimetoprima`. É o mesmo fármaco: SMZ é a sigla usual no Brasil.
- **Evidência**: `allergyConflict.js:64` (só `smxtmp` e `smx tmp` em `COMBINED`), `:141` (a divisão da combinação não inclui `-`) e `:46` (`smz` fora da família).
- **Correção**: normalizar `- / +` como separadores de combinação, incluir `smz` na família sulfa e `smztmp`, `tmpsmx`, `tmpsmz` no gatilho da trimetoprima.

### G5. A reação cruzada só olha o texto digitado, não a família: alergia à MARCA perde a cruzada que o genérico tem
- **Peças**: P2 e P3 (checagem).
- **Reproduzir**: `Amoxil`, `Augmentin`, `Benzetacil` ou `Amox` × `Cefalexina`/`Cefadroxila`: sem aviso. `Amoxicilina` × `Cefalexina` avisa.
- **Evidência**: `allergyConflict.js:148-150`. `CLASSES` (e `COMBINED`) testam `cls.when` com `has(af, t)` sobre o texto da alergia, não sobre `terms`, que já tem a família expandida.
- **Correção**: testar `cls.when` contra os termos já expandidos da família.

### G6. Cobertura das famílias: classes, sulfonamidas antibióticas e marcas comuns de fora
- **Peças**: P2 e P3 (checagem).
- **Reproduzir** (nenhum avisa):
  - **Classe digitada na alergia**: `Antiepilépticos` × Carbamazepina; `Beta lactâmicos` (com espaço) × Amoxicilina; `Cefalosporinas` × Cefpodoxima, Cefalotina e Cefprozil.
  - **Alergia `Sulfa`**: × Sulfacetamida (colírio), Sulfadoxina + pirimetamina, Sulfassalazina, Infectrin e Assepium (marcas de SMX + TMP).
  - **Alergia `AAS`**: × Flanax, Toragesic, Tandrilax, Torsilax, Feldene, Tilatil, Doril, Engov, Sonrisal, Alka-Seltzer, Ecasil 81.
  - **Alergia `AINEs`**: × Nisulid, Arcoxia.
  - **Alergia `Penicilina`**: × Cefamox (cefadroxila).
  - **Alergia `Dipirona`**: × Benegrip e Maxalgina (fora "até conferir").
  - Composição das marcas por conhecimento geral: conferir em bula antes de incluir.
- **Evidência**: listas em `allergyConflict.js:35-80`. `WHOLE` só aceita "sulfa" como palavra inteira (`:127-132`).
- **Correção**: regra de prefixo `sulfa(?!t|it)` para sulfonamidas antibióticas, `cef[a-z]+` para a classe, sinônimos `antiepilept*` e `beta lactam*`, e marcas acrescentadas depois da conferência em bula.

### G7. Fármacos da neuropediatria fora das famílias: sal, forma e marca não se reconhecem
- **Peças**: P2 e P3 (checagem).
- **Reproduzir** (nenhum avisa):
  - `Ácido valproico` × `Valproato de sódio` e `Depakene`.
  - `Metilfenidato` × `Ritalina` e `Concerta`.
  - `Risperidona` × `Risperdal`.
  - `Clobazam` × `Frisium`.
  - Na prescrição o campo é um só ("Princípio ativo ou procedimento"): a marca digitada ali passa.
- **Evidência**: só o texto literal, sem tabela de marcas nem raiz de sal (`valpro*`) fora das famílias.
- **Correção**: uma tabela curta de marca para genérico do formulário da clínica (anticonvulsivantes, psicoestimulantes, antipsicóticos) e uma raiz para os sais (`valpro`).

---

## MENOR

- **M1** (P3). A prescrição não mostra "Sem correspondência automática…" quando um item não bate. A `AllergyNotice` do modal vem sem `typed` (`PatientRecordScreen.jsx:509`, `DocumentsView.jsx:150`). É justo onde a frase de política mais importa. Correção: passar os itens como `typed`.
- **M2** (P1). `Não informado` e `Nenhuma informada` contam como negação e viram "Nenhuma registrada". "Nega alergias" (perguntado e negado) e ficha vazia (nunca perguntado) também mostram o mesmo texto. Correção: tirar `informado/informada` do enchimento e distinguir "Nega alergias (registrado)" de "Nenhuma registrada".
- **M3** (P1). `alergias: false` (booleano) vira pílula vermelha "Alergias · false" (`allergyConflict.js:116`). Correção: tratar `false` como lista vazia.
- **M4** (P1). Texto solto `Dipirona (urticária, 2023)` vira duas alergias: "Dipirona (urticária" e "2023)". Correção: não dividir em vírgula dentro de parênteses.
- **M5** (P1/P3). Objeto com chave fora da lista (`{ medicamento: 'Dipirona' }`, `{ principioAtivo: … }`) aparece como "Alergia em formato ilegível", sem o nome e sem checagem. Correção: mostrar os valores de texto do objeto e incluir `medicamento`, `farmaco` e `principioAtivo` nas chaves.
- **M6** (P3). Um espaço de largura zero (texto colado de PDF) anula a busca: `Dipi​rona` × `Dipirona`. Correção: remover `​-‍﻿` em `plain`.
- **M7** (P2). `responsaveis` como texto (legado) mostra "Nenhum cadastrado", uma afirmação falsa. Um responsável órfão (id sem registro) deixa um "Tentar de novo" que nunca resolve. Correção: aceitar texto como lista de um id, e dizer "responsável vinculado não encontrado" sem oferecer nova tentativa.
- **M8** (P4). Datas ruins aparecem como fato:
  - `1900-01-01` → "em acompanhamento desde 01/01/1900 (há 126 anos)", antes do nascimento.
  - `2026-02-30` aceito como 02/03.
  - Data sem hora (`2026-11-03`) aparece como "Atrasado · Hoje 12:00" na pílula e "02 nov · Atrasado" na cápsula: dias diferentes para a mesma consulta (`VisitRail.jsx:111` usa `new Date()` e `format.toDate` ancora ao meio-dia).
  - Status desconhecido aparece cru ("14 out xyz").
  - Correção: usar `toDate`/`timeOf` na faixa, recusar datas antes do nascimento e datas impossíveis, e traduzir status desconhecido para "Status não reconhecido".
- **M9** (P4). Teclado na faixa:
  - Ao carregar o último bloco de "Anteriores", o botão desmonta e o foco cai no `body`.
  - Abrir uma consulta pela cápsula leva o foco ao painel, não ao item (destacado, mas são 267 itens até ele).
  - Esc devolve o foco à pílula, não à cápsula de origem.
  - Correção: mover o foco para a primeira cápsula nova e para o item focado.
- **M10** (P4). Sem consultas (ou com falha de leitura delas), a faixa some do palco sem estado vazio nem "Agendar". Correção: uma cápsula "Nenhuma consulta · Agendar" (ou "Consultas não lidas").
- **M11** (P2). Anexo de origem fora de `FOLDER_GROUPS` conta em "8 arquivos" e na pílula "Exames 8", mas não aparece em nenhuma pasta (`ProfileColumn.jsx:19-27`). Correção: cair em "Outros".
- **M12** (P2). Escala com `aplicadaEm` ilegível desenha um ponto com `cx="NaN%"` (`ScaleCard.jsx:139-147`). Correção: filtrar a aplicação sem instante válido do gráfico.
- **M13** (P1/P2). Acessibilidade:
  - `li role="status"` dentro de `ul` quebra a semântica de lista (`AlertPills.jsx:101`).
  - Há duas a quatro cópias da alergia como região viva (anúncio repetido ao editar a ficha).
  - Nomes ambíguos: "Abrir" ×2 (Medicações e Marcos) e "Remarcar" sem objeto.
  - O botão do card de escala tem nome de 165 a 186 caracteres (o `svg role="img"` entra no nome).
  - Correção: o `role="status"` vai para um `span` interno, só uma cópia viva, e `aria-label` curto nos botões.
- **M14** (P1). A pílula de seção sem contagem é igual para "zero" e para "não foi possível ler". Com a tela rolada, o aviso do topo já saiu. Correção: marcar a pílula com um sinal de leitura falha.

---

## Bateria de alergia (259 casos)

58 falhas reais e 1 expectativa minha descartada ("Orientada a evitar AINEs" com alergia a AAS: mencionar a classe não é prescrever).

| Grupo | Casos que falham | Achado |
|---|---|---|
| Negação que engole afirmação | 7 | B2 |
| Frase ou anotação em fármaco fora das famílias | 5 | B1 |
| Sal, marca e forma (valproato, metilfenidato, risperidona, clobazam) | 6 | G7 |
| Grafias de SMX-TMP e trimetoprima | 6 | G4 |
| Marca de penicilina sem cruzada para cefalosporina | 4 | G5 |
| Marcas de AAS, AINE, dipirona e cefadroxila ausentes | 17 | G6 |
| Sulfonamidas antibióticas e marcas de SMX-TMP ausentes | 5 | G6 |
| Classes digitadas ("Antiepilépticos", "Beta lactâmicos") | 2 | G6 |
| "Não informado" e "Nenhuma informada" | 2 | M2 |
| `false`, vírgula em parênteses, objeto com chave desconhecida, largura zero | 4 | M3–M6 |

O que passou (201 casos): todas as negações puras (Nega alergias, NKDA, N/A, "-", vazio, "Alergias: nenhuma"); "Nega alergia a dipirona" aparece e avisa (decisão do dono); "Nega alergias, mas teve urticária com amoxicilina" e "Não sabe informar" aparecem; dipirona e 13 marcas nos dois sentidos, com "pirazolonas"; dipirona não cruza com AINE nem paracetamol; COX-1 entre si (20 casos), com A.A.S. e caixa misturada; classe AINE (6 grafias); penicilinas (14 marcas e formas, Fenoximetilpenicilina por substring); penicilina para cefalexina, cefadroxila e cefaclor, e não para ceftriaxona e cefazolina; cefalosporinas entre si; Betalactâmicos e Beta-lactâmicos; sulfa sem sulfato ferroso, sulfato de magnésio, furosemida e topiramato; Bactrim, cotrimoxazol e Co-trimoxazol para trimetoprima, e o inverso, nas grafias com `+`; os 14 anticonvulsivantes aromáticos, sem levetiracetam e valproato; acentos e caixa; espaço inseparável; alergia em texto, em objeto `nome` e em lista; medicamento vazio e nulo. Sondas avulsas: falsos positivos inofensivos ("Anador PRT", que é paracetamol, avisa dipirona; "não usar AAS" nas observações avisa).

## O que verifiquei e está certo

- **Falha de leitura nunca vira "vazio"**: em consultas, medicações, escalas, marcos, exames, evoluções, documentos, consentimentos e responsáveis, o aviso no topo diz o que não foi lido e oferece "Tentar de novo". A pílula de alerta diz "Consultas não lidas" e "Consentimento não lido", e a próxima consulta some em vez de afirmar "sem retorno". O painel mostra "Não foi possível ler…" sem botão de criar. Falha do paciente na primeira carga mostra a tela de erro com nova tentativa. Na recarga, os dados ficam e o aviso diz "Ainda não…".
- **Id inexistente, id malformado (`%E0%A4%A`) e id de 5.000 caracteres**: "Paciente não encontrado". `?secao=` vazio, duplicado ou inválido não quebra.
- **Datas ilegíveis** (`abc`, `null`, `''` e número): saem com "4 consultas com data ilegível ficaram de fora." e o resto segue de pé.
- **300 consultas**: a faixa monta 64 cápsulas em janela, "Anteriores +236" carrega de 40 em 40, há uma única parada de Tab e as setas e Home/End funcionam. A trilha mostra "226 de 257 realizadas · 31 faltas".
- **Cinco ou mais estados**: a alergia fica inteira e os demais viram "4 estados do paciente", com `aria-expanded`.
- **Pilha de diálogos**:
  - Modal sobre o painel: Esc 1 fecha o modal e o foco volta a "Registrar medicação"; Esc 2 fecha o painel e o foco volta à pílula "Medicações".
  - Emissão: "Confirme sua identidade" sobre a emissão, Esc fecha só a identidade, Esc 2 fecha a emissão e o foco volta a "Emitir documento". O rascunho sobrevive.
  - Popover com "Remarcar" por cima: Esc fecha só o modal.
  - As 8 seções abrem pelo teclado e fecham por Esc ou pelo Voltar, com foco na pílula e palco e coluna direita `inert`.
- **Palco**:
  - Hover acende estruturas com pino, clique abre o popover dentro da janela sem cobrir os alertas, e Esc devolve o foco à lista.
  - A lista em `listbox` com setas, e "Todas as camadas estão ocultas…" com tudo desligado.
  - Sem WebGL: lista de 30 estruturas com a função, mais alertas, faixa e crédito.
  - Contexto perdido: "O modelo 3D parou de responder" e "Recarregar modelo" recupera.
  - Com `prefers-reduced-motion`, o canvas fica parado (5 quadros idênticos contra 5 diferentes sem a preferência) e o painel entra sem animação.
- **Alvos**: todos acima de 24 px. Os abaixo de 40 são o link "Pacientes" do breadcrumb (área de toque estendida por `::after`) e, no painel, botões do palco encolhidos pela escala de 0,98 que ficam inertes.
- **Rolagem lateral**: nenhuma no contêiner de rolagem em 14 tamanhos de janela. O `overflow-x: hidden` é justamente o que esconde a faixa do B3.
- **Prescrição com conflito real** (Novalgina × Dipirona): aviso `role="alert"`, "Assinar e emitir" desabilitado até "Revisei". Na coluna e no painel, "Alergia declarada a Dipirona: confirme antes de manter".

## Fora do escopo, observado

- `#/pacientes` (lista) cai inteira quando uma consulta tem `inicio` numérico (`core/appointments.js:166`, `trailingNoShows`, `b.inicio.localeCompare is not a function`).
- O fundo animado do shell continua se mexendo com `prefers-reduced-motion` e aparece através do palco transparente.

Capturas e scripts deste relatório ficam em `<scratchpad>/p11/`, temporários: `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/b66e8cad-c129-42d0-8ba7-78e62caa1819/scratchpad/p11/`.
