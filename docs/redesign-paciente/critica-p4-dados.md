# Crítica da passada 4: dados e acabamento (prontuário do paciente)

Data: 21/10/2026, entre 20h15 e 21h05 (horário de Brasília). Contexto limpo: não li as críticas anteriores.
Julgado contra `guia.md` (§0, §1, §4, §7) e `PRODUCT.md`.

## Método

- Tela real no navegador do loop (`cdp.mjs`, porta 9333) sobre `http://localhost:5173`, base local de verificação. Nada no Supabase nem no painel do dono.
- Larguras: 1440×900, 1280×800, 1024×768 e 390×844. Para checar casos de borda também usei 1366×768, 1280×720, 1180, 1100 e 1179.
- Pacientes reais da base: Clara Macedo Farias (alergia, sem desfecho, 7 exames, 7 aplicações de escala, 2 medicações, 4 marcos), Felipe Andrade Coelho (atrasado hoje, sem escala, sem exame e sem medicação, 1 laudo a emitir), Heitor Barbosa Vilela (alergia, teleconsulta sem consentimento, sem retorno), Valentina Queiroz Lemos (próxima consulta), Enzo Guimarães Leal (próxima ainda não confirmada), Pedro Toledo Freire (só faltas e sem desfecho), Rafael Siqueira Bastos, João Pedro Salgado e Nicolas Brandão Sales (2 alertas longos).
- Para os estados do §7 que a base não tem (5 alertas ao mesmo tempo, nome social, 3 responsáveis, paciente sem nada, marco que voltou a "Não avaliado"), troquei o adaptador **em memória** com `repository.useAdapter`, só na leitura e só naquela aba. Não gravei nada, não salvei formulário e não enviei anexo. Ficaram apenas os registros de leitura que qualquer abertura de prontuário já gera na auditoria.
- Capturas e scripts: `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/fa3072cc-0f10-4c5d-9158-a0e60c4c0020/scratchpad/critica-p4-dados/`.
- **Código mudou durante a crítica.** `anatomy.css` e `AnatomyStage.jsx` foram alterados às 20h36. Antes disso, entre 1180 e cerca de 1296 px, a fileira de camadas cobria a pílula de alergia: 4 de 5 pontos medidos caíam nos botões Cérebro e Crânio (`clara-1280.png`). Medi de novo depois da alteração e a sobreposição sumiu (`clara-1280-v2.png`). Tudo o que está abaixo foi conferido depois das 20h36.
- O console ficou limpo ao abrir o prontuário, passar pelas 8 seções e trocar de paciente.

## Vereditos

| Peça | Veredito | Maior falha |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | Com 2 alertas que quebram linha (dados reais), a 1366×768 e a 1024×768 o botão de camada "Coração" fica sob a faixa de consultas e não recebe clique. Com 5 alertas, 3 dos 5 botões ficam inalcançáveis a 1440 e 4 a 1024, os alertas cobrem a cabeça e o popover sai da janela. |
| P2 Colunas | **REPROVA** | A trilha "Acompanhamento" diz "1 falta" enquanto a faixa de consultas e a Linha do tempo mostram 3 "Faltou" (Pedro Toledo Freire). Resumo e linha do tempo não batem. |
| P3 Navegação e seções | **REPROVA** | Entre 1024 e 1179 px a alergia some ao rolar: com "Medicações em uso" na tela, a pílula está em y = −601 e a faixa da barra não existe nessa largura. |

## Falhas, da mais grave à menor

### 1. [P3, responsivo] A alergia some entre 1024 e 1179 px ao rolar (§0.6)
Nessa faixa a coluna direita (Escalas, Medicações, Marcos) desce para baixo do palco, e o palco deixa de ser grudado. A pílula de alergia só existe no palco, porque a cópia na barra de seções só aparece abaixo de 1024. Quando o médico rola até as medicações, justo o lugar onde a alergia mais importa, ela está fora da tela.
- **Reproduzir:** abra a Clara a 1024×768 e role até "Medicações em uso". A pílula "Alergias · Dipirona" fica em y = −601 e `.pr-pills__alerts` mede 0×0. Repeti a 1100 e a 1179 com o mesmo resultado: a alergia some a partir de 50% da rolagem. A 1280 e a 1440 o palco gruda (y = 100) e a 390 a faixa da barra gruda (y = 80); nessas larguras a alergia fica visível. Captura: `clara-1024-medicacoes.png`.
- O §4.6 do guia ("abaixo de 1024, também em faixa na barra") deixou essa brecha. O §0.6 não admite exceção.

