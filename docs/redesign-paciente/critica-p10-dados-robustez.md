# Crítica p10 · dados clínicos e robustez/acessibilidade do prontuário

**Data:** 28/10/2026 · **Tela:** `#/pacientes/<id>` · **Paciente de verificação:** Clara (16df5f04…, alergia declarada: Dipirona)
**Crítico:** contexto limpo. Não li críticas anteriores, registros de conflito, design-loop.md, HANDOFF.md, git nem o cofre. Não alterei código.

## Método

1. **Regra de alergia em Node.** Importei `allergyConflict.js` (ESM, função pura) e rodei uma bateria de 170 casos: 155 com resultado esperado, 4 informativos (decisão clínica em aberto), 5 de forma de dado e 6 de texto livre. Cobri negações puras, negações com ressalva, as famílias, falsos positivos, siglas, plurais, acentos e caixa. Depois rodei mais 10 casos de borda. **Resultado: 109 de 155 passaram e 46 falharam.** Script: `scratchpad/allergy-battery.mjs`.
2. **Tela com adaptador em memória.** `cdp.mjs eval` faz o login de verificação e roda `hold.js`. Esse script copia a base para a memória da aba uma única vez e chama `useAdapter(mem)`. A partir daí, todas as leituras e gravações ficam na memória: há atraso e falha injetáveis por loja e por operação, `get`/`list`/`put` são registrados, e nada vai ao IndexedDB nem ao Supabase. Confirmei `mode() === 'memoria'`. Uma segunda sonda CDP (`probe.mjs`) se conecta à mesma aba e envia teclas reais (`Input.dispatchKeyEvent`), cliques reais, lê a árvore AX, emula viewport, `prefers-reduced-motion` e `forced-colors`, e faz capturas. Rodei os planos A a H (`plan-*.mjs`; as saídas estão em `out-*.json` no scratchpad).
3. Contraste medido de duas formas: pelo valor calculado (cor sobre o fundo composto) e por pixel, em captura 3x.

## O que NÃO consegui testar

- **Emissão real de documento ou prescrição e clique duplo em "Emitir/Assinar".** Toda emissão passa pela confirmação de identidade com senha, e eu não digitei senha. Só testei até o diálogo de identidade. A trava `lock` existe no código, mas não foi exercida até a gravação.
- **Assinatura de evolução pelo `SignDialog`.** Pelo mesmo motivo, só verifiquei o conteúdo do diálogo.
- **Leitor de tela real** (NVDA/VoiceOver). Usei só a árvore AX do Chromium.
- **Modo servidor (Supabase/RLS).** A suspeita do item G8 sobre RLS vem do código, não foi reproduzida.
- **Contraste sobre o vidro com o 3D atrás.** Medi por pixel só alguns textos pequenos.
- **Pré-visualização de anexos** (AllergyNotice no preview). Não abri.

## Vereditos

| Peça | Veredito | Por quê (achados) |
|---|---|---|
| P1 Palco anatômico e alertas | **REPROVA** | B1 (a pílula diz "Nenhuma registrada" para alergia real), B2 (a 400% e a ≤520 px de altura a alergia sai da vista na visão geral) |
| P2 Colunas (perfil, pastas, escalas, medicações, marcos) | **REPROVA** | G4 (medicação com o alérgeno na posologia não avisa), G7 (alergia gravada como texto derruba a tela inteira), M7 |
| P3 Seções e modais | **REPROVA** | G1 (confirmação de alergia herdada), G5 (assinar rascunho sem alergia), G6 (Esc no diálogo aninhado descarta o documento), G8 ("responsável não cadastrado" falso), M1, M3, M4 |
| P4 Faixa de consultas e estados | **APROVA** | 300 consultas, tabindex móvel, setas e Enter funcionam; data ilegível fica de fora com aviso; falha de leitura vira "Consultas não lidas". Restam MENOR M5 e M7 |

**Contagem:** BLOQUEIA 2 · GRAVE 8 · MENOR 14. Há também 1 achado fora do escopo julgado, registrado por segurança.

---

