import { useEffect, useLayoutEffect, useRef } from 'react';
import { APPOINTMENT_TYPE_LABELS } from '../../../data/schema.js';
import { visitState } from './patientStates.js';

/**
 * Linha do tempo de consultas na base do palco — a faixa de cápsulas
 * "2020 Jan · ••••◉ · Optimal" da referência. Passado à esquerda, o traço
 * "hoje", futuro à direita. Abre a Linha do tempo no item clicado.
 *
 * Cápsula compacta, com 2 itens de texto: a data (micro) e o estado (corpo).
 * O estado vem de `visitState`, o mesmo das pílulas de alerta: uma consulta
 * passada sem desfecho nunca aparece como "Confirmado".
 */

const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const EDGE = 24; // largura da máscara de esmaecimento nas bordas

export function VisitRail({ appointments, onOpen }) {
  const scroller = useRef(null);
  const todayRef = useRef(null);

  const list = appointments
    .filter((a) => a.status !== 'cancelado' && a.inicio)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const now = Date.now();
  const firstFuture = list.findIndex((a) => new Date(a.inicio).getTime() > now);

  // Começa centrado no "hoje", alinhado ao início de uma cápsula (nenhum
  // texto cortado no meio sob a máscara).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    // A largura da faixa só se acerta depois do palco (no celular ela divide a
    // base com os controles): reposiciona a cada mudança de tamanho até a
    // primeira rolagem de quem usa.
    let touched = false;
    const onUser = () => { touched = true; };
    const place = () => { if (!touched) centerOnToday(el, todayRef.current); };
    place();
    el.addEventListener('pointerdown', onUser);
    el.addEventListener('wheel', onUser, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      el.removeEventListener('pointerdown', onUser);
      el.removeEventListener('wheel', onUser);
    };
  }, [list.length]);

  // Cápsula que a borda corta fica esmaecida: perto do fim da rolagem não há
  // como alinhar a borda a uma cápsula, e "7 out 2026" sem o "0" lia errado.
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) en.target.toggleAttribute('data-clipped', en.intersectionRatio < 0.98);
    }, { root: el, rootMargin: `0px -${EDGE / 2}px`, threshold: [0, 0.98, 1] });
    el.querySelectorAll('.pr-visit').forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, [list.length]);

  if (!list.length) return null;

  const today = (
    <span ref={todayRef} className="pr-rail__today">
      <span className="pr-rail__today-label">Hoje</span>
      <span className="pr-rail__today-line" aria-hidden="true" />
    </span>
  );

  return (
    <nav className="pr-rail" aria-label="Consultas do paciente">
      <ol ref={scroller} className="pr-rail__list">
        {list.map((a, i) => {
          const d = new Date(a.inicio);
          const st = visitState(a, now);
          const day = `${String(d.getDate()).padStart(2, '0')} ${MONTH.format(d).replace('.', '')} ${d.getFullYear()}`;
          return (
            <li key={a.id} className="pr-rail__item">
              {i === firstFuture ? today : null}
              <button type="button" className={`pr-visit pr-visit--${st.tone}`} onClick={() => onOpen(a)}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
                aria-label={`${APPOINTMENT_TYPE_LABELS[a.tipo] ?? 'Consulta'} em ${d.toLocaleDateString('pt-BR')}, ${st.label}`}>
                <span className="pr-visit__date num">{day}</span>
                <span className="pr-visit__status">
                  <i aria-hidden="true" />
                  {st.label}
                </span>
              </button>
            </li>
          );
        })}
        {firstFuture === -1 ? <li className="pr-rail__item">{today}</li> : null}
      </ol>
    </nav>
  );
}

/**
 * Rola a faixa para o "hoje" ficar à vista, alinhada ao início de uma cápsula.
 */
function centerOnToday(el, mark) {
  if (!mark) return;
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 0) { el.scrollLeft = 0; return; }
  // Posições no conteúdo rolável (offsetLeft é relativo a outro ancestral).
  const box = el.getBoundingClientRect();
  const at = (node) => node.getBoundingClientRect().left - box.left + el.scrollLeft;
  const markCenter = at(mark) + mark.offsetWidth / 2;
  const wanted = Math.min(max, Math.max(0, markCenter - el.clientWidth / 2));
  const starts = [...el.children].map((li) => at(li) - EDGE);
  // A borda de cápsula mais próxima do alvo que ainda mantém o "hoje" à vista.
  const fits = starts.filter((x) => x <= markCenter - EDGE && x + el.clientWidth >= markCenter + EDGE);
  // Sem valor inicial: com `wanted` como semente o reduce devolvia sempre o
  // próprio alvo, e a primeira cápsula ficava cortada sob a máscara.
  const snap = (fits.length ? fits : starts).reduce((best, x) => (Math.abs(x - wanted) < Math.abs(best - wanted) ? x : best));
  el.scrollLeft = Math.min(max, Math.max(0, snap));
}
