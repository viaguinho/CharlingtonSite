# Passada 7 — registro único de conflitos (prontuário do paciente)

Reúne as cinco críticas de contexto limpo (26/10/2026), antes de qualquer correção. Fontes: `critica-p7-dados.md` (D), `-sistema.md` (S), `-fidelidade.md` (F), `-robustez.md` (R), `-desempenho.md` (G). Evidência, método e reprodução de cada achado ficam nos relatórios de origem.

## Veredito das cinco lentes

| Peça | Dados | Sistema | Fidelidade | Robustez | Desempenho |
|---|---|---|---|---|---|
| P1 Palco | REPROVA | REPROVA | REPROVA | APROVA | REPROVA |
| P2 Colunas | REPROVA | REPROVA | REPROVA | REPROVA | REPROVA |
| P3 Seções e modais | REPROVA | REPROVA | REPROVA | REPROVA | REPROVA (só escala) |
| P4 Faixa e estados | REPROVA | REPROVA | REPROVA | REPROVA | APROVA |

Contagem bruta: 3 BLOQUEIA (D1, D2, R1) · 40 GRAVE · 55 MENOR · 23 suspeitas. Depois de fundir duplicatas: cerca de 75 problemas distintos.

## Correções às críticas (o que NÃO é defeito)

- **D11** (duas leituras de auditoria por abertura) é artefato do StrictMode do servidor de desenvolvimento. No build há 1 gravação (G, tabela de medidas). Descartado.
- **Pastas abaixo da dobra**, textos "O que faz" e o que é do shell global (dock, barra do topo) seguem fora do veredito, como decidido.

## Tensões entre críticos e como resolvo

| Tensão | Decisão |
|---|---|
| G6 pede menos vidro; F12 e S13 pedem mais translucidez e receita única | Manter vidro em tudo que flutua (decisão do dono). Reduzir o custo sem tirar o vidro: blur de 24 px para 16 px, sem vidro dentro de vidro (`gf-front`, `gf-key-face`), receita única. A pasta fica translúcida (F12) com o blur menor. |
| G4 pede palco a menos quadros; a rotação sozinha é parte da cena | Manter a rotação até a primeira interação, parar depois de alguns segundos e desenhar a ~30 fps em repouso. |
| F7 quer coração, artérias e crânio visíveis em repouso; a régua 2 proíbe área sólida em repouso | Plexo fino e tingido em repouso (vermelho fraco no coração e nas artérias, grafite fraco no crânio), sem preenchimento. O sólido continua só no hover. |
| F1/F2/S5 querem as pílulas e as camadas fora da cabeça; a alergia nunca pode sumir | A alergia fica sempre inteira. Os demais alertas passam a um chip "+N" a partir do 3º, e a fileira de camadas sai da silhueta da cabeça. |
| D8 pede sinônimos de fármacos (decisão clínica) | Tabela mínima e conservadora, marcada para revisão médica do dono. Falso positivo é preferível a falso negativo, mas o dono confere a lista. |

## Fora do meu alcance sem o dono

| Item | Por quê |
|---|---|
| R4 skip link leva ao Dashboard; R18 barra do topo a 320 px; R20 fundo animado em movimento reduzido; R21 itens do shell | Shell global é intocável (guia §0.1). |
| G4 (parte do fundo `shell__bg` que anima atrás do painel); G1 (parte do fundo que perde o contexto) | O fundo é do shell. Corrijo a causa dentro do prontuário (a sonda que vaza) e deixo o resto como pedido. |
| G9/S3 cabeçalhos de cache, G11 favicon de 71 KB | Configuração de host e `admin.html`, fora da página. |
| D25 folha impressa da prescrição sem alergias | Mexe no papel timbrado, preservado pelo dono. |
| S17 modais opacos, R23 combobox de CID | `components/ui/` fora de escopo. |
| Somente leitura (`can.write = false`) | Não testado; só o papel de médico entra no prontuário. Confirmar com um usuário de recepção. |

## Registro por onda de correção

### Onda A — segurança clínica e integridade (primeiro)

