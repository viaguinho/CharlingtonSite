# Crítica P9: verificação (dados clínicos + robustez/acessibilidade)

**Data:** 2026-10-27 · **Tela:** `#/pacientes/<id>` em `http://localhost:5173/admin.html` · **Crítico de contexto limpo** (não li design-loop, críticas anteriores, registros de conflito, git nem Obsidian).

**Método.**
- Sonda CDP própria no Chromium da porta 9333 (aba persistente, `Input.dispatchKeyEvent` e `Input.dispatchMouseEvent` reais, árvore AX por `Accessibility.getFullAXTree`, capturas e amostragem de pixel para contraste).
- **Adaptador em memória** trocado com `useAdapter` a partir de `/admin/data/repository.js`. Ele copia a base de verificação uma vez e, daí em diante, lê e grava só na memória da aba, com atraso, falha de leitura por loja, falha de `get` e falha de gravação. Nada foi gravado no IndexedDB nem no Supabase. Nenhum botão que grava foi clicado sobre a base real.
- Pacientes de teste criados só na memória: negação de alergia, AINE/sulfas, estados por horário, escala fora do catálogo, recém-nascido, nascimento futuro, datas inválidas, nome de 80 caracteres sem espaço com 300 consultas, consentimento, marcos e cadastro novo.
- Regra de alergia testada também direto em Node (`allergyConflict.js` é função pura): 104 casos tirados de `alergias-tabela-e-fontes.md`.

**O que NÃO consegui testar ou ficou inconclusivo:**
- leitor de tela real (só a árvore AX);
- alvos de toque com ponteiro `coarse` (a sonda não emulou toque; a 390 px os botões de camada medem 40×40 sem a regra de toque);
- GLB **lento**: o throttling entrou depois do modelo já estar em cache; o GLB **ausente** foi testado;
- reautenticação na assinatura (nenhum dos dois caminhos pediu senha, provavelmente por janela de graça da sessão; não dá para concluir);
- clique duplo **real** no "Cadastrar paciente" (só testei com `.click()` sintético duplo);
- desempenho e FPS.

A sessão foi pausada uma vez no meio. O scratchpad foi apagado e refiz a sonda. As capturas citadas estão em `scratchpad/p9/verificacao/`, que pode sumir: a evidência essencial está copiada abaixo.

## Vereditos

| Peça | Veredito | Motivo |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | A pílula de alergia do palco diz "Nenhuma registrada" para um paciente com alergia a penicilina gravada (V9-1). Fallback sem WebGL, perda de contexto, GLB ausente e alertas funcionam. |
| P2 Colunas | **REPROVA** | "Medicações em uso" lista remédio que só começa daqui a 6 meses (V9-6). O card de escala fora do catálogo omite a interpretação gravada (V9-7). |
| P3 Seções e modais | **REPROVA** | Prescrição com dipirona/Novalgina em texto livre sai sem aviso (V9-4). Classe AINE não avisa para Advil/Alivium/Cataflam (V9-2). "Sulfas" não avisa para Bactrim (V9-3). Escala fora do catálogo some do painel (V9-7). Consentimento confirmado é descartado em silêncio (V9-8). "Responsável legal não cadastrado" quando a leitura falhou (V9-9). Tab preso fora do diálogo depois de gravação com falha (V9-5). |
| P4 Faixa de consultas e estados | **APROVA** | Atrasado, sem desfecho, teleconsulta sem consentimento, "consultas não lidas" e "consentimento não lido" estão corretos por data e hora. 300 consultas viram 1 parada de Tab. Data ilegível fica de fora com aviso. Ressalvas menores: V9-12 e V9-13. |

## Achados confirmados

### BLOQUEIA

**V9-1 · Frase de negação engole alergia real.**
- **Onde:** `record/allergyConflict.js` (`NEGATION` em `declaredAllergies`), usado pelo palco, pelo cabeçalho do painel, por `AllergyNotice` e pelos avisos de medicação.
- **Evidência:**
  - A ficha grava cada alergia como uma pílula de texto inteiro (`ChipListField`, sem dividir por vírgula).
  - Paciente em memória com `alergias: ['Sem alergias exceto penicilina']`: as três pílulas mostram `Alergias | Nenhuma registrada`. No "Registrar medicação", com "Amoxicilina" digitado, o aviso diz `Nenhuma alergia registrada. Confirme com o responsável antes de prescrever.`
  - Em Node, a lista vira `[]` também para "Nenhuma conhecida, exceto dipirona", "Nega alergia medicamentosa; alergia a látex", "Não tem alergia a remédio, só a camarão" e "Nenhum medicamento, mas reage a AAS".
  - No sentido contrário, "Não", "Não sabe", "Desconhece", "Ignorada" e "Nada" viram alergia em vermelho (falso alarme, menor).
