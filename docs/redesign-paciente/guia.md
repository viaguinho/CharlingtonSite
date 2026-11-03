# Guia do redesign — Prontuário do paciente (estilo Quantis, tema claro)

> Fonte de verdade para quem construir, revisar ou criticar esta tela. Alinhado com o dono por /grill-me em 20/10/2026.
> Referência: "Quantis — Health Intelligence System Desktop App" (Jack R. / RonDesignLab, Dribbble 27474777). Capturas em `scratchpad/quantis-ref/` da sessão; descrição completa na §2.
> Rota: `#/pacientes/:id` → `admin/modules/patients/PatientRecordScreen.jsx`.

---

## 0. Regras inegociáveis

1. **Só esta página muda.** O shell global (barra do topo com busca, "Dados de demonstração", unidade, notificações) e o **menu vertical (dock) são intocáveis**: o dock é desenho manual do dono.
2. **Todo conteúdo e função atuais ficam.** Nada do prontuário some: cabeçalho (estados, remarcar, alergias, consentimento de teleconsulta, sem desfecho, atrasado, na recepção, próxima consulta), as 8 seções com todos os formulários e ações, o painel de contexto (alergias, diagnósticos, medicações, acompanhamento, perfil sensorial, escola), as permissões (`can.write`), o modal de documento, a remarcação e a ficha.
3. **Tema claro, tokens atuais.** Urbanist (`var(--font)`), neutro + azul. **Nenhum hexadecimal fora de `admin/styles/tokens.css`.** Cor nova vira token com prefixo próprio (`--pr-*` para a página, `--anat-*` para a anatomia, `--gf-*` para as pastas).
4. **Cor por estrutura só dentro do modelo anatômico** (exceção registrada em 20/10/2026). Fora do palco 3D, vermelho, verde e âmbar continuam sendo só sinal.
5. **Dados sempre reais.** Nenhum achado inventado sobre o cérebro, nenhum peso, altura ou "idade biológica" que o sistema não tem. Sem dado, mostra-se um estado vazio honesto e com ação.
6. **Alergia nunca some** em nenhuma largura.
7. **Admin é CSS puro.** Nada de Tailwind e nada em `/components/ui` (que serve o site público). Componentes do admin ficam em `admin/components/` ou no módulo, e o CSS em `admin/styles/components/*.css`, importado em `admin/styles/index.css`.
8. Texto da interface em português do Brasil, na linguagem do produto. Controles dizem a ação que fazem.

---

## 1. Decisões do /grill-me (20/10/2026)

| Tema | Decisão |
|---|---|
| Arquitetura | **Visão geral + painel.** A tela inicial do paciente é a composição Quantis. As 8 seções viram pílulas no topo; ao escolher uma, o conteúdo completo abre num **painel de vidro largo sobre o centro**, com o palco desfocado atrás. |
| Anatomia | **3D em Three.js**, estilo plexo (pontos e linhas finas sobre a malha real). Gira ao arrastar; o hover acende a estrutura. |
| Recorte | **Busto**: cabeça, pescoço e parte do tórax. Crânio em plexo translúcido, cérebro super detalhado dentro, medula e coluna cervical, coração. Começa enquadrando a cabeça, com zoom para afastar. |
| Cor | **Exceção só na anatomia**: cérebro nos azuis, coração e artérias no vermelho, nervos no âmbar, osso em grafite. O resto da página segue neutro + azul. |
| Dados no modelo | **Anatomia + alertas reais.** O hover mostra nome e função da estrutura em linguagem simples, para explicar à família. As pílulas de alerta usam estados que já existem (alergias, sem desfecho, sem consentimento, atrasado, na recepção) e flutuam no palco **sem pino em região**. |
| Pastas | **Miniatura real + folha.** Exames JPG/PNG/WebP aparecem como miniatura decifrada só em memória (object URL, revogada ao desmontar). PDF vira folha de papel com título e data. O fundo da pasta usa arte gerada nos azuis. O `+` abre o envio de exame que já existe. |
| Processo | Primeiro uma versão completa para o dono **ver**. Depois, **3 passadas** de design-loop com 3 críticos, com correções aplicadas por mim; para depois da 3ª. |
| Esforço | Tarefa simples: modelo menor e esforço baixo. Tarefa robusta: modelo maior e esforço alto. Críticos: haiku (checagem mecânica), sonnet (sistema/tokens), opus (fidelidade e acabamento). O fable não é usado (falha com 429). |

