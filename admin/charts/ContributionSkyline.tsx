import * as React from 'react';
// @ts-ignore — componente do painel, em JSX
import { Tabs } from '../components/Tabs.jsx';

/**
 * Skyline de produção — um ano de atendimentos como mapa de calor que se dobra
 * num horizonte isométrico, e volta.
 *
 * É uma cena só, não dois gráficos. Cada dia é uma caixa numa grade: o mapa é
 * essa grade vista de cima, o skyline é a mesma grade vista do canto. Trocar a
 * visão gira uma câmera entre as duas enquanto as barras de cada semana sobem
 * (ou descem) em onda, da semana mais antiga à mais recente: nada é trocado
 * nem cortado.
 *
 * Adaptação ao painel (a base é o componente "Contribution Skyline"):
 *  - Sem Tailwind e sem hexadecimal: a aparência vem das classes `skyline*` em
 *    charts.css e as cores do canvas são lidas dos tokens (`--blue-*`, `--ink-*`).
 *  - Sem dado fictício: não há gerador de ano de exemplo. Sem `data`, quem
 *    chama mostra o estado vazio.
 *  - Dia sem registro algum (antes do primeiro atendimento da base) não é zero:
 *    é desenhado apagado e dito como "sem registro".
 *  - `focus` é o período selecionado na tela: o que está fora dele esmaece, e o
 *    número do cabeçalho é o mesmo do KPI ao lado.
 *  - Escada de azuis da paleta (`--blue-200` → `--blue-700`); o dia sob o cursor
 *    ou o foco vai para a tinta (`--ink-900`).
 */

// #region skyline
// Puro: datas, grade, níveis, câmera e cor. Nada aqui toca o DOM.

export type SkylineDay = { date: string; count: number; note?: string };
export type SkylineStat = { label: string; value: string; unit: string; sub: string };
export type Cell = {
  date: string;
  count: number;
  level: number;
  week: number;
  day: number;
  /** Antes do primeiro registro da base: ausência de dado, não zero. */
  before: boolean;
  /** Dentro do período em foco (sempre true quando não há foco). */
  inFocus: boolean;
  /** Modo mês: o dia ainda não aconteceu (não é zero). */
  future?: boolean;
  /** Modo mês: é hoje. */
  today?: boolean;
  note?: string;
};
export type RGB = [number, number, number];

export const DAY_MS = 86400000;

export const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeInOutCubic = (x: number): number => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - clamp01(x), 3);
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Meia-noite UTC → "AAAA-MM-DD". */
export const toKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Qualquer data → meia-noite UTC do dia de calendário. "AAAA-MM-DD" é lido ao
 * pé da letra (sem deriva de fuso); Date, pelo dia local; número, como UTC.
 */
export const dayMs = (v: string | number | Date): number => {
  if (typeof v === 'number') return Math.floor(v / DAY_MS) * DAY_MS;
  if (typeof v === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    v = new Date(v);
  }
  return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
};

/**
 * A janela exibida: termina em `end` e começa no início da semana que contém o
 * dia 364 dias antes. Exportada para quem calcula números "do gráfico" usar o
 * mesmo recorte e a conta fechar com o que está na tela.
 */
export const skylineWindow = (end: string | number | Date, weekStart = 0): { from: string; to: string } => {
  const endMs = dayMs(end);
  let start = endMs - 364 * DAY_MS;
  start -= ((new Date(start).getUTCDay() - weekStart + 7) % 7) * DAY_MS;
  return { from: toKey(start), to: toKey(endMs) };
};

/** 0 para dia vazio; senão 1–4 por quartos do dia cheio. Em `busy` ou acima, 4. */
export const levelOf = (count: number, busy: number): number =>
  count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4));

/**
 * A grade: colunas são semanas, linhas são dias da semana (linha 0 = `weekStart`).
 * Termina em `endMs`. Os níveis 1–4 repartem os dias não vazios pela fração de
 * um dia cheio, o percentil 95: um dia atípico não achata todos os outros no
 * nível 1.
 */
export const buildGrid = (
  data: SkylineDay[],
  endMs: number,
  weekStart = 0,
  options: { dataFrom?: string | null; focus?: { from: string; to: string } | null } = {},
) => {
  const counts = new Map<string, number>();
  const notes = new Map<string, string>();
  for (const d of data) {
    if (!d || typeof d.date !== 'string') continue;
    const ms = dayMs(d.date);
    if (!Number.isFinite(ms)) continue;
    const k = toKey(ms);
    // A nota vale mesmo em dia sem atendimento (só faltas, por exemplo).
    if (d.note) notes.set(k, d.note);
    const c = Number(d.count);
    if (c > 0 && Number.isFinite(c)) counts.set(k, (counts.get(k) ?? 0) + c);
  }
  const win = skylineWindow(endMs, weekStart);
  const start = dayMs(win.from);
  const { dataFrom, focus } = options;
  const cells: Cell[] = [];
  for (let ms = start, i = 0; ms <= endMs; ms += DAY_MS, i++) {
    const date = toKey(ms);
    cells.push({
      date,
      count: counts.get(date) ?? 0,
      level: 0,
      week: Math.floor(i / 7),
      day: i % 7,
      before: Boolean(dataFrom && date < dataFrom),
      inFocus: !focus || (date >= focus.from && date <= focus.to),
      note: notes.get(date),
    });
  }
  const nz = cells.map((c) => c.count).filter((c) => c > 0).sort((a, b) => a - b);
  const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
  for (const c of cells) c.level = levelOf(c.count, busy);
  return {
    cells,
    weeks: cells.length ? cells[cells.length - 1].week + 1 : 0,
    rows: 7,
    calendar: false as boolean,
    max: nz.length ? nz[nz.length - 1] : 0,
  };
};

/**
 * Grade de UM mês, como calendário: as colunas (x) são os dias da semana e as
 * linhas (y) são as semanas do mês. Só existem as células dos dias do mês. Os
 * dias depois de `todayMs` ainda não aconteceram: ficam apagados e não contam
 * como zero. Em cada célula, `week` guarda a coluna e `day` guarda a linha.
 */