### 2. [P1] O seletor de camadas cai sobre a faixa de consultas quando os alertas ocupam 2 linhas ou mais
O arco começa abaixo dos alertas (`--an-top`) e cresce para baixo sem limite. Com dados reais e 2 alertas longos ("Sem desfecho" e "Sem consentimento para teleconsulta"), a faixa de alertas mede 113 a 131 px de altura.
- **Reproduzir com dados reais:** abra Rafael Siqueira Bastos (`#/pacientes/4579401a-c511-4131-a339-7588293467c6`) a 1366×768. O botão "Coração" fica atrás da cápsula "03 set 2026 · Concluído" e o arco passa por cima do texto da cápsula. `elementFromPoint` no centro do botão devolve a cápsula. O mesmo acontece a 1024×768, e também com João Pedro Salgado e Nicolas Brandão Sales. Captura: `rafael-1366x768.png`.
- **Com 5 alertas (§7, simulado em memória):** a 1440×900, Vasos fica sob a faixa e Coluna e Coração ficam fora do palco e da janela. A 1024, 4 dos 5 botões ficam inalcançáveis. Os 5 alertas (330 px) cobrem a cabeça inteira, e o popover de uma estrutura, empurrado para evitá-los, desce sobre a faixa e os controles e passa da borda da janela: a 1280×800 vai de y = 687 a 931. Capturas: `5alertas-1440.png`, `5alertas-1280.png`, `5alertas-popover-1280x800.png`.

### 3. [P3, celular] No celular, o palco prende a rolagem da página
O canvas tem `touch-action: none` em toda a área, que a 390 px ocupa a largura inteira e 420 px de altura (metade da tela). O guia §4.6 pede que a rolagem vertical continue com o palco fora de foco.
- **Reproduzir** (toque emulado, 390×844, `mobile: true`): com o palco no meio da tela, um arrasto vertical de 160 px com 1 dedo sobre o canvas deixa a rolagem em 1374 → 1374. O mesmo gesto fora do palco rola de 1374 para 1579. Script: `toque/toque.mjs`.

### 4. [P2] A trilha "Acompanhamento" conta faltas diferente da faixa e da Linha do tempo
`FollowUpTrail` descarta laudo e evento (`NOT_A_VISIT`) também nas faltas. A faixa de consultas e a Linha do tempo mostram todas.
- **Reproduzir:** abra Pedro Toledo Freire (`#/pacientes/861a310d-fa6b-4d26-af58-d074db43433a`). O perfil diz "0 consultas · 1 falta · 1 sem desfecho". A faixa mostra "Retorno 10/08 Faltou", "Emissão de laudo 31/08 Faltou", "Emissão de laudo 21/09 Faltou" e "Retorno 13/10 Sem desfecho". A Linha do tempo mostra as mesmas 3 faltas. Quem lê a trilha entende 1 falta onde houve 3 ausências.
- **Relacionado, menor:** no Felipe, o rodapé diz "desde 18/08/2026" (o laudo, via `firstVisit`), mas o eixo da trilha começa em 09/09 (a primeira consulta que não é laudo).

### 5. [P3] A pílula "Marcos" conta registros que o resto da tela descarta
A pílula usa `record.milestones.length`. O card e o painel descartam o status "Não avaliado", que é o 4º passo do ciclo de clique na grade (`STATUS_ORDER`).
- **Reproduzir** (simulado em memória, sem gravar): na Clara, deixe "Nomeia cores" em "Não avaliado". Na tela real, isso é clicar no marco na grade até o ciclo voltar. A pílula continua "Marcos 4", o card soma 1 + 1 + 1 = 3 e o painel diz "Registrados (3)".

### 6. [P3] O estado vazio de Medicações no painel perde a frase de segurança e cita uma tela que não existe mais
O card da visão geral diz: "Nenhuma medicação registrada. Confirme com o responsável antes de prescrever." No painel, o mesmo vazio diz: "Nenhuma medicação registrada · Registre o que a criança usa para que apareça no **painel de contexto** durante a consulta e nas prescrições." O `PRODUCT.md` exige que a frase peça confirmação ao responsável, e o "painel de contexto" saiu no redesign.
- **Reproduzir:** Felipe, `?secao=medicacoes`.
- O mesmo texto antigo aparece em `PatientForm.jsx:396`, no campo de alergias: "Aparecem em destaque vermelho no painel de contexto do prontuário." Hoje elas aparecem nas pílulas do palco, do painel e da barra.

