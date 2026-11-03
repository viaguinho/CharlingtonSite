# Crítica p12 — Dados clínicos, robustez e acessibilidade

Crítico de contexto limpo, passada 12. Data: 03/11/2026. Julga, não corrige.
Lido: `guia.md`, `bar.md`, `PRODUCT.md`, `alergias-tabela-e-fontes.md` e o código-fonte. Não lido: outras críticas, registros de conflito, `design-loop.md`, `HANDOFF.md`, histórico do git, cofre.

## Veredito

| Peça | Veredito | Motivo principal |
|---|---|---|
| P1 Palco anatômico e alertas | **REPROVA** | A pílula de alergia mostra um fragmento que inverte o sentido ("Alergias · exceto dipirona", B3) e perde o nome do alérgeno em objeto aninhado (G1). Palco, popover, camadas, controles, teclado e os três estados de falha do 3D estão corretos. |
| P2 Colunas | **REPROVA** | "Medicações em uso" não avisa Nisulid para alergia a nimesulida (B2) nem as grafias de cotrimoxazol (B1); diagnóstico em formato inesperado vira "Nenhum diagnóstico registrado" (G5). |
| P3 Seções e modais | **REPROVA** | Prescrição e "Registrar medicação" herdam os falsos-negativos de B1/B2 e mostram "Sem correspondência automática" para o mesmo fármaco. A pilha de diálogos, o foco e a alergia grudada passam em tudo que medi. |
| P4 Faixa de consultas e estados | **APROVA** | 300 consultas, datas ilegíveis, falha de leitura, vazio e id inexistente dizem a verdade. Restam só menores (M3, M5, M11). |

Contagem: **3 BLOQUEIA · 5 GRAVE · 11 MENOR**.

## Método

1. **Checagem de alergia em Node** (`allergyConflict.js` importado direto, sem tocar o projeto). Bateria própria de **338 casos**: 294 pares alergia × medicamento e 44 leituras da ficha (o que vira pílula). Cobre dipirona e marcas, penicilinas → cefalosporinas, betalactâmicos, sulfa, SMX-TMP em 21 grafias, trimetoprima nos dois sentidos (22 grafias de alergia, 10 de medicamento), AAS/AINEs e marcas, anticonvulsivantes aromáticos e siglas, formulário da neuropediatria, negação, negação seguida de afirmação (11 casos), anotação no texto, plurais, acentos, caixa, largura zero, travessão, objeto × texto × lista, entradas vazias e malformadas, robustez da função e desempenho (40 alergias × 300 medicações = 244 ms). Resultado: 243 acertos, **43 falsos-negativos, 8 falsos-positivos**, 4 casos de marca fora por decisão do dono (Maxalgina, Benegrip, Doril, Engov: nenhum avisa, conforme decidido). Nenhuma negação engoliu alérgeno real.
2. **Tela no navegador**: Chrome headless próprio na porta **9446** (a 9444 estava ocupada por um Chrome remanescente da passada 11, com perfil `scratchpad/p11/profile`; não o encerrei), perfil copiado de `.claude/design-loop/profile` para o scratchpad. Antes de qualquer interação, `repository.useAdapter()` recebeu um **adaptador em memória** com cópia só das lojas de pacientes, responsáveis, consultas, evoluções, escalas, marcos, medicações, anexos, documentos, consentimentos e modelos; leitura de outras lojas vai à base só para ler; a auditoria nunca é listada. `mode() === 'memoria'` conferido em cada roteiro e antes de cada clique que grava. Falhas de leitura simuladas pelo adaptador (exceção em `list`/`get` por loja).
3. **Roteiros** (scripts em `scratchpad/p12-dados/`): estados de dado (29 variações de alergia, diagnóstico, responsável, nome, falha por loja, falha total, falha do paciente, id inexistente); 300 consultas + 8 datas ruins + status desconhecido; paciente sem consultas, só canceladas, paciente mínimo; anexos sem data, de origem legada e com título enorme; varredura de rolagem da alergia em **10 janelas** (320×256, 320×568, 640×400, 853×480, 1280×500, 1440×540, 1024×768, 1180×700, 1366×640, 390×844), na visão geral, no painel da Linha do tempo (120 consultas a mais) e nos diálogos "Registrar medicação" e "Emitir documento", testando a cada terço de tela se a alergia está à vista **e por cima** (`elementFromPoint`); teclado com teclas reais do CDP (Tab, Shift+Tab, setas, Home/End, Enter, Esc); pilha de 3 camadas (painel → "Assinar esta evolução?" → "Confirme sua identidade"); WebGL perdido, indisponível desde o início e modelo que não baixa; movimento reduzido; árvore de acessibilidade; alvos de toque e contraste a 320 px; textos enormes.

