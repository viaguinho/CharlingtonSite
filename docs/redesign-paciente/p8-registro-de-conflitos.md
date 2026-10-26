# Passada 8 — registro único de conflitos (prontuário do paciente)

Reúne as duas críticas de contexto limpo da 1ª leva (26/10/2026), antes de qualquer correção desta passada. Fontes: `critica-p8-dados.md` (D8) e `critica-p8-robustez.md` (R8). As lentes fidelidade, sistema e desempenho ficam para a 2ª leva, depois do reinício da janela de uso (teto combinado com o dono: 80% de 5 horas; uma leva de dois críticos custa cerca de 24%).

## Vereditos da 1ª leva

| Peça | Dados | Robustez |
|---|---|---|
| P1 Palco | REPROVA (D8-3) | REPROVA (R8-4, R8-5) |
| P2 Colunas | REPROVA (D8-1, D8-5, D8-6) | REPROVA (R8-6) |
| P3 Seções e modais | REPROVA (D8-1, D8-2, D8-4, D8-6, D8-7) | REPROVA (R8-1, R8-2, R8-3, R8-7) |
| P4 Faixa e estados | REPROVA (D8-3) | REPROVA (R8-8) |

Contagem: 1 BLOQUEIA (D8-1) · 14 GRAVE (D8-2…D8-7, R8-1…R8-8) · 22 MENOR · 9 suspeitas. Nenhuma duplicata entre as duas lentes, mas D8-3 e R8-5 tocam o mesmo estado de consentimento: um é regra de horário, o outro é leitura que falhou.

## Decisão por item

| ID | Problema | Decisão |
|---|---|---|
| D8-1 | Aviso de alergia não reconhece "AAS" nem marcas com dipirona; o silêncio parece liberação | Corrigir: "aas" e marcas comuns nas famílias; o aviso genérico diz que a checagem só cobre nomes conhecidos. Tabela segue para revisão médica do dono |
| D8-2 | Evolução assinada sem o dia da consulta | Corrigir: "Consulta de dd/mm/aaaa hh:mm · assinada em …" nas Evoluções e na Linha do tempo |
| D8-3 | Alerta de teleconsulta sem consentimento some quando a teleconsulta atrasa ou começa | Corrigir: vale para toda teleconsulta de hoje em aberto |
| D8-4 | Suspensão de medicação não aparece na Linha do tempo | Corrigir: evento "Suspensão de X · motivo" |
| D8-5 | Faixa "dentro do esperado" do gráfico de escala pintada com a cor do risco | Corrigir: faixa neutra/verde fixa |
| D8-6 | Data futura aceita em escala e exame | Corrigir: `max` hoje e recusa, como na suspensão |
| D8-7 | Anexo grava o nome original do arquivo | Corrigir: não persistir `nomeArquivo`; título não vem do nome do arquivo |
| R8-1 | Clique duplo num marco com releitura lenta cria 2 registros | Corrigir: trava por marco até a releitura terminar |
| R8-2 | Foco cai no `<body>` ao gravar; erro só em toast educado | Corrigir no `Overlay.jsx` (trap recoloca o foco no diálogo) e erro de gravação anunciado como alerta |
| R8-3 | A 400% de zoom o painel deixa 12 px de conteúdo | Corrigir: janelas baixas soltam a barra de seções e reduzem o cabeçalho |
| R8-4 | Perda do contexto WebGL deixa o palco vazio sem aviso | Corrigir: ouvinte de `webglcontextlost`/`restored`, lista de reserva e "Recarregar modelo" |
| R8-5 | Alerta falso de consentimento / "Sem desfecho" some quando a leitura falha | Corrigir: pílula neutra "não foi possível verificar" |
| R8-6 | "Responsável: Nenhum cadastrado" quando a leitura falha | Corrigir |
| R8-7 | "44 a emitir" quando documentos não leem; Linha do tempo sem aviso | Corrigir |
| R8-8 | Paciente inexistente redireciona calado e prende o Voltar | Corrigir: tela "Paciente não encontrado" |
| D8-9, D8-10, D8-11, D8-12, D8-13 | Marca comercial; mês errado de data pura; texto de revogação; "Relacionado ao paciente"; rótulos | Corrigir os baratos; D8-8 (glifo de ordinal) se couber |
| R8-9…R8-15 | GLB sem retry; alvos 44 px; forced-colors; foco na cápsula; anúncio de carga; datas inválidas; quebra de texto | Corrigir 10, 11, 13, 14, 15; 9 e 12 só se couberem |
| S5 | "Tentar de novo" duas vezes pode sobrescrever com resposta antiga | Corrigir: guarda por número de leitura |

## Fora do escopo desta página (avisar o dono)

