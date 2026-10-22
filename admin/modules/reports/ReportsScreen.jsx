import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../core/session.jsx';
import { PLAZA_LABELS } from '../../core/rbac.js';
import { useToast } from '../../components/Overlay.jsx';
import Icon from '../../components/Icon.jsx';
import { Skeleton } from '../../components/Card.jsx';
import { withViewTransition } from '../../core/viewTransition.js';
import { APPOINTMENT_TYPE_LABELS } from '../../data/schema.js';
import { computeReport } from './metrics.js';
import { comparisonRange, presetRange, PRESETS } from './period.js';
import { rangeShort } from '../../core/periods.js';
import { loadReportData, EMPTY_DATA } from './data.js';
import { SECTIONS, WIDGET_BY_ID, matchesSearch } from './widgets.jsx';
import { useReportLayout } from './useReportLayout.js';
import { ReportCard, ContinuityCard, ExpandedCard, FollowUpDialog } from './ReportCard.jsx';
import { ReportToolbar, ThemePills } from './ReportToolbar.jsx';
import { WidgetCatalog } from './WidgetCatalog.jsx';
import { RoundButton } from './ui.jsx';

// Pedaço à parte: o assistente (timbrado, PDF, CSV) só carrega quando é aberto.
const CreateReportDialog = lazy(() => import('./CreateReportDialog.jsx'));

/**
 * Relatórios — redesign de 16/10 no estilo "Modern CRM Analytics".
 *
 * Neutro + azul, cards cinza-claro em bento, pílulas de tema que grudam no
 * topo e uma barra de ferramentas em pílulas. Todo número vem de
 * `computeReport` (metrics.js) e todo card de `WIDGETS` (widgets.jsx): o
 * card ampliado, o CSV e o PDF leem o mesmo objeto. Onde não há dado, o card
 * diz que não há dado — não inventa uma curva para a tela não ficar vazia.
 */
