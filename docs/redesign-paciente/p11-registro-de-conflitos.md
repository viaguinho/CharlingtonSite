# Passada 11: registro de conflitos

Data: 03/11/2026. Dois críticos opus de contexto limpo: [dados e robustez](critica-p11-dados-robustez.md) (3 BLOQUEIA, 7 GRAVE, 14 MENOR) e [sistema, fidelidade e desempenho](critica-p11-sistema-fidelidade-desempenho.md) (0 BLOQUEIA, 1 GRAVE, 14 MENOR, fidelidade 7,5/10). Vereditos: P4 aprova nos dois; P1, P2 e P3 reprovam no de dados; P3 reprova no de sistema.

Decisão do dono (03/11): dúvidas são julgadas pelos próprios agentes. Pausa no teto de 80% da janela de 5 horas: o lote 1 foi aplicado, o resto ficou aberto abaixo.

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

## Aberto para o próximo lote (não aplicado por causa do teto de 80%)

Dados e robustez: M7 (responsáveis como texto e responsável órfão), M8 (datas: antes do nascimento, `02-30`, data sem hora, status desconhecido), M9 (foco na faixa), M10 (faixa vazia sem consultas), M11 (anexo de origem desconhecida fora das pastas, cair em "Outros"), M12 (escala com data ilegível `cx=NaN%`), M13 (acessibilidade: `li role=status`, cópias vivas da alergia, nomes "Abrir" e "Remarcar"), M14 (pílula de seção sem sinal de leitura falha). G3 conferir na tela a 320×256.

Sistema: M1 (leque de folhas), M2 (trilha com 300 consultas), M3 (cápsula da ponta cortada), M4 (raycast do hover a 4×), M5 (vidro sobre o fundo animado, fora de escopo: shell), M6 (composição a 1920, 7,5/10), M7 (11 px), M8 (`#000` em `patient-record.css`), M9 (valores soltos), M10 (alvo de 32 px em "Mostrar todos"), M11 (`startTransition` na abertura com carga), M12 (`lazy()` dos modais), M13 (efeito do palco com `alerts` JSX), M14 (três nomes da seção Exames).

Fora do escopo, observado: `#/pacientes` (lista) cai quando uma consulta tem `inicio` numérico (`core/appointments.js:166`); fundo animado do shell ignora `prefers-reduced-motion`.

## Ainda por fazer

Regenerar o `dist` em commit separado depois do último lote; nova passada de críticos só depois do lote 2.
