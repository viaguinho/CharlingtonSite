# Charlington Neurologia — Style Reference
> Abordagem centralizada na criança, com comunicação clara e empática.

**Theme:** light

O site do Dr. Charlington adota uma estética minimalista, clínica e acolhedora, utilizando um fundo claro de papel (`#fdfdfd`) e acentos sutis. Toda a interface transmite confiança e serenidade: o texto maior possui 27px, os títulos usam o peso 300, e o fundo principal navega entre tons de branco e cinza muito suave (`#f2f2f4`). A navegação no topo apresenta formato de pílula flutuante (capsule) com efeito de blur (backdrop-filter), enquanto o conteúdo exibe um equilíbrio rigoroso entre espaço negativo e legibilidade. A paleta é neutra e profissional, utilizando o azul futuro (`#0071e3`) apenas para interações e links. Componentes chave incluem links no estilo "pill" (`explore-pill`) e navegações circulares, promovendo interatividade sem perder o caráter sério e empático da Neurologia.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Midnight Ink | `#0f1012` | `--color-midnight-ink` | Texto principal, ícones, elementos de alto contraste |
| Ghost White | `#f2f2f4` | `--color-ghost-white` | Fundo principal da página, superfícies de contraste baixo |
| Canvas | `#fdfdfd` | `--color-canvas` | Fundo de cartões, áreas de conteúdo puro, poços brancos |
| Skyline Gray | `#868788` | `--color-skyline-gray` | Textos secundários, bordas discretas, metadados |
| Slate Comment | `#8f8f8f` | `--color-slate-comment` | Textos de ajuda, legendas inativas |
| Deep Graphite | `#020201` | `--color-deep-graphite` | Títulos de maior impacto, acentos escuros |
| Future Blue | `#0071e3` | `--color-future-blue` | Hyperlinks, botões ativos, texto de ação, acentos visuais |

## Tokens — Typography

### Inter — Principal typeface — Substituta moderna e geométrica para a PP Neue Montreal, utilizada em todos os textos da interface. O peso 300 (Light) para cabeçalhos confere um tom de suavidade e sofisticação, abandonando o ruído dos pesos elevados (600-700) convencionais em prol de uma comunicação humanizada e empática.
- **Substitute:** PP Neue Montreal, system-ui, -apple-system.
- **Weights:** 300, 400, 500, 600
- **Sizes:** 10, 14, 18, 27
- **Line height:** 1.20
- **Letter spacing:** -0.02em geral (-0.2px at 10px, -0.36px at 18px, -0.54px at 27px)
- **Role:** Tipografia única e coesa para estabelecer um tom neutro, legível e acolhedor.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 10px | 1.2 | -0.2px | `--text-caption` |
| base | 14px | 1.2 | normal | `--text-base` |
| heading-lg | 18px | 1.2 | -0.36px | `--text-heading-lg` |
| display | 27px | 1.2 | -0.54px | `--text-display` |

## Tokens — Spacing & Shapes

**Density:** spacious / breathing

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 6 | 6px | `--spacing-6` |
| 10 | 10px | `--spacing-10` |
| 11 | 11px | `--spacing-11` |
| 22 | 22px | `--spacing-22` |
| 30 | 30px | `--spacing-30` |
| 34 | 34px | `--spacing-34` |
| 35 | 35px | `--spacing-35` |
| 50 | 50px | `--spacing-50` |
| 69 | 69px | `--spacing-69` |
| 94 | 94px | `--spacing-94` |
| 113 | 113px | `--spacing-113` |
| 130 | 130px | `--spacing-130` |
| 144 | 144px | `--spacing-144` |
| 220 | 220px | `--spacing-220` |

### Border Radius

| Element | Value | Token |
|---------|-------|-------|
| hairline | 1.8px | `--radius-sm` |
| button | 10px | `--radius-buttons` |
| pill button | 26px | `--radius-pillbuttons` |
| nav/capsule | 54px | `--radius-misc` (`--radius-full`) |
| surface | 63px | `--radius-full-2` |

