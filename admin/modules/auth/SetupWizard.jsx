import { useState } from 'react';
import * as repo from '../../data/repository.js';
import * as crypto from '../../core/crypto.js';
import { STORES, envelope } from '../../data/schema.js';
import { ROLES, PLAZAS, PLAZA_LABELS, ROLE_LABELS } from '../../core/rbac.js';
import { Button } from '../../components/primitives.jsx';
import { TextField, PasswordField, Checkbox, Select } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import {
  validateEmail, validatePassword, validateCNPJ, validateCRM, required, validate, isValid,
} from '../../core/validators.js';

/**
 * Configuração inicial.
 *
 * É aqui que o sistema deixa de estar vazio — e ele começa vazio de verdade:
 * não existe nenhum paciente, agendamento, valor ou usuário de demonstração
 * em lugar nenhum do código. Tudo o que o painel mostra a partir de agora
 * foi digitado por alguém da clínica.
 */

const STEPS = [
  { id: 'clinic', label: 'A clínica', icon: 'stethoscope' },
  { id: 'plazas', label: 'Unidades', icon: 'door' },
  { id: 'account', label: 'Sua conta', icon: 'user-plus' },
  { id: 'consult', label: 'Atendimento', icon: 'calendar' },
  { id: 'done', label: 'Pronto', icon: 'check' },
];

