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

## Menores aplicados depois (commit `fix(admin): passada 12, menores…` e `dist` em seguida)

Dados: M1 (alergia ilegível: `?`, número, booleano, "null" e `clinico` como texto aparecem como "Alergia em formato ilegível"), M2 (diagnóstico em texto corta só em `;` e quebra de linha; vírgula só entre códigos; "G40.9 Epilepsia" vira código e descrição), M3 (data que não existe ou anterior ao nascimento sai da linha do tempo e entra no aviso de datas ilegíveis), M4 (anexo com data ruim vai para o fim, na pasta e no painel), M5 (pílulas de Linha do tempo e Documentos marcam "!" quando as consultas não foram lidas; responsável com id numérico), M6 (nomes sem espaço quebram), M7 (o WebGL é descartado quando o modelo falha), M8 ("Agendar retorno" só com permissão de agenda), M9 ("Tentar de novo" do painel usa `retry`).
Sistema: M1 da faixa (`EDGE` era 24 e a máscara é de 28 px; a escolha da rolagem agora evita cápsula cortada pela máscara; medido a 1280 sem corte), M3 (totais de Marcos a 96 px mínimos), M4 (leque −30 px), M5 (o "+" da pasta aparece com `--dur-1` de atraso), M6 (popover, "Abrindo o modelo 3D" e mensagens da faixa em 14 px), M7 (14 espaços em `anatomy.css`, 2 em `patient-record.css`, camadas locais), M8 (faixa grudada opaca; vidro do palco desligado sob o painel), M9 (janela baixa com painel: sem faixa duplicada nem pílula vazando), M10 (`DocumentSheet` sob demanda), M11 (nomes das folhas somem abaixo de 1024 px).
Verificado: 25 estados em memória sem erro; datas ruins contadas no aviso; pílulas "!" com consultas ilegíveis; diálogos abrem e fecham.

## Ainda aberto

- **Sistema M2 (estados expandidos cobrem a cabeça):** não verificado na tela nem corrigido.
- **Raycast do hover a 4× (p11 M4):** decisão: não adicionar `three-mesh-bvh`. É um pico de CPU sob limite artificial de 4× (média segue em 60 fps); uma dependência nova pesa mais que o ganho. Reabrir se aparecer queixa em máquina real.
- **Composição a 1920 e presença do plexo (p11 M6):** decisão visual, não alterada sem verificação visual (fidelidade 8,0).
- **Vidro sobre o fundo animado do shell (p11 M5):** fora de escopo (shell). O vidro do palco já sai sob o painel.
- **`startTransition` na abertura do painel (p11 M11):** não aplicado; ganho não medido.
- **Cápsula da ponta a 1440 (conteúdo 14 px maior que a janela):** não existe posição sem máscara sobre alguma borda; o "Hoje" ou a 1ª cápsula fica levemente esmaecido.
- **"Não informado" (p11 M2) e cefalexina → amoxicilina:** decisões de redação e de revisão médica.
- Valores soltos que não batem com a escala (6, 5, 7, 10 px) ficaram como estão.

## Ainda por fazer

Passada 13 só se o dono quiser. Cota da janela de 5 horas em ~96% no fim desta etapa.
