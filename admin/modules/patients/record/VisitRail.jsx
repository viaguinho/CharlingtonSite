import { useLayoutEffect, useRef, useState } from 'react';
import { APPOINTMENT_TYPE_LABELS } from '../../../data/schema.js';
import Icon from '../../../components/Icon.jsx';
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

// Ícone do tipo da consulta (guia §4.3): lê-se o tipo sem texto.
const TYPE_ICON = { teleconsulta: 'video', laudo: 'file-text', evento: 'calendar' };

export function VisitRail({ appointments, onOpen }) {
  const scroller = useRef(null);
  const todayRef = useRef(null);
  // Tabindex móvel: com 300 consultas eram 303 paradas de Tab. Tab entra uma vez e as setas andam.
  const [stop, setStop] = useState(null);

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

  if (!list.length) return null;

  const onKeyDown = (e) => {
    const buttons = [...scroller.current.querySelectorAll('button')];
    const at = buttons.indexOf(document.activeElement);
    if (at < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = Math.min(buttons.length - 1, at + 1);
    if (e.key === 'ArrowLeft') next = Math.max(0, at - 1);
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = buttons.length - 1;
    if (next == null) return;
    e.preventDefault();
    buttons[next].focus();
  };
  // Parada inicial: a primeira consulta de hoje em diante (a que a faixa centraliza).
  const stopId = stop ?? list[Math.max(0, firstFuture === -1 ? list.length - 1 : firstFuture)]?.id;

  const today = (
    <span ref={todayRef} className="pr-rail__today">
      <span className="pr-rail__today-label">Hoje</span>
      <span className="pr-rail__today-line" aria-hidden="true" />
    </span>
  );

  return (
    <nav className="pr-rail" aria-label="Consultas do paciente">
      <ol ref={scroller} className="pr-rail__list" onKeyDown={onKeyDown}>
        {list.map((a, i) => {
          const d = new Date(a.inicio);
          const st = visitState(a, now);
          // O ano só aparece quando não é o corrente: a cápsula fica curta e cabem mais delas na faixa.
          const sameYear = d.getFullYear() === new Date(now).getFullYear();
          const day = `${String(d.getDate()).padStart(2, '0')} ${MONTH.format(d).replace('.', '')}${sameYear ? '' : ` ${d.getFullYear()}`}`;
          return (
            <li key={a.id} className="pr-rail__item">
              {i === firstFuture ? today : null}
              <button type="button" className={`pr-visit pr-visit--${st.tone}`} onClick={() => onOpen(a)}
                tabIndex={a.id === stopId ? 0 : -1}
                onFocus={(e) => { setStop(a.id); e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}
                aria-label={`${APPOINTMENT_TYPE_LABELS[a.tipo] ?? 'Consulta'} em ${d.toLocaleDateString('pt-BR')}, ${st.label}`}>
                <span className="pr-visit__date num">
                  <Icon name={TYPE_ICON[a.tipo] ?? 'stethoscope'} size={11} />
                  {day}
                </span>
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
