import { useMemo, useState } from 'react';
import * as repo from '../../../data/repository.js';
import {
  STORES, CONSENT_PURPOSES, CONSENT_PURPOSE_LABELS, LEGAL_BASIS,
} from '../../../data/schema.js';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, Chip } from '../../../components/primitives.jsx';
import { ConfirmDialog, useToast } from '../../../components/Overlay.jsx';
import Icon from '../../../components/Icon.jsx';
import { dateTime } from '../../../core/format.js';
import { ACTIONS } from '../../../core/audit.js';

/**
 * Consentimentos LGPD.
 *
 * Dado de saúde de criança é a combinação mais protegida da LGPD: art. 11
 * (dado sensível) somado ao art. 14 (criança e adolescente, que exige
 * consentimento específico e em destaque de ao menos um dos pais ou
 * responsável legal).
 *
 * O atendimento clínico em si se apoia na tutela da saúde (art. 11, II, "f")
 * e não depende de consentimento — mas mandar WhatsApp, e-mail, usar imagem
 * ou incluir em pesquisa depende, e cada uma dessas finalidades tem seu
 * próprio registro, com data, versão do texto e possibilidade de revogação
 * a qualquer momento.
 */

const PURPOSES = [
  {
    id: CONSENT_PURPOSES.CLINICAL,
    basis: LEGAL_BASIS.HEALTH_PROTECTION,
    description: 'Registro em prontuário, avaliação, diagnóstico e tratamento. Dispensa consentimento por ser tutela da saúde, mas o responsável deve ser informado.',
    revogavel: false,
  },
  {
    id: CONSENT_PURPOSES.WHATSAPP,
    basis: LEGAL_BASIS.GUARDIAN_CONSENT,
    description: 'Lembretes de consulta, confirmações e aviso de documento disponível. Nenhum dado clínico é enviado no corpo da mensagem.',
    revogavel: true,
  },
  {
    id: CONSENT_PURPOSES.EMAIL,
    basis: LEGAL_BASIS.GUARDIAN_CONSENT,
    description: 'Envio de documentos por link autenticado e comunicações administrativas.',
    revogavel: true,
  },
  {
    id: CONSENT_PURPOSES.TELEMEDICINE,
    basis: LEGAL_BASIS.GUARDIAN_CONSENT,
    description: 'Atendimento por teleconsulta, conforme a Resolução CFM 2.314/2022.',
    revogavel: true,
  },
  {
    id: CONSENT_PURPOSES.IMAGE,
    basis: LEGAL_BASIS.GUARDIAN_CONSENT,
    description: 'Registro fotográfico ou em vídeo para fins de acompanhamento clínico.',
    revogavel: true,
  },
  {
    id: CONSENT_PURPOSES.RESEARCH,
    basis: LEGAL_BASIS.GUARDIAN_CONSENT,
    description: 'Uso de dados anonimizados em pesquisa acadêmica, sem identificação da criança.',
    revogavel: true,
  },
];

const TEXT_VERSION = '1.0';

