import { IconButton, SectionLabel } from './primitives.jsx';
import Icon from './Icon.jsx';
import { compact } from '../core/format.js';

/**
 * Card — a superfície de conteúdo do painel.
 *
 * Variantes:
 *   default — branco sobre o canvas cinza
 *   tinted  — estado ativo/selecionado, em azul muito claro (REF 4)
 *   outline — só contorno, sem preenchimento
 *   flush   — sem padding, para tabelas e listas que ocupam a borda
 *
 * `span` e `rows` posicionam o card no grid bento de 12 colunas.
 */
export function Card({
  variant = 'default',
  span, rows,
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  const style = {
    ...(span ? { gridColumn: `span ${span}` } : null),
    ...(rows ? { gridRow: `span ${rows}` } : null),
    ...rest.style,
  };

  return (
    <section
      className={`card card--${variant} ${interactive ? 'is-interactive' : ''} ${className}`.trim()}
      {...rest}
      style={style}
    >
      {children}
    </section>
  );
}

/**
 * Cabeçalho de card: título à esquerda, ferramentas à direita (REF 4).
 * `actions` recebe elementos prontos; `onExpand` adiciona o botão ↗ padrão.
 */
export function CardHeader({ title, eyebrow, subtitle, actions, onExpand, className = '' }) {
  return (
    <header className={`card__header ${className}`.trim()}>
      <div className="card__heading">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        {title ? <h3 className="card__title">{title}</h3> : null}
        {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
      </div>
      {(actions || onExpand) ? (
        <div className="card__tools">
          {actions}
          {onExpand ? (
            <IconButton name="arrow-up-right" label="Expandir" shape="circle" size="sm" onClick={onExpand} />
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

export function CardBody({ className = '', children, ...rest }) {
  return <div className={`card__body ${className}`.trim()} {...rest}>{children}</div>;
}

export function CardFooter({ className = '', children }) {
  return <footer className={`card__footer ${className}`.trim()}>{children}</footer>;
}

/* ═══════════════════════════════ Métricas ═══════════════════════════════ */

/**
 * Métrica isolada: rótulo pequeno, número dominante com sufixo de unidade em
 * corpo menor, e variação opcional (REF 1).
 * `useCompact` abrevia milhares/milhões e devolve o sufixo separado para que
 * a tipografia possa diferenciá-lo.
 */
export function Metric({
  label, value, suffix, denominator, delta, tone, target, action,
  useCompact = false, size = 'md', featured = false,
}) {
  let displayValue = value;
  let displaySuffix = suffix;

  if (useCompact && typeof value === 'number') {
    const parts = compact(value);
    displayValue = parts.value;
    displaySuffix = parts.suffix || suffix;
  }

  return (
    <div className={`metric metric--${featured ? 'lg' : size} ${featured ? 'is-featured' : ''} ${tone ? `metric--${tone}` : ''}`.trim()}>
      <div className="metric__head">
        <span className="metric__label">{label}</span>
      </div>
      {/* A variação acompanha o número, não o rótulo: no cabeçalho ela roubava
          largura e quebrava "Taxa de / faltas" em duas linhas. */}
      <div className="metric__value-row">
        <p className={`metric__value num ${value === '—' ? 'metric__value--empty' : ''}`}>
          {displayValue}
          {displaySuffix ? <span className="metric__suffix">{displaySuffix}</span> : null}
          {denominator ? <span className="metric__denominator">/{denominator}</span> : null}
        </p>
        {delta}
      </div>
      {/* Número nu não diz nada. A referência clínica sempre ancora o valor
          num alvo ("meta <10%", "meta do dia 42: 120°") — é o alvo que
          transforma o dado em decisão. */}
      {target ? <span className="metric__target">{target}</span> : null}
      {/* O KPI que manda agir leva a ação junto: ler "11 precisam de atenção"
          e ter de varrer a lista inteira não é decisão em 3 segundos. */}
      {action ? <div className="metric__action">{action}</div> : null}
    </div>
  );
}

/**
 * Valor monetário com a unidade subordinada: "R$" e os centavos em corpo
 * menor, o inteiro no tamanho do número. Assinatura das REF 1 e 3 — o olho
 * lê "34.780" antes de ler a moeda.
 */
// `cents={false}` para indicador (Relatórios): arredonda ao real e cabe ao lado
// da variação. No Financeiro o centavo fica — ali o número é de conciliação.
export function MoneyValue({ value, cents: showCents = true }) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const [int, cents] = Math.abs(showCents ? n : Math.round(n)).toFixed(2).split('.');
  return (
    <>
      {/* O sinal é informação (prejuízo): no tamanho do número e colado aos
          dígitos — "−" solto antes de um "R$" pequeno parecia um traço. */}
      <span className="metric__unit metric__unit--prefix">R$</span>
      {n < 0 ? '−' : ''}{Number(int).toLocaleString('pt-BR')}
      {showCents ? <span className="metric__unit">,{cents}</span> : null}
    </>
  );
}

/**
 * Faixa de métricas separadas por hairline vertical, sem bordas de card.
 * É a assinatura visual da REF 1 e o cabeçalho da Visão Geral.
 */
export function MetricStrip({ children, className = '', loading = false }) {
  // Carregando: esqueleto na altura da faixa. Um "0" antes de os dados chegarem
  // afirma um fato ("nenhuma falta", "0 laudos") que ninguém verificou.
  if (loading) return <Skeleton height={168} radius="var(--r-lg)" className="metric-strip--loading" card />;
  return <div className={`metric-strip ${className}`.trim()}>{children}</div>;
}

/**
 * Mini-card de métrica com micro-visualização à direita e notas abaixo (REF 3).
 * `visual` recebe qualquer renderizador de gráfico compacto.
 */
export function MiniMetricCard({ label, value, suffix, denominator, visual, footnote, trend, trendTone = 'neutral' }) {
  return (
    <div className="mini-metric">
      <span className="mini-metric__label">{label}</span>
      <div className="mini-metric__row">
        <p className="mini-metric__value num">
          {value}
          {suffix ? <span className="mini-metric__suffix">{suffix}</span> : null}
          {denominator ? <span className="mini-metric__denominator">/{denominator}</span> : null}
        </p>
        {visual ? <div className="mini-metric__visual">{visual}</div> : null}
      </div>
      {(footnote || trend) ? (
        <div className="mini-metric__foot">
          {footnote ? <span className="mini-metric__footnote">{footnote}</span> : null}
          {trend ? <span className={`mini-metric__trend mini-metric__trend--${trendTone}`}>{trend}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════ Estados de conteúdo ═══════════════════════════ */

/**
 * Estado vazio honesto. Nunca substituir por dado de exemplo ou por uma curva
 * decorativa — se não há dado, a interface diz que não há dado e oferece o
 * próximo passo.
 */
export function EmptyState({ icon = 'layers', title, description, action, compact: isCompact = false }) {
  return (
    <div className={`empty ${isCompact ? 'empty--compact' : ''}`.trim()}>
      <span className="empty__icon"><Icon name={icon} size={isCompact ? 18 : 22} /></span>
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__description">{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 14, radius = 'var(--r-xs)', card = false, className = '' }) {
  return (
    <span
      className={`skeleton ${card ? 'skeleton--card' : ''} ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '62%' : '100%'} />
      ))}
    </div>
  );
}

export { SectionLabel };
