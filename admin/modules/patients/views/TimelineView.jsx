import { displayStatus, canReschedule, stateOf } from '../../../core/appointments.js';
import { useEffect, useMemo, useState } from 'react';
import { ORIGINS } from './AttachmentsView.jsx';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, Chip, CidCode } from '../../../components/primitives.jsx';
import { Tabs } from '../../../components/Tabs.jsx';
import Icon from '../../../components/Icon.jsx';
import {
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE,
  DOCUMENT_TYPE_LABELS,
} from '../../../data/schema.js';
import { dateTime, date, relative, timeOf, number as num } from '../../../core/format.js';

/**
 * Linha do tempo unificada.
 *
 * Consultas, evoluções, documentos, exames, escalas, mensagens e ajustes de
 * medicação em um único fluxo cronológico reverso. É a tela que responde à
 * pergunta que o médico faz ao abrir o prontuário: "o que aconteceu desde a
 * última vez que eu vi essa criança?"
 */

const FILTERS = [
  { value: 'all', label: 'Tudo' },
  { value: 'consulta', label: 'Consultas' },
  { value: 'evolucao', label: 'Evoluções' },
  { value: 'documento', label: 'Documentos' },
  { value: 'exame', label: 'Exames' },
  { value: 'escala', label: 'Escalas' },
];

const ICONS = {
  consulta: 'stethoscope',
  evolucao: 'clipboard',
  documento: 'file-text',
  exame: 'paperclip',
  escala: 'activity',
  medicacao: 'pill',
  mensagem: 'message-circle',
};