## O que NÃO consegui testar

- **Senha no diálogo de identidade**: abri "Confirme sua identidade" e testei só o Esc. Assinatura, emissão e gravação real: não testadas.
- **Leitor de tela real** (VoiceOver/NVDA): só a árvore AX do Chrome.
- **Gestos de toque** (pinça, arrastar com um dedo): só a janela emulada.
- **Zoom do navegador**: usei a janela equivalente (640×400 = 200% de 1280×800; 320×256 = 400% de 1280×1024; 853×480 = 150%).
- **Movimento reduzido no palco**: a comparação de capturas foi contaminada pelo fundo animado do shell (fora de escopo). A conclusão vem do código (`scene.js:417`, `:478`) e do painel sem animação (0,001 s medido).
- **Papel sem permissão de escrita**: não troquei o papel do usuário; M8 é por leitura de código.
- **Falhas reais** de rede, cifra ou Supabase: só exceções simuladas no adaptador.
- **Bulas**: sem consulta web nesta passada; os pares de G3 vêm de conhecimento geral e pedem conferência.

## Achados

### BLOQUEIA

**B1 — Cotrimoxazol e trimetoprima: três grafias sem nenhum aviso** · P2, P3
- Passos: alergia "Co trimoxazol" (com espaço) ou "Co–trimoxazol" (travessão, texto colado de laudo ou Word) → prescrever "Bactrim", "Sulfametoxazol", "Sulfadiazina" ou "Trimetoprima". Também alergia "TMP" → prescrever "Trimetoprima 40 mg/5 mL". E o inverso: alergia "Sulfa" ou "Trimetoprima" → prescrever "co trimoxazol" ou "Co–trimoxazol".
- Evidência: 11 falsos-negativos na bateria (`allergyConflict({principioAtivo:'Bactrim'}, ['Co trimoxazol'])` → `[]`; `allergyConflict({principioAtivo:'Trimetoprima 40 mg/5 mL'}, ['TMP'])` → `[]`). Mais um da mesma raiz: "Anti–inflamatórios" (travessão) × Ibuprofeno. Causas: `plain()` (`allergyConflict.js:17-20`) não troca travessões (‐ ‑ ‒ – — − ) por hífen, e `squash()` (`:25`) só cola "anti" e "beta", não "co"; em `COMBINED[0]` (`:86`) a sigla "tmp" leva a Bactrim e a cotrimoxazol, mas não a `'trimetoprima'`. A decisão do dono é avisar trimetoprima nos dois sentidos, e o pedido desta passada é SMX-TMP em todas as grafias. "SMX–TMP" com travessão passa, por sorte (a sigla é palavra inteira).
- Correção: normalizar todo traço Unicode para "-" em `plain()`, colar "co " antes de "trimoxazol" em `squash()` e pôr `'trimetoprima'` nos `drugs` de `COMBINED[0]`.

**B2 — Nimesulida, celecoxibe, etoricoxibe e meloxicam não reconhecem a própria marca** · P2, P3
- Passos: alergia "Nimesulida" → registrar ou prescrever "Nisulid" (ou o inverso). O mesmo com Celecoxibe ↔ Celebra e Etoricoxibe ↔ Arcoxia.
- Evidência: `allergyConflict({principioAtivo:'Nisulid'}, ['Nimesulida'])` → `[]`, mas `allergyConflict({principioAtivo:'Nimesulida'}, ['AINEs'])` → `['AINEs']`. As marcas estão na tabela (`allergyConflict.js:101`), só que apenas dentro da classe "AINE": nenhum desses fármacos tem família própria em `FAMILIES` (`:59-70`). A prescrição ainda mostra "Sem correspondência automática… confira o medicamento" para o mesmo fármaco, e a coluna "Medicações em uso" não marca o item. Nimesulida é muito prescrita a adolescentes no Brasil.
- Correção: famílias `[nimesulida, nisulid]`, `[celecoxibe, celebra]`, `[etoricoxibe, arcoxia]` e `[meloxicam, movatec]` em `FAMILIES`.