---

## 2. A referência, dissecada

### 2.1 Composição
- **Canvas** quase preto com **matriz de pontos** fina e regular (~22 px), visível só como textura de mesa técnica.
- **3 colunas sobre um palco único**: à esquerda (~26%), uma pilha de cards do paciente; no centro (~44%), o corpo em plexo ocupando a altura toda e invadindo as margens; à direita (~30%), pílulas de categoria e uma grade de cards de biomarcadores. Os cards **flutuam sobre o palco**, sem moldura de página: o corpo passa por trás deles.
- **Barra superior em pílulas soltas**: logo redondo, "Category: Summary ▾", busca redonda, "Overview", "Biometrics" (ativa, preenchida em lima), "Department: Radiology – Lab 03 ▾", "Protocol: Full Body – Deep Scan ▾", "Reports". À direita, 3 botões quadrados arredondados (ajustes, salvar, sino com contador vermelho).
- **Base do palco**: linha do tempo horizontal de exames, em cápsulas de vidro ("2020 Jan · ícone · ••••◉ · Optimal"), separadas por traços verticais finos. Embaixo à direita, os controles `+` `−` `3D`.

### 2.2 Cards
- Superfície cinza-grafite um tom acima do fundo, **raio grande (~22–26 px)**, sem borda, sombra quase nula; a separação vem da diferença de tom.
- **Título** em Urbanist/Outfit regular 15–16 px. **Número** enorme e fino (peso 200–300, ~56 px) com a **casa decimal num cinza mais claro** e a **unidade pequena e cinza colada ao número** ("5.7%", "113.1mg/dl").
- **Traço vertical colorido de 2 px antes do título** (amarelo, verde, vermelho), que é o código de estado do biomarcador.
- **Seta de tendência** fina (→ ↘ ↗) ao lado do número.
- **Pílula de variação** ("+1.2 pg/ml") em fundo tingido da cor do estado.
- **Mini gráfico de pontos**: faixa de referência retangular tingida, linha-limite fina no topo, 4 a 6 pontos brancos espalhados no tempo, **o último ponto com anel** (◉), e o ponto fora da faixa em vermelho sobre a linha.
- **Nota de rodapé** cinza, em 2 linhas ("Approaching upper reference limit", "Higher than previous baseline").
- Os cards têm alturas diferentes e encaixam em alvenaria: o card alto mostra mais contexto.

### 2.3 Coluna esquerda
- "‹ Leo Vance / ID: SV-7294": botão circular de voltar e nome grande e leve.
- Seletor "Record: Family History ▾" em pílula larga.
- **Patient Profile**: card de vidro tingido com degradê de luz, linhas rótulo/valor em 3 colunas (Age, Gender, Ethnicity), "Weight and Trend 63.6 kg" com uma **trilha tracejada** (traços de comprimentos variados que codificam a série).
- **Biological Age**: card com ID pequeno, ponto de estado + "Optimal", e um mini gráfico de 2 valores com pontos coloridos e linha.
- **Pastas**: dois cards ("Tomography Jan 12, 2020 ↗", "Radiography Feb 14, 2022 ↗") com uma pasta de vidro fosco no centro, folhas de exames saindo em leque e o rótulo "image: 12" no vidro.
- No pé, uma pílula preenchida "Doctor: Julian Hayes ▾" e um botão circular de perfil.

### 2.4 O corpo
- Malha triangulada: **pontos nos vértices ligados por linhas finíssimas brancas**, densidade alta, com vértices mais claros em nós. O interior aparece por transparência (camadas sobrepostas).
- **Estruturas destacadas ficam sólidas e coloridas** (clavícula e úmero amarelos, pulmão vermelho), com textura interna (osso trabecular) e a malha de plexo por cima.
- **Pinos**: ponto branco num círculo cinza com anel fino ao redor, e rótulo em texto pequeno e girado conforme a superfície ("Right Clavicle", "Lower Ribs", "Turbine H1").
- **Pílulas de alerta** de vidro tingido ("⚠ Mild Inflammation", "⚠ Reduced Density"), com o triângulo de alerta preenchido.
- **Popover de detalhe** ("Aortic Valve", etiqueta "High Risk" vermelha, ×): vidro escuro com a cor do órgão vazando pelo lado esquerdo desfocado, e linhas rótulo/valor alinhadas à direita (Flow → Severely Restricted…).
- **Seletor radial** à esquerda do corpo: um arco fino com nós, e ícones redondos de sistema (coração, gota, sol) dispostos sobre ele.

