import { useEffect, useMemo, useState, useRef } from 'react';
import * as repo from '../../../data/repository.js';
import { STORES } from '../../../data/schema.js';
import { SCALES, SCALE_DOMAIN_LABELS, findScale, interpretScore, scalesForAge } from '../../../data/scales.js';
import { useSession } from '../../../core/session.jsx';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, Chip } from '../../../components/primitives.jsx';
import { Select, TextField, TextArea, FieldRow } from '../../../components/Field.jsx';
import { Modal, useToast } from '../../../components/Overlay.jsx';
import { AllergyNotice } from '../record/AllergyNotice.jsx';
import { RulerScale, LineChart } from '../../../charts/index.jsx';
import Icon from '../../../components/Icon.jsx';
import { date, relative, age, isoDay, timeOf } from '../../../core/format.js';

/**
 * Escalas e instrumentos.
 *
 * Duas leituras do mesmo dado: a posição do escore atual dentro da faixa de
 * corte (régua, REF 5) e a evolução do mesmo instrumento ao longo do tempo
 * (linha). Um escore isolado diz pouco; o que importa em neuropediatria é a
 * trajetória.
 */
export function ScalesView({ patient, scales, reload, intent = null }) {
  const [applying, setApplying] = useState(false);
  const [instrument, setInstrument] = useState(null);

  // "Aplicar escala" da visão geral chega aqui pedindo o formulário aberto.
  useEffect(() => { if (intent?.create) setApplying(true); }, [intent?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const byInstrument = useMemo(() => {
    const map = new Map();
    for (const record of scales) {
      if (!map.has(record.instrumentoId)) map.set(record.instrumentoId, []);
      map.get(record.instrumentoId).push(record);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (timeOf(a.aplicadaEm) ?? -Infinity) - (timeOf(b.aplicadaEm) ?? -Infinity));
    }
    return map;
  }, [scales]);

  const patientMonths = patient.dataNascimento ? age(patient.dataNascimento).totalMonths : null;
  const suggested = scalesForAge(patientMonths);

  return (
    <>
      <Card variant="flush">
        <CardHeader
          title="Escalas e instrumentos"
          subtitle={scales.length ? `${byInstrument.size} ${byInstrument.size === 1 ? 'instrumento aplicado' : 'instrumentos aplicados'}` : undefined}
          actions={<Button size="sm" variant="primary" icon="plus" onClick={() => setApplying(true)}>Registrar aplicação</Button>}
        />
        <CardBody>
          {byInstrument.size ? (
            <div className="scales">
              {Array.from(byInstrument.entries()).map(([id, applications]) => {
                const scale = findScale(id);
                const latest = applications[applications.length - 1];
                const band = interpretScore(id, latest.escore);
                if (!scale) {
                  // Instrumento que o catálogo não conhece (renomeado, removido ou importado): o painel mostra o que foi gravado.
                  return (
                    <article key={id} className="scale-card">
                      <header className="scale-card__head">
                        <div>
                          <h4>{latest.instrumento || 'Instrumento fora do catálogo'}</h4>
                          <p>{applications.length} {applications.length === 1 ? 'aplicação' : 'aplicações'} · fora do catálogo</p>
                        </div>
                        <div className="scale-card__score">
                          <span className="scale-card__value num">{latest.escore ?? '—'}</span>
                        </div>
                      </header>
                      {latest.interpretacao ? (
                        <p className="scale-card__conduct">
                          <Icon name="info" size={13} />
                          {latest.interpretacao}{latest.risco ? ` · risco ${latest.risco}` : ''}
                        </p>
                      ) : null}
                      <footer className="scale-card__foot">
                        <span>Aplicada {relative(latest.aplicadaEm)} · {latest.aplicadaPorNome || 'profissional não informado'}</span>
                      </footer>
                    </article>
                  );
                }

                return (
                  <article key={id} className="scale-card">
                    <header className="scale-card__head">
                      <div>
                        <h4>{scale.nome}</h4>
                        <p>{SCALE_DOMAIN_LABELS[scale.dominio]} · {applications.length} {applications.length === 1 ? 'aplicação' : 'aplicações'}</p>
                      </div>
                      <div className="scale-card__score">
                        <span className="scale-card__value num">{latest.escore}</span>
                        <span className="scale-card__max num">/{scale.escoreMax}</span>
                      </div>
                    </header>

                    <RulerScale
                      value={latest.escore}
                      min={scale.escoreMin}
                      max={scale.escoreMax}
                      tone={band?.tone ?? 'accent'}
                      label={band?.label}
                      bands={scale.bands.map((b) => ({ at: b.from, label: b.label }))}
                    />

                    {band?.conduta ? (
                      <p className="scale-card__conduct">
                        <Icon name="info" size={13} />
                        {band.conduta}
                      </p>
                    ) : null}

                    {applications.length > 1 ? (
                      <div className="scale-card__trend">
                        <LineChart
                          height={120}
                          title={`Evolução do escore em ${scale.nome}`}
                          valueLabel="Escore"
                          data={applications.map((a) => ({ label: date(a.aplicadaEm), value: a.escore }))}
                        />
                      </div>
                    ) : null}

                    <footer className="scale-card__foot">
                      <span>Aplicada {relative(latest.aplicadaEm)} · {latest.aplicadaPorNome || scale.aplicadoPor}</span>
                      <Button size="sm" onClick={() => { setInstrument(scale.id); setApplying(true); }}>
                        Reaplicar
                      </Button>
                    </footer>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="activity"
              title="Nenhum instrumento aplicado"
              description={
                suggested.length
                  ? `Para a idade desta criança, os instrumentos habituais são ${suggested.slice(0, 3).map((s) => s.nome).join(', ')}.`
                  : 'Registre a aplicação de um instrumento para acompanhar a evolução do escore ao longo do tempo.'
              }
              action={<Button size="sm" icon="plus" onClick={() => setApplying(true)}>Registrar aplicação</Button>}
            />
          )}
        </CardBody>
      </Card>

      <ApplyScaleModal
        open={applying}
        patient={patient}
        preselected={instrument}
        suggested={suggested}
        onClose={() => { setApplying(false); setInstrument(null); }}
        onSaved={() => { setApplying(false); setInstrument(null); reload(); }}
      />
    </>
  );
}

function ApplyScaleModal({ open, patient, preselected, suggested, onClose, onSaved }) {
  const { plaza, user } = useSession();
  const toast = useToast();

  const [scaleId, setScaleId] = useState(preselected ?? '');
  const [score, setScore] = useState('');
  const [appliedAt, setAppliedAt] = useState(isoDay());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const scale = findScale(scaleId);
  const band = scale && score !== '' ? interpretScore(scaleId, Number(score)) : null;

  async function save() {
    if (!scaleId) { toast.error('Selecione o instrumento.'); return; }
    if (score === '' || Number.isNaN(Number(score))) { toast.error('Informe o escore obtido.'); return; }
    if (Number(score) < scale.escoreMin || Number(score) > scale.escoreMax) {
      toast.error(`O escore de ${scale.nome} vai de ${scale.escoreMin} a ${scale.escoreMax}.`);
      return;
    }
    // Aplicação de uma data que ainda não chegou viraria "o escore atual" do card.
    if (!appliedAt || appliedAt > isoDay()) { toast.error('A data da aplicação não pode ser futura.'); return; }

    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await repo.create(STORES.SCALES, {
        pacienteId: patient.id,
        instrumentoId: scaleId,
        instrumento: scale.nome,
        escore: Number(score),
        escoreMaximo: scale.escoreMax,
        interpretacao: band?.label ?? null,
        risco: band?.tone === 'danger' ? 'alto' : band?.tone === 'warning' ? 'moderado' : 'baixo',
        aplicadaEm: appliedAt,
        aplicadaPorNome: user?.nome,
        observacoes: notes,
      });
      toast.success(`${scale.nome} registrada.`);
      setScore(''); setNotes('');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const options = SCALES.map((s) => ({
    value: s.id,
    label: suggested.some((x) => x.id === s.id) ? `${s.nome} — indicado para a idade` : s.nome,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Registrar aplicação de instrumento"
      description="Aplique o instrumento no material oficial e registre aqui o escore obtido."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={save} loading={busy}>Registrar</Button>
        </>
      }
    >
      <div className="scale-form">
        <AllergyNotice patient={patient} />
        <Select
          label="Instrumento" required value={scaleId}
          onChange={(e) => { setScaleId(e.target.value); setScore(''); }}
          placeholder="Selecione"
          options={options}
        />

        {scale ? (
          <>
            <p className="scale-form__info">
              <strong>{scale.nomeCompleto}</strong>
              <span>
                Faixa etária: {scale.idadeMinMeses} a {scale.idadeMaxMeses} meses ·
                Escore de {scale.escoreMin} a {scale.escoreMax} ·
                Aplicado por: {scale.aplicadoPor}
              </span>
            </p>

            {scale.nota ? (
              <p className="form-note">
                <Icon name="info" size={13} />
                {scale.nota}
              </p>
            ) : null}

            <FieldRow>
              <TextField
                label="Escore obtido" type="number" required
                min={scale.escoreMin} max={scale.escoreMax}
                value={score} onChange={(e) => setScore(e.target.value)}
              />
              <TextField
                label="Data de aplicação" type="date" required max={isoDay()}
                value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)}
              />
            </FieldRow>

            {band ? (
              <div className={`scale-form__result scale-form__result--${band.tone}`}>
                <Chip tone={band.tone === 'success' ? 'success' : band.tone === 'warning' ? 'warning' : 'danger'}>
                  {band.label}
                </Chip>
                {band.conduta ? <p>{band.conduta}</p> : null}
              </div>
            ) : null}

            <TextArea
              label="Observações da aplicação" rows={3}
              hint="Contexto, colaboração da criança, quem respondeu."
              value={notes} onChange={(e) => setNotes(e.target.value)}
            />
          </>
        ) : null}
      </div>
    </Modal>
  );
}

export default ScalesView;