## BLOQUEIA

### B1. Negação seguida de alergia real: a alergia some de toda a tela
- **Onde:** `declaredAllergies` (`allergyConflict.js`, regex `NEGATION` + `SEGUNDA_ORACAO`). O efeito chega ao palco, à barra de seções, ao cabeçalho do painel, ao AllergyNotice de todos os modais, à prescrição e ao conflito das medicações.
- **Evidência medida:** `SEGUNDA_ORACAO` só mantém a segunda oração quando ela contém alerg/reag/reac/sensibil/intoleran. Com nome de fármaco, sintoma ("urticária", "anafilaxia", "broncoespasmo", "edema") ou outra pontuação, a alergia é descartada. Na bateria, **12 casos foram engolidos**, entre eles:
  - "Nega alergias. Urticária com dipirona"
  - "Nega alergias, teve urticária com dipirona"
  - "Nega alergia medicamentosa. Dipirona causa urticária"
  - "Não tem alergias. Não tolera dipirona"
  - "Sem alergias conhecidas (rash com amoxicilina)"
  - "Nega alergias e tem anafilaxia com penicilina"
  - "Nega alergias medicamentosas, refere broncoespasmo com AAS"
  - "Sem alergias fora a dipirona"
  - "Nega alergia. Anafilaxia a penicilina em 2020"
  - "Nenhuma - dipirona deu edema de glote"
  - "Nega alergia medicamentosa / alérgica a dipirona"
  - "Sem alergias medicamentosas. Teve anafilaxia com amendoim"

  **Na tela (memória):** com `['Nega alergias. Urticária com dipirona']`, o palco e o painel mostram "Alergias · Nenhuma registrada". O modal "Registrar medicação" mostra "Nenhuma alergia registrada. Confirme…", e digitar "Novalgina" não gera aviso. **Fluxo real de ponta a ponta:** cadastrei um paciente novo em memória com essa alergia (digitada e confirmada com Enter). O registro foi gravado com o texto, e o prontuário abriu com "Nenhuma registrada".
- **O que deveria acontecer:** na dúvida, mostrar. Uma negação só deveria descartar o texto quando o texto não cita nenhum termo das famílias ou classes nem descreve reação. Uma negação ambígua aparece como alergia (custa um clique).
- **Reproduzir:** `node scratchpad/allergy-battery.mjs`, ou, em memória, `p.clinico.alergias = ['Nega alergias. Urticária com dipirona']` e abrir a rota.

### B2. Zoom de 400% (320×256) e janelas com até 520 px de altura: a alergia sai da vista na visão geral
- **Onde:** `patient-record.css`, `@media (max-height: 520px) { .pr-pills { position: static; } }`. Abaixo de 1024 px a alergia mora em `.pr-pills__alerts`, e a barra deixa de grudar.
- **Evidência medida:** varri a rolagem e conferi a pílula de alergia na viewport com `elementFromPoint`:
  - 320×256: visível em **1 de 14** posições (só em scrollTop 506). Capturas `e5-400-top.png` e `e5-400-meio.png` mostram o nome e "Sem desfecho", sem a alergia.
  - 853×480 (150% de 1280×720): **5 de 35**.
  - 1440×900, 1280×720 e 1024×768: 100%.
  - Dentro do painel de seção a 320×256: 13 de 13 (o cabeçalho segue grudado). O painel está correto; a visão geral não.
- **O que deveria acontecer:** a mesma solução do painel. Uma linha mínima e grudada só com a alergia, também na visão geral (decisão do dono: alergia sempre visível; critério explícito desta passada).
- **Reproduzir:** `Emulation.setDeviceMetricsOverride 320×256`, abrir a visão geral e rolar `.shell__content`.

## GRAVE