- **Deveria:** a negação só vale quando é a frase inteira, sem ressalva. Qualquer "exceto", "mas", "só", "porém" ou ";" mantém o texto como alergia. Na dúvida, mostrar a alergia.
- **Reproduzir:** ficha com a pílula "Sem alergias exceto penicilina" → visão geral → Medicações › Registrar medicação › princípio ativo "Amoxicilina".

### GRAVE

**V9-2 · Alergia de classe "AINE" não avisa para as marcas da própria tabela.**
- **Onde:** `allergyConflict.js`, `CLASSES[0].drugs`. Lista só princípios ativos. A tabela diz "os da linha acima", e a linha acima inclui Advil, Alivium, Dalsy, Cataflam, Voltaren, Naprosyn, Melhoral, Somalgin e Cafiaspirina.
- **Evidência:** alergia "AINE" no "Registrar medicação":
  - "Ibuprofeno" avisa: `O que foi digitado contém AINE`.
  - "Advil", "Alivium" e "Cataflam" não avisam e mostram `Sem correspondência automática. A checagem só reconhece nomes e marcas conhecidos: confira o medicamento.` Mas essas marcas *são* conhecidas pelo sistema.
  - Em Node, 11 divergências do mesmo tipo (AINE, AINEs e "Anti-inflamatórios" × as 9 marcas).
- **Deveria:** a classe AINE alcança as marcas do COX1 (e o texto "só reconhece marcas conhecidas" deixa de mentir).
- **Reproduzir:** alergia "AINE" → Registrar medicação → "Advil".

**V9-3 · "Sulfas" (plural) não é reconhecido.**
- **Onde:** `allergyConflict.js`. `WHOLE` exige "sulfa" como palavra inteira, e "sulfas" não casa com nenhuma família.
- **Evidência:** alergia "Sulfas" no "Registrar medicação": "Bactrim" e "Sulfametoxazol" mostram `Sem correspondência automática…`. "Sulfa" no singular avisa. "Sulfato ferroso" corretamente não avisa.
- **Deveria:** aceitar o plural ("sulfas") e continuar recusando sulfato, sulfito e enxofre.
- **Reproduzir:** alergia "Sulfas" → Registrar medicação → "Bactrim".

**V9-4 · A prescrição só confere princípio ativo e concentração.**
- **Onde:** `ClinicalDocumentModal.jsx`. `itemConflicts` usa `principio` e `concentracao`. A posologia do item e as "Observações adicionais" não passam pela checagem, e o `AllergyNotice` do modal não recebe `typed`.
- **Evidência:** Clara (alergia Dipirona), em "Prescrição médica", sem emitir:
  - item "Paracetamol" com posologia `10 gotas de 6/6h; se não ceder, dipirona 15 gotas`;
  - observações `Em caso de febre persistente: Novalgina 15 gotas.`
  - Resultado: a faixa mostra só `Alergias: Dipirona`, nenhum `.doc-allergy-hit`, e "Assinar e emitir" fica `disabled=false`. A prévia do papel timbrado imprime as duas linhas (captura `03-prescricao-texto-livre-sem-aviso.png`).
  - Só ao trocar o item para "Novalgina" aparece `Alergia declarada: Dipirona…` com o botão bloqueado.
- **Deveria:** a mesma conta de `allergyHits` sobre posologia, observações e texto do documento, com a mesma marca "Revisei".
- **Reproduzir:** Clara › Emitir documento › Prescrição › escrever dipirona na posologia ou Novalgina nas observações.

**V9-5 · Depois de uma gravação com falha, o Tab para a frente fica preso fora do diálogo.**
- **Onde:** `components/Overlay.jsx`, `useFocusTrap`. Ao clicar, o botão de enviar fica `disabled`, e o foco cai no `<body>`. No Tab seguinte, o trap devolve o foco a `lastInside`, o próprio botão de enviar e último controle do diálogo, mas sem `preventDefault`. O Tab padrão então sai do documento.
- **Evidência:** Adendo com `failWrite('evolucoes')`, teclas reais. Enter em "Registrar adendo": foco em `body` durante e depois. O diálogo continua aberto, o texto fica preservado e o toast `role=alert` aparece. Daí, 5 Tabs seguidos dão `body`, `body`, `body`, `body`, `body`. Só Shift+Tab volta (`Cancelar`, depois o textarea).
- **Deveria:** depois da falha, devolver o foco ao botão (ou ao campo) e, quando o foco está fora, fazer `preventDefault` e ir ao controle certo.
- **Reproduzir:** qualquer modal com gravação falhando: Tab até o botão de enviar → Enter → Tab.

