# Crítica de dados e acabamento, passada 3 (última)

> 21/10/2026. Contexto limpo: não li as críticas p1 e p2. A régua foi o `guia.md` (§0, §1, §4, §7) e o `PRODUCT.md`.
> Método: Chromium do loop (`cdp.mjs`, porta 9333) na base local de verificação, com o dado bruto lido pelo próprio `repository.js` e comparado com a tela. Pacientes usados: Clara (16df5f04), Heitor (25cabf19), Valentina (2b8c7db8), Pedro (861a310d), Ana Beatriz (f2363c82) e Felipe (1c461f4f).
> **Nenhum dado foi editado, nenhum anexo foi salvo e nenhum formulário foi enviado.** Os modais foram abertos só para leitura.
> **Limite desta rodada:** perto do fim, o servidor em `localhost:5173` caiu (ERR_CONNECTION_REFUSED). Fiz as medições ao vivo em 1440. Não consegui refazer 1280, 1024 e 390. O comportamento abaixo de 1024 foi conferido só no código (CSS e `behindPanel`). O teste de "Agendar retorno" ficou de fora porque o uso da ferramenta foi recusado.

---

## Vereditos

| Peça | Veredito | Maior falha |
|---|---|---|
| **P1 Palco anatômico** | **APROVA** | Nenhuma falha de dado. Só acabamento: no recuo sem WebGL, a mensagem fica colada sob as pílulas de alerta. |
| **P2 Colunas** | **APROVA** | O rodapé do card de escala reescreve a interpretação clínica gravada ("Critérios parcialmente atendidos" vira "Parcialmente atendidos"), e o tom e a faixa vêm do catálogo atual, não do `risco` gravado. |
| **P3 Navegação e seções** | **REPROVA** | A alergia some com o modal aberto. "Emitir documento", que abre já em **Prescrição médica**, cobre a tela inteira sem mostrar "Dipirona". O mesmo acontece em "Nova evolução" e em "Registrar aplicação". Isso viola a regra central e o §0.6. |

---

## O que passou (conferido contra o dado bruto)

**Contagens e estados (Clara)**
- As contagens batem entre pílula, coluna e painel:
  - Evoluções 1 = 1 nota.
  - Escalas 3 = 3 instrumentos = 3 cards = "3 instrumentos aplicados".
  - Marcos 4 = 2 atingidos + 1 emergente + 1 atrasado = "Registrados (4)".
  - Medicações 2 = 2 em uso = "2 em uso".
  - Exames 7 = 3 + 3 + 1 nas pastas = "7 arquivos".
  - Consentimentos 2 = WhatsApp + teleconsulta. O tratamento clínico fica fora, com base legal própria.
- Sem desfecho: o retorno de 07/10 10:00 aparece igual na pílula do palco, na faixa do celular (no DOM), no cabeçalho do painel, na cápsula da faixa ("Sem desfecho") e na Linha do tempo ("Sem desfecho registrado"). A trilha diz "1 falta · 1 sem desfecho", que é o dado real (faltou 25/08, concluído 16/09, confirmado 07/10 já passado).
- O cabeçalho diz "em acompanhamento desde 16/09/2026", o 1º concluído. A falta de 25/08 não é usada como início, o que está correto.
- "Documentos 1 a emitir" (Heitor, Valentina, Felipe) bate com a faixa do painel: "1 atendimento de laudo concluído sem documento. 07/10/2026. Emitir o mais antigo".
- Teleconsulta sem consentimento (Heitor): "2 já realizadas" bate com as 2 teleconsultas concluídas sem consentimento vigente.
- Atrasado hoje (Felipe): "Hoje 08:00, sem chegada · Emissão de laudo · Remarcar". A pílula da próxima consulta é substituída por "Agendar retorno", como pede o §4.2.
- Próxima consulta (Valentina): a pílula diz "Próxima 22/10/2026 11:30 Teleconsulta · amanhã · Remarcar". A trilha diz "próxima 22/10/2026" e a cápsula futura fica à direita do "Hoje".
- Paciente sem nenhuma consulta concluída (Pedro): "0 consultas" e "3 faltas · 1 sem desfecho". O cabeçalho omite "em acompanhamento desde", sem inventar início.

