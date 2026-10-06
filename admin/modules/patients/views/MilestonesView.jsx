import { useMemo, useState } from 'react';
import * as repo from '../../../data/repository.js';
import { STORES, DEVELOPMENT_DOMAINS, DEVELOPMENT_DOMAIN_LABELS, MILESTONE_STATUS } from '../../../data/schema.js';
import { MILESTONES, AGE_BANDS } from '../../../data/milestones.js';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, Chip } from '../../../components/primitives.jsx';
import { useToast } from '../../../components/Overlay.jsx';
import { Tabs } from '../../../components/Tabs.jsx';
import Icon from '../../../components/Icon.jsx';
import { age } from '../../../core/format.js';

/**
 * Marcos do desenvolvimento.
 *
 * Grade de domínio × faixa etária. Um marco fica em atenção quando a criança
 * já passou da idade-limite e ele ainda não foi registrado como atingido —
 * o sistema só sinaliza; quem interpreta é o médico.
 */

const STATUS_ORDER = [
  MILESTONE_STATUS.ACHIEVED,
  MILESTONE_STATUS.EMERGING,
  MILESTONE_STATUS.DELAYED,
  MILESTONE_STATUS.NOT_ASSESSED,
];

const STATUS_META = {
  [MILESTONE_STATUS.ACHIEVED]: { label: 'Atingido', tone: 'success', icon: 'check' },
  [MILESTONE_STATUS.EMERGING]: { label: 'Emergente', tone: 'warning', icon: 'trending-up' },
  [MILESTONE_STATUS.DELAYED]: { label: 'Atrasado', tone: 'danger', icon: 'alert-triangle' },
  [MILESTONE_STATUS.NOT_ASSESSED]: { label: 'Não avaliado', tone: 'neutral', icon: 'minus' },
};

/** Idade esperada do marco mais tardio cadastrado — a grade não vai além dela. */
const MILESTONE_COVERAGE_MONTHS = Math.max(...MILESTONES.map((m) => m.idadeEsperada));
const MILESTONE_LIMIT_MONTHS = Math.max(...MILESTONES.map((m) => m.idadeLimite));