### G1. A confirmação "Revisei a alergia" vale para um conflito novo
- **Onde:** `ClinicalDocumentModal.jsx`. `ackAllergy` só é zerado quando `itemConflicts.length` volta a 0.
- **Evidência:** com alergias ['Dipirona','Penicilina'], o item 1 "Dipirona" deixa Emitir desabilitado. Marquei a confirmação e Emitir ficou habilitado. Adicionei o item 2 "Amoxicilina": a faixa passou a dizer "Dipirona, Penicilina", mas a caixa continuou marcada e **Emitir seguiu habilitado** (`checked:true, emitDisabled:false`).
- **O que deveria acontecer:** a confirmação deve valer para o conjunto de alergias conferido. Mudou o conjunto, a caixa desmarca.

### G2. Genéricos e classes reais que não avisam
- **Evidência (Node):**
  - **Cefalosporinas:** "Cefalosporina" × **Cefaclor** não avisa. O cefaclor está em `COMBINED` (penicilina → cefaclor avisa) mas falta na linha da família, o que é incoerente. Também não avisam cefixima e cefotaxima, e "Cefaclor" × Cefalexina.
  - **Sulfas:** "Co-trimoxazol" (com hífen) × Bactrim e × Trimetoprima não avisam. "Sulfametoxazol + trimetoprima" e "Sulfametoxazol/trimetoprima" × **Trimetoprima** não avisam: o nome genérico do Bactrim não aciona a decisão "nos dois sentidos". "SMX-TMP" × Bactrim não avisa.
  - **Betalactâmicos:** "Betalactâmicos" e "Beta-lactâmicos" não avisam nada.
  - **AINEs:** "AINH" (sigla brasileira comum), "Anti inflamatório" (com espaço) e "Antinflamatórios" não avisam. "AINE" × Indometacina e × Tenoxicam não avisam. "AAS" × Ácido mefenâmico não avisa (indometacina e mefenâmico são inibidores fortes da COX-1).
  - **Anticonvulsivantes:** "Anticonvulsivantes aromáticos" × Carbamazepina não avisa.
  - **Pirazolonas:** "Pirazolonas" × Dipirona não avisa.
- **O que deveria acontecer:** acrescentar cefaclor e as demais cefalosporinas (o prefixo "cef" exige cuidado: Cefaliv é dipirona), normalizar hífen e espaço, fazer "sulfametoxazol + trimetoprima" acionar o sentido inverso, e cobrir as classes "betalactâmico", "AINH", "anticonvulsivante aromático" e "pirazolona".

### G3. Marcas muito usadas que não avisam
- **Evidência:**
  - Dipirona: **Cefaliv, Sedalgina, Doralgina** (todas contêm dipirona; conferido em bula nesta passada, ver fontes), Benegrip, Maxalgina.
  - Penicilina: **Benzetacil, Clavulin**.
  - Cefalosporina: **Keflex, Rocefin**.
  - Ibuprofeno/AAS: Ponstan, Buscofem, Profenid.
  - Fenitoína e carbamazepina: Epelin, Lamitor.

  Na tela, com Penicilina declarada, digitar Benzetacil, Clavulin BD ou Keflex mostra "Sem correspondência automática…". O aviso honesto aparece, mas não há alerta. Enxaqueca é queixa da neuropediatria, e Cefaliv, Sedalgina e Doralgina são prescritas a adolescentes.
- **O que deveria acontecer:** incluir as marcas acima (Benzetacil e Clavulin, no mínimo).

### G4. A medicação registrada não confere a posologia nem as observações (a prescrição confere)
- **Onde:** o `MedicationForm` (`typed` = princípio + nome), o painel de Medicações e a coluna da visão geral (`allergyConflict` só sobre `principioAtivo`/`nome`).
- **Evidência:** com alergia a Dipirona, princípio Paracetamol e posologia "se não ceder, dipirona 20 gotas", mais observações "Alternar com Novalgina", o formulário mostra "Sem correspondência automática". Medicação gravada em memória com posologia "15 gotas; alternar com dipirona" aparece sem aviso na coluna e no painel. A mesma posologia na prescrição avisa: o próprio código justifica "Paracetamol, se não ceder, dipirona é prescrição de dipirona".
- **O que deveria acontecer:** a mesma conta da prescrição, com posologia e observações incluídas.