### 2.5 Movimento e luz
- Foco seletivo (profundidade de campo nas capturas): o que não está em foco fica desfocado. Na tela, isso vira **desfoque nos painéis de vidro**, não no conteúdo.
- O vidro tem **luz especular suave** no topo e reflete a cor do que passa por trás.

### 2.6 O que NÃO vem da referência
- O fundo escuro, o lima e a densidade de cor. O tema fica claro e o lima vira o azul da marca (já decidido em 14/10).
- Biomarcadores de laboratório, "Biological Age" e peso: não existem no prontuário e não podem ser imitados com dado falso.

---

## 3. Tradução para o nosso tema claro

| Elemento Quantis | Charlington claro |
|---|---|
| Fundo preto com pontos | `--canvas` atual com a aurora suave do painel. Matriz de pontos **só dentro do palco anatômico** (`--pr-dot`, ~4% de tinta, passo 22 px), apagando nas bordas com máscara radial. É a "mesa de exame" do modelo, não papel de parede. |
| Card grafite | Card de vidro claro (`--card-glass`, `--e-glass`, raio `--r-card` 28 px), sem borda de 1 px junto com sombra larga (declarar elevação uma vez só). |
| Lima ativo | Pílula de seção ativa em `--tab-active-bg` (tinta), a mesma gramática de aba do painel inteiro. O azul preenchido fica para a pílula da próxima consulta (o "Doctor" lima da referência) e a estrutura em foco. Decidido na passada 1 (azul aparecia em 5+ lugares na dobra). |
| Traço colorido antes do título | Traço de 2×14 px, `--r-pill`, na cor do **risco real** da última aplicação, em marca de dado ≥ 3:1 (baixo `--data-positive`, moderado `--data-caution`, alto `--data-negative`; sem risco, `--ink-200`). Passada 1: `--signal-*` media 1,9–2,3:1. |
| Número fino com decimal cinza | `--w-light` (300), `--t-metric-lg` (52 px), `font-variant-numeric: tabular-nums`; a parte depois do separador e a unidade em `--ink-300`. |
| Plexo branco | Plexo em tinta: linhas `--anat-line` (tinta a 14–18%), vértices `--anat-node` (tinta a 35%). O cérebro em repouso fica um degrau mais denso e levemente azulado (`--anat-brain-rest`) para ser o foco. |
| Estrutura destacada | Preenchimento sólido translúcido na cor da estrutura, borda de Fresnel mais clara, plexo da própria estrutura tingido. |
| Popover escuro | Popover de vidro claro (`--rp-glass-strong` + `--glass-filter`), com a cor da estrutura vazando desfocada pelo lado esquerdo (pseudo-elemento com `filter: blur(28px)`). |

**Tipografia:** só os tamanhos da escala (`--t-micro` 11, `--t-body` 14, `--t-title` 22, `--t-page` 32, `--t-metric-lg` 52), no máximo 4 por tela. Na visão geral: 11 · 14 · 32 · 52 (o 22 fica para o título do painel de seção). O micro serve só de apoio (contagem de pílula, mês da faixa de consultas, eixo); nota, data de item e o que qualifica um número vão em corpo 14, `--ink-400`. Nome do paciente em `--t-page`, `--w-light`, `--ls-page`. Títulos de card em `--t-body`, `--w-medium`. Rótulos em `--ink-400` (nunca abaixo de 4,5:1 no vidro: medir sobre o pior ponto do palco).

**Proibido aqui** (piso de qualidade): sobrelinha/eyebrow acima de título, numeração 01/02 nas seções, texto em degradê, borda colorida grossa em card, sombra dura deslocada, emoji no lugar de ícone (usar `Icon.jsx`), glifo unicode como ícone.

---

## 4. Arquitetura da página

