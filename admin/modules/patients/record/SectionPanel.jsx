import { useEffect, useLayoutEffect, useRef } from 'react';
import Icon from '../../../components/Icon.jsx';

/**
 * Painel de vidro das seções do prontuário.
 *
 * Cobre o palco e a coluna direita e deixa a coluna esquerda à vista: o
 * contexto do paciente continua presente enquanto se escreve uma evolução.
 * Dentro, a view de sempre — mesma lógica, mesmos formulários.
 *
 * O cabeçalho do painel repete a alergia e os estados de agora: com o palco
 * coberto, eles sumiriam justo quando o médico prescreve (regra §0.6).
 * Esc fecha (a menos que um modal da própria view esteja aberto) e o foco
 * volta para a pílula da seção.
 */
export function SectionPanel({ label, patientName = null, alerts = null, states = null, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Um modal ou popover aberto dentro da view fecha primeiro.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // A partir de 1024px o painel é uma folha sobreposta, grudada sob a barra de
  // seções, que rola por dentro. A altura é a do que sobra da janela, mas
  // nunca menor que a do palco: a faixa de consultas, o crédito e os
  // controles do palco não vazam pela borda de baixo (o resto leva o véu).
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return undefined;
    const wide = window.matchMedia('(min-width: 1024px)');
    const scroller = panel.closest('.shell__content');
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (!wide.matches) { panel.style.removeProperty('--pr-panel-h'); return; }
      const layer = panel.parentElement.getBoundingClientRect();
      const box = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const style = getComputedStyle(panel);
      const stickyTop = parseFloat(style.top) || 0;
      // A 1024px o dock já é barra no pé: o painel termina acima dela.
      const dock = parseFloat(style.getPropertyValue('--pr-dock-h')) || 0;
      // O sticky conta a partir do padding do contêiner de rolagem.
      const pad = scroller ? parseFloat(getComputedStyle(scroller).paddingTop) || 0 : 0;
      const top = Math.max(layer.top, box.top + pad + stickyTop);
      // Nem além do fim da camada: lá o sticky soltaria o painel e o
      // cabeçalho (com a alergia) subiria para baixo da barra de seções.
      const room = Math.min(window.innerHeight - dock - GAP, box.bottom - GAP, layer.bottom);
      const stage = panel.closest('.pr-grid')?.querySelector('.pr-stage')?.getBoundingClientRect();
      let bottom = stage && stage.bottom > top ? Math.min(Math.max(room, stage.bottom), layer.bottom) : room;
      // Com o dock em barra no pé, acompanhar o palco levaria o painel para
      // baixo dela; o pé do palco já fica escondido pelo dock.
      if (dock) bottom = Math.min(bottom, window.innerHeight - dock - GAP);
      panel.style.setProperty('--pr-panel-h', `${Math.max(MIN_HEIGHT, Math.round(bottom - top))}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };

    measure();
    const target = scroller ?? window;
    target.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    wide.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      wide.removeEventListener('change', schedule);
    };
  }, []);

  return (
    <div className="pr-panel-layer">
      <section ref={ref} tabIndex={-1} className="pr-panel" aria-label={label}>
        {/* Grudado no topo do painel: a alergia e o × nunca saem da tela ao rolar. */}
        <header className="pr-panel__head">
          {patientName ? <p className="pr-panel__who">{patientName}</p> : null}
          <div className="pr-panel__alerts">{alerts}</div>
          <button type="button" className="pr-panel__close" onClick={onClose} aria-label="Voltar à visão geral">
            <Icon name="x" size={16} />
            <span aria-hidden="true">Voltar à visão geral</span>
          </button>
        </header>
        <div className="pr-panel__body">
          {/* Os demais estados do paciente rolam com o corpo; só a alergia fica grudada no topo. */}
          {states ? <div className="pr-panel__states">{states}</div> : null}
          {children}
        </div>
      </section>
    </div>
  );
}

const GAP = 16;          // respiro entre o pé do painel e o pé da janela
const MIN_HEIGHT = 360;  // janelas muito baixas: o painel não vira uma fresta
