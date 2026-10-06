import { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from './core/session.jsx';
import { ToastProvider, StepUpDialog, IdleWarning } from './components/Overlay.jsx';
import { Shell } from './components/Shell.jsx';
import { Skeleton } from './components/Card.jsx';
import LoginScreen, { LockedScreen } from './modules/auth/LoginScreen.jsx';
import SetupWizard from './modules/auth/SetupWizard.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useBaselineRhythm } from './core/useBaselineRhythm.js';

/* Cada módulo entra em seu próprio pedaço de bundle: abrir o painel não
   deve custar o download do financeiro inteiro. */
const Overview      = lazy(() => import('./modules/overview/OverviewScreen.jsx'));
const Agenda        = lazy(() => import('./modules/agenda/AgendaScreen.jsx'));
const Patients      = lazy(() => import('./modules/patients/PatientsScreen.jsx'));
const PatientRecord = lazy(() => import('./modules/patients/PatientRecordScreen.jsx'));
const Documents     = lazy(() => import('./modules/documents/DocumentsScreen.jsx'));
const Communication = lazy(() => import('./modules/communication/CommunicationScreen.jsx'));
const Finance       = lazy(() => import('./modules/finance/FinanceScreen.jsx'));
const Operations    = lazy(() => import('./modules/operations/OperationsScreen.jsx'));
const Reports       = lazy(() => import('./modules/reports/ReportsScreen.jsx'));
const Audit         = lazy(() => import('./modules/audit/AuditScreen.jsx'));
const Settings      = lazy(() => import('./modules/settings/SettingsScreen.jsx'));

/* Forma medida de cada rota: altura da faixa de KPIs, linhas de descrição,
   controles do cabeçalho e divisão da primeira fileira do bento. Um esqueleto
   médio prometia 216 px de faixa em todas e errava 8 das 9 telas. */
const ROUTE_SHAPE = {
  '/':              { strip: 240, desc: 0, tools: [[168, 38, 'pill']],                     bento: [[7, 456], [5, 216], [5, 216]] },
  '/agenda':        { strip: 168, desc: 1, stacked: true, tools: [[175, 38, 'pill']], toolbar: [[270, 38, 'sm'], [330, 38, 'sm']], bento: [[12, 744]] },
  '/pacientes':     { strip: 240, desc: 2, tools: [[174, 38, 'sm'], [156, 38, 'pill']],    bento: [[12, 744]] },
  '/documentos':    { strip: 168, desc: 2, tools: [[400, 38, 'sm']],                      bento: [[12, 600]] },
  '/comunicacao':   { strip: 168, desc: 2, tools: [[330, 38, 'sm']],                      bento: [[7, 552], [5, 552]] },
  '/financeiro':    { strip: 192, desc: 2, tools: [[270, 54, 'sm'], [330, 38, 'sm'], [175, 38, 'pill']], bento: [[7, 456], [5, 456]] },
  '/operacoes':     { strip: 168, desc: 2, tools: [[270, 38, 'sm']],                      bento: [[12, 552]] },
  '/relatorios':    { strip: 216, desc: 1, tools: [[270, 54, 'sm'], [150, 38, 'pill']],   bento: [[8, 480], [4, 480]] },
  '/auditoria':     { strip: 144, desc: 2, tools: [[150, 38, 'pill']],                    bento: [[12, 600]] },
  '/configuracoes': { strip: 168, desc: 1, tools: [[360, 38, 'sm']],                      bento: [[12, 600]] },
};
const DEFAULT_SHAPE = { strip: 192, desc: 2, tools: [[168, 38, 'pill']], bento: [[7, 456], [5, 216]] };

/** Esqueleto de carregamento com a forma da rota que vai entrar. */
function RouteFallback() {
  const { pathname } = useLocation();
  const shape = ROUTE_SHAPE[pathname]
    ?? ROUTE_SHAPE[`/${pathname.split('/')[1] ?? ''}`]
    ?? DEFAULT_SHAPE;

  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className={`page-header ${shape.stacked ? 'page-header--stacked' : ''}`}>
        <div className="page-header__text">
          {shape.desc ? <Skeleton width={96} height={13} /> : <Skeleton width={240} height={19} />}
          <Skeleton width={320} height={25} />
          {Array.from({ length: shape.desc }, (_, i) => (
            <Skeleton key={i} width={i === shape.desc - 1 ? 360 : 496} height={19} />
          ))}
        </div>
        <div className="page-header__tools">
          {shape.tools?.map(([w, h, radius], i) => (
            <Skeleton key={`t-${i}`} width={w} height={h} radius={radius === 'pill' ? 'var(--r-pill)' : 'var(--r-sm)'} />
          ))}
        </div>
        {shape.stacked && shape.toolbar ? (
          <div className="page-header__toolbar">
            {shape.toolbar.map(([w, h, radius], i) => (
              <Skeleton key={`tb-${i}`} width={w} height={h} radius={radius === 'pill' ? 'var(--r-pill)' : 'var(--r-sm)'} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="metric-strip" style={{ marginBottom: 'var(--s-6)' }}>
        <Skeleton height={shape.strip} radius="var(--r-lg)" card />
      </div>
      <div className="bento">
        {shape.bento.map(([span, height], i) => (
          <div key={i} style={{ gridColumn: `span ${span}` }}>
            <Skeleton height={height} radius="var(--r-lg)" card />
          </div>
        ))}
      </div>
    </div>
  );
}

const BREADCRUMBS = {
  '/': [{ label: 'Dashboard' }],
  '/agenda': [{ label: 'Agenda' }],
  '/pacientes': [{ label: 'Pacientes' }],
  '/documentos': [{ label: 'Documentos clínicos' }],
  '/comunicacao': [{ label: 'Comunicação' }],
  '/financeiro': [{ label: 'Financeiro' }],
  '/operacoes': [{ label: 'Operações' }],
  '/relatorios': [{ label: 'Relatórios' }],
  '/auditoria': [{ label: 'Auditoria' }],
  '/configuracoes': [{ label: 'Configurações' }],
};

function AuthenticatedApp() {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useBaselineRhythm(location.pathname);

  // ⌘K / Ctrl+K abre a busca global de qualquer lugar do painel.
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const base = `/${location.pathname.split('/')[1] ?? ''}`;
  const breadcrumb = BREADCRUMBS[base === '/' ? '/' : base] ?? [];

  return (
    <>
      <Shell breadcrumb={breadcrumb} onSearch={() => setPaletteOpen(true)}>
        {/* A fronteira fica dentro do Shell e é recriada a cada rota: uma tela
            que quebra não leva junto a navegação, o cabeçalho nem o histórico —
            e sair dela já a reinicia. */}
        <ErrorBoundary key={location.pathname} scope={location.pathname}>
          <Suspense fallback={<RouteFallback />}>
            <div className="route-view">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/agenda/*" element={<Agenda />} />
                <Route path="/pacientes" element={<Patients />} />
                <Route path="/pacientes/:id/*" element={<PatientRecord />} />
                <Route path="/documentos/*" element={<Documents />} />
                <Route path="/comunicacao/*" element={<Communication />} />
                <Route path="/financeiro/*" element={<Finance />} />
                <Route path="/operacoes/*" element={<Operations />} />
                <Route path="/relatorios/*" element={<Reports />} />
                <Route path="/auditoria/*" element={<Audit />} />
                <Route path="/configuracoes/*" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Suspense>
        </ErrorBoundary>
      </Shell>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <StepUpDialog />
      <IdleWarning />
    </>
  );
}

function Gate() {
  const { status } = useSession();
  const [setupDone, setSetupDone] = useState(false);

  if (status === 'loading') {
    return (
      <div className="boot" role="status" aria-live="polite">
        <span className="boot__spinner" aria-hidden="true" />
        <span className="sr-only">Carregando o painel</span>
      </div>
    );
  }

  if (status === 'setup' && !setupDone) {
    return <SetupWizard onComplete={() => setSetupDone(true)} />;
  }

  if (status === 'locked') return <LockedScreen />;
  if (status !== 'active') return <LoginScreen />;

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <HashRouter>
      <SessionProvider>
        <ToastProvider>
          {/* Último anteparo: se a falha for antes do Shell (login, setup,
              bloqueio), ainda assim o usuário vê uma explicação, não um branco. */}
          <ErrorBoundary scope="app">
            <Gate />
          </ErrorBoundary>
        </ToastProvider>
      </SessionProvider>
    </HashRouter>
  );
}