```
┌ Shell global (intocado) ─────────────────────────────────────────────────────────────┐
│ dock │ ‹ Alice Queiroz Lemos   [Visão geral][Linha do tempo][Evoluções][Escalas]…  ✎ ⎙ │
│      │ 2a 9m · 01/01/2024 · desde 25/08/2026                                         │
│      │ ┌ coluna esquerda ┐   ╭──────── palco anatômico ────────╮  ┌ coluna direita ┐ │
│      │ │ Perfil (vidro)  │   │  ⚠ Alergia: dipirona            │  │ Escala CARS    │ │
│      │ │ Diagnósticos    │   │        ╱╲  busto em plexo  ◖    │  │ 28/60 ↗  ◉     │ │
│      │ │ Pastas (2×2)    │   │  arco  ╲╱  cérebro detalhado    │  │ Medicações     │ │
│      │ │ [Próxima: …]    │   │                 [ + − Frente ]  │  │ Marcos         │ │
│      │ └─────────────────┘   │ ( ago 2026 · Retorno ✓ )( set ) │  └────────────────┘ │
│      │                       ╰─────────────────────────────────╯                     │
└──────┴───────────────────────────────────────────────────────────────────────────────┘
pílula de seção clicada → painel de vidro largo sobre palco + coluna direita (Esc fecha)
```

### 4.1 Barra da página (substitui o cabeçalho atual)
- Linha 1: botão circular **voltar** (para `/pacientes`, `aria-label="Voltar para Pacientes"`), **nome** (`nomeSocial || nome`; nome de registro em linha menor quando houver), e à direita os botões que já existem: **Editar ficha** (ícone + texto), **Emitir documento** (primário azul, só com `can.write('documents.issue')`).
- Linha 2: metadados atuais (idade, nascimento, "em acompanhamento desde …"), status do paciente e diagnósticos em chips de código.
- Linha 3: **pílulas de seção** em barra de vidro rolável na horizontal: `Visão geral` + as 8 seções, com a contagem atual (`counts`, incluindo "N a emitir" em âmbar nos documentos). A pílula ativa é preenchida em azul. Teclado: setas movem o foco (tabindex móvel), Enter abre. A seção vai para `?secao=` na URL (hash router) para dar link direto e voltar com o botão do navegador.
- O breadcrumb atual ("Pacientes › Nome") fica, com o mesmo componente `Breadcrumb`.

### 4.2 Coluna esquerda (≈ 320–360 px)
1. **Perfil** (card de vidro com luz no topo, como o "Patient Profile"): grade rótulo/valor em 3 colunas, com Nascimento (idade), Sexo (`patient.sexo`, só se preenchido) e Responsável (nome + parentesco + telefone; com mais de um, "+ N"). Abaixo, **Acompanhamento** com a trilha tracejada da referência: cada consulta concluída é um traço sobre a linha do tempo desde a primeira até hoje, com espaçamento proporcional à data (dado real); a falta é um traço em `--data-soft`; o próximo agendamento é um anel. À direita, "N consultas". Escola e perfil sensorial entram como linhas do mesmo card quando existirem ("Evitar", "Funciona", "Espera").
2. **Diagnósticos ativos** (como "Biological Age"): cada CID com ponto de estado, código em `tabular-nums` e descrição. Sem diagnóstico: "Nenhum diagnóstico registrado".
3. **Pastas de exames**: grade 2×N de cards com o componente `GlassFolder` (`admin/components/GlassFolder.tsx`). Uma pasta por origem que tem arquivo (`exame_imagem` → "Imagem", `exame_neurofisiologico` → "Neurofisiológico", `exame_laboratorial` → "Laboratorial", `exame_genetico` → "Genético", pareceres → "Pareceres", `relatorio_escolar` → "Escolar", `outro` → "Outros"). O card mostra o título, a data do exame mais recente e `↗` (abre a seção Exames filtrada por origem), com a pasta no centro e o rótulo no vidro ("3 arquivos"). Imagem vira miniatura real decifrada (até 4 visíveis, carregadas só quando a pasta entra na tela; object URL revogada ao desmontar); PDF vira folha com título. O clique numa folha abre a pré-visualização que já existe em `AttachmentsView`. Um card extra com `+` (`action="add"`) chama o envio real.
4. **Rodapé** da coluna: pílula azul preenchida **"Próxima: 28/10 09:30 · Teleconsulta"** com **Remarcar** quando permitido (é o "Doctor: Julian Hayes" da referência). Sem próxima: "Sem retorno agendado — agendar". Os estados de agora (na recepção, em atendimento, atrasado, sem desfecho) **substituem** a pílula, como faz o cabeçalho atual.

