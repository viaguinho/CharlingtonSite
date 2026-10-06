import { useEffect, useMemo, useState } from 'react';
import * as repo from '../../data/repository.js';
import { STORES, MESSAGE_CHANNELS, CONSENT_PURPOSES } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState, Metric, MetricStrip } from '../../components/Card.jsx';
import { Button, Chip, Avatar, StatusDot, IconButton } from '../../components/primitives.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Modal, useToast } from '../../components/Overlay.jsx';
import { Switch, TextField, TextArea, Select } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { dateTime, relative, phone as formatPhone } from '../../core/format.js';

/**
 * Comunicação com as famílias.
 *
 * Duas regras que atravessam o módulo inteiro:
 *
 *  1. Sem consentimento registrado, o canal fica bloqueado. Não é uma
 *     preferência de produto — é o art. 14 da LGPD aplicado a dado de criança.
 *  2. Nenhum dado clínico vai no corpo da mensagem. O WhatsApp avisa que há
 *     um documento disponível; o documento se acessa por link autenticado.
 *     Mensagem de WhatsApp fica no aparelho, na nuvem do provedor e na tela
 *     de bloqueio de quem estiver por perto.
 */

const TEMPLATES = [
  {
    id: 'confirmacao',
    nome: 'Confirmação de consulta',
    canal: MESSAGE_CHANNELS.WHATSAPP,
    quando: 'Ao agendar',
    corpo: 'Olá! A consulta de {{paciente.primeiroNome}} está agendada para {{data}} às {{hora}}, na unidade {{unidade}}. Responda SIM para confirmar.',
  },
  {
    id: 'lembrete',
    nome: 'Lembrete véspera',
    canal: MESSAGE_CHANNELS.WHATSAPP,
    quando: '24 horas antes',
    corpo: 'Lembrete: a consulta de {{paciente.primeiroNome}} é amanhã, {{data}}, às {{hora}}. Se precisar remarcar, é só responder aqui.',
  },
  {
    id: 'documento',
    nome: 'Documento disponível',
    canal: MESSAGE_CHANNELS.WHATSAPP,
    quando: 'Ao assinar um documento',
    corpo: 'Um documento da consulta de {{paciente.primeiroNome}} está disponível. Acesse pelo link seguro: {{link}}',
  },
  {
    id: 'retorno',
    nome: 'Sugestão de retorno',
    canal: MESSAGE_CHANNELS.WHATSAPP,
    quando: '90 dias sem consulta',
    corpo: 'Faz um tempo desde a última consulta de {{paciente.primeiroNome}}. Quer agendar um retorno?',
  },
  {
    id: 'aniversario',
    nome: 'Aniversário',
    canal: MESSAGE_CHANNELS.WHATSAPP,
    quando: 'Na data de nascimento',
    corpo: 'Parabéns, {{paciente.primeiroNome}}! Toda a equipe da clínica deseja um ótimo dia.',
  },
];

export default function CommunicationScreen() {
  const { plaza } = useSession();
  const [tab, setTab] = useState('conversas');

  return (
    <>
      <PageHeader
        eyebrow="Famílias"
        title="Comunicação"
        description="Confirmações, lembretes e avisos por WhatsApp e e-mail — sempre com consentimento registrado e sem dado clínico no corpo da mensagem."
        toolbar={
          <Tabs
            variant="segment"
            value={tab}
            onChange={setTab}
            ariaLabel="Seções de comunicação"
            items={[
              { value: 'conversas', label: 'Conversas', icon: 'message-circle' },
              { value: 'automacoes', label: 'Automações', icon: 'refresh' },
              { value: 'modelos', label: 'Modelos', icon: 'file-text' },
            ]}
          />
        }
      />

      {tab === 'conversas' ? <ConversationsTab plaza={plaza} /> : null}
      {tab === 'automacoes' ? <AutomationsTab plaza={plaza} /> : null}
      {tab === 'modelos' ? <TemplatesTab /> : null}
    </>
  );
}

/* ═══════════════════════════ Conversas ═══════════════════════════ */