**P1 Palco anatômico**
- As pílulas de alerta flutuam soltas, sem pino em região. Ficam grudadas ao rolar, porque o palco é sticky.
- Popover do lobo temporal: nome, lado, "O que faz" simples, "Saiba mais" e "Relacionado ao paciente" com "Neurofisiológicos 3" e "Exames de imagem 3". A ligação é só por tipo, como manda o §4.3, e os números batem com o dado (3 EEG, 3 RM/TC). A linha abre Exames filtrado ("Mostrando só: Exame neurofisiológico…"), com os 3 EEG certos.
- Teclado: o listbox tem tabindex 0 e o canvas tem `aria-describedby`. As setas percorrem as estruturas (`aria-activedescendant` muda), Enter abre o popover com foco nele, e Esc fecha e devolve o foco ao listbox sem fechar mais nada.
- Recuo sem WebGL (simulado com `getContext('webgl')` devolvendo null): aparece "Não foi possível abrir o modelo 3D neste navegador.", com 30 estruturas em botões expansíveis, o mesmo texto e as mesmas linhas de exame. A alergia e a faixa de consultas continuam lá.
- O crédito do modelo aparece no pé. Nenhum achado inventado sobre o cérebro.

**P2 Colunas**
- Perfil: nascimento, idade, sexo, responsável com parentesco e telefone, tudo real. O perfil sensorial e a escola aparecem só quando existem.
- Diagnósticos: código e descrição. A descrição vem do catálogo quando a ficha só tem o código.
- Pastas: as datas mais recentes estão certas (Imagem 30/09, Neurofisiológico 05/09, Pareceres 20/09), assim como os rótulos "3 arquivos" e "1 arquivo".
  - ↗ filtra pelas origens do grupo.
  - A folha abre a pré-visualização real (Vídeo-EEG 24 h · 03/04/2026 · 32,8 KB).
  - "+ Anexar exame" abre Exames e dispara o seletor de arquivo.
- Escalas:
  - SNAP-IV 17/54, "−5 pontos" (22 → 17), seta para baixo, 4 pontos no gráfico, com o de 31 ("alto") em vermelho.
  - Vanderbilt 14/54, "−6 pontos" (20 → 14).
  - M-CHAT-R/F 2/20, sem seta nem variação (1 aplicação).
  - Datas relativas corretas.
- Medicações: princípio ativo, concentração, posologia e "Desde" reais. O estado vazio usa a frase de segurança, palavra por palavra.
- Marcos: o estado vazio diz "Marco sem registro não conta como atraso". O último registro é "Copia um quadrado · há 4 semanas" (20/09).

**P3 Navegação e seções**
- `?secao=` funciona para as 8 seções.
  - Clique, Esc, × e a pílula "Visão geral" fecham o painel e devolvem o foco à pílula da seção.
  - Voltar e avançar do navegador abrem e fecham as seções na ordem certa, também com o foco de volta.
- As pílulas usam tabindex móvel de verdade: as setas andam e a parada de Tab acompanha.
- Com o painel aberto, `.pr-stage` e `.pr-side` ficam `inert` e a coluna do paciente fica ativa, como manda o §4.5.
- O cabeçalho dos 8 painéis repete Alergias + Sem desfecho + Remarcar, e o painel ganha o foco ao abrir.
- O clique na cápsula da faixa abre a Linha do tempo rolada até o item ("Retorno · Faltou · 25/08/2026").
- O modal de medicação ("Registrar medicação") traz a faixa "Alergias: Dipirona" no topo.
- Os estados vazios das colunas são honestos e têm ação.

---

## Falhas, da mais grave à menor

### 1. [P3, grave] A alergia some no modal de prescrição e em outros modais clínicos
**Passos**
1. Abrir `#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3` (Clara, alérgica a Dipirona) em 1440.
2. Clicar em **Emitir documento** na barra da página.
3. O modal ocupa quase a tela inteira e abre em "Prescrição médica". Nem o formulário nem a pré-visualização mostram "Dipirona". O fundo desfocado esconde as pílulas.
4. Repetir em `?secao=evolucoes` → **Nova evolução** (o campo P de Plano é onde se prescreve) e em `?secao=escalas` → **Registrar aplicação**. A alergia também não aparece (`innerText` do diálogo sem "Dipirona"; `elementFromPoint` sobre a pílula do painel devolve o véu do modal).
5. Também sem alergia: **Remarcar** (`RescheduleDialog`). Ali o risco clínico é menor, mas a regra vale do mesmo jeito.

**Por que reprova:** a regra central diz que a alergia nunca some, "nem com painel/modal aberto". O caso mais grave é justamente o da prescrição. O modal de medicação já resolve isso com a faixa "Alergias: …". Os outros modais clínicos precisam da mesma faixa, sobretudo o `ClinicalDocumentModal` quando o tipo é prescrição ou receituário.

### 2. [P2, média] O card de escala reescreve a interpretação clínica e ignora o risco gravado
**Passos**
1. Em Clara, ver o card Vanderbilt: o rodapé diz "Parcialmente atendidos".
2. O dado gravado é `interpretacao: "Critérios parcialmente atendidos"`. O painel Escalas e a Linha do tempo mostram o texto inteiro.