### 4.3 Palco anatômico (centro, ocupa a altura útil)
- Componente `admin/modules/patients/anatomy/AnatomyStage.jsx` (lazy: `React.lazy` + `import('three')` só nesta rota). Fundo transparente sobre a matriz de pontos com máscara.
- **Modelo**: `admin/assets/anatomia/busto.glb` (meshopt), com nós nomeados pelo `id` da tabela do §5.
- **Câmera** inicial em ¾ frontal da cabeça; arrastar gira (órbita com amortecimento, limite de polar); roda e `+ −` aproximam; botão de vista alterna **Frente · Lateral · Topo · ¾**. Gira devagar sozinho até a primeira interação, mas não com `prefers-reduced-motion`.
- **Hover** (raycast na malha sólida invisível de cada estrutura): a estrutura acende na cor dela (preenchimento translúcido + Fresnel + plexo tingido), as vizinhas recuam para 40%, e um **pino** aparece no ponto de contato com o rótulo curto. **Clique** fixa a seleção e abre o **popover de vidro** com nome completo, lado, "O que faz" (1–2 frases simples, para a família) e "Relacionado ao paciente": só ligações reais, como "2 exames neurofisiológicos" quando o tipo de exame tem relação com a estrutura (EEG ↔ córtex; RM ↔ encéfalo), ou nada. Esc ou × fecha.
- **Teclado e leitor de tela**: uma lista oculta-visível (`role="listbox"`) espelha as estruturas; Tab entra no palco e as setas percorrem as estruturas, acendendo cada uma no modelo. O canvas tem `aria-describedby` com a descrição do recorte.
- **Seletor radial de camadas** (o arco da referência) à esquerda: ícones redondos sobre um arco fino para **Cérebro**, **Crânio**, **Vasos**, **Coluna e medula** e **Coração**. Cada um liga e desliga a camada com transição de opacidade; o nó ativo do arco desliza até o ícone.
- **Pílulas de alerta** flutuando no canto superior esquerdo do palco, empilhadas: alergias (vermelho), consulta sem desfecho (vermelho), atrasado hoje (vermelho), na recepção/em atendimento (âmbar), sem consentimento de teleconsulta (âmbar). Elas usam os mesmos textos e ações do cabeçalho atual (Remarcar). **Nunca** ficam presas a uma região.
- **Linha do tempo de consultas** na base do palco (a faixa de cápsulas da referência): cápsulas de vidro por atendimento (mês/ano em duas linhas, ícone do tipo, pontos de estado, rótulo de status), rolagem horizontal, as futuras à direita de um traço "hoje". O clique abre o painel na Linha do tempo, no item clicado.
- **Controles** no canto inferior direito: `+`, `−` e vista (como `+ − 3D`), botões quadrados de vidro de 44 px.
- **Crédito** discreto no pé do palco (`--t-micro`, `--ink-300`): "Modelos 3D: Human Reference Atlas (HuBMAP/Allen Institute) e BodyParts3D © DBCLS — CC BY 4.0, modificados".
- **Sem WebGL** ou com erro de carga: o palco mostra a lista de estruturas em botões (com a mesma descrição) e a mensagem "Não foi possível abrir o modelo 3D neste navegador". A página continua inteira.
- **Desempenho**: renderiza sob demanda (só quando há interação, animação ou rotação), pausa com a aba oculta, com o painel de seção aberto ou fora da tela. `devicePixelRatio` limitado a 2. Meta de 60 fps num notebook com GPU integrada.

### 4.4 Coluna direita (≈ 340–380 px)
- **Escalas** (os cards de biomarcador): um card por instrumento aplicado (o mais recente de cada `instrumento`), em alvenaria de 2 colunas. Cada card tem o traço de risco antes do título, o escore em número fino, a unidade "/máx" pequena e cinza, a seta de tendência contra a aplicação anterior (só com 2 ou mais aplicações), a pílula de variação ("+4 pts") e o **mini gráfico de pontos** com todas as aplicações no tempo (y = escore/máximo; faixa tingida na cor do risco atual; último ponto com anel; ponto de risco alto em `--signal-red`). Rodapé com a `interpretacao` real e "Aplicada há N semanas". O clique abre a seção Escalas. Sem escala: card vazio "Nenhuma escala aplicada" com "Aplicar escala" (se houver permissão).
- **Medicações em uso**: nome (princípio ativo), posologia, "desde dd/mm". Vazio: a frase de segurança atual, palavra por palavra.
- **Marcos do desenvolvimento**: resumo real do que `MilestonesView` registra (atingidos / em observação / atrasados, conforme o esquema) e o último registrado.
- **Acompanhamento**: "Consultas realizadas" e a última escala, como `MiniMetricCard` hoje, se não estiverem já no perfil (não duplicar).