function ConversationsTab({ plaza }) {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [patients, setPatients] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [consents, setConsents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    (async () => {
      const where = plaza ? { praca: plaza } : {};
      const [m, p, g, c] = await Promise.all([
        repo.list(STORES.MESSAGES, { where }).catch(() => []),
        repo.list(STORES.PATIENTS, { where }).catch(() => []),
        repo.list(STORES.GUARDIANS, { where }).catch(() => []),
        repo.list(STORES.CONSENTS).catch(() => []),
      ]);
      setMessages(m); setPatients(p); setGuardians(g); setConsents(c);
    })();
  }, [plaza]);

  const threads = useMemo(() => {
    const map = new Map();
    for (const message of messages) {
      if (!map.has(message.pacienteId)) map.set(message.pacienteId, []);
      map.get(message.pacienteId).push(message);
    }
    return Array.from(map.entries())
      .map(([patientId, list]) => ({
        patient: patients.find((p) => p.id === patientId),
        messages: list.sort((a, b) => (a.enviadaEm ?? '').localeCompare(b.enviadaEm ?? '')),
        last: list[list.length - 1],
      }))
      .filter((t) => t.patient)
      .sort((a, b) => (b.last.enviadaEm ?? '').localeCompare(a.last.enviadaEm ?? ''));
  }, [messages, patients]);

  const optedIn = useMemo(
    () => new Set(
      consents
        .filter((c) => c.finalidade === CONSENT_PURPOSES.WHATSAPP && !c.revogadoEm)
        .map((c) => c.pacienteId),
    ),
    [consents],
  );

  const sent = messages.filter((m) => m.status === 'entregue' || m.status === 'lida').length;
  // "Entregues 0" sem denominador não dizia de quantas: agora o KPI diz o total
  // enviado, e "Conversas" diz desde quando conta.
  const firstMessageDay = messages
    .map((m) => (m.enviadaEm ?? '').slice(0, 10))
    .filter(Boolean)
    .sort()[0] ?? null;

  return (
    <>
      <MetricStrip>
        <Metric
          featured
          label="Crianças com opt-in"
          value={optedIn.size}
          denominator={patients.length || null}
          target="autorizaram receber mensagem no WhatsApp"
        />
        <Metric
          label="Conversas"
          value={threads.length}
          target={firstMessageDay
            ? `com ${threads.length === 1 ? '1 família' : `${threads.length} famílias`}, desde ${firstMessageDay.slice(8, 10)}/${firstMessageDay.slice(5, 7)}`
            : 'Nenhuma mensagem enviada ainda'}
        />
        <Metric
          label="Mensagens entregues"
          value={sent}
          denominator={messages.length || null}
          target={messages.length ? 'de todas as mensagens enviadas' : 'Nenhuma mensagem enviada ainda'}
        />
      </MetricStrip>

      <div style={{ height: 'var(--gutter)' }} />

      <div className="comm">
        <Card variant="flush" className="comm__list">
          <CardHeader
            title="Conversas"
            actions={<IconButton name="plus" label="Nova mensagem" variant="surface" onClick={() => setComposing(true)} />}
          />
          <CardBody>
            {threads.length ? (
              <ul className="thread-list">
                {threads.map((thread) => (
                  <li key={thread.patient.id}>
                    <button
                      type="button"
                      className={selected === thread.patient.id ? 'is-active' : ''}
                      onClick={() => setSelected(thread.patient.id)}
                    >
                      <Avatar name={thread.patient.nome} size={34} />
                      <span className="thread-list__text">
                        <strong>{thread.patient.nomeSocial || thread.patient.nome}</strong>
                        <span>{truncate(thread.last.corpo, 44)}</span>
                      </span>
                      <span className="thread-list__time">{relative(thread.last.enviadaEm)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="message-circle"
                title="Nenhuma conversa"
                description="As mensagens trocadas com as famílias aparecem aqui, agrupadas por criança."
                compact
              />
            )}
          </CardBody>
        </Card>

        <Card variant="flush" className="comm__thread">
          {selected ? (
            <ThreadView
              thread={threads.find((t) => t.patient.id === selected)}
              guardian={guardians.find((g) => threads.find((t) => t.patient.id === selected)?.patient.responsaveis?.includes(g.id))}
              optedIn={optedIn.has(selected)}
            />
          ) : (
            <EmptyState
              icon="message-circle"
              title="Selecione uma conversa"
              description="O histórico completo de mensagens de cada família fica aqui, independentemente do canal."
            />
          )}
        </Card>
      </div>

      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        size="md"
        title="Nova mensagem"
        description="Escolha o paciente e o modelo. O envio depende do consentimento registrado no prontuário."
        footer={
          <>
            <Button onClick={() => setComposing(false)}>Cancelar</Button>
            <Button
              variant="primary"
              icon="whatsapp"
              onClick={() => toast.error('O envio exige o WhatsApp Cloud API configurado em Configurações › Integrações.')}
            >
              Enviar
            </Button>
          </>
        }
      >
        <p className="form-note">
          <Icon name="shield" size={13} />
          O envio só é permitido para famílias com consentimento de comunicação
          registrado e dentro da janela de 24 horas do WhatsApp Business, ou por
          modelo (HSM) previamente aprovado pela Meta.
        </p>
      </Modal>
    </>
  );
}

function ThreadView({ thread, guardian, optedIn }) {
  if (!thread) return null;

  return (
    <>
      <CardHeader
        title={thread.patient.nomeSocial || thread.patient.nome}
        subtitle={guardian ? `${guardian.nome} · ${guardian.telefone ? formatPhone(guardian.telefone) : 'sem telefone'}` : 'Responsável não cadastrado'}
        actions={
          <Chip tone={optedIn ? 'success' : 'warning'} icon={optedIn ? 'check' : 'alert-triangle'}>
            {optedIn ? 'Opt-in registrado' : 'Sem consentimento'}
          </Chip>
        }
      />
      <CardBody>
        <ol className="thread">
          {thread.messages.map((message) => (
            <li key={message.id} className={`bubble bubble--${message.direcao === 'saida' ? 'out' : 'in'}`}>
              <div className="bubble__body">
                <p>{message.corpo}</p>
                <span className="bubble__meta">
                  <Icon name={message.canal === MESSAGE_CHANNELS.WHATSAPP ? 'whatsapp' : 'mail'} size={11} />
                  {dateTime(message.enviadaEm)}
                  {message.status ? ` · ${message.status}` : ''}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </>
  );
}

/* ═══════════════════════════ Automações ═══════════════════════════ */

function AutomationsTab({ plaza }) {
  const toast = useToast();
  const [rules, setRules] = useState([]);

  useEffect(() => {
    repo.list(STORES.AUTOMATIONS, { where: plaza ? { praca: plaza } : {} })
      .then((list) => {
        const byId = new Map(list.map((r) => [r.templateId, r]));
        setRules(TEMPLATES.map((t) => ({
          template: t,
          record: byId.get(t.id) ?? null,
          ativa: byId.get(t.id)?.ativa ?? false,
        })));
      })
      .catch(() => setRules(TEMPLATES.map((t) => ({ template: t, record: null, ativa: false }))));
  }, [plaza]);

  async function toggle(rule, ativa) {
    try {
      if (rule.record) await repo.update(STORES.AUTOMATIONS, rule.record.id, { ativa });
      else await repo.create(STORES.AUTOMATIONS, { templateId: rule.template.id, ativa });
      setRules((list) => list.map((r) => (r.template.id === rule.template.id ? { ...r, ativa } : r)));
      toast.success(ativa ? 'Automação ativada.' : 'Automação desativada.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Regras automáticas"
        eyebrow="Disparos"
        subtitle="Cada regra só dispara para famílias com consentimento registrado."
      />
      <CardBody>
        <ul className="automations">
          {rules.map((rule) => (
            <li key={rule.template.id}>
              <span className="automations__icon">
                <Icon name={rule.template.canal === MESSAGE_CHANNELS.WHATSAPP ? 'whatsapp' : 'mail'} size={16} />
              </span>
              <div className="automations__text">
                <strong>{rule.template.nome}</strong>
                <span>{rule.template.quando}</span>
              </div>
              <Switch
                label=""
                checked={rule.ativa}
                onChange={(value) => toggle(rule, value)}
              />
            </li>
          ))}
        </ul>

        <p className="form-note">
          <Icon name="info" size={13} />
          Os disparos exigem o WhatsApp Cloud API e o provedor de e-mail configurados
          em Configurações › Integrações. Enquanto não estiverem, as regras ficam
          salvas mas não executam.
        </p>
      </CardBody>
    </Card>
  );
}

/* ═══════════════════════════ Modelos ═══════════════════════════ */

function TemplatesTab() {
  return (
    <Card>
      <CardHeader
        title="Modelos de mensagem"
        eyebrow="HSM"
        subtitle="Modelos precisam ser aprovados pela Meta antes de poderem ser enviados fora da janela de 24 horas."
      />
      <CardBody>
        <ul className="msg-templates">
          {TEMPLATES.map((template) => (
            <li key={template.id}>
              <div className="msg-templates__head">
                <Icon name={template.canal === MESSAGE_CHANNELS.WHATSAPP ? 'whatsapp' : 'mail'} size={15} />
                <strong>{template.nome}</strong>
                <Chip tone="neutral">{template.quando}</Chip>
              </div>
              <p className="msg-templates__body">{template.corpo}</p>
            </li>
          ))}
        </ul>

        <p className="form-note">
          <Icon name="shield" size={13} />
          Nenhum modelo contém diagnóstico, medicação ou conteúdo de prontuário.
          Documentos são entregues por link autenticado, nunca no corpo da mensagem.
        </p>
      </CardBody>
    </Card>
  );
}

const truncate = (text, max) => {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max)}…` : value;
};
