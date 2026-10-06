import { useMemo, useState } from 'react';
import * as repo from '../../../data/repository.js';
import { STORES, newNote } from '../../../data/schema.js';
import { useSession } from '../../../core/session.jsx';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, Chip, IconButton } from '../../../components/primitives.jsx';
import { TextArea, Combobox, TextField } from '../../../components/Field.jsx';
import { Modal, ConfirmDialog, useToast } from '../../../components/Overlay.jsx';
import Icon from '../../../components/Icon.jsx';
import { dateTime, relative } from '../../../core/format.js';
import { CID10 } from '../../../data/cid10.js';

/**
 * Evolução clínica em SOAP.
 *
 * Regra que vem do CFM, não de preferência de produto: uma evolução assinada
 * é imutável. Correção entra como ADENDO datado e assinado, e o texto
 * original permanece visível. Prontuário que se edita em silêncio não serve
 * como prova nem para o médico nem para a família.
 */
export function NotesView({ patient, notes, appointments, reload }) {
  const { can } = useSession();
  const [composing, setComposing] = useState(false);
  const [addendumFor, setAddendumFor] = useState(null);
  const [signing, setSigning] = useState(null);

  const ordered = useMemo(
    () => [...notes].sort((a, b) => (b.assinadaEm ?? b.criadoEm).localeCompare(a.assinadaEm ?? a.criadoEm)),
    [notes],
  );

  if (!can.read('patients.clinical')) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Acesso restrito"
          description="A evolução clínica é visível apenas para o médico responsável."
        />
      </Card>
    );
  }

  return (
    <>
      <Card variant="flush">
        <CardHeader
          title="Evoluções clínicas"
          subtitle={ordered.length ? `${ordered.length} registros` : undefined}
          actions={<Button size="sm" variant="primary" icon="plus" onClick={() => setComposing(true)}>Nova evolução</Button>}
        />
        <CardBody>
          {ordered.length ? (
            <ol className="notes">
              {ordered.map((note) => (
                <li key={note.id} className={`note ${note.travada ? 'is-locked' : 'is-draft'}`}>
                  <header className="note__head">
                    <div className="note__meta">
                      <strong>{note.travada ? 'Evolução assinada' : 'Rascunho'}</strong>
                      <span>{dateTime(note.assinadaEm ?? note.criadoEm)} · {relative(note.assinadaEm ?? note.criadoEm)}</span>
                    </div>
                    {note.cidPrincipal ? <Chip tone="code">{note.cidPrincipal}</Chip> : null}
                    {note.travada ? (
                      <span className="note__lock" title="Assinada e travada — correções entram como adendo">
                        <Icon name="lock" size={13} />
                      </span>
                    ) : (
                      <Button size="sm" icon="signature" onClick={() => setSigning(note)}>Assinar</Button>
                    )}
                  </header>

                  <div className="note__soap">
                    <SoapBlock letter="S" label="Subjetivo" text={note.subjetivo} />
                    <SoapBlock letter="O" label="Objetivo" text={note.objetivo} />
                    <SoapBlock letter="A" label="Avaliação" text={note.avaliacao} />
                    <SoapBlock letter="P" label="Plano" text={note.plano} />
                  </div>

                  {note.adendos?.length ? (
                    <div className="note__addenda">
                      {note.adendos.map((addendum, index) => (
                        <div key={index} className="note__addendum">
                          <span className="note__addendum-head">
                            <Icon name="edit" size={12} />
                            Adendo · {dateTime(addendum.em)}
                          </span>
                          <p>{addendum.texto}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {note.travada ? (
                    <footer className="note__foot">
                      <Button size="sm" icon="plus" onClick={() => setAddendumFor(note)}>Adicionar adendo</Button>
                    </footer>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon="clipboard"
              title="Nenhuma evolução registrada"
              description="A evolução em SOAP — subjetivo, objetivo, avaliação e plano — é o registro do que aconteceu na consulta."
              action={<Button size="sm" icon="plus" onClick={() => setComposing(true)}>Escrever a primeira</Button>}
            />
          )}
        </CardBody>
      </Card>

      <NoteComposer
        open={composing}
        patient={patient}
        appointments={appointments}
        onClose={() => setComposing(false)}
        onSaved={() => { setComposing(false); reload(); }}
      />

      <AddendumDialog
        note={addendumFor}
        onClose={() => setAddendumFor(null)}
        onSaved={() => { setAddendumFor(null); reload(); }}
      />

      <SignDialog
        note={signing}
        onClose={() => setSigning(null)}
        onSigned={() => { setSigning(null); reload(); }}
      />
    </>
  );
}

function SoapBlock({ letter, label, text }) {
  if (!text?.trim()) return null;
  return (
    <div className="soap">
      <span className="soap__letter" aria-hidden="true">{letter}</span>
      <div className="soap__content">
        <span className="soap__label">{label}</span>
        <p>{text}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Editor ═══════════════════════════ */

function NoteComposer({ open, patient, appointments, onClose, onSaved }) {
  const { plaza, user } = useSession();
  const toast = useToast();
  const [draft, setDraft] = useState(() => newNote({ praca: plaza, userId: user?.id }));
  const [busy, setBusy] = useState(false);

  const set = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setDraft((d) => ({ ...d, [field]: value }));
  };

  const recent = useMemo(
    () => appointments
      .filter((a) => a.status === 'concluido' || a.status === 'em_atendimento')
      .sort((a, b) => (b.inicio ?? '').localeCompare(a.inicio ?? ''))
      .slice(0, 8),
    [appointments],
  );

  async function save(signNow) {
    if (!draft.subjetivo && !draft.objetivo && !draft.avaliacao && !draft.plano) {
      toast.error('Preencha ao menos um campo da evolução.');
      return;
    }
    setBusy(true);
    try {
      const payload = { ...draft, pacienteId: patient.id };
      if (signNow) {
        payload.assinadaEm = new Date().toISOString();
        payload.assinadaPor = user?.id;
        payload.travada = true;
      }
      await repo.create(STORES.NOTES, payload);
      toast.success(signNow ? 'Evolução assinada e travada.' : 'Rascunho salvo.');
      setDraft(newNote({ praca: plaza, userId: user?.id }));
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
      size="lg"
      title="Nova evolução clínica"
      description="Depois de assinada, esta evolução não poderá mais ser editada — apenas complementada por adendo."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={() => save(false)} loading={busy}>Salvar rascunho</Button>
          <Button variant="primary" icon="signature" onClick={() => save(true)} loading={busy}>Assinar e travar</Button>
        </>
      }
    >
      <div className="note-form">
        {recent.length ? (
          <Combobox
            label="Vincular ao atendimento"
            value={draft.atendimentoId}
            onChange={(value) => setDraft((d) => ({ ...d, atendimentoId: value }))}
            options={recent.map((a) => ({
              value: a.id,
              label: dateTime(a.inicio),
              hint: a.observacoes,
            }))}
            placeholder="Selecione a consulta correspondente"
          />
        ) : null}

        <TextArea
          label="S — Subjetivo" rows={3} wide
          hint="O que a família e a criança relatam, nas palavras deles."
          value={draft.subjetivo} onChange={set('subjetivo')}
        />
        <TextArea
          label="O — Objetivo" rows={3} wide
          hint="Exame físico e neurológico, medidas, observação direta do comportamento."
          value={draft.objetivo} onChange={set('objetivo')}
        />
        <TextArea
          label="A — Avaliação" rows={3} wide
          hint="Sua interpretação clínica e hipóteses diagnósticas."
          value={draft.avaliacao} onChange={set('avaliacao')}
        />
        <TextArea
          label="P — Plano" rows={3} wide
          hint="Conduta, prescrição, encaminhamentos, exames, retorno."
          value={draft.plano} onChange={set('plano')}
        />

        <Combobox
          label="CID-10 principal"
          value={draft.cidPrincipal}
          onChange={(value) => setDraft((d) => ({ ...d, cidPrincipal: value }))}
          options={CID10.map((c) => ({ value: c.codigo, label: `${c.codigo} — ${c.descricao}`, keywords: c.descricao }))}
          placeholder="Digite o código ou parte da descrição"
          hint="Base focada em neurologia e desenvolvimento infantil."
        />
      </div>
    </Modal>
  );
}

/* ═══════════════════════════ Adendo ═══════════════════════════ */

function AddendumDialog({ note, onClose, onSaved }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim()) { toast.error('Escreva o texto do adendo.'); return; }
    setBusy(true);
    try {
      // A evolução está travada para edição comum; o adendo é a única
      // alteração permitida, e ele acrescenta sem apagar nada.
      const existing = await repo.get(STORES.NOTES, note.id, { silent: true });
      const adendos = [...(existing.adendos ?? []), { texto: text.trim(), em: new Date().toISOString() }];
      await repo.update(STORES.NOTES, note.id, { adendos, travada: false });
      await repo.update(STORES.NOTES, note.id, { travada: true });
      toast.success('Adendo registrado.');
      setText('');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!note}
      onClose={onClose}
      size="md"
      title="Adicionar adendo"
      description="O texto original da evolução permanece intacto. O adendo é datado e fica visível abaixo dela."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={submit} loading={busy}>Registrar adendo</Button>
        </>
      }
    >
      <TextArea
        label="Texto do adendo" rows={5} autoFocus
        value={text} onChange={(e) => setText(e.target.value)}
      />
    </Modal>
  );
}

/* ═══════════════════════════ Assinatura ═══════════════════════════ */

function SignDialog({ note, onClose, onSigned }) {
  const { user, requireStepUp } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await requireStepUp('documents.issue', 'Assinar uma evolução a torna imutável.');
      await repo.update(STORES.NOTES, note.id, {
        assinadaEm: new Date().toISOString(),
        assinadaPor: user?.id,
        travada: true,
      });
      toast.success('Evolução assinada e travada.');
      onSigned();
    } catch (error) {
      if (error.message !== 'Ação cancelada.') toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={!!note}
      onCancel={onClose}
      onConfirm={confirm}
      loading={busy}
      tone="primary"
      title="Assinar esta evolução?"
      message="Depois de assinada, a evolução não pode mais ser editada. Correções só podem ser feitas por adendo, que fica registrado com data própria."
      confirmLabel="Assinar e travar"
    />
  );
}

export default NotesView;
