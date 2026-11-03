# Passada 11: registro de conflitos

Data: 03/11/2026. Dois críticos opus de contexto limpo: [dados e robustez](critica-p11-dados-robustez.md) (3 BLOQUEIA, 7 GRAVE, 14 MENOR) e [sistema, fidelidade e desempenho](critica-p11-sistema-fidelidade-desempenho.md) (0 BLOQUEIA, 1 GRAVE, 14 MENOR, fidelidade 7,5/10). Vereditos: P4 aprova nos dois; P1, P2 e P3 reprovam no de dados; P3 reprova no de sistema.

Decisão do dono (03/11): dúvidas são julgadas pelos próprios agentes. O dono liberou seguir até o teto de 100% da janela. Lotes 1 e 2 aplicados; a passada 12 não cabe no que restou da janela.

## Lote 1: aplicado (commit `cc98787` é só o `PatientForm`; o lote vem no commit seguinte)

| Achado | O que foi feito |
|---|---|
| B1 texto literal só casa o texto inteiro | cada palavra do texto da alergia que não é reação nem enchimento vira termo (`NOT_A_DRUG`); "Alergia a topiramato (rash)" avisa "Topiramato 25 mg" |
| B2 negação engole afirmação | verbos afirmativos saem do enchimento; oração depois da negação, sem negação própria e com "alergia", afirma (`;` `.` `,` " e " " ou "); "reação" afirma só em frase à parte |
| B3 faixa de alergia cortada em janela baixa | `flex-wrap: wrap`, sem reticência, rola por dentro (até 40% da janela); vale até 600 px de altura |
| G1 alergia fora de vista (521 a 575 px; 320×568) | limite da faixa mínima subiu de 520 para 600 px; medido a 1440×540 e a 320×256 |
| G2 registro malformado derruba a tela | `record/diagnoses.js` normaliza diagnóstico (texto, lista, objeto com `codigo`/`cid`); `ErrorBoundary` dentro do painel; `?? ''` nas duas ordenações de anexo e documento. Também na lista de pacientes |
| G3 diálogos a 400% | descrição e preenchimento do cabeçalho e do rodapé somem em janela baixa; a faixa de alergia grudada no topo do corpo (CSS; **não conferido na tela**) |
| G4 grafias de SMX-TMP | forma "com espaço" (`SMX/TMP`, `SMX+TMP`, `TMP-SMX`), `smz`, `whenAll` sulfametoxazol e trimetoprima |
| G5 marca sem cruzada | marcas das penicilinas (Amoxil, Amox, Augmentin, Clavulin, Benzetacil, Unasyn) valem como o genérico na regra penicilina→cefalosporina |
| G6 famílias | cefalosporinas (cefpodoxima, cefalotina, cefprozil, cefdinir, cefoxitina, cefradina, Cefamox), sulfonamidas (sulfacetamida, sulfadoxina, sulfassalazina, Infectrin, Assepium), classes "antiepilépticos" e "beta lactâmicos", marcas de AINE (Flanax, Toragesic, Feldene, Tilatil, Tandrilax, Torsilax, Sonrisal, Alka-Seltzer, Ecasil, Nisulid, Arcoxia, Celebra) |
| G7 formulário da neuropediatria | famílias de valproato, metilfenidato, risperidona, clobazam, levetiracetam, topiramato, gabapentina, clonazepam, diazepam, vigabatrina, lacosamida, aripiprazol, atomoxetina, com as marcas conhecidas |
| M1 prescrição sem aviso de "sem correspondência" | nota na emissão quando há item e alergia e nenhum bate |
| M3, M4, M5, M6 | `false` vira lista vazia; vírgula dentro de parênteses não divide; objeto com `medicamento`, `farmaco`, `principioAtivo` etc.; espaço de largura zero removido |
| sistema G1 painel a 1024×768 com 30% | a página rola até a posição fixa ao abrir; a alergia sai da barra de seções (já está no cabeçalho do painel); sobram 524 px de conteúdo (antes 109) |
| `PatientForm` | alergia digitada sem Enter vira pílula ao sair do campo (`cc98787`) |

Bateria do crítico (259 casos, Node): de 58 falhas para 7, todas deliberadas (abaixo).

## Aberto de propósito