### G5. Assinar um rascunho que cita o alérgeno: o diálogo não mostra a alergia
- **Onde:** `SignDialog` (`NotesView.jsx`) usa `ConfirmDialog` sem `AllergyNotice`.
- **Evidência:** criei um rascunho com plano "Dipirona 1 g se dor" e cliquei Assinar. O diálogo diz só "Assinar esta evolução? …" (`allergyNotice:false`). É o momento em que a conduta vira imutável, e o rascunho pode ser anterior ao registro da alergia.
- **O que deveria acontecer:** `AllergyNotice` com `typed={note.plano}` no diálogo de assinatura.

### G6. Esc no "Confirme sua identidade" fecha também a emissão e descarta o documento
- **Onde:** `useFocusTrap` (`Overlay.jsx`). Cada diálogo põe um `keydown` em captura no `document`, e `stopPropagation` não impede o outro ouvinte do mesmo nó. O diálogo externo, registrado primeiro, fecha primeiro.
- **Evidência:** Solicitação de exames com o item "EEG em sono espontâneo", depois Emitir. Abriram os dois diálogos ("Emissão de documento clínico" e "Confirme sua identidade"). Um Esc deixou `dialogs: []`. Ao reabrir, o item estava vazio (o modal reinicia o texto ao abrir). Repetido a 1440 e a 1280.
- **O que deveria acontecer:** Esc fecha só o diálogo de cima (`stopImmediatePropagation` ou uma pilha de diálogos), e o documento fica intacto.

### G7. Forma do dado da alergia não validada: texto derruba o prontuário, objeto vira "[object Object]"
- **Onde:** `declaredAllergies` (`(list ?? []).map`) e `patientStates`. `clinico` é jsonb sem esquema (`0001_schema.sql`).
- **Evidência:** com `alergias: 'Dipirona'` (texto), a tela inteira fica "Esta tela falhou ao carregar" (`a10-string.png`) e a alergia some junto. Com `[{nome:'Dipirona'}]`, a declarada vira "[object Object]" e o conflito não é detectado. Isso contraria a regra do próprio arquivo: "um registro ruim nunca derruba a barra, a alergia e o resto".
- **O que deveria acontecer:** aceitar texto (separar por vírgula ou ponto e vírgula) e objeto com `nome`/`descricao`. Se a forma for desconhecida, mostrar a alergia como "não foi possível ler" em vez de derrubar ou de dizer "Nenhuma".

### G8. Responsável na ficha que não é encontrado: a tela diz "não cadastrado" e "Complete a ficha"
- **Onde:** `PatientRecordScreen.load` (`repo.get` → `null` → `filter(Boolean)`), `ConsentsView` e `ProfileColumn`.
- **Evidência:** com `responsaveis: ['nao-existe-0000']`, o perfil mostra "Responsável · Nenhum cadastrado" e o painel de consentimentos mostra "Responsável legal não cadastrado… Complete a ficha". A falha de leitura (`get` que lança) está correta: "Não foi possível ler responsáveis".
- **O que deveria acontecer:** um id presente na ficha e sem registro legível é "não foi possível ler o responsável", nunca "não cadastrado" (o próprio código chama isso de afirmação legal falsa, art. 14). Suspeita, não reproduzida: no modo servidor, uma linha que a RLS esconde devolve `null` do mesmo jeito.

## MENOR

