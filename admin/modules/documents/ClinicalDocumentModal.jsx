import { useEffect, useMemo, useState } from 'react';
import * as repo from '../../data/repository.js';
import { STORES, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS, newDocument } from '../../data/schema.js';
import {
  DOCUMENT_SKELETONS, REQUIRES_SIGNATURE, VARIABLES,
  resolveVariables, unresolvedVariables,
} from '../../data/documentTemplates.js';
import { useSession } from '../../core/session.jsx';
import { sha256 } from '../../core/crypto.js';
import { Modal, useToast } from '../../components/Overlay.jsx';
import { Button, Chip, IconButton } from '../../components/primitives.jsx';
import { Select, TextArea, TextField, FieldRow } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { LetterheadPreview } from './LetterheadPreview.jsx';
import { date, dateLong, age } from '../../core/format.js';

/**
 * Central emissora de documentos clínicos.
 *
 * Mantém a arquitetura split-pane herdada do painel anterior: editor à
 * esquerda, folha timbrada imutável à direita, sincronizada a cada tecla. O
 * médico vê exatamente o que vai sair na impressora.
 *
 * Diferença essencial na assinatura: o navegador calcula o hash SHA-256 do
 * conteúdo e envia hash + PIN ao BFF. A credencial do provedor (Bird ID,
 * VIDaaS, ICP-Brasil) fica na Edge Function e nunca chega ao cliente. No
 * painel anterior, `clientSecret` e o CPF do médico estavam no JavaScript
 * servido a qualquer visitante.
 */

const SIGNATURE_PROVIDERS = [
  { value: 'birdid', label: 'Bird ID (Soluti)' },
  { value: 'vidaas', label: 'VIDaaS (Valid)' },
  { value: 'icpbrasil', label: 'ICP-Brasil (certificado local)' },
];