| ID | Sev. | Problema |
|---|---|---|
| D1 | BLOQUEIA | "Adicionar adendo" nunca grava em evolução assinada (repositório recusa o update de registro travado). |
| D2 | BLOQUEIA | Prescrição aceita "Dipirona", Novalgina ou Metamizol para paciente alérgica sem aviso no item. |
| R1 | BLOQUEIA | Falha de leitura de medicações, consultas, escalas, marcos, anexos ou consentimentos aparece como estado vazio ("Nenhuma medicação registrada"), sem aviso. |
| D3 | GRAVE | Alergia "Nega alergias", "nenhuma", "NKDA" ou vazia vira alerta vermelho. |
| D8 | GRAVE | Conflito alergia × medicação só pega substring literal (Metamizol, Novalgina, amoxicilina × penicilina passam). |
| D5, R8 | GRAVE | Duplo clique grava duas vezes (remarcar, consentimento, anexo, medicação, suspender, nova informação). |
| D6, S18 | GRAVE | "Registrar consentimento" e "Registrar nova informação" gravam com um clique, sem confirmação. |
| D7 | GRAVE | Suspender medicação grava motivo vazio e não permite informar a data. |
| D9 | GRAVE | Escala sem escore mostra "null/20" e plota um ponto em 0. |
| D10 | GRAVE | Anexo salva com título vazio ou só espaços. |
| D12 | GRAVE | Prescrição assinada não aparece em "Medicações em uso" (Cecília, João Pedro). |
| D4 | GRAVE | Estados de tempo (próxima, atrasado, sem desfecho, "há N dias") não se atualizam com a página aberta. |
| R2 | GRAVE | Falha ao ler o paciente deixa a área em branco, sem mensagem nem nova tentativa; promessa sem tratamento. |
| R3 | GRAVE | Data de consulta inválida (RangeError em `VisitRail`) ou paciente sem `clinico`/`perfilSensorial` derruba o prontuário inteiro, alergia incluída. Falta ErrorBoundary por região. |
| R7, D13 | GRAVE | Idade de recém-nascido com 1 dia a menos; nascido hoje mostra "—"; nascimento futuro sem aviso. |
| R6 | GRAVE | Nome de 78 caracteres sem espaço corre por trás de "Editar ficha" e "Emitir documento". |
| D14, D16–D19, D21–D24 | MENOR | Teleconsulta sem desfecho sem aviso; "Outro motivo" sem campo; auditoria genérica; anexo sem arquivo exibido como existente; escore fracionado; plural "0 de 1 realizadas"; rótulos; pílula Documentos esconde o que existe; horário sugerido já passou. |
| D15, R16, R17, R22, R23 | MENOR | "Fechar" descarta emissão sem perguntar; cartões sem limite de altura; id inexistente redireciona calado; "Invalid Date"/NaN; rascunho de evolução perdido. |

### Onda B — palco, layout e acabamento

| ID | Sev. | Problema |
|---|---|---|
| F1, F2, S5, R15 | GRAVE | Pílulas de alerta e fileira de camadas cobrem a cabeça e o cérebro (40% a 1280, 60% a 1180; 5 alertas descem até o pescoço; 8 alergias). |
| F7 | GRAVE | Em repouso, coração, artérias e crânio não aparecem; só o cérebro tem cor. |
| F3 | GRAVE | Camada desligada vira a mesma barra diagonal nos cinco botões. |
| F4 | GRAVE | Fechar o popover leva o foco ao `<main>` e um anel azul contorna a página. |
| F5, F16, D20 | GRAVE | Controles 4–6 px fora da linha de base da faixa (mecanismo M7 da régua) e cortam a faixa no meio da palavra com 5 consultas. |
| F6 | GRAVE | Rótulo do pino "Artérias" sobrepõe o "Hoje". |
| F8 | GRAVE | Marcadores do gráfico das Escalas saem em elipse. |
| S1 | GRAVE | Tecla "+" das pastas recebe foco sem indicador (contraste 1,1:1). |
| S2 | GRAVE | "Remarcar" mede 83×31 px (alvo mínimo 40/44). |
| S3 | GRAVE | Texto de apoio 14 px com 4,1–4,3:1 no pior ponto com o painel aberto; link "7 arquivos" 4,23:1. |
| S8 | GRAVE | Nome da folha da pasta a 21,64 px (fora da escala) e cortado sem `title` em 768 e 390. |
| F12 | MENOR | Frente da pasta opaca: as folhas não aparecem através do vidro. |
| F9–F11, F13–F15, F17, F18, S4, S6, S7, S9–S16, S19 | MENOR | Separador abrindo linha de alergia; busto encolhe abaixo de 1440; cabeçalho do painel come 39% do celular; zoom e vista de topo; meta desalinhada; barra de seções sem aviso de rolagem; breadcrumb; ápice do coração atrás da cápsula; palco mais estreito em 1440 que em 1439; alvos de 40–43 px no celular; tabular-nums por classe; espaçamentos fora da escala; 5 estilos de foco; vidro com receitas diferentes; raios; faixa de alergia duplicada de 1024 a 1179; literais em `charts.css`. |