| Item | Por quê |
|---|---|
| Formulário "Novo paciente" sempre falha com "Registro não encontrado." | Defeito de 06/10 em `PatientForm.jsx` (decide `update` ou `create` por `g.id`, mas `newGuardian()` já nasce com `id`). Não é a página do prontuário e o modal de ficha foi declarado fora de escopo; corrigir só com a ordem do dono |
| S2 paciente com exclusão lógica abre normal; S3 documento sem responsável ilegível; S4 contexto vazado quando o GLB falha | Não reproduzidos; ficam anotados |
| D8-13 "Teleconsulta sem chegada" e nomes das seções | Tratar junto com o shell só se o dono pedir |

## Aplicado (lote 1 da passada 8, sem commit)

Build compila (`vite build`, 8894 módulos). Verificado no navegador com o adaptador em memória: leitura que falha em consentimentos, consultas, responsáveis, documentos e Linha do tempo; paciente inexistente; perda de contexto WebGL; painel a 320×256; faixa de escala; correspondência de alergia por script (Aspirina, Lisador, Buscopan Composto e Dorflex avisam para "AAS"/"Dipirona"; "Isaas" e Paracetamol não).

| ID | O que mudou |
|---|---|
| D8-1 | `allergyConflict.js`: "aas", Melhoral, Somalgin, Cafiaspirina na família do ácido acetilsalicílico; Dorflex, Lisador, Buscopan Composto, Magnopyrol, Conmel na da dipirona; sigla curta só vale como palavra inteira. `AllergyNotice` diz "Sem correspondência automática. A checagem só reconhece nomes e marcas conhecidos" quando nada bate |
| D8-2 | Evoluções e Linha do tempo: "Consulta de dd/mm/aaaa hh:mm · assinada em …"; a Linha do tempo agrupa pela data da consulta; o vínculo da evolução traz o tipo da consulta; o adendo grava e mostra o autor |
| D8-3 | `patientStates`: o alerta de teleconsulta sem consentimento vale para qualquer teleconsulta em aberto de hoje em diante (atrasada, na recepção, em atendimento) |
| D8-4 | Linha do tempo ganha "Suspensão de X" com o motivo |
| D8-5 | Faixa do gráfico de escala fixa na cor do intervalo esperado (verde) |
| D8-6 | `max` = hoje e recusa em Registrar aplicação e Data de realização do anexo |
| D8-7 | Anexo não guarda `nomeArquivo` e o título não vem do nome do arquivo (registros antigos mostram "Exame sem título") |
| D8-8 | Ordinal (º, ª) vem de fonte do sistema na página |
| D8-9, D8-11…D8-13 | Marca comercial entre parênteses; texto de revogação por finalidade; botão "Registrar" do consentimento deixa de ser vermelho; "não iniciada" no lugar de "sem chegada" na teleconsulta; título do bloco do popover reescrito |
| D8-10, R8-14 | Datas puras sem conversão de fuso (`timeOf`), ordenação por instante, grupo "Sem data", escala com data ilegível nunca é a "atual", instrumento fora do catálogo ganha card |
| R8-1 | Marcos: trava por marco até a releitura terminar (`await reload()`) |
| R8-2 | `Overlay.jsx`: a armadilha de foco recoloca o foco no último controle quando ele cai no `<body>`; toast de erro com `role="alert"` |
| R8-3 | Janela até 520 px de altura: barra de seções e cabeçalho do painel deixam de grudar |
| R8-4, R8-9 | `webglcontextlost` leva à lista de reserva com "Recarregar modelo"; erro de carga diz "Confira a conexão" e oferece "Tentar de novo" |
| R8-5 | Pílulas neutras "Consultas não lidas" e "Consentimento não lido" quando a leitura falha |
| R8-6, R8-7 | "Não foi possível ler o cadastro" nos responsáveis; pílula de documentos sem pendência inventada; aviso dentro da Linha do tempo quando uma de suas fontes falha |
| R8-8 | Tela "Paciente não encontrado" com "Ir para Pacientes" (sem prender o Voltar) |
| R8-10, R8-11, R8-15 | Área sensível de 44 px nas camadas em coluna (toque); contorno dos botões de vidro em alto contraste; quebra de texto sem espaço |
| R8-13, S5 | "Carregando o prontuário…" em `role="status"`; "Tentar de novo" mostra "Lendo de novo…" e, se falhar de novo, diz "Ainda não foi possível"; só a última leitura vale |

## Ainda aberto

- R8-12 (foco na cápsula de origem ao abrir e fechar o painel), D8-13 (nome da seção "Exames" com três rótulos, adendo sem autor em registros antigos), S1 (contraste do link "7 arquivos", 4,24:1 no pior ponto do fundo), S2 a S4.
- 2ª leva de críticos (fidelidade e sistema) e verificação das correções por críticos de contexto limpo: depois do reinício da janela de uso.
- Revisão médica da tabela de equivalências de alergia (agora com siglas e marcas combinadas).
- Defeito antigo fora da página, aguardando o dono: formulário "Novo paciente" (`PatientForm.jsx`).
