import { useMemo, useState } from 'react';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS, DOCUMENT_TYPES } from '../../../data/schema.js';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, Chip, StatusDot } from '../../../components/primitives.jsx';
import { DataTable } from '../../../components/DataTable.jsx';
import { DocumentSheet } from '../../documents/DocumentSheet.jsx';
import Icon from '../../../components/Icon.jsx';
import { date, dateTime, relative } from '../../../core/format.js';

/**
 * Documentos emitidos para este paciente.
 *
 * Documento assinado é imutável: não há botão de editar. Correção gera um
 * novo documento que referencia o anterior, e o original permanece visível
 * marcado como substituído. É assim que uma clínica sobrevive a uma
 * contestação — o histórico completo continua lá.
 */

const STATUS_META = {
  [DOCUMENT_STATUS.DRAFT]: { label: 'Rascunho', tone: 'neutral' },
  [DOCUMENT_STATUS.PENDING]: { label: 'Aguardando assinatura', tone: 'warning' },
  [DOCUMENT_STATUS.SIGNED]: { label: 'Assinado', tone: 'success' },
  [DOCUMENT_STATUS.DELIVERED]: { label: 'Entregue', tone: 'info' },
  [DOCUMENT_STATUS.REPLACED]: { label: 'Substituído', tone: 'muted' },
};

export function DocumentsView({ patient, documents, appointments = [], onIssueDocument }) {
  const [viewing, setViewing] = useState(null);

  // Mesma regra de Documentos › A emitir e da Visão geral: laudo concluído
  // sem documento vinculado. O prontuário é onde se emite — a pendência da
  // criança precisa estar aqui, não só na lista da clínica.
  const toIssue = useMemo(() => {
    const issued = new Set(documents.map((d) => d.atendimentoId).filter(Boolean));
    return appointments
      .filter((a) => a.tipo === 'laudo' && a.status === 'concluido' && !issued.has(a.id))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [appointments, documents]);

  const rows = useMemo(
    () => [...documents].sort((a, b) =>
      (b.assinatura?.assinadoEm ?? b.criadoEm).localeCompare(a.assinatura?.assinadoEm ?? a.criadoEm)),
    [documents],
  );

  const columns = [
    {
      key: 'tipo',
      label: 'Documento',
      sortable: true,
      render: (row) => (
        <span className="table__primary">
          <span className="doc-icon"><Icon name={iconFor(row.tipo)} size={15} /></span>
          <span className="table__primary-text">
            <strong>{DOCUMENT_TYPE_LABELS[row.tipo] ?? 'Documento'}</strong>
            <span>{row.numero ? `nº ${row.numero}` : 'sem numeração'}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'criadoEm',
      label: 'Emitido em',
      sortable: true,
      hideBelow: 900,
      render: (row) => {
        const at = row.assinatura?.assinadoEm ?? row.criadoEm;
        return <span title={dateTime(at)}>{relative(at)}</span>;
      },
    },
    {
      key: 'status',
      label: 'Situação',
      width: 200,
      render: (row) => {
        const meta = STATUS_META[row.status] ?? STATUS_META[DOCUMENT_STATUS.DRAFT];
        return <StatusDot tone={meta.tone} label={meta.label} />;
      },
    },
    {
      key: 'assinatura',
      label: 'Assinatura',
      width: 160,
      hideBelow: 1200,
      render: (row) => row.assinatura?.provedor
        ? <Chip tone="info" icon="signature">{row.assinatura.provedor}</Chip>
        : <span className="muted">—</span>,
    },
    {
      key: 'actions',
      label: '',
      width: 48,
      align: 'right',
      render: () => <Icon name="chevron-right" size={15} className="muted" />,
    },
  ];

  return (
    <>
      {toIssue.length ? (
        <>
          <div className="ops-alert" role="status">
            <Icon name="clipboard" size={15} />
            <p>
              <strong>{toIssue.length} {toIssue.length === 1 ? 'atendimento de laudo concluído sem documento' : 'atendimentos de laudo concluídos sem documento'}.</strong>{' '}
              {toIssue.slice(0, 4).map((a) => date(a.inicio)).join(', ')}{toIssue.length > 4 ? ` e mais ${toIssue.length - 4}` : ''}.
            </p>
            <Button size="sm" variant="primary" onClick={() => onIssueDocument({ patient, tipo: DOCUMENT_TYPES.REPORT, atendimentoId: toIssue[0].id })}>
              Emitir o mais antigo
            </Button>
          </div>
          <div style={{ height: 'var(--gutter)' }} />
        </>
      ) : null}
      <Card variant="flush">
        <CardHeader
          title="Documentos emitidos"
          subtitle={rows.length ? `${rows.length} documentos` : undefined}
          actions={
            <Button size="sm" variant="primary" icon="plus" onClick={() => onIssueDocument({ patient })}>
              Emitir documento
            </Button>
          }
        />
        <DataTable
          columns={columns}
          rows={rows}
          caption="Documentos clínicos deste paciente"
          onRowClick={setViewing}
          emptyState={
            <EmptyState
              icon="file-text"
              title="Nenhum documento emitido"
              description="Prescrições, atestados, laudos e relatórios para a escola são emitidos no papel timbrado da clínica e assinados digitalmente."
              action={
                <Button size="sm" icon="plus" onClick={() => onIssueDocument({ patient })}>
                  Emitir o primeiro
                </Button>
              }
            />
          }
        />
      </Card>

      <DocumentSheet
        document={viewing}
        patient={patient}
        onClose={() => setViewing(null)}
      />
    </>
  );
}

function iconFor(type) {
  if (String(type).startsWith('prescricao')) return 'prescription';
  if (String(type).startsWith('atestado') || type === 'declaracao_acompanhante') return 'certificate';
  if (type === 'solicitacao_exames') return 'clipboard';
  if (type === 'encaminhamento') return 'arrow-up-right';
  return 'file-text';
}

export default DocumentsView;
