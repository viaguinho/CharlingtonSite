import * as React from 'react';
// @ts-ignore — componente do painel, em JSX
import { Tabs } from '../components/Tabs.jsx';

/**
 * Rosca pontilhada — a divisão de um total em fatias, desenhada em canvas com
 * pontos que crescem em direção à borda externa e ondulam devagar.
 *
 * Adaptação ao painel (a base é o componente "Dither Donut Chart"):
 *  - Sem Tailwind, sem `motion` e sem `lucide-react`: a aparência vem das
 *    classes `donut*` em charts.css; o número animado é um laço próprio.
 *  - Sem hexadecimal: a cor de cada fatia é o NOME de um token (`--blue-700`),
 *    lido por `getComputedStyle`. A legenda usa `var(--token)`.
 *  - Sem dado fictício: quem chama entrega as fatias reais de cada período.
 *    Sem nenhum atendimento no período, a rosca vira um anel apagado.
 *  - As fatias têm a mesma ordem em todos os períodos: trocar de período
 *    interpola uma rosca na outra.
 *  - O que está no canvas também está na lista ao lado (e é focável pelo
 *    teclado): o canvas não carrega informação sozinho.
 */

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  /** Nome de um token de cor, ex.: `--blue-700`. */
  color: string;
};

export type DonutPeriod = {
  key: string;
  label: string;
  /** Intervalo escrito ao lado do título, ex.: "01/10 a 31/10". */
  caption?: string;
  slices: DonutSlice[];
};

export interface DitherDonutProps {
  periods: DonutPeriod[];
  defaultPeriod?: string;
  title?: string;
  /** Nome do que se conta, no singular. */
  unit?: string;
  unitPlural?: string;
  locale?: string;
  className?: string;
}

const LOGICAL = 200;
const CENTER = 100;
const R_IN = 55;
const R_OUT = 86;