export const buildMonthGrid = (
  data: SkylineDay[],
  month: string,
  todayMs: number,
  weekStart = 0,
  options: { dataFrom?: string | null } = {},
) => {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  const y = m ? +m[1] : new Date(todayMs).getUTCFullYear();
  const mo = m ? +m[2] - 1 : new Date(todayMs).getUTCMonth();
  const first = Date.UTC(y, mo, 1);
  const total = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const lead = (new Date(first).getUTCDay() - weekStart + 7) % 7;
  const counts = new Map<string, number>();
  const notes = new Map<string, string>();
  for (const d of data) {
    if (!d || typeof d.date !== 'string') continue;
    const ms = dayMs(d.date);
    if (!Number.isFinite(ms)) continue;
    const k = toKey(ms);
    if (d.note) notes.set(k, d.note);
    const c = Number(d.count);
    if (c > 0 && Number.isFinite(c)) counts.set(k, (counts.get(k) ?? 0) + c);
  }
  const todayKey = toKey(todayMs);
  const cells: Cell[] = [];
  for (let i = 0; i < total; i++) {
    const date = toKey(first + i * DAY_MS);
    const slot = lead + i;
    cells.push({
      date,
      count: counts.get(date) ?? 0,
      level: 0,
      week: slot % 7,
      day: Math.floor(slot / 7),
      before: Boolean(options.dataFrom && date < options.dataFrom),
      inFocus: true,
      future: date > todayKey,
      today: date === todayKey,
      note: notes.get(date),
    });
  }
  const nz = cells.filter((c) => !c.future && c.count > 0).map((c) => c.count).sort((a, b) => a - b);
  const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
  for (const c of cells) c.level = levelOf(c.count, busy);
  return {
    cells,
    weeks: 7,
    rows: Math.floor((lead + total - 1) / 7) + 1,
    calendar: true as boolean,
    max: nz.length ? nz[nz.length - 1] : 0,
  };
};

/** Um rótulo em cada semana cujo primeiro dia abre um mês; o primeiro, se apertado, cai. */
export const monthLabels = (cells: Cell[], weeks: number, locale = 'pt-BR') => {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const out: { week: number; label: string }[] = [];
  let prev = -1;
  for (let w = 0; w < weeks; w++) {
    const c = cells[w * 7];
    if (!c) break;
    const m = +c.date.slice(5, 7);
    if (m !== prev) out.push({ week: w, label: fmt.format(dayMs(c.date)).replace('.', '') });
    prev = m;
  }
  if (out.length > 1 && out[1].week - out[0].week < 3) out.shift();
  return out;
};

/** Altura da caixa em unidades da grade. Dia vazio é uma lâmina; o dia cheio tem ~7,6 células. */
export const barHeight = (count: number, max: number, scale = 1): number =>
  count > 0 && max > 0 ? 0.4 + Math.pow(count / max, 0.85) * 7.2 * scale : 0.2;

/** Fração da transição que cada barra espera: a onda varre da semana mais antiga à mais nova. */
export const WAVE = 0.42;

/** 0 → 1 enquanto a barra sobe. Toda barra está rasa em t=0 e inteira em t=1. */
export const riseAt = (t: number, week: number, weeks: number, day: number): number => {
  const d = (weeks > 1 ? week / (weeks - 1) : 0) * 0.36 + (day / 6) * 0.06;
  return easeOutCubic((t - d) / (1 - WAVE));
};

export const YAW_3D = Math.PI / 4;
export const ELEV_3D = (34 * Math.PI) / 180;
export const YAW_RANGE: [number, number] = [(8 * Math.PI) / 180, (82 * Math.PI) / 180];
export const ELEV_RANGE: [number, number] = [(18 * Math.PI) / 180, (62 * Math.PI) / 180];

export type Cam = { cs: number; sn: number; se: number; ce: number };

/**
 * e=0 olha reto para baixo (guinada 0, elevação 90°): x na horizontal, y para
 * baixo, altura invisível — um mapa de calor comum. e=1 é o canto isométrico.
 * O giro do usuário só vale na proporção de e: o mapa nunca se inclina.
 */
export const camera = (e: number, dYaw = 0, dElev = 0): Cam => {
  const yaw = Math.min(YAW_RANGE[1], Math.max(0, lerp(0, YAW_3D + dYaw, e)));
  const elev = lerp(Math.PI / 2, Math.min(ELEV_RANGE[1], Math.max(ELEV_RANGE[0], ELEV_3D + dElev)), e);
  return { cs: Math.cos(yaw), sn: Math.sin(yaw), se: Math.sin(elev), ce: Math.cos(elev) };
};

/** Mundo (x = semana, y = dia da semana, z = altura) → tela, antes de escala e deslocamento. */
export const project = (c: Cam, x: number, y: number, z: number): [number, number] => [
  x * c.cs - y * c.sn,
  (x * c.sn + y * c.cs) * c.se - z * c.ce,
];

// #endregion

type View = '2d' | '3d';

export interface ContributionSkylineProps {
  /** Um item por dia com atendimento, `AAAA-MM-DD`. Datas repetidas somam. */
  data: SkylineDay[];
  /** Último dia exibido (hoje). No modo mês, é o "hoje" que separa o que já aconteceu. */
  endDate: string | Date;
  /** `AAAA-MM`: mostra só esse mês, como calendário com o número de cada dia. */
  month?: string;
  /** Primeiro dia com registro na base: o que vem antes é "sem registro", não zero. */
  dataFrom?: string | null;
  /** Período selecionado na tela; fora dele o gráfico esmaece. */
  focus?: { from: string; to: string } | null;
  view?: View;
  /** Visão inicial. Sem ela: skyline, e mapa em tela de até 600 px. */
  defaultView?: View;
  onViewChange?: (view: View) => void;
  /** Número e legenda acima do gráfico (o mesmo do KPI do período). */
  summary?: { value: string; label: string };
  /** Até quatro números do ano: aparecem nos cantos do skyline e em linha no mapa. */
  stats?: SkylineStat[];
  /** Nome acessível do gráfico (vira legenda oculta). */
  title?: string;
  unit?: string;
  unitPlural?: string;
  /** Multiplica a altura das barras no 3D. */
  heightScale?: number;
  /** Teto da altura do skyline, em px. */
  maxHeight?: number;
  /** Duração da transição, ms. */
  duration?: number;
  /** 0 põe o domingo na primeira linha, 1 a segunda. */
  weekStart?: 0 | 1;
  /** Arrastar gira o skyline. */
  orbit?: boolean;
  showLegend?: boolean;
  showToggle?: boolean;
  /** Nota sob o gráfico, no mesmo estilo das demais notas de gráfico. */
  note?: React.ReactNode;
  locale?: string;
  className?: string;
}

