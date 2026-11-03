# Crítica da passada 5: dados e acabamento

> Crítico de dados e acabamento, com contexto limpo (sem ler críticas anteriores nem `design-loop.md`). Data: 22/10/2026.
> Régua: `guia.md` §0, §1, §4 e §7, mais `PRODUCT.md`. A pergunta: tudo o que a tela diz é verdadeiro, bate entre os lugares onde aparece, e cada ação faz o que diz?

## Método

- Usei a tela real pelo `node .claude/design-loop/cdp.mjs` (`shot` e `eval`), com o servidor em `localhost:5173` e a base LOCAL de verificação. Capturas e scripts ficaram só no scratchpad da sessão.
- Pacientes reais da base:
  - Clara Macedo Farias: alergia, sem desfecho, 1 falta, exames, escalas, medicações e marcos.
  - Rafael Siqueira Bastos: sem desfecho e sem consentimento de teleconsulta.
  - Pedro Toledo Freire: 3 faltas, 2 delas de laudo.
  - Gael Toledo Freire: o primeiro atendimento concluído foi uma emissão de laudo.
  - Cecília Amaral Duarte: alergia e uma prescrição emitida.
  - Felipe Andrade Coelho: laudo a emitir mais um documento emitido.
  - Ana Beatriz Moraes: alergia e nenhuma consulta concluída.
  - Joaquim Peixoto Aguiar: base para os estados montados em memória.
- Para conferir cada número da tela, li os dados brutos pelo `repository.list` (que não gera auditoria) e comparei com o DOM.
- Estados que a base não tem foram montados trocando o adaptador **em memória, só leitura, só na aba**. O `repo.useAdapter` recebeu um invólucro do `idbAdapter` que só altera `get`/`list`, e a rota foi remontada.
  - 5 alertas ao mesmo tempo (no Rafael): 4 alergias, sem desfecho, atrasado hoje, na recepção e sem consentimento de teleconsulta.
  - Nome social, 3 responsáveis e próxima consulta futura (no Joaquim).
  - Sem WebGL: `getContext('webgl*')` devolvendo `null` e rota remontada.
- Nada foi gravado. Nenhum formulário foi salvo, nenhum arquivo enviado. Supabase e painel do dono não foram tocados.
- Larguras medidas: 1440×900, 1366×768, 1280×800, 1180×800, 1100×800, 1024×768 e 390×844 (com toque).
- Interações testadas:
  - Palco: teclado da lista de estruturas (setas, Home/End, Enter, Esc), popover e as linhas "Relacionado ao paciente", camadas, fallback sem WebGL.
  - Navegação: as 8 pílulas (conteúdo de cada painel contra a contagem), Esc com retorno do foco, voltar do navegador, `?secao=`, `inert`/`aria-hidden` no celular.
  - Modais clínicos: Remarcar, Emitir documento, Nova evolução, Registrar aplicação, Registrar medicação (digitando "Dipirona" sem salvar), pré-visualização de exame e folha de documento emitido.
  - Desempenho: contei as chamadas de desenho do WebGL com o painel aberto e fechado.
- Não testado: sem permissão de escrita (exige trocar a sessão), `prefers-reduced-motion`, esqueleto de carga e falha ao decifrar miniatura.

## Vereditos

| Peça | Veredito | Maior falha |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | Com mais de 2 alertas, os seguintes ficam fora da vista numa faixa horizontal sem barra: com 5 alertas, a 1440 px, "Atrasado", "Na recepção" e "Sem consentimento" não aparecem. A faixa de consultas também some com cápsulas inteiras (a falta da Clara, a próxima consulta) e deixa um vazio no lugar. |
| P2 Colunas | **REPROVA** | O cabeçalho e a trilha de acompanhamento dão dois "desde" diferentes para o mesmo paciente: Gael aparece com "desde 25/08/2026" num e "desde 08/10/2026" no outro. |
| P3 Navegação e seções | **REPROVA** | Ao abrir uma **prescrição emitida** (folha do documento) ou a pré-visualização de um exame, a alergia some por trás do modal. |