### Layout

- **Page max-width:** 1200px
- **Section gap:** 94px
- **Element gap:** 6px

## Components

### Floating Pill Navigation (Nav Capsule)
**Role:** Navegação principal flutuante no topo.
Pílula com 54px de border-radius, alinhamento ao centro e fundo com efeito glassmorphism (branco com 45% de opacidade e blur de 20px). Contém links de navegação (`nav-link`) distribuídos de forma espaçada (gap 36px) e um botão CTA à direita ("Agendar").

### Logo Circle
**Role:** Indicador visual da marca.
Círculo perfeito de 54x54px também utilizando glassmorphism, acompanhando a barra de navegação. Adiciona uma animação suave de scale e aumento de opacidade no `:hover`.

### Explore Pill
**Role:** Pílulas de ação rápida e categorias na Hero.
Botões contornados ou preenchidos com cantos altamente arredondados. Usados para apresentar as áreas de foco (ex: "Neurologia", "Trajetória", "Agendar"). A transição e interatividade são comunicadas de forma sutil, através de mudanças de opacidade e cores invertidas ou em Future Blue ao serem ativadas.

### Hero Composition
**Role:** Seção inicial (Full-bleed ou Container).
Imagem principal acolhedora de fundo (`hero-bg`). Título em `--text-display` (27px, peso 300) introduzindo "Dr. Charlington Cavalcante", acompanhado de rótulos menores (CRM) e pílulas de exploração.

### Overview Slides (Método)
**Role:** Explicação das vertentes de atendimento.
Sistema de abas ou "slides" controlados por labels dinâmicas (Individualizado, Transparente, Integrado, Humanizado). O texto do conteúdo assume grandes proporções (`overview-display-text`) garantindo leitura fácil, com hiperlinks acompanhados por pequenos ícones de seta em estilo ghost link.

## Do's and Don'ts

### Do
- Utilize a tipografia **Inter** no peso 300 para cabeçalhos para manter a aura clínica e sensível.
- Limite os textos maiores a 27px para promover um ambiente calmo e que não sobrecarregue visualmente.
- Adote o espaçamento generoso (ex: `--section-gap: 94px`) entre seções, permitindo que a interface "respire".
- Faça uso de efeitos de *glassmorphism* na navegação (`rgba(255, 255, 255, 0.45)`, `backdrop-filter: blur(20px)`) para modernidade sem pesar.
- Mantenha a hierarquia através de tons de cinza escuro a preto (`#0f1012`, `#020201`).

### Don't
- Não insira cores vibrantes conflitantes. O `--color-future-blue` (`#0071e3`) deve ser a única cor saturada do sistema, reservada para indicar interação ou CTAs importantes.
- Não utilize sombras densas e escuras (drop shadows). A interface depende da planaridade, de bordas finas e efeitos *blur* nas camadas superiores.
- Não force textos em caixa alta extensa; priorize a legibilidade e o tom conversacional e profissional (sentence case).

## Quick Start (CSS Custom Properties)

```css
:root {
  /* Colors */
  --color-midnight-ink: #0f1012;
  --color-ghost-white: #f2f2f4;
  --color-canvas: #fdfdfd;
  --color-skyline-gray: #868788;
  --color-slate-comment: #8f8f8f;
  --color-deep-graphite: #020201;
  --color-future-blue: #0071e3;

  /* Typography */
  --font-pp-neue-montreal: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-weight-w350: 300;
  --font-weight-regular: 400;

  /* Typography Scale */
  --text-caption: 10px;
  --text-base: 14px;
  --text-heading-lg: 18px;
  --text-display: 27px;

  /* Spacing */
  --spacing-10: 10px;
  --spacing-30: 30px;
  --section-gap: 94px;
  --element-gap: 6px;

  /* Border Radius */
  --radius-sm: 1.8px;
  --radius-buttons: 10px;
  --radius-pillbuttons: 26px;
  --radius-misc: 54px;
}
```
