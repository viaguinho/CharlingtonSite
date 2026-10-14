import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../core/session.jsx';
import { Card, CardHeader, CardBody } from '../components/Card.jsx';
import { Button } from '../components/primitives.jsx';
import { ConfirmDialog, useToast } from '../components/Overlay.jsx';
import Icon from '../components/Icon.jsx';
import { loadDemoData, removeDemoData, demoCounts, hasDemoData, DEMO_EVENT } from './demo-data.js';

/** Cartão de Configurações: carrega e remove a base de demonstração. Só existe em desenvolvimento, modo local. */
export default function DemoDataCard() {
  const { user, plaza } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [counts, setCounts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const refresh = useCallback(async () => {
    const present = await hasDemoData();
    setLoaded(present);
    setCounts(present ? await demoCounts() : null);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(DEMO_EVENT, refresh);
    return () => window.removeEventListener(DEMO_EVENT, refresh);
  }, [refresh]);

  async function load() {
    setBusy(true);
    try {
      const result = await loadDemoData({ userId: user?.id ?? null, plaza });
      toast.success(`Dados de demonstração carregados: ${result.pacientes} pacientes, ${result.agendamentos} consultas.`);
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Não foi possível carregar os dados de demonstração.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const { removidos } = await removeDemoData();
      toast.success(`Dados de demonstração removidos (${removidos} registros).`);
      setConfirming(false);
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Não foi possível remover os dados de demonstração.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card span={12} className="bento-full">
      <CardHeader
        eyebrow="Ambiente de desenvolvimento"
        title="Dados de demonstração"
        subtitle="Pacientes, agenda, evolução, financeiro, consentimentos e documentos inventados, só neste navegador, para você conhecer e editar todos os recursos. Nada disso vai para o servidor."
      />
      <CardBody>
        {loaded && counts ? (
          <p className="form-note">
            <Icon name="info" size={13} />
            Carregados: {counts.pacientes} pacientes, {counts.agendamentos} consultas, {counts.lancamentos} lançamentos e {counts.documentos} documentos.
            Você pode editá-los à vontade. Ao remover, saem também as evoluções, documentos, consentimentos e lançamentos que você ligar a esses pacientes.
          </p>
        ) : (
          <p className="form-note">
            <Icon name="info" size={13} />
            Nenhum dado de demonstração carregado. Registros que você criar à mão não são afetados pela remoção.
          </p>
        )}
        <div className="demo-actions">
          {loaded ? (
            <Button variant="danger" icon="trash" onClick={() => setConfirming(true)} disabled={busy}>Remover dados de demonstração</Button>
          ) : (
            <Button variant="primary" icon="plus" onClick={load} loading={busy}>Carregar dados de demonstração</Button>
          )}
        </div>
      </CardBody>
      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
        loading={busy}
        title="Remover dados de demonstração?"
        message="Apaga os pacientes, a agenda, os lançamentos e os documentos de demonstração, inclusive o que você tenha editado ou ligado a eles. Registros criados por você sem vínculo com esses pacientes permanecem."
        confirmLabel="Remover"
      />
    </Card>
  );
}
