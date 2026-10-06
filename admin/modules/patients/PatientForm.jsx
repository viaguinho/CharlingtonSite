import { useEffect, useState } from 'react';
import * as repo from '../../data/repository.js';
import { STORES, newPatient, newGuardian, PATIENT_STATUS, PATIENT_STATUS_LABELS } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { Sheet } from '../../components/Overlay.jsx';
import { useToast } from '../../components/Overlay.jsx';
import { Button, Chip, IconButton } from '../../components/primitives.jsx';
import {
  TextField, TextArea, Select, Checkbox, FieldRow, FormSection,
} from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import {
  validate, isValid, required, validateCPF, validateCNS, validateEmail,
  validatePhone, validateBirthDate,
} from '../../core/validators.js';
import { age } from '../../core/format.js';

/**
 * Ficha do paciente.
 *
 * Sete seções colapsáveis. Só a primeira é obrigatória — a recepção consegue
 * cadastrar uma criança com nome e data de nascimento enquanto a mãe ainda
 * está no telefone, e o resto se completa depois. Exigir a ficha inteira de
 * uma vez é a forma mais rápida de fazer a equipe cadastrar tudo errado.
 *
 * A seção de perfil sensorial é específica de neuropediatria e aparece em
 * destaque no dia do atendimento: saber que a criança não tolera a sala de
 * espera cheia muda como o dia é organizado.
 */
