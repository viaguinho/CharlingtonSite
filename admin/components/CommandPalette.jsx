import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Avatar } from './primitives.jsx';
import { useSession } from '../core/session.jsx';
import * as repo from '../data/repository.js';
import { STORES } from '../data/schema.js';
import { age, cpf as formatCpf } from '../core/format.js';

/**
 * Busca global (⌘K).
 *
 * Procura em pacientes, navegação e ações. Respeita RBAC: quem não pode ler
 * prontuário não encontra paciente aqui.
 *
 * O termo digitado nunca vai para a URL — nome de criança em query string
 * acaba no histórico do navegador e no log de qualquer proxy no caminho.
 */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { modules, can, plaza } = useSession();

  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    if (!open) { setQuery(''); setHighlighted(0); return; }
    if (!can.read('patients.list')) return;
    repo.list(STORES.PATIENTS, { where: plaza ? { praca: plaza } : {} })
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [open, plaza, can]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const navigation = modules
      .filter((m) => !q || m.label.toLowerCase().includes(q))
      .map((m) => ({ type: 'nav', id: m.id, label: m.label, icon: m.icon, path: m.path }));

    const people = !q ? [] : patients
      .filter((p) => {
        const haystack = `${p.nome ?? ''} ${p.nomeSocial ?? ''} ${p.cpf ?? ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6)
      .map((p) => ({
        type: 'patient',
        id: p.id,
        label: p.nome,
        hint: [age(p.dataNascimento).label, p.cpf ? formatCpf(p.cpf) : null].filter(Boolean).join(' · '),
        path: `/pacientes/${p.id}`,
      }));

    return [...people, ...navigation];
  }, [query, patients, modules]);

  useEffect(() => { setHighlighted(0); }, [query]);

  if (!open) return null;

  function choose(item) {
    navigate(item.path);
    onClose();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') { onClose(); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); setHighlighted((i) => Math.min(i + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setHighlighted((i) => Math.max(i - 1, 0)); }
    if (event.key === 'Enter' && results[highlighted]) { event.preventDefault(); choose(results[highlighted]); }
  }

  const patientResults = results.filter((r) => r.type === 'patient');
  const navResults = results.filter((r) => r.type === 'nav');

  return createPortal(
    <div className="overlay overlay--top" role="presentation">
      <div className="overlay__backdrop" onClick={onClose} />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Busca global">
        <div className="palette__input">
          <Icon name="search" size={17} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar paciente, tela ou ação…"
            aria-label="Termo de busca"
            aria-controls="palette-results"
            role="combobox"
            aria-expanded="true"
          />
          <kbd>esc</kbd>
        </div>

        <div className="palette__results" id="palette-results" role="listbox">
          {patientResults.length ? (
            <>
              <p className="palette__group">Pacientes</p>
              {patientResults.map((item) => (
                <PaletteRow
                  key={item.id}
                  item={item}
                  active={results.indexOf(item) === highlighted}
                  onHover={() => setHighlighted(results.indexOf(item))}
                  onSelect={() => choose(item)}
                />
              ))}
            </>
          ) : null}

          {navResults.length ? (
            <>
              <p className="palette__group">Ir para</p>
              {navResults.map((item) => (
                <PaletteRow
                  key={item.id}
                  item={item}
                  active={results.indexOf(item) === highlighted}
                  onHover={() => setHighlighted(results.indexOf(item))}
                  onSelect={() => choose(item)}
                />
              ))}
            </>
          ) : null}

          {!results.length ? (
            <p className="palette__empty">
              Nada encontrado para “{query}”.
            </p>
          ) : null}
        </div>

        <footer className="palette__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>esc</kbd> fechar</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function PaletteRow({ item, active, onHover, onSelect }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`palette__row ${active ? 'is-active' : ''}`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      {item.type === 'patient'
        ? <Avatar name={item.label} size={26} />
        : <span className="palette__icon"><Icon name={item.icon} size={16} /></span>}
      <span className="palette__text">
        <span className="palette__label">{item.label}</span>
        {item.hint ? <span className="palette__hint">{item.hint}</span> : null}
      </span>
      <Icon name="arrow-up-right" size={13} className="palette__go" />
    </button>
  );
}