**B3 — "Nenhuma, exceto dipirona" vira a alergia "exceto dipirona"** · P1, P2, P3
- Passos: ficha com alergia "Nenhuma, exceto dipirona" ou "Nega alergias, exceto dipirona" → abrir o prontuário; registrar ou prescrever Novalgina.
- Evidência: pílula do palco "Alergias · exceto dipirona" (captura `s09-meds.png`); coluna: "Alergia declarada a exceto dipirona: confirme antes de manter."; prescrição: "Alergia declarada: exceto dipirona." `splitTopLevel()` corta na vírgula (`allergyConflict.js:153-165`) e `declaredAllergies()` (`:185-189`) descarta o pedaço "Nenhuma" como negação, mostrando o resto fora de contexto. Lido de relance, o texto diz o contrário do registro ("alergia, exceto à dipirona"): é o caminho para marcar "Revisei" e prescrever o alérgeno. Também gera ruído: "Alergia a dipirona, nega outras" vira duas pílulas, a segunda "nega outras".
- Correção: se um pedaço de uma entrada é negação e outro não, mostrar a entrada inteira original ("Nenhuma, exceto dipirona"), nunca o fragmento.

### GRAVE

**G1 — Alergia em objeto aninhado perde o nome do alérgeno** · P1, P2, P3
- Passos: `clinico.alergias = [{ agente: { nome: 'Dipirona' }, gravidade: 'grave' }]` (jsonb sem esquema).
- Evidência: pílula "Alergias · grave"; `[{ substancia: { nome: 'Dipirona' }, tipo: 'Medicamento' }]` vira "Medicamento"; nenhum aviso para Novalgina. `allergyTexts()` (`allergyConflict.js:171-183`) só lê strings do primeiro nível e, sem chave conhecida, junta as strings irmãs (gravidade, tipo), o que impede a queda em "Alergia em formato ilegível". `{ alergias: ['Dipirona'] }` cai em "formato ilegível" (honesto), mas sem aviso.
- Correção: descer recursivamente em `OBJECT_KEYS`; sem nome encontrado, "Alergia em formato ilegível" mais o texto bruto, nunca só os campos de gravidade ou tipo.

**G2 — Cefalosporina → penicilina de mesma cadeia R1 não avisa** · P2, P3
- Passos: alergia "Cefalexina" → prescrever "Amoxicilina" ou "Ampicilina"; alergia "Cefadroxila" → "Amoxicilina".
- Evidência: 3 falsos-negativos. A regra é só de ida (`allergyConflict.js:94-95`), mas o próprio `alergias-tabela-e-fontes.md` §3 justifica o par pela cadeia lateral R1, e semelhança de cadeia é simétrica (o Practice Parameter 2022 orienta evitar, no alérgico à cefalosporina, a penicilina de R1 igual). Não é uma das decisões do dono listadas.
- Correção: regra inversa {cefalexina, Keflex → ampicilina; cefadroxila, Cefamox → amoxicilina e marcas}, com revisão do médico.

**G3 — Lacunas de cobertura no vocabulário da especialidade e nos fármacos mais usados** · P2, P3
- Evidência (falsos-negativos da bateria, todos com o mesmo fármaco ou sinônimo): siglas da neurologia CBZ, OXC, DFH, LTG, VPA (inclusive "CBZ 200 mg" na prescrição); "Difenil-hidantoína" × Fenitoína; classe "Benzodiazepínicos" × Clonazepam e Midazolam; Midazolam × Dormonid (resgate de crise); Paracetamol × Tylenol / Tylenol bebê; Acetaminofeno × Paracetamol; Azitromicina × Zitromax; Ondansetrona × Vonau; Hidroxizina × Hixizine; Lisdexanfetamina × Venvanse; grafias "Ácido acetil salicílico", "Amoxi 250 mg" e "Trimetoprim". A frase "Sem correspondência automática" mitiga, mas é ela que aparece para o analgésico e o antibiótico mais prescritos em pediatria.
- Correção: famílias para siglas e sinônimos da neurologia, para a classe dos benzodiazepínicos e para paracetamol, azitromicina e os demais pares, conferidas em bula antes de entrar.

**G4 — Palavras da anotação viram termo de busca: falso aviso em quase toda prescrição** · P2, P3
- Passos: alergia "Dipirona (reação 2 horas após a dose)" → prescrever Paracetamol "a cada 6 horas". O mesmo com "gotas", "febre", "comprimido", "intramuscular", "manchas", "internação", "escola".
- Evidência: 8 falsos-positivos; o aviso nomeia a alergia ("Alergia declarada: Dipirona (reação 2 horas após a dose)") e trava "Assinar e emitir" até a marca "Revisei". `significantWords()` (`allergyConflict.js:216`, usado em `:224`) aceita qualquer palavra de 5 letras ou mais fora de `NOT_A_DRUG`, e posologia sempre tem "gotas", "horas" ou "comprimido". O aviso disparando em todo item ensina a marcar a caixa sem ler, e assim o falso-negativo volta pela porta dos fundos.
- Correção: só aceitar como termo a palavra que casa com um termo da tabela, ou a primeira palavra antes de "(", ":" ou "–"; ou pôr o vocabulário de posologia e via em `NOT_A_DRUG`.