**V9-6 · Medicação com início no futuro entra como "em uso".**
- **Onde:** `MedicationsView.jsx`, `MedicationForm`. Não há `max` nem validação em "Início do uso". A suspensão, as escalas e os anexos recusam data futura.
- **Evidência:** gravação em memória de "Risperidona, 0,5 mg à noite, início 01/05/2027": toast `Medicação registrada.`, painel `Desde 01/05/2027 · em 6 meses`, e a visão geral lista "Risperidona" em **Medicações em uso**, também na contagem da pílula.
- **Deveria:** recusar data futura, como os outros diálogos, ou tratá-la como "prevista", fora de "em uso".
- **Reproduzir:** Medicações › Registrar medicação › Início do uso no ano que vem.

**V9-7 · Escala de instrumento fora do catálogo some do painel Escalas.**
- **Onde:** `ScalesView.jsx` (`if (!scale) return null;`) e `ScaleCard.jsx` (ramo fora do catálogo).
- **Evidência:** aplicação em memória `instrumentoId 'bayley-iii-cog'`, escore 85/145, `interpretacao 'Limítrofe'`, `risco 'moderado'`.
  - A pílula diz `Escalas 1`.
  - O card diz `Bayley-III Cognitivo | Escore 85 registrado; sem faixa de interpretação aqui`, mas a interpretação gravada existe.
  - Clicar o card abre o painel com `Escalas e instrumentos | 1 instrumento aplicado | Registrar aplicação` e nada embaixo (captura `05-escala-fora-catalogo-painel.png`).
- **Deveria:** o painel lista o registro com escore, data e a interpretação/risco gravados. O card usa `interpretacao` e `risco` gravados também fora do catálogo.
- **Reproduzir:** aplicação com `instrumentoId` desconhecido → visão geral → clicar o card.

**V9-8 · Consentimento confirmado durante outra gravação é descartado em silêncio.**
- **Onde:** `ConsentsView.jsx`. O `ConfirmDialog` fecha antes de `grant()`. Durante a gravação, `grant()` sai em `if (lock.current) return;` sem mensagem, e os outros botões "Registrar consentimento" continuam habilitados (`busy === purpose.id` só marca a linha em gravação).
- **Evidência:** escrita em memória com atraso de 2,5 s. Registrar WhatsApp → Registrar; durante a gravação, Registrar e-mail → Registrar. Os dois diálogos fecharam como se tivessem dado certo. Gravado: `["comunicacao_whatsapp"]`; toasts: só `Consentimento registrado.`; e-mail continua `Não registrado`.
- **Deveria:** desabilitar as outras ações durante a gravação, ou enfileirar, ou pelo menos dizer "aguarde a gravação anterior". Um registro legal não pode sumir sem aviso.
- **Reproduzir:** adaptador com atraso → dois consentimentos em sequência rápida.

**V9-9 · Falha ao ler os responsáveis aparece como "Responsável legal não cadastrado".**
- **Onde:** `PatientRecordScreen.jsx`. `SECTION_STORES` não liga Consentimentos a `GUARDIANS`, e `ConsentsView` recebe `guardians=[]`.
- **Evidência:** `failRead('responsaveis')`.
  - O perfil diz certo: `Responsável | Não foi possível ler o cadastro`, com aviso no topo.
  - O painel Consentimentos afirma `Responsável legal não cadastrado. O art. 14 da LGPD exige…`, `Titular… / Responsável legal não cadastrado` e desabilita os registros, sem "Tentar de novo" no painel.
- **Deveria:** com a leitura de responsáveis falhando, o painel mostra "Não foi possível ler os responsáveis" com "Tentar de novo" (o mesmo `RecordUnavailable`), nunca a afirmação legal.
- **Reproduzir:** derrubar a leitura de `responsaveis` → Consentimentos.

### MENOR

