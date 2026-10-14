import { useCallback, useEffect, useState } from 'react';
import { Chip } from '../components/primitives.jsx';
import { hasDemoData, DEMO_EVENT } from './demo-data.js';

/** Aviso permanente no topo enquanto houver dados de demonstração: ninguém confunde com paciente real. */
export default function DemoBadge() {
  const [present, setPresent] = useState(false);
  const refresh = useCallback(() => { hasDemoData().then(setPresent); }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(DEMO_EVENT, refresh);
    return () => window.removeEventListener(DEMO_EVENT, refresh);
  }, [refresh]);

  return present ? (
    <Chip tone="warning" icon="alert-triangle" className="demo-badge" title="Dados de demonstração">
      <span className="demo-badge__text">Dados de demonstração</span>
    </Chip>
  ) : null;
}
