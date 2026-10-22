# Crítica de dados e acabamento: prontuário, passada 1

20/10/2026. Julguei pela tela, interagindo pelo `cdp.mjs` a 1920, 1440, 1024 e 390 px, com 8 pacientes: Clara (completa), Henrique (sem dados), Alice (atrasado), Felipe (próxima consulta, "1 a emitir"), Rafael (sem consentimento de teleconsulta), Antonella (na recepção, em atendimento, nome social e 3 responsáveis, com dados de teste temporários), além de um teste sem WebGL. Capturas em `/private/tmp/claude-501/-Users-iagolima-Downloads-Projetos-Site-Charlington/fa3072cc-0f10-4c5d-9158-a0e60c4c0020/scratchpad/critica-p1-dados/`.

## Veredito por peça

| Peça | Veredito | Maior falha |
|---|---|---|
| P1 Palco anatômico | **REPROVA** | "Relacionado ao paciente" liga os 3 exames de **crânio** (TC e 2 RM) a Coluna cervical, Medula espinhal e Mandíbula. Essa ligação não existe nos dados. |
| P2 Colunas | **REPROVA** | "Diagnósticos ativos" mostra "• — F90.0" em 41 dos 42 pacientes: um traço no lugar do código, o código no lugar da descrição e descrição nenhuma. |
| P3 Navegação e seções | **REPROVA** | Com qualquer seção aberta, **a alergia e todos os alertas somem da tela** em todas as larguras. Isso vale também em Medicações e no formulário "Registrar medicação". |

## Falhas, da mais grave à menor

**1. A alergia some quando uma seção abre (P3, §0.6 e §0.2)**
- Reproduzir: abra Clara (alergia: dipirona) e clique em "Medicações", depois em "Registrar medicação". Testei a 1920, 1440, 1024 e 390 px.
- O que acontece: a partir de 1024 px, a alergia só existe no palco, e o painel cobre o palco (fica fora de vista e desfocado). A faixa de alergia da barra fica oculta a partir de 1024. A 390 px, o painel em tela cheia cobre a faixa da barra (`elementFromPoint` devolve o item da lista de medicações). "Sem desfecho", "Atrasado", "Na recepção" e "Sem consentimento" somem junto. O formulário de medicação também não mostra a alergia.
- O que deveria acontecer: §0.6 diz "Alergia nunca some em nenhuma largura". O cabeçalho antigo mantinha a alergia sempre à vista (§0.2). A coluna esquerda, que continua visível com o painel aberto (§4.5), ou a barra da página precisam carregar a alergia e os estados de agora.

**2. O fundo continua tabulável atrás do painel, e o console registra um erro (P3, §4.5, §7 "foco por teclado em tudo", §8.5 "console limpo")**
- Reproduzir: abra qualquer seção e liste os elementos focáveis fora do painel.
- O que acontece: `.pr-stage` e `.pr-side` recebem `aria-hidden="true"`, mas não ficam `inert` (`el.inert === false`). O React avisa no console, a cada abertura: *"Received an empty string for a boolean attribute `inert`"*, ou seja, `inert=""` vale como falso. Ficam 19 controles escondidos na ordem do Tab: Remarcar, as 5 camadas, a lista de estruturas, + − e vista, as 3 cápsulas, os 3 cards de escala, "Ver todas" e dois "Abrir". O teclado entra em conteúdo que o leitor de tela não anuncia.
- O que deveria acontecer: o fundo fica inerte de verdade (`inert` booleano) e o console fica limpo.

**3. A 390 px, o botão "Voltar à visão geral" fica embaixo da barra global (P3, §4.6 e §8.3 "alvos ≥ 44 px")**
- Reproduzir: abra `?secao=medicacoes` a 390×844 (captura `05-celular-medicacoes-sem-alergia.png`).
- O que acontece: o botão ocupa (205, 16, 170×40) e os três pontos testados caem em "Campinas / SP", no sino e na `topbar`. O texto aparece sobreposto aos ícones. No celular não há Esc, então só o voltar do navegador fecha o painel. Quem toca no × abre o seletor de unidade ou as notificações.
- O que deveria acontecer: o painel em tela cheia fica com o fechamento tocável, abaixo da barra global ou acima dela.

