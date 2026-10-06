import { useRef, useState } from 'react';
import * as repo from '../../../data/repository.js';
import { STORES } from '../../../data/schema.js';
import { sha256, uuid } from '../../../core/crypto.js';
import { Card, CardHeader, CardBody, EmptyState } from '../../../components/Card.jsx';
import { Button, IconButton } from '../../../components/primitives.jsx';
import { Modal, ConfirmDialog, useToast } from '../../../components/Overlay.jsx';
import { TextField, Select, TextArea } from '../../../components/Field.jsx';
import Icon from '../../../components/Icon.jsx';
import { date, fileSize, isoDay } from '../../../core/format.js';

/**
 * Exames, laudos e pareceres.
 *
 * O arquivo é cifrado antes de ser gravado (AES-256-GCM no modo local,
 * Storage cifrado no modo servidor) e o nome guardado nunca é o nome original:
 * um arquivo chamado "laudo-autismo-joao.pdf" já vaza diagnóstico só pelo
 * nome. O nome original fica dentro do registro cifrado.
 *
 * Aceitação por tipo real (magic bytes), não por extensão — extensão é só uma
 * sugestão do sistema de arquivos.
 */

const ACCEPTED = {
  'application/pdf': { ext: 'pdf', icon: 'file-text', magic: [0x25, 0x50, 0x44, 0x46] },
  'image/jpeg': { ext: 'jpg', icon: 'layers', magic: [0xff, 0xd8, 0xff] },
  'image/png': { ext: 'png', icon: 'layers', magic: [0x89, 0x50, 0x4e, 0x47] },
  'image/webp': { ext: 'webp', icon: 'layers', magic: [0x52, 0x49, 0x46, 0x46] },
};

const MAX_BYTES = 25 * 1024 * 1024;

const ORIGINS = [
  { value: 'exame_imagem', label: 'Exame de imagem (RM, TC, US)' },
  { value: 'exame_neurofisiologico', label: 'Exame neurofisiológico (EEG, polissonografia)' },
  { value: 'exame_laboratorial', label: 'Exame laboratorial' },
  { value: 'exame_genetico', label: 'Exame genético' },
  { value: 'parecer_to', label: 'Parecer de terapia ocupacional' },
  { value: 'parecer_fono', label: 'Parecer fonoaudiológico' },
  { value: 'parecer_psi', label: 'Parecer psicológico' },
  { value: 'relatorio_escolar', label: 'Relatório escolar' },
  { value: 'outro', label: 'Outro documento' },
];