**G5 — Diagnóstico em formato inesperado aparece como "Nenhum diagnóstico registrado"** · P2
- Passos: `clinico.diagnosticos = [{ cid10Codigo: 'G40.9', diagnostico: 'Epilepsia' }]` ou `[{ codigo: 409 }]`.
- Evidência: card "Diagnósticos ativos · Nenhum diagnóstico registrado." e cabeçalho sem chips. `diagnosesOf()` (`diagnoses.js:21-25`) só aceita string nas chaves conhecidas e descarta o resto em silêncio (`if (!code && !description) continue`). A alergia tem a queda "formato ilegível"; o diagnóstico afirma vazio. Num prontuário de epilepsia, "nenhum diagnóstico" para quem cobre o plantão é afirmação falsa.
- Correção: item que não se lê vira "Diagnóstico em formato ilegível" (com o texto bruto), nunca é descartado; número vira texto.

### MENOR

**M1 — Valores sem letras ou fora de formato na alergia** · P1
"?" (só símbolo) vira "Nenhuma registrada"; `clinico` gravado como texto ("Alergia a dipirona") também mostra "Nenhuma registrada"; `true`, `123` e `"null"` aparecem crus na pílula ("Alergias · true"). Evidência: `isPlainNegation` trata texto sem palavras como vazio (`allergyConflict.js:135`); `PatientRecordScreen.jsx:169` só troca `clinico` nulo. Correção: texto sem letras e `clinico` não-objeto viram "Alergia em formato ilegível"; booleano ou número, idem.

**M2 — Diagnóstico em texto com vírgula vira dois códigos** · P2
"G40.9 Epilepsia, não especificada; F90.0 TDAH" mostra o chip "não especificada" como se fosse um código (cabeçalho e card). `diagnoses.js:12` corta em vírgula. Correção: cortar só em `;` e quebra de linha quando o texto traz código CID.

**M3 — Datas absurdas aceitas como legíveis** · P4
Consulta em 01/01/1900 (anterior ao nascimento, 2014): cabeçalho "em acompanhamento desde 01/01/1900 (há 126 anos)" e a trilha comprimida contra a borda direita (captura `s03-300.png`); "2026-02-30" vira 02/03 sem aviso. `PatientRecordScreen.jsx:200` só filtra o que `Date.parse` recusa. Correção: tratar como ilegível (e contar no aviso) consulta anterior ao nascimento ou data que não fecha dia e mês.

**M4 — Anexo com data ilegível vira o "mais recente" da pasta** · P2
Com `realizadoEm: 'data ruim'`, o card "Neurofisiológico" mostra "—" em vez de 05/09/2026. `ProfileColumn.jsx:271` ordena por texto ('d' > '2'). Correção: ordenar por `timeOf()` com o ilegível no fim, como já fazem as escalas.

**M5 — Falha das consultas apaga pendências em silêncio; responsável com id numérico vira "Nenhum cadastrado"** · P4, P2
Com a leitura de consultas falhando, a pílula "Documentos" perde o "N a emitir" sem marcar "!" (`PatientRecordScreen.jsx:306-310` calcula a pendência sobre a lista vazia) e "Linha do tempo" também fica sem "!" (o painel avisa). `responsaveis: 12345` mostra "Nenhum cadastrado" sem aviso (`guardianIdsOf`, `:40-44`, só aceita lista e texto). Correção: com consultas ilegíveis, "Documentos" e "Linha do tempo" ganham "!"; número vale como id.

**M6 — Nome de medicação sem espaço estoura a coluna e abre rolagem lateral** · P2
Princípio ativo com 300 caracteres seguidos: o texto passa da borda do card e da janela a 1440 px (`#conteudo` com rolagem lateral; captura `s09-meds.png`). No painel de Medicações não acontece. A lista de `overflow-wrap: anywhere` (`patient-record.css:1314-1321`) não inclui `.pr-meds`. Correção: `.pr-meds strong, .pr-meds span { overflow-wrap: anywhere; }`.

