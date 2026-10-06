import { displayStatus } from '../../../core/appointments.js';
import { useMemo, useState } from 'react';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, Chip } from '../../../components/primitives.jsx';
import { Tabs } from '../../../components/Tabs.jsx';
import Icon from '../../../components/Icon.jsx';
import {
  APPOINTMENT_TYPE_LABELS, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE,
  DOCUMENT_TYPE_LABELS,
} from '../../../data/schema.js';
import { dateTime, date, relative, time } from '../../../core/format.js';

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

export function TimelineView({ appointments, notes, documents, attachments, scales, medications, messages = [], onIssueDocument, patient, onGoToSection }) {
  const [filter, setFilter] = useState('all');

  const events = useMemo(() => {
    const list = [
      ...appointments.map((a) => ({
        id: a.id, kind: 'consulta', at: a.inicio,
        title: APPOINTMENT_TYPE_LABELS[a.tipo] ?? 'Consulta',
        detail: a.observacoes,
        status: a.status,
      })),
      ...notes.map((n) => ({
        id: n.id, kind: 'evolucao', at: n.assinadaEm ?? n.criadoEm,
        title: 'Evolução clínica',
        // A que consulta a evolução pertence: dois registros no mesmo dia só
        // se distinguem pelo horário do atendimento.
        linked: appointments.find((a) => a.id === n.atendimentoId),
        detail: n.avaliacao || n.subjetivo,
        badge: n.cidPrincipal,
        locked: n.travada,
      })),
      ...documents.map((d) => ({
        id: d.id, kind: 'documento', at: d.assinatura?.assinadoEm ?? d.criadoEm,
        title: DOCUMENT_TYPE_LABELS[d.tipo] ?? 'Documento',
        detail: d.titulo,
        badge: d.numero ? `nº ${d.numero}` : null,
      })),
      ...attachments.map((a) => ({
        id: a.id, kind: 'exame', at: a.realizadoEm ?? a.criadoEm,
        title: a.titulo || a.nomeArquivo,
        detail: a.origem,
      })),
      ...scales.map((s) => ({
        id: s.id, kind: 'escala', at: s.aplicadaEm ?? s.criadoEm,
        title: s.instrumento,
        detail: s.interpretacao,
        badge: s.escore != null ? `${s.escore}${s.escoreMaximo ? `/${s.escoreMaximo}` : ''}` : null,
      })),
      ...medications.map((m) => ({
        id: m.id, kind: 'medicacao', at: m.iniciadaEm ?? m.criadoEm,
        title: `Início de ${m.principioAtivo || m.nome}`,
        detail: m.posologia,
      })),
      ...messages.map((m) => ({
        id: m.id, kind: 'mensagem', at: m.enviadaEm ?? m.criadoEm,
        title: m.canal === 'whatsapp' ? 'Mensagem por WhatsApp' : 'E-mail enviado',
        detail: m.assunto ?? m.template,
      })),
    ];

    return list
      .filter((e) => e.at)
      .filter((e) => filter === 'all' || e.kind === filter)
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [appointments, notes, documents, attachments, scales, medications, messages, filter]);

  const grouped = useMemo(() => groupByMonth(events), [events]);

  return (
    <Card variant="flush">
      <CardHeader
        title="Linha do tempo"
        subtitle={events.length ? `${events.length} registros` : undefined}
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
                    <li key={`${event.kind}-${event.id}`} className="timeline__item">
                      <span className={`timeline__mark timeline__mark--${event.kind}`}>
                        <Icon name={ICONS[event.kind] ?? 'info'} size={13} />
                      </span>
                      <div className="timeline__body">
                        <div className="timeline__head">
                          <strong>{event.title}</strong>
                          {event.badge ? <Chip tone="code">{event.badge}</Chip> : null}
                          {event.locked ? (
                            <span className="timeline__locked" title="Evolução assinada e travada">
                              <Icon name="lock" size={11} />
                            </span>
                          ) : null}
                          {event.status ? (() => {
                            const shown = displayStatus({ status: event.status, inicio: event.at }, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE);
                            return <Chip tone={shown.tone} icon={shown.icon}>{shown.label}</Chip>;
                          })() : null}
                        </div>
                        {event.detail ? <p className="timeline__detail">{truncate(event.detail, 180)}</p> : null}
                        <span className="timeline__time" title={dateTime(event.at)}>
                          {event.kind === 'consulta' || event.kind === 'evolucao'
                            ? `${dateTime(event.at)} · ${relative(event.at)}`
                            : `${date(event.at)} · ${relative(event.at)}`}
                          {event.linked ? ` · referente à consulta das ${time(event.linked.inicio)}` : ''}
                        </span>
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
                  onClick={() => onGoToSection?.('evolucoes')}>
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
    const key = new Date(event.at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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