- **M1. Esc ou × na emissão descarta a prescrição digitada sem perguntar.** Digitei "Levetiracetam 100 mg/mL" e "3 mL de 12/12 h", apertei Esc e reabri: os campos estavam vazios. A nova evolução e a medicação preservam o rascunho (medido). Falta coerência e a perda acontece num toque.
- **M2. "Quantidade" da prescrição não é conferida.** "1 frasco de Novalgina" não gera aviso.
- **M3. Modelos ilegíveis viram "Nenhum modelo salvo · Crie modelos em Documentos › Modelos"** (falha de `list` em `templates`). Deveria dizer que não conseguiu ler.
- **M4. O foco cai no `<body>`** depois de suspender uma medicação com sucesso (o gatilho some), durante a gravação de um consentimento e depois da falha dele (a confirmação fecha antes de gravar). Deveria ir para o título da lista ou para o painel.
- **M5. "Mostrar mais" (Linha do tempo e Evoluções): o foco fica no botão, que pula para o fim.** As contagens estão corretas: "60 de 260", depois "60 de 200"; "30 de 121", depois "30 de 91". Ao abrir pela faixa uma consulta antiga, o item aparece renderizado, marcado e à vista (300 consultas, item 320 de 320), mas o foco vai ao painel, não ao item.
- **M6. A rolagem suave da Linha do tempo ignora o movimento reduzido.** Com `reduce`, o `scrollTop` foi 0 → 42 → 144 → 336 → … → 5579 ao longo de cerca de 600 ms, igual ao modo normal. O `scrollTo({behavior:'smooth'})` é explícito.
- **M7. Dados futuros já gravados entram como atuais.** Uma escala com data de 01/03/2027 virou o escore do cartão ("SNAP-IV 50/54 · +33 pontos em 4 meses · Sintomas acentuados"). Uma medicação com início em 10/01/2027 aparece "em uso" e conta na pílula (3). Os formulários recusam datas futuras (medido: "A data de início do uso não pode ser futura.", "A data da suspensão não pode ser futura.", e a suspensão anterior ao início também é recusada), mas os dados importados ou de relógio errado passam.
- **M8. Nascimento futuro ou ilegível.** O painel de Marcos diz "Data de nascimento não informada · Informe a data", mas a data foi informada e é inválida. Em Escalas, todos os instrumentos aparecem "— indicado para a idade" com a idade desconhecida.
- **M9. Nome de 80 caracteres a 375 px:** a trilha (`span`) vai até 583 px, e `.shell__content` rola na horizontal (scrollWidth 583 > 375). O h1 e o cabeçalho do painel quebram ou cortam corretamente. A trilha é componente do shell, mas o rótulo vem do prontuário.
- **M10. Árvore AX.**
  - A lista "Alertas do paciente" tem como filho um `status`, não um `listitem` (`li role=status`), o que quebra a semântica de lista.
  - Os modais não têm `aria-describedby`: a descrição ("Depois de assinada…") e a faixa de alergia não são anunciadas ao abrir. O foco vai direto ao campo. O aviso de conflito (`role=alert`) é anunciado.
- **M11. forced-colors:** `.pr-rx-allergy`, `.doc-allergy-hit` e `.pr-issue` ficam sem borda (`none 0px`) e perdem a caixa. As pílulas, os cartões e as cápsulas ganham borda, e o foco fica visível (`outline solid 2px`).
- **M12. `Button` com `loading` e `disabled={false}` fica habilitado** (`{...rest}` sobrescreve). Medido: "Emitir documento" com `is-loading` e `disabled:false` enquanto a confirmação de identidade está aberta. A trava `lock` evita a duplicação.
- **M13. Alvos no celular com 40 px** (Editar ficha, Emitir documento, Remarcar, camadas do palco). Passa os 24 px do critério AA e fica abaixo dos 44 px recomendados para toque. Desktop: só o link "Pacientes" da trilha tem 21 px de altura.
- **M14. Abreviações:** "Amox" × Amoxicilina e "A.A.S." × Ibuprofeno não avisam.

## Fora do escopo julgado, registrado por segurança

- **Cadastro (PatientForm, o mesmo componente de "Editar ficha"): a alergia digitada sem Enter é descartada em silêncio.** Digitei "Dipirona" no campo Alergias e cliquei "Cadastrar paciente". O registro foi gravado com `alergias: []`, e o prontuário mostra "Nenhuma registrada". O rascunho do `ChipListField` não entra no envio.

## Suspeitas e pontos de decisão (não contam como achado)

