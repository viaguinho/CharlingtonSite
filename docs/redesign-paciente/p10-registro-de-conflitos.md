# Passada 10 — registro único de conflitos (prontuário do paciente)

**Estado (28/10/2026): todos os itens marcados "Corrigir" foram corrigidos, exceto o que aparece em "Ainda aberto" no fim.** Verificação: bateria de 207 casos da regra de alergia em Node; telas conferidas com adaptador em memória (B1, G1, G4, G5, G6, G7, G8, M1); varredura de rolagem a 320×256, 853×480 e 1280×500 (B2); contagem de ouvintes `keydown` em 6 aberturas (SM1); hover do palco depois da limitação (SG2).

Reúne as duas críticas de contexto limpo da passada 10 (28/10/2026), feitas depois das correções da P9 e das decisões do dono (vidro só em pílulas e botões pequenos, faixa mínima de alergia, cotrimoxazol nos dois sentidos): `critica-p10-dados-robustez.md` (B, G, M) e `critica-p10-sistema-fidelidade-desempenho.md` (S: G, M do segundo relatório aparecem aqui como SG e SM). Regra do dono: reunir todos os achados antes de corrigir; os agentes não corrigem.

## Vereditos

| Peça | Dados e robustez | Sistema | Fidelidade | Desempenho |
|---|---|---|---|---|
| P1 Palco e alertas | REPROVA (B1, B2) | APROVA | APROVA | REPROVA (SG2) |
| P2 Colunas | REPROVA (G4, G7) | APROVA | APROVA | APROVA |
| P3 Seções e modais | REPROVA (G1, G5, G6, G8) | APROVA com menores | APROVA com menores | REPROVA (SG1) |
| P4 Faixa e estados | APROVA | APROVA | APROVA | APROVA (SM2) |

Contagem: 2 BLOQUEIA (B1, B2) · 10 GRAVE (G1 a G8 de dados; SG1, SG2) · 25 MENOR (14 de dados, 11 de sistema).

## Decisão por item: dados e robustez

| ID | Problema | Decisão |
|---|---|---|
| B1 | Negação seguida de alergia real ("Nega alergias. Urticária com dipirona") some de toda a tela. Regressão minha da P9 | Corrigir: a negação só vale quando o texto inteiro é negação mais palavras de enchimento (alergia, medicamento, reação, "conhecida"…). Qualquer outra palavra mantém o texto como alergia. Na dúvida, mostrar. Efeito colateral aceito: "Nega alergia a dipirona" passa a aparecer como alergia (falso aviso custa um clique) |
| B2 | A 400% e em janelas de até 520 px de altura a alergia sai da vista na visão geral. A faixa mínima que fiz só valia dentro do painel | Corrigir: na janela baixa a alergia (só ela) gruda sozinha no topo da visão geral; a barra de seções rola |
| G1 | "Revisei a alergia" vale para um conflito novo | Corrigir: a confirmação zera quando o conjunto de alergias em conflito muda |
| G2 | Classes e genéricos sem aviso (cefaclor, co-trimoxazol com hífen, "sulfametoxazol + trimetoprima", betalactâmicos, AINH, indometacina, ácido mefenâmico, anticonvulsivante aromático, pirazolonas) | Corrigir: hífen e ponto normalizados, alergia a combinação vale para cada componente, classes novas |
| G3 | Marcas sem aviso (Cefaliv, Sedalgina, Doralgina, Benzetacil, Clavulin, Keflex, Rocefin, Ponstan, Buscofem, Profenid, Epelin, Lamitor) | Corrigir: entram as de composição conhecida; as três de dipirona têm bula conferida pelo crítico. Benegrip e Maxalgina ficam fora até conferir em bula. Todas seguem para a revisão médica |
| G4 | Medicação não confere posologia nem observações | Corrigir: a mesma conta da prescrição (posologia, observações e concentração entram) |
| G5 | O diálogo de assinar rascunho não mostra a alergia | Corrigir: `AllergyNotice` com o plano da evolução |
| G6 | Esc no "Confirme sua identidade" fecha também a emissão e descarta o documento | Corrigir: pilha de diálogos; só o de cima trata Esc e Tab |
| G7 | Alergia gravada como texto derruba o prontuário; como objeto vira "[object Object]" | Corrigir: aceita texto (separado por ; , ou quebra de linha) e objeto com nome; forma desconhecida aparece como alergia ilegível, nunca "nenhuma" |
| G8 | Responsável da ficha que não é encontrado vira "não cadastrado". Efeito da minha leitura por id (G9-3) | Corrigir: id sem registro é "não foi possível ler o responsável"; registro excluído logicamente some em silêncio, como antes |
| M1 | Esc ou × na emissão descarta a prescrição digitada | Corrigir: o rascunho da emissão sobrevive ao fechar e some ao emitir |
| M2 | "Quantidade" da prescrição não é conferida | Corrigir |
| M3 | Modelos ilegíveis viram "Nenhum modelo salvo" | Corrigir: "Não foi possível ler os modelos" |
| M4 | Foco cai no `<body>` quando o gatilho some ou fica desabilitado | Corrigir: o painel recebe o foco |
| M5 | "Mostrar mais" deixa o foco no botão que pula para o fim | Corrigir: o foco vai ao primeiro item novo |
| M6 | A rolagem suave ignora o movimento reduzido | Corrigir |
| M7 | Escala ou medicação com data futura já gravada entra como atual | Não corrigir agora: só entra por importação ou relógio errado, e os formulários já recusam. Fica em aberto |
| M8 | Nascimento inválido diz "não informada" | Corrigir o texto: "data de nascimento inválida" |
| M9 | Nome de 80 caracteres a 375 px gera rolagem lateral pela trilha | Corrigir: a última migalha corta com reticências dentro do prontuário |
| M10 | Árvore de acessibilidade: lista de alertas sem `listitem`, modais sem `aria-describedby` | Corrigir o `aria-describedby`; a lista de alertas fica em aberto se exigir mexer na estrutura |
| M11 | forced-colors: faixas de alergia sem borda | Corrigir |
| M12 | `Button` com `loading` e `disabled={false}` fica habilitado | Corrigir na ordem das propriedades do botão |
| M13 | Alvos de 40 px no celular | Resolvido junto com SM3 |
| M14 | "Amox" e "A.A.S." não avisam | Corrigir |
| Fora do escopo | No cadastro e na ficha, uma alergia digitada sem Enter é descartada em silêncio (`PatientForm`, `ChipListField`) | Precisa do dono: o modal "Editar ficha" está fora do escopo da página |