export function ClinicalDocumentModal({ open, patient, guardians = [], appointment, initialType, onClose, onIssued }) {
  const { user, plaza, requireStepUp } = useSession();
  const toast = useToast();

  const [type, setType] = useState(DOCUMENT_TYPES.PRESCRIPTION);
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [provider, setProvider] = useState('birdid');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const skeleton = DOCUMENT_SKELETONS[type] ?? {};

  // Aberto a partir de uma pendência (ex.: laudo a emitir), já começa no tipo
  // certo — e o documento sai vinculado ao atendimento, o que resolve a pendência.
  useEffect(() => {
    if (open && initialType) setType(initialType);
  }, [open, initialType]);
  const guardian = guardians[0];

  useEffect(() => {
    if (!open) return;
    repo.list(STORES.TEMPLATES, { where: { tipo: type } })
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [open, type]);

  useEffect(() => {
    if (!open) return;
    setText(skeleton.corpo ?? '');
    setItems(skeleton.estruturada ? [blankItem()] : []);
    setTemplateId('');
  }, [type, open]);

  const context = useMemo(() => ({
    patient, guardian, appointment,
    doctor: { nome: user?.nome, crm: user?.crm },
    clinic: { cidade: plaza === 'fortaleza' ? 'Fortaleza' : 'Campinas' },
  }), [patient, guardian, appointment, user, plaza]);

  const resolvedText = useMemo(() => resolveVariables(text, context), [text, context]);
  const pending = useMemo(() => unresolvedVariables(resolvedText), [resolvedText]);

  function applyTemplate(id) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (!template) { setText(skeleton.corpo ?? ''); setItems(skeleton.estruturada ? [blankItem()] : []); return; }
    setText(template.conteudo ?? '');
    setItems(template.itens?.length ? template.itens : skeleton.estruturada ? [blankItem()] : []);
  }

  function updateItem(index, field, value) {
    setItems((list) => list.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  async function issue() {
    const hasContent = resolvedText.trim() || items.some((i) => i.principio?.trim());
    if (!hasContent) { toast.error('O documento está vazio.'); return; }

    if (pending.length) {
      toast.warning(`Há variáveis sem valor: ${pending.join(', ')}. Complete a ficha ou edite o texto.`);
      return;
    }

    const needsSignature = REQUIRES_SIGNATURE.has(type);
    if (needsSignature && provider !== 'icpbrasil' && !pin.trim()) {
      toast.error('Digite o PIN ou código OTP para autorizar a assinatura.');
      return;
    }

    setBusy(true);
    try {
      await requireStepUp('documents.issue', 'Emitir um documento clínico exige confirmação de identidade.');

      const filledItems = items.filter((i) => i.principio?.trim());
      const canonical = JSON.stringify({ type, text: resolvedText, items: filledItems, patientId: patient.id });
      const hash = await sha256(canonical);
      const number = await nextNumber(plaza);

      let signature = null;

      if (needsSignature) {
        // O PIN e o hash saem daqui; a credencial do provedor mora no BFF.
        const result = await repo.invoke('sign-document', {
          provider,
          hash,
          pin: provider === 'icpbrasil' ? undefined : pin,
          documentType: type,
        }).catch((error) => { throw new Error(traduzErroAssinatura(error.message)); });

        signature = {
          provedor: SIGNATURE_PROVIDERS.find((p) => p.value === provider)?.label ?? provider,
          id: result.signatureId,
          urlVerificacao: result.verificationUrl,
          assinadoEm: new Date().toISOString(),
        };
      }

      const saved = await repo.create(STORES.DOCUMENTS, {
        ...newDocument({ praca: plaza, userId: user?.id }),
        pacienteId: patient.id,
        atendimentoId: appointment?.id ?? null,
        tipo: type,
        titulo: skeleton.titulo,
        conteudo: resolvedText,
        itens: filledItems,
        numero: number,
        hashConteudo: hash,
        assinatura: signature ?? { provedor: null, id: null, urlVerificacao: null, assinadoEm: null },
        status: signature ? DOCUMENT_STATUS.SIGNED : DOCUMENT_STATUS.DRAFT,
      });

      toast.success(signature ? 'Documento assinado e emitido.' : 'Documento salvo.');
      setPin('');
      onIssued?.(saved);
    } catch (error) {
      if (error.message !== 'Ação cancelada.') toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  const previewItems = items
    .filter((i) => i.principio?.trim())
    .map((i) => ({ ...i, posologia: resolveVariables(i.posologia, context) }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title="Emissão de documento clínico"
      description="O que você escreve à esquerda aparece à direita exatamente como será impresso no papel timbrado."
      footer={
        <>
          <span className="doc-footer-note">
            <Icon name="lock" size={13} />
            Depois de assinado, o documento não pode ser editado.
          </span>
          <Button onClick={onClose} disabled={busy}>Fechar</Button>
          <Button variant="primary" icon="signature" onClick={issue} loading={busy}>
            {REQUIRES_SIGNATURE.has(type) ? 'Assinar e emitir' : 'Emitir documento'}
          </Button>
        </>
      }
    >
      <div className="doc-split">
        {/* ═══════════ Editor ═══════════ */}
        <section className="doc-editor" aria-label="Editor do documento">
          <FieldRow>
            <Select
              label="Tipo de documento"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={Object.values(DOCUMENT_TYPES).map((t) => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] }))}
            />
            <Select
              label="Modelo"
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              placeholder={templates.length ? 'Começar em branco' : 'Nenhum modelo salvo'}
              options={templates.map((t) => ({ value: t.id, label: t.nome }))}
              hint={templates.length ? undefined : 'Crie modelos em Documentos › Modelos.'}
            />
          </FieldRow>

          {skeleton.nota ? (
            <p className="form-note">
              <Icon name="info" size={13} />
              {skeleton.nota}
            </p>
          ) : null}

          {skeleton.estruturada ? (
            <div className="doc-items">
              <div className="doc-items__head">
                <span className="field__label">Itens</span>
                {skeleton.instrucao ? <span className="doc-items__hint">{skeleton.instrucao}</span> : null}
              </div>

              {items.map((item, index) => (
                <div key={index} className="doc-item">
                  <span className="doc-item__index num">{index + 1}</span>
                  <div className="doc-item__fields">
                    <TextField
                      label="Princípio ativo ou procedimento"
                      value={item.principio}
                      onChange={(e) => updateItem(index, 'principio', e.target.value)}
                    />
                    <FieldRow>
                      <TextField
                        label="Concentração / apresentação"
                        value={item.concentracao}
                        onChange={(e) => updateItem(index, 'concentracao', e.target.value)}
                      />
                      <TextField
                        label="Quantidade"
                        value={item.quantidade}
                        onChange={(e) => updateItem(index, 'quantidade', e.target.value)}
                      />
                    </FieldRow>
                    <TextField
                      label="Posologia / orientação"
                      value={item.posologia}
                      onChange={(e) => updateItem(index, 'posologia', e.target.value)}
                    />
                  </div>
                  <IconButton
                    name="trash"
                    label={`Remover item ${index + 1}`}
                    onClick={() => setItems((list) => list.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                  />
                </div>
              ))}

              <Button size="sm" icon="plus" onClick={() => setItems((list) => [...list, blankItem()])}>
                Adicionar item
              </Button>
            </div>
          ) : null}

          <TextArea
            label={skeleton.estruturada ? 'Observações adicionais' : 'Texto do documento'}
            rows={skeleton.estruturada ? 4 : 12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="doc-text"
          />

          <details className="doc-variables">
            <summary>Variáveis disponíveis</summary>
            <div className="doc-variables__list">
              {VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => setText((t) => `${t}${variable.token}`)}
                  title={`Inserir ${variable.label}`}
                >
                  <code>{variable.token}</code>
                  <span>{variable.label}</span>
                </button>
              ))}
            </div>
          </details>

          {REQUIRES_SIGNATURE.has(type) ? (
            <div className="doc-signature">
              <FieldRow>
                <Select
                  label="Provedor de assinatura"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  options={SIGNATURE_PROVIDERS}
                />
                {provider !== 'icpbrasil' ? (
                  <TextField
                    label="PIN / código OTP"
                    type="password"
                    autoComplete="one-time-code"
                    placeholder="Código do aplicativo"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                ) : null}
              </FieldRow>
              <p className="form-note">
                <Icon name="shield" size={13} />
                O PIN é enviado diretamente ao provedor de assinatura pelo servidor da
                clínica, junto com o resumo criptográfico do documento. Ele não é
                armazenado em lugar nenhum.
              </p>
            </div>
          ) : null}
        </section>

        {/* ═══════════ Folha timbrada ═══════════ */}
        <section className="doc-preview" aria-label="Pré-visualização impressa">
          <div className="doc-preview__scroll">
            <LetterheadPreview
              plaza={plaza}
              patientName={patient?.nomeSocial || patient?.nome}
              patientBirth={patient?.dataNascimento ? `${date(patient.dataNascimento)} (${age(patient.dataNascimento).label})` : null}
              guardianName={guardian?.nome}
              documentTitle={skeleton.titulo ?? DOCUMENT_TYPE_LABELS[type]}
              documentSubtitle={skeleton.subtitulo}
              content={resolvedText}
              items={previewItems}
              doctorName={user?.nome}
              doctorCRM={user?.crm}
              issuedAt={dateLong(new Date())}
              buyerBlock={skeleton.exigeIdentificacaoComprador}
              copyLabel={skeleton.duasVias ? '1ª via — farmácia' : null}
            />

            {skeleton.duasVias ? (
              <LetterheadPreview
                plaza={plaza}
                patientName={patient?.nomeSocial || patient?.nome}
                patientBirth={patient?.dataNascimento ? date(patient.dataNascimento) : null}
                guardianName={guardian?.nome}
                documentTitle={skeleton.titulo}
                documentSubtitle={skeleton.subtitulo}
                content={resolvedText}
                items={previewItems}
                doctorName={user?.nome}
                doctorCRM={user?.crm}
                issuedAt={dateLong(new Date())}
                buyerBlock={skeleton.exigeIdentificacaoComprador}
                copyLabel="2ª via — paciente"
              />
            ) : null}
          </div>

          {pending.length ? (
            <p className="doc-preview__warning">
              <Icon name="alert-triangle" size={13} />
              Variáveis sem valor: {pending.join(', ')}
            </p>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}

const blankItem = () => ({ principio: '', concentracao: '', quantidade: '', posologia: '' });

/** Numeração sequencial por unidade e ano. */
async function nextNumber(plaza) {
  const year = new Date().getFullYear();
  const key = `doc-seq-${plaza}-${year}`;
  const current = Number(await repo.getMeta(key)) || 0;
  const next = current + 1;
  await repo.setMeta(key, next);
  return `${year}/${String(next).padStart(5, '0')}`;
}

function traduzErroAssinatura(message = '') {
  const m = message.toLowerCase();
  if (m.includes('exige o servidor')) {
    return 'A assinatura digital exige o servidor configurado. Configure as credenciais do provedor em Configurações › Integrações.';
  }
  if (m.includes('pin') || m.includes('otp')) return 'PIN ou código OTP inválido.';
  if (m.includes('certificate') || m.includes('certificado')) return 'Certificado indisponível ou vencido.';
  if (m.includes('network') || m.includes('fetch')) return 'Não foi possível falar com o provedor de assinatura.';
  return `Falha na assinatura digital: ${message}`;
}

export default ClinicalDocumentModal;