**M7 — Modelo que não baixa deixa um WebGL vivo dentro da faixa de alertas** · P1
Com o GLB bloqueado, aparecem a mensagem e "Tentar de novo" (correto), mas o canvas da cena continua no DOM, com contexto vivo, 576×72 px, `position: absolute` e `pointer-events: auto`, dentro de `.an-alerts`. `onError` (`AnatomyStage.jsx:331-334`) não chama `scene.dispose()` (o `onContextLost` chama), e o React reaproveita o `<div>` da cena (`:627`) como o `<div className="an-alerts">` do ramo de falha (`:612`). Hoje não cobre o "Remarcar" (conferido com `elementFromPoint`), mas mantém um contexto WebGL e os ouvintes de órbita. Correção: `dispose()` no `onError` e `key` distinta no host do canvas.

**M8 — "Agendar retorno" aparece sem permissão de agenda** · P2 (código, não testado)
`PatientRecordScreen.jsx:450` passa `onSchedule` sempre, e a pílula "Sem retorno agendado — agendar retorno" aparece para todos; a faixa respeita `can.write('agenda')` (`:351`). Guia §7: sem permissão, o botão some. Correção: o mesmo `can.write('agenda') ? … : null` da faixa.

**M9 — "Tentar de novo" dentro do painel não diz que está tentando** · P3
`RecordUnavailable inline` (`PatientRecordScreen.jsx:495`) chama `load`, não `retry`: sem "Lendo de novo…", sem `aria-busy`, e a mensagem do painel não muda se falhar outra vez (a faixa do topo muda para "Ainda não"). Correção: passar `retry`.

**M10 — `allergyConflict(null)` lança exceção** · P2
Função pública: `allergyConflict(null, ['Dipirona'])` dá `TypeError` (`allergyConflict.js:249`). Uma medicação nula na loja derruba a coluna de medidas inteira para o `ErrorBoundary`. Correção: `medication ?? {}`.

**M11 — Plural no rótulo da ponta da faixa** · P4
"Mostrar mais 1 consultas posteriores (1 ao todo)" (`VisitRail.jsx:166`). Correção: singular quando for 1.

## O que passou (para não reabrir)

- **Alergia sempre à vista**: zero falhas em 10 janelas × todas as posições de rolagem, na visão geral, no painel (que rola por dentro e pela página) e nos dois diálogos (corpo, editor e folha rolando). A 320×256 a faixa grudada e o cabeçalho do painel seguram a alergia; os botões "Registrar" e "Assinar e emitir" ficam ao alcance em toda janela.
- **Negação**: nenhum alérgeno engolido; "Nega alergia a dipirona" aparece (decisão), "Não informado" mostra "Nenhuma registrada" (decisão), as 11 negações seguidas de afirmação avisam.
- **Falha de leitura**: cada loja que falha diz que falhou (faixa do topo com "Tentar de novo" e "Ainda não", "!" na pílula, texto honesto no card, painel sem botão de criar); paciente ilegível mostra "Não foi possível ler o prontuário"; id inexistente mostra "Paciente não encontrado". Recupera depois da nova tentativa.
- **300 consultas**: faixa com janela de 80 cápsulas, "Anteriores +183" e "Posteriores", uma parada de Tab, Home/End/setas, foco vai à cápsula nova; 1.126 nós; 5 datas ilegíveis contadas no aviso; "Status não reconhecido" para status desconhecido.
- **Teclado e pilha**: pílulas com tabindex móvel, Enter abre, Esc fecha e devolve o foco à pílula; modal prende o Tab nos dois sentidos; Esc fecha só o de cima em painel → confirmação → identidade, e o foco volta a "Fechar", depois a "Assinar", depois à pílula "Evoluções"; rascunho da prescrição volta com a marca "Revisei" desmarcada; lista de estruturas, popover (foco entra, Esc devolve à lista, não cobre a alergia), camadas com `aria-pressed` e aviso quando todas estão ocultas, controles de 44 px.
- **3D**: contexto perdido mostra "O modelo 3D parou de responder" e "Recarregar modelo", que recupera; sem WebGL desde o início, a lista de 30 estruturas com a descrição (390 e 1440); modelo que não baixa mostra a mensagem certa e "Tentar de novo"; alergia e faixa ficam em todos os casos.
- **Movimento reduzido**: painel sem animação (0,001 s contra 0,32 s), autorrotação e revelação desligadas no código.
- **Árvore AX**: um h1, h2 por card, regiões nomeadas, nenhum controle focável dentro de `aria-hidden` sem `inert`; contraste da pílula de alergia 5,7:1 (rótulo) e 17,3:1 (texto).
- **Rolagem lateral a 320 px**: vem de `.topbar__right` do shell (fora de escopo); o prontuário em si não transborda (exceto M6).