**Detalhe:** `shortBand()` corta "Critérios" de propósito. Além disso, o tom do traço, a faixa tingida e o ponto vermelho vêm de `interpretScore()` (catálogo atual), não de `latest.risco` nem de `latest.interpretacao`. O §4.4 pede a "interpretação real" e o §3 pede "a cor do risco real da última aplicação". Se o catálogo mudar de corte, o card passa a contradizer o que foi registrado na aplicação, e o painel e a coluna divergem. Hoje os valores de Clara coincidem, então não há erro visível. O risco é estrutural, e o texto encurtado já diverge do painel.

### 3. [P2, menor] "Abrir" que abre um formulário
**Passos**
1. Abrir Heitor (`#/pacientes/25cabf19-8505-439f-9745-4bd99cc4d7df`), que não tem escala.
2. Na coluna direita, o link do cabeçalho "Escalas" diz **Abrir**.
3. Por `goFromInsights`, esse "Abrir" abre o painel **e** o modal "Registrar aplicação", o mesmo que o botão "Aplicar escala" logo abaixo.

**Por que importa:** o controle não diz a ação que faz (§0.8, princípio 3). Ficam duas ações com o mesmo efeito e rótulos diferentes. O "Abrir" deveria só abrir a seção, ou sumir no estado vazio.

### 4. [P2, menor] "Consultas" conta emissão de laudo e não usa a mesma régua de "sem desfecho" do resto
- A trilha e o "N consultas" contam todo atendimento `concluido`, inclusive "Emissão de laudo". Heitor tem "3 consultas", sendo 1 delas um laudo.
- A trilha marca como "sem desfecho" qualquer `agendado`/`confirmado` com horário passado (`new Date(a.inicio) < new Date()`).
  - Isso inclui consultas de **hoje** que as pílulas chamam de "Atrasado", e eventos.
  - As pílulas e a faixa usam `isUnresolved`/`stateOf`.
- Para reproduzir: abrir Felipe (`#/pacientes/1c461f4f-beae-42fc-b844-b2da3a7eec9f`), que tem laudo confirmado hoje às 08:00. A pílula diz "Atrasado". A regra da trilha o contaria como "sem desfecho" (o rodapé da trilha soma pelo `pending` local).
- Não consegui recapturar a tela de Felipe depois que o servidor caiu. A divergência está no código (`ProfileColumn.jsx`, `FollowUpTrail`) e deve aparecer em qualquer paciente com atraso hoje.

### 5. [P3, menor] Cabeçalho fixo do painel deixa o conteúdo rolado vazar por trás
**Passos**
1. Em Clara, clicar na 1ª cápsula da faixa (25 ago), que abre a Linha do tempo rolada.
2. No topo do painel, o texto dos itens rolados ("Retorno · Concluído", "Vanderbilt 14/54") aparece por trás do vidro do cabeçalho, em volta das pílulas de alerta.

A alergia continua legível, mas o vidro está transparente demais para um cabeçalho fixo sobre texto.

### 6. [P1, menor] Recuo sem WebGL: mensagem colada nas pílulas
Sem WebGL, "Não foi possível abrir o modelo 3D neste navegador." encosta na sombra das pílulas de alerta, sem respiro. Só acabamento.

### 7. [P1, observação] A relação por tipo pode prometer demais no futuro
Hoje todo `exame_imagem` conta como "relacionado" a cada lobo. Em Clara isso é verdade (RM e TC de crânio). Uma radiografia de punho (idade óssea), ou qualquer imagem fora do crânio, apareceria como relacionada ao lobo frontal. Vale filtrar pelo título ou pela região quando houver esse dado, ou renomear a linha para "Exames de imagem do paciente".

### Fora do escopo desta tela (registro, não conta no veredito)
- `AttachmentsView.save()` grava `nomeArquivo: pending.file.name`, mas o `PRODUCT.md` diz que os anexos "nunca guardam o nome original". O código vem de antes do redesign (commit 856f122).
- A base de verificação tem dados clinicamente incoerentes. Em Clara (12a6m): M-CHAT-R/F aplicado aos 11 anos, marcos de pré-escola ("Nomeia cores") e uma nota com `assinadaEm` (16/09) anterior ao `criadoEm` (08/10). A tela mostra fielmente o que está gravado. O problema é a semente, não a interface.

---

## O que ficou sem verificação nesta rodada
- 1280, 1024 e 390 ao vivo: o servidor caiu antes das capturas. Pelo código, abaixo de 1024 `.pr-pills__alerts` aparece como faixa grudada junto à barra de seções. No painel em tela cheia, o resto fica `inert` e `aria-hidden`, e o cabeçalho do painel repete os alertas. Isso precisa ser confirmado com captura quando o servidor voltar.
- "Agendar retorno" (`/agenda?agendar=…`): o teste foi recusado e não foi refeito.
