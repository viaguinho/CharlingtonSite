import { useMemo, useState } from 'react';
import { Tabs } from '../components/Tabs.jsx';
import { DotNumber } from '../components/DotNumber.jsx';
import { largestRemainder } from './index.jsx';

/**
 * Régua de tiques — a divisão de um total em situações, no vocabulário das
 * referências (régua do Superpower e do Veri, medidores de tiques do Clerio).
 * Substitui a rosca pontilhada do hero da Visão geral (decisão de 14/10).
 *
 * Uma régua de TICKS tiques é repartida entre as fatias pelo maior resto,
 * com um tique vazio entre fatias vizinhas: a fronteira é posição e vão, não
 * só cor. Toda fatia com valor ganha ao menos um tique, mesmo que o resto
 * arredonde para zero — "3 faltas" nunca some da régua.
 *
 * Mesma API da rosca: `periods=[{ key, label, caption, slices: [{ key, label,
 * value, color: '--token' }] }]`. As fatias têm a mesma ordem em todo
 * período; trocar de período recolore os tiques numa onda da esquerda para
 * a direita. Passar o cursor (ou o foco) numa linha da lista ergue os tiques
 * daquela situação e apaga os outros; o número grande passa a ser o dela.
 */

const TICKS = 72;

function allocate(values) {
  const nonEmpty = values.filter((v) => v > 0).length;
  if (!nonEmpty) return values.map(() => 0);
  const room = TICKS - (nonEmpty - 1);
  // largestRemainder devolve percentuais que somam 100; aqui a "escala" é a régua.
  const shares = largestRemainder(values, 2).map((p) => (p / 100) * room);
  const counts = shares.map((s) => Math.floor(s));
  let rest = room - counts.reduce((a, b) => a + b, 0);
  shares.map((s, i) => [s - counts[i], i]).sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (rest > 0) { counts[i] += 1; rest -= 1; } });
  // Nenhuma fatia com valor fica sem tique: tira-se da maior.
  values.forEach((v, i) => {
    if (v > 0 && counts[i] === 0) {
      const big = counts.indexOf(Math.max(...counts));
      counts[big] -= 1;
      counts[i] = 1;
    }
  });
  return counts;
}

export default function TickRuler({
  periods = [],
  defaultPeriod,
  activePeriod,
  onPeriodChange,
  title = 'Situação',
  unit = 'item',
  unitPlural,
  className = '',
}) {
  const [internalPeriodKey, setInternalPeriodKey] = useState(defaultPeriod ?? periods[0]?.key);
  const periodKey = activePeriod ?? internalPeriodKey;
  const setPeriodKey = (k) => {
    setInternalPeriodKey(k);
    onPeriodChange?.(k);
  };
  const [hover, setHover] = useState(null);
  const period = periods.find((p) => p.key === periodKey) ?? periods[0];
  const slices = period?.slices ?? [];
  const values = slices.map((s) => Math.max(0, Number(s.value) || 0));
  const total = values.reduce((a, b) => a + b, 0);
  const plural = unitPlural ?? `${unit}s`;
  const pct = largestRemainder(values, 0);

  // Cada tique sabe a que fatia pertence (ou é vão). A ordem dos tiques é
  // fixa, então a troca de período só muda a cor de cada posição.
  const ticks = useMemo(() => {
    const counts = allocate(values);
    const out = [];
    counts.forEach((n, i) => {
      if (!n) return;
      if (out.length) out.push(-1);
      for (let k = 0; k < n; k += 1) out.push(i);
    });
    while (out.length < TICKS) out.push(-1);
    return out.slice(0, TICKS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.join('|')]);

  if (!period) return null;

  const hot = hover != null && values[hover] > 0 ? hover : null;
  const shown = hot != null ? values[hot] : total;
  const noun = (n) => (n === 1 ? unit : plural);

  return (
    <figure className={`chart tick-ruler ${hot != null ? 'is-focused' : ''} ${className}`.trim()} role="group" aria-label={title}>
      <div className="tick-ruler__head">
        <div className="tick-ruler__title">
          <strong>{title}</strong>
          {period.caption ? <span>{period.caption}</span> : null}
        </div>
        {periods.length > 1 ? (
          <Tabs
            variant="segment"
            ariaLabel="Período do gráfico"
            value={periodKey}
            onChange={(v) => { setHover(null); setPeriodKey(v); }}
            items={periods.map((p) => ({ value: p.key, label: p.label }))}
          />
        ) : null}
      </div>

      <div className="tick-ruler__total" aria-live="polite">
        <span className="tick-ruler__number">
          {total ? <DotNumber key={`${period.key}-${hot ?? 'all'}`} value={shown} /> : <span className="tick-ruler__zero">0</span>}
        </span>
        <span className="tick-ruler__caption">
          {hot != null
            ? <><i style={{ background: `var(${slices[hot].color})` }} aria-hidden="true" />{slices[hot].label} · {pct[hot]}% de {total} {noun(total)}</>
            : total ? noun(total) : `sem ${plural} no período`}
        </span>
      </div>

      <div className="tick-ruler__scale" aria-hidden="true" style={{ '--ticks': TICKS }}>
        {ticks.map((owner, i) => (
          <span
            key={i}
            className={`tick-ruler__tick ${owner < 0 ? 'is-gap' : ''} ${hot != null && owner === hot ? 'is-hot' : ''}`}
            style={{
              '--i': i,
              '--c': owner >= 0 ? `var(${slices[owner].color})` : undefined,
            }}
          />
        ))}
      </div>
      <div className="tick-ruler__ends" aria-hidden="true">
        <span>0</span>
        <span>{total} {noun(total)}</span>
      </div>

      <ul className="tick-ruler__list" aria-label={`${title} · ${period.caption ?? period.label}`}>
        {slices.map((s, i) => (
          <li
            key={s.key}
            tabIndex={0}
            className={`tick-ruler__row ${hot === i ? 'is-hot' : ''} ${values[i] ? '' : 'is-empty'}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <i className="tick-ruler__dot" style={{ background: `var(${s.color})` }} aria-hidden="true" />
            <span className="tick-ruler__label">{s.label}</span>
            <span className="tick-ruler__value num">{values[i].toLocaleString('pt-BR')}</span>
            <span className="tick-ruler__pct num">{total ? `${pct[i]}%` : '—'}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