### 4.5 Painel de seção (as 8 seções)
- Abre ao escolher uma pílula: painel de vidro (`--rp-glass-strong`, `--glass-filter`, raio 28, `--e-4`) que cobre o palco e a coluna direita e **deixa a coluna esquerda visível** (o contexto do paciente continua à vista). O palco atrás recebe desfoque e escurecimento leve, e a renderização pausa.
- Cabeçalho do painel: título da seção, contagem, ações da seção (as que já existem nas views) e `×` "Voltar à visão geral". Esc fecha; o foco volta para a pílula.
- Corpo: **o componente de view atual sem mudança de lógica** (`TimelineView`, `NotesView`, `ScalesView`, `MilestonesView`, `MedicationsView`, `AttachmentsView`, `DocumentsView`, `ConsentsView`), recebendo os mesmos `viewProps`. O visual interno é reestilizado só por CSS escopado (`.pr-panel …`): cards internos sem caixa dentro de caixa, listas com separadores de 1 px em `--ink-a06`, números em `tabular-nums`.
- Entrada: o painel cresce a partir da pílula (escala 0,98 → 1, opacidade, desfoque de 8 → 0 px, 320 ms, `--ease`). É o único momento coreografado da página, junto com a montagem do busto.

### 4.6 Responsivo
- **≥ 1440 px**: 3 colunas (340 / 1fr / 360).
- **1180–1439**: 300 / 1fr / 320, cards de escala em 1 coluna.
- **1024–1179**: coluna esquerda + palco; a coluna direita desce para baixo do palco em grade de 2.
- **< 1024**: uma coluna só. Barra de seções grudada no topo; perfil, depois o palco com 420 px de altura (arrastar com 1 dedo gira e pinça aproxima; a rolagem vertical continua com o palco fora de foco), escalas, pastas em carrossel horizontal. O painel de seção vira tela cheia.
- Alergia: sempre no topo do palco **e**, abaixo de 1024, também em faixa na barra da página.

---

## 5. Estruturas anatômicas (contrato entre o modelo e o componente)

Cada nó do GLB tem o nome `id` (e `_e`/`_d` para os lados). A camada (`camada`) decide o seletor radial. As cores são tokens novos em `tokens.css`, todos derivados da paleta.

