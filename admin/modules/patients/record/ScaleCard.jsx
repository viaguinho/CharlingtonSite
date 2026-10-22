import { findScale, interpretScore } from '../../../data/scales.js';
import Icon from '../../../components/Icon.jsx';
import { date, relative } from '../../../core/format.js';

/**
 * Card de instrumento — o "biomarcador" da referência, com dado de escala.
 *
 * Traço de risco antes do título (cor = faixa real da última aplicação),
 * escore em número fino com o máximo pequeno e cinza, seta contra a aplicação
 * anterior e o gráfico de pontos: cada aplicação no tempo, a faixa atual
 * tingida, o corte de risco alto como linha fina e o último ponto com anel.
 */

const TONE = { success: 'low', warning: 'mid', danger: 'high' };
// Risco gravado na aplicação (ScalesView: 'baixo' | 'moderado' | 'alto').
const RISK_TONE = { baixo: 'low', moderado: 'mid', alto: 'high' };

/**
 * Interpretação e tom vêm do que foi GRAVADO na aplicação (`interpretacao` e
 * `risco`): se o catálogo mudar de corte, o card continua dizendo o que foi
 * registrado. O catálogo só entra para registros antigos sem esses campos.
 */
function recorded(instrumentId, application) {
  const fallback = interpretScore(instrumentId, application.escore);
  const label = application.interpretacao || fallback?.label || null;
  const tone = RISK_TONE[application.risco] ?? TONE[fallback?.tone] ?? 'none';
  return { label, tone };
}

export function ScaleCard({ instrumentId, applications, onOpen }) {
  const scale = findScale(instrumentId);
  if (!scale || !applications.length) return null;

  const latest = applications[applications.length - 1];
  const previous = applications.length > 1 ? applications[applications.length - 2] : null;
  const { label, tone } = recorded(instrumentId, latest);
  const delta = previous ? Number(latest.escore) - Number(previous.escore) : null;
  const trend = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const [whole, fraction] = String(latest.escore).split(/[.,]/);
  const single = applications.length === 1;
  const noteText = label ?? 'Sem faixa de interpretação';

  return (
    <button type="button" className={`pr-scale pr-scale--${tone}`} onClick={onOpen}>
      <span className="pr-scale__title">
        <span className="pr-scale__tick" aria-hidden="true" />
        {scale.nome}
      </span>

      <span className="pr-scale__value">
        <span className="pr-scale__number num">
          {whole}{fraction ? <span className="pr-scale__fraction">,{fraction}</span> : null}
        </span>
        {/* O máximo gravado na aplicação manda: é o que o instrumento valia nela. */}
        <span className="pr-scale__unit num">/{latest.escoreMaximo ?? scale.escoreMax}</span>
        {trend ? (
          <span className={`pr-scale__trend ${trend === 'down' ? 'is-down' : ''}`.trim()} aria-label={trend === 'flat' ? 'Igual à aplicação anterior' : trend === 'up' ? 'Subiu desde a aplicação anterior' : 'Desceu desde a aplicação anterior'}>
            <Icon name={trend === 'flat' ? 'arrow-right' : 'arrow-up-right'} size={16} />
          </span>
        ) : null}
      </span>

      {/* Variação e data na mesma linha: o rodapé fica só com a interpretação. */}
      <span className="pr-scale__meta">
        {delta ? (
          <span className="pr-scale__delta num">{delta > 0 ? '+' : '−'}{Math.abs(delta)} {Math.abs(delta) === 1 ? 'ponto' : 'pontos'}</span>
        ) : null}
        <span>{relative(latest.aplicadaEm)}{single ? ' · 1 aplicação' : ''}</span>
      </span>

      <DotPlot scale={scale} applications={applications} />

      <span className="pr-scale__note">
        <span className="pr-scale__band">{noteText}</span>
      </span>
    </button>
  );
}

