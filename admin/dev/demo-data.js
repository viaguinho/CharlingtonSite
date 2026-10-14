/*
 * DADOS DE DEMONSTRAÇÃO — ambiente de desenvolvimento, modo local.
 *
 * Existem para que o dono veja e edite todos os recursos do painel antes de
 * haver pacientes de verdade. Regras:
 *   · só carregam em modo local (IndexedDB cifrado); em modo servidor recusam;
 *   · só entram no build de desenvolvimento (os chamadores usam import.meta.env.DEV);
 *   · todo registro criado leva `demoData: true`; entram por putMany, fora da
 *     auditoria, para não deixar nomes fictícios no log imutável;
 *   · remover apaga os registros marcados e tudo o que o dono tenha ligado a
 *     um paciente de demonstração. Registros que ele criou sem vínculo ficam.
 *
 * Este arquivo e o cartão em Configurações saem do projeto na finalização.
 */
import * as repo from '../data/repository.js';
import * as S from '../data/schema.js';
import { idbAdapter } from '../data/idb-adapter.js';
import { PLAZAS } from '../core/rbac.js';

const SKIP_ON_REMOVE = new Set([S.STORES.AUDIT, S.STORES.META, S.STORES.ATTACHMENT_BLOBS, S.STORES.CLINIC, S.STORES.USERS]);

export const DEMO_EVENT = 'charlington:demo-changed';
const notify = () => window.dispatchEvent(new Event(DEMO_EVENT));

export async function demoCounts() {
  const count = async (store) => (await idbAdapter.list(store, { includeDeleted: true })).filter((r) => r.demoData).length;
  const [pacientes, agendamentos, documentos, lancamentos] = await Promise.all([
    count(S.STORES.PATIENTS), count(S.STORES.APPOINTMENTS), count(S.STORES.DOCUMENTS), count(S.STORES.ENTRIES),
  ]);
  return { pacientes, agendamentos, documentos, lancamentos };
}

export async function hasDemoData() {
  if (repo.isServerMode()) return false;
  try {
    return (await idbAdapter.list(S.STORES.PATIENTS, { includeDeleted: true })).some((p) => p.demoData);
  } catch {
    return false;
  }
}

/* ═══════════════════════════════ Carregar ═══════════════════════════════ */