### 7. [P2] As folhas das pastas são botões sem nome acessível
Com a pasta aberta, cada folha é um `<button>` cujo único texto (`.gf-sheet-head`) recebe `display: none` em pasta de até 200 px (`glass-folder.css:285`), que é o caso nas 4 larguras. A imagem tem `alt=""`. O comentário do próprio CSS diz que "o nome fica no leitor de tela", mas não fica: `innerText` vazio e sem `aria-label`.
- **Reproduzir:** na Clara, abra a pasta Imagem pelo vidro. As 3 folhas são lidas como "botão" sem nome. O clique funciona: a última abre a prévia certa, "RM de crânio — controle".

### 8. [P3, celular] No cabeçalho do painel a 390, a pílula "Sem desfecho" passa sob o ×
A pílula vai de x = 137 a 465 numa tela de 390, e o × fica em x = 330. O texto é cortado em "Retorno de 07/10/202", e o "Remarcar" só aparece rolando a faixa de alertas na horizontal, sem nenhum indício de que ela rola.
- **Reproduzir:** Clara, 390×844, `?secao=medicacoes`. Captura: `clara-390-painel.png`.

### 9. [P2] "Agendar retorno" abre a Agenda num horário que já passou
A Agenda abre com a paciente certa pré-escolhida (o nome aparece como placeholder do campo de busca). Mas a data e a hora padrão são hoje às 09:00, que às 20h33 já tinham passado, e a lista de pacientes vem aberta com outro paciente (Miguel) realçado.
- **Reproduzir:** Heitor, botão "Sem retorno agendado — agendar retorno". Captura: `heitor-agendar.png`.
- O problema está no módulo da Agenda, mas é o destino da ação desta tela.

### 10. [P1] A faixa e a pílula de alerta dão nomes diferentes ao mesmo atendimento
Para uma criança com status `aguardando`, a cápsula da faixa diz "Aguardando" e a pílula do palco diz "Na recepção". `VISIT_LABEL` não traduz `aguardando`. Visto com 5 alertas simulados em memória (`5alertas-1280.png`).

### 11. [P1, celular] A faixa de consultas a 390 começa com uma cápsula cortada
O ajuste em "Hoje" deixa a primeira cápsula visível como "7 out 2026" sob a máscara, sem o primeiro dígito. Captura: `clara-390-palco.png`.

### 12. [P3, celular] Alvos menores que 44 px a 390 (§8.3)
"Editar ficha" mede 136×40, "Emitir documento" 176×40 e o link "Pacientes" do breadcrumb 58×21.

### 13. [P3] Fechar pela pílula "Visão geral" devolve o foco à pílula errada
Com Escalas aberta, clicar em "Visão geral" fecha o painel, mas o foco vai para a pílula "Escalas", não para a que foi clicada. Pelo ×, por Esc e pelo voltar do navegador, devolver o foco à seção anterior está certo. Por clique numa pílula, o foco deveria ficar onde está.

## O que passou

### P1 Palco anatômico
- As pílulas de alerta usam só estados reais (alergias, sem desfecho, atrasado, na recepção, teleconsulta sem consentimento), com os mesmos textos e o mesmo Remarcar. Nenhuma fica presa a uma região do modelo.
- O "Remarcar" do alerta abre a remarcação do atendimento certo: na Clara, Retorno de qua. 07/10, 10:00–10:40, com a faixa "Alergias: Dipirona" e aviso de choque de horário. O foco volta ao gatilho.
- O popover só mostra relações reais. Lobo temporal da Clara: "Neurofisiológicos 3 · Exames de imagem 3", o mesmo que as pastas (3 e 3). Tronco encefálico: só "Exames de imagem 3". Felipe, sem exame: nenhuma linha de relação.
- A linha de relação abre Exames filtrado ("Mostrando só: Exame neurofisiológico") com os 3 arquivos certos.
- Teclado: Tab na lista abre a dica "Setas percorrem · Enter abre", as setas acendem a estrutura, Enter abre o popover com foco nele, e Esc fecha e devolve o foco à lista sem mexer na URL. Com a camada Cérebro desligada, a lista cai de 30 para 6 estruturas.
- Sem WebGL: aparece "Não foi possível abrir o modelo 3D neste navegador.", com as 30 estruturas em botões, a função e a relação com exames de cada uma, as pílulas de alerta, a faixa e o crédito. A página continua inteira (`semwebgl-1440.png`, `semwebgl-1280.png`).
- A faixa de consultas usa os mesmos estados da Linha do tempo (Faltou, Concluído, Sem desfecho; Atrasado no Felipe). O clique numa cápsula abre a Linha do tempo com o item marcado (`is-focused`) e visível dentro do painel.
- Desempenho: cerca de 11.400 chamadas de desenho em 2 s na visão geral, contra 120 com o painel aberto (renderização pausada). Fora da tela no celular, o modelo não renderiza.