const FG_FALLBACK: RGB = [15, 16, 18];
const BG_FALLBACK: RGB = [253, 253, 253];

// Qualquer cor CSS → sRGB, deixando o navegador pintá-la. Cobre rgba, oklch, color-mix…
let probe: CanvasRenderingContext2D | null = null;
const toRGB = (color: string, fallback: RGB | null): RGB | null => {
  if (!color) return fallback;
  if (!probe) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    probe = c.getContext('2d', { willReadFrequently: true });
  }
  if (!probe) return fallback;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = 'rgba(0,0,0,0)';
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  if (d[3] < 8) return fallback;
  return [d[0], d[1], d[2]];
};

const rgbString = (r: number, g: number, b: number) => 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';

const pointInQuad = (p: Float32Array, o: number, x: number, y: number): boolean => {
  let sign = 0;
  for (let k = 0; k < 4; k++) {
    const ax = p[o + k * 2];
    const ay = p[o + k * 2 + 1];
    const bx = p[o + ((k + 1) % 4) * 2];
    const by = p[o + ((k + 1) % 4) * 2 + 1];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(cross) < 1e-9) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== 0;
};

const quadPath = (ctx: CanvasRenderingContext2D, p: Float32Array, o: number, r: number) => {
  if (r < 0.3) {
    ctx.moveTo(p[o], p[o + 1]);
    ctx.lineTo(p[o + 2], p[o + 3]);
    ctx.lineTo(p[o + 4], p[o + 5]);
    ctx.lineTo(p[o + 6], p[o + 7]);
    ctx.closePath();
    return;
  }
  ctx.moveTo((p[o + 6] + p[o]) / 2, (p[o + 7] + p[o + 1]) / 2);
  for (let k = 0; k < 4; k++) {
    const b = (k + 1) % 4;
    ctx.arcTo(p[o + k * 2], p[o + k * 2 + 1], p[o + b * 2], p[o + b * 2 + 1], r);
  }
  ctx.closePath();
};

function Stat({ label, value, unit, sub }: SkylineStat) {
  return (
    <div className="skyline-stat">
      <div className="skyline-stat__label">{label}</div>
      <div className="skyline-stat__value">
        <strong className="num">{value}</strong>
        <span>{unit}</span>
      </div>
      <div className="skyline-stat__sub">{sub}</div>
    </div>
  );
}

const LEVEL_NAMES = ['Sem atendimento', 'Poucos', 'Moderado', 'Muitos', 'Dia mais cheio'];