export function TimelineView({ appointments, notes, documents, attachments, scales, medications, messages = [], onIssueDocument, onReschedule, patient, onGoToSection, focusId = null }) {
  const [filter, setFilter] = useState('all');

  const events = useMemo(() => {
    const list = [
      ...appointments.map((a) => ({
        id: a.id, kind: 'consulta', at: a.inicio,
        title: APPOINTMENT_TYPE_LABELS[a.tipo] ?? 'Consulta',
        detail: a.observacoes,
        status: a.status,
        appointment: a,
      })),
      ...notes.map((n) => {
        // A data clínica da evolução é a da consulta; a assinatura é outro fato, dito à parte.
        const linked = appointments.find((a) => a.id === n.atendimentoId);
        return {
        id: n.id, kind: 'evolucao', at: linked?.inicio ?? n.assinadaEm ?? n.criadoEm,
        signedAt: n.assinadaEm ?? n.criadoEm,
        title: 'Evolução clínica',
        linked,
        detail: n.avaliacao || n.subjetivo,
        badge: n.cidPrincipal,
        isCid: true,
        locked: n.travada,
        };
      }),
      ...documents.map((d) => ({
        id: d.id, kind: 'documento', at: d.assinatura?.assinadoEm ?? d.criadoEm,
        title: DOCUMENT_TYPE_LABELS[d.tipo] ?? 'Documento',
        detail: d.titulo,
        badge: d.numero ? `nº ${d.numero}` : null,
      })),
      ...attachments.map((a) => ({
        id: a.id, kind: 'exame', at: a.realizadoEm ?? a.criadoEm,
        title: a.titulo || 'Exame sem título',
        // O rótulo do tipo, nunca a chave do banco ("exame_imagem").
        detail: ORIGINS.find((o) => o.value === a.origem)?.label ?? 'Documento',
      })),
      ...scales.map((s) => ({
        id: s.id, kind: 'escala', at: s.aplicadaEm ?? s.criadoEm,
        title: s.instrumento,
        detail: s.interpretacao,
        badge: s.escore != null ? `${num(s.escore)}${s.escoreMaximo ? `/${num(s.escoreMaximo)}` : ''}` : null,
      })),
      ...medications.flatMap((m) => [
        {
          id: m.id, kind: 'medicacao', at: m.iniciadaEm ?? m.criadoEm,
          title: `Início de ${m.principioAtivo || m.nome}`,
          detail: m.posologia,
        },
        // A saída de uso é um fato clínico tão importante quanto a entrada.
        ...(m.suspensaEm ? [{
          id: `${m.id}-suspensao`, kind: 'medicacao', at: m.suspensaEm,
          title: `Suspensão de ${m.principioAtivo || m.nome}`,
          detail: m.motivoSuspensao ? `Motivo: ${m.motivoSuspensao}` : undefined,
        }] : []),
      ]),
      ...messages.map((m) => ({
        id: m.id, kind: 'mensagem', at: m.enviadaEm ?? m.criadoEm,
        title: m.canal === 'whatsapp' ? 'Mensagem por WhatsApp' : 'E-mail enviado',
        detail: m.assunto ?? m.template,
      })),
    ];

    // Por instante, não por texto ("2026-10-26" e "2026-10-26T…" não se comparam como string);
    // o que não tem data legível vai para o fim, sem inventar uma.
    return list
      .filter((e) => filter === 'all' || e.kind === filter)
      .sort((a, b) => (timeOf(b.at) ?? -Infinity) - (timeOf(a.at) ?? -Infinity));
  }, [appointments, notes, documents, attachments, scales, medications, messages, filter]);

  const grouped = useMemo(() => groupByMonth(events), [events]);

  // Vindo da faixa de consultas do palco: rola até o atendimento clicado.
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`tl-consulta-${focusId}`);
    if (!el) return;
    // Dentro do painel, rola só o painel: scrollIntoView rolava também a
    // página e levava o cabeçalho com a alergia para fora da tela.
    const scroller = el.closest('.pr-panel');
    if (!scroller) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    const box = scroller.getBoundingClientRect();
    const head = scroller.querySelector('.pr-panel__head')?.offsetHeight ?? 0;
    const at = el.getBoundingClientRect();
    const visible = box.height - head;
    scroller.scrollTo({
      top: scroller.scrollTop + (at.top - box.top - head) - Math.max(0, (visible - at.height) / 2),
      behavior: 'smooth',
    });
  }, [focusId]);

  return (
    <Card variant="flush">
      <CardHeader
        title="Linha do tempo"
        subtitle={events.length ? `${events.length} ${events.length === 1 ? 'registro' : 'registros'}` : undefined}
        actions={
          /* Filtro sobre conjunto vazio é ruído: seis abas para peneirar zero
             registros denunciam protótipo. Só aparecem quando há o que filtrar. */
          events.length || filter !== 'all'
            ? <Tabs variant="underline" value={filter} onChange={setFilter} items={FILTERS} ariaLabel="Filtrar linha do tempo" />
            : null
        }
      />
      <CardBody>
        {events.length ? (
          <div className="timeline">
            {grouped.map(([month, items]) => (
              <section key={month}>
                <h3 className="timeline__month">{month}</h3>
                <ol className="timeline__list">
                  {items.map((event) => (
                    <li key={`${event.kind}-${event.id}`} id={`tl-${event.kind}-${event.id}`}
                      className={`timeline__item ${focusId === event.id ? 'is-focused' : ''}`.trim()}>
                      <span className={`timeline__mark timeline__mark--${event.kind}`}>
                        <Icon name={ICONS[event.kind] ?? 'info'} size={13} />
                      </span>
                      <div className="timeline__body">
                        <div className="timeline__head">
                          <strong>{event.title}</strong>
                          {event.badge ? (event.isCid ? <CidCode code={event.badge} /> : <Chip tone="neutral">{event.badge}</Chip>) : null}
                          {event.locked ? (
                            <span className="timeline__locked" title="Evolução assinada e travada">
                              <Icon name="lock" size={11} />
                            </span>
                          ) : null}
                          {event.status ? (() => {
                            // O agendamento inteiro (tipo e check-in contam para "sem desfecho"):
                            // o item diz o mesmo que a cápsula da faixa que levou até ele.
                            const subject = event.appointment ?? { status: event.status, inicio: event.at };
                            const shown = displayStatus(subject, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE);
                            const label = stateOf(subject) === 'aguardando' ? 'Na recepção' : shown.label;
                            return <Chip tone={shown.tone} icon={shown.icon}>{label}</Chip>;
                          })() : null}
                        </div>
                        {event.detail ? <p className="timeline__detail">{truncate(event.detail, 180)}</p> : null}
                        <span className="timeline__time" title={dateTime(event.at)}>
                          {timeOf(event.at) == null ? 'Sem data' : event.kind === 'evolucao' && event.linked
                            ? `Consulta de ${dateTime(event.at)} · assinada em ${dateTime(event.signedAt)}`
                            : event.kind === 'consulta' || event.kind === 'evolucao'
                              ? `${dateTime(event.at)} · ${relative(event.at)}`
                              : `${date(event.at)} · ${relative(event.at)}`}
                        </span>
                        {/* Só consulta ainda por acontecer (agendada ou confirmada) se remarca. */}
                        {onReschedule && event.appointment && canReschedule(event.appointment) ? (
                          <span className="timeline__actions">
                            <Button size="sm" icon="calendar" onClick={() => onReschedule(event.appointment)}>Remarcar</Button>
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="history"
            title={filter === 'all' ? 'Nada registrado ainda' : 'Nenhum registro deste tipo'}
            description={filter === 'all'
              ? 'Consultas, evoluções, exames e documentos aparecem aqui em ordem cronológica. Comece registrando a primeira evolução clínica.'
              : 'Troque o filtro para ver os demais registros do prontuário.'}
            action={filter === 'all' ? (
              <div className="empty__actions">
                <Button size="sm" icon="clipboard"
                  onClick={() => onGoToSection?.('evolucoes', { create: true })}>
                  Registrar primeira evolução
                </Button>
                <Button size="sm" icon="file-text"
                  onClick={() => onIssueDocument?.({ patient })}>
                  Emitir documento
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setFilter('all')}>Ver tudo</Button>
            )}
          />
        )}
      </CardBody>
    </Card>
  );
}

function groupByMonth(events) {
  const map = new Map();
  for (const event of events) {
    const stamp = timeOf(event.at);
    const key = stamp == null ? 'sem data' : new Date(stamp).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(event);
  }
  return Array.from(map.entries());
}

function truncate(text, max) {
  const value = String(text ?? '').trim();
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default TimelineView;