export async function loadDemoData({ userId = null, plaza = PLAZAS.CAMPINAS } = {}) {
  if (repo.isServerMode()) throw new Error('Dados de demonstração só existem no modo local. Este painel está ligado ao servidor.');
  if (await hasDemoData()) return { jaCarregado: true, ...(await demoCounts()) };

  const P = plaza ?? PLAZAS.CAMPINAS;
  const put = async (store, data) => {
    const record = { ...data, demoData: true, criadoPor: userId, atualizadoPor: userId };
    await repo.putMany(store, [record]);
    return record;
  };
  const ts = (d, h, m = 0) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const nasc = (a, mes, dd) => { const x = new Date(); x.setFullYear(x.getFullYear() - a, mes - 1, dd); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

  /* Salas: apenas Sala de Atendimento Neuropediátrico e Recepção Central. */
  const SALAS_OFICIAIS = [
    ['Sala de Atendimento Neuropediátrico', 'disponivel'],
    ['Recepção Central', 'disponivel'],
  ];
  const existentes = await repo.list(S.STORES.ROOMS, {});
  for (const r of existentes) {
    if (!SALAS_OFICIAIS.some(([nome]) => nome === r.nome)) {
      await idbAdapter.destroy(S.STORES.ROOMS, r.id).catch(() => {});
    }
  }

  const salas = [];
  const atualizadas = await repo.list(S.STORES.ROOMS, {});
  for (const [nome, status] of SALAS_OFICIAIS) {
    salas.push(atualizadas.find((x) => x.nome === nome && x.praca === P)
      ?? await put(S.STORES.ROOMS, { ...S.envelope({ praca: P }), nome, status, recursos: [] }));
  }
  const salaAtendimento = salas.find((r) => r.nome === 'Sala de Atendimento Neuropediátrico') || salas[0];

  /* Pacientes e responsáveis */
  const perfis = [
    ['Ana Beatriz Moraes', nasc(4, 3, 14), 'feminino', ['Dipirona'], 'F84.0', 'Atraso de fala e pouca interação com pares'],
    ['Bernardo Lins Teixeira', nasc(7, 8, 2), 'masculino', [], 'F90.0', 'Desatenção e agitação na escola'],
    ['Cecília Amaral Duarte', nasc(2, 11, 27), 'feminino', ['Amoxicilina'], 'G40.9', 'Crises convulsivas febris recorrentes'],
    ['Davi Rocha Menezes', nasc(9, 1, 9), 'masculino', [], 'G43.9', 'Cefaleia recorrente com fotofobia'],
    ['Elisa Tavares Pinto', nasc(5, 6, 21), 'feminino', ['Lactose'], 'F80.9', 'Troca de fonemas e vocabulário reduzido'],
    ['Felipe Andrade Coelho', nasc(11, 4, 5), 'masculino', [], 'F90.0', 'Queda no rendimento escolar'],
    ['Gabriela Nunes Ferraz', nasc(3, 9, 30), 'feminino', [], 'F84.0', 'Ausência de contato visual sustentado'],
    ['Heitor Barbosa Vilela', nasc(6, 2, 17), 'masculino', ['Penicilina'], 'G40.9', 'Episódios de ausência em sala'],
    ['Isabela Cardoso Prado', nasc(8, 12, 3), 'feminino', [], 'F81.0', 'Dificuldade persistente de leitura'],
    ['João Pedro Salgado', nasc(1, 5, 11), 'masculino', [], 'R62.0', 'Não sentou sem apoio aos 10 meses'],
    ['Lara Figueiredo Assis', nasc(10, 7, 25), 'feminino', ['Ibuprofeno'], 'G44.2', 'Cefaleia tensional diária'],
    ['Miguel Antunes Rezende', nasc(13, 10, 8), 'masculino', [], 'F90.1', 'Impulsividade e conflito com colegas'],
  ];
  const nomesExtra = ['Alice', 'Benício', 'Clara', 'Enzo', 'Helena', 'Lorenzo', 'Laura', 'Théo', 'Manuela', 'Gael', 'Valentina', 'Rafael', 'Sofia', 'Samuel', 'Lívia', 'Nicolas', 'Maria Luísa', 'Arthur', 'Beatriz', 'Pedro', 'Marina', 'Otávio', 'Luna', 'Caio', 'Melissa', 'Vicente', 'Antonella', 'Joaquim', 'Yasmin', 'Henrique'];
  const sobrenomesExtra = ['Queiroz Lemos', 'Siqueira Bastos', 'Macedo Farias', 'Guimarães Leal', 'Fontes Dantas', 'Brandão Sales', 'Moura Cunha', 'Peixoto Aguiar', 'Rangel Paiva', 'Toledo Freire'];
  const idadesBase = [4, 7, 2, 9, 5, 11, 3, 6, 8, 1, 10, 13];
  const FEMININOS = new Set(['Alice', 'Clara', 'Helena', 'Laura', 'Manuela', 'Valentina', 'Sofia', 'Lívia', 'Maria Luísa', 'Beatriz', 'Marina', 'Luna', 'Melissa', 'Antonella', 'Yasmin']);
  for (let k = 0; k < nomesExtra.length; k += 1) {
    const idade = 2 + (k * 5) % 11;
    // Queixa e CID vêm do perfil de idade mais próxima: criança de 2 anos não chega com dificuldade de leitura.
    let b = 0;
    idadesBase.forEach((a, n) => { if (Math.abs(a - idade) < Math.abs(idadesBase[b] - idade)) b = n; });
    const base = perfis[b];
    const sexo = FEMININOS.has(nomesExtra[k]) ? 'feminino' : 'masculino';
    perfis.push([`${nomesExtra[k]} ${sobrenomesExtra[k % sobrenomesExtra.length]}`, nasc(idade, 1 + (k * 7) % 12, 1 + (k * 11) % 27), sexo, [], base[4], base[5]]);
  }
  const maes = ['Renata', 'Patrícia', 'Juliana', 'Camila', 'Fernanda', 'Mariana', 'Aline', 'Luciana', 'Tatiane', 'Carolina', 'Vanessa', 'Priscila', 'Débora', 'Simone', 'Roberta', 'Elaine', 'Cristina', 'Adriana'];
  const pacientes = [];
  for (const [k, [nome, dataNascimento, sexo, alergias, cid, queixaPrincipal]] of perfis.entries()) {
    const sobrenome = nome.split(' ').slice(-1)[0];
    const responsavel = await put(S.STORES.GUARDIANS, {
      ...S.newGuardian({ praca: P }), nome: `${maes[k % maes.length]} ${sobrenome}`, parentesco: 'Mãe',
      telefone: `1990000${String(k + 1).padStart(4, '0')}`,
      autorizacoes: { retirarCrianca: true, receberDocumentos: true, agendar: true },
    });
    pacientes.push(await put(S.STORES.PATIENTS, {
      ...S.newPatient({ praca: P }), nome, dataNascimento, sexo, responsaveis: [responsavel.id],
      clinico: { queixaPrincipal, gestacaoParto: '', antecedentesFamiliares: '', alergias, comorbidades: [], diagnosticos: [cid] },
    }));
  }

  /* Agenda: 60 dias para trás, 14 à frente, sem fim de semana nem feriado, uma
     consulta por criança por dia, retorno só 21 dias ou mais depois. Hoje o
     status segue o relógio. Deixados de propósito: ontem às 10:00 ainda
     "confirmado" e uma criança com as duas últimas consultas perdidas. */
  const FERIADOS = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']);
  const ehFeriado = (dia) => {
    const iso = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
    return FERIADOS.has(iso.slice(5));
  };
  const INTERVALO_MIN = 21;
  const NOVOS = 6;
  const ultima = pacientes.map((_, k) => (k < pacientes.length - NOVOS ? -(INTERVALO_MIN + ((k * 13) % 45)) - 60 : null));
  const chegada = pacientes.map((_, k) => (k < pacientes.length - NOVOS ? null : -50 + (k - (pacientes.length - NOVOS)) * 9));
  const tiposRetorno = ['retorno', 'retorno', 'retorno', 'teleconsulta', 'laudo'];
  const agora = Date.now();
  const plano = [];
  let seq = 0;
  for (let d = -60; d <= 14; d += 1) {
    const dia = new Date(); dia.setDate(dia.getDate() + d);
    if (dia.getDay() === 0 || dia.getDay() === 6 || ehFeriado(dia)) continue;
    const quantos = d === -1 || d === 0 ? 4 : 2 + (Math.abs(d) % 3);
    const elegiveis = pacientes
      .map((p, k) => ({ p, k, espera: ultima[k] === null ? (chegada[k] <= d ? 1000 - chegada[k] : -1) : d - ultima[k] }))
      .filter((e) => (ultima[e.k] === null ? chegada[e.k] <= d : e.espera >= INTERVALO_MIN))
      .sort((a, b) => b.espera - a.espera || a.k - b.k)
      .slice(0, quantos);
    elegiveis.forEach(({ p: paciente, k }, i) => {
      const tipo = ultima[k] === null ? 'primeira' : tiposRetorno[(seq + i) % tiposRetorno.length];
      ultima[k] = d;
      const hora = 8 + i;
      const inicio = ts(d, hora, (i % 2) * 30);
      const passou = new Date(inicio).getTime() + 60 * 60000 < agora;
      let status;
      if (d === -1 && hora === 10) {
        status = S.APPOINTMENT_STATUS.CONFIRMED;
      } else if (d < 0 || (d === 0 && passou)) {
        const r = (seq * 7 + i) % 10;
        status = r === 0 ? S.APPOINTMENT_STATUS.NO_SHOW : r === 1 ? S.APPOINTMENT_STATUS.CANCELLED : S.APPOINTMENT_STATUS.DONE;
      } else {
        status = i % 3 === 0 || d === 0 ? S.APPOINTMENT_STATUS.CONFIRMED : S.APPOINTMENT_STATUS.SCHEDULED;
      }
      plano.push({ paciente, k, d, hora, inicio, tipo, status, seq });
      seq += 1;
    });
  }
  {
    const passadas = (k) => plano.filter((x) => x.k === k && x.d < -1);
    const alvo = pacientes.findIndex((_, k) => passadas(k).length >= 2 && k !== 7);
    for (const x of passadas(alvo).slice(-2)) x.status = S.APPOINTMENT_STATUS.NO_SHOW;
  }
  const ags = [];
  for (const { paciente, hora, inicio, tipo, status, seq: n } of plano) {
    const fim = new Date(new Date(inicio).getTime() + 40 * 60000).toISOString();
    const feito = status === S.APPOINTMENT_STATUS.DONE;
    ags.push(await put(S.STORES.APPOINTMENTS, {
      ...S.newAppointment({ praca: P }),
      pacienteId: paciente.id, inicio, fim, tipo, status, valor: tipo === 'laudo' ? 620 : 450,
      salaId: tipo === 'teleconsulta' ? null : salaAtendimento.id,
      checkInEm: tipo !== 'teleconsulta' && (feito || status === S.APPOINTMENT_STATUS.CHECKED_IN)
        ? new Date(new Date(inicio).getTime() - (5 + (n % 20)) * 60000).toISOString() : null,
      inicioAtendimento: feito && (n % 5 !== 0) ? new Date(new Date(inicio).getTime() + (2 + (n % 15)) * 60000).toISOString() : null,
      fimAtendimento: feito ? new Date(new Date(inicio).getTime() + (32 + (n % 25)) * 60000).toISOString() : null,
    }));
  }

  /* Evoluções */
  const Sx = ['Mãe relata melhora do sono e menos crises de choro ao fim do dia.', 'Escola informa maior permanência nas atividades dirigidas.', 'Pai refere dois episódios de cefaleia na última quinzena, sem vômitos.', 'Sem novas crises desde o ajuste de dose.', 'Fonoaudióloga observa ampliação do vocabulário expressivo.', 'Família relata irritabilidade após troca de rotina escolar.'];
  const Ox = ['Exame neurológico sem sinais focais. Marcha típica.', 'Contato visual intermitente, responde ao nome na segunda chamada.', 'Fundo de olho sem alterações. PA 98x62.', 'Tônus e força preservados. Reflexos simétricos.', 'Atenção sustentada por cerca de 8 minutos em tarefa estruturada.'];
  const Ax = ['Evolução favorável, conduta mantida.', 'Resposta parcial à intervenção; reavaliar em 60 dias.', 'Quadro estável.', 'Piora comportamental provavelmente reativa à mudança de rotina.'];
  const Px = ['Manter terapias. Retorno em 90 dias.', 'Solicitado EEG em sono. Retorno com resultado.', 'Orientado diário de cefaleia. Retorno em 30 dias.', 'Relatório escolar a emitir. Retorno em 60 dias.'];
  const feitos = ags.filter((a) => a.status === S.APPOINTMENT_STATUS.DONE);
  for (let k = 0; k < feitos.length; k += 1) {
    const a = feitos[k];
    const p = pacientes.find((x) => x.id === a.pacienteId);
    await put(S.STORES.NOTES, {
      ...S.newNote({ praca: P }), pacienteId: a.pacienteId, atendimentoId: a.id,
      subjetivo: Sx[k % Sx.length], objetivo: Ox[(k * 3) % Ox.length], avaliacao: Ax[(k * 5) % Ax.length], plano: Px[(k * 7) % Px.length],
      cidPrincipal: p.clinico.diagnosticos[0], assinadaEm: a.fimAtendimento, travada: true,
    });
  }

  /* Financeiro */
  const fixas = [['Aluguel da unidade', 'Aluguel', 8400], ['Folha de pagamento', 'Folha de pagamento', 19600], ['Sistema de prontuário', 'Software e sistemas', 890], ['Contabilidade', 'Contabilidade', 1450], ['Material de consumo', 'Material de consumo', 1120], ['Impostos — Simples Nacional', 'Impostos', 5300]];
  for (let m = 2; m >= 0; m -= 1) {
    for (const [descricao, categoria, valor] of fixas) {
      const v = new Date(); v.setMonth(v.getMonth() - m, 10); v.setHours(10, 0, 0, 0);
      const pago = v < new Date();
      await put(S.STORES.ENTRIES, {
        ...S.newEntry({ praca: P }), tipo: S.ENTRY_TYPES.EXPENSE, descricao, categoria, centroCusto: 'Campinas / SP', valor,
        vencimento: v.toISOString().slice(0, 10), status: pago ? S.ENTRY_STATUS.PAID : S.ENTRY_STATUS.PENDING,
        pagamentoEm: pago ? v.toISOString() : null, formaPagamento: pago ? 'Transferência' : '',
      });
    }
  }
  for (let k = 0; k < feitos.length; k += 1) {
    const a = feitos[k];
    const atrasado = k % 11 === 0;
    await put(S.STORES.ENTRIES, {
      ...S.newEntry({ praca: P }), tipo: S.ENTRY_TYPES.REVENUE,
      descricao: `${a.tipo === 'laudo' ? 'Laudo' : a.tipo === 'teleconsulta' ? 'Teleconsulta' : 'Consulta'} — ${pacientes.find((p) => p.id === a.pacienteId).nome}`,
      categoria: a.tipo === 'teleconsulta' ? 'Teleconsulta' : a.tipo === 'laudo' ? 'Laudo e relatório' : 'Consulta particular',
      centroCusto: 'Campinas / SP', valor: a.valor, vencimento: a.inicio.slice(0, 10),
      status: atrasado ? S.ENTRY_STATUS.PENDING : S.ENTRY_STATUS.PAID, pagamentoEm: atrasado ? null : a.inicio,
      formaPagamento: atrasado ? '' : ['Pix', 'Cartão de crédito', 'Dinheiro'][k % 3],
      pacienteId: a.pacienteId, atendimentoId: a.id,
    });
  }

  /* Consentimentos: teleconsulta só para metade das famílias. */
  for (const [k, p] of pacientes.entries()) {
    const finalidades = ['tratamento_clinico'];
    if (k % 2 === 0) finalidades.push('teleconsulta');
    if (k % 4 !== 3) finalidades.push('comunicacao_whatsapp');
    if (k % 3 === 0) finalidades.push('comunicacao_email');
    for (const finalidade of finalidades) {
      await put(S.STORES.CONSENTS, {
        ...S.newConsent({ praca: P }), pacienteId: p.id, titularId: p.id, responsavelId: p.responsaveis[0],
        finalidade, versaoTexto: '1.0', textoApresentado: finalidade, concedidoEm: ts(-60, 9),
      });
    }
  }

  /* Documentos emitidos. O médico, o CRM e a assinatura são inequivocamente
     fictícios (".invalid" é um domínio reservado que nunca resolve): um documento
     de demonstração impresso não pode passar por um de verdade. */
  const sha = async (t) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map((b) => b.toString(16).padStart(2, '0')).join('');
  const modelos = [
    { k: 2, tipo: S.DOCUMENT_TYPES.PRESCRIPTION, titulo: 'PRESCRIÇÃO MÉDICA', dias: -12,
      itens: [
        { principio: 'Levetiracetam', concentracao: '100 mg/mL', forma: 'solução oral', posologia: 'Tomar 3 mL, via oral, de 12 em 12 horas, todos os dias.', quantidade: '1 frasco de 150 mL' },
        { principio: 'Ácido fólico', concentracao: '5 mg', forma: 'comprimido', posologia: 'Tomar 1 comprimido, via oral, 1 vez ao dia.', quantidade: '30 comprimidos' },
      ], conteudo: 'Retorno em 60 dias com diário de crises.' },
    { k: -1, tipo: S.DOCUMENT_TYPES.ATTENDANCE, titulo: 'ATESTADO DE COMPARECIMENTO', dias: -3, conteudo: '' },
    { k: 7, tipo: S.DOCUMENT_TYPES.REPORT, titulo: 'LAUDO NEUROLÓGICO', dias: -7,
      conteudo: 'Criança em acompanhamento neuropediátrico por epilepsia focal, em uso regular de levetiracetam, sem crises nos últimos 4 meses. Exame neurológico sem sinais focais. Desenvolvimento neuropsicomotor adequado para a idade.\n\nConduta: manter a medicação e o acompanhamento. Retorno em 90 dias, ou antes se houver nova crise.' },
  ];
  const hhmm = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  for (const [i, m] of modelos.entries()) {
    let p = pacientes[m.k];
    let emitidoEm = ts(m.dias, 10, 12);
    if (m.k === -1) {
      // O atestado de comparecimento sai de uma consulta que de fato aconteceu: paciente, dia e horário vêm dela.
      const consulta = feitos.filter((a) => a.fimAtendimento && a.tipo !== 'teleconsulta').slice(-1)[0];
      p = pacientes.find((x) => x.id === consulta.pacienteId);
      emitidoEm = consulta.fimAtendimento;
      const fem = p.sexo === 'feminino';
      m.conteudo = `Atesto, para os devidos fins de direito, que ${fem ? 'a paciente acima identificada, acompanhada' : 'o paciente acima identificado, acompanhado'} de seu responsável legal, compareceu à consulta médica nesta data, no período das ${hhmm(consulta.inicio)} às ${hhmm(consulta.fimAtendimento)}.`;
    }
    const hash = await sha(JSON.stringify({ type: m.tipo, text: m.conteudo, items: m.itens ?? [], patientId: p.id }));
    await put(S.STORES.DOCUMENTS, {
      ...S.newDocument({ praca: P }),
      pacienteId: p.id, atendimentoId: null, tipo: m.tipo, titulo: m.titulo,
      conteudo: m.conteudo, itens: m.itens ?? [], numero: `${new Date().getFullYear()}/${String(i + 1).padStart(4, '0')}`,
      hashConteudo: hash,
      assinatura: {
        provedor: 'Demonstração — sem validade', id: `DEMO-${hash.slice(0, 10).toUpperCase()}`,
        urlVerificacao: `https://demonstracao.invalid/${hash.slice(0, 12)}`, assinadoEm: emitidoEm,
        medico: { nome: 'Médico de demonstração', crm: '000000-DEMO' },
      },
      status: S.DOCUMENT_STATUS.SIGNED,
    });
  }

  /* Insumos */
  for (const [nome, unidade, estoque, minimo] of [['Luvas de procedimento', 'caixa', 4, 6], ['Álcool 70%', 'litro', 12, 5], ['Papel para maca', 'rolo', 2, 4], ['Martelo de reflexo', 'unidade', 3, 1]]) {
    await put(S.STORES.SUPPLIES, { ...S.envelope({ praca: P }), nome, unidade, estoque, minimo, validade: '', fornecedor: '' });
  }

  notify();
  return { jaCarregado: false, ...(await demoCounts()) };
}

/* ═══════════════════════════════ Remover ═══════════════════════════════ */

export async function removeDemoData() {
  if (repo.isServerMode()) throw new Error('Remoção só vale no modo local.');
  const demoPatients = (await idbAdapter.list(S.STORES.PATIENTS, { includeDeleted: true })).filter((p) => p.demoData);
  const patientIds = new Set(demoPatients.map((p) => p.id));
  let removed = 0;

  for (const store of Object.values(S.STORES)) {
    if (SKIP_ON_REMOVE.has(store)) continue;
    const records = await idbAdapter.list(store, { includeDeleted: true });
    for (const record of records) {
      const linked = patientIds.has(record.pacienteId) || patientIds.has(record.titularId);
      if (!record.demoData && !linked) continue;
      await idbAdapter.destroy(store, record.id);
      removed += 1;
    }
  }

  notify();
  return { removidos: removed };
}