## Falhas, da mais grave à menor

### 1. Ao abrir a prescrição emitida, a alergia some (P3, grave)
- **Passos:** abra Cecília Amaral Duarte (`#/pacientes/39e6435d-e6d9-4cb5-9e44-cc8324e97437?secao=documentos`) a 1440×900 e clique em "Prescrição médica nº 2026/0001".
- **Evidência:**
  - A folha lateral "Prescrição médica" (Levetiracetam, Ácido fólico) cobre a página. As três instâncias de "Alergias" que existem (faixa, palco, cabeçalho do painel) ficam sob o `overlay__backdrop`: `elementFromPoint` devolve o fundo, não a pílula.
  - Nenhuma `AllergyNotice` dentro da folha. Captura: `scratchpad/p5/cecilia-prescricao-1440.png`.
- **Por que pesa:** é justamente o momento de revisar ou reimprimir uma prescrição. A regra "alergia nunca some, nem com modal aberto" é quebrada no documento mais sensível. Os modais de emissão, remarcação, evolução, escala e medicação têm a faixa; a folha do documento emitido (`DocumentSheet`, em `DocumentsView`) não tem.

### 2. Os alertas além do 2º ficam fora da tela (P1, grave)
- **Passos com dado real:** abra Rafael (`#/pacientes/4579401a-c511-4131-a339-7588293467c6`) a 1440 ou 1280. O 2º alerta já sai cortado ("Sem consentimento p…"):
  - A 1440 a `ul.pr-alerts` tem `scrollWidth` 681 para `clientWidth` 544, com `overflow-x: auto` e `nowrap`.
  - A 1280, 681 para 472.
  - Captura: `scratchpad/p5/rafael-1440-alerts.png`.
- **Passos com 5 alertas (adaptador em memória):** `scratchpad/p5/js/swap5.js` no Rafael, a 1440×900.
  - A faixa mede 1622 px dentro de uma janela de 544. Só a alergia aparece inteira e "Sem desfecho" fica pela metade.
  - "Atrasado · Hoje 13:51, sem chegada", "Na recepção" e "Sem consentimento para teleconsulta" ficam em x = 1157 a 2074, fora do palco (que termina em 1020). Captura: `scratchpad/p5/five-1440.png`.
  - A 1024 o mesmo acontece na faixa da barra de seções (1886 para 976): "Atrasado" fica pela metade e os outros dois não aparecem.
- **Por que pesa:** um alerta vermelho de "Atrasado hoje" invisível, num desktop com mouse e sem barra de rolagem, é um estado real escondido. O guia (§4.3) pede pílulas **empilhadas** e o §7 exige o estado com 5 ou mais alertas.

### 3. A faixa de consultas esconde cápsulas inteiras e contradiz a trilha e a pílula da próxima consulta (P1, média)
- **Passos:** abra Clara a 1440×900. A trilha diz "1 falta · 1 sem desfecho", mas a faixa mostra só "16 set Concluído" e "07 out Sem desfecho", com um vazio de cerca de 90 px à esquerda.
- **Evidência:**
  - A lista mede 407 para uma janela de 380 (`scrollLeft` 27). A cápsula "Retorno em 25/08/2026, Faltou", 3 px fora da borda, recebe `data-clipped` e `opacity: 0`.
  - Com a próxima consulta montada em memória (Joaquim, `swapJ.js`): a pílula azul diz "Próxima 28/10/2026 14:30" e a trilha diz "próxima 28/10/2026", mas a cápsula "Retorno em 28/10/2026, Confirmado" fica oculta na faixa a 1440 (403 para 380).
  - A 1280 acontece o inverso: a primeira consulta some e a futura aparece.
  - Pedro: a trilha diz "3 faltas", e a faixa mostra 1.
  - Capturas: `clara-1440-full.png`, `joaquim-1440.png`, `pedro-1280.png`.
  - No fallback sem WebGL, sem os controles `+ − 3D`, as 3 cápsulas da Clara cabem e aparecem (`nogl-1440.png`). Os controles roubam ~25 px, e a regra "cortada some inteira" transforma esses 25 px num dado ausente.

