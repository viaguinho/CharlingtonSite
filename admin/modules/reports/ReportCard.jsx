import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import LiquidLogo from '../../components/LiquidLogo.jsx';
import { Modal } from '../../components/Overlay.jsx';
import { Button } from '../../components/primitives.jsx';
import { number } from '../../core/format.js';
import { rangeShort } from '../../core/periods.js';
import { vtName } from '../../core/viewTransition.js';
import { rangeCaption } from './period.js';
import { RoundButton, Popover, Figure, MiniPills, Highlight, DataTable, tableCSV, downloadFile, rovingKeys } from './ui.jsx';

/**
 * Card dos Relatórios na anatomia da referência: título à esquerda, botões
 * redondos à direita (ajustes · balão "Como ler" · ↗ ampliar), número grande
 * com rótulo pequeno em cima e o gráfico embaixo.
 */

const plural = (n, one, many) => (n === 1 ? one : many);

/* ═══════════════════════════ Ferramentas do card ═══════════════════════════ */

/** Ajustes: visões do card (quando há) e ocultar. Escuro quando a visão não é a padrão. */
function CardMenu({ widget, view, onView, onHide, title }) {
  const anchor = useRef(null);
  const [open, setOpen] = useState(false);
  const changed = widget.views && view !== widget.defaultView;
  return (
    <span ref={anchor} className="rp-anchor">
      <RoundButton
        icon="sliders"
        label={`Ajustes de ${title}`}
        tone={changed || open ? 'ink' : 'chip'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      />
      <Popover open={open} anchorRef={anchor} onClose={() => setOpen(false)} label={`Ajustes de ${title}`} width={260}>
        <div className="rp-menu">
          {widget.views ? (
            <>
              <p className="rp-menu__label">Visão</p>
              <div className="rp-seg" role="radiogroup" aria-label="Visão do card" onKeyDown={(e) => rovingKeys(e, widget.views.map((v) => v.key), view, onView)}>
                {widget.views.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    role="radio"
                    aria-checked={view === v.key}
                    tabIndex={view === v.key ? 0 : -1}
                    className={`rp-seg__item ${view === v.key ? 'is-active' : ''}`}
                    onClick={() => onView(v.key)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <button type="button" className="rp-menu__item" onClick={() => { setOpen(false); onHide(); }}>
            <Icon name="eye-off" size={16} /> Ocultar card
          </button>
          <p className="rp-menu__hint">Para reordenar, arraste o card pelo título. Cards ocultos voltam pelo “Adicionar widget”.</p>
        </div>
      </Popover>
    </span>
  );
}

function HowToRead({ notes, title }) {
  const anchor = useRef(null);
  const [open, setOpen] = useState(false);
  if (!notes?.length) return null;
  // Em card estreito o balão sai (CSS): o "Como ler" continua no card ampliado.
  return (
    <span ref={anchor} className="rp-anchor rp-anchor--read">
      <RoundButton
        icon="message-circle"
        label={`Como ler: ${title}`}
        tone={open ? 'ink' : 'chip'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      />
      <Popover open={open} anchorRef={anchor} onClose={() => setOpen(false)} label={`Como ler: ${title}`} width={340}>
        <div className="rp-read">
          <p className="rp-read__title">Como ler</p>
          <ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      </Popover>
    </span>
  );
}

/* ═══════════════════════════════ Card padrão ═══════════════════════════════ */

export function ReportCard({ widget, m, view, onView, onHide, onExpand, query, index = 0, drag }) {
  const navigate = useNavigate();
  const empty = widget.empty?.(m);
  const head = widget.head?.(m, view);
  const notes = widget.notes?.(m, view) ?? [];
  const side = widget.side?.(m, view) ?? [];
  const stats = widget.stats?.(m, view);
  const action = widget.action?.(m);
  const titleId = `rp-card-${widget.id}`;
  const split = side.length > 0 && widget.span >= 5;

  return (
    <section
      className={`rp-card ${drag?.over ? 'is-drop' : ''} ${drag?.dragging ? 'is-dragging' : ''}`.trim()}
      style={{ '--span': widget.span, '--rows': widget.rows ?? 1, '--i': index, viewTransitionName: vtName('rp-card', widget.id) }}
      aria-labelledby={titleId}
      data-widget={widget.id}
      {...drag?.target}
    >
      <header className="rp-card__head" {...drag?.handle}>
        <h3 id={titleId} className="rp-card__title" title={widget.title}><Highlight text={widget.title} query={query} /></h3>
        <div className="rp-card__tools">
          <CardMenu widget={widget} view={view} onView={onView} onHide={onHide} title={widget.title} />
          <HowToRead notes={notes} title={widget.title} />
          <RoundButton icon="arrow-up-right" label={`Ampliar ${widget.title}`} onClick={onExpand} />
        </div>
      </header>

      <div className="rp-card__top">
        <Figure head={head} query={query} />
        {stats ? (
          <ul className="rp-stats">
            {stats.map((s) => (
              <li key={s.label}>
                <span className="rp-stats__label">{s.label}</span>
                <strong className="num">{s.value}</strong>
                {s.unit ? <span className="rp-stats__unit">{s.unit}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {empty ? (
        <div className="rp-card__empty">
          <span className="rp-card__empty-icon" aria-hidden="true"><Icon name="chart-bar" size={18} /></span>
          <p>{empty}</p>
        </div>
      ) : (
        <div className={`rp-card__body ${split ? 'has-side' : ''}`}>
          {split ? <MiniPills items={side} /> : null}
          <div className="rp-card__chart">{widget.body?.(m, { view, size: 'md' })}</div>
          {!split && side.length ? <MiniPills items={side} /> : null}
        </div>
      )}

      {action ? (
        <div className="rp-card__foot">
          <button type="button" className="rp-cta" onClick={() => navigate(action.to)}>
            {action.label} <Icon name="arrow-right" size={15} />
          </button>
        </div>
      ) : null}
    </section>
  );
}

/* ═══════════════════════ Card principal: Continuidade do cuidado ═══════════════════════ */

/**
 * O "Pro Version" da referência: o logo em metal líquido ocupa o alto do card
 * (shader ao vivo — exceção só aqui, decisão de 16/10) e um painel de vidro
 * fosco cobre a metade de baixo, com duas colunas de número + barras.
 */
export function ContinuityCard({ widget, m, view, onView, onHide, onOpenList, index = 0, drag }) {
  const c = m.continuity;
  const notes = widget.notes?.(m, view) ?? [];
  const pct = c.share == null ? null : Math.round(c.share * 100);
  const overdueShare = c.active ? c.overdue / c.active : 0;
  // Altura mínima: o número e o rótulo precisam caber dentro da barra.
  const h = (share) => Math.max(0.42, Math.min(1, share));

  return (
    <section
      className={`rp-card rp-hero ${drag?.over ? 'is-drop' : ''} ${drag?.dragging ? 'is-dragging' : ''}`.trim()}
      style={{ '--span': widget.span, '--rows': widget.rows ?? 1, '--i': index, viewTransitionName: vtName('rp-card', widget.id) }}
      aria-labelledby="rp-card-continuidade"
      data-widget={widget.id}
      {...drag?.target}
    >
      <header className="rp-card__head rp-hero__head" {...drag?.handle}>
        <h3 id="rp-card-continuidade" className="rp-card__title">{widget.title}</h3>
        <div className="rp-card__tools">
          <HowToRead notes={notes} title={widget.title} />
          <RoundButton icon="x" label="Ocultar Continuidade do cuidado" tone="glass" onClick={onHide} />
        </div>
      </header>

      <div className="rp-hero__art" aria-hidden="true">
        <LiquidLogo size="100%" label="" />
      </div>

      <div className="rp-hero__glass">
        <div className="rp-hero__glass-head">
          <span className="rp-hero__icon" aria-hidden="true"><Icon name="chart-bar" size={16} /></span>
          <div className="rp-hero__glass-text">
            <p className="rp-hero__glass-title">Retorno das crianças</p>
            <p className="rp-hero__glass-sub">atendidas em {rangeShort(m.range)}</p>
          </div>
          <RoundButton icon="arrow-up-right" label="Ver crianças sem retorno" tone="white" size={40} onClick={onOpenList} />
        </div>

        <div className="rp-hero__cols">
          <div className="rp-hero__col">
            <p className="rp-hero__big num">{pct == null ? '—' : pct}<small>{pct == null ? '' : '%'}</small></p>
            <p className="rp-hero__caption">com retorno marcado</p>
            <div className="rp-hero__bars">
              <div className={`rp-hero__bar is-accent ${!c.withReturn ? 'is-zero' : ''}`} style={{ '--h': h(c.share ?? 0) }}>
                <strong className="num">{number(c.withReturn)}</strong>
                <span>com retorno</span>
              </div>
              <div className="rp-hero__bar is-gray" style={{ '--h': h(1 - (c.share ?? 0)) }}>
                <strong className="num">{number(c.without)}</strong>
                <span>sem retorno</span>
              </div>
            </div>
          </div>
          <div className="rp-hero__col">
            <p className="rp-hero__big num">{number(c.overdue)}<small>{plural(c.overdue, ' criança', ' crianças')}</small></p>
            <p className="rp-hero__caption">sem consulta há mais de</p>
            <div className="rp-hero__seg" role="radiogroup" aria-label="Limite sem consulta" onKeyDown={(e) => rovingKeys(e, widget.views.map((v) => v.key), view, onView)}>
              {widget.views.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  role="radio"
                  aria-checked={view === v.key}
                  tabIndex={view === v.key ? 0 : -1}
                  className={view === v.key ? 'is-active' : ''}
                  onClick={() => onView(v.key)}
                  aria-label={`${v.label} sem consulta`}
                >
                  {v.key}
                </button>
              ))}
              <span className="rp-hero__caption">dias</span>
            </div>
            <div className="rp-hero__bars">
              <div className={`rp-hero__bar is-accent ${!c.overdue ? 'is-zero' : ''}`} style={{ '--h': h(overdueShare) }}>
                <strong className="num">{number(Math.round(overdueShare * 100))}%</strong>
                <span>da carteira</span>
              </div>
              <div className="rp-hero__bar is-gray" style={{ '--h': h(1 - overdueShare) }}>
                <strong className="num">{number(c.onTrack)}</strong>
                <span>em dia</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ Lista: crianças sem retorno ═══════════════════════════ */

export function FollowUpDialog({ open, onClose, m }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overdue');
  const c = m?.continuity;
  if (!c) return null;
  const rows = tab === 'overdue' ? c.list : c.withoutList;
  const dmy = (d) => d.split('-').reverse().join('/');
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Crianças sem retorno"
      description="Quem precisa de um próximo atendimento. Agendar abre a Agenda com a criança já escolhida."
    >
      <div className="rp-seg rp-seg--wide" role="tablist" aria-label="Lista" onKeyDown={(e) => rovingKeys(e, ['overdue', 'without'], tab, setTab)}>
        <button type="button" role="tab" id="rp-tab-overdue" aria-controls="rp-tab-panel" aria-selected={tab === 'overdue'} tabIndex={tab === 'overdue' ? 0 : -1} className={`rp-seg__item ${tab === 'overdue' ? 'is-active' : ''}`} onClick={() => setTab('overdue')}>
          Sem consulta há +{c.days} dias · {c.overdue}
        </button>
        <button type="button" role="tab" id="rp-tab-without" aria-controls="rp-tab-panel" aria-selected={tab === 'without'} tabIndex={tab === 'without' ? 0 : -1} className={`rp-seg__item ${tab === 'without' ? 'is-active' : ''}`} onClick={() => setTab('without')}>
          Atendidas em {rangeShort(m.range)} sem retorno · {c.without}
        </button>
      </div>
      <div role="tabpanel" id="rp-tab-panel" aria-labelledby={`rp-tab-${tab}`}>
      {rows.length ? (
        <ul className="rp-people">
          {rows.map((p) => (
            <li key={p.id}>
              <div className="rp-people__who">
                <strong>{p.name}</strong>
                <span>
                  Último atendimento em {dmy(p.lastVisit)}
                  {p.days != null ? ` · há ${p.days} dias` : ''}
                  {p.lastType ? ` · ${p.lastType}` : ''}
                </span>
              </div>
              <div className="rp-people__actions">
                <Button size="sm" variant="ghost" onClick={() => { onClose(); navigate(`/pacientes/${p.id}`); }}>Prontuário</Button>
                <Button size="sm" variant="primary" icon="calendar" onClick={() => { onClose(); navigate(`/agenda?agendar=${encodeURIComponent(p.id)}`); }}>Agendar retorno</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rp-note rp-note--center">
          {tab === 'overdue'
            ? `Nenhuma criança em acompanhamento está há mais de ${c.days} dias sem consulta e sem nada agendado.`
            : 'Todas as crianças atendidas no período já têm um próximo atendimento.'}
        </p>
      )}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════ Card ampliado ═══════════════════════════════ */

export function ExpandedCard({ widget, m, view, onView, onClose, plazaLabel }) {
  if (!widget) return null;
  const head = widget.head?.(m, view);
  const notes = widget.notes?.(m, view) ?? [];
  const table = widget.table?.(m, view);
  const empty = widget.empty?.(m);
  const exportCard = () => {
    const csv = tableCSV(widget.title, table, [['Unidade', plazaLabel], ['Período', rangeCaption(m.range)], ['Comparação', m.prevLabel]]);
    downloadFile(`${widget.id}-${m.range.from}-a-${m.range.to}.csv`, csv);
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={widget.title}
      description={`${plazaLabel} · ${rangeCaption(m.range)}`}
      footer={(
        <>
          <Button onClick={onClose}>Fechar</Button>
          <Button variant="primary" icon="download" onClick={exportCard} disabled={!table?.rows?.length}>Baixar CSV do card</Button>
        </>
      )}
    >
      <div className="rp-expanded">
        <div className="rp-expanded__top">
          <Figure head={head} />
          {widget.views ? (
            <div className="rp-seg" role="radiogroup" aria-label="Visão do card" onKeyDown={(e) => rovingKeys(e, widget.views.map((v) => v.key), view, onView)}>
              {widget.views.map((v) => (
                <button key={v.key} type="button" role="radio" aria-checked={view === v.key} tabIndex={view === v.key ? 0 : -1} className={`rp-seg__item ${view === v.key ? 'is-active' : ''}`} onClick={() => onView(v.key)}>
                  {v.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {widget.custom === 'continuity' ? null : empty ? <p className="rp-note">{empty}</p> : (
          <div className="rp-expanded__chart">{widget.body?.(m, { view, size: 'lg' })}</div>
        )}
        <div className="rp-expanded__grid">
          <div>
            <p className="rp-expanded__label">Dados</p>
            <DataTable table={table} />
          </div>
          {notes.length ? (
            <div>
              <p className="rp-expanded__label">Como ler</p>
              <ul className="rp-expanded__notes">{notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
