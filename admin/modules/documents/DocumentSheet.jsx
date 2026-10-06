import { useState } from 'react';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS } from '../../data/schema.js';
import { DOCUMENT_SKELETONS } from '../../data/documentTemplates.js';
import { Sheet, useToast } from '../../components/Overlay.jsx';
import { Button, Chip } from '../../components/primitives.jsx';
import { LetterheadPreview } from './LetterheadPreview.jsx';
import Icon from '../../components/Icon.jsx';
import { dateLong, dateTime, date, age } from '../../core/format.js';

/**
 * Visualização de um documento já emitido.
 *
 * Não há botão de editar, por desenho. Um documento assinado é imutável —
 * se algo está errado, emite-se um novo que referencia este, e este fica
 * marcado como substituído. O histórico completo permanece.
 */
export function DocumentSheet({ document: doc, patient, guardian, onClose, onReplace }) {
  const toast = useToast();
  const [printing, setPrinting] = useState(false);

  if (!doc) return null;

  const skeleton = DOCUMENT_SKELETONS[doc.tipo] ?? {};
  const signed = doc.status === DOCUMENT_STATUS.SIGNED || doc.status === DOCUMENT_STATUS.DELIVERED;

  function print() {
    setPrinting(true);
    // A folha de impressão (print.css) esconde toda a interface e imprime
    // apenas o elemento .sheet-a4 em tamanho real, com o timbrado.
    window.document.body.classList.add('is-printing');
    window.requestAnimationFrame(() => {
      window.print();
      window.document.body.classList.remove('is-printing');
      setPrinting(false);
    });
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
            patientBirth={patient?.dataNascimento ? `${date(patient.dataNascimento)} (${age(patient.dataNascimento).label})` : null}
            guardianName={guardian?.nome}
            documentTitle={doc.titulo || skeleton.titulo || DOCUMENT_TYPE_LABELS[doc.tipo]}
            documentSubtitle={skeleton.subtitulo}
            content={doc.conteudo}
            items={doc.itens}
            number={doc.numero}
            issuedAt={dateLong(doc.assinatura?.assinadoEm ?? doc.criadoEm)}
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