### 4. A pré-visualização de exame cobre a alergia (P3, média)
- **Passos:** abra Clara em `?secao=anexos` (ou clique numa folha da pasta na visão geral) e clique em "RM de crânio — controle".
- **Evidência:** o modal "RM de crânio — controle" cobre tudo e as três instâncias de "Alergias" ficam sob o fundo. Captura: `scratchpad/p5/preview-1440.png`.
- O risco clínico é menor que o da falha 1, mas a regra do brief não admite exceção para modal.

### 5. Dois "em acompanhamento desde" para o mesmo paciente (P2, média)
- **Passos:** abra Gael Toledo Freire (`#/pacientes/dfd69e7d-2489-4a94-b545-6ec89a77ef52`) a 1440.
- **Evidência:**
  - O cabeçalho diz "em acompanhamento desde 25/08/2026 (há 8 semanas)". A trilha do perfil diz "desde 08/10/2026" (e o `aria-label` diz "Acompanhamento desde 08/10/2026").
  - A causa: `firstVisit` conta a emissão de laudo concluída, e a trilha exclui laudo do eixo.
  - Na Clara acontece o inverso: o cabeçalho diz 16/09/2026, e o `aria-label` da trilha diz "desde 25/08/2026", porque o eixo começa na falta.
  - O comentário do código afirma que "as duas leituras batem"; na tela não batem.
  - A base tem 6 pacientes com o primeiro concluído sendo laudo: Felipe, Benício, Davi, Gabriela, Lorenzo e Gael.

### 6. A trilha não marca a próxima consulta (P2, baixa)
- **Passos:** Joaquim com a próxima consulta montada em memória, a 1440.
- **Evidência:** o eixo da trilha se estende até 28/10 (o `end` inclui `upcoming`), mas no SVG não há anel nem traço nessa data, só o traço de "hoje". O guia §4.2 pede "o próximo agendamento é um anel". A próxima consulta só aparece no rodapé, em texto. Captura: `joaquim-1440.png`.

### 7. "2º ano" aparece como "2o ano" (P2, baixa, acabamento)
- **Passos:** Clara, card "Perfil sensorial", linha "Escola".
- **Evidência:** o dado é `2º ano` (U+00BA), mas o glifo da Urbanist sai como um "o" de corpo inteiro na linha de base: lê-se "2o ano" a 1440, 1024 e 390. Recorte: `scratchpad/p5/escola.png`.

### 8. Sem alergia registrada, a visão geral não diz nada (P1/P3, baixa)
- **Passos:** abra Pedro ou Rafael (sem alergia registrada).
- **Evidência:** o palco e a faixa não mostram nada sobre alergia. Os modais clínicos dizem "Nenhuma alergia registrada. Confirme com o responsável…", mas a tela principal fica calada, e ausência de pílula não distingue "sem alergia" de "não perguntado". O PRODUCT.md ("dizer o que o sistema sabe") e a lógica da frase de segurança das medicações pedem a mesma honestidade aqui.

### 9. A descrição do mesmo CID muda entre pacientes (P2, baixa)
- **Evidência:** a Clara mostra "G40.9 Epilepsia, não especificada" (descrição gravada) e o Pedro mostra "G40.9 Epilepsia não especificada" (descrição do catálogo).

### Observações fora da régua (não reprovam)
- São inconsistências da **base de demonstração**, não da tela:
  - M-CHAT-R/F (16 a 30 meses) aplicada numa criança de 12 anos.
  - Marcos gravados com domínio `motor_grosso` para "Nomeia cores" (o painel corrige pelo catálogo).
  - Cecília tem prescrição de levetiracetam e "Nenhuma medicação registrada". A frase de segurança está correta para o que o sistema sabe.
  - Escalas aplicadas meses antes de "em acompanhamento desde".
- A 1024 a pílula "Consentimentos" fica atrás do esmaecimento da faixa rolável, o que é esperado.

## O que passou