- **Marcas sem bula conferida, fora da tabela:** Benegrip, Maxalgina, Doril, Engov. Seguem fora até a revisão médica (decisão do dono de 28/10). As marcas acrescentadas neste lote vêm de conhecimento geral e **entram na lista de revisão médica** (Flanax, Toragesic, Feldene, Tilatil, Tandrilax, Torsilax, Sonrisal, Alka-Seltzer, Ecasil, Nisulid, Arcoxia, Celebra, Infectrin, Assepium, Cefamox, Depakene, Depakote, Valpakine, Ritalina, Concerta, Risperdal, Frisium, Urbanil, Keppra, Topamax, Neurontin, Rivotril, Valium, Sabril, Vimpat, Abilify, Strattera).
- **M2 "Não informado":** continua "Nenhuma registrada" (neutra e verdadeira: nada foi registrado). Mudar o texto é decisão de redação.

## Lote 2: aplicado (commits `124e139` e `ff155a8`)

| Achado | O que foi feito |
|---|---|
| M10 faixa vazia | sem consulta a base do palco diz "Nenhuma consulta · Agendar" (ou "Consultas não lidas"); verificado em memória |
| M9 foco | ao carregar "Anteriores", o foco vai para a cápsula nova ao lado em vez de cair no `body` |
| M8 (parte) | status de consulta desconhecido vira "Status não reconhecido" |
| M11 pasta | anexo de origem desconhecida cai em "Outros" |
| M12 escala | data ilegível não vira `cx="NaN%"` |
| M13 | `role=status` saiu do `li` (só a cópia viva do palco anuncia); "Remarcar" ganhou objeto no nome |
| M14 pílula | seção cuja leitura falhou mostra "!" (com texto para leitor de tela); nome único "Exames e anexos" no painel |
| M7 responsáveis | responsável gravado como texto vale como id (falha de leitura em vez de "Nenhum cadastrado") |
| sistema M2 trilha | com mais de 40 consultas a trilha agrupa em faixas do eixo; os números exatos ficam no texto |
| sistema M1 leque | folhas sobem (lift −16 px, empilhamento 19 px); capturado a 1440 |
| sistema M8, M10, M12, M13 | `#000` da máscara virou `black`; "Mostrar todos" com 40 px; diálogos de ficha, documento e remarcação só descem na primeira abertura (chunk do prontuário 45,8 → 43,8 kB gzip); efeito do palco depende só de `status` |
| G3 diálogos a 320×256 | cabeçalho e rodapé compactos e alergia grudada: a alergia fica à vista em 50 de 50 posições do diálogo de documento (era 6 de 7 sem à vista) |

Verificado com o harness em memória do crítico (25 estados): nenhum erro de tela; diagnóstico em texto e objeto sem código renderizam; "Sem alergia medicamentosa; alergia alimentar" aparece como alergia; `false` e negação pura mostram "Nenhuma registrada"; sem consultas mostra "Nenhuma consulta · Agendar"; 300 consultas abrem com 64 cápsulas. A trilha agrupada (acima de 40 consultas) e o estado vazio da faixa foram conferidos só pelo DOM, não por captura.

## Aberto de propósito ou para a próxima passada

- **Dados M8 (resto):** data antes do nascimento ("desde 01/01/1900"), data impossível (`02-30`) e data sem hora ("Atrasado" num dia e "Hoje" noutro). Exige decidir a regra de data válida na ficha.
- **Sistema M3:** cápsula da ponta direita cortada no estado "futuro".
- **Sistema M4:** raycast do hover a 4× (449 ms/s de thread principal; média segue em 60 fps). Pede BVH (`three-mesh-bvh`, dependência nova) ou malha de sondagem: decisão de dependência do dono.
- **Sistema M5:** vidro sobre o fundo animado do shell (fora de escopo: shell).
- **Sistema M6:** composição a 1920, plexo com pouca presença (7,5/10). Decisão visual, não corrigida sem passar pelo dono.
- **Sistema M7:** 11 px na data da cápsula e no rótulo do popover: o guia permite micro para o mês da faixa; um 12 px viraria o quinto tamanho da tela.
- **Sistema M9:** valores soltos de espaço, desfoque e z-index em `anatomy.css` e `glass-folder.css` (dívida de tokens, sem efeito visível).
- **Sistema M11:** `startTransition` na abertura com 300 consultas e CPU 4× (242 a 477 ms).
- **Dados M2:** "Não informado" segue "Nenhuma registrada".

## Ainda por fazer

`dist` regenerado (commit `build: regenera o dist com a passada 11`). Falta a passada 12 de críticos (dois críticos custam cerca de 60% da janela de 5 horas: rodar numa janela nova).