## Decisão por item: sistema, fidelidade e desempenho

| ID | Problema | Decisão |
|---|---|---|
| SG1 | O desfoque do palco atrás do painel (`filter: blur(5px)`) ainda gasta ~200 ms/s de GPU | Corrigir: sem `filter` no palco com o painel aberto |
| SG2 | Hover no cérebro: raycast triângulo a triângulo, 615 ms/s no main e 57,8 fps a 4× | Corrigir: sondagem limitada a ~16 por segundo, só quando o ponteiro anda mais de 2 px, e o resultado vale até o próximo quadro de sondagem |
| SM1 | Um ouvinte `keydown` do OrbitControls vaza por abertura | Corrigir: remover do nó raiz guardado no momento da criação |
| SM2 | A faixa de consultas monta todas as cápsulas (303 com 300 consultas) | Corrigir se couber numa janela simples em volta de "hoje"; senão fica em aberto |
| SM3 | Alvos de 40 px em toque (painel a 390 px, pílulas a 1024 com toque) | Corrigir: 44 px em ponteiro grosso e abaixo de 768 px |
| SM4 | A 1ª abertura da sessão trava 385 ms a 4× (cálculo do plexo) | Corrigir: a montagem cede a thread entre as malhas |
| SM5 | CSS de vidro sem efeito, token desatualizado, duplicatas | Corrigir |
| SM6 | Duas cores literais fora de `tokens.css` | Corrigir: tokens `--pr-card-solid` e `--pr-panel-solid` |
| SM7 | O véu forma uma moldura cinza de 8 px; o cabeçalho tem um branco diferente do corpo | Corrigir |
| SM8 | A 1024 px com o painel aberto a alergia aparece duas vezes | Manter: redundância intencional da regra "alergia nunca some" (guia §0.6) |
| SM9 | As abas do painel no celular cortam a última palavra sem esmaecer a borda | Corrigir: máscara de rolagem em CSS |
| SM10 | Rótulo da régua de Escalas hifenizado em 3 linhas a 390 px | Corrigir |
| SM11 | Espaçamentos em px solto em `anatomy.css` | Não corrigir: trocar por tokens mudaria a aparência sem ganho. Fica em aberto |

## Precisa do dono

| Item | Por quê |
|---|---|
| `PatientForm`: alergia digitada sem Enter é descartada | Perde um dado de segurança sem avisar, mas o modal "Editar ficha" está fora do escopo da página. Proposta: ao sair do campo, o texto vira pílula |
| Marcas sem bula conferida | Epelin, Lamitor, Benzetacil, Clavulin, Keflex, Rocefin, Ponstan, Buscofem e Profenid entram por conhecimento geral; Benegrip e Maxalgina ficaram de fora. Revisão médica em `alergias-tabela-e-fontes.md` |

## Ainda aberto

- **M7:** escala ou medicação com data futura já gravada entra como atual (só por importação ou relógio errado).
- **M10 (parte):** a lista de alertas do paciente tem `role=status` filho direto de `ul`; exigiria mexer na estrutura do `AlertPills`.
- **M13:** alvos de 40 px em celular sem ponteiro grosso real (emulação); com `pointer: coarse` e abaixo de 768 px agora são 44 px.
- **SM8:** a alergia aparece duas vezes a 1024 px com o painel aberto. Mantido de propósito.
- **SM10:** rótulo da régua de Escalas hifenizado em 3 linhas a 390 px: o corte da faixa dá 77 px ao rótulo; consertar exige largura dinâmica dos rótulos.
- **SM11:** espaçamentos soltos em `anatomy.css`: trocar por tokens mudaria a aparência.
- **Suspeitas dos críticos:** AAS/AINE ↔ dipirona nos dois sentidos (decisão clínica já registrada), cefalexina → amoxicilina, sulfassalazina, texto de laudo e atestado com conduta, `_stepLift` e `_inset` lendo `clientHeight` a cada quadro.
