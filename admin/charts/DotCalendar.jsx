import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Calendário de pontos — 12 meses, dia a dia, como a linha do tempo
 * pontilhada do Superpower e do Luma. Substitui o Contribution Skyline dos
 * Relatórios (decisão de 14/10) com os mesmos dados e as mesmas regras:
 *
 *  - colunas são semanas, linhas são dias da semana; a janela é a mesma de
 *    `skylineWindow` (os números "do gráfico" usam esse recorte);
 *  - quatro níveis por quartos do dia cheio (percentil 95), para um dia
 *    atípico não achatar todos os outros;
 *  - antes do primeiro registro da base, o dia é "sem registro" (anel vazio),
 *    não zero;
 *  - fora do período em foco, os pontos esmaecem.
 *
 * O nível vira tamanho E tom (rampa de um matiz só, verde dos concluídos):
 * a leitura não depende só da cor. O cursor (ou o foco do teclado na grade)
 * mostra a pílula com a data e a contagem.
 */

const DAY_MS = 86400000;
const toKey = (ms) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (v) => {
  if (typeof v === 'number') return Math.floor(v / DAY_MS) * DAY_MS;
  if (typeof v === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    v = new Date(v);
  }
  return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
};

/** A janela exibida: termina em `end` e começa no início da semana do dia 364 dias antes. */
export const skylineWindow = (end, weekStart = 0) => {
  const endMs = dayMs(end);
  let start = endMs - 364 * DAY_MS;
  start -= ((new Date(start).getUTCDay() - weekStart + 7) % 7) * DAY_MS;
  return { from: toKey(start), to: toKey(endMs) };
};

const levelOf = (count, busy) => (count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4)));

