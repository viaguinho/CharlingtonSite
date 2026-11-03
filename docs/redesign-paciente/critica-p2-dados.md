# Crítica de dados e acabamento, passada 2

> Crítico de dados e acabamento, 20/10/2026. Julguei a tela interagindo com ela no capturador headless (base local de verificação), sem ler o código da página nem as críticas anteriores. Capturas em `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/fa3072cc-0f10-4c5d-9158-a0e60c4c0020/scratchpad/critica-p2-dados/`.
> Dados de teste: editei temporariamente, com `putMany`, a ficha da Clara (nome social, 4 responsáveis, 4 alergias), o consentimento de teleconsulta da Lívia (revogado) e a consulta de hoje da Alice (na recepção, depois em atendimento). Reverti tudo para o registro original e conferi depois. Nenhum anexo foi salvo: os envios foram cancelados, e os anexos continuam 7.

## Vereditos

| Peça | Veredito | Maior falha |
|---|---|---|
| **P1 Palco anatômico** | **APROVA** | A cápsula da consulta sem desfecho ou atrasada diz "Confirmado", e a pílula de alerta e a linha do tempo dizem "Sem desfecho" (falha 6). |
| **P2 Colunas** | **APROVA** | As ações dos estados vazios não fazem o que dizem: "Aplicar escala" só abre o painel (falha 8). |
| **P3 Navegação e seções** | **REPROVA** | A alergia some com o painel aberto. No desktop ela sai da tela ao rolar ou ao abrir pela faixa de consultas. No celular fica coberta pela barra global. No formulário de medicação nunca aparece (falhas 1, 2 e 3). |

## O que passou
- **Cabeçalho**
  - Idade, nascimento, "em acompanhamento desde", status e CIDs em chips.
  - Nome social com "Nome de registro: …".
  - "Responsáveis (4)" com o principal primeiro e "+ …" para os outros.
  - Editar ficha abre a ficha (sheet). Emitir documento abre o modal.
- **Alertas**
  - Os 6 estados aparecem com os textos certos: alergias (inclusive 4 juntas), sem desfecho com Remarcar, atrasado ("Hoje 08:00, sem chegada · Retorno"), na recepção ("Desde 23:10 · consulta das 08:00"), em atendimento e sem consentimento para teleconsulta.
  - Remarcar abre a remarcação real.
  - Próxima consulta ("21/10/2026 09:30 · Retorno · amanhã" + Remarcar) e "Sem retorno agendado — agendar" estão presentes.
- **Pílulas**
  - A contagem bate com o conteúdo em Evoluções 1, Escalas 3 ("3 instrumentos aplicados"), Medicações 2, Exames 7 e Consentimentos 2 (os dois concedidos).
  - "1 a emitir" aparece nos Documentos do Miguel.
  - `?secao=` funciona como link direto e com voltar/avançar do navegador.
  - Teclado: setas e Home/End com tabindex móvel, e Enter abre a seção. Esc fecha e devolve o foco para a pílula.
  - Com o painel aberto, palco e coluna direita ficam `inert` + `aria-hidden`.
- **Trilha de acompanhamento**
  - Os traços são proporcionais às datas: falta em 25/08, concluída em 16/09 (39%), sem desfecho em 07/10 (77%) e hoje em 98%.
  - Os textos "1 consulta" e "1 falta · 1 sem desfecho" batem com os dados. O clique abre a Linha do tempo.
- **Diagnósticos**: código + descrição.
- **Pastas**
  - Só aparecem as origens que têm arquivo, com a data do mais recente.
  - ↗ filtra por origem ("Mostrando só: Exame de imagem…", e Pareceres agrupa TO, fono e psi).
  - A folha de imagem abre a pré-visualização real.
  - O PDF sem arquivo dá "Arquivo indisponível: este registro não tem o arquivo guardado."
  - "+" abre o envio já com o tipo da pasta.
- **Escalas**
  - SNAP-IV 17/54 com −5 (22→17), seta ↘, 4 pontos com espaçamento proporcional à data e 31 (alto) em vermelho acima da linha-limite.
  - Vanderbilt 14/54 com −6. M-CHAT 2/20 sem seta e sem variação, com 1 aplicação.
  - O traço de risco segue o risco real (âmbar, âmbar, verde).
  - Os textos "Aplicada há 20 dias", "há 5 semanas" e "há 9 meses" estão corretos.
