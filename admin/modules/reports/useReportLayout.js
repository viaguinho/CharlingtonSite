import { useCallback, useEffect, useMemo, useState } from 'react';
import { SECTIONS, WIDGETS, WIDGET_BY_ID } from './widgets.jsx';

/**
 * Layout dos Relatórios por usuário: ordem dos cards em cada seção, cards
 * ocultos e a visão escolhida de cada card. Fica no navegador
 * (`charlington.reports.layout.<userId>`); um card novo no código entra no fim
 * da seção sem apagar a ordem salva.
 */

const VERSION = 1;
const keyFor = (userId) => `charlington.reports.layout.${userId ?? 'anon'}`;

function defaults() {
  return {
    v: VERSION,
    order: Object.fromEntries(SECTIONS.map((s) => [s.key, WIDGETS.filter((w) => w.section === s.key).map((w) => w.id)])),
    hidden: WIDGETS.filter((w) => w.extra).map((w) => w.id),
    views: {},
  };
}

function read(userId) {
  const base = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(userId)) ?? 'null');
    if (!saved || saved.v !== VERSION) return base;
    const order = {};
    for (const s of SECTIONS) {
      const known = (saved.order?.[s.key] ?? []).filter((id) => WIDGET_BY_ID[id]?.section === s.key);
      const missing = base.order[s.key].filter((id) => !known.includes(id));
      order[s.key] = [...known, ...missing];
    }
    // Card novo no código ainda não visto: herda o padrão (extra começa oculto).
    const seen = new Set(Object.values(saved.order ?? {}).flat());
    const hidden = [...(saved.hidden ?? []).filter((id) => WIDGET_BY_ID[id]), ...base.hidden.filter((id) => !seen.has(id))];
    return { v: VERSION, order, hidden: [...new Set(hidden)], views: saved.views ?? {} };
  } catch {
    return base;
  }
}

export function useReportLayout(userId) {
  const [layout, setLayout] = useState(() => read(userId));

  useEffect(() => { setLayout(read(userId)); }, [userId]);
  useEffect(() => {
    try { localStorage.setItem(keyFor(userId), JSON.stringify(layout)); } catch { /* modo privado */ }
  }, [layout, userId]);

  const hide = useCallback((id) => setLayout((l) => ({ ...l, hidden: [...new Set([...l.hidden, id])] })), []);
  const show = useCallback((id) => setLayout((l) => ({ ...l, hidden: l.hidden.filter((h) => h !== id) })), []);
  const setView = useCallback((id, view) => setLayout((l) => ({ ...l, views: { ...l.views, [id]: view } })), []);

  /** Põe `id` no lugar de `targetId` (arrastar), na mesma seção. */
  const moveTo = useCallback((id, targetId) => setLayout((l) => {
    const section = WIDGET_BY_ID[id]?.section;
    if (!section || WIDGET_BY_ID[targetId]?.section !== section || id === targetId) return l;
    const list = l.order[section].filter((x) => x !== id);
    const at = list.indexOf(targetId);
    const from = l.order[section].indexOf(id);
    const to = l.order[section].indexOf(targetId);
    list.splice(from < to ? at + 1 : at, 0, id);
    return { ...l, order: { ...l.order, [section]: list } };
  }), []);

  /** Sobe ou desce uma posição (teclado, no catálogo). */
  const moveBy = useCallback((id, delta) => setLayout((l) => {
    const section = WIDGET_BY_ID[id]?.section;
    const list = [...(l.order[section] ?? [])];
    const i = list.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return l;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...l, order: { ...l.order, [section]: list } };
  }), []);

  const reset = useCallback(() => setLayout(defaults()), []);

  const viewOf = useCallback((id) => layout.views[id] ?? WIDGET_BY_ID[id]?.defaultView, [layout.views]);

  const bySection = useMemo(() => Object.fromEntries(SECTIONS.map((s) => [
    s.key,
    layout.order[s.key].map((id) => WIDGET_BY_ID[id]).filter(Boolean),
  ])), [layout.order]);

  return { layout, bySection, hidden: layout.hidden, hide, show, setView, viewOf, moveTo, moveBy, reset };
}