/**
 * Gráfico de pontos no padrão do biomarcador. O eixo vertical é linear e
 * cobre a faixa de referência e os escores (com folga, dentro da escala do
 * instrumento), então a faixa "esperada" do catálogo tem a altura do seu
 * intervalo real, nunca a área toda. A linha-limite de 1 px marca a borda interna da faixa e é
 * sempre desenhada. Com uma aplicação só, o anel fica sobre uma linha fina
 * no nível do escore. O x vai em porcentagem, o y em pixels.
 */
const PLOT_H = 64;
const PLOT_PAD = 8;

function DotPlot({ scale, applications }) {
  const H = PLOT_H;
  const smin = Number(scale.escoreMin ?? 0);
  const smax = Math.max(latestMax(applications, scale), ...applications.map((a) => Number(a.escore)));
  const scores = applications.map((a) => Number(a.escore));

  // Faixa de referência: o intervalo "esperado" (tom de sucesso) do catálogo.
  const sorted = [...(scale.bands ?? [])].sort((a, b) => a.from - b.from);
  const refIdx = sorted.findIndex((b) => b.tone === 'success');
  const ref = refIdx >= 0 ? { lo: sorted[refIdx].from, hi: sorted[refIdx + 1]?.from ?? smax } : null;

  // Janela vertical: da faixa e dos escores reais, com folga, dentro da escala.
  // Um eixo linear só: a faixa mede exatamente o seu intervalo nele.
  const lo0 = Math.min(...scores, ref ? ref.lo : smin);
  const hi0 = Math.max(...scores, ref ? ref.hi : smax);
  const pad = Math.max(1, (hi0 - lo0) * 0.18);
  const wLo = Math.max(smin, lo0 - pad);
  const wHi = Math.min(smax, hi0 + pad);
  const span = wHi - wLo || 1;
  const y = (v) => PLOT_PAD + (1 - (Math.min(wHi, Math.max(wLo, Number(v))) - wLo) / span) * (H - PLOT_PAD * 2);
  const bandTop = ref ? y(ref.hi) : null;
  const bandBottom = ref ? y(ref.lo) : null;
  // A borda da faixa que fica dentro da escala (a outra encosta no mínimo ou no máximo).
  const limitAt = ref ? (ref.hi < smax ? ref.hi : ref.lo > smin ? ref.lo : null) : null;

  const single = applications.length === 1;
  const times = applications.map((a) => new Date(a.aplicadaEm).getTime()).filter(Number.isFinite);
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (a, i) => {
    if (single) return 86;
    const t = new Date(a.aplicadaEm).getTime();
    const frac = t1 > t0 ? (t - t0) / (t1 - t0) : i / (applications.length - 1);
    return 8 + frac * 78;
  };

  return (
    <svg className="pr-dots" height={H} role="img"
      aria-label={`Escores de ${scale.nome}: ${applications.map((a) => `${a.escore} em ${date(a.aplicadaEm)}`).join('; ')}`}>
      {ref ? (
        <rect className="pr-dots__band" x="0" width="100%" y={bandTop} height={Math.max(1, bandBottom - bandTop)} rx="3" />
      ) : null}
      {limitAt != null ? (
        <line className="pr-dots__limit" x1="0" x2="100%" y1={y(limitAt)} y2={y(limitAt)} />
      ) : null}
      {single ? (
        <line className="pr-dots__guide" x1="0" x2="100%" y1={y(applications[0].escore)} y2={y(applications[0].escore)} />
      ) : null}
      {applications.map((a, i) => {
        const last = i === applications.length - 1;
        const high = recorded(scale.id, a).tone === 'high';
        const cx = `${x(a, i)}%`;
        const cy = y(a.escore);
        return (
          <g key={a.id ?? i}>
            {last ? <circle className="pr-dots__ring" cx={cx} cy={cy} r="6" /> : null}
            <circle className={`pr-dots__dot ${high ? 'is-high' : ''} ${last ? 'is-last' : ''}`.trim()} cx={cx} cy={cy} r="3" />
          </g>
        );
      })}
    </svg>
  );
}

function latestMax(applications, scale) {
  const last = applications[applications.length - 1];
  return Number(last?.escoreMaximo ?? scale.escoreMax ?? 1);
}