export default function ReportsScreen() {
  const { plaza, user, can } = useSession();
  const toast = useToast();
  const navigate = useNavigate();

  const [range, setRange] = useState(() => presetRange('month'));
  const [types, setTypes] = useState(null);
  const [query, setQuery] = useState('');
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [followUp, setFollowUp] = useState(false);
  const [catalog, setCatalog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeSection, setActiveSection] = useState('resumo');
  const [dragging, setDragging] = useState(null);
  const [dropOn, setDropOn] = useState(null);
  const armed = useRef(null);

  const layout = useReportLayout(user?.id);



  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadReportData(plaza).then((next) => {
      if (!alive) return;
      setData(next);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [plaza]);

  const prev = useMemo(() => comparisonRange(range), [range]);
  const continuityDays = Number(layout.viewOf('continuidade') ?? 90);
  const m = useMemo(
    () => computeReport({ data, range, prev, types, plaza, continuityDays }),
    [data, range, prev, types, plaza, continuityDays],
  );
  const plazaLabel = plaza ? PLAZA_LABELS[plaza] : 'Todas as unidades';

  const hiddenSet = useMemo(() => new Set(layout.hidden), [layout.hidden]);
  const visible = useMemo(() => Object.fromEntries(SECTIONS.map((s) => [
    s.key,
    (layout.bySection[s.key] ?? []).filter((w) => !hiddenSet.has(w.id) && matchesSearch(w, query)),
  ])), [layout.bySection, hiddenSet, query]);
  const counts = Object.fromEntries(SECTIONS.map((s) => [s.key, visible[s.key].length]));
  const shownSections = SECTIONS.filter((s) => !query || visible[s.key].length);
  const totalVisible = Object.values(counts).reduce((t, n) => t + n, 0);

  /* ───────────────────── Seções: rolar e acompanhar ───────────────────── */

  const jumpTo = useCallback((key) => {
    const target = document.getElementById(`rp-${key}`);
    if (!target) return;
    setActiveSection(key);
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, []);

  const jumpToCard = useCallback((id) => {
    const card = document.querySelector(`[data-widget="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('is-flash');
    setTimeout(() => card.classList.remove('is-flash'), 1400);
  }, []);

  useEffect(() => {
    const root = document.getElementById('conteudo');
    const nodes = SECTIONS.map((s) => document.getElementById(`rp-${s.key}`)).filter(Boolean);
    if (!root || !nodes.length) return undefined;
    // A seção ativa é a última cujo topo já passou logo abaixo das pílulas.
    // O IntersectionObserver só via as seções que mudaram e atrasava a troca.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = root.getBoundingClientRect().top + 140;
      let current = nodes[0];
      for (const n of nodes) if (n.getBoundingClientRect().top <= line) current = n;
      // No fim da rolagem, a última seção vale mesmo que o topo não chegue à linha.
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = nodes[nodes.length - 1];
      setActiveSection(current.dataset.section);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => { root.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [loading, shownSections.length, query]);

  // Barra de temas grudada: ganha uma faixa de vidro por trás (sem ela o
  // conteúdo aparecia nítido entre as pílulas e acima delas).
  const stickySentinel = useRef(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const root = document.getElementById('conteudo');
    const node = stickySentinel.current;
    if (!root || !node) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      setStuck(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) + 8);
    }, { root, rootMargin: '-8px 0px 0px 0px', threshold: 0 });
    io.observe(node);
    return () => io.disconnect();
  }, [loading]);

  /* ─────────────────────────── Ocultar e arrastar ─────────────────────────── */

  const hideCard = useCallback((id) => {
    withViewTransition(() => layout.hide(id));
    toast.push({
      message: `"${WIDGET_BY_ID[id]?.title}" foi ocultado.`,
      action: { label: 'Desfazer', onClick: () => layout.show(id) },
      duration: 6000,
    });
  }, [layout, toast]);

  const dragFor = (id) => ({
    dragging: dragging === id,
    over: dropOn === id && dragging && dragging !== id,
    handle: {
      onPointerDown: (e) => { if (!e.target.closest('button')) armed.current = id; },
      onPointerUp: () => { armed.current = null; },
      title: 'Arraste para reordenar',
    },
    target: {
      draggable: true,
      onDragStart: (e) => {
        if (armed.current !== id) { e.preventDefault(); return; }
        setDragging(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
      },
      onDragEnd: () => { setDragging(null); setDropOn(null); armed.current = null; },
      onDragOver: (e) => {
        if (!dragging || WIDGET_BY_ID[dragging]?.section !== WIDGET_BY_ID[id]?.section) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dropOn !== id) setDropOn(id);
      },
      onDragLeave: () => { if (dropOn === id) setDropOn(null); },
      onDrop: (e) => {
        e.preventDefault();
        const from = e.dataTransfer.getData('text/plain') || dragging;
        if (from && from !== id) withViewTransition(() => layout.moveTo(from, id));
        setDragging(null);
        setDropOn(null);
      },
    },
  });

  const onSearchSubmit = () => {
    const first = shownSections.flatMap((s) => visible[s.key])[0];
    if (first) jumpToCard(first.id);
    else toast.info('Nenhum card com esse termo.');
  };

  const changeRange = (next) => withViewTransition(() => setRange(next));
  const changeTypes = (next) => withViewTransition(() => setTypes(next));
  const typeLine = types?.size ? [...types].map((t) => APPOINTMENT_TYPE_LABELS[t]).join(', ') : null;

  /* ─────────────────────────────── Tela ─────────────────────────────── */

  return (
    <div className="rp">
      <header className="rp-head">
        <div className="rp-head__text">
          <nav aria-label="Trilha" className="rp-crumbs">
            <span><Icon name="file-text" size={15} stroke={1.5} /> Indicadores</span>
            <span aria-current="page"><Icon name="file-text" size={15} stroke={1.5} /> Relatórios</span>
          </nav>
          <RoundButton icon="arrow-left" label="Voltar à Visão geral" tone="pill" size={48} className="rp-back" onClick={() => navigate('/')} />
          <h1 className="rp-title">Desempenho da clínica</h1>
          <p className="rp-caption">
            {plazaLabel} · {rangeShort(range)}{range.preset !== 'custom' ? ` · ${PRESETS.find((p) => p.value === range.preset)?.label.toLowerCase()}` : ''} · comparado com {m.prevLabel}
            {typeLine ? <> · <strong>só {typeLine.toLowerCase()}</strong></> : null}
          </p>
        </div>
        <ReportToolbar
          range={range}
          onRange={changeRange}
          query={query}
          onQuery={setQuery}
          onSearchSubmit={onSearchSubmit}
          types={types}
          onTypes={changeTypes}
          onAddWidget={() => setCatalog(true)}
          onCreateReport={() => setCreating(true)}
          hiddenCount={layout.hidden.length}
        />
      </header>

      <div ref={stickySentinel} className="rp-sticky-sentinel" aria-hidden="true" />
      <div className={`rp-sticky ${stuck ? 'is-stuck' : ''}`.trim()}>
        <ThemePills sections={shownSections} active={activeSection} onJump={jumpTo} counts={counts} />
      </div>

      {loading ? (
        <div className="rp-grid" aria-busy="true" aria-label="Carregando relatórios">
          {[3, 3, 6, 6, 3].map((span, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} style={{ gridColumn: `span ${span}`, gridRow: i === 0 ? 'span 2' : undefined }}>
              <Skeleton height={i === 0 ? 640 : 312} radius="var(--rp-radius)" />
            </div>
          ))}
        </div>
      ) : !m.hasData ? (
        <div className="rp-empty-page">
          <span className="rp-empty-page__icon" aria-hidden="true"><Icon name="chart-bar" size={22} /></span>
          <h2>Ainda não há o que relatar</h2>
          <p>Os relatórios são calculados a partir de atendimentos reais. Depois das primeiras consultas registradas, esta tela ganha conteúdo.</p>
        </div>
      ) : (
        <>
          {query && !totalVisible ? (
            <p className="rp-note rp-note--center">Nenhum card com “{query}”. <button type="button" className="rp-link" onClick={() => setQuery('')}>Limpar busca</button></p>
          ) : null}
          {shownSections.map((section) => {
            const list = visible[section.key];
            return (
              <section key={section.key} id={`rp-${section.key}`} data-section={section.key} className="rp-section" aria-labelledby={`rp-h-${section.key}`}>
                {section.key !== 'resumo' ? (
                  <header className="rp-section__head">
                    <h2 id={`rp-h-${section.key}`}>{section.label}</h2>
                    <p>{section.caption}</p>
                  </header>
                ) : <h2 id="rp-h-resumo" className="rp-sr">Resumo</h2>}
                {list.length ? (
                  <div className={`rp-grid rp-grid--${section.key}`}>
                    {list.map((w, i) => (w.custom === 'continuity' ? (
                      <ContinuityCard
                        key={w.id}
                        widget={w}
                        m={m}
                        index={i}
                        view={layout.viewOf(w.id)}
                        onView={(v) => layout.setView(w.id, v)}
                        onHide={() => hideCard(w.id)}
                        onOpenList={() => setFollowUp(true)}
                        drag={dragFor(w.id)}
                      />
                    ) : (
                      <ReportCard
                        key={w.id}
                        widget={w}
                        m={m}
                        index={i}
                        query={query}
                        view={layout.viewOf(w.id)}
                        onView={(v) => withViewTransition(() => layout.setView(w.id, v))}
                        onHide={() => hideCard(w.id)}
                        onExpand={() => setExpanded(w.id)}
                        drag={dragFor(w.id)}
                      />
                    )))}
                  </div>
                ) : (
                  <div className="rp-section__empty">
                    <p>Todos os cards de {section.label.toLowerCase()} estão ocultos.</p>
                    <button type="button" className="rp-pill rp-pill--action" onClick={() => setCatalog(true)}>
                      <Icon name="plus" size={16} /> Adicionar widget
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}

      {expanded ? (
        <ExpandedCard
          widget={WIDGET_BY_ID[expanded]}
          m={m}
          view={layout.viewOf(expanded)}
          onView={(v) => layout.setView(expanded, v)}
          onClose={() => setExpanded(null)}
          plazaLabel={plazaLabel}
        />
      ) : null}

      <FollowUpDialog open={followUp} onClose={() => setFollowUp(false)} m={m} />

      <WidgetCatalog
        open={catalog}
        onClose={() => setCatalog(false)}
        bySection={layout.bySection}
        hidden={layout.hidden}
        onShow={layout.show}
        onHide={layout.hide}
        onMove={layout.moveBy}
        onReset={() => { layout.reset(); toast.success('Layout padrão restaurado.'); }}
        onJump={(id) => setTimeout(() => jumpToCard(id), 120)}
      />

      {creating && can.read('reports') ? (
        <Suspense fallback={null}>
          <CreateReportDialog
            open={creating}
            onClose={() => setCreating(false)}
            data={data}
            defaults={{
              range,
              sections: SECTIONS.filter((s) => counts[s.key] > 0 || !query).map((s) => s.key),
              plaza,
              types,
              hiddenIds: layout.hidden,
              views: layout.layout.views,
              order: layout.layout.order,
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
