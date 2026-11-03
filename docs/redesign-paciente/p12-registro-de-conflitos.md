# Passada 12: registro de conflitos

Data: 04/11/2026. Dois críticos opus de contexto limpo: [dados e robustez](critica-p12-dados-robustez.md) (3 BLOQUEIA, 5 GRAVE, 11 MENOR; P1, P2 e P3 reprovam, P4 aprova) e [sistema, fidelidade e desempenho](critica-p12-sistema-fidelidade-desempenho.md) (0 BLOQUEIA, 3 GRAVE, 11 MENOR; P1 e P3 reprovam, P2 e P4 aprovam; fidelidade 8,0/10, subiu de 7,5).

## Aplicado (commit `fix(admin): passada 12 do prontuário…` e `dist` em seguida)

| Achado | O que foi feito |
|---|---|
| dados B1 grafias de cotrimoxazol, TMP | travessão e hífen tipográfico viram hífen; "co" cola em "cotrimoxazol"; `tmp`/`trimetoprim` nos dois sentidos |
| dados B2 Nisulid, Celebra, Arcoxia | famílias próprias (nimesulida, celecoxibe, etoricoxibe, meloxicam) |
| dados B3 "Nega alergias, exceto dipirona" | a pílula e os avisos dizem "Dipirona" |
| dados G1 objeto aninhado | nome do alérgeno é lido recursivamente; "grave" e outras descrições de reação nunca viram nome |
| dados G2 cadeia lateral R1 | cefalexina e cefaclor avisam ampicilina; cefadroxila e cefprozil avisam amoxicilina (**revisão médica**) |
| dados G3 siglas e marcas | CBZ, OXC, DFH, LTG, VPA, hidantoína, benzodiazepínicos, midazolam, paracetamol/Tylenol, azitromicina/Zitromax, "acetil salicílico", "amoxi", "trimetoprim", Venvanse, Vonau, Hixizine |
| dados G4 aviso falso por palavra da anotação (regressão do lote 1) | só o início do texto vira termo (parênteses e o que vem depois de ":" ou " - " saem); mais palavras de unidade e via; sais ("ácido", "sódico") não valem; partes da combinação só se forem siglas |
| dados G5 diagnóstico desconhecido | chave desconhecida ou número vira o código, nunca "Nenhum diagnóstico" |
| dados M10, M11 | `allergyConflict(null)` devolve vazio; plural em "Mostrar mais N consulta(s)" |
| sistema G1 popover | fechar o popover com o mouse não devolve o foco à lista de estruturas |
| sistema G2 pílula de resumo | `min-width: 0` e largura máxima: o texto não sai mais da pílula |
| sistema G3 diálogos | montam em ocioso, fechados: sem o atraso de 300 ms do Suspense na primeira abertura |

Bateria de 338 casos do crítico: 290 de 294 pares certos (de 43 falsos-negativos para 4, dos quais 3 resolvidos depois e 1 deliberado); bateria da passada 11 (259 casos) igual: 7 falhas deliberadas. 25 estados sintéticos sem erro; diálogos de ficha e documento abrem e fecham.

## Aberto de propósito ou para a próxima passada

- Cefalexina → amoxicilina: a cadeia R1 da cefalexina é a da ampicilina, não a da amoxicilina; o crítico esperava aviso. Fica para a revisão médica.
- Dados M1 ("?" e `clinico` como texto), M2 (diagnóstico em texto com vírgula), M3 (data de 1900), M4 (anexo com data ilegível vira o mais recente), M5 (falha das consultas apaga "N a emitir"; responsável com id numérico), M6 (nome de medicação sem espaço abre rolagem lateral a 1440), M7 (GLB que não baixa deixa canvas sem `dispose`), M8 ("Agendar retorno" sem permissão), M9 ("Tentar de novo" do painel chama `load`).
- Sistema: 11 menores (relatório), entre eles `DocumentSheet` e `LetterheadPreview` (40 kB) na abertura (M10) e o raycast do hover a 4× (388 ms/s, conhecido).
- Fidelidade 8,0/10: o mecanismo 6 (leque de folhas) segue parcial (as folhas sobem 14 px; miniaturas escuras viram faixas pretas).

## Ainda por fazer

Passada 13, só se o dono quiser: duas rodadas seguidas reprovaram P1 a P3 por achados novos de dados. Os de sistema estão perto de aprovar (P2 e P4 aprovam; P1 e P3 só por GRAVE já corrigidos).