- AAS/AINE × Dipirona não avisa nos dois sentidos. A decisão está documentada em `alergias-tabela-e-fontes.md`. Fica a nota: na intolerância cruzada (asma ou urticária com AAS), a dipirona também costuma reagir.
- Cefalexina × Amoxicilina, o sentido inverso da cadeia lateral, não avisa. Não está nas decisões do dono.
- "Sulfa" × Sulfassalazina não avisa ("sulfassalazina" não casa como palavra inteira). É raro na especialidade.
- O texto livre de laudo e atestado com conduta ("Conduta: iniciar dipirona") não é conferido. Esses tipos não são prescrição, mas o texto pode trazer conduta.
- Palco 3D com `reduce`: 7% dos pixels mudam no primeiro segundo e depois 0%. Provavelmente é o assentamento da carga, não animação; sem `reduce`, a diferença foi de 11% e 31%.

## O que está bom (medido)

- **Falha de leitura nunca vira "nenhum registro".** Conferi as 8 lojas: aparece a faixa "Não foi possível ler X… Tentar de novo", o painel mostra "Não foi possível ler X · Isso não significa que não haja registros", sem botão de criar. A coluna diz "Não foi possível ler as medicações. Confirme com o responsável…" e a pílula perde a contagem. Com consultas ilegíveis, o palco mostra "Consultas não lidas". "Tentar de novo" funciona, e na segunda falha diz "Ainda não foi possível…". Com o paciente ilegível, a tela diz que não conseguiu ler o prontuário.
- **Falha de gravação preserva o texto e avisa** na medicação, na evolução, no adendo, na suspensão e no marco. O modal fica aberto, o foco fica no botão de enviar, e o Tab segue preso no diálogo.
- **Clique duplo não duplica** na medicação, em "Assinar e travar", no adendo, na escala e no marco: 1 gravação cada, com 1,2 a 1,5 s de atraso injetado.
- **Consentimento durante outra gravação:** todos os botões ficam desabilitados, nenhum registro some e nada é gravado em dobro (1 gravação).
- **Teclado:**
  - O foco abre no primeiro campo. Tab e Shift+Tab circulam dentro do diálogo. Esc fecha só o modal e não o painel.
  - O foco volta ao gatilho no modal, nas pílulas (Esc, ×, voltar do navegador) e na faixa.
  - Pílulas e faixa usam tabindex móvel: setas, Home/End e Enter funcionam (254 cápsulas, 1 parada de Tab).
- **Regra de alergia, o que acerta:** falsos positivos (sulfato ferroso, sulfato de magnésio, salbutamol, furosemida, paracetamol, "Glaucomas"), siglas como palavra inteira (AAS), plurais (Penicilinas, Sulfas, AINEs), acentos e caixa. As 27 negações puras são descartadas corretamente. Prescrição: item, posologia e observações conferidos. Adendo e Plano da evolução conferidos. Remarcação mostra a alergia. Quando nada casa, aparece o aviso honesto "Sem correspondência automática…".
- **Dados extremos:**
  - Paciente sem consultas: estados neutros e corretos.
  - Consulta com data ilegível: fica de fora com aviso. Evolução com data ilegível: "Sem data", no fim.
  - Recém-nascido: "0 dias".
  - Escala fora do catálogo: "Escore 7 registrado; sem faixa de interpretação aqui".
  - Escore fora da faixa é recusado.
- **Contraste:** nenhum texto medido abaixo de 4,5. Pixel 3x: alergia 5,36, contagem 9,34, data da cápsula 6,53.
- **Movimento:** com `reduce`, o painel não anima e o palco para. **forced-colors:** pílula ativa em Highlight, borda nos cartões e foco visível.

## Fontes das marcas conferidas nesta passada

- [Cefaliv — Droga Raia](https://www.drogaraia.com.br/cefaliv-12-comprimidos.html) · [bula.com.br](https://bula.com.br/original/cefaliv)
- [Sedalgina — composição](https://bula.com.br/sedalgina/composicao) · [Doralgina — composição](https://bula.com.br/doralgina/composicao)
- As demais marcas (Benzetacil, Clavulin, Keflex, Rocefin, Ponstan, Buscofem, Profenid, Epelin, Lamitor, Benegrip, Maxalgina) vêm de conhecimento geral. Conferir em bula antes de incluir.