function buildGrid(data, endMs, weekStart, dataFrom, focus) {
  const counts = new Map();
  const notes = new Map();
  for (const d of data) {
    if (!d || typeof d.date !== 'string') continue;
    const k = toKey(dayMs(d.date));
    if (d.note) notes.set(k, d.note);
    const c = Number(d.count);
    if (c > 0 && Number.isFinite(c)) counts.set(k, (counts.get(k) ?? 0) + c);
  }
  const start = dayMs(skylineWindow(endMs, weekStart).from);
  const cells = [];
  for (let ms = start, i = 0; ms <= endMs; ms += DAY_MS, i += 1) {
    const date = toKey(ms);
    cells.push({
      date,
      count: counts.get(date) ?? 0,
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
  return { cells, weeks: cells.length ? cells[cells.length - 1].week + 1 : 0 };
}

const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const LONG = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export default function DotCalendar({
  data = [], endDate, dataFrom = null, focus = null, summary, stats = [], note,
  title = 'Atendimentos concluídos por dia', unit = 'atendimento', unitPlural = 'atendimentos', weekStart = 0,
}) {
  const endMs = dayMs(endDate ?? new Date());
  const { cells, weeks } = useMemo(
    () => buildGrid(data, endMs, weekStart, dataFrom, focus),
    [data, endMs, weekStart, dataFrom, focus?.from, focus?.to], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [hot, setHot] = useState(null);
  const [showData, setShowData] = useState(false);
  const scrollRef = useRef(null);

  // No celular a grade rola: começa mostrando o fim (hoje), não janeiro.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  const months = useMemo(() => {
    const out = [];
    let prev = -1;
    for (let w = 0; w < weeks; w += 1) {
      const c = cells[w * 7];
      if (!c) break;
      const m = +c.date.slice(5, 7);
      if (m !== prev) out.push({ week: w, label: MONTH.format(dayMs(c.date)).replace('.', '') });
      prev = m;
    }
    if (out.length > 1 && out[1].week - out[0].week < 3) out.shift();
    return out;
  }, [cells, weeks]);

  const byMonth = useMemo(() => {
    const map = new Map();
    for (const c of cells) {
      if (c.before) continue;
      const k = c.date.slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + c.count);
    }
    return [...map.entries()].map(([k, v]) => ({
      label: MONTH.format(dayMs(`${k}-01`)).replace('.', '') + ` ${k.slice(0, 4)}`,
      value: v,
    }));
  }, [cells]);

  const total = cells.reduce((t, c) => t + c.count, 0);
  const noun = (n) => (n === 1 ? unit : unitPlural);
  const cell = hot != null ? cells[hot] : null;

  return (
    <figure className="chart dotcal" role="group" aria-label={title}>
      <figcaption className="sr-only">
        {title}: {total} {noun(total)} entre {cells[0]?.date} e {cells[cells.length - 1]?.date}.
      </figcaption>

      {(summary || stats.length) ? (
        <div className="dotcal__head">
          {summary ? (
            <p className="chart__summary dotcal__summary">
              <strong className="num">{summary.value}</strong>
              <span>{summary.label}</span>
            </p>
          ) : null}
          {stats.length ? (
            <dl className="dotcal__stats">
              {stats.map((s) => (
                <div key={s.label} className="dotcal__stat">
                  <dt>{s.label}</dt>
                  <dd>
                    <strong className="num">{s.value}</strong>
                    {s.unit ? <span> {s.unit}</span> : null}
                  </dd>
                  {s.sub ? <dd className="dotcal__stat-sub">{s.sub}</dd> : null}
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}

      <div className="dotcal__scroll" ref={scrollRef}>
        <div className="dotcal__frame" style={{ '--weeks': weeks }}>
          <div className="dotcal__months" aria-hidden="true">
            {months.map((m) => (
              <span key={`${m.week}-${m.label}`} style={{ gridColumn: `${m.week + 1} / span 4` }}>{m.label}</span>
            ))}
          </div>
          <div className="dotcal__weekdays" aria-hidden="true">
            {WEEKDAYS.map((d, i) => <span key={d} style={{ gridRow: ((i - weekStart + 7) % 7) + 1 }}>{i % 2 ? d : ''}</span>)}
          </div>
          <div
            className="dotcal__grid"
            role="img"
            aria-label={`Grade de ${weeks} semanas: cada ponto é um dia; maior e mais escuro, mais ${unitPlural}.`}
            onMouseLeave={() => setHot(null)}
          >
            {cells.map((c, i) => (
              <span
                key={c.date}
                className={`dotcal__cell lvl-${c.level} ${c.before ? 'is-before' : ''} ${c.inFocus ? '' : 'is-out'} ${hot === i ? 'is-hot' : ''}`}
                style={{ gridColumn: c.week + 1, gridRow: c.day + 1, '--w': c.week }}
                onMouseEnter={() => setHot(i)}
              >
                <i />
              </span>
            ))}
            {cell ? (
              <span
                className={`dotcal__tip ${cell.day < 3 ? 'is-below' : 'is-above'}`}
                style={{ '--tx': (cell.week + 0.5) / weeks, '--ty': cell.day }}
                role="status"
              >
                <strong className="num">{cell.before ? 'sem registro' : `${cell.count} ${noun(cell.count)}`}</strong>
                <span>{LONG.format(dayMs(cell.date))}</span>
                {cell.note ? <em>{cell.note}</em> : null}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="dotcal__foot">
        <span className="dotcal__legend" aria-hidden="true">
          <span className="dotcal__legend-cell is-before"><i /></span> sem registro
          <span className="dotcal__legend-sep" />
          menos
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`dotcal__legend-cell lvl-${l}`}><i /></span>)}
          mais
        </span>
        <button
          type="button"
          className="chart__data-toggle"
          aria-expanded={showData}
          onClick={() => setShowData((v) => !v)}
        >
          {showData ? 'Ocultar dados' : 'Ver dados'}
        </button>
      </div>
      {note ? <p className="chart__note">{note}</p> : null}
      {showData ? (
        <table className="chart-data-table">
          <caption className="sr-only">{title}, por mês</caption>
          <thead><tr><th scope="col">Mês</th><th scope="col" className="num">{unitPlural[0].toUpperCase() + unitPlural.slice(1)}</th></tr></thead>
          <tbody>
            {byMonth.map((m) => (
              <tr key={m.label}><th scope="row">{m.label}</th><td className="num">{m.value}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}