export function PatientForm({ open, onClose, onSaved, patient: existing }) {
  const { plaza, user } = useSession();
  const toast = useToast();

  const [data, setData] = useState(() => existing ?? newPatient({ praca: plaza, userId: user?.id }));
  const [guardians, setGuardians] = useState(() => [newGuardian({ praca: plaza, userId: user?.id })]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(existing ?? newPatient({ praca: plaza, userId: user?.id }));
    setErrors({});

    if (existing?.responsaveis?.length) {
      repo.list(STORES.GUARDIANS).then((all) => {
        const matching = (existing.responsaveis || [])
          .map((id) => all.find((g) => g.id === id))
          .filter(Boolean);
        if (matching.length > 0) {
          setGuardians(matching);
        } else {
          setGuardians([newGuardian({ praca: plaza, userId: user?.id })]);
        }
      }).catch(() => {
        setGuardians([newGuardian({ praca: plaza, userId: user?.id })]);
      });
    } else {
      setGuardians([newGuardian({ praca: plaza, userId: user?.id })]);
    }
  }, [open, existing, plaza, user]);

  const set = (path) => (eventOrValue) => {
    const value = eventOrValue?.target
      ? (eventOrValue.target.type === 'checkbox' ? eventOrValue.target.checked : eventOrValue.target.value)
      : eventOrValue;
    setData((d) => setDeep(d, path, value));
    setErrors((e) => ({ ...e, [path]: null }));
  };

  const addGuardian = () => {
    setGuardians((gs) => [...gs, newGuardian({ praca: plaza, userId: user?.id })]);
  };

  const removeGuardian = (index) => {
    if (guardians.length <= 1) return;
    setGuardians((gs) => gs.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`guardians.${index}.`)) delete next[key];
      });
      return next;
    });
  };

  const setGuardianField = (index, path) => (eventOrValue) => {
    const value = eventOrValue?.target
      ? (eventOrValue.target.type === 'checkbox' ? eventOrValue.target.checked : eventOrValue.target.value)
      : eventOrValue;
    setGuardians((gs) => {
      const copy = [...gs];
      copy[index] = setDeep(copy[index], path, value);
      return copy;
    });
    setErrors((e) => ({ ...e, [`guardians.${index}.${path}`]: null }));
  };

  async function submit(event) {
    event?.preventDefault();

    const found = validate(data, {
      nome: [(v) => required(v, 'Nome da criança')],
      dataNascimento: [(v) => required(v, 'Data de nascimento'), validateBirthDate],
      cpf: [validateCPF],
      cns: [validateCNS],
    });

    // Pelo menos 1 responsável obrigatório:
    if (!guardians.length || !guardians[0]?.nome?.trim()) {
      found['guardians.0.nome'] = 'Informe o nome do responsável';
    }
    if (!guardians.length || !guardians[0]?.telefone?.trim()) {
      found['guardians.0.telefone'] = 'Informe o telefone do responsável';
    }

    guardians.forEach((g, i) => {
      const isFirst = i === 0;
      const hasAnyField = Boolean(g.nome?.trim() || g.telefone?.trim() || g.cpf?.trim() || g.email?.trim());

      if (isFirst || hasAnyField) {
        const rules = {
          cpf: [validateCPF],
          email: [validateEmail],
          telefone: [(v) => required(v, 'Telefone do responsável'), validatePhone],
        };
        if (isFirst || g.telefone?.trim() || g.cpf?.trim() || g.email?.trim()) {
          rules.nome = [(v) => required(v, 'Nome do responsável')];
        }

        const guardianErrors = validate(g, rules);
        for (const [field, message] of Object.entries(guardianErrors)) {
          found[`guardians.${i}.${field}`] = message;
        }
      }
    });

    setErrors(found);
    if (!isValid(found)) {
      toast.error('Revise os campos destacados antes de salvar.');
      return;
    }

    setBusy(true);
    try {
      const guardianIds = [];

      for (const g of guardians) {
        if (g.nome?.trim()) {
          const payload = {
            ...g,
            nome: g.nome.trim(),
            cpf: g.cpf ? g.cpf.replace(/\D/g, '') : '',
            telefone: g.telefone ? g.telefone.replace(/\D/g, '') : '',
          };

          if (g.id) {
            await repo.update(STORES.GUARDIANS, g.id, payload);
            guardianIds.push(g.id);
          } else {
            const saved = await repo.create(STORES.GUARDIANS, payload);
            guardianIds.push(saved.id);
          }
        }
      }

      const payload = {
        ...data,
        nome: data.nome.trim(),
        cpf: data.cpf ? data.cpf.replace(/\D/g, '') : '',
        cns: data.cns ? data.cns.replace(/\D/g, '') : '',
        responsaveis: guardianIds,
      };

      const saved = existing
        ? await repo.update(STORES.PATIENTS, existing.id, payload)
        : await repo.create(STORES.PATIENTS, payload);

      toast.success(existing ? 'Ficha atualizada.' : `${saved.nome} foi cadastrado.`);
      onSaved?.(saved);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  const computedAge = data.dataNascimento ? age(data.dataNascimento) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={620}
      title={existing ? 'Editar ficha' : 'Nova ficha de paciente'}
      description="Só o nome e a data de nascimento são obrigatórios. O restante pode ser completado depois."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            {existing ? 'Salvar alterações' : 'Cadastrar paciente'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="patient-form" noValidate>
        {/* ——————————————————— 1. Identificação ——————————————————— */}
        <FormSection title="Identificação" description="Quem é a criança" icon="baby">
          <TextField
            label="Nome completo" required autoFocus
            value={data.nome} onChange={set('nome')} error={errors.nome}
          />
          <TextField
            label="Nome social"
            hint="Como a criança prefere ser chamada. Aparece em destaque no prontuário."
            value={data.nomeSocial} onChange={set('nomeSocial')}
          />
          <FieldRow>
            <TextField
              label="Data de nascimento" type="date" required
              value={data.dataNascimento} onChange={set('dataNascimento')} error={errors.dataNascimento}
              hint={computedAge?.label ? `Idade: ${computedAge.label}` : undefined}
            />
            <Select
              label="Sexo" value={data.sexo} onChange={set('sexo')} placeholder="Não informado"
              options={[
                { value: 'feminino', label: 'Feminino' },
                { value: 'masculino', label: 'Masculino' },
                { value: 'intersexo', label: 'Intersexo' },
              ]}
            />
          </FieldRow>
          <FieldRow>
            <TextField label="CPF" inputMode="numeric" placeholder="000.000.000-00"
              value={data.cpf} onChange={set('cpf')} error={errors.cpf} />
            <TextField label="Cartão Nacional de Saúde" inputMode="numeric"
              value={data.cns} onChange={set('cns')} error={errors.cns} />
          </FieldRow>
          <Select
            label="Situação" value={data.status} onChange={set('status')}
            options={Object.values(PATIENT_STATUS).map((s) => ({ value: s, label: PATIENT_STATUS_LABELS[s] }))}
          />
        </FormSection>

        {/* ——————————————————— 2. Responsáveis ——————————————————— */}
        <FormSection
          title={guardians.length > 1 ? "Responsáveis legais" : "Responsável legal"}
          description="Quem acompanha, autoriza e recebe as comunicações"
          icon="users"
          defaultOpen={!existing}
        >
          <div className="guardians-list">
            {guardians.map((g, index) => (
              <div key={g.id || index} className="guardian-card">
                {guardians.length > 1 && (
                  <div className="guardian-card__header">
                    <div className="guardian-card__title-wrap">
                      <span className="guardian-card__num">{index + 1}</span>
                      <strong className="guardian-card__title">
                        {index === 0 ? 'Responsável principal' : `Responsável adicional ${index + 1}`}
                      </strong>
                      {index === 0 && <Chip tone="neutral">Principal</Chip>}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="subtle"
                      tone="danger"
                      onClick={() => removeGuardian(index)}
                      className="guardian-card__remove-btn"
                      icon="trash"
                    >
                      Remover
                    </Button>
                  </div>
                )}

                <FieldRow>
                  <TextField
                    label="Nome do responsável"
                    required={index === 0}
                    value={g.nome}
                    onChange={setGuardianField(index, 'nome')}
                    error={errors[`guardians.${index}.nome`]}
                  />
                  <TextField
                    label="Parentesco"
                    placeholder="Mãe, pai, avó…"
                    value={g.parentesco}
                    onChange={setGuardianField(index, 'parentesco')}
                  />
                </FieldRow>

                <FieldRow>
                  <TextField
                    label="Telefone"
                    type="tel"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    required={index === 0}
                    value={g.telefone}
                    onChange={setGuardianField(index, 'telefone')}
                    error={errors[`guardians.${index}.telefone`]}
                  />
                  <TextField
                    label="CPF"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={g.cpf}
                    onChange={setGuardianField(index, 'cpf')}
                    error={errors[`guardians.${index}.cpf`]}
                  />
                </FieldRow>

                <TextField
                  label="E-mail"
                  type="email"
                  value={g.email}
                  onChange={setGuardianField(index, 'email')}
                  error={errors[`guardians.${index}.email`]}
                />

                <div className="authorizations">
                  <p className="field__label">Autorizações</p>
                  <Checkbox
                    label="Pode retirar a criança da clínica"
                    checked={g.autorizacoes?.retirarCrianca}
                    onChange={(v) => setGuardianField(index, 'autorizacoes.retirarCrianca')(v)}
                  />
                  <Checkbox
                    label="Pode receber documentos clínicos"
                    description="Receitas, atestados e laudos são enviados a este responsável."
                    checked={g.autorizacoes?.receberDocumentos}
                    onChange={(v) => setGuardianField(index, 'autorizacoes.receberDocumentos')(v)}
                  />
                  <Checkbox
                    label="Pode agendar e remarcar consultas"
                    checked={g.autorizacoes?.agendar}
                    onChange={(v) => setGuardianField(index, 'autorizacoes.agendar')(v)}
                  />
                  <Checkbox
                    label="É o responsável financeiro"
                    checked={g.autorizacoes?.responsavelFinanceiro}
                    onChange={(v) => setGuardianField(index, 'autorizacoes.responsavelFinanceiro')(v)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="guardian-card__actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconRight="plus"
              onClick={addGuardian}
              className="guardian-add-btn"
            >
              Adicionar outro responsável
            </Button>
          </div>

          <p className="form-note">
            <Icon name="shield" size={13} />
            O consentimento para comunicação por WhatsApp e e-mail é registrado
            separadamente, na aba de consentimentos do prontuário — exigência do
            art. 14 da LGPD para dados de criança.
          </p>
        </FormSection>

        {/* ——————————————————— 3. Contexto clínico ——————————————————— */}
        <FormSection title="Contexto clínico" description="O que trouxe a família até aqui" icon="brain" defaultOpen={false}>
          <TextArea
            label="Queixa principal" rows={3}
            hint="Nas palavras do responsável, sempre que possível."
            value={data.clinico.queixaPrincipal} onChange={set('clinico.queixaPrincipal')}
          />
          <TextArea
            label="Gestação e parto" rows={3}
            hint="Intercorrências, idade gestacional, tipo de parto, Apgar, tempo em UTI neonatal."
            value={data.clinico.gestacaoParto} onChange={set('clinico.gestacaoParto')}
          />
          <TextArea
            label="Antecedentes familiares" rows={2}
            hint="Epilepsia, TEA, TDAH, transtornos de aprendizagem, consanguinidade."
            value={data.clinico.antecedentesFamiliares} onChange={set('clinico.antecedentesFamiliares')}
          />
          <ChipListField
            label="Alergias"
            hint="Aparecem em destaque vermelho no painel de contexto do prontuário."
            values={data.clinico.alergias}
            onChange={(list) => set('clinico.alergias')(list)}
            placeholder="Adicionar alergia e pressionar Enter"
            tone="danger"
          />
          <ChipListField
            label="Comorbidades"
            values={data.clinico.comorbidades}
            onChange={(list) => set('clinico.comorbidades')(list)}
            placeholder="Adicionar comorbidade e pressionar Enter"
          />
        </FormSection>

        {/* ——————————————————— 4. Perfil sensorial ——————————————————— */}
        <FormSection
          title="Perfil sensorial e de acolhimento"
          description="O que faz a consulta funcionar para esta criança"
          icon="heart-pulse"
          defaultOpen={false}
        >
          <TextArea
            label="Gatilhos sensoriais" rows={2}
            hint="Luz forte, som alto, sala cheia, toque inesperado, espera prolongada."
            value={data.perfilSensorial.gatilhos} onChange={set('perfilSensorial.gatilhos')}
          />
          <TextArea
            label="Preferências e interesses" rows={2}
            hint="O que acalma, o que interessa, o que ajuda na transição."
            value={data.perfilSensorial.preferencias} onChange={set('perfilSensorial.preferencias')}
          />
          <TextArea
            label="Estratégias que funcionam" rows={2}
            value={data.perfilSensorial.estrategias} onChange={set('perfilSensorial.estrategias')}
          />
          <TextField
            label="Tolerância de espera" placeholder="Ex.: até 10 minutos"
            hint="A recepção usa esta informação para priorizar o encaixe."
            value={data.perfilSensorial.toleranciaEspera} onChange={set('perfilSensorial.toleranciaEspera')}
          />
        </FormSection>

        {/* ——————————————————— 5. Escola ——————————————————— */}
        <FormSection title="Escola" description="Para relatórios e adaptações pedagógicas" icon="school" defaultOpen={false}>
          <FieldRow>
            <TextField label="Instituição" value={data.escola.instituicao} onChange={set('escola.instituicao')} />
            <TextField label="Série / ano" value={data.escola.serie} onChange={set('escola.serie')} />
          </FieldRow>
          <FieldRow>
            <TextField label="Professor de referência" value={data.escola.professor} onChange={set('escola.professor')} />
            <TextField label="Contato pedagógico" value={data.escola.contato} onChange={set('escola.contato')} />
          </FieldRow>
          <TextArea label="Adaptações em vigor" rows={2}
            value={data.escola.adaptacoes} onChange={set('escola.adaptacoes')} />
        </FormSection>

        {/* ——————————————————— 6. Convênio ——————————————————— */}
        <FormSection title="Convênio e pagamento" icon="wallet" defaultOpen={false}>
          <Checkbox
            label="Atendimento particular"
            checked={data.convenio.particular}
            onChange={(v) => set('convenio.particular')(v)}
          />
          {!data.convenio.particular ? (
            <>
              <FieldRow>
                <TextField label="Operadora" value={data.convenio.operadora} onChange={set('convenio.operadora')} />
                <TextField label="Plano" value={data.convenio.plano} onChange={set('convenio.plano')} />
              </FieldRow>
              <FieldRow>
                <TextField label="Carteirinha" value={data.convenio.carteirinha} onChange={set('convenio.carteirinha')} />
                <TextField label="Validade" type="date" value={data.convenio.validade} onChange={set('convenio.validade')} />
              </FieldRow>
            </>
          ) : (
            <TextField
              label="Valor acordado" type="number" min="0" step="0.01" suffix="R$"
              hint="Deixe em branco para usar a tabela padrão da clínica."
              value={data.convenio.valorAcordado ?? ''} onChange={set('convenio.valorAcordado')}
            />
          )}
        </FormSection>

        {/* ——————————————————— 7. Observações ——————————————————— */}
        <FormSection title="Observações gerais" icon="clipboard" defaultOpen={false}>
          <TextArea
            label="Anotações administrativas" rows={3}
            hint="Nota da recepção, não do prontuário. A evolução clínica fica no PEP."
            value={data.observacoes} onChange={set('observacoes')}
          />
        </FormSection>
      </form>
    </Sheet>
  );
}

/* ——————————————————— Lista de chips editável ——————————————————— */

function ChipListField({ label, hint, values = [], onChange, placeholder, tone = 'neutral' }) {
  const [draft, setDraft] = useState('');

  function add() {
    const value = draft.trim();
    if (!value || values.includes(value)) { setDraft(''); return; }
    onChange([...values, value]);
    setDraft('');
  }

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {values.length ? (
        <div className="chip-list">
          {values.map((value) => (
            <span key={value} className={`chip chip--${tone}`}>
              {value}
              <button type="button" aria-label={`Remover ${value}`} onClick={() => onChange(values.filter((v) => v !== value))}>
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="field__control">
        <input
          className="input"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <IconButton name="plus" label={`Adicionar em ${label}`} size="sm" className="field__trailing" onClick={add} />
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

/** Atualiza um caminho aninhado ("clinico.alergias") sem mutar o objeto. */
function setDeep(object, path, value) {
  const keys = path.split('.');
  if (keys.length === 1) return { ...object, [path]: value };
  const [head, ...rest] = keys;
  return { ...object, [head]: setDeep(object[head] ?? {}, rest.join('.'), value) };
}

export default PatientForm;