### P1 Palco anatômico
- O popover diz a verdade:
  - "Lobo frontal / Esquerdo" mostra "Neurofisiológicos 3" e "Exames de imagem 3", o que bate com os 3 EEG e as 3 RM/TC da Clara.
  - "Carótidas e vertebrais" não mostra relação (nenhum exame tem localização).
  - A linha "Exames de imagem" abre o painel filtrado com exatamente os 3 arquivos de imagem.
- Teclado da lista: 30 estruturas, setas, End e Enter abrem o popover com o foco nele, e Esc fecha e devolve o foco ao `listbox`.
- Camadas: desligar "Cérebro" reduz a lista a 6 opções, com `aria-pressed` correto.
- Fallback sem WebGL conforme o §4.3:
  - mensagem "Não foi possível abrir o modelo 3D neste navegador", 30 estruturas em botões com a função e as relações reais;
  - alertas e faixa presentes, controles 3D ausentes, crédito presente;
  - "Neurofisiológicos 3" abre o painel filtrado.
- Desempenho: com o painel aberto, 0 chamadas de desenho em 2 s, e o desenho volta ao fechar.
- Os textos dos alertas e o estado de cada cápsula (Sem desfecho, Atrasado, Na recepção, Faltou) usam a mesma regra (`stateOf`) e batem com a Linha do tempo.

### P2 Colunas
- Escalas:
  - SNAP-IV 17/54, "−5 pontos" (22 → 17), "há 3 semanas", traço âmbar (moderado) e primeiro ponto vermelho (alto em 14/03).
  - Vanderbilt 14/54, "−6", "há 6 semanas".
  - M-CHAT 2/20, "há 9 meses · 1 aplicação", faixa verde.
  - Interpretações iguais ao gravado.
- Medicações: princípio ativo, concentração, posologia e "Desde" iguais ao painel ("2 em uso"). O vazio traz a frase de segurança exata.
- Marcos: 2/1/1 e "Último registro: Copia um quadrado · há 4 semanas" batem com o painel ("Registrados (4)"). O vazio diz "Marco sem registro não conta como atraso".
- Pastas: Imagem 30/09 com 3 arquivos, Neurofisiológico 05/09 com 3, Pareceres 20/09 com 1, total "7 arquivos". Datas do exame mais recente corretas.
- A trilha conta faltas de laudo (Pedro: "3 faltas · 1 sem desfecho", "0 consultas").
- Nome social ("Jojo Aguiar" com "Nome de registro: …" no cabeçalho e na trilha de navegação), "Responsáveis (3)" com "+ N" e a pílula "Próxima 28/10/2026 14:30 · Retorno · em 6 dias · Remarcar" estão corretos.
- Sem próxima consulta e com estado de agora: "Agendar retorno". Sem nada: "Sem retorno agendado — agendar retorno".

### P3 Navegação e seções
- Pílulas contra os painéis, todos iguais:
  - Evoluções 1 = "1 registro"; Escalas 3 = "3 instrumentos aplicados"; Marcos 4 = "Registrados (4)"; Medicações 2 = "2 em uso"; Exames 7 = "7 arquivos".
  - Consentimentos 2 com o título "2 vigentes".
  - Documentos: "1 a emitir" no Felipe = "1 atendimento de laudo concluído sem documento"; "2 a emitir" no Gael.
- `?secao=` abre direto. Esc e o voltar do navegador fecham e devolvem o foco à pílula da seção.
- A 390, o painel em tela cheia deixa a barra, as pílulas, a coluna, o palco e a lateral com `inert`. O cabeçalho do painel repete nome, alergia e sem desfecho.
- A alergia fica visível na visão geral (topo, meio e pé da rolagem) e com o painel aberto em todas as 7 larguras. A 1024 e abaixo ela gruda na barra de seções.
- Modais com a faixa de alergia: Remarcar consulta, Emissão de documento clínico, Nova evolução clínica, Registrar aplicação e Registrar medicação. Digitar "Dipirona sódica" na medicação gera "O que foi digitado contém Dipirona: confirme antes de registrar."
