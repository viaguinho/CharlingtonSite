import { useEffect, useMemo, useRef, useState } from 'react';
import { APPOINTMENT_TYPE_LABELS } from '../../../data/schema.js';
import { canReschedule, isUpcoming, stateOf } from '../../../core/appointments.js';
import GlassFolder from '../../../components/GlassFolder.tsx';
import Icon from '../../../components/Icon.jsx';
import { age, date, dateTime, phone as formatPhone, relative } from '../../../core/format.js';
import { useAttachmentThumbs } from './useAttachmentThumbs.js';
import { findCID10 } from '../../../data/cid10.js';
import { firstVisit } from './patientStates.js';

/**
 * Coluna esquerda — a pilha de cards do paciente da referência:
 * perfil com a trilha de acompanhamento, diagnósticos, pastas de exames e,
 * no pé, a pílula da próxima consulta (o "Doctor: …" do Quantis).
 */

const SEX_LABELS = { feminino: 'Feminino', masculino: 'Masculino', intersexo: 'Intersexo' };

export const FOLDER_GROUPS = [
  { key: 'imagem', label: 'Imagem', origens: ['exame_imagem'] },
  { key: 'neuro', label: 'Neurofisiológico', origens: ['exame_neurofisiologico'] },
  { key: 'lab', label: 'Laboratorial', origens: ['exame_laboratorial'] },
  { key: 'genetico', label: 'Genético', origens: ['exame_genetico'] },
  { key: 'pareceres', label: 'Pareceres', origens: ['parecer_to', 'parecer_fono', 'parecer_psi'] },
  { key: 'escolar', label: 'Escolar', origens: ['relatorio_escolar'] },
  { key: 'outros', label: 'Outros', origens: ['outro'] },
];

export function ProfileColumn({
  patient, guardians, appointments, attachments, states,
  onReschedule, onSchedule, onOpenAttachments, onUpload, onPreview, onGoToSection, canUpload,
}) {
  return (
    <div className="pr-profile">
      <ProfileCard patient={patient} guardians={guardians} appointments={appointments} onOpenTimeline={() => onGoToSection('linha-do-tempo')} />
      <DiagnosesCard patient={patient} />
      <Folders
        attachments={attachments}
        onOpen={onOpenAttachments}
        onUpload={onUpload}
        onPreview={onPreview}
        canUpload={canUpload}
      />
      <CareCard patient={patient} />
      <NextVisit states={states} onReschedule={onReschedule} onSchedule={onSchedule} />
    </div>
  );
}

/* ─────────────────────────── Perfil ─────────────────────────── */

function ProfileCard({ patient, guardians, appointments, onOpenTimeline }) {
  const ageInfo = patient.dataNascimento ? age(patient.dataNascimento) : null;
  const guardian = guardians[0];
  return (
    <section className="pr-card pr-card--lit pr-patient" aria-labelledby="pr-profile-title">
      <h2 id="pr-profile-title" className="pr-card__title">Perfil do paciente</h2>

      <dl className="pr-facts">
        <div>
          <dt>Nascimento</dt>
          <dd className="num">{patient.dataNascimento ? `${date(patient.dataNascimento)}` : 'Não informado'}</dd>
          {ageInfo ? <dd className="pr-facts__sub">{ageInfo.label}</dd> : null}
        </div>
        <div>
          <dt>Sexo</dt>
          <dd>{SEX_LABELS[patient.sexo] ?? 'Não informado'}</dd>
        </div>
        <div className="pr-facts__wide">
          <dt>{guardians.length > 1 ? `Responsáveis (${guardians.length})` : 'Responsável'}</dt>
          {guardian ? (
            <>
              <dd>{guardian.nome}</dd>
              <dd className="pr-facts__sub">
                {[guardian.parentesco, guardian.telefone ? formatPhone(guardian.telefone) : null].filter(Boolean).join(' · ')}
              </dd>
              {guardians.length > 1 ? (
                <dd className="pr-facts__sub">
                  + {guardians.slice(1).map((g) => `${g.nome}${g.parentesco ? ` (${g.parentesco})` : ''}`).join(' · ')}
                </dd>
              ) : null}
            </>
          ) : <dd>Nenhum cadastrado</dd>}
        </div>
      </dl>

      <FollowUpTrail appointments={appointments} onOpen={onOpenTimeline} />

    </section>
  );
}

