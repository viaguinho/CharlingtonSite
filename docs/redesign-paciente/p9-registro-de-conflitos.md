# Passada 9 — registro único de conflitos (prontuário do paciente)

Reúne as duas críticas de contexto limpo da rodada P9 (27/10/2026), antes de qualquer correção: `critica-p9-verificacao.md` (V9) e `critica-p9-desempenho.md` (G9). Regra do dono: reunir todos os achados da rodada, depois corrigir; os agentes não corrigem.

## Vereditos

| Peça | Verificação | Desempenho |
|---|---|---|
| P1 Palco | REPROVA (V9-1) | REPROVA (G9-1) |
| P2 Colunas | REPROVA (V9-6, V9-7) | APROVA |
| P3 Seções e modais | REPROVA (V9-2…V9-5, V9-7…V9-9) | REPROVA (G9-2, G9-4) |
| P4 Faixa e estados | APROVA | REPROVA (G9-3) |

## Decisão por item

| ID | Problema | Decisão | Estado |
|---|---|---|---|
| V9-1 | Frase de negação engole alergia real ("Sem alergias exceto penicilina" → "Nenhuma registrada") | Corrigir: a negação só vale como frase inteira; ressalva ("exceto", "mas", "só", ";") ou segunda oração com alergia/reação mantém o texto | Corrigido (`allergyConflict.js`). "Não" e "Nada" passam a negação; "Não sabe" continua visível de propósito |
| V9-2 | Alergia a AINE não avisa as marcas da própria tabela | Corrigir: a classe alcança toda a linha COX-1 e as marcas | Corrigido |
| V9-3 | "Sulfas" no plural não avisa | Corrigir: plural só para "sulfa"; sulfato, sulfito e enxofre seguem fora | Corrigido |
| V9-4 | Prescrição só confere princípio ativo e concentração | Corrigir: posologia e observações entram na conta, com a mesma marca "Revisei" | Corrigido (`ClinicalDocumentModal.jsx`; observações só na prescrição estruturada). Verificado na tela com Paracetamol + "dipirona" na posologia: aviso aparece e "Assinar e emitir" bloqueia |
| V9-5 | Tab preso fora do diálogo depois de gravação com falha | Corrigir: o trap consome o Tab e pousa no controle recolocado | Corrigido (`Overlay.jsx`). Não reproduzido em tela com gravação falhando |
| V9-6 | Medicação com início futuro entra em "em uso" | Corrigir: `max` hoje e recusa, como suspensão e escalas | Corrigido |
| V9-7 | Escala fora do catálogo some do painel | Corrigir: o painel lista o registro com o escore e a interpretação/risco gravados; o card da visão geral também | Corrigido |
| V9-8 | Segundo consentimento durante uma gravação é descartado em silêncio | Corrigir: as outras ações ficam desabilitadas durante a gravação, e a trava avisa em vez de calar | Corrigido |
| V9-9 | Responsáveis ilegíveis levam a "Responsável legal não cadastrado" | Corrigir: Consentimentos depende também da leitura dos responsáveis | Corrigido |
| G9-1 | Montar a cena trava o main por 308 a 363 ms (4×) em toda abertura | Corrigir: o grafo do plexo é calculado uma vez por sessão e guardado | Corrigido (`scene.js`). 1×: nenhuma tarefa longa na 2ª e 3ª aberturas (eram 78 a 89 ms). Não medido a 4× |
| G9-3 | Cada abertura lê 9 lojas inteiras e decifra todos os responsáveis | Corrigir: `list` por `pacienteId` usa o índice; responsáveis lidos pelos ids da ficha | Corrigido (`idb-adapter.js`, `PatientRecordScreen.jsx`) |
| G9-4 | Linha do tempo e Evoluções renderizam tudo e refazem a cada minuto | Corrigir: views memoizadas (o tique de 60 s não chega a elas) e janela de 60 registros / 30 evoluções com "Mostrar mais" | Corrigido. Os textos relativos ("há 3 min") do painel só se atualizam quando o prontuário relê |

## Precisa do dono

| ID | Problema | Por quê |
|---|---|---|
| G9-2 | Vidro do painel (81% da tela) sobre o fundo animado: GPU de 107 para 405 ms/s | Muda a aparência (painel mais opaco) e o dono decidiu que o painel cobre o palco. Opções: superfície quase opaca, ou vidro só nas pílulas e botões pequenos |
| V9-10(b) | Trimetoprima → Bactrim: a tabela diz "só nesse sentido", a decisão 2 diz que quem reage ao cotrimoxazol evita os dois | Decisão clínica; fica para a revisão médica de `alergias-tabela-e-fontes.md` |
| V9-13 | A 400% de zoom nenhuma alergia fica à vista ao rolar | Troca consciente (reflow) com a regra "alergia nunca some": registrar como exceção ou manter uma faixa mínima |

## Ainda aberto (menores)

- V9-10 (a) cefaclor não avisa para cefalexina; (d) só o Plano da evolução é conferido; (e) "A.A.S." não casa; (f) plano sem remédio mostra a ressalva "confira o medicamento".
- V9-11 confirmar/revogar consentimento e "Identificar o anexo" sem faixa de alergia.
- V9-12 foco ao fechar volta à pílula, não à cápsula. V9-14 marco alternado perde o foco, sem região viva. V9-15 dois botões "Abrir". V9-16 nascimento futuro ou inválido sem aviso.
- S-1 clique duplo real em "Cadastrar paciente"; S-2 `requireStepUp` no compositor; S-3 alvos de toque com ponteiro grosso.
- G9-5 raycast no hover; G9-6 ouvinte `keydown` vaza por abertura; G9-7 faixa monta todas as cápsulas; G9-8 miniaturas decodificam o arquivo inteiro; G9-9 giro automático de 14 s; G9-10 modal de documento e GLB sem compressão.
- Suspeita: piso de ~300 ms na 1ª abertura (limite do Suspense do React 19); pré-carregar `PatientRecordScreen` e `AnatomyStage` na lista.
