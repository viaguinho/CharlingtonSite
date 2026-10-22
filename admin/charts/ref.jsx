import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { number } from '../core/format.js';

/**
 * Vocabulário de gráficos da referência "Modern CRM Analytics" (16/10).
 *
 *   A · RoundBars     barras arredondadas cinza; a barra em foco vira hachurado
 *                     com etiqueta azul em cima (Activity, Sales Funnel)
 *   B · HatchBand     duas linhas com pontos e hachurado entre elas; marcador
 *                     vertical com etiqueta de variação (Comparison of Revenue)
 *   C · SmoothCurve   curva suave com pontos escuros sobre uma sombra de área
 *                     (Total Spend)
 *   D · PercentPills  linhas "rótulo · pílula com %" (Virtual Cards)
 *   E · TileHeatmap   quadrados arredondados em escada de azuis, hachurados onde
 *                     não há dado (Order) — e o TileCalendar de 12 meses
 *
 * Regras comuns: SVG medido na largura real (texto nunca escala), cores só por
 * classe e token (nenhum hex aqui), foco por teclado (setas movem, Enter fixa,
 * Esc solta), hover e clique fixam o ponto, e uma frase viva para leitor de
 * tela. O movimento de entrada sai com `prefers-reduced-motion`.
 */

/* ═══════════════════════════════ Base ═══════════════════════════════ */

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(Math.round(el.clientWidth));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function useSvgId(prefix) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** Listras do destaque: grafite a 45°, como na referência. */
function Hatch({ id }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
      <rect width="7" height="7" className="rp-hatch__bg" />
      <line x1="0" y1="0" x2="0" y2="7" className="rp-hatch__line" />
    </pattern>
  );
}

/**
 * Ponto em foco: o hover manda; sem hover, o ponto fixado (clique/teclado);
 * sem nada, o ponto padrão do gráfico (o pico).
 */
function useActive(count, fallback) {
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  useEffect(() => { setPinned(null); setHover(null); }, [count]);
  const active = count ? Math.min(count - 1, hover ?? pinned ?? fallback ?? 0) : null;
  const onKeyDown = (event) => {
    if (!count) return;
    const from = pinned ?? active ?? 0;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step) { event.preventDefault(); setHover(null); setPinned(Math.max(0, Math.min(count - 1, from + step))); }
    else if (event.key === 'Home') { event.preventDefault(); setPinned(0); }
    else if (event.key === 'End') { event.preventDefault(); setPinned(count - 1); }
    else if (event.key === 'Escape' && pinned != null) { event.stopPropagation(); setPinned(null); }
  };
  return { active, hover, setHover, pinned, setPinned, onKeyDown };
}

const argmax = (values) => values.reduce((best, v, i) => (v != null && (best < 0 || v > values[best]) ? i : best), -1);

function axisStride(count, width, room = 54) {
  return Math.max(1, Math.ceil(count / Math.max(2, Math.floor(width / room))));
}

/** Rótulo do eixo: o do ponto em foco sempre aparece; os vizinhos que colidiriam com ele saem. */
function showLabel(i, active, stride, step, room = 44) {
  if (i === active) return true;
  if (i % stride !== 0) return false;
  return active == null || Math.abs(i - active) * step >= room;
}