### Onda C — desempenho

| ID | Sev. | Problema |
|---|---|---|
| G1 | GRAVE | `hasWebGL()` cria um contexto WebGL por visita e nunca o libera; na 14ª visita o fundo do painel morre. |
| G4 | GRAVE | Tela nunca fica em repouso: palco a 60 fps (94 chamadas, 108 mil triângulos por quadro) para girar 2°/s. |
| G6 | GRAVE | 36 elementos com `backdrop-filter: blur(24px)` (87% da tela) sobre fundo que anima; sem o vidro a GPU cai 57–72%. |
| G3 | GRAVE | `plexoGraph` bloqueia a thread principal 210 ms (940 ms a 4×) e refaz a cada visita. |
| G2 | GRAVE | 1ª visita: cascata rota → palco → cena → modelo com dois vazios de ~300 ms; busto em 1,0 s (3,2 s em 4G + CPU 4×). |
| G5 | GRAVE (escala) | Seções sem virtualização: 1.000 itens = 14.559 nós, 469 ms. Dados reais (≤ 30) abrem em 10–33 ms. |
| G7, G8, G10, G12, G13 | MENOR | Miniatura é o arquivo original (6 MB de RSS cada); 12 chunks de diálogos entram com a rota; `list()` lê a loja inteira; faixa com 300 consultas; vazamento lento de 2,7 nós por visita. |

### Onda D — acessibilidade e teclado

| ID | Sev. | Problema |
|---|---|---|
| R5 | GRAVE | Adendo, Registrar medicação e Novo agendamento perdem o foco ao fechar. |
| R9 | GRAVE | Botões com o mesmo nome acessível sem contexto ("Suspender" ×2, "Revogar" ×2, "Registrar consentimento" ×3, "Reaplicar" ×3). |
| R10 | GRAVE | Com `forced-colors` somem a pílula ativa e as bordas dos cartões. |
| R11 | GRAVE | Faixa com 300 consultas tem 303 paradas de Tab, sem setas. |
| R12–R14, R19, R21, R24 | MENOR | Esc devolve o foco à pílula e não ao gatilho; erro do modelo culpa o navegador sem "tentar de novo"; perda de contexto sem mensagem; texto ignora o tamanho de fonte do navegador; lista de alertas sem `listitem`, H1 → H3; alvos de 40 px no celular. |

## Sujeira na base de verificação (limpar antes de reverificar)

Clara (`16df5f04…`) ganhou 3 consentimentos (ids `728cad0a…`, `cdd79a9a…`, `63185336…`: "Tratamento clínico" ×2 e "Comunicação por e-mail") e 1 registro de informação ao responsável, todos gravados por cliques de críticos em botões que gravam na hora, mais linhas de auditoria de leitura. É base local de verificação, não a do dono.

## Suspeitas a confirmar depois

Leitura que nunca termina (S1 R), cofre bloqueado no meio do uso, leitor de tela real, check-in `confirmado` sem "Na recepção", base legal ignorada pela tela, remarcar sobre horário ocupado, baixar exame, clique no coração a 1366/1280/1920, popover do cerebelo a 1920, foto de celular como miniatura, GPU real a DPR 2, cache de `/assets/*` no host.
