import { useMemo } from 'react';
import { MILESTONE_STATUS } from '../../../data/schema.js';
import { MILESTONES } from '../../../data/milestones.js';
import Icon from '../../../components/Icon.jsx';
import { date, relative } from '../../../core/format.js';
import { ScaleCard } from './ScaleCard.jsx';

/**
 * Marcos avaliados: o último registro de cada marco do catálogo, sem os que
 * voltaram a "Não avaliado". Marco sem registro nunca é atraso. É o mesmo
 * conjunto que o painel de Marcos lista e que a pílula conta.
 */
export function recordedMilestones(milestones) {
  const catalog = new Set(MILESTONES.map((m) => m.id));
  const latestById = new Map();
  for (const m of milestones) {
    if (!catalog.has(m.marcoId)) continue;
    const prev = latestById.get(m.marcoId);
    if (!prev || (m.observadoEm ?? '') > (prev.observadoEm ?? '')) latestById.set(m.marcoId, m);
  }
  return [...latestById.values()].filter((m) => m.status && m.status !== MILESTONE_STATUS.NOT_ASSESSED);
}

/**
 * Coluna direita — a grade de "biomarcadores" da referência, com o que o
 * prontuário mede de fato: escalas aplicadas, medicações em uso e marcos.
 */
export function InsightsColumn({ scales, medications, milestones, onGoToSection, canWrite }) {
  const byInstrument = useMemo(() => {
    const map = new Map();
    for (const record of scales) {
      if (!map.has(record.instrumentoId)) map.set(record.instrumentoId, []);
      map.get(record.instrumentoId).push(record);
    }
    for (const list of map.values()) list.sort((a, b) => (a.aplicadaEm ?? '').localeCompare(b.aplicadaEm ?? ''));
    // O instrumento aplicado mais recentemente primeiro.
    return [...map.entries()].sort((a, b) =>
      (b[1][b[1].length - 1].aplicadaEm ?? '').localeCompare(a[1][a[1].length - 1].aplicadaEm ?? ''));
  }, [scales]);

  const active = medications
    .filter((m) => !m.suspensaEm)
    .sort((a, b) => (b.iniciadaEm ?? '').localeCompare(a.iniciadaEm ?? ''));

  const recorded = recordedMilestones(milestones);
  const tally = {
    atingido: recorded.filter((m) => m.status === MILESTONE_STATUS.ACHIEVED).length,
    emergente: recorded.filter((m) => m.status === MILESTONE_STATUS.EMERGING).length,
    atrasado: recorded.filter((m) => m.status === MILESTONE_STATUS.DELAYED).length,
  };
  const lastMilestone = [...recorded].sort((a, b) => (b.observadoEm ?? '').localeCompare(a.observadoEm ?? ''))[0];

  return (
    <aside className="pr-insights" aria-label="Medidas e tratamento">
      <section className="pr-insights__scales" aria-labelledby="pr-scales-title">
        <div className="pr-insights__head">
          <h2 id="pr-scales-title">Escalas</h2>
          {/* "Abrir" só navega: quem abre o formulário é "Aplicar escala" (create: false explícito). */}
          <button type="button" className="pr-link" onClick={() => onGoToSection('escalas', { create: false })}>
            {byInstrument.length ? 'Ver todas' : 'Abrir'}
            <Icon name="arrow-up-right" size={14} />
          </button>
        </div>
        {byInstrument.length ? (
          <div className="pr-scales">
            {byInstrument.map(([id, applications]) => (
              <ScaleCard key={id} instrumentId={id} applications={applications} onOpen={() => onGoToSection('escalas')} />
            ))}
          </div>
        ) : (
          <div className="pr-card pr-empty-card">
            <p className="pr-empty">Nenhuma escala aplicada. A evolução de cada instrumento aparece aqui depois da primeira aplicação.</p>
            {canWrite ? (
              <button type="button" className="pr-action" onClick={() => onGoToSection('escalas', { create: true })}>
                <Icon name="plus" size={16} /> Aplicar escala
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="pr-card pr-meds" aria-labelledby="pr-meds-title">
        <div className="pr-insights__head">
          <h2 id="pr-meds-title">Medicações em uso</h2>
          {!active.length && canWrite ? (
            <button type="button" className="pr-link" onClick={() => onGoToSection('medicacoes', { create: true })}>
              Registrar <Icon name="plus" size={14} />
            </button>
          ) : (
            <button type="button" className="pr-link" onClick={() => onGoToSection('medicacoes')}>
              Abrir <Icon name="arrow-up-right" size={14} />
            </button>
          )}
        </div>
        {active.length ? (
          <ul className="pr-meds__list">
            {active.map((m) => (
              <li key={m.id}>
                <span className="pr-meds__icon" aria-hidden="true"><Icon name="pill" size={14} /></span>
                <span>
                  <strong>{m.principioAtivo || m.nome}</strong>
                  <span>{[m.concentracao, m.posologia].filter(Boolean).join(' · ')}</span>
                  {m.iniciadaEm ? <span className="pr-meds__since">Desde {date(m.iniciadaEm)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          // Ausência de registro não é ausência de medicação: a frase diz o que
          // o sistema sabe e pede a confirmação.
          <p className="pr-empty">Nenhuma medicação registrada. Confirme com o responsável antes de prescrever.</p>
        )}
      </section>

      <section className="pr-card pr-milestones" aria-labelledby="pr-ms-title">
        <div className="pr-insights__head">
          <h2 id="pr-ms-title">Marcos do desenvolvimento</h2>
          {!recorded.length && canWrite ? (
            <button type="button" className="pr-link" onClick={() => onGoToSection('marcos', { create: true })}>
              Registrar <Icon name="plus" size={14} />
            </button>
          ) : (
            <button type="button" className="pr-link" onClick={() => onGoToSection('marcos')}>
              Abrir <Icon name="arrow-up-right" size={14} />
            </button>
          )}
        </div>
        {recorded.length ? (
          <>
            <dl className="pr-milestones__tally">
              <div className="is-low"><dt>Atingidos</dt><dd className="num">{tally.atingido}</dd></div>
              <div className="is-mid"><dt>Emergentes</dt><dd className="num">{tally.emergente}</dd></div>
              <div className="is-high"><dt>Atrasados</dt><dd className="num">{tally.atrasado}</dd></div>
            </dl>
            {lastMilestone ? (
              <p className="pr-milestones__last">
                Último registro: <strong>{lastMilestone.marco}</strong> · {relative(lastMilestone.observadoEm)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="pr-empty">Nenhum marco avaliado ainda. Marco sem registro não conta como atraso.</p>
        )}
      </section>
    </aside>
  );
}