| id | Nome na tela | Camada | Cor (token) | Origem |
|---|---|---|---|---|
| `frontal_e` / `frontal_d` | Lobo frontal | cerebro | `--anat-frontal` (`--blue-500`) | HRA: giros frontais, pré-central, orbitais, reto, polo frontal, frontomarginal, rostral, opérculo frontal, paracentral rostral, bulbo e trato olfatórios |
| `parietal_e/_d` | Lobo parietal | cerebro | `--anat-parietal` (`--blue-300`) | pós-central, parietal superior, supramarginal, angular, pré-cúneo, paracentral caudal, opérculo parietal |
| `temporal_e/_d` | Lobo temporal | cerebro | `--anat-temporal` (`--blue-600`) | temporais sup/méd/inf, fusiforme temporal, Heschl, plano temporal/polar, polo temporal, perirrinal |
| `occipital_e/_d` | Lobo occipital | cerebro | `--anat-occipital` (`--blue-200`) | polo occipital, cúneo, lingual, fusiforme occipital, occipitais sup/inf, radiação óptica |
| `insula_e/_d` | Ínsula | cerebro | `--anat-insula` (`--blue-700`) | giros insulares, límen, córtex insular agranular |
| `limbico_e/_d` | Giro do cíngulo e parahipocampal | cerebro | `--anat-limbico` (`--seq-2`) | cíngulo, istmo, parahipocampal, subcaloso, paracingulado, ambiens, septais, fórnix |
| `hipocampo_e/_d` | Hipocampo | cerebro | `--anat-hipocampo` (`--seq-4`) | cabeça, corpo e cauda do hipocampo |
| `amigdala_e/_d` | Amígdala | cerebro | `--anat-amigdala` (`--seq-5`) | complexo amigdaloide e núcleos |
| `nucleos_base_e/_d` | Núcleos da base | cerebro | `--anat-nucleos` (`--seq-3`) | caudado, putâmen, globo pálido, accumbens, claustro, prosencéfalo basal, núcleo do leito |
| `talamo_e/_d` | Tálamo e hipotálamo | cerebro | `--anat-talamo` (`--blue-100` mais escuro: `--seq-2`) | núcleos talâmicos, geniculados, habênula, zona incerta, hipotálamo, pineal |
| `corpo_caloso` | Corpo caloso | cerebro | `--anat-caloso` (`--blue-050` com traço `--blue-300`) | corpo caloso + comissura anterior (fundir lados) |
| `ventriculos` | Ventrículos | cerebro | `--anat-liquor` (`--blue-100`) | laterais, terceiro, quarto, aqueduto, canal central |
| `cerebelo` | Cerebelo | cerebro | `--anat-cerebelo` (`--seq-4`) | vérmis, paravérmis, hemisférios, núcleos profundos, pedúnculos cerebelares |
| `tronco` | Tronco encefálico | cerebro | `--anat-tronco` (`--seq-5`) | mesencéfalo (colículos, pretectal, pedúnculo, substância negra), ponte, bulbo, oliva |
| `substancia_branca` | (não interativa) | cerebro | plexo neutro | substância branca, tratos — só volume interno, sem hover |
| `cranio` | Crânio | cranio | `--anat-osso` (`--ink-600`) | BP3D: frontal, parietais, temporais, occipital, esfenoide, etmoide, face (maxilas, zigomáticos, nasais, lacrimais, palatinos, conchas, vômer) |
| `mandibula` | Mandíbula | cranio | `--anat-osso` | BP3D mandíbula + hioide |
| `coluna_cervical` | Coluna cervical | coluna | `--anat-osso` | BP3D atlas, áxis, C3–C7, T1–T2, discos |
| `medula` | Medula espinhal | coluna | `--anat-medula` (`--blue-300`) | BP3D medula espinhal (só o trecho do busto) |
| `coracao` | Coração | coracao | `--anat-coracao` (`--signal-red`) | BP3D coração |
| `arterias` | Carótidas e vertebrais | vasos | `--anat-arteria` (`--signal-red-ink`) | BP3D carótidas comuns/internas, vertebrais, arco aórtico |
| `nervos` | Nervo vago (se houver) | vasos | `--anat-nervo` (`--signal-amber`) | BP3D vago direito/esquerdo, se presentes |
| `pele` | (não interativa) | — | plexo `--anat-line` a 50% | HRA pele, recortada da metade do tórax para cima |

Textos "O que faz" ficam em `anatomy/estruturas.js` (id, nome, lado, função em 1–2 frases revisáveis, relação com tipos de exame). Linguagem simples e correta, sem promessa diagnóstica. O dono revisa antes da passada 1.

### 5.1 Material do plexo (Three.js)
- Para cada estrutura, duas representações: (a) **malha sólida** com `MeshBasicMaterial`/shader próprio, transparente e quase invisível em repouso (opacidade 0,03), que serve de alvo do raycast e de preenchimento no hover; (b) **plexo**: `LineSegments` com as arestas da malha decimada (`EdgesGeometry` com limiar baixo, ou arestas únicas do índice) + `Points` nos vértices, em `LineBasicMaterial` com `transparent`, `depthWrite:false`, opacidade 0,16 (cérebro 0,24). Os vértices em `PointsMaterial` têm tamanho 1,6 px × DPR e atenuação por distância.
- **Hover**: anima (220 ms, ease-out) a opacidade do sólido para 0,55, a cor do plexo para a cor da estrutura e uma borda de Fresnel (shader `onBeforeCompile` ou `ShaderMaterial` simples: `pow(1 - dot(N, V), 2.2)`). As outras estruturas recuam o plexo para 40%.
- **Pele e crânio** em plexo mais ralo (decimação maior), para o cérebro ser o detalhe.
- Profundidade: `renderOrder` de dentro para fora (cérebro, osso, pele) e `depthTest` ligado nas linhas, para a transparência ler como camadas.
- Cores lidas dos tokens em tempo de execução (`getComputedStyle(document.documentElement)`), nunca escritas no JS.

