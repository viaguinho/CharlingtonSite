import { Sheet } from '../../components/Overlay.jsx';
import { Button, IconButton } from '../../components/primitives.jsx';
import Icon from '../../components/Icon.jsx';
import { SECTIONS } from './widgets.jsx';

/**
 * "+ Adicionar widget": o catálogo de todos os cards, por tema. Liga e desliga
 * cada um, troca a ordem pelo teclado (o arrastar fica na página) e mostra os
 * extras que começam ocultos.
 */
export function WidgetCatalog({ open, onClose, bySection, hidden, onShow, onHide, onMove, onReset, onJump }) {
  const hiddenSet = new Set(hidden);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={460}
      title="Adicionar widget"
      description="Ligue, desligue e ordene os cards de cada tema. O layout fica salvo para o seu usuário."
      footer={(
        <>
          <Button variant="ghost" icon="refresh" onClick={onReset}>Restaurar padrão</Button>
          <Button variant="primary" onClick={onClose}>Pronto</Button>
        </>
      )}
    >
      <div className="rp-catalog">
        {SECTIONS.map((section) => {
          const list = bySection[section.key] ?? [];
          return (
            <section key={section.key} className="rp-catalog__section" aria-labelledby={`rp-cat-${section.key}`}>
              <header>
                <h3 id={`rp-cat-${section.key}`}>{section.label}</h3>
                <span className="num">{list.filter((w) => !hiddenSet.has(w.id)).length} de {list.length}</span>
              </header>
              <ul>
                {list.map((w, i) => {
                  const on = !hiddenSet.has(w.id);
                  return (
                    <li key={w.id} className={`rp-catalog__item ${on ? 'is-on' : ''}`}>
                      <label className="rp-switch">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={on}
                          onChange={() => (on ? onHide(w.id) : onShow(w.id))}
                        />
                        <span className="rp-switch__track" aria-hidden="true"><span /></span>
                        <span className="rp-catalog__name">
                          {w.title}
                          {w.extra ? <span className="rp-catalog__tag">extra</span> : null}
                        </span>
                      </label>
                      <div className="rp-catalog__tools">
                        <IconButton name="chevron-up" label={`Subir ${w.title}`} size="sm" shape="circle" disabled={i === 0} onClick={() => onMove(w.id, -1)} />
                        <IconButton name="chevron-down" label={`Descer ${w.title}`} size="sm" shape="circle" disabled={i === list.length - 1} onClick={() => onMove(w.id, 1)} />
                        {on ? (
                          <IconButton name="arrow-right" label={`Ir até ${w.title}`} size="sm" shape="circle" onClick={() => { onClose(); onJump(w.id); }} />
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="rp-note"><Icon name="info" size={13} /> Na página, arraste um card pelo título para reordenar dentro do tema.</p>
      </div>
    </Sheet>
  );
}