### P2 Colunas
- Perfil: nascimento, idade e sexo reais. "Nenhum cadastrado" sem responsável; "Responsáveis (3)" com os outros 2 listados; nome social com "Nome de registro" abaixo.
- Trilha da Clara coerente com os dados: 1 concluída, 1 falta, 1 sem desfecho, marca de hoje. Para quem não tem atendimento, "Nenhuma consulta realizada".
- Diagnósticos com descrição do CID; sem diagnóstico, "Nenhum diagnóstico registrado."
- Pastas fiéis aos dados: Imagem 3 (30/09), Neurofisiológico 3 (05/09), Pareceres 1 (20/09), total "7 arquivos" igual à pílula. As miniaturas são imagens decifradas (`blob:`).
- Ações das pastas: ↗ filtra por origem, o "+" de cada pasta e o card "Anexar exame" abrem o seletor de arquivo (`input[type=file]`) e o clique numa folha abre a prévia.
- Escalas: SNAP-IV 17/54, −5 pontos (22 → 17), risco moderado em âmbar e o ponto de 31 (alto) em vermelho. Vanderbilt 14/54, −6 pontos. M-CHAT 2/20 com "1 aplicação". Interpretação e "há N semanas" vêm do que foi gravado.
- Medicações: 2 em uso, com "desde". O vazio do card tem a frase de segurança.
- Marcos: 2 atingidos, 1 emergente e 1 atrasado (igual à pílula 4 e a "Registrados (4)"). O último registro está certo. O vazio diz "não conta como atraso".
- Próxima consulta: Valentina "22/10/2026 11:30 · Teleconsulta · amanhã · Remarcar", e Remarcar abre o atendimento certo. Com estado de agora e sem retorno, aparece "Agendar retorno". "Aplicar escala" e "Registrar" (medicação) abrem o formulário certo; "Registrar" de marcos abre a grade.

### P3 Navegação e seções
- As contagens das pílulas batem com o painel na Clara: Evoluções 1, Escalas 3 ("3 instrumentos aplicados"), Marcos 4, Medicações 2 ("2 em uso"), Exames 7, Documentos sem número ("0 documentos") e Consentimentos 2 ("2 vigentes"). Felipe: "1 a emitir" bate com o aviso do painel ("1 atendimento de laudo concluído sem documento").
- `?secao=` funciona como link direto, uma seção inválida cai na visão geral, e voltar e avançar abrem e fecham o painel. Esc, × e voltar devolvem o foco à pílula. As pílulas têm tabindex móvel (setas, Home e End).
- Inert: com o painel aberto a partir de 1024, palco e coluna direita ficam inertes e a coluna do paciente continua ativa. A 390, tudo atrás do painel em tela cheia fica inerte.
- A alergia fica no cabeçalho do painel nas 4 larguras, aberto e depois de rolar até o fim.
- Modais clínicos (Emitir documento, Remarcar, Nova evolução, Registrar aplicação, Registrar medicação): a faixa de alergia aparece nas 4 larguras e continua visível depois de rolar todos os contêineres do modal até o fim. O foco volta ao gatilho, e Esc ou Cancelar no modal não fecha o painel.
- Os estados vazios dos painéis são honestos, com exceção do item 6.

## Capturas citadas
`clara-1440.png`, `clara-1280.png` (antes das 20h36), `clara-1280-v2.png` (depois), `clara-1024.png`, `clara-390.png`, `clara-1440-full.png`, `clara-1024-medicacoes.png`, `clara-390-palco.png`, `clara-390-painel.png`, `clara-390-colunas.png`, `popover-temporal-1440.png`, `rail-click-1440.png`, `semwebgl-1440.png`, `semwebgl-1280.png`, `5alertas-1440.png`, `5alertas-1280.png`, `5alertas-1024.png`, `5alertas-390.png`, `5alertas-popover-1280x800.png`, `rafael-1366x768.png`, `painel-1024.png`, `painel-1024-rolado.png`, `heitor-agendar.png`, `vazio-1440.png`. Todas na pasta de capturas indicada no Método.