---

## 6. Arquivos

| Arquivo | O quê |
|---|---|
| `admin/modules/patients/PatientRecordScreen.jsx` | Reescrito: barra da página, grade de 3 colunas, painel de seção, `?secao=`. Mantém `load`, `counts`, `viewProps`, modais e diálogos. |
| `admin/modules/patients/record/ProfileColumn.jsx` | Perfil, trilha de acompanhamento, diagnósticos, pastas e pílula da próxima consulta. |
| `admin/modules/patients/record/InsightsColumn.jsx` | Cards de escala, medicações, marcos. |
| `admin/modules/patients/record/ScaleCard.jsx` | Card de escala com gráfico de pontos (SVG). |
| `admin/modules/patients/record/VisitRail.jsx` | Linha do tempo de consultas na base do palco. |
| `admin/modules/patients/record/AlertPills.jsx` | Pílulas de alerta (reaproveita a lógica de estados do cabeçalho atual). |
| `admin/modules/patients/record/SectionPanel.jsx` | Painel de vidro das seções. |
| `admin/modules/patients/record/useAttachmentThumbs.js` | Miniaturas decifradas em memória (object URL) para as pastas. |
| `admin/modules/patients/anatomy/AnatomyStage.jsx` + `scene.js` + `estruturas.js` | Palco 3D (lazy). |
| `admin/assets/anatomia/busto.glb` | Modelo final (meta ≤ 8 MB; ideal 4–6 MB). |
| `admin/components/GlassFolder.tsx` + `styles/components/glass-folder.css` | Pastas de vidro (já portadas). |
| `admin/styles/components/patient-record.css` | CSS da página nova (prefixo `pr-`); o CSS antigo de `.record`, `.context` e `.patient-header` que deixar de ser usado sai de `patients.css`. |
| `admin/styles/tokens.css` | Blocos novos `--pr-*` e `--anat-*`. |

---

## 7. Estados que precisam existir
Carregando (esqueleto na forma das 3 colunas; o palco mostra o busto montando-se: o plexo desenha do centro para fora em 900 ms), paciente sem nenhum atendimento, sem escala, sem exame, sem diagnóstico, sem responsável, com nome social, com 3 ou mais responsáveis, com 5 ou mais alertas ao mesmo tempo, sem permissão de escrita (botões somem, não ficam desabilitados sem explicação), WebGL indisponível, falha ao decifrar miniatura (a folha vira papel), `prefers-reduced-motion`, foco por teclado em tudo, tema de impressão (a página de visão geral não imprime o palco).

---

## 8. Verificação antes de mostrar ao dono
1. `npx vite build` sem erro; `grep -nE '#[0-9a-fA-F]{3,8}\b'` vazio em todo arquivo novo fora de `tokens.css`.
2. Base de demonstração carregada; abrir 3 pacientes diferentes (com escalas e exames, sem nada, com alergia e alertas).
3. Capturas em 1920, 1440, 1280, 1024 e 390 px. Medir: nada cortado, sem rolagem lateral, contraste do texto sobre o vidro ≥ 4,5:1 no pior ponto do palco, alvos ≥ 44 px no celular.
4. Hover e teclado no cérebro, seletor de camadas, zoom, vistas, painel de cada uma das 8 seções (abrir, agir, fechar com Esc), pasta (abrir, ver folha, `+`).
5. Console limpo; FPS com o painel aberto (renderização pausada) e fechado.
6. Detector do impeccable: `impeccable detect --json` nos arquivos alterados.

## 9. Design loop (depois que o dono aprovar a 1ª versão)
3 passadas, com críticos de contexto limpo e veredito binário por critério:
- **Fidelidade à referência** (opus, esforço alto): composição, cards, gráfico de pontos, plexo, popover, vidro, linha do tempo, contra o §2 e o §3.
- **Sistema** (sonnet, esforço médio): tokens, escala de tipo, contraste medido, responsivo, foco, CSS escopado, nada de hex.
- **Dados e acabamento** (opus, esforço alto): verdade clínica (nada inventado, frases de segurança), todas as funções antigas presentes e funcionando, estados do §7, desempenho.
- Checagem mecânica entre passadas (haiku, esforço baixo): build, grep de hex, chaves CSS, capturas.
As correções são aplicadas por mim. Para depois da 3ª passada, com relatório do que sobrou.