const smoothstep = (min: number, max: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

const hash = (x: number, y: number) => {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

const withAlpha = (color: string, alpha: number) => {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const drawRoundedWedge = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  aStart: number,
  aEnd: number,
  cr: number,
) => {
  const sweep = aEnd - aStart;
  if (sweep <= 0.001) return;
  const maxCr = Math.min(cr, (rOut - rIn) / 2, (sweep * rIn) / 2);
  const aStartIn = aStart + maxCr / rIn;
  const aEndIn = aEnd - maxCr / rIn;
  const aStartOut = aStart + maxCr / rOut;
  const aEndOut = aEnd - maxCr / rOut;

  ctx.moveTo(cx + rIn * Math.cos(aStartIn), cy + rIn * Math.sin(aStartIn));
  ctx.arc(cx, cy, rIn, aStartIn, aEndIn);
  ctx.arcTo(cx + rIn * Math.cos(aEnd), cy + rIn * Math.sin(aEnd), cx + rOut * Math.cos(aEnd), cy + rOut * Math.sin(aEnd), maxCr);
  ctx.arcTo(cx + rOut * Math.cos(aEnd), cy + rOut * Math.sin(aEnd), cx + rOut * Math.cos(aEndOut), cy + rOut * Math.sin(aEndOut), maxCr);
  ctx.arc(cx, cy, rOut, aEndOut, aStartOut, true);
  ctx.arcTo(cx + rOut * Math.cos(aStart), cy + rOut * Math.sin(aStart), cx + rIn * Math.cos(aStart), cy + rIn * Math.sin(aStart), maxCr);
  ctx.arcTo(cx + rIn * Math.cos(aStart), cy + rIn * Math.sin(aStart), cx + rIn * Math.cos(aStartIn), cy + rIn * Math.sin(aStartIn), maxCr);
};

/** Número que corre até o novo valor (sem biblioteca); com movimento reduzido, salta. */
function useTween(value: number, reduced: boolean) {
  const [shown, setShown] = React.useState(value);
  const from = React.useRef(value);
  React.useEffect(() => {
    if (reduced) {
      from.current = value;
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      const v = a + (value - a) * (1 - Math.pow(1 - t, 3));
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return Math.round(shown);
}

export default function DitherDonut({
  periods,
  defaultPeriod,
  title = 'Distribuição',
  unit = 'atendimento',
  unitPlural,
  locale = 'pt-BR',
  className = '',
}: DitherDonutProps) {
  const [periodKey, setPeriodKey] = React.useState(defaultPeriod ?? periods[0]?.key);
  const [hover, setHover] = React.useState<number | null>(null);
  const [reduced, setReduced] = React.useState(false);

  const period = periods.find((p) => p.key === periodKey) ?? periods[0];
  const slices = period?.slices ?? [];
  const total = slices.reduce((t, s) => t + s.value, 0);
  const shares = slices.map((s) => (total ? s.value / total : 0));
  const sharesKey = shares.join(',');
  const colorKey = slices.map((s) => s.color).join(',');

  const nf = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const plural = unitPlural ?? unit + 's';
  const noun = (n: number) => (n === 1 ? unit : plural);
  const pct = (share: number) => Math.round(share * 100);

  const rootRef = React.useRef<HTMLElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const sizeRef = React.useRef({ w: 0, h: 0 });
  const visibleRef = React.useRef(true);
  const reducedRef = React.useRef(false);
  const colorsRef = React.useRef<string[]>([]);
  const emptyRef = React.useRef(total === 0);
  const hoverRef = React.useRef<number | null>(null);
  const sharesRef = React.useRef({ from: [] as number[], target: [] as number[], disp: [] as number[], start: 0 });
  const mutedRef = React.useRef('rgb(169, 170, 173)');

  emptyRef.current = total === 0;

  React.useEffect(() => {
    hoverRef.current = hover;
  }, [hover]);

  // Movimento reduzido, tamanho do palco e visibilidade: lidos fora do laço de desenho.
  React.useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return undefined;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
    };
    onMq();
    mq.addEventListener('change', onMq);

    const ro = new ResizeObserver(() => {
      const w = Math.round(stage.clientWidth);
      const h = Math.round(stage.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h };
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    });
    ro.observe(stage);

    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        visibleRef.current = entries.some((en) => en.isIntersecting);
      });
      io.observe(stage);
    }

    return () => {
      mq.removeEventListener('change', onMq);
      ro.disconnect();
      io?.disconnect();
    };
  }, []);

  // Cores: o nome do token vira a cor do canvas.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cs = getComputedStyle(root);
    colorsRef.current = slices.map((s) => cs.getPropertyValue(s.color).trim() || 'rgb(134, 135, 136)');
    mutedRef.current = cs.getPropertyValue('--ink-200').trim() || 'rgb(169, 170, 173)';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey]);

  // Trocar de período interpola uma rosca na outra.
  React.useEffect(() => {
    const r = sharesRef.current;
    if (r.disp.length !== shares.length) {
      r.disp = [...shares];
      r.from = [...shares];
      r.target = [...shares];
    } else {
      r.from = [...r.disp];
      r.target = [...shares];
      r.start = performance.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharesKey]);

  // Laço de desenho: monta uma vez e lê tudo por refs.
  React.useEffect(() => {
    let raf = 0;
    let time = 0;
    let alive = true;

    const draw = () => {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      if (!visibleRef.current || document.hidden) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || sizeRef.current.w === 0) return;

      const reducedMotion = reducedRef.current;
      time += reducedMotion ? 0 : 0.02;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(canvas.width / LOGICAL, canvas.height / LOGICAL);

      const r = sharesRef.current;
      let t = 1;
      if (!reducedMotion && r.start > 0) t = Math.min(1, (performance.now() - r.start) / 500);
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      for (let i = 0; i < r.target.length; i++) r.disp[i] = r.from[i] + (r.target[i] - r.from[i]) * e;

      const empty = emptyRef.current;
      const parts = empty ? [1] : r.disp;
      const colors = empty ? [mutedRef.current] : colorsRef.current;
      const hovered = empty ? null : hoverRef.current;
      const anyHover = hovered !== null;
      const gap = empty ? 0.0 : 0.07;
      let startAngle = -Math.PI / 2;

      for (let i = 0; i < parts.length; i++) {
        const share = parts[i];
        if (!(share > 0)) continue;
        const sweep = Math.min(share, 0.9995) * Math.PI * 2;
        const aStart = startAngle + gap / 2;
        const aEnd = Math.max(aStart, startAngle + sweep - gap / 2);
        const isHot = hovered === i;

        ctx.save();
        if (isHot) {
          const mid = (aStart + aEnd) / 2;
          ctx.translate(Math.cos(mid) * 6, Math.sin(mid) * 6);
        }
        ctx.beginPath();
        drawRoundedWedge(ctx, CENTER, CENTER, R_IN, R_OUT, aStart, aEnd, 6);
        ctx.clip();

        ctx.globalAlpha = empty ? 0.55 : isHot ? 1 : anyHover ? 0.3 * 0.9 : 0.9;
        const color = colors[i] ?? 'rgb(134, 135, 136)';
        ctx.fillStyle = color;
        if (isHot) {
          ctx.shadowColor = withAlpha(color, 0.55);
          ctx.shadowBlur = 5;
        }

        const cell = 4.6;
        for (let x = 14; x <= 186; x += cell) {
          for (let y = 14; y <= 186; y += cell) {
            const dx = x - CENTER;
            const dy = y - CENTER;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < R_IN - cell || dist > R_OUT + cell) continue;
            const a = Math.atan2(dy, dx);
            let na = a - aStart;
            while (na < 0) na += Math.PI * 2;
            while (na >= Math.PI * 2) na -= Math.PI * 2;
            if (na > aEnd - aStart) continue;

            const fullness = smoothstep(0.62, 1.0, (dist - R_IN) / (R_OUT - R_IN));
            const waveRaw = reducedMotion
              ? 0
              : Math.sin(dist * 0.1 - time) + Math.sin(a * 3 + time * 1.5) + Math.sin(dx * 0.05 + dy * 0.05 + time * 2);
            const wave = smoothstep(-1.5, 1.5, waveRaw);
            const size = cell * ((isHot ? 0.5 : 0.4) + 0.4 * fullness + 0.26 * wave) * (0.78 + 0.42 * hash(x, y));
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
          }
        }
        ctx.restore();
        startAngle += sweep;
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  // Passar o cursor sobre a rosca destaca a fatia (no canvas, pelo ângulo e pelo raio).
  const onCanvasMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!total) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * LOGICAL - CENTER;
    const y = ((ev.clientY - rect.top) / rect.height) * LOGICAL - CENTER;
    const dist = Math.hypot(x, y);
    if (dist < R_IN - 4 || dist > R_OUT + 8) {
      setHover(null);
      return;
    }
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    let acc = 0;
    let found: number | null = null;
    for (let i = 0; i < shares.length; i++) {
      acc += shares[i] * Math.PI * 2;
      if (a <= acc && shares[i] > 0) {
        found = i;
        break;
      }
    }
    setHover(found);
  };

  const hot = hover !== null ? slices[hover] : null;
  const centerValue = useTween(hot ? hot.value : total, reduced);

  if (!period) return null;

  return (
    <figure ref={rootRef} className={('chart donut ' + className).trim()} role="group" aria-label={title}>
      <div className="donut__head">
        <div className="donut__title">
          <strong>{title}</strong>
          {period.caption ? <span>{period.caption}</span> : null}
        </div>
        {periods.length > 1 ? (
          <Tabs
            variant="segment"
            ariaLabel="Período do gráfico"
            value={periodKey}
            onChange={(v: string) => {
              setHover(null);
              setPeriodKey(v);
            }}
            items={periods.map((p) => ({ value: p.key, label: p.label }))}
          />
        ) : null}
      </div>

      <div className="donut__body">
        <div className="donut__stage" ref={stageRef}>
          <canvas
            ref={canvasRef}
            className="donut__canvas"
            aria-hidden="true"
            onPointerMove={onCanvasMove}
            onPointerLeave={() => setHover(null)}
          />
          <div className="donut__center" aria-hidden="true">
            <strong className="num">{nf.format(centerValue)}</strong>
            <span>{hot ? hot.label + ' · ' + pct(shares[hover as number]) + '%' : total ? noun(total) : 'sem ' + plural}</span>
          </div>
        </div>

        <ul className="donut__list" aria-label={title + ' · ' + (period.caption ?? period.label)}>
          {slices.map((s, i) => (
            <li
              key={s.key}
              tabIndex={0}
              className={'donut__row' + (hover === i ? ' is-hot' : '')}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <i className="donut__dot" style={{ background: 'var(' + s.color + ')' }} aria-hidden="true" />
              <span className="donut__label">{s.label}</span>
              <span className="donut__value num">{nf.format(s.value)}</span>
              <span className="donut__pct num">{total ? pct(shares[i]) + '%' : '—'}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
