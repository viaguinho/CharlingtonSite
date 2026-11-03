import { useState } from 'react';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS } from '../../data/schema.js';
import { DOCUMENT_SKELETONS } from '../../data/documentTemplates.js';
import { Sheet, useToast } from '../../components/Overlay.jsx';
import { Button, Chip } from '../../components/primitives.jsx';
import { LetterheadPreview } from './LetterheadPreview.jsx';
import Icon from '../../components/Icon.jsx';
import { dateLong, dateTime, date, age } from '../../core/format.js';
import * as audit from '../../core/audit.js';
import { ACTIONS } from '../../core/audit.js';
import { printElement } from '../../core/print.js';

/**
 * Visualização de um documento já emitido.
 *
 * Não há botão de editar, por desenho. Um documento assinado é imutável —
 * se algo está errado, emite-se um novo que referencia este, e este fica
 * marcado como substituído. O histórico completo permanece.
 */
export function DocumentSheet({ document: doc, patient, guardian, onClose, onReplace, notice = null }) {
  const toast = useToast();
  const [printing, setPrinting] = useState(false);

  if (!doc) return null;

  const skeleton = DOCUMENT_SKELETONS[doc.tipo] ?? {};
  const signed = doc.status === DOCUMENT_STATUS.SIGNED || doc.status === DOCUMENT_STATUS.DELIVERED;

  async function print() {
    setPrinting(true);
    // Imprime só a folha A4 (core/print.js marca tudo o que não é ela para sumir no
    // papel) e registra a impressão: documento clínico impresso é evento auditável.
    const paper = window.document.querySelector('.doc-view__paper .sheet-a4');
    audit.log({ action: ACTIONS.PRINT, entity: 'documentos', entityId: doc.id, detail: `${DOCUMENT_TYPE_LABELS[doc.tipo] ?? 'Documento'}${doc.numero ? ` nº ${doc.numero}` : ''}` })
      .catch(() => {});
    // O papel timbrado pode ser um arquivo enviado (carregado de forma assíncrona): sem esperar a imagem
    // decodificar, a folha poderia sair sem o papel.
    await paper?.querySelector('.sheet-a4__letterhead')?.decode?.().catch(() => {});
    printElement(paper);
    window.setTimeout(() => setPrinting(false), 600);
  }

  return (
    <Sheet
      open={!!doc}
      onClose={onClose}
      width={560}
      title={DOCUMENT_TYPE_LABELS[doc.tipo] ?? 'Documento'}
      description={doc.numero ? `Número ${doc.numero}` : 'Sem numeração'}
      footer={
        <>
          {signed && onReplace ? (
            <Button onClick={() => onReplace(doc)} icon="refresh">Emitir substituto</Button>
          ) : null}
          <Button variant="primary" icon="print" onClick={print} loading={printing}>Imprimir</Button>
        </>
      }
    >
      <div className="doc-view">
        {/* Aberta do prontuário, a folha cobre as pílulas de alerta: a alergia vem junto. */}
        {notice}
        <div className="doc-view__meta">
          <div>
            <span className="eyebrow">Situação</span>
            <Chip tone={signed ? 'success' : doc.status === DOCUMENT_STATUS.REPLACED ? 'muted' : 'warning'}>
              {signed ? 'Assinado' : doc.status === DOCUMENT_STATUS.REPLACED ? 'Substituído' : 'Rascunho'}
            </Chip>
          </div>
          <div>
            <span className="eyebrow">Emitido em</span>
            <p>{dateTime(doc.assinatura?.assinadoEm ?? doc.criadoEm)}</p>
          </div>
        </div>

        {doc.assinatura?.id ? (
          <div className="doc-view__signature">
            <Icon name="signature" size={15} />
            <div>
              <strong>Assinado via {doc.assinatura.provedor}</strong>
              <span>Identificador: {doc.assinatura.id}</span>
              {doc.assinatura.urlVerificacao ? (
                <a href={doc.assinatura.urlVerificacao} target="_blank" rel="noreferrer noopener">
                  Verificar autenticidade
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {doc.hashConteudo ? (
          <p className="doc-view__hash">
            <Icon name="lock" size={12} />
            <span>Resumo SHA-256: <code>{doc.hashConteudo.slice(0, 32)}…</code></span>
          </p>
        ) : null}

        <div className="doc-view__paper">
          <LetterheadPreview
            plaza={doc.praca}
            patientName={patient?.nomeSocial || patient?.nome}
            // A idade vale na data da emissão: reimprimir daqui a meses não pode mudar o que foi assinado.
            patientBirth={patient?.dataNascimento ? `${date(patient.dataNascimento)} (${age(patient.dataNascimento, doc.assinatura?.assinadoEm ?? doc.criadoEm).label})` : null}
            guardianName={guardian?.nome}
            documentTitle={doc.titulo || skeleton.titulo || DOCUMENT_TYPE_LABELS[doc.tipo]}
            documentSubtitle={skeleton.subtitulo}
            content={doc.conteudo}
            items={doc.itens}
            number={doc.numero}
            issuedAt={dateLong(doc.assinatura?.assinadoEm ?? doc.criadoEm)}
            // Nome e CRM de quem EMITIU (gravados na assinatura), nunca os de quem está vendo.
            doctorName={doc.assinatura?.medico?.nome}
            doctorCRM={doc.assinatura?.medico?.crm}
            signature={doc.assinatura?.id ? doc.assinatura : null}
            verificationUrl={doc.assinatura?.urlVerificacao}
            buyerBlock={skeleton.exigeIdentificacaoComprador}
          />
        </div>
      </div>
    </Sheet>
  );
}

export default DocumentSheet;