export default function ContributionSkyline({
  data,
  endDate,
  month,
  dataFrom = null,
  focus = null,
  view: viewProp,
  defaultView,
  onViewChange,
  summary,
  stats = [],
  title = 'Atendimentos concluídos por dia nos últimos 12 meses',
  unit = 'atendimento',
  unitPlural,
  heightScale = 1,
  maxHeight = 440,
  duration = 1300,
  weekStart = 0,
  orbit = true,
  showLegend = true,
  showToggle = true,
  note,
  locale = 'pt-BR',
  className = '',
}: ContributionSkylineProps) {
  const endKey = dayMs(endDate);
  const focusFrom = focus?.from ?? null;
  const focusTo = focus?.to ?? null;
  const model = React.useMemo(() => {
    if (month) {
      const grid = buildMonthGrid(data, month, endKey, weekStart, { dataFrom });
      return { ...grid, months: [] as { week: number; label: string }[] };
    }
    const grid = buildGrid(data, endKey, weekStart, {
      dataFrom,
      focus: focusFrom && focusTo ? { from: focusFrom, to: focusTo } : null,
    });
    return { ...grid, months: monthLabels(grid.cells, grid.weeks, locale) };
  }, [data, month, endKey, weekStart, dataFrom, focusFrom, focusTo, locale]);

  // Em tela estreita o skyline encolhe até o ilegível: o mapa é a visão inicial do celular.
  const [innerView, setInnerView] = React.useState<View>(
    () => defaultView ?? (typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches ? '2d' : '3d'),
  );
  const view = viewProp ?? innerView;
  const setView = (v: View) => {
    if (viewProp === undefined) setInnerView(v);
    onViewChange?.(v);
  };

  const [width, setWidth] = React.useState(0);
  const [active, setActive] = React.useState(-1);
  const [legendLevel, setLegendLevel] = React.useState(-1);
  const [announce, setAnnounce] = React.useState('');
  const [showData, setShowData] = React.useState(false);
  const dataId = React.useId();

  const rootRef = React.useRef<HTMLElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);
  const engine = React.useRef<{ kick: () => void; load: () => void; retheme: () => void; tipWidth: (w: number) => void } | null>(null);

  const plural = unitPlural ?? unit + 's';
  const nf = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  // "qui., 07/10/2026": o dia da semana importa numa agenda de segunda a sexta.
  const dfs = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
    [locale],
  );
  const dfl = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    [locale],
  );
  const noun = (n: number) => (n === 1 ? unit : plural);
  const describe = (i: number) => {
    const c = model.cells[i];
    if (!c) return '';
    const what = c.future ? 'Ainda não aconteceu' : c.before ? 'Sem registro' : c.count ? nf.format(c.count) + ' ' + noun(c.count) : 'Sem ' + plural;
    return what + (c.note ? ', ' + c.note : '') + ' em ' + dfl.format(dayMs(c.date));
  };

  // Tudo o que o laço de desenho lê, renovado a cada render para nunca fechar sobre props velhas.
  const cfg = React.useRef<any>(null);
  cfg.current = { model, weekStart, duration, heightScale, maxHeight, orbit, legendLevel, target: view === '3d' ? 1 : 0, setActive, setWidth, setAnnounce, describe };

  React.useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const tip = tipRef.current;
    if (!root || !stage || !canvas || !tip) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = reduceMq.matches;
    let alive = true;

    // t é o tempo linear 0 (mapa) → 1 (skyline); a câmera o suaviza, as barras o espalham em onda.
    let t = 0;
    let target = 0;
    let entered = false;
    // giro do usuário, suavizado até o alvo
    let yaw = 0;
    let elev = 0;
    let yawGoal = 0;
    let elevGoal = 0;
    // layout
    let W = 0;
    let H2 = 0;
    let H3 = 0;
    let Hmax = 0;
    let lastH = -1;
    let dpr = 1;
    let gutter = 30;
    let labelW = 30;
    let font = '10px sans-serif';
    // cores: [vazio, n1, n2, n3, n4] × rgb, suavizadas até o alvo
    const col = new Float32Array(15);
    const colGoal = new Float32Array(15);
    let colReady = false;
    let fg: RGB = FG_FALLBACK;
    let bg: RGB = BG_FALLBACK;
    let muted: RGB = FG_FALLBACK;
    let accent: RGB = FG_FALLBACK;
    // células
    let n = 0;
    let weeks = 0;
    let wk = new Float32Array(0);
    let dy = new Float32Array(0);
    let lv = new Uint8Array(0);
    let before = new Uint8Array(0);
    let hgt = new Float32Array(0);
    let zs = new Float32Array(0);
    let hover = new Float32Array(0);
    let dim = new Float32Array(0);
    let fade = new Float32Array(0);
    let fadeGoal = new Float32Array(0);
    let polys = new Float32Array(0);
    let faces = new Uint8Array(0);
    let order: number[] = [];
    let months: { week: number; label: string }[] = [];
    let weekdayRows: { day: number; label: string }[] = [];
    // modo mês: colunas = dias da semana (x), linhas = semanas do mês (y)
    let cal = false;
    let rowsN = 7;
    let colLabels: string[] = [];
    let fam = 'sans-serif';
    let tod = new Uint8Array(0);
    let dnum = new Uint8Array(0);
    // interação
    let hovered = -1;
    let pinned = -1;
    let activeIdx = -1;
    let tipW = 0;
    let raf = 0;
    let last = 0;

    const load = () => {
      const m = cfg.current.model;
      n = m.cells.length;
      weeks = m.weeks;
      cal = Boolean(m.calendar);
      rowsN = m.rows ?? 7;
      const fresh = wk.length !== n;
      if (fresh) {
        wk = new Float32Array(n);
        dy = new Float32Array(n);
        lv = new Uint8Array(n);
        before = new Uint8Array(n);
        tod = new Uint8Array(n);
        dnum = new Uint8Array(n);
        hgt = new Float32Array(n);
        zs = new Float32Array(n);
        hover = new Float32Array(n);
        dim = new Float32Array(n);
        fade = new Float32Array(n);
        fadeGoal = new Float32Array(n);
        polys = new Float32Array(n * 24);
        faces = new Uint8Array(n);
        order = Array.from({ length: n }, (_, i) => i);
      }
      for (let i = 0; i < n; i++) {
        const c = m.cells[i];
        wk[i] = c.week;
        dy[i] = c.day;
        lv[i] = c.level;
        before[i] = c.before || c.future ? 1 : 0;
        tod[i] = c.today ? 1 : 0;
        dnum[i] = +c.date.slice(8, 10);
        hgt[i] = barHeight(c.count, m.max, cfg.current.heightScale);
        fadeGoal[i] = c.inFocus ? 0 : 1;
        // Primeiro desenho: já no estado final. Mudar de período é que esmaece aos poucos.
        if (fresh) fade[i] = fadeGoal[i];
      }
      months = m.months;
      const wf = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
      weekdayRows = [];
      for (let d = 0; d < 7 && d < n; d++) {
        const dow = new Date(dayMs(m.cells[d].date)).getUTCDay();
        if (dow === 1 || dow === 3 || dow === 5) weekdayRows.push({ day: d, label: wf.format(dayMs(m.cells[d].date)).replace('.', '') });
      }
      colLabels = [];
      if (cal) {
        for (let k = 0; k < 7; k++) {
          const dow = ((cfg.current.weekStart ?? 0) + k) % 7;
          const lab = wf.format(Date.UTC(2023, 0, 1 + dow)).replace('.', '');
          colLabels.push(lab.charAt(0).toUpperCase() + lab.slice(1));
        }
      }
      if (hovered >= n) hovered = -1;
      if (pinned >= n) pinned = -1;
    };

    const retheme = () => {
      const cs = getComputedStyle(root);
      const token = (name: string, fallback: RGB): RGB => toRGB(cs.getPropertyValue(name).trim(), fallback) ?? fallback;
      fg = token('--ink-900', FG_FALLBACK);
      bg = token('--surface', BG_FALLBACK);
      muted = token('--ink-400', FG_FALLBACK);
      // O dia sob o cursor ou o foco vai para a tinta: o azul agora é a cor do dado.
      accent = token('--ink-900', FG_FALLBACK);
      // Do mais leve ao mais pesado: a escada de azuis da paleta do painel.
      const all: RGB[] = [
        token('--surface-sunken', BG_FALLBACK),
        token('--blue-200', FG_FALLBACK),
        token('--blue-300', FG_FALLBACK),
        token('--blue-500', FG_FALLBACK),
        token('--blue-700', FG_FALLBACK),
      ];
      for (let k = 0; k < 5; k++) for (let ch = 0; ch < 3; ch++) colGoal[k * 3 + ch] = all[k][ch];
      if (!colReady || reduced) {
        col.set(colGoal);
        colReady = true;
      }
      fam = cs.fontFamily || 'sans-serif';
      font = '400 10px ' + fam;
      ctx.font = font;
      labelW = Math.ceil(Math.max(20, ...weekdayRows.map((r) => ctx.measureText(r.label).width))) + 8;
      kick();
    };

    // Extensão projetada da cena para a câmera `cam`, com cada barra em zs[i] (ou na altura cheia).
    const extent = (cam: Cam, e: number, full: boolean) => {
      const w = lerp(0.78, 0.9, e);
      const off = (1 - w) / 2;
      let minx = Infinity;
      let maxx = -Infinity;
      let miny = Infinity;
      let maxy = -Infinity;
      const add = (x: number, y: number, z: number) => {
        const p = project(cam, x, y, z);
        if (p[0] < minx) minx = p[0];
        if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1];
        if (p[1] > maxy) maxy = p[1];
      };
      for (let i = 0; i < n; i++) {
        const x0 = wk[i] + off;
        const y0 = dy[i] + off;
        const z = full ? hgt[i] * e : zs[i];
        add(x0, y0, z);
        add(x0 + w, y0, z);
        add(x0, y0 + w, z);
        add(x0 + w, y0 + w, 0);
        add(x0, y0 + w, 0);
        add(x0 + w, y0, 0);
      }
      // espaço para os rótulos de mês que correm pela borda da frente no 3D
      add(0, rowsN + 1.5 * e, 0);
      add(weeks, rowsN + 1.5 * e, 0);
      return { minx, maxx, miny, maxy };
    };

    const relayout = () => {
      const w = Math.round(stage.clientWidth);
      if (!w || !n) return;
      W = w;
      // Cartão estreito cede a coluna dos dias da semana para a grade: as linhas ficam apertadas demais para rótulo.
      gutter = cal || W < 520 ? 0 : labelW;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const b2 = extent(camera(0), 0, true);
      H2 = (cal ? 34 : 20) + 4 + ((b2.maxy - b2.miny) / (b2.maxx - b2.minx)) * (W - gutter - 4);
      // Calendário de um mês é quase quadrado: sem teto ele ficaria mais alto que o resto do card.
      if (cal) H2 = Math.min(H2, Math.max(240, cfg.current.maxHeight));
      const b3 = extent(camera(1), 1, true);
      const natural = ((b3.maxy - b3.miny) / (b3.maxx - b3.minx)) * (W - 40) + 40;
      const cap = Math.max(240, cfg.current.maxHeight);
      H3 = Math.max(Math.min(natural, W * 0.72, cap), Math.min(natural, 240));
      Hmax = Math.ceil(Math.max(H2, H3));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(Hmax * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = Hmax + 'px';
      lastH = -1;
      cfg.current.setWidth(W);
      draw();
    };

    const draw = () => {
      if (!W || !n) return;
      const e = easeInOutCubic(t);
      const cam = camera(e, yaw, elev);
      const Hc = lerp(H2, H3, e);
      if (Math.abs(Hc - lastH) > 0.2) {
        stage.style.height = Hc.toFixed(1) + 'px';
        lastH = Hc;
      }
      for (let i = 0; i < n; i++) zs[i] = (cal ? riseAt(t, dy[i], rowsN, wk[i]) : riseAt(t, wk[i], weeks, dy[i])) * hgt[i];
      const b = extent(cam, e, false);
      const pad = lerp(2, 20, e);
      const left = pad + gutter * (1 - e);
      const top = pad + (cal ? 34 : 20) * (1 - e);
      const aw = W - left - pad;
      const ah = Hc - top - pad;
      const bw = Math.max(1e-6, b.maxx - b.minx);
      const bh = Math.max(1e-6, b.maxy - b.miny);
      const s = Math.min(aw / bw, ah / bh);
      const ox = left + (aw - bw * s) / 2 - b.minx * s;
      const oy = top + (ah - bh * s) / 2 - b.miny * s;
      const { cs, sn, se, ce } = cam;
      const px = (x: number, y: number) => ox + (x * cs - y * sn) * s;
      const py = (x: number, y: number, z: number) => oy + ((x * sn + y * cs) * se - z * ce) * s;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hmax);

      order.sort((a, c) => (wk[a] + 0.5) * sn + (dy[a] + 0.5) * cs - ((wk[c] + 0.5) * sn + (dy[c] + 0.5) * cs));

      const w = lerp(0.78, 0.9, e);
      const off = (1 - w) / 2;
      const radius = lerp(0.17, 0.03, e) * s;
      const outline = (1 - e) * 0.07;
      const lift = 0.7 * e;
      const ex = col[0];
      const ey = col[1];
      const ez = col[2];

      for (let k = 0; k < n; k++) {
        const i = order[k];
        const x0 = wk[i] + off;
        const y0 = dy[i] + off;
        const x1 = x0 + w;
        const y1 = y0 + w;
        const z = zs[i] + hover[i] * lift;
        const o = i * 24;
        // topo
        polys[o] = px(x0, y0); polys[o + 1] = py(x0, y0, z);
        polys[o + 2] = px(x1, y0); polys[o + 3] = py(x1, y0, z);
        polys[o + 4] = px(x1, y1); polys[o + 5] = py(x1, y1, z);
        polys[o + 6] = px(x0, y1); polys[o + 7] = py(x0, y1, z);
        // face +y (esquerda na tela)
        polys[o + 8] = px(x0, y1); polys[o + 9] = py(x0, y1, 0);
        polys[o + 10] = px(x1, y1); polys[o + 11] = py(x1, y1, 0);
        polys[o + 12] = polys[o + 4]; polys[o + 13] = polys[o + 5];
        polys[o + 14] = polys[o + 6]; polys[o + 15] = polys[o + 7];
        // face +x (direita na tela)
        polys[o + 16] = px(x1, y0); polys[o + 17] = py(x1, y0, 0);
        polys[o + 18] = polys[o + 10]; polys[o + 19] = polys[o + 11];
        polys[o + 20] = polys[o + 4]; polys[o + 21] = polys[o + 5];
        polys[o + 22] = polys[o + 2]; polys[o + 23] = polys[o + 3];

        const tall = z * ce * s;
        let f = 0;
        if (tall > 0.35 && w * cs * s > 0.35) f |= 1;
        if (tall > 0.35 && w * sn * s > 0.35) f |= 2;
        faces[i] = f;

        const L = lv[i] * 3;
        let r = col[L];
        let g = col[L + 1];
        let bl = col[L + 2];
        // Dia fora do período em foco, ou fora do nível isolado na legenda: afunda no vazio.
        const d = Math.max(dim[i] * 0.72, fade[i] * 0.58);
        if (d > 0.002) {
          r += (ex - r) * d;
          g += (ey - g) * d;
          bl += (ez - bl) * d;
        }
        // Antes do primeiro registro: não é zero, é ausência. Fica mais apagado que o vazio.
        if (before[i]) {
          r += (bg[0] - r) * 0.6;
          g += (bg[1] - g) * 0.6;
          bl += (bg[2] - bl) * 0.6;
        }
        const hv = hover[i];
        if (hv > 0.002) {
          // Destaque do dia sob o cursor ou o foco: tinta sobre a escada de azuis.
          r += (accent[0] - r) * hv;
          g += (accent[1] - g) * hv;
          bl += (accent[2] - bl) * hv;
        }
        if (f & 1) {
          ctx.beginPath();
          quadPath(ctx, polys, o + 8, 0);
          ctx.fillStyle = rgbString(r * 0.84, g * 0.84, bl * 0.84);
          ctx.fill();
        }
        if (f & 2) {
          ctx.beginPath();
          quadPath(ctx, polys, o + 16, 0);
          ctx.fillStyle = rgbString(r * 0.68, g * 0.68, bl * 0.68);
          ctx.fill();
        }
        ctx.beginPath();
        quadPath(ctx, polys, o, radius);
        ctx.fillStyle = rgbString(r, g, bl);
        ctx.fill();
        if (outline > 0.004) {
          ctx.strokeStyle = 'rgba(' + fg[0] + ',' + fg[1] + ',' + fg[2] + ',' + outline.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (hv > 0.02) {
          ctx.strokeStyle = 'rgba(' + accent[0] + ',' + accent[1] + ',' + accent[2] + ',' + (0.85 * hv).toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        if (cal) {
          // Hoje ganha um anel; cada dia leva o seu número, na cor que lê sobre o preenchimento.
          if (tod[i]) {
            ctx.beginPath();
            quadPath(ctx, polys, o, radius);
            ctx.strokeStyle = rgbString(accent[0], accent[1], accent[2]);
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
          const cellPx = w * s;
          if (cellPx >= 18) {
            const size = Math.min(16, Math.max(11, cellPx * 0.3));
            const tx = (polys[o] + polys[o + 2] + polys[o + 4] + polys[o + 6]) / 4;
            const ty = (polys[o + 1] + polys[o + 3] + polys[o + 5] + polys[o + 7]) / 4;
            const lum = (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255;
            ctx.font = (tod[i] ? '700 ' : '500 ') + size.toFixed(1) + 'px ' + fam;
            ctx.fillStyle = before[i]
              ? 'rgba(' + muted[0] + ',' + muted[1] + ',' + muted[2] + ',0.85)'
              : lum > 0.6 ? rgbString(fg[0], fg[1], fg[2]) : rgbString(bg[0], bg[1], bg[2]);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(dnum[i]), tx, ty);
          }
        }
      }

      // Rótulos: no alto e à esquerda no mapa, pela borda da frente no 3D. Esmaecem, não pulam.
      ctx.font = font;
      const a2 = 1 - smoothstep(0, 0.4, e);
      const a3 = smoothstep(0.62, 1, e);
      const labelFill = (a: number) => 'rgba(' + Math.round(muted[0]) + ',' + Math.round(muted[1]) + ',' + Math.round(muted[2]) + ',' + a.toFixed(3) + ')';
      if (a2 > 0.004 && cal) {
        ctx.fillStyle = labelFill(a2);
        ctx.font = '500 12px ' + fam;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (let k = 0; k < colLabels.length; k++) ctx.fillText(colLabels[k], px(k + 0.5, -0.12), py(k + 0.5, -0.12, 0) - 3);
        ctx.font = font;
      } else if (a2 > 0.004) {
        ctx.fillStyle = labelFill(a2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        let edge = -Infinity;
        for (const m of months) {
          const x = px(m.week + off, -0.3);
          const tw = ctx.measureText(m.label).width;
          if (x < edge || x + tw > W) continue;
          ctx.fillText(m.label, x, py(m.week + off, -0.3, 0) - 3);
          edge = x + tw + 6;
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        if (gutter > 0) for (const r of weekdayRows) ctx.fillText(r.label, px(0, r.day + 0.5) - 6, py(0, r.day + 0.5, 0));
      }
      if (a3 > 0.004 && cal) {
        ctx.fillStyle = labelFill(a3);
        ctx.font = '500 12px ' + fam;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let k = 0; k < colLabels.length; k++) ctx.fillText(colLabels[k], px(k + 0.5, rowsN + 0.35), py(k + 0.5, rowsN + 0.35, 0) + 2);
        ctx.font = font;
      } else if (a3 > 0.004) {
        ctx.fillStyle = labelFill(a3);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        let edge = -Infinity;
        for (const m of months) {
          const x = px(m.week + 0.5, 7.3);
          if (x < edge || x + ctx.measureText(m.label).width > W) continue;
          ctx.fillText(m.label, x, py(m.week + 0.5, 7.3, 0) + 2);
          edge = x + ctx.measureText(m.label).width + 10;
        }
      }

      // A dica acompanha a célula ativa durante a transição e o giro.
      if (activeIdx >= 0 && activeIdx < n) {
        const i = activeIdx;
        const z = zs[i] + hover[i] * lift;
        const tx = px(wk[i] + 0.5, dy[i] + 0.5);
        const ty = Math.min(py(wk[i] + off, dy[i] + off, z), py(wk[i] + off + w, dy[i] + off, z), py(wk[i] + off, dy[i] + off + w, z));
        const half = tipW / 2;
        const cx = Math.min(W - half - 2, Math.max(half + 2, tx));
        tip.style.transform = 'translate(' + (cx - half).toFixed(1) + 'px,' + (ty - 8).toFixed(1) + 'px) translateY(-100%)';
        tip.style.setProperty('--arrow', (tx - cx + half).toFixed(1) + 'px');
      }
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      let moving = false;

      if (t !== target) {
        const step = reduced ? 1 : (dt * 1000) / Math.max(1, cfg.current.duration);
        t = target > t ? Math.min(target, t + step) : Math.max(target, t - step);
        moving = true;
      }

      const ko = reduced ? 1 : 1 - Math.exp(-dt * 12);
      yaw += (yawGoal - yaw) * ko;
      elev += (elevGoal - elev) * ko;
      if (Math.abs(yawGoal - yaw) > 1e-4 || Math.abs(elevGoal - elev) > 1e-4) moving = true;
      else {
        yaw = yawGoal;
        elev = elevGoal;
      }

      const kc = reduced ? 1 : 1 - Math.exp(-dt * 7);
      for (let k = 0; k < 15; k++) {
        const d = colGoal[k] - col[k];
        if (Math.abs(d) > 0.4) {
          col[k] += d * kc;
          moving = true;
        } else col[k] = colGoal[k];
      }

      const kh = reduced ? 1 : 1 - Math.exp(-dt * 16);
      const kd = reduced ? 1 : 1 - Math.exp(-dt * 10);
      const leg = cfg.current.legendLevel;
      for (let i = 0; i < n; i++) {
        const hg = i === activeIdx ? 1 : 0;
        const dg = leg >= 0 && lv[i] !== leg ? 1 : 0;
        const h = hover[i];
        const d = dim[i];
        const fd = fade[i];
        if (h !== hg) {
          hover[i] = Math.abs(hg - h) < 0.003 ? hg : h + (hg - h) * kh;
          moving = true;
        }
        if (d !== dg) {
          dim[i] = Math.abs(dg - d) < 0.003 ? dg : d + (dg - d) * kd;
          moving = true;
        }
        if (fd !== fadeGoal[i]) {
          fade[i] = Math.abs(fadeGoal[i] - fd) < 0.003 ? fadeGoal[i] : fd + (fadeGoal[i] - fd) * kd;
          moving = true;
        }
      }

      draw();
      if (moving) raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    // O dia ativo é o sob o cursor ou, na falta dele, o fixado (toque, clique ou teclado).
    const refreshActive = () => {
      const next = hovered >= 0 ? hovered : pinned;
      if (next === activeIdx) return;
      activeIdx = next;
      cfg.current.setActive(next);
      kick();
    };

    const hit = (x: number, y: number): number => {
      for (let k = n - 1; k >= 0; k--) {
        const i = order[k];
        const o = i * 24;
        if (pointInQuad(polys, o, x, y)) return i;
        if (faces[i] & 1 && pointInQuad(polys, o + 8, x, y)) return i;
        if (faces[i] & 2 && pointInQuad(polys, o + 16, x, y)) return i;
      }
      return -1;
    };

    const local = (ev: PointerEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top] as const;
    };

    let drag: { id: number; x: number; y: number; yaw: number; elev: number; moved: boolean; orbit: boolean; mouse: boolean } | null = null;

    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const can = cfg.current.orbit && target === 1;
      drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, yaw: yawGoal, elev: elevGoal, moved: false, orbit: can, mouse: ev.pointerType === 'mouse' };
      if (can) {
        try {
          canvas.setPointerCapture(ev.pointerId);
        } catch {
          /* a captura é um mimo */
        }
      }
    };

    const onMove = (ev: PointerEvent) => {
      if (drag && drag.orbit && ev.pointerId === drag.id) {
        const dx = ev.clientX - drag.x;
        const dyy = ev.clientY - drag.y;
        if (drag.moved || Math.hypot(dx, dyy) > 4) {
          drag.moved = true;
          yawGoal = Math.min(YAW_RANGE[1] - YAW_3D, Math.max(YAW_RANGE[0] - YAW_3D, drag.yaw + dx * 0.006));
          if (drag.mouse) elevGoal = Math.min(ELEV_RANGE[1] - ELEV_3D, Math.max(ELEV_RANGE[0] - ELEV_3D, drag.elev + dyy * 0.004));
          canvas.style.cursor = 'grabbing';
          hovered = -1;
          refreshActive();
          kick();
          return;
        }
      }
      if (ev.pointerType !== 'mouse') return;
      const [x, y] = local(ev);
      const i = hit(x, y);
      if (i !== hovered) {
        hovered = i;
        refreshActive();
      }
      canvas.style.cursor = cfg.current.orbit && target === 1 ? 'grab' : i >= 0 ? 'pointer' : 'default';
    };

    const onUp = (ev: PointerEvent) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const wasMoved = drag.moved;
      drag = null;
      if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
      canvas.style.cursor = cfg.current.orbit && target === 1 ? 'grab' : 'default';
      if (wasMoved) return;
      const [x, y] = local(ev);
      const i = hit(x, y);
      pinned = i === pinned ? -1 : i;
      if (ev.pointerType !== 'mouse') hovered = -1;
      refreshActive();
    };

    const onCancel = () => {
      drag = null;
    };

    const onLeave = () => {
      if (drag) return;
      hovered = -1;
      refreshActive();
    };

    const onDbl = () => {
      yawGoal = 0;
      elevGoal = 0;
      kick();
    };

    const onKey = (ev: KeyboardEvent) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'];
      if (!keys.includes(ev.key) || !n) return;
      ev.preventDefault();
      if (ev.key === 'Escape') {
        pinned = -1;
        hovered = -1;
        refreshActive();
        return;
      }
      let i = pinned >= 0 ? pinned : activeIdx >= 0 ? activeIdx : n - 1;
      if (pinned >= 0 || activeIdx >= 0) {
        // No calendário do mês, esquerda/direita andam um dia e cima/baixo uma semana.
        const stepX = cal ? 1 : 7;
        const stepY = cal ? 7 : 1;
        if (ev.key === 'ArrowLeft') i -= stepX;
        if (ev.key === 'ArrowRight') i += stepX;
        if (ev.key === 'ArrowUp') i -= stepY;
        if (ev.key === 'ArrowDown') i += stepY;
        if (ev.key === 'Home') i = 0;
        if (ev.key === 'End') i = n - 1;
      }
      i = Math.max(0, Math.min(n - 1, i));
      pinned = i;
      hovered = -1;
      refreshActive();
      cfg.current.setAnnounce(cfg.current.describe(i));
    };

    const onBlur = () => {
      pinned = -1;
      refreshActive();
    };

    const setTarget = () => {
      const goal = cfg.current.target;
      if (!entered) return;
      if (goal !== target) {
        target = goal;
        if (goal === 0) {
          yawGoal = 0;
          elevGoal = 0;
        }
        canvas.style.cursor = cfg.current.orbit && target === 1 ? 'grab' : 'default';
        kick();
      }
    };

    load();
    retheme();
    relayout();
    // A Inter pode chegar depois do primeiro desenho: os rótulos do canvas se refazem com ela.
    document.fonts?.ready.then(() => {
      if (!alive) return;
      retheme();
      relayout();
    });

    // O skyline sobe do mapa na primeira vez em que aparece.
    const enter = () => {
      if (entered) return;
      entered = true;
      if (reduced) t = cfg.current.target;
      setTarget();
    };
    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) {
            enter();
            io?.disconnect();
          }
        },
        { threshold: 0.35 },
      );
      io.observe(stage);
    } else enter();

    const ro = new ResizeObserver(() => {
      if (Math.round(stage.clientWidth) !== W) relayout();
    });
    ro.observe(stage);

    const onReduce = () => {
      reduced = reduceMq.matches;
      kick();
    };
    reduceMq.addEventListener('change', onReduce);

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('dblclick', onDbl);
    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('blur', onBlur);

    engine.current = {
      kick: () => {
        setTarget();
        kick();
      },
      load: () => {
        load();
        retheme();
        relayout();
      },
      retheme,
      tipWidth: (w: number) => {
        tipW = w;
        draw();
      },
    };

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      ro.disconnect();
      reduceMq.removeEventListener('change', onReduce);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('dblclick', onDbl);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('blur', onBlur);
      engine.current = null;
    };
    // O laço lê todo o resto por cfg; é montado uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  React.useEffect(() => {
    engine.current?.kick();
  }, [view, legendLevel]);

  React.useEffect(() => {
    engine.current?.load();
  }, [model, heightScale, maxHeight]);

  // A largura da dica entra no cálculo que a mantém dentro do cartão; mede-se quando o texto muda.
  React.useLayoutEffect(() => {
    const tip = tipRef.current;
    if (tip && active >= 0) engine.current?.tipWidth(tip.offsetWidth);
  }, [active, model]);

  const is3d = view === '3d';
  const corners = stats.length === 4 && width >= 720;
  const showRow = stats.length > 0 && !(is3d && corners);
  const cell = active >= 0 ? model.cells[active] : null;
  const withCount = React.useMemo(() => model.cells.filter((c) => c.count > 0).slice().reverse(), [model]);
  const hints = ['Passe o cursor sobre um dia · setas do teclado para explorar', 'Arraste para girar · clique duplo para restaurar'];
  const hint = hints[is3d && orbit ? 1 : 0];
  const delay = (share: number) => (is3d ? Math.round(duration * share) + 'ms' : '0ms');

  return (
    <figure ref={rootRef as React.RefObject<HTMLElement>} className={('chart skyline ' + className).trim()} role="group" aria-label={title}>
      <figcaption className="sr-only">{title}</figcaption>

      {summary || showToggle ? (
        <div className="skyline__head">
          {summary ? (
            <p className="chart__summary">
              <strong className="num">{summary.value}</strong>
              <span>{summary.label}</span>
            </p>
          ) : (
            <span />
          )}
          {showToggle ? (
            <Tabs
              variant="segment"
              ariaLabel="Visualização do gráfico"
              value={view}
              onChange={(v: View) => setView(v)}
              items={[
                { value: '2d', label: 'Mapa' },
                { value: '3d', label: 'Skyline' },
              ]}
            />
          ) : null}
        </div>
      ) : null}

      <div className="skyline__scene">
        <div ref={stageRef} className="skyline__stage">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="img"
            aria-label={title + '. Use as setas do teclado para ler cada dia.'}
            className={'skyline__canvas' + (is3d && orbit ? ' is-orbit' : '')}
          />

          {corners ? (
            <>
              <div
                aria-hidden={!is3d}
                className={'skyline__corner skyline__corner--tr' + (is3d ? ' is-on' : '')}
                style={{ transitionDelay: delay(0.55) }}
              >
                <Stat {...stats[0]} />
                <Stat {...stats[1]} />
              </div>
              <div
                aria-hidden={!is3d}
                className={'skyline__corner skyline__corner--bl' + (is3d ? ' is-on' : '')}
                style={{ transitionDelay: delay(0.65) }}
              >
                <Stat {...stats[2]} />
                <Stat {...stats[3]} />
              </div>
            </>
          ) : null}
        </div>

        <div ref={tipRef} role="tooltip" aria-hidden={active < 0} className={'skyline__tip' + (active >= 0 ? ' is-on' : '')}>
          {cell ? (
            <>
              <span className="skyline__tip-date">
                {dfs.format(dayMs(cell.date))}
                {cell.date === toKey(endKey) ? ' · hoje, em curso' : ''}
              </span>
              <strong className="num">
                {cell.future ? 'Ainda não aconteceu' : cell.before ? 'Sem registro' : cell.count ? nf.format(cell.count) + ' ' + noun(cell.count) : 'Sem ' + plural}
                {cell.note ? ' · ' + cell.note : ''}
              </strong>
            </>
          ) : (
            ' '
          )}
          <span aria-hidden="true" className="skyline__tip-arrow" />
        </div>
      </div>

      {stats.length ? (
        <div className={'skyline__stats' + (showRow ? ' is-open' : '')} aria-hidden={!showRow} style={{ transitionDuration: duration + 'ms' }}>
          <div className="skyline__stats-clip">
            <div className="skyline__stats-grid">
              {stats.map((s) => (
                <Stat key={s.label} {...s} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="skyline__foot">
        <span className="skyline__hint">
          {hints.map((h) => (
            <span key={h} aria-hidden={h !== hint} style={{ opacity: h === hint ? 1 : 0 }}>
              {h}
            </span>
          ))}
        </span>
        {showLegend ? (
          <div className="skyline__legend" onMouseLeave={() => setLegendLevel(-1)}>
            {month ? (
              <span className="skyline__keys" aria-hidden="true">
                <span className="skyline__key"><i className="skyline__key-today" />Hoje</span>
                <span className="skyline__key"><i className="skyline__key-future" />Ainda não aconteceu</span>
              </span>
            ) : null}
            <span>Menos</span>
            {LEVEL_NAMES.map((name, i) => (
              <button
                key={name}
                type="button"
                aria-label={'Destacar ' + name.toLowerCase()}
                aria-pressed={legendLevel === i}
                title={name}
                onMouseEnter={() => setLegendLevel(i)}
                onFocus={() => setLegendLevel(i)}
                onBlur={() => setLegendLevel(-1)}
                onClick={() => setLegendLevel((l) => (l === i ? -1 : i))}
                className={'skyline__swatch skyline__swatch--' + i}
              />
            ))}
            <span>Mais</span>
          </div>
        ) : null}
      </div>

      {note ? <p className="chart__note">{note}</p> : null}

      {withCount.length ? (
        <>
          <button
            type="button"
            className="chart__data-toggle"
            aria-expanded={showData}
            aria-controls={`${dataId}-data`}
            onClick={() => setShowData((v) => !v)}
          >
            {showData ? 'Ocultar dados' : 'Ver dados'}
          </button>
          {showData ? (
            <div className="skyline__data" id={`${dataId}-data`} tabIndex={0} role="region" aria-label="Dias com atendimento">
              <table className="chart-data-table">
                <caption className="sr-only">Dias com atendimento concluído; os demais dias da janela não têm atendimento ou não têm registro.</caption>
                <thead>
                  <tr>
                    <th scope="col">Dia</th>
                    <th scope="col" className="num">Atendimentos concluídos</th>
                  </tr>
                </thead>
                <tbody>
                  {withCount.map((c) => (
                    <tr key={c.date}>
                      <th scope="row">{dfs.format(dayMs(c.date))}</th>
                      <td className="num">
                        {nf.format(c.count)}
                        {c.note ? ' · ' + c.note : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </figure>
  );
}