/** Curva suave (Catmull-Rom → Bézier) sem passar da base nem do topo. */
function smoothPath(points, top, base) {
  if (!points.length) return '';
  const clamp = (y) => Math.max(top, Math.min(base, y));
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = 0.18;
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${clamp(p1[1] + (p2[1] - p0[1]) * t)} ${p2[0] - (p3[0] - p1[0]) * t},${clamp(p2[1] - (p3[1] - p1[1]) * t)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Etiqueta azul da referência ("12,464", "+9%"), presa a um ponto do gráfico. */
function Tag({ x, y, children, width, minX = 40 }) {
  if (x == null || y == null) return null;
  // Perto da borda, a etiqueta encosta para dentro em vez de ser cortada.
  const align = x < minX ? 'start' : width && x > width - 40 ? 'end' : 'center';
  return (
    <span className={`rp-tag ${align === 'center' ? '' : `rp-tag--${align}`}`.trim()} style={{ left: x, top: y }}>
      {children}
    </span>
  );
}

function Live({ children }) {
  return <p className="rp-sr" aria-live="polite">{children}</p>;
}

/* ═══════════════════════ A · Barras arredondadas ═══════════════════════ */

export function RoundBars({
  items = [], height = 176, format = (v) => number(v), describe, focus, label = 'Gráfico de barras',
  stub = true,
}) {
  const [ref, width] = useWidth();
  const pattern = useSvgId('rp-hatch');
  const values = items.map((i) => i.value ?? 0);
  const { active, setHover, setPinned, onKeyDown } = useActive(items.length, focus ?? argmax(values));
  const max = Math.max(1, ...values);
  const n = items.length;
  const top = 40;
  const axis = 30;
  const plot = Math.max(40, height - top - axis);
  // Vão curto e fixo, grupo centrado: com poucos itens as barras alargavam o
  // vão e viravam ilhas nos cantos. Como no Sales Funnel, elas preenchem a largura.
  const gap = n > 1 ? Math.max(6, Math.min(16, width * 0.025)) : 0;
  const bw = n ? Math.max(6, Math.min(140, (width - gap * (n - 1)) / n)) : 0;
  const radius = Math.min(14, bw / 2);
  const stride = axisStride(n, width, 44);
  const offset = (width - (bw * n + gap * (n - 1))) / 2;
  const geometry = items.map((item, i) => {
    const v = item.value ?? 0;
    const h = v > 0 ? Math.max(12, (v / max) * plot) : stub ? 10 : 0;
    return { x: offset + i * (bw + gap), h, y: top + plot - h };
  });
  const current = active != null ? items[active] : null;

  return (
    <div
      ref={ref}
      className="rp-chart rp-bars"
      style={{ height }}
      tabIndex={n ? 0 : -1}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
    >
      {width > 0 ? (
        <svg width={width} height={height} aria-hidden="true">
          <defs><Hatch id={pattern} /></defs>
          {items.map((item, i) => {
            const g = geometry[i];
            const on = i === active;
            return (
              <g
                key={item.key ?? i}
                className={`rp-bars__bar ${on ? 'is-active' : ''} ${(item.value ?? 0) === 0 ? 'is-zero' : ''}`}
                style={{ '--i': i }}
                onMouseEnter={() => setHover(i)}
                onClick={() => setPinned(i)}
              >
                <rect x={g.x} y={top - 8} width={bw} height={plot + 8} className="rp-hit" />
                <rect
                  x={g.x} y={g.y} width={bw} height={g.h} rx={radius}
                  className="rp-bars__fill"
                  style={on && (item.value ?? 0) > 0 ? { fill: `url(#${pattern})` } : undefined}
                />
                {showLabel(i, active, stride, bw + gap) ? (
                  <text x={g.x + bw / 2} y={height - 8} textAnchor="middle" className={`rp-axis ${on ? 'is-active' : ''}`}>{item.label}</text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}
      {width > 0 && current ? (
        <Tag x={geometry[active].x + bw / 2} y={geometry[active].y - 10} width={width}>
          {format(current.value ?? 0, current)}
        </Tag>
      ) : null}
      <Live>{current ? (describe ? describe(current) : `${current.long ?? current.label}: ${format(current.value ?? 0, current)}`) : ''}</Live>
    </div>
  );
}

/* ═══════════════════ B · Faixa hachurada entre duas linhas ═══════════════════ */

export function HatchBand({
  series = [], height = 176, format = (v) => number(v), labels = { current: 'Atual', previous: 'Anterior' },
  focus, tagFor, describe, label = 'Comparação entre duas séries',
}) {
  const [ref, width] = useWidth();
  const pattern = useSvgId('rp-band');
  const n = series.length;
  // Padrão: o pico. Se o pico é o 1º ponto, a etiqueta encostava nos rótulos
  // "Atual/Anterior" — vale o último ponto com dado.
  const peak = argmax(series.map((s) => s.current));
  const lastWithData = series.reduce((best, s, i) => (s.current ? i : best), -1);
  const fallback = focus ?? (peak === 0 && lastWithData > 0 ? lastWithData : peak);
  const { active, setHover, setPinned, onKeyDown } = useActive(n, fallback);
  const padL = 64;
  const padR = 16;
  const top = 40;
  const axis = 30;
  const base = height - axis;
  const all = series.flatMap((s) => [s.current ?? 0, s.previous ?? 0]);
  const max = Math.max(1, ...all);
  const step = n > 1 ? (width - padL - padR) / (n - 1) : 0;
  const xOf = (i) => (n > 1 ? padL + i * step : padL + (width - padL - padR) / 2);
  const yOf = (v) => base - ((v ?? 0) / max) * (base - top) * 0.94;
  // Ponto só do anterior (o anterior tem mais dias úteis): o atual não passa por ele.
  const has = (i) => series[i]?.current != null;
  const prev = series.map((s, i) => [xOf(i), yOf(s.previous ?? s.current)]);
  const cur = series.map((s, i) => [xOf(i), has(i) ? yOf(s.current) : prev[i][1]]);
  const curIdx = series.map((_, i) => i).filter(has);
  // Curva suave nas duas linhas e na faixa: com contagem diária as retas viravam serrote.
  const curPath = smoothPath(curIdx.map((i) => cur[i]), top, base);
  const prevPath = smoothPath(prev, top, base);
  const band = curIdx.length
    ? `${curPath} ${smoothPath(curIdx.map((i) => prev[i]).reverse(), top, base).replace(/^M/, 'L')} Z`
    : '';
  const stride = axisStride(n, width - padL, 50);
  const dots = n <= 40;

  const pick = (event) => {
    if (!n) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    setHover(Math.max(0, Math.min(n - 1, Math.round(step ? (x - padL) / step : 0))));
  };

  const s = active != null ? series[active] : null;
  const delta = s && s.current != null && s.previous ? ((s.current - s.previous) / s.previous) * 100 : null;
  const places = delta != null && Math.abs(delta) < 10 ? 1 : 0;
  const rounded = delta == null ? null : Math.round(delta * 10 ** places) / 10 ** places;
  // Sinal de menos tipográfico (−), como no cabeçalho; variação zero mostra o valor do ponto.
  const deltaTag = rounded ? `${rounded > 0 ? '+' : '−'}${number(Math.abs(rounded), places)}%` : null;
  const tag = !s ? null
    : tagFor ? tagFor(s)
      : s.current == null ? `${format(s.previous ?? 0, s)} antes`
        : deltaTag ?? format(s.current, s);
  // Rótulos das séries à esquerda, como "2023 / 2024" na referência; afastados se colidirem.
  let yCur = cur[0]?.[1] ?? top;
  let yPrev = prev[0]?.[1] ?? base;
  if (Math.abs(yCur - yPrev) < 16) {
    const mid = (yCur + yPrev) / 2;
    const up = yCur <= yPrev;
    yCur = mid + (up ? -9 : 9);
    yPrev = mid + (up ? 9 : -9);
  }

  return (
    <div
      ref={ref}
      className="rp-chart rp-band"
      style={{ height }}
      tabIndex={n ? 0 : -1}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
    >
      {width > 0 && n ? (
        <svg width={width} height={height} aria-hidden="true" onMouseMove={pick} onClick={() => active != null && setPinned(active)}>
          <defs><Hatch id={pattern} /></defs>
          <path d={band} className="rp-band__fill" style={{ fill: `url(#${pattern})` }} />
          <path d={prevPath} className="rp-band__line rp-band__line--previous" />
          <path d={curPath} className="rp-band__line rp-band__line--current" />
          {dots ? series.map((item, i) => (
            <g key={item.key ?? i} className="rp-band__dots">
              <circle cx={prev[i][0]} cy={prev[i][1]} r={2.4} />
              {has(i) ? <circle cx={cur[i][0]} cy={cur[i][1]} r={2.4} className="is-current" /> : null}
            </g>
          )) : null}
          {s ? (
            <g className="rp-band__marker">
              <line x1={cur[active][0]} x2={cur[active][0]} y1={Math.min(cur[active][1], prev[active][1]) - 6} y2={Math.max(cur[active][1], prev[active][1]) + 6} />
              {has(active) ? <circle cx={cur[active][0]} cy={cur[active][1]} r={3.6} /> : null}
              <circle cx={prev[active][0]} cy={prev[active][1]} r={3.6} className="is-previous" />
            </g>
          ) : null}
          <text x={padL - 12} y={yCur + 4} textAnchor="end" className="rp-axis rp-axis--series">{labels.current}</text>
          <text x={padL - 12} y={yPrev + 4} textAnchor="end" className="rp-axis rp-axis--series is-muted">{labels.previous}</text>
          {series.map((item, i) => (showLabel(i, active, stride, step) ? (
            <text key={`l-${item.key ?? i}`} x={xOf(i)} y={height - 8} textAnchor="middle" className={`rp-axis ${i === active ? 'is-active' : ''}`}>{item.label}</text>
          ) : null))}
        </svg>
      ) : null}
      {width > 0 && s ? (
        // Acima do ponto mais alto: entre as linhas a etiqueta cobria os rótulos das séries.
        <Tag x={cur[active][0]} y={Math.min(cur[active][1], prev[active][1]) - 12} width={width} minX={padL + 40}>{tag}</Tag>
      ) : null}
      <Live>{s ? (describe ? describe(s) : s.current == null ? `${s.previousLabel}: ${format(s.previous ?? 0, s)} no período anterior` : `${s.label}: ${format(s.current, s)} contra ${format(s.previous ?? 0, s)}`) : ''}</Live>
    </div>
  );
}

/* ═══════════════════════ C · Curva suave com pontos ═══════════════════════ */

export function SmoothCurve({
  series = [], height = 176, format = (v) => number(v), focus, describe, label = 'Curva no tempo', area = true,
}) {
  const [ref, width] = useWidth();
  const n = series.length;
  const values = series.map((s) => s.current);
  const { active, setHover, setPinned, onKeyDown } = useActive(n, focus ?? argmax(values));
  const padX = 18;
  const top = 44;
  const axis = 30;
  const base = height - axis;
  const max = Math.max(1, ...series.flatMap((s) => [s.current ?? 0, area ? s.previous ?? 0 : 0]));
  const step = n > 1 ? (width - padX * 2) / (n - 1) : 0;
  const xOf = (i) => (n > 1 ? padX + i * step : width / 2);
  const yOf = (v) => base - (v / max) * (base - top) * 0.92;
  // Buracos (média sem amostra) quebram a linha em trechos; nunca viram zero.
  const segments = [];
  let run = [];
  series.forEach((s, i) => {
    if (s.current == null) { if (run.length) segments.push(run); run = []; return; }
    run.push([xOf(i), yOf(s.current), i]);
  });
  if (run.length) segments.push(run);
  const areaPoints = area ? series.map((s, i) => [xOf(i), yOf(s.previous ?? 0)]) : [];
  const areaPath = areaPoints.length > 1
    ? `${smoothPath(areaPoints, top, base)} L${areaPoints[areaPoints.length - 1][0]},${base} L${areaPoints[0][0]},${base} Z`
    : '';
  const stride = axisStride(n, width, 50);
  const dotEvery = n > 16 ? axisStride(n, width, 36) : 1;

  const pick = (event) => {
    if (!n) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(n - 1, Math.round(step ? (event.clientX - rect.left - padX) / step : 0))));
  };
  const s = active != null ? series[active] : null;
  const ay = s?.current != null ? yOf(s.current) : null;

  return (
    <div
      ref={ref}
      className="rp-chart rp-curve"
      style={{ height }}
      tabIndex={n ? 0 : -1}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
    >
      {width > 0 && n ? (
        <svg width={width} height={height} aria-hidden="true" onMouseMove={pick} onClick={() => active != null && setPinned(active)}>
          {areaPath ? <path d={areaPath} className="rp-curve__area" /> : null}
          {s && ay != null ? <line x1={xOf(active)} x2={xOf(active)} y1={ay} y2={base} className="rp-curve__guide" /> : null}
          {segments.map((seg, k) => (
            <path key={k} d={smoothPath(seg, top, base)} className="rp-curve__line" />
          ))}
          {/* Ponto só onde houve valor: os zeros viravam um cordão de contas na base. */}
          {segments.flat().map(([x, y, i]) => (((series[i].current > 0 && i % dotEvery === 0) || i === active) ? (
            <circle key={i} cx={x} cy={y} r={i === active ? 6 : 4.5} className={`rp-curve__dot ${i === active ? 'is-active' : ''}`} />
          ) : null))}
          {series.map((item, i) => (showLabel(i, active, stride, step) ? (
            <text key={`l-${item.key ?? i}`} x={xOf(i)} y={height - 8} textAnchor="middle" className={`rp-axis ${i === active ? 'is-active' : ''}`}>{item.label}</text>
          ) : null))}
        </svg>
      ) : null}
      {width > 0 && s && ay != null ? <Tag x={xOf(active)} y={ay - 14} width={width}>{format(s.current, s)}</Tag> : null}
      <Live>{s ? (describe ? describe(s) : `${s.label}: ${s.current == null ? 'sem dado' : format(s.current, s)}`) : ''}</Live>
    </div>
  );
}

/* ═══════════════════════ D · Pílulas de percentual ═══════════════════════ */

export function PercentPills({ items = [], valueFormat, shareFormat, label = 'Divisão em percentual', onSelect, selected, labelWidth }) {
  const [hover, setHover] = useState(null);
  const pct = shareFormat ?? ((share) => `${number(share * 100, share > 0 && share < 0.1 ? 1 : 0)}%`);
  return (
    <ul className="rp-pills" aria-label={label} onMouseLeave={() => setHover(null)} style={labelWidth ? { '--label-w': labelWidth } : undefined}>
      {items.map((item, i) => {
        const on = hover === i || selected === item.key;
        return (
          <li
            key={item.key ?? item.label}
            className={`rp-pills__row ${on ? 'is-active' : ''}`}
            style={{ '--i': i }}
            onMouseEnter={() => setHover(i)}
          >
            <span className="rp-pills__label" title={item.title ?? item.label}>{item.label}</span>
            <span className="rp-pills__track">
              <span className="rp-pills__fill" style={{ '--w': `${Math.min(100, Math.max(0, (item.share ?? 0) * 100))}%` }}>
                <span className="num">{pct(item.share ?? 0, item)}</span>
              </span>
            </span>
            {valueFormat ? <span className="rp-pills__value num">{valueFormat(item.value, item)}</span> : null}
            {onSelect ? (
              <button type="button" className="rp-pills__hit" onClick={() => onSelect(item)} aria-label={`${item.label}: ${pct(item.share ?? 0, item)}`} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* ═══════════════════════ E · Mapa de calor em quadrados ═══════════════════════ */

const LEVELS = 5;
const HEAT_TOP = 34;   // espaço da etiqueta acima da 1ª linha (padding-top de .rp-heat)
const CAL_TOP = 26;    // idem no calendário (.rp-cal)
const levelOf = (value, max) => (value <= 0 ? 0 : Math.min(LEVELS, 1 + Math.floor((value / Math.max(1, max)) * LEVELS - 1e-9)));

export function TileHeatmap({
  rows = [], cols = [], values = {}, keyOf = (r, c) => `${r}:${c}`, format = (v) => number(v),
  describe, label = 'Mapa de calor', maxTile = 46, focus,
}) {
  const [ref, width] = useWidth();
  const labelW = 46;
  const gap = 6;
  const tile = cols.length ? Math.max(14, Math.min(maxTile, Math.floor((width - labelW - gap * cols.length) / cols.length))) : 0;
  const cells = rows.flatMap((r) => cols.map((c) => ({ row: r, col: c, value: values[keyOf(r.key, c.key)] ?? 0 })));
  const max = Math.max(1, ...cells.map((c) => c.value));
  // `focus`: o mesmo horário que o cabeçalho cita (há empates no pico).
  const { active, setHover, setPinned, onKeyDown: baseKeys } = useActive(cells.length, focus >= 0 ? focus : argmax(cells.map((c) => c.value)));
  // Setas verticais andam uma linha inteira.
  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const from = active ?? 0;
      const next = from + (event.key === 'ArrowDown' ? cols.length : -cols.length);
      if (next >= 0 && next < cells.length) { setHover(null); setPinned(next); }
      return;
    }
    baseKeys(event);
  };
  const cell = active != null ? cells[active] : null;
  const ri = active != null ? Math.floor(active / cols.length) : 0;
  const ci = active != null ? active % cols.length : 0;
  const colEvery = tile < 24 ? 2 : 1;

  return (
    <div
      ref={ref}
      className="rp-chart rp-heat"
      tabIndex={cells.length ? 0 : -1}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
      style={{ '--tile': `${tile}px`, '--gap': `${gap}px`, '--label': `${labelW}px` }}
    >
      {tile ? (
        <div className="rp-heat__grid" style={{ gridTemplateColumns: `var(--label) repeat(${cols.length}, var(--tile))` }}>
          {rows.map((r, rIndex) => (
            <div key={r.key} className="rp-heat__row">
              <span className={`rp-heat__label ${rIndex === ri && cell ? 'is-active' : ''}`}>{r.label}</span>
              {cols.map((c, cIndex) => {
                const index = rIndex * cols.length + cIndex;
                const v = cells[index].value;
                return (
                  <span
                    key={c.key}
                    className={`rp-heat__tile lv-${levelOf(v, max)} ${index === active ? 'is-active' : ''}`}
                    style={{ '--i': rIndex + cIndex }}
                    onMouseEnter={() => setHover(index)}
                    onClick={() => setPinned(index)}
                  />
                );
              })}
            </div>
          ))}
          <div className="rp-heat__row rp-heat__row--axis">
            <span />
            {cols.map((c, cIndex) => (
              <span key={c.key} className={`rp-heat__col ${cIndex === ci && cell ? 'is-active' : ''}`}>{cIndex % colEvery === 0 ? c.label : ''}</span>
            ))}
          </div>
        </div>
      ) : null}
      {tile && cell ? (
        <Tag x={labelW + gap + ci * (tile + gap) + tile / 2} y={HEAT_TOP + ri * (tile + gap) - 6} width={width}>
          {format(cell.value, cell)}
        </Tag>
      ) : null}
      <Live>{cell ? (describe ? describe(cell) : `${cell.row.long ?? cell.row.label}, ${cell.col.label}: ${format(cell.value, cell)}`) : ''}</Live>
    </div>
  );
}

/* ═══════════════════════ E · Calendário de 12 meses ═══════════════════════ */

const DAY_MS = 86400000;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const utc = (day) => Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10));
const keyOfMs = (ms) => new Date(ms).toISOString().slice(0, 10);

export function TileCalendar({
  window: win, counts = new Map(), missed = new Map(), focus, dataFrom, today, describe, label = 'Atendimentos por dia nos últimos 12 meses',
}) {
  const [ref, width] = useWidth();
  const allDays = useMemo(() => {
    if (!win) return [];
    const list = [];
    for (let ms = utc(win.from); ms <= utc(win.to); ms += DAY_MS) list.push(keyOfMs(ms));
    return list;
  }, [win]);
  const labelW = 30;
  const gap = 3;
  const minSize = 6;
  // Tela estreita: as 53 semanas não cabem no quadrado mínimo e o SVG vazava
  // do card justo onde estão os dados. Ficam as semanas mais recentes que cabem.
  const allWeeks = Math.ceil(allDays.length / 7);
  const fits = width ? Math.max(1, Math.floor((width - labelW) / (minSize + gap))) : allWeeks;
  const clipped = allWeeks > fits;
  const days = useMemo(() => (clipped ? allDays.slice((allWeeks - fits) * 7) : allDays), [allDays, allWeeks, fits, clipped]);
  const weeks = Math.ceil(days.length / 7);
  const size = weeks ? Math.max(minSize, Math.min(22, Math.floor((width - labelW - gap * weeks) / weeks))) : 0;
  const top = 22;
  const height = top + 7 * (size + gap);
  const max = Math.max(1, ...days.map((d) => counts.get(d) ?? 0));
  const lastWithData = days.reduce((best, d, i) => ((counts.get(d) ?? 0) >= (counts.get(days[best]) ?? 0) && (counts.get(d) ?? 0) > 0 ? i : best), 0);
  const { active, setHover, setPinned, onKeyDown: baseKeys } = useActive(days.length, lastWithData);
  const onKeyDown = (event) => {
    // No calendário, coluna é semana: esquerda/direita andam 7 dias.
    const jump = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (jump) {
      event.preventDefault();
      const next = (active ?? 0) + jump;
      if (next >= 0 && next < days.length) { setHover(null); setPinned(next); }
      return;
    }
    baseKeys(event);
  };
  const pos = (i) => ({ x: labelW + Math.floor(i / 7) * (size + gap), y: top + (i % 7) * (size + gap) });
  const monthMarks = [];
  days.forEach((d, i) => {
    if (i % 7 === 0) {
      const m = +d.slice(5, 7) - 1;
      const prevWeek = days[i - 7];
      if (!prevWeek || +prevWeek.slice(5, 7) - 1 !== m) monthMarks.push({ i, label: MONTHS[m] });
    }
  });
  const state = (d) => {
    if (today && d > today) return 'future';
    if (dataFrom && d < dataFrom) return 'none';
    const v = counts.get(d) ?? 0;
    return v > 0 ? `lv-${levelOf(v, max)}` : 'lv-0';
  };
  const day = active != null ? days[active] : null;
  const p = active != null ? pos(active) : null;

  return (
    <div
      ref={ref}
      className="rp-chart rp-cal"
      // A altura inclui o padding-top (CAL_TOP): sem ele o SVG vazava 22 px sobre a legenda.
      style={{ height: CAL_TOP + height + 4 + (clipped ? 24 : 0) }}
      tabIndex={days.length ? 0 : -1}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
    >
      {size ? (
        <svg width={width} height={height} aria-hidden="true">
          {monthMarks.map((m) => (
            <text key={m.i} x={pos(m.i).x} y={12} className="rp-axis rp-axis--start">{m.label}</text>
          ))}
          {['', 'seg', '', 'qua', '', 'sex', ''].map((w, i) => (w ? <text key={w} x={0} y={top + i * (size + gap) + size - 1} className="rp-axis rp-axis--start">{w}</text> : null))}
          {days.map((d, i) => {
            const { x, y } = pos(i);
            const out = focus && (d < focus.from || d > focus.to);
            return (
              <rect
                key={d}
                x={x} y={y} width={size} height={size} rx={Math.max(2, size / 4)}
                className={`rp-cal__day ${state(d)} ${out ? 'is-out' : ''} ${i === active ? 'is-active' : ''}`}
                onMouseEnter={() => setHover(i)}
                onClick={() => setPinned(i)}
              />
            );
          })}
        </svg>
      ) : null}
      {clipped ? <p className="rp-cal__clip">Últimas {weeks} semanas · os 12 meses na tabela do ↗</p> : null}
      {size && day && state(day) !== 'future' ? (
        <Tag x={p.x + size / 2} y={CAL_TOP + p.y - 6} width={width}>
          {state(day) === 'none' ? 'sem registro' : `${counts.get(day) ?? 0}`}
        </Tag>
      ) : null}
      <Live>{day ? (describe ? describe(day, counts.get(day) ?? 0, missed.get(day) ?? 0, state(day)) : `${day}: ${counts.get(day) ?? 0}`) : ''}</Live>
    </div>
  );
}