- **V9-10 · Avisos de alergia: lacunas e texto.**
  - (a) Alergia a "Cefaclor" não avisa para cefalexina, porque cefaclor não está na família das cefalosporinas. A tabela também não o lista ali.
  - (b) A tabela diz "trimetoprima → Bactrim só nesse sentido", mas a decisão 2 do mesmo documento diz que quem reage ao cotrimoxazol "deve evitar os dois componentes". Hoje "Bactrim" × "Trimetoprima" não avisa. O dono precisa decidir qual das duas vale.
  - (c) O texto do aviso diz "O que foi digitado contém AINE/AAS" para reação cruzada (ibuprofeno não *contém* AAS). Deveria dizer "é da mesma família".
  - (d) Na evolução, só o Plano é conferido: "Iniciar dipirona se febre" na Avaliação não avisa.
  - (e) Siglas com ponto ("A.A.S.") não casam.
  - (f) Plano sem remédio ("Retorno em 30 dias") mostra a ressalva "confira o medicamento" (ruído).
- **V9-11 · Diálogos que gravam sem a faixa de alergia.** Confirmar e revogar consentimento e "Identificar o anexo" (envio de exame) não mostram alergia (`alergia:false` medido). Escala, evolução, adendo, medicação, suspensão, remarcação e documento mostram.
- **V9-12 · Foco ao fechar volta à pílula, não ao gatilho.** Abrir a Linha do tempo por uma cápsula da faixa (Enter) e fechar com Esc deixa o foco em `button.pr-pill "Linha do tempo"`, não na cápsula. O mesmo vale para os cards de escala, as pastas e o "Abrir" das colunas.
- **V9-13 · Zoom de 400% (320×256):** a barra de seções deixa de grudar (`@media (max-height: 520px)`, decisão de reflow). Rolando, nenhuma alergia fica à vista (`vis: [false, false]`, captura `08-320x256-rolado.png`). É uma troca consciente com a regra "alergia nunca some": registrar como exceção ou manter uma faixa mínima.
- **V9-14 · Marco alternado pelo teclado perde o foco.** Enter num marco faz o botão ficar `disabled` e o foco cair em `body`. O Tab seguinte continua no próximo marco, mas o novo estado não é anunciado (não há região viva).
- **V9-15 · Nomes de botão repetidos:** a árvore AX tem `button "Abrir"` duas vezes (Medicações e Marcos), sem contexto.
- **V9-16 · Nascimento futuro ou inválido:** "01/03/2027" e "31/02/2019" mostram `—` na idade, sem aviso de dado inconsistente. Não quebra a tela.

## Suspeitas

- **S-1:** com dois `.click()` sintéticos seguidos, "Cadastrar paciente" gravou duas vezes (`responsaveis, responsaveis, pacientes, pacientes`, mesmos ids, auditoria duplicada). Não há trava por `ref` como nos outros diálogos. Com clique duplo real pode não ocorrer: não testado.
- **S-2:** "Assinar e travar" no compositor não chama `requireStepUp`, e o `SignDialog` chama (código). Na sessão, nenhum dos dois pediu senha (janela de graça?), então não consegui provar a diferença.
- **S-3:** alvos de toque no celular com ponteiro `coarse` não foram medidos (ver método).

## O que está bom

- O adendo acrescenta sem tocar no original: os campos SOAP, `assinadaEm` e `travada` ficam iguais. O clique duplo com escrita lenta gerou 1 adendo, e o aviso de alergia dispara no texto do adendo.
- A suspensão exige motivo, recusa data futura e data anterior ao início (0 gravações nas tentativas inválidas).
- A tabela de alergia acerta 91 dos 104 casos, inclusive "sulfato ferroso", "trimetoprima isolada", "cefazolina/ceftriaxona" para alergia a penicilina, "dipirona × AINE" e "levetiracetam/valproato".
- Derrubar cada uma das 9 lojas dá "Não foi possível ler…", sem contagem na pílula, sem criar alerta falso nem calar um real ("Consultas não lidas" e "Consentimento não lido"). "Tentar de novo" funciona com a falha ainda ativa e depois de liberada. O `get` do paciente que falha também se recupera.
- O paciente inexistente diz "Paciente não encontrado". Recém-nascido ("0 dias"), datas inválidas ("1 consulta com data ilegível ficou de fora"), nome de 80 caracteres e 300 consultas não quebram a tela. A faixa tem 1 parada de Tab.
- Sem WebGL, perda de contexto (com "Recarregar modelo") e GLB bloqueado ("Tentar de novo") mantêm alergia, estados e faixa.
- Contraste medido por pixel fica entre 5,5 e 10,5:1 (rótulo de alergia 5,52:1, data da cápsula 6,62:1). O movimento reduzido deixa o painel em 1 ms. No alto contraste forçado, todo controle ganha borda.
- A ordem de Tab na visão geral é lógica. Os modais devolvem o foco ao gatilho com Esc. Esc no modal não fecha o painel por trás.
- O cadastro de paciente novo funciona e abre o prontuário com a alergia em destaque.