- **Medicações**: a frase de segurança está palavra por palavra. **Marcos**: 2 atingidos, 1 emergente e 1 atrasado batem com a grade.
- **Popover**
  - "Relacionado ao paciente" só aparece com anexos reais: some no Miguel, que não tem exame.
  - Neurofisiológicos aparecem só em córtex, ínsula, cíngulo/para-hipocampal e hipocampo. Imagem aparece só no encéfalo. Crânio, coluna, medula, coração e vasos não mostram nenhum dos dois.
  - As linhas abrem os exames filtrados.
- **Palco**
  - O clique no canvas fixa a estrutura e abre o popover. A listbox percorre as 30 estruturas e Esc devolve o foco.
  - Sem WebGL aparece "Não foi possível abrir o modelo 3D neste navegador." com a lista de estruturas.
  - O crédito está presente.
- **Cápsula da faixa**: abre a Linha do tempo com o item marcado (`is-focused`).
- **Console**: nenhum erro, aviso ou exceção em nenhuma das rodadas.

## Falhas, da mais grave à menor

1. **A alergia some com o painel aberto no desktop.** Viola §0.6, "Alergia nunca some".
   - **Como reproduzir**: a 1440, clicar na cápsula "Ago 25" da faixa. Ou abrir Linha do tempo e rolar até 600–1500 px.
   - **O que acontece**: a página rola (`shell__content.scrollTop` = 944) e o cabeçalho do painel, que tem as pílulas de alerta e o ×, sai da tela. A coluna esquerda mostra pastas e perfil sensorial. Não há nenhum elemento com "Dipirona" na viewport (captura `c2-rail-ago.png`, `e-tl-1500.png`).
   - **O que deveria**: a alergia fica sempre à vista, com cabeçalho do painel grudado ou alerta fixo.

2. **No celular não dá para fechar o painel por toque, e a alergia fica coberta.** Viola §4.5 ("× Voltar à visão geral"), §4.6 e §0.6.
   - **Como reproduzir**: a 390 × 844, abrir Linha do tempo.
   - **O que acontece**: o painel (`position: fixed`, z 300) fica sob a barra global.
     - O toque no centro de "Voltar à visão geral" cai em "Notificações" e, mais à direita, no avatar.
     - A pílula de alergia fica sob a busca e "Campinas / SP".
     - "Sem desfecho" quebra em "07/10/20 | 26 10:00".
     - Ao rolar, alerta e × somem. Só o botão voltar do sistema fecha (`g-390-panel.png`, `h-390-tapclose.png`).
     - A coluna esquerda não está `inert` por trás do painel em tela cheia.
   - **O que deveria**: o painel em tela cheia fica acima da barra global ou abaixo dela, com × e alergia tocáveis e grudados.

3. **O formulário "Registrar medicação" esconde a alergia, em qualquer largura.** Viola §0.6, a regra de produto das alergias e o Princípio 1 do PRODUCT.
   - **Como reproduzir**: abrir Medicações e clicar em "Registrar medicação".
   - **O que acontece**: o modal cobre a pílula de alergia (`elementFromPoint` sobre ela devolve o `input` do modal) e não a repete. Os campos são Princípio ativo, Nome comercial, Concentração, Início, Posologia e Observações, nenhum deles com alergia (`d-med-form-1440.png`).
   - **O que deveria**: o momento de prescrever é onde a alergia mais importa. O formulário mostra "Alergias: Dipirona" no topo.

4. **O painel não cobre palco e coluna direita, e a página empurra os dois para baixo.** Viola §4.5, "cobre o palco e a coluna direita".
   - **Como reproduzir**: a 1440, abrir Medicações e rolar.
   - **O que acontece**: o painel ocupa 272–872 px, e palco (1533–2133) e coluna direita (1533–2621) descem para depois da coluna esquerda. Sobram cerca de 1.800 px de conteúdo desfocado e inerte para rolar (scrollHeight 2685). Na Linha do tempo a "zona morta" depois do painel tem 1.100 px. Vale também a 1280 e 1024 (`f-med-1440-scroll.png`, `e-tl-99999.png`).
   - **O que deveria**: o painel se sobrepõe à área do palco e da coluna direita sem refluir a grade, e a página termina onde termina o painel.