/**
 * A trilha tracejada do "Weight and Trend": cada consulta é um traço na sua
 * data real, entre a primeira consulta e hoje. Concluída é traço cheio, falta
 * é traço curto e claro, a próxima marcada é um anel.
 *
 * Mesma régua das pílulas de alerta e da faixa (`stateOf`/`isUnresolved`):
 * emissão de laudo e evento não contam como consulta realizada, mas toda
 * falta conta — a faixa e a Linha do tempo mostram as de laudo também, e a
 * trilha não pode dizer "1 falta" onde houve 3 ausências. "Sem desfecho" é só
 * o que `stateOf` chama assim, então a consulta de hoje que está atrasada não
 * entra aqui (a pílula diz "Atrasado").
 */
const NOT_A_VISIT = new Set(['laudo', 'evento']);

function FollowUpTrail({ appointments, onOpen }) {
  const now = Date.now();
  const visits = appointments.filter((a) => !NOT_A_VISIT.has(a.tipo));
  const done = visits.filter((a) => stateOf(a, now) === 'concluido');
  const missed = appointments.filter((a) => a.tipo !== 'evento' && stateOf(a, now) === 'faltou');
  const pending = appointments.filter((a) => stateOf(a, now) === 'sem_desfecho');
  const upcoming = appointments
    .filter((a) => a.tipo !== 'evento' && isUpcoming(a, now) && new Date(a.inicio).getTime() > now)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];

  const past = [...done, ...missed, ...pending];
  if (!past.length) {
    return (
      <div className="pr-trail pr-trail--empty">
        <span className="pr-trail__label">Acompanhamento</span>
        <span className="pr-trail__value">Nenhuma consulta realizada</span>
      </div>
    );
  }

  // "desde" é o mesmo do cabeçalho ("em acompanhamento desde"): o primeiro
  // atendimento concluído de qualquer tipo, laudo inclusive. O eixo começa no
  // que vier antes — ele ou uma falta anterior, que também é história.
  const first = firstVisit(appointments);
  const start = Math.min(...past.map((a) => new Date(a.inicio).getTime()), first ? new Date(first.inicio).getTime() : Infinity);
  const since = first ? date(first.inicio) : null;
  const end = Math.max(Date.now(), upcoming ? new Date(upcoming.inicio).getTime() : 0);
  const span = Math.max(1, end - start);
  const at = (iso) => 2 + ((new Date(iso).getTime() - start) / span) * 96;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const total = done.length + missed.length + pending.length;
  const summary = [
    plural(done.length, 'consulta realizada', 'consultas realizadas'),
    missed.length ? plural(missed.length, 'falta', 'faltas') : null,
    pending.length ? plural(pending.length, 'sem desfecho', 'sem desfecho') : null,
  ].filter(Boolean).join(', ');

  return (
    <button type="button" className="pr-trail" onClick={onOpen}
      aria-label={`Acompanhamento${since ? ` desde ${since}` : ''}: ${summary}${upcoming ? `, próxima em ${date(upcoming.inicio)}` : ''}. Abrir linha do tempo.`}>
      <span className="pr-trail__row">
        <span className="pr-trail__label">Acompanhamento</span>
        {/* "1 consulta" ao lado de 3 cápsulas na faixa enganava: o total vem junto. */}
        <span className="pr-trail__value num">{done.length === total ? plural(total, 'consulta', 'consultas') : `${done.length} de ${total} realizadas`}</span>
      </span>
      <span className="pr-trail__track">
      <svg className="pr-trail__svg" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <line className="pr-trail__base" x1="0" x2="100" y1="5" y2="5" />
        {missed.map((a) => <line key={a.id} className="pr-trail__miss" x1={at(a.inicio) - .6} x2={at(a.inicio) + .6} y1="5" y2="5" />)}
        {pending.map((a) => <line key={a.id} className="pr-trail__pending" x1={at(a.inicio) - 1.2} x2={at(a.inicio) + 1.2} y1="5" y2="5" />)}
        {done.map((a) => <line key={a.id} className="pr-trail__done" x1={at(a.inicio) - 1.6} x2={at(a.inicio) + 1.6} y1="5" y2="5" />)}
        <line className="pr-trail__today" x1={at(new Date().toISOString())} x2={at(new Date().toISOString())} y1="1.5" y2="8.5" />

      </svg>
        {/* A próxima consulta marcada é um anel (guia §4.2); fora do SVG
            esticado, para não virar elipse. */}
        {upcoming ? <i className="pr-trail__upcoming" style={{ left: `${at(upcoming.inicio)}%` }} aria-hidden="true" /> : null}
      </span>
      <span className="pr-trail__row pr-trail__row--foot">
        <span>{missed.length || pending.length ? summary.split(', ').slice(1).join(' · ') : since ? `desde ${since}` : ''}</span>
        {upcoming ? <span className="pr-trail__next"><i aria-hidden="true" /> próxima {date(upcoming.inicio)}</span> : null}
      </span>
    </button>
  );
}