**4. O popover inventa a relação entre exames de crânio e coluna, medula e mandíbula (P1, §4.3 "só ligações reais", §0.5, PRODUCT: "Dizer o que o sistema sabe, não o que supõe")**
- Reproduzir: em Clara, na lista de estruturas, abra Coluna cervical, Medula espinhal ou Mandíbula e clique em "3 exames de imagem".
- O que acontece: aparece "Relacionado ao paciente: 3 exames de imagem", e o botão abre Exames filtrado em TC de crânio, RM de crânio com contraste e RM de crânio — controle. A família lê que a coluna e a medula foram examinadas.
- O que deveria acontecer: a ligação vale para o encéfalo (RM e TC ↔ encéfalo, como no guia). Coluna, medula e mandíbula só ganham relação quando o sistema souber a região, e hoje não sabe (PRODUCT: "Não existe localização anatômica de achados"). Até lá, nada aparece.

**5. Diagnósticos aparecem como "• — F90.0" (P2, §4.2.2)**
- Reproduzir: abra Henrique, Alice, Rafael ou Felipe. 41 dos 42 pacientes guardam o diagnóstico como texto (`"F90.0"`).
- O que acontece: o card mostra um traço no lugar do código, "F90.0" no lugar da descrição e descrição nenhuma. Só Clara, que guarda `{codigo, descricao}`, sai certa. O chip do cabeçalho mostra "F90.0" corretamente.
- O que deveria acontecer: §4.2.2 pede "cada CID com ponto de estado, código em tabular-nums e descrição". O código vai no lugar do código. Sem descrição, o card não deve sugerir que falta o código.

**6. A trilha de acompanhamento esconde faltas reais (P2, §4.2.1 "a falta é um traço em --data-soft")**
- Reproduzir: em Clara, compare a trilha com o `aria-label` do botão.
- O que acontece: o rótulo diz "1 consultas realizadas, 1 faltas", mas a falta de 25/08 é desenhada em `x = -60`, fora do `viewBox 0..100`, porque a escala começa na primeira consulta concluída (16/09). Na tela aparece 1 traço e nenhuma falta. O retorno sem desfecho de 07/10 também não aparece. O rótulo ainda tem erro de concordância ("1 consultas", "1 faltas").
- O que deveria acontecer: a trilha começa no primeiro atendimento registrado, ou a falta aparece de alguma forma. O que se vê precisa bater com o que se anuncia.

**7. Faltam as ações dos estados vazios e o "+" das pastas (P2, §4.2.3, §4.4, §0.5 "estado vazio honesto e com ação")**
- Reproduzir: em qualquer paciente, procure o card `+` na grade de pastas. Em Henrique, veja Escalas e Exames vazios.
- O que acontece: o card `+` não existe para nenhum paciente, então não há envio de exame pela visão geral. "Nenhum exame anexado." e "Nenhuma escala aplicada…" só oferecem "Abrir ↗". Não existe o "Aplicar escala" do §4.4. O vazio de Escalas é texto solto, sem card.
- O que deveria acontecer: card `+` que abre o envio já com o tipo, e "Aplicar escala" no card vazio (com permissão).

**8. A cápsula da linha de consultas não leva ao item clicado (P1, §4.3)**
- Reproduzir: em Clara, clique na cápsula "2026 Ago 25 Faltou" (captura `02-rail-clique-25ago.png`).
- O que acontece: o painel abre em Linha do tempo, no topo (Outubro de 2026). Nada rola até o item de 25/08 nem o destaca, e o foco vai para o título do painel.
- O que deveria acontecer: "O clique abre o painel na Linha do tempo, no item clicado."

**9. O Vanderbilt aparece com dois máximos na mesma tela, e o gráfico não usa escore/máximo (P2, §4.4)**
- Reproduzir: em Clara, compare o card do Vanderbilt com o painel Linha do tempo.
- O que acontece: o card (e o painel Escalas) mostram "14 /54". A aplicação registrada e a Linha do tempo dizem "14/36". O mini gráfico também não usa y = escore/máximo, e sim uma escala ajustada aos dados (SNAP-IV ≈ 2,5 px por ponto, Vanderbilt ≈ 3,8 px por ponto). Uma queda de 6 pontos ocupa um terço da altura. Número, variação (−5, −6), seta, nota e "há N" batem com as aplicações.
- O que deveria acontecer: um único máximo por aplicação, o registrado, ou a divergência resolvida na origem. E o eixo segue a regra do §4.4.

**10. A folha de PDF sem arquivo mostra erro técnico em inglês, duas vezes (P2, §0.8, §7)**
- Reproduzir: em Clara, abra a pasta Pareceres e clique na folha "Parecer fonoaudiológico" (captura `07-folha-pdf-erro-tecnico.png`).
- O que acontece: aparecem dois toasts vermelhos com *"Failed to execute 'get' on 'IDBObjectStore': No key or key range specified."* Pela lista do painel Exames sai um só, então a pasta duplica o erro.
- O que deveria acontecer: uma mensagem em português ("Arquivo indisponível") e a folha marcada como sem arquivo.