export function MilestonesView({ patient, milestones, reload, onGoToSection }) {
  const toast = useToast();
  const [domain, setDomain] = useState('all');
  const [saving, setSaving] = useState(null);
  const [showGrid, setShowGrid] = useState(false);

  const months = patient.dataNascimento ? age(patient.dataNascimento).totalMonths : null;
  // Acima da idade-limite do marco mais tardio, a grade não se aplica: os
  // marcos sem registro são histórico, não pendência a perguntar.
  const beyond = months != null && months > MILESTONE_LIMIT_MONTHS;

  const recorded = useMemo(() => {
    const map = new Map();
    for (const m of milestones) map.set(m.marcoId, m);
    return map;
  }, [milestones]);

  const visible = useMemo(
    () => MILESTONES.filter((m) => domain === 'all' || m.dominio === domain),
    [domain],
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const band of AGE_BANDS) {
      const items = visible.filter((m) => m.idadeEsperada >= band.from && m.idadeEsperada <= band.to);
      if (items.length) map.set(band, items);
    }
    return map;
  }, [visible]);

  /**
   * Ausência de registro NÃO é atraso.
   *
   * A versão anterior devolvia `DELAYED` para todo marco cuja idade-limite já
   * tinha passado sem registro — e um paciente recém-cadastrado abria o
   * prontuário exibindo "38 atrasados" em vermelho, achado clínico fabricado
   * a partir de banco vazio. Num prontuário isso é pior do que feio: é o
   * sistema afirmando um diagnóstico de neurodesenvolvimento que ninguém
   * avaliou. Sem registro, o marco é `NOT_ASSESSED`, ponto.
   */
  function statusOf(milestone) {
    return recorded.get(milestone.id)?.status ?? MILESTONE_STATUS.NOT_ASSESSED;
  }

  /** Marco já vencido e ainda sem avaliação — é convite a avaliar, não achado. */
  // A avaliar: passou da idade ESPERADA e não tem registro — o que o aviso
  // diz. A regra antiga usava a idade limite e deixava "Anda sem apoio" (esperado
  // aos 13m) fora da conta aos 16 meses, justamente numa criança com atraso.
  function pendenteDeAvaliacao(milestone) {
    return months != null
      && !beyond
      && months > milestone.idadeEsperada
      && !recorded.has(milestone.id);
  }
  const passouDoLimite = (milestone) => pendenteDeAvaliacao(milestone) && months > milestone.idadeLimite;

  async function cycle(milestone) {
    const current = recorded.get(milestone.id);
    const index = STATUS_ORDER.indexOf(current?.status ?? MILESTONE_STATUS.NOT_ASSESSED);
    const next = STATUS_ORDER[(index + 1) % STATUS_ORDER.length];

    setSaving(milestone.id);
    try {
      if (current) {
        await repo.update(STORES.MILESTONES, current.id, {
          status: next,
          observadoEm: new Date().toISOString(),
        });
      } else {
        await repo.create(STORES.MILESTONES, {
          pacienteId: patient.id,
          marcoId: milestone.id,
          marco: milestone.marco,
          dominio: milestone.dominio,
          idadeEsperada: milestone.idadeEsperada,
          status: next,
          observadoEm: new Date().toISOString(),
        });
      }
      reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(null);
    }
  }

  const summary = useMemo(() => {
    const counts = { atingido: 0, emergente: 0, atrasado: 0, nao_avaliado: 0 };
    for (const milestone of MILESTONES) counts[statusOf(milestone)] += 1;
    return counts;
  }, [recorded, months]);

  const porAvaliar = MILESTONES.filter(pendenteDeAvaliacao);
  const alemDoLimite = porAvaliar.filter(passouDoLimite);

  return (
    <Card variant="flush">
      <CardHeader
        title="Marcos do desenvolvimento"
        subtitle={months != null ? `Idade atual: ${age(patient.dataNascimento).label}` : 'Data de nascimento não informada'}
        actions={
          <Tabs
            variant="underline"
            value={domain}
            onChange={setDomain}
            ariaLabel="Filtrar por domínio"
            items={[
              { value: 'all', label: 'Todos' },
              ...Object.values(DEVELOPMENT_DOMAINS).map((d) => ({ value: d, label: DEVELOPMENT_DOMAIN_LABELS[d] })),
            ]}
          />
        }
      />
      <CardBody>
        {months != null && beyond && !showGrid ? (
          <EmptyState
            icon="baby"
            title={`A grade de marcos vai até ${Math.floor(MILESTONE_LIMIT_MONTHS / 12)} anos e ${MILESTONE_LIMIT_MONTHS % 12} meses`}
            description={`Para ${age(patient.dataNascimento).label}, o desenvolvimento se acompanha pelas escalas e instrumentos. ${summary.nao_avaliado ? `Os ${summary.nao_avaliado} marcos sem registro não são pendência: a grade fica como histórico.` : 'A grade fica como histórico.'}`}
            action={(
              <div className="empty__actions">
                {onGoToSection ? <Button variant="primary" icon="clipboard" onClick={() => onGoToSection('escalas')}>Abrir escalas</Button> : null}
                <Button variant="secondary" onClick={() => setShowGrid(true)}>Ver a grade como histórico</Button>
              </div>
            )}
          />
        ) : months == null ? (
          <EmptyState
            icon="baby"
            title="Informe a data de nascimento"
            description="A grade de marcos precisa da idade da criança para indicar o que é esperado em cada fase."
          />
        ) : (
          <>
            <div className="milestone-summary">
              {STATUS_ORDER.map((status) => (
                // A legenda é a mesma marca da grade — forma, cor e ícone.
                // Contagem zero não leva a cor do estado: um triângulo vermelho ao
                // lado de "Atrasado 0" era alarme decorativo.
                <span key={status} className={`milestone-summary__item milestone--${summary[status] ? STATUS_META[status].tone : 'neutral'}`}>
                  <span className="milestone__mark" aria-hidden="true"><Icon name={STATUS_META[status].icon} size={12} /></span>
                  {STATUS_META[status].label}
                  <strong className="num">{summary[status]}</strong>
                </span>
              ))}
            </div>

            {beyond ? (
              <div className="milestone-alert milestone-alert--info">
                <Icon name="info" size={15} />
                <p>
                  <strong>Grade como histórico.</strong>{' '}
                  Para {age(patient.dataNascimento).label} não há faixa esperada: nenhum marco sem registro é pendência, e "Atrasado 0" não quer dizer desenvolvimento em dia.
                </p>
              </div>
            ) : null}

            {porAvaliar.length ? (
              <div className="milestone-alert milestone-alert--info">
                <Icon name="info" size={15} />
                <p>
                  <strong>{porAvaliar.length} {porAvaliar.length === 1 ? 'marco ainda não avaliado já passou' : 'marcos ainda não avaliados já passaram'} da idade esperada</strong>
                  {alemDoLimite.length < porAvaliar.length
                    ? `, ${porAvaliar.length - alemDoLimite.length} ${porAvaliar.length - alemDoLimite.length === 1 ? 'deles ainda está' : 'deles ainda estão'} dentro da idade limite`
                    : ''}.{' '}
                  Não avaliado não é atraso — é o que falta perguntar na próxima consulta.
                </p>
              </div>
            ) : null}

            <div className="milestone-grid">
              {Array.from(grouped.entries()).map(([band, items]) => (
                <section key={band.id} className={`milestone-band ${months >= band.from && months <= band.to ? 'is-current' : ''}`}>
                  <h4 className="milestone-band__title">
                    {band.label}
                    {months >= band.from && months <= band.to ? <Chip tone="info">idade atual</Chip> : null}
                  </h4>
                  <ul>
                    {items.map((milestone) => {
                      const status = statusOf(milestone);
                      const meta = STATUS_META[status];
                      const pendente = pendenteDeAvaliacao(milestone);
                      return (
                        <li key={milestone.id}>
                          <button
                            type="button"
                            className={`milestone milestone--${meta.tone} ${pendente ? 'is-pending' : ''}`}
                            onClick={() => cycle(milestone)}
                            disabled={saving === milestone.id}
                            aria-label={`${milestone.marco}: ${meta.label}. Clique para alterar.`}
                          >
                            <span className="milestone__mark"><Icon name={meta.icon} size={12} /></span>
                            <span className="milestone__text">
                              <strong>{milestone.marco}</strong>
                              <span>
                                {/* A idade limite fica visível: o aviso fala dela e o leitor confere. */}
                                {DEVELOPMENT_DOMAIN_LABELS[milestone.dominio]} · esperado aos {milestone.idadeEsperada}m · limite {milestone.idadeLimite}m
                                {pendente ? ' · a avaliar' : ''}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            <p className="milestone-hint">
              <Icon name="info" size={13} />
              Clique em um marco para alternar entre atingido, emergente, atrasado e não avaliado.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}

export default MilestonesView;