/* ─────────────────── Como receber esta criança ─────────────────── */

function CareCard({ patient }) {
  const sensory = patient.perfilSensorial ?? {};
  const school = patient.escola?.instituicao;
  if (!sensory.gatilhos && !sensory.estrategias && !sensory.toleranciaEspera && !school) return null;
  return (
    <section className="pr-card pr-care" aria-labelledby="pr-care-title">
      <h2 id="pr-care-title" className="pr-card__title">Perfil sensorial</h2>
      <dl className="pr-care__list">
        {sensory.gatilhos ? <div><dt>Evitar</dt><dd>{sensory.gatilhos}</dd></div> : null}
        {sensory.estrategias ? <div><dt>Funciona</dt><dd>{sensory.estrategias}</dd></div> : null}
        {sensory.toleranciaEspera ? <div><dt>Espera</dt><dd>{sensory.toleranciaEspera}</dd></div> : null}
        {school ? <div><dt>Escola</dt><dd>{school}{patient.escola.serie ? ` · ${patient.escola.serie}` : ''}</dd></div> : null}
      </dl>
    </section>
  );
}

/* ───────────────────────── Diagnósticos ───────────────────────── */

function DiagnosesCard({ patient }) {
  const list = patient.clinico?.diagnosticos ?? [];
  return (
    <section className="pr-card pr-dx" aria-labelledby="pr-dx-title">
      <h2 id="pr-dx-title" className="pr-card__title">Diagnósticos ativos</h2>
      {list.length ? (
        <ul className="pr-dx__list">
          {list.map((d) => {
            // A maioria das fichas guarda só o código ("F90.0"): a descrição
            // vem do catálogo CID-10, e sem catálogo fica só o código.
            const code = typeof d === 'string' ? d : d.codigo;
            const description = (typeof d === 'string' ? null : d.descricao) ?? findCID10(code)?.descricao ?? null;
            return (
              <li key={code ?? String(d)}>
                <span className="pr-dx__dot" aria-hidden="true" />
                <strong className="num">{code ?? '—'}</strong>
                {description ? <span>{description}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="pr-empty">Nenhum diagnóstico registrado.</p>
      )}
    </section>
  );
}

/* ─────────────────────────── Pastas ─────────────────────────── */

function Folders({ attachments, onOpen, onUpload, onPreview, canUpload }) {
  const groups = useMemo(() => FOLDER_GROUPS
    .map((g) => ({
      ...g,
      files: attachments
        .filter((a) => g.origens.includes(a.origem))
        .sort((a, b) => (b.realizadoEm ?? b.criadoEm ?? '').localeCompare(a.realizadoEm ?? a.criadoEm ?? '')),
    }))
    .filter((g) => g.files.length), [attachments]);

  return (
    <section className="pr-folders" aria-labelledby="pr-folders-title">
      <div className="pr-insights__head">
        <h2 id="pr-folders-title">Exames e anexos</h2>
        <button type="button" className="pr-link" onClick={() => onOpen(null)}>
          {attachments.length ? `${attachments.length} ${attachments.length === 1 ? 'arquivo' : 'arquivos'}` : 'Abrir'}
          <Icon name="arrow-up-right" size={14} />
        </button>
      </div>
      <div className="pr-folders__grid">
        {groups.map((group, i) => (
          <FolderCard key={group.key} group={group} index={i} onOpen={onOpen} onUpload={canUpload ? onUpload : null} onPreview={onPreview} />
        ))}
        {canUpload ? (
          <button type="button" className={`pr-folder pr-folder--add ${groups.length ? '' : 'is-alone'}`.trim()} onClick={() => onUpload(null)}>
            <span className="pr-folder__plus" aria-hidden="true"><Icon name="plus" size={20} /></span>
            <span className="pr-folder__add-label">Anexar exame</span>
            {!groups.length ? <span className="pr-folder__hint">RM, EEG, laudos e relatórios de terapeutas, cifrados no prontuário.</span> : null}
          </button>
        ) : null}
        {!groups.length && !canUpload ? <p className="pr-empty">Nenhum exame anexado.</p> : null}
      </div>
    </section>
  );
}

function FolderCard({ group, index, onOpen, onUpload, onPreview }) {
  const ref = useRef(null);
  const stageRef = useRef(null);
  const [visible, setVisible] = useState(false);
  // A pasta ocupa a largura útil do card (a referência a faz o herói dele).
  const [width, setWidth] = useState(132);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      if (w > 0) setWidth(Math.max(96, Math.min(220, w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // As 4 mais recentes vão para a pasta; a mais nova fica na frente do vidro.
  const shown = group.files.slice(0, 4).reverse();
  const thumbs = useAttachmentThumbs(shown, visible);
  const latest = group.files[0];

  const files = shown.map((a) => ({
    name: a.titulo,
    meta: date(a.realizadoEm),
    image: thumbs[a.id],
  }));

  return (
    <article ref={ref} className="pr-folder">
      <header className="pr-folder__head">
        <span>
          <h3>{group.label}</h3>
          <span className="pr-folder__date num">{date(latest.realizadoEm ?? latest.criadoEm)}</span>
        </span>
        <button type="button" className="pr-folder__open" aria-label={`Abrir exames: ${group.label}`} onClick={() => onOpen(group.origens)}>
          <Icon name="arrow-up-right" size={16} />
        </button>
      </header>
      <div ref={stageRef} className="pr-folder__stage">
        <GlassFolder
          name={group.label}
          label={`${group.files.length} ${group.files.length === 1 ? 'arquivo' : 'arquivos'}`}
          meta=""
          // Fundo liso: a arte acetinada aparecia atrás das folhas como um
          // retângulo solto e mudava o vidro de uma pasta para outra.
          art="none"
          seed={3 + index * 7}
          width={width}
          files={files}
          action={onUpload ? 'add' : 'none'}
          // O tipo vem do conteúdo real da pasta (o anexo mais recente), nunca do primeiro tipo do grupo.
          onAdd={() => { onUpload(latest.origem ?? (group.origens.length === 1 ? group.origens[0] : null)); return undefined; }}
          onFileSelect={(_, i) => onPreview(shown[i])}
          appearDelay={index * 120}
        />
      </div>
    </article>
  );
}

/* ─────────────────────── Próxima consulta ─────────────────────── */

function NextVisit({ states, onReschedule, onSchedule }) {
  const { next, present, late, unresolved } = states;
  // Os estados de agora (na recepção, atrasado, sem desfecho) substituem a
  // pílula da próxima consulta, mas sem retorno marcado o "agendar" fica.
  const busy = present || late || unresolved;
  if (busy && next) return null;

  if (!next) {
    return (
      <button type="button" className="pr-next pr-next--empty" onClick={onSchedule}>
        <Icon name="calendar" size={16} />
        <span>{busy ? 'Agendar retorno' : 'Sem retorno agendado — agendar retorno'}</span>
      </button>
    );
  }

  return (
    <div className="pr-next">
      <Icon name="calendar" size={16} />
      <span className="pr-next__text">
        <span className="pr-next__label">Próxima</span>
        <strong className="num">{dateTime(next.inicio)}</strong>
        <span>{APPOINTMENT_TYPE_LABELS[next.tipo]} · {relative(next.inicio)}</span>
      </span>
      {onReschedule && canReschedule(next) ? (
        <button type="button" className="pr-next__action" onClick={() => onReschedule(next)}>Remarcar</button>
      ) : null}
    </div>
  );
}