Pontos menores, fora do top 10:
- **Ordem dos responsáveis:** com 3 responsáveis, o principal (a mãe, primeiro da lista) passa para o "+", sem telefone, e o mais novo cadastrado aparece no lugar dele.
- **Foco perdido:** depois de Esc em "Editar ficha", e depois do voltar do navegador fechando o painel, o foco vai para o `body`.
- **Rótulos:** o `aria-label` das pastas repete a contagem ("Abrir pasta 3 arquivos, 3 arquivos").
- **Canvas:** o canvas não tem `aria-describedby` (§4.3).
- **Linha do tempo:** mostra as chaves cruas `exame_imagem` e `parecer_fono`.
- **Contagens de Escalas:** a pílula diz 7 (aplicações) e o cabeçalho do painel diz "3 instrumentos aplicados".
- **Roving tabindex:** as setas movem o foco entre as pílulas sem mover o tabindex (ele só acompanha a pílula ativa).

## O que conferi e funciona
- **Cabeçalho:** idade, nascimento, "em acompanhamento desde", status, chips de CID, Editar ficha e Emitir documento (os dois abrem). Nome social aparece com "Nome de registro" e no breadcrumb.
- **Estados de agora:** "Atrasado" (Alice), "Na recepção" e "Em atendimento" (Antonella), "Sem desfecho" com Remarcar (Clara, Rafael) e "Sem consentimento para teleconsulta · 2 já realizadas" (Rafael).
- **Rodapé da coluna esquerda:** "Próxima 21/10 08:00 · Emissão de laudo · amanhã · Remarcar" (Felipe) e "Sem retorno agendado — agendar", que leva para a Agenda (Henrique). Remarcar abre o diálogo e devolve o foco.
- **Pílulas:** as 8 seções existem e abrem a certa, com `?secao=` correto. As contagens batem com o conteúdo: Evoluções 1, Escalas 7 = 4+1+2, Marcos 4, Medicações 2, Exames 7 = 3+3+1, Consentimentos 2 concedidos, Documentos "1 a emitir" (Felipe, com a classe de alerta).
- **Fechamento do painel:** Esc (inclusive com o foco dentro do painel) e "Voltar à visão geral" fecham e devolvem o foco à pílula. O voltar do navegador fecha e o avançar reabre. `?secao=xyz` cai na visão geral.
- **Pastas:** ↗ abre Exames filtrado ("Mostrando só: …"), e o filtro zera ao reabrir pela pílula. A folha de imagem abre a pré-visualização real. As datas mostram o exame mais recente de cada origem.
- **Palco:** hover e clique acertam a mesma estrutura, e os lados batem com a vista frontal. A lista (`listbox`) aceita setas, Enter, Esc e ×, com o foco voltando à lista. Os textos "O que faz" das 30 estruturas estão anatomicamente corretos, em linguagem simples e sem promessa diagnóstica. "Relacionado ao paciente" some para quem não tem anexo. Os alertas ficam soltos no canto, sem pino.
- **Sem WebGL:** aparecem a mensagem e a lista de botões, e os alertas e a página continuam inteiros.
- **Desempenho:** a renderização para depois da interação e com o painel aberto (0 draw/s).
- **Coluna direita:** Medicações e Marcos (2 atingidos, 1 emergente, 1 atrasado = 4) batem. O vazio de medicação traz a frase de segurança palavra por palavra.
- **Teclado:** o Tab passa por pílulas, pastas, lista de estruturas, camadas, zoom, cápsulas e cards de escala.

## Não verificável aqui
- **Permissões (`can.write`):** a base de verificação só tem o papel `doctor`.
- **5 ou mais alertas ao mesmo tempo:** não montei esse estado.

## Dados de teste que registrei, todos revertidos
Em Antonella Moura Cunha:
- **Responsáveis:** criei 2 responsáveis ("Teste Crítica Pai" e "Teste Crítica Avó") e depois os removi por exclusão lógica, com o motivo "teste da crítica de dados".
- **Ficha:** mudei por alguns minutos o nome social ("Nina Teste") e as alergias, e voltei aos valores originais.
- **Atendimento de hoje:** o status do agendamento de 20/10 passou por `aguardando` e `em_atendimento` e voltou a `agendado`, com check-in e início zerados.

A auditoria guarda essas operações.
