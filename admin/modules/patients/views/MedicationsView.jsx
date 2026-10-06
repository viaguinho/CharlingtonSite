import { useMemo, useState } from 'react';
import * as repo from '../../../data/repository.js';
import { STORES } from '../../../data/schema.js';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, IconButton } from '../../../components/primitives.jsx';
import { TextField, TextArea, FieldRow } from '../../../components/Field.jsx';
import { Modal, useToast } from '../../../components/Overlay.jsx';
import Icon from '../../../components/Icon.jsx';
import { date, relative, isoDay } from '../../../core/format.js';

/**
 * Medicações em uso e histórico.
 *
 * O alerta de alergia é calculado por correspondência simples de texto entre
 * o princípio ativo e as alergias declaradas na ficha. É um lembrete, não um
 * sistema de suporte à decisão: avisa, não bloqueia, e a responsabilidade
 * clínica continua sendo do médico.
 */
export function MedicationsView({ patient, medications, reload }) {
  const [composing, setComposing] = useState(false);
  const [suspending, setSuspending] = useState(null);

  const { active, past } = useMemo(() => ({
    active: medications
      .filter((m) => !m.suspensaEm)
      .sort((a, b) => (b.iniciadaEm ?? '').localeCompare(a.iniciadaEm ?? '')),
    past: medications
      .filter((m) => m.suspensaEm)
      .sort((a, b) => (b.suspensaEm ?? '').localeCompare(a.suspensaEm ?? '')),
  }), [medications]);

  const allergies = patient.clinico?.alergias ?? [];

  function allergyConflict(medication) {
    const needle = `${medication.principioAtivo ?? ''} ${medication.nome ?? ''}`.toLowerCase();
    return allergies.filter((a) => needle.includes(String(a).toLowerCase().trim()) && String(a).trim().length > 2);
  }

  return (
    <>
      <Card variant="flush">
        <CardHeader
          title="Medicações"
          subtitle={active.length ? `${active.length} em uso` : undefined}
          actions={<Button size="sm" variant="primary" icon="plus" onClick={() => setComposing(true)}>Registrar medicação</Button>}
        />
        <CardBody>
          {medications.length ? (
            <>
              <section className="meds">
                <h4 className="meds__title">Em uso</h4>
                {active.length ? (
                  <ul className="meds__list">
                    {active.map((medication) => {
                      const conflicts = allergyConflict(medication);
                      return (
                        <li key={medication.id} className={`med ${conflicts.length ? 'has-conflict' : ''}`}>
                          <span className="med__icon"><Icon name="pill" size={15} /></span>
                          <div className="med__text">
                            <strong>{medication.principioAtivo || medication.nome}</strong>
                            <span>{medication.concentracao} · {medication.posologia}</span>
                            <span className="med__since">Desde {date(medication.iniciadaEm)} · {relative(medication.iniciadaEm)}</span>
                            {conflicts.length ? (
                              <span className="med__conflict">
                                <Icon name="alert-triangle" size={12} />
                                Alergia declarada a {conflicts.join(', ')} — confirme antes de manter.
                              </span>
                            ) : null}
                          </div>
                          <IconButton name="minus" label="Suspender" onClick={() => setSuspending(medication)} />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="meds__empty">Nenhuma medicação em uso no momento.</p>
                )}
              </section>

              {past.length ? (
                <section className="meds">
                  <h4 className="meds__title">Histórico</h4>
                  <ul className="meds__list meds__list--past">
                    {past.map((medication) => (
                      <li key={medication.id} className="med med--past">
                        <span className="med__icon"><Icon name="history" size={15} /></span>
                        <div className="med__text">
                          <strong>{medication.principioAtivo || medication.nome}</strong>
                          <span>{medication.posologia}</span>
                          <span className="med__since">
                            {date(medication.iniciadaEm)} — {date(medication.suspensaEm)}
                            {medication.motivoSuspensao ? ` · ${medication.motivoSuspensao}` : ''}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon="pill"
              title="Nenhuma medicação registrada"
              description="Registre o que a criança usa para que apareça no painel de contexto durante a consulta e nas prescrições."
              action={<Button size="sm" icon="plus" onClick={() => setComposing(true)}>Registrar medicação</Button>}
            />
          )}
        </CardBody>
      </Card>

      <MedicationForm
        open={composing}
        patient={patient}
        onClose={() => setComposing(false)}
        onSaved={() => { setComposing(false); reload(); }}
      />

      <SuspendDialog
        medication={suspending}
        onClose={() => setSuspending(null)}
        onSaved={() => { setSuspending(null); reload(); }}
      />
    </>
  );
}

function MedicationForm({ open, patient, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);

  function blank() {
    return {
      principioAtivo: '', nome: '', concentracao: '', posologia: '',
      iniciadaEm: isoDay(), observacoes: '',
    };
  }

  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  async function save() {
    if (!form.principioAtivo.trim() && !form.nome.trim()) {
      toast.error('Informe o princípio ativo ou o nome comercial.');
      return;
    }
    if (!form.posologia.trim()) { toast.error('Informe a posologia.'); return; }

    setBusy(true);
    try {
      await repo.create(STORES.MEDICATIONS, { ...form, pacienteId: patient.id });
      toast.success('Medicação registrada.');
      setForm(blank());
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Registrar medicação"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={save} loading={busy}>Registrar</Button>
        </>
      }
    >
      <div className="med-form">
        <FieldRow>
          <TextField label="Princípio ativo" required autoFocus value={form.principioAtivo} onChange={set('principioAtivo')} />
          <TextField label="Nome comercial" value={form.nome} onChange={set('nome')} />
        </FieldRow>
        <FieldRow>
          <TextField label="Concentração" placeholder="Ex.: 1 mg/mL" value={form.concentracao} onChange={set('concentracao')} />
          <TextField label="Início do uso" type="date" value={form.iniciadaEm} onChange={set('iniciadaEm')} />
        </FieldRow>
        <TextField
          label="Posologia" required
          placeholder="Ex.: 0,5 mL pela manhã e 0,5 mL à noite"
          value={form.posologia} onChange={set('posologia')}
        />
        <TextArea label="Observações" rows={2} value={form.observacoes} onChange={set('observacoes')} />
      </div>
    </Modal>
  );
}

function SuspendDialog({ medication, onClose, onSaved }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await repo.update(STORES.MEDICATIONS, medication.id, {
        suspensaEm: new Date().toISOString(),
        motivoSuspensao: reason.trim() || null,
      });
      toast.success('Medicação suspensa. O registro permanece no histórico.');
      setReason('');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!medication}
      onClose={onClose}
      size="sm"
      title="Suspender medicação"
      description={medication ? `${medication.principioAtivo || medication.nome} sai da lista de uso atual, mas permanece no histórico do prontuário.` : ''}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={confirm} loading={busy}>Suspender</Button>
        </>
      }
    >
      <TextField
        label="Motivo da suspensão"
        placeholder="Ex.: efeito adverso, troca de esquema, alta"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Modal>
  );
}

export default MedicationsView;