export function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    plazas: [PLAZAS.CAMPINAS],
    nome: '',
    crm: '',
    email: '',
    senha: '',
    senhaConfirma: '',
    role: ROLES.DOCTOR,
    duracaoPadrao: '60',
    duracaoPrimeira: '90',
  });

  const set = (field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
    setData((d) => ({ ...d, [field]: value }));
    setErrors((e) => ({ ...e, [field]: null }));
  };

  function validateStep() {
    const current = STEPS[step].id;
    let found = {};

    if (current === 'clinic') {
      found = validate(data, {
        razaoSocial: [(v) => required(v, 'Razão social')],
        cnpj: [validateCNPJ],
      });
    }

    if (current === 'plazas' && !data.plazas.length) {
      found = { plazas: 'Selecione ao menos uma unidade.' };
    }

    if (current === 'account') {
      found = validate(data, {
        nome: [(v) => required(v, 'Nome')],
        email: [(v) => required(v, 'E-mail'), validateEmail],
        senha: [(v) => required(v, 'Senha'), validatePassword],
        crm: [validateCRM],
      });
      if (!found.senha && data.senha !== data.senhaConfirma) {
        found.senhaConfirma = 'As senhas não coincidem.';
      }
    }

    setErrors(found);
    return isValid(found);
  }

  async function advance() {
    if (!validateStep()) return;
    if (STEPS[step].id === 'consult') { await persist(); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function persist() {
    setBusy(true);
    try {
      // A senha vira a chave do cofre local. O sal é público (é só um sal),
      // mas a chave derivada dele nunca é gravada em lugar nenhum.
      const salt = await crypto.unlock(data.senha, null);
      await repo.setMeta('kdfSalt', salt);

      const userId = crypto.uuid();
      repo.setActor(userId, data.plazas[0]);

      await repo.putMany(STORES.CLINIC, [{
        ...envelope({ userId }),
        razaoSocial: data.razaoSocial.trim(),
        nomeFantasia: data.nomeFantasia.trim() || data.razaoSocial.trim(),
        cnpj: data.cnpj.replace(/\D/g, ''),
        plazas: data.plazas,
        responsavelTecnico: { nome: data.nome.trim(), crm: data.crm.trim().toUpperCase() },
      }]);

      await repo.putMany(STORES.USERS, [{
        ...envelope({ userId, praca: data.plazas[0] }),
        id: userId,
        nome: data.nome.trim(),
        email: data.email.trim().toLowerCase(),
        role: data.role,
        plazas: data.plazas,
        crm: data.crm.trim().toUpperCase(),
        mfaAtivo: false,
        status: 'ativo',
      }]);

      // Uma sala por unidade, para que a agenda tenha onde alocar desde o
      // primeiro agendamento. Nome genérico, editável — não é dado fictício,
      // é a estrutura mínima de funcionamento.
      await repo.putMany(STORES.ROOMS, data.plazas.map((praca) => ({
        ...envelope({ userId, praca }),
        nome: 'Consultório 1',
        recursos: [],
        status: 'disponivel',
      })));

      await repo.setMeta('parametros', {
        duracaoPadrao: Number(data.duracaoPadrao),
        duracaoPrimeira: Number(data.duracaoPrimeira),
      });
      await repo.setMeta('bootstrapped', true);

      setStep(STEPS.length - 1);
    } catch (error) {
      setErrors({ geral: error.message });
    } finally {
      setBusy(false);
    }
  }

  function togglePlaza(plaza, checked) {
    setData((d) => ({
      ...d,
      plazas: checked ? [...d.plazas, plaza] : d.plazas.filter((p) => p !== plaza),
    }));
    setErrors((e) => ({ ...e, plazas: null }));
  }

  const current = STEPS[step];

  return (
    <div className="setup">
      <aside className="setup__side">
        <div className="setup__brand">
          <img src="/assets/logo.svg" alt="" width="34" height="34" />
          <span>Configuração inicial</span>
        </div>

        <ol className="setup__steps">
          {STEPS.map((item, index) => (
            <li
              key={item.id}
              className={index === step ? 'is-current' : index < step ? 'is-done' : ''}
            >
              <span className="setup__step-mark">
                {index < step ? <Icon name="check" size={13} /> : <span className="num">{index + 1}</span>}
              </span>
              <span className="setup__step-label">{item.label}</span>
            </li>
          ))}
        </ol>

        <p className="setup__note">
          <Icon name="shield" size={14} />
          O sistema começa sem nenhum registro. Nada de exemplo é criado — cada
          paciente, horário e valor que você vir foi cadastrado pela equipe.
        </p>
      </aside>

      <main className="setup__main">
        <div className="setup__content">
          {current.id === 'clinic' ? (
            <>
              <StepHead
                title="Vamos começar pela clínica"
                description="Esses dados aparecem nos documentos emitidos e nos relatórios."
              />
              <div className="setup__fields">
                <TextField
                  label="Razão social" required autoFocus
                  value={data.razaoSocial} onChange={set('razaoSocial')} error={errors.razaoSocial}
                />
                <TextField
                  label="Nome fantasia" hint="Como a clínica é conhecida pelos pacientes."
                  value={data.nomeFantasia} onChange={set('nomeFantasia')}
                />
                <TextField
                  label="CNPJ" inputMode="numeric" placeholder="00.000.000/0000-00"
                  value={data.cnpj} onChange={set('cnpj')} error={errors.cnpj}
                />
              </div>
            </>
          ) : null}

          {current.id === 'plazas' ? (
            <>
              <StepHead
                title="Quais unidades estão ativas?"
                description="Cada unidade é isolada: quem atende em uma não enxerga os pacientes da outra."
              />
              <div className="setup__fields">
                {Object.values(PLAZAS).map((plaza) => (
                  <Checkbox
                    key={plaza}
                    label={PLAZA_LABELS[plaza]}
                    description={plaza === PLAZAS.CAMPINAS ? 'Sede' : 'Filial'}
                    checked={data.plazas.includes(plaza)}
                    onChange={(checked) => togglePlaza(plaza, checked)}
                  />
                ))}
                {errors.plazas ? <p className="field__error" role="alert"><Icon name="alert-triangle" size={12} />{errors.plazas}</p> : null}
              </div>
            </>
          ) : null}

          {current.id === 'account' ? (
            <>
              <StepHead
                title="Sua conta de acesso"
                description="Esta será a conta de administrador da clínica."
              />
              <div className="setup__fields">
                <TextField label="Nome completo" required autoFocus
                  value={data.nome} onChange={set('nome')} error={errors.nome} />
                <Select
                  label="Perfil" value={data.role} onChange={set('role')}
                  options={Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                />
                <TextField label="CRM" placeholder="173176-SP" hint="Obrigatório para emitir documentos clínicos."
                  value={data.crm} onChange={set('crm')} error={errors.crm} />
                <TextField label="E-mail" type="email" required autoComplete="username"
                  value={data.email} onChange={set('email')} error={errors.email} />
                <PasswordField
                  label="Senha" required autoComplete="new-password"
                  hint="Mínimo de 12 caracteres. Esta senha também cifra os dados neste dispositivo — se você perdê-la, os dados locais não podem ser recuperados."
                  value={data.senha} onChange={set('senha')} error={errors.senha}
                />
                <PasswordField
                  label="Confirme a senha" required autoComplete="new-password"
                  value={data.senhaConfirma} onChange={set('senhaConfirma')} error={errors.senhaConfirma}
                />
              </div>
            </>
          ) : null}

          {current.id === 'consult' ? (
            <>
              <StepHead
                title="Como são os atendimentos?"
                description="Você ajusta tudo isso depois em Configurações."
              />
              <div className="setup__fields">
                <TextField
                  label="Duração padrão do retorno" type="number" min="15" max="240" step="5" suffix="min"
                  value={data.duracaoPadrao} onChange={set('duracaoPadrao')}
                />
                <TextField
                  label="Duração da primeira consulta" type="number" min="15" max="240" step="5" suffix="min"
                  value={data.duracaoPrimeira} onChange={set('duracaoPrimeira')}
                />
              </div>
              {errors.geral ? (
                <p className="field__error" role="alert"><Icon name="alert-triangle" size={12} />{errors.geral}</p>
              ) : null}
            </>
          ) : null}

          {current.id === 'done' ? (
            <div className="setup__done">
              <span className="setup__done-mark"><Icon name="check" size={26} /></span>
              <StepHead
                title="Tudo pronto"
                description="O painel está configurado e vazio, esperando o primeiro cadastro. Comece cadastrando um paciente ou abrindo a agenda."
              />
              <Button variant="primary" size="lg" onClick={onComplete}>Entrar no painel</Button>
            </div>
          ) : (
            <div className="setup__actions">
              {step > 0 ? (
                <Button onClick={() => setStep((s) => s - 1)} icon="arrow-left" disabled={busy}>Voltar</Button>
              ) : <span />}
              <Button variant="primary" onClick={advance} loading={busy} iconRight="arrow-right">
                {current.id === 'consult' ? 'Concluir configuração' : 'Continuar'}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StepHead({ title, description }) {
  return (
    <header className="setup__head">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export default SetupWizard;