export function AttachmentsView({ patient, attachments, reload }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error(`O arquivo tem ${fileSize(file.size)}. O limite é 25 MB.`);
      return;
    }

    const buffer = await file.arrayBuffer();
    const kind = await detectType(buffer, file.type);
    if (!kind) {
      toast.error('Formato não aceito. Envie PDF, JPG, PNG ou WebP.');
      return;
    }

    setPending({
      file, buffer,
      contentType: kind.type,
      titulo: file.name.replace(/\.[^.]+$/, ''),
      origem: 'exame_imagem',
      realizadoEm: isoDay(),
      observacoes: '',
    });
  }

  async function save() {
    setPending((p) => ({ ...p, busy: true }));
    try {
      const blobId = uuid();
      const hash = await sha256(new Uint8Array(pending.buffer));

      await repo.putBlob(blobId, pending.buffer, pending.contentType);
      await repo.create(STORES.ATTACHMENTS, {
        pacienteId: patient.id,
        blobId,
        titulo: pending.titulo.trim(),
        nomeArquivo: pending.file.name,
        contentType: pending.contentType,
        tamanho: pending.file.size,
        origem: pending.origem,
        realizadoEm: pending.realizadoEm,
        observacoes: pending.observacoes,
        hash,
      });

      toast.success('Anexo salvo e cifrado.');
      setPending(null);
      reload();
    } catch (error) {
      toast.error(error.message);
      setPending((p) => ({ ...p, busy: false }));
    }
  }

  async function open(attachment) {
    try {
      const buffer = await repo.getBlob(attachment.blobId);
      if (!buffer) { toast.error('Arquivo não encontrado no armazenamento.'); return; }
      const blob = new Blob([buffer], { type: attachment.contentType });
      setPreview({ attachment, url: URL.createObjectURL(blob) });
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function remove() {
    try {
      await repo.remove(STORES.ATTACHMENTS, removing.id, 'Removido pelo usuário');
      toast.success('Anexo removido do prontuário. O registro da exclusão fica na auditoria.');
      setRemoving(null);
      reload();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <>
      <Card variant="flush">
        <CardHeader
          title="Exames e pareceres"
          subtitle={attachments.length ? `${attachments.length} arquivos` : undefined}
          actions={<Button size="sm" variant="primary" icon="upload" onClick={() => inputRef.current?.click()}>Anexar arquivo</Button>}
        />
        <CardBody>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />

          <div
            className={`dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          >
            <Icon name="upload" size={18} />
            <p>Arraste um arquivo aqui ou <button type="button" onClick={() => inputRef.current?.click()}>escolha do computador</button></p>
            <span>PDF, JPG, PNG ou WebP · até 25 MB · cifrado em repouso</span>
          </div>

          {attachments.length ? (
            <ul className="attachments">
              {attachments
                .sort((a, b) => (b.realizadoEm ?? b.criadoEm).localeCompare(a.realizadoEm ?? a.criadoEm))
                .map((attachment) => (
                  <li key={attachment.id}>
                    <button type="button" className="attachment" onClick={() => open(attachment)}>
                      <span className="attachment__icon">
                        <Icon name={ACCEPTED[attachment.contentType]?.icon ?? 'file-text'} size={16} />
                      </span>
                      <span className="attachment__text">
                        <strong>{attachment.titulo}</strong>
                        <span>
                          {ORIGINS.find((o) => o.value === attachment.origem)?.label ?? 'Documento'}
                          {' · '}{date(attachment.realizadoEm)}
                          {' · '}{fileSize(attachment.tamanho)}
                        </span>
                      </span>
                    </button>
                    <IconButton name="trash" label={`Remover ${attachment.titulo}`} onClick={() => setRemoving(attachment)} />
                  </li>
                ))}
            </ul>
          ) : (
            <EmptyState
              icon="paperclip"
              title="Nenhum exame anexado"
              description="Ressonância, EEG, laudos e relatórios de terapeutas ficam aqui, cifrados e ligados ao prontuário."
              compact
            />
          )}
        </CardBody>
      </Card>

      {/* ——— Metadados antes de gravar ——— */}
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        size="md"
        title="Identificar o anexo"
        description="Esses dados aparecem na linha do tempo e permitem encontrar o exame depois."
        footer={
          <>
            <Button onClick={() => setPending(null)} disabled={pending?.busy}>Cancelar</Button>
            <Button variant="primary" onClick={save} loading={pending?.busy}>Salvar anexo</Button>
          </>
        }
      >
        {pending ? (
          <div className="attachment-form">
            <p className="attachment-form__file">
              <Icon name="paperclip" size={14} />
              {pending.file.name} · {fileSize(pending.file.size)}
            </p>
            <TextField
              label="Título" required autoFocus
              value={pending.titulo}
              onChange={(e) => setPending((p) => ({ ...p, titulo: e.target.value }))}
            />
            <Select
              label="Tipo de documento"
              value={pending.origem}
              onChange={(e) => setPending((p) => ({ ...p, origem: e.target.value }))}
              options={ORIGINS}
            />
            <TextField
              label="Data de realização" type="date"
              value={pending.realizadoEm}
              onChange={(e) => setPending((p) => ({ ...p, realizadoEm: e.target.value }))}
            />
            <TextArea
              label="Observações" rows={2}
              value={pending.observacoes}
              onChange={(e) => setPending((p) => ({ ...p, observacoes: e.target.value }))}
            />
          </div>
        ) : null}
      </Modal>

      {/* ——— Visualização ——— */}
      <Modal
        open={!!preview}
        onClose={() => { URL.revokeObjectURL(preview?.url); setPreview(null); }}
        size="xl"
        title={preview?.attachment.titulo}
        description={preview ? `${date(preview.attachment.realizadoEm)} · ${fileSize(preview.attachment.tamanho)}` : ''}
      >
        {preview ? (
          preview.attachment.contentType === 'application/pdf'
            ? <iframe title={preview.attachment.titulo} src={preview.url} className="attachment-preview" />
            : <img src={preview.url} alt={preview.attachment.titulo} className="attachment-preview" />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
        title="Remover este anexo?"
        message={`“${removing?.titulo}” sai do prontuário. A remoção fica registrada na auditoria com seu usuário e a data.`}
        confirmLabel="Remover"
      />
    </>
  );
}

/**
 * Valida o tipo pelo conteúdo real, não pela extensão. Um .pdf renomeado a
 * partir de um executável continua sendo um executável.
 */
async function detectType(buffer, declaredType) {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  for (const [type, spec] of Object.entries(ACCEPTED)) {
    if (spec.magic.every((byte, index) => bytes[index] === byte)) {
      if (type === 'image/webp') {
        const isWebp = String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
        if (!isWebp) continue;
      }
      return { type, ...spec };
    }
  }
  // Sem correspondência de assinatura, o arquivo é recusado. O `type`
  // declarado pelo navegador vem da extensão e não prova nada.
  return null;
}

export default AttachmentsView;
