import { forwardRef } from 'react';
import Icon from './Icon.jsx';
import { initials as toInitials } from '../core/format.js';

/* ═══════════════════════════════ Botões ═══════════════════════════════ */

/**
 * Variantes:
 *   primary   — ação principal, tinta escura sólida (REF 3)
 *   secondary — contorno, mesma altura, peso visual menor
 *   ghost     — sem contorno, para ações terciárias e toolbars
 *   danger    — apenas para ações destrutivas confirmadas
 */
export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, loading, children, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`btn btn--${variant} btn--${size} ${loading ? 'is-loading' : ''} ${className}`.trim()}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      {icon && !loading ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children ? <span className="btn__label">{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 14 : 16} /> : null}
    </button>
  );
});

/** Botão só de ícone. `label` é obrigatório — vira o nome acessível. */
export const IconButton = forwardRef(function IconButton(
  { name, label, shape = 'square', size = 'md', variant = 'ghost', className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`icon-btn icon-btn--${shape} icon-btn--${size} icon-btn--${variant} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={name} size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
    </button>
  );
});

export function ButtonGroup({ children, className = '' }) {
  return <div className={`btn-group ${className}`.trim()} role="group">{children}</div>;
}

/* ═══════════════════════════════ Rótulos ═══════════════════════════════ */

/** Tons semânticos. `neutral` é o padrão; cor nunca carrega sentido sozinha. */
/**
 * Chip de situação — o ÚNICO componente de estado do painel (linha de tabela,
 * lista, prontuário). Regra de ícone escrita aqui, e não em cada tela:
 * perigo e atenção sempre levam ícone (padrão: triângulo e relógio); os demais
 * tons nunca levam. `code` é outra coisa: um código (CID), não um estado.
 */
const DEFAULT_ICON = { danger: 'alert-triangle', warning: 'clock' };

export function Chip({ tone = 'neutral', icon, children, className = '', wrap = false, ...rest }) {
  const shownIcon = tone === 'danger' || tone === 'warning' ? (icon ?? DEFAULT_ICON[tone]) : null;
  return (
    <span className={`chip chip--${tone} ${wrap ? 'chip--wrap' : ''} ${className}`.trim()} {...rest}>
      {shownIcon ? <Icon name={shownIcon} size={12} /> : null}
      {children}
    </span>
  );
}

export function Badge({ count, max = 99, tone = 'neutral' }) {
  if (!count) return null;
  return (
    <span className={`badge badge--${tone}`} aria-label={`${count} pendências`}>
      {count > max ? `${max}+` : count}
    </span>
  );
}

/**
 * Variação percentual. A seta acompanha a cor — quem não distingue verde de
 * vermelho ainda lê a direção.
 * `inverse` marca métricas em que cair é bom (faltas, tempo de espera).
 */
// Abaixo de 1 (% ou p.p.) a variação é ruído: "+0,2 p.p." em vermelho de alarme
// pedia uma reação a nada. Continua escrita, em tom neutro.
export const DELTA_NOISE = 1;

export function DeltaChip({ value, inverse = false, suffix = '%', neutral = false }) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value) === 0 ? 0 : Number(value); // nunca "−0"
  const positive = n > 0;
  const good = inverse ? !positive : positive;
  // `neutral`: variação sem juízo (duração de consulta mais longa não é pior nem melhor).
  const tone = neutral || Math.abs(n) < DELTA_NOISE ? 'neutral' : good ? 'success' : 'danger';

  return (
    <span className={`delta delta--${tone}`}>
      {n !== 0 ? <Icon name={positive ? 'trending-up' : 'trending-down'} size={11} /> : null}
      <span className="num">{positive ? '+' : ''}{n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{suffix}</span>
    </span>
  );
}

export function StatusDot({ tone = 'neutral', label, pulse = false }) {
  // Com texto, a situação é o chip: uma gramática só em toda tabela e lista.
  if (label) return <Chip tone={tone === 'info' ? 'info' : tone}>{label}</Chip>;
  return (
    <span className="status-dot-wrap">
      <span className={`status-dot status-dot--${tone} ${pulse ? 'is-pulsing' : ''}`} aria-hidden="true" />
      {label ? <span className="status-dot__label">{label}</span> : null}
    </span>
  );
}

/* ═══════════════════════════════ Avatar ═══════════════════════════════ */

/**
 * O tom padrão é neutro de propósito. Avatar azul em toda tela gastava duas
 * das três aparições permitidas ao acento sem carregar significado nenhum —
 * o azul fica reservado a estado ativo e ao dado que importa.
 */
export function Avatar({ name, src, size = 40, tone = 'ink' }) {
  const label = name || 'Sem nome';
  if (src) {
    return <img className="avatar" src={src} alt={label} width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span
      className={`avatar avatar--fallback avatar--${tone}`}
      style={{ width: size, height: size, fontSize: initialsSize(size) }}
      aria-label={label}
      role="img"
    >
      {toInitials(name)}
    </span>
  );
}

/**
 * Tamanho das iniciais por faixa de diâmetro.
 *
 * Antes isto era `Math.round(size * 0.34)`, que produzia 11px e 22px — dois
 * tamanhos que não existem na escala. Pior: como saía em `style` inline,
 * nenhuma auditoria do CSS os encontraria. Aritmética sobre o diâmetro é um
 * gerador de valores fora da escala; um mapa explícito não é.
 */
function initialsSize(diameter) {
  // Iniciais nunca em micro: são a identidade da linha.
  if (diameter <= 30) return 'var(--t-body)';    // 13px
  if (diameter <= 44) return 'var(--t-small)';   // 12px
  if (diameter <= 56) return 'var(--t-lead)';    // 16px
  return 'var(--t-title)';                       // 20px
}

/** Pilha de avatares com contador de excedente (REF 4). */
export function AvatarStack({ people = [], max = 4, size = 28 }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="avatar-stack">
      {shown.map((person, index) => (
        <span key={person.id ?? index} className="avatar-stack__item" style={{ zIndex: max - index }}>
          <Avatar name={person.nome} src={person.foto} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span className="avatar-stack__more" style={{ width: size, height: size }}>+{rest}</span>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════ Estrutura ═══════════════════════════════ */

export function Divider({ vertical = false, className = '' }) {
  return <span className={`divider ${vertical ? 'divider--v' : ''} ${className}`.trim()} role="separator" />;
}

export function Stack({ gap = 4, direction = 'column', align, justify, wrap, children, className = '', ...rest }) {
  return (
    <div
      className={`stack ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: `var(--s-${gap})`,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : undefined,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Rótulo de seção em pílula, canto superior esquerdo (REF 6). */
export function SectionLabel({ children }) {
  return <span className="section-label">{children}</span>;
}