5. **No celular, a alergia some ao rolar a visão geral.** Viola §0.6 e §4.6.
   - **Como reproduzir**: a 390, rolar cerca de 1400 px.
   - **O que acontece**: a faixa de alerta da barra não gruda. A barra de pílulas de seção gruda, mas a alergia não, e nenhum elemento com a alergia fica na tela (`g-390-scroll.png`). No desktop o palco grudado mantém a alergia à vista.
   - **O que deveria**: abaixo de 1024, a faixa de alergia gruda junto da barra de seções.

6. **A faixa de consultas contradiz os alertas.** Viola §4.3 ("mesmos textos… do cabeçalho") e o Princípio 2.
   - **Como reproduzir**: Clara, cápsula de 07/10. Alice, cápsula de hoje às 08:00.
   - **O que acontece**: as cápsulas dizem "Confirmado" com ponto azul, enquanto a pílula diz "Sem desfecho" e "Atrasado" e a Linha do tempo diz "Sem desfecho registrado". O `aria-label` também diz "Retorno em 07/10/2026, Confirmado".
   - **O que deveria**: uma consulta passada aberta aparece como "Sem desfecho" (ou "Atrasado" no dia), em sinal.

7. **A contagem dos Marcos não corresponde ao que o painel abre.** Viola a regra de contagem × conteúdo e o Princípio 3.
   - **Como reproduzir**: Clara, pílula "Marcos 4" ou card de marcos → "Abrir".
   - **O que acontece**: o painel não mostra nenhum dos 4 registros, só "A grade de marcos vai até 5 anos e 6 meses… Ver a grade como histórico". Ao abrir a grade, o texto diz '"Atrasado 0" não quer dizer desenvolvimento em dia', e a contagem logo acima mostra Atrasado 1.
   - **O que deveria**: abrir pelos 4 registros (ou pela grade com eles), e o texto não contradiz o número.

8. **Ações de estado vazio que não fazem o que dizem.** Viola §0.8 ("controles dizem a ação que fazem") e §0.5 ("estado vazio honesto e com ação").
   - **"Aplicar escala"** (Miguel): só abre o painel Escalas, onde é preciso clicar "Registrar aplicação" de novo.
   - **Medicações e Marcos vazios**: só têm "Abrir", sem "Registrar medicação" nem "Registrar marco".
   - **"Sem retorno agendado — agendar"**: vai para `#/agenda` genérica, sem a paciente.
   - **Clara**: está sem retorno futuro e não tem "agendar" em lugar nenhum, só Remarcar da consulta perdida. A pílula do rodapé some e nada a substitui no rodapé.

9. **A faixa de consultas fica recortada.** Viola §4.3, "faixa de cápsulas".
   - **A 1440**: o trilho tem 312 px de largura útil e começa rolado para o fim. A consulta de 25/08 fica oculta e a de 16/09 aparece cortada ("…luído"). A 1024, a primeira cápsula visível perde a data.
   - **Item alvo**: na Linha do tempo aberta pela cápsula, o item `is-focused` não se distingue na captura (`c2-rail-ago.png`).

10. **Acabamento.**
    - O cabeçalho do painel diz "1 registros" (Evoluções).
    - O "+" das pastas é um alvo de 14 × 14 px com opacidade 0 quando a pasta está fechada, mas entra no Tab ("Adicionar arquivo a Imagem"), o que põe o foco num controle invisível.
    - O "+" de Pareceres pré-seleciona "Parecer de terapia ocupacional", e a pasta só tem parecer fonoaudiológico.
    - Ao fechar o painel pelo voltar do navegador, o foco cai no `body`.
    - Com 7 s de carga a listbox responde, mas antes do modelo montar o Enter não abre nada e não avisa.

## Observações fora do escopo
- Foco depois de fechar a ficha (Editar ficha) não foi julgado.
- Permissões de outros papéis (`can.write`) não são verificáveis nesta base.
- Dado de demonstração: todos os marcos da Clara estão com domínio `motor_grosso`, inclusive "Nomeia cores" e "Conta uma história". O problema é do seed, não da tela.
