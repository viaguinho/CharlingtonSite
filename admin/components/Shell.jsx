import { useEffect, useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { IconButton, Avatar, Badge, Chip } from './primitives.jsx';
import { useSession } from '../core/session.jsx';
import { PLAZA_LABELS, ROLE_LABELS } from '../core/rbac.js';
import { dateLong } from '../core/format.js';
import { FloatingDock } from '@/components/ui/floating-dock';

const RAIL_KEY = 'charlington.rail.expanded';

/* ═══════════════════════════════ Rail ═══════════════════════════════
   Design reformulado com Floating Dock (Aceternity UI):
   Física de ampliação elástica suave, tooltips dinâmicos e navegação
   preservada para todos os módulos clínicos.                      */

function Rail({ expanded, onToggle }) {
  const { modules, user, signOut } = useSession();

  const dockItems = modules.map((item) => ({
    title: item.label,
    to: item.path,
    icon: <Icon name={item.icon} size={20} />,
  }));

  return (
    <nav className={`rail ${expanded ? 'is-expanded' : ''}`} aria-label="Navegação principal">
      <div className="rail__brand">
        <Link to="/" className="rail__logo" aria-label="Início" title="Início — Dr. Charlington">
          <img src="/assets/logo.svg" alt="Dr. Charlington Cavalcante" width="30" height="30" />
        </Link>
        {expanded ? (
          <span className="rail__brand-text">
            <strong>Gestão Clínica</strong>
            <span>Dr. Charlington Cavalcante</span>
          </span>
        ) : null}
      </div>

      <div className="rail__dock-container">
        <FloatingDock
          items={dockItems}
          orientation="vertical"
          expanded={expanded}
          desktopClassName="rail__floating-dock"
        />
      </div>

      <div className="rail__foot">
        <button
          type="button"
          className="rail__foot-btn"
          onClick={onToggle}
          aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
          title={expanded ? 'Recolher' : 'Expandir menu'}
        >
          <Icon name="sidebar" size={20} />
          {expanded ? <span className="rail__label">Recolher</span> : null}
          {!expanded ? <span className="floating-dock-tooltip is-vertical">Expandir menu</span> : null}
        </button>

        <div className="rail__user" title={expanded ? undefined : `${user?.nome || 'Profissional'} · ${ROLE_LABELS[user?.role] || ''}`}>
          <div className="rail__user-avatar-wrap">
            <Avatar name={user?.nome} src={user?.foto} size={42} />
          </div>
          {expanded ? (
            <span className="rail__user-text">
              <strong>{user?.nome}</strong>
              <span>{ROLE_LABELS[user?.role]}</span>
            </span>
          ) : null}
          {expanded ? (
            <IconButton name="logout" label="Sair" size="sm" onClick={signOut} className="rail__logout" />
          ) : null}
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════ Topbar ═══════════════════════════════ */

function Topbar({ breadcrumb, onSearch, pending = 0 }) {
  const { user, plaza, switchPlaza } = useSession();
  const [plazaOpen, setPlazaOpen] = useState(false);
  const location = useLocation();

  const plazas = user?.plazas ?? [];
  const isDashboard = location.pathname === '/' || location.pathname === '';

  return (
    <header className="topbar">
      <div className="topbar__container">
        <div className="topbar__left">
          <Link
            to="/"
            className={`explore-pill ${isDashboard ? 'is-active' : ''}`}
            aria-label={isDashboard ? 'Dashboard (tela principal)' : 'Voltar ao Dashboard'}
            aria-current={isDashboard ? 'page' : undefined}
            title={isDashboard ? 'Dashboard (tela principal)' : 'Voltar ao Dashboard'}
          >
            <Icon name="home" size={14} />
            <span className="explore-pill-text">
              <span>Dashboard</span>
              <span aria-hidden="true">Dashboard</span>
            </span>
          </Link>
        </div>

        <div className="topbar__right">
          <button type="button" className="search-trigger" onClick={onSearch}>
            <Icon name="search" size={15} />
            <span>Buscar paciente, documento, lançamento…</span>
            <kbd>⌘K</kbd>
          </button>

          {plazas.length > 1 ? (
            <div className="plaza-switch">
              <button
                type="button"
                className="plaza-switch__trigger"
                onClick={() => setPlazaOpen((v) => !v)}
                aria-expanded={plazaOpen}
                aria-haspopup="menu"
              >
                <span className="plaza-switch__dot" aria-hidden="true" />
                {plaza ? PLAZA_LABELS[plaza] : 'Selecionar praça'}
                <Icon name="chevron-down" size={13} />
              </button>
              {plazaOpen ? (
                <ul className="plaza-switch__menu" role="menu">
                  {plazas.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={plaza === option}
                        onClick={() => { switchPlaza(option); setPlazaOpen(false); }}
                      >
                        {PLAZA_LABELS[option]}
                        {plaza === option ? <Icon name="check" size={14} /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : plaza ? (
            <Chip tone="neutral">{PLAZA_LABELS[plaza]}</Chip>
          ) : null}

          <span className="topbar__bell">
            <IconButton name="bell" label="Notificações" shape="circle" variant="surface" />
            <Badge count={pending} />
          </span>

          <Avatar name={user?.nome} src={user?.foto} size={32} />
        </div>
      </div>
    </header>
  );
}

export function Breadcrumb({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav className="breadcrumb" aria-label="Trilha de navegação">
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          const isDashboard = item.label === 'Dashboard' || item.label === 'Visão geral';
          if (isDashboard) {
            return (
              <li key={item.label}>
                <Link to="/" className="explore-pill" aria-label="Dashboard">
                  <span className="explore-pill-text">
                    <span>Dashboard</span>
                    <span aria-hidden="true">Dashboard</span>
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.label}>
              {item.to && !last
                ? <Link to={item.to}>{item.label}</Link>
                : <span aria-current={last ? 'page' : undefined}>{item.label}</span>}
              {!last ? <Icon name="chevron-right" size={12} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ═══════════════════════ Cabeçalho de módulo ═══════════════════════
   Eyebrow + título leve à esquerda, barra de ferramentas à direita (REF 4). */

export function PageHeader({ eyebrow, title, description, actions, toolbar, stacked = false }) {
  // stacked: controles que não cabem ao lado do título ganham a própria linha,
  // alinhada à borda esquerda do conteúdo. Antes quebravam encostados à
  // direita e o seletor de período flutuava sem alinhar com nada.
  if (stacked && toolbar) {
    return (
      <div className="page-header page-header--stacked">
        <div className="page-header__text">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-header__description">{description}</p> : null}
        </div>
        {actions ? <div className="page-header__tools">{actions}</div> : null}
        <div className="page-header__toolbar">{toolbar}</div>
      </div>
    );
  }
  return (
    <div className="page-header">
      <div className="page-header__text">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-header__description">{description}</p> : null}
      </div>
      {(actions || toolbar) ? (
        <div className="page-header__tools">
          {toolbar}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** Saudação com data por extenso — o cabeçalho da home de cada papel. */
export function GreetingHeader({ children }) {
  const { user } = useSession();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = (user?.nome ?? '').split(' ')[0];

  return (
    <div className="greeting">
      <div className="greeting__text">
        {/* A data é corpo, não sobrelinha: não usa a classe .eyebrow. */}
        <span className="greeting__date">{dateLong(new Date())}</span>
        <h1 className="page-title">{greeting}{firstName ? `, ${firstName}` : ''}.</h1>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════ Shell ═══════════════════════════════ */

export function Shell({ breadcrumb, onSearch, pending, children }) {
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; }
  });
  const location = useLocation();

  useEffect(() => {
    try { localStorage.setItem(RAIL_KEY, expanded ? '1' : '0'); } catch { /* modo privado */ }
  }, [expanded]);

  // Cada troca de rota devolve o foco e o scroll ao topo do conteúdo —
  // sem isso, quem navega por teclado fica preso no fim da página anterior.
  useEffect(() => {
    document.getElementById('conteudo')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className={`shell ${expanded ? 'shell--expanded' : ''}`}>
      <a href="#conteudo" className="skip-link">Ir para o conteúdo</a>
      <Rail expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      <div className="shell__main">
        <Topbar breadcrumb={breadcrumb} onSearch={onSearch} pending={pending} />
        <main id="conteudo" className="shell__content" tabIndex={-1}>
          <div className="shell__container">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Grid bento de 12 colunas — a base de todas as telas de visão geral. */
export function Bento({ children, className = '' }) {
  return <div className={`bento ${className}`.trim()}>{children}</div>;
}