export function ConsentsView({ patient, guardians, consents, appointments = [], reload }) {
  const toast = useToast();
  const [revoking, setRevoking] = useState(null);
  const [busy, setBusy] = useState(null);

  const current = useMemo(() => {
    const map = new Map();
    for (const consent of consents) {
      const existing = map.get(consent.finalidade);
      if (!existing || consent.criadoEm > existing.criadoEm) map.set(consent.finalidade, consent);
    }
    return map;
  }, [consents]);

  const guardian = guardians[0];

  const teleWithoutConsent = useMemo(() => {
    return appointments
      .filter((a) => a.tipo === 'teleconsulta' && a.status === 'concluido' && (!current.get(CONSENT_PURPOSES.TELEMEDICINE) || current.get(CONSENT_PURPOSES.TELEMEDICINE).revogadoEm || current.get(CONSENT_PURPOSES.TELEMEDICINE).concedidoEm > a.inicio))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [appointments, current]);

  const sortedPurposes = useMemo(() => {
    const list = [...PURPOSES];
    const teleIdx = list.findIndex(p => p.id === CONSENT_PURPOSES.TELEMEDICINE);
    if (teleIdx >= 0 && teleWithoutConsent.length > 0) {
      const [tele] = list.splice(teleIdx, 1);
      list.unshift(tele);
    }
    return list;
  }, [teleWithoutConsent.length]);

  async function grant(purpose) {
    if (!guardian && purpose.basis.requiresConsent) {
      toast.error('Cadastre o responsável legal antes de registrar o consentimento.');
      return;
    }

    setBusy(purpose.id);
    try {
      await repo.create(STORES.CONSENTS, {
        pacienteId: patient.id,
        titularId: patient.id,
        responsavelId: guardian?.id ?? null,
        finalidade: purpose.id,
        baseLegal: purpose.basis.id,
        versaoTexto: TEXT_VERSION,
        textoApresentado: `${CONSENT_PURPOSE_LABELS[purpose.id]} — ${purpose.description}`,
        concedidoEm: new Date().toISOString(),
        revogadoEm: null,
      }, {
        auditAction: ACTIONS.CONSENT_GIVEN,
        auditDetail: `${CONSENT_PURPOSE_LABELS[purpose.id]} · versão ${TEXT_VERSION} · responsável ${guardian?.nome || 'N/A'}`
      });
      toast.success(purpose.basis.requiresConsent ? 'Consentimento registrado.' : 'Registro de informação ao responsável salvo.');
      reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    setBusy(revoking.finalidade);
    try {
      await repo.update(STORES.CONSENTS, revoking.id, { revogadoEm: new Date().toISOString() }, {
        auditAction: ACTIONS.CONSENT_REVOKED,
        auditDetail: `${CONSENT_PURPOSE_LABELS[revoking.finalidade]} · versão ${revoking.versaoTexto}`
      });
      toast.success('Consentimento revogado. A finalidade correspondente fica bloqueada imediatamente.');
      setRevoking(null);
      reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Card variant="flush">
        <CardHeader
          title="Consentimentos"
          subtitle={guardian ? `Titular: ${patient.nome} · Responsável: ${guardian.nome}` : 'Responsável legal não cadastrado'}
        />
        <CardBody>
          {!guardian ? (
            <div className="consent-warning">
              <Icon name="alert-triangle" size={15} />
              <p>
                <strong>Responsável legal não cadastrado.</strong> O art. 14 da LGPD exige
                consentimento específico de ao menos um dos pais ou responsável para o
                tratamento de dados de criança. Complete a ficha antes de registrar
                consentimentos.
              </p>
            </div>
          ) : null}

          <ul className="consents">
            {sortedPurposes.map((purpose) => {
              const record = current.get(purpose.id);
              const active = record && !record.revogadoEm;
              const violation = purpose.id === CONSENT_PURPOSES.TELEMEDICINE && teleWithoutConsent.length > 0 && (!record || record.revogadoEm);

              return (
                <li key={purpose.id} className={`consent ${active ? 'is-active' : ''} ${violation ? 'consent--violation' : ''}`}>
                  <div className="consent__text">
                    <div className="consent__head">
                      <strong>{CONSENT_PURPOSE_LABELS[purpose.id]}</strong>
                      <Chip tone={purpose.basis.requiresConsent ? (violation ? 'danger' : 'warning') : 'info'}>
                        {purpose.basis.label}
                      </Chip>
                    </div>
                    {violation ? (
                      <div style={{ marginTop: 8, marginBottom: 8 }}>
                        <Chip tone="danger" icon="alert-triangle" wrap>
                          Atenção: {teleWithoutConsent.length} {teleWithoutConsent.length === 1 ? 'atendimento já realizado' : 'atendimentos já realizados'} sem base legal registrada (desde {dateTime(teleWithoutConsent[0].inicio)})
                        </Chip>
                      </div>
                    ) : null}
                    <p>{purpose.description}</p>
                    {record ? (
                      <span className="consent__meta">
                        {active
                          ? (purpose.basis.requiresConsent 
                              ? `Concedido em ${dateTime(record.concedidoEm)} · versão ${record.versaoTexto}`
                              : `Responsável informado em ${dateTime(record.concedidoEm)} · versão ${record.versaoTexto}`)
                          : `Revogado em ${dateTime(record.revogadoEm)}`}
                      </span>
                    ) : null}
                  </div>

                  <div className="consent__action">
                    {!purpose.basis.requiresConsent && <Chip tone="info" style={{ marginRight: 8 }}>Base legal própria</Chip>}
                    
                    {active && !purpose.basis.requiresConsent ? (
                      // Base legal própria não se revoga: o que existe é um novo
                      // registro de que o responsável foi informado.
                      <Button
                        size="sm"
                        loading={busy === purpose.id}
                        disabled={!guardian}
                        onClick={() => grant(purpose)}
                      >
                        Registrar nova informação
                      </Button>
                    ) : active ? (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busy === purpose.id}
                        onClick={() => setRevoking(record)}
                      >
                        Revogar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busy === purpose.id}
                        disabled={!guardian}
                        onClick={() => grant(purpose)}
                      >
                        {purpose.basis.requiresConsent ? 'Registrar consentimento' : 'Registrar que o responsável foi informado'}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="consent-note">
            <Icon name="shield" size={13} />
            Cada concessão e cada revogação gera um registro imutável no log de
            auditoria, com data, usuário responsável pelo registro e a versão exata
            do texto apresentado à família.
          </p>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!revoking}
        onCancel={() => setRevoking(null)}
        onConfirm={revoke}
        loading={!!busy}
        title="Revogar este consentimento?"
        message="A finalidade correspondente é bloqueada imediatamente — o sistema deixa de enviar mensagens por esse canal. A revogação é um direito do titular e pode ser exercida a qualquer momento."
        confirmLabel="Revogar"
      />
    </>
  );
}

export default ConsentsView;
