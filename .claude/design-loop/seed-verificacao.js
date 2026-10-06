/*
 * Base de VERIFICAÇÃO para a crítica de design — roda no perfil headless.
 * Faz a configuração inicial, entra e cria registros sintéticos locais.
 * Nunca é carregada pelo painel e nunca chega ao Supabase.
 */
const step = async (fn, ms = 700) => { fn(); await __sleep(ms); };

if (document.body.innerText.includes('Configuração inicial')) {
  await step(() => {
    __set(__f('RAZÃO SOCIAL'), 'Charlington M. Cavalcante — Neurologia Infantil');
    __set(__f('NOME FANTASIA'), 'Clínica Charlington');
  }, 200);
  await step(() => __btn('Continuar').click());
  await step(() => __btn('Continuar').click());
  await step(() => {
    __set(__f('NOME COMPLETO'), 'Charlington M. Cavalcante');
    const perfil = __f('PERFIL');
    __set(perfil, Array.from(perfil.options).find((o) => /dico/i.test(o.text)).value);
    __set(__f('CRM'), '999999-SP');
    __set(__f('E-MAIL'), 'charlington@clinicacharlington.com.br');
    __set(__f('SENHA'), 'VerificacaoLocal#2026');
    __set(__f('CONFIRME A SENHA'), 'VerificacaoLocal#2026');
  }, 250);
  await step(() => __btn('Continuar').click(), 900);
  await step(() => __btn('Concluir').click(), 2500);
  await step(() => __btn('Entrar no painel').click(), 2000);
}

if (document.querySelector('input[type=password]')) {
  __set(__f('E-MAIL'), 'charlington@clinicacharlington.com.br');
  __set(__f('SENHA'), 'VerificacaoLocal#2026');
  await __sleep(200);
  document.querySelector('button[type=submit]').click();
  await __sleep(3000);
}

const repo = await import('/admin/data/repository.js');
const S = await import('/admin/data/schema.js');
const { PLAZAS } = await import('/admin/core/rbac.js');
if (repo.isServerMode?.()) throw new Error('modo servidor — semeadura abortada');
if ((await repo.list(S.STORES.PATIENTS, {})).length) return { jaSemeado: true };

const P = PLAZAS.CAMPINAS;
const ts = (d, h, m = 0) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString(); };
const nasc = (a, mes, dd) => { const x = new Date(); x.setFullYear(x.getFullYear() - a, mes - 1, dd); return x.toISOString().slice(0, 10); };

/* Salas */
const salas = [];
for (const [nome, status] of [['Consultório 1', 'disponivel'], ['Consultório 2', 'disponivel'], ['Sala de avaliação', 'manutencao']]) {
  const existentes = await repo.list(S.STORES.ROOMS, {});
  const r = existentes.find((x) => x.nome === nome)
    ?? await repo.create(S.STORES.ROOMS, { ...S.envelope({ praca: P }), nome, status, recursos: [] });
  salas.push(r);
}
const salasLivres = salas.filter((r) => r.status !== 'manutencao');

/* Pacientes */
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
/* Crianças adicionais: com 12 crianças e 3 a 6 consultas por dia útil, cada
   uma voltava duas vezes por semana, cadência que nenhum consultório de
   neuropediatria tem. Nomes combinados, queixa e CID herdados dos perfis. */
const nomesExtra = ['Alice', 'Benício', 'Clara', 'Enzo', 'Helena', 'Lorenzo', 'Laura', 'Théo', 'Manuela', 'Gael', 'Valentina', 'Rafael', 'Sofia', 'Samuel', 'Lívia', 'Nicolas', 'Maria Luísa', 'Arthur', 'Beatriz', 'Pedro', 'Marina', 'Otávio', 'Luna', 'Caio', 'Melissa', 'Vicente', 'Antonella', 'Joaquim', 'Yasmin', 'Henrique'];
const sobrenomesExtra = ['Queiroz Lemos', 'Siqueira Bastos', 'Macedo Farias', 'Guimarães Leal', 'Fontes Dantas', 'Brandão Sales', 'Moura Cunha', 'Peixoto Aguiar', 'Rangel Paiva', 'Toledo Freire'];
for (let k = 0; k < nomesExtra.length; k += 1) {
  const base = perfis[k % 12];
  const sexo = /a$|Clara|Helena|Laura|Sofia|Luna|Yasmin|Beatriz|Melissa|Maria/.test(nomesExtra[k]) && !/Joaquim/.test(nomesExtra[k]) ? 'feminino' : 'masculino';
  perfis.push([`${nomesExtra[k]} ${sobrenomesExtra[k % sobrenomesExtra.length]}`, nasc(2 + (k * 5) % 11, 1 + (k * 7) % 12, 1 + (k * 11) % 27), sexo, [], base[4], base[5]]);
}
const pacientes = [];
const maes = ['Renata', 'Patrícia', 'Juliana', 'Camila', 'Fernanda', 'Mariana', 'Aline', 'Luciana', 'Tatiane', 'Carolina', 'Vanessa', 'Priscila', 'Débora', 'Simone', 'Roberta', 'Elaine', 'Cristina', 'Adriana'];
for (const [k, [nome, dataNascimento, sexo, alergias, cid, queixaPrincipal]] of perfis.entries()) {
  // Responsável sintético (base de verificação): sem ele a coluna inteira
  // dizia "Não vinculado", o que nenhuma clínica real teria.
  const sobrenome = nome.split(' ').slice(-1)[0];
  const responsavel = await repo.create(S.STORES.GUARDIANS, {
    ...S.newGuardian({ praca: P }), nome: `${maes[k % maes.length]} ${sobrenome}`, parentesco: 'Mãe',
    telefone: `1990000${String(k + 1).padStart(4, '0')}`,
    autorizacoes: { retirarCrianca: true, receberDocumentos: true, agendar: true },
  });
  pacientes.push(await repo.create(S.STORES.PATIENTS, {
    ...S.newPatient({ praca: P }), nome, dataNascimento, sexo, responsaveis: [responsavel.id],
    clinico: { queixaPrincipal, gestacaoParto: '', antecedentesFamiliares: '', alergias, comorbidades: [], diagnosticos: [cid] },
  }));
}

/* Agenda: 60 dias para trás, 14 à frente.
   Regras de uma agenda possível:
   · sem atendimento em fim de semana nem em feriado nacional (07/09 etc.);
   · uma consulta por criança por dia, e retorno só 21 dias ou mais depois
     da visita anterior (neuropediatria não recebe a mesma criança toda semana);
   · a clínica já existia antes da janela: a maioria das crianças chega com
     histórico e a primeira consulta fica para as que entram no período;
   · hoje, o status segue o relógio (horário que já passou foi concluído; o
     que não chegou ainda é pendente).
   Dois casos deixados de propósito: ontem, 10:00, ainda "confirmado" (o
   registro esquecido que a tela precisa denunciar) e uma criança com as duas
   últimas consultas perdidas (faltas repetidas). */
const FERIADOS = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25', '2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04']);
const ehFeriado = (dia) => {
  const iso = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
  return FERIADOS.has(iso.slice(5)) || FERIADOS.has(iso);
};
const INTERVALO_MIN = 21;
const NOVOS = 6; // as últimas crianças da lista chegam durante a janela
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
// Faltas repetidas: as duas últimas consultas passadas de uma criança.
{
  const passadas = (k) => plano.filter((x) => x.k === k && x.d < -1);
  const alvo = pacientes.findIndex((_, k) => passadas(k).length >= 2 && k !== 7);
  for (const x of passadas(alvo).slice(-2)) x.status = S.APPOINTMENT_STATUS.NO_SHOW;
}
const ags = [];
for (const { paciente, hora, inicio, tipo, status, seq: n } of plano) {
  const fim = new Date(new Date(inicio).getTime() + 40 * 60000).toISOString();
  const feito = status === S.APPOINTMENT_STATUS.DONE;
  ags.push(await repo.create(S.STORES.APPOINTMENTS, {
    ...S.newAppointment({ praca: P }),
    pacienteId: paciente.id, inicio, fim, tipo, status, valor: tipo === 'laudo' ? 620 : 450,
    salaId: tipo === 'teleconsulta' ? null : salasLivres[hora % salasLivres.length].id,
    checkInEm: tipo !== 'teleconsulta' && (feito || status === S.APPOINTMENT_STATUS.CHECKED_IN)
      ? new Date(new Date(inicio).getTime() - (5 + (n % 20)) * 60000).toISOString() : null,
    inicioAtendimento: feito && (n % 5 !== 0) ? new Date(new Date(inicio).getTime() + (2 + (n % 15)) * 60000).toISOString() : null,
    fimAtendimento: feito ? new Date(new Date(inicio).getTime() + (32 + (n % 25)) * 60000).toISOString() : null,
  }));
}

/* Evoluções com texto variado */
const S_ = ['Mãe relata melhora do sono e menos crises de choro ao fim do dia.', 'Escola informa maior permanência nas atividades dirigidas.', 'Pai refere dois episódios de cefaleia na última quinzena, sem vômitos.', 'Sem novas crises desde o ajuste de dose.', 'Fonoaudióloga observa ampliação do vocabulário expressivo.', 'Família relata irritabilidade após troca de rotina escolar.'];
const O_ = ['Exame neurológico sem sinais focais. Marcha típica.', 'Contato visual intermitente, responde ao nome na segunda chamada.', 'Fundo de olho sem alterações. PA 98x62.', 'Tônus e força preservados. Reflexos simétricos.', 'Atenção sustentada por cerca de 8 minutos em tarefa estruturada.'];
const A_ = ['Evolução favorável, conduta mantida.', 'Resposta parcial à intervenção; reavaliar em 60 dias.', 'Quadro estável.', 'Piora comportamental provavelmente reativa à mudança de rotina.'];
const PL_ = ['Manter terapias. Retorno em 90 dias.', 'Solicitado EEG em sono. Retorno com resultado.', 'Orientado diário de cefaleia. Retorno em 30 dias.', 'Relatório escolar a emitir. Retorno em 60 dias.'];
const feitos = ags.filter((a) => a.status === S.APPOINTMENT_STATUS.DONE);
for (let k = 0; k < feitos.length; k += 1) {
  const a = feitos[k];
  const p = pacientes.find((x) => x.id === a.pacienteId);
  await repo.create(S.STORES.NOTES, {
    ...S.newNote({ praca: P }), pacienteId: a.pacienteId, atendimentoId: a.id,
    subjetivo: S_[k % S_.length], objetivo: O_[(k * 3) % O_.length], avaliacao: A_[(k * 5) % A_.length], plano: PL_[(k * 7) % PL_.length],
    cidPrincipal: p.clinico.diagnosticos[0], assinadaEm: a.fimAtendimento, travada: true,
  });
}

/* Financeiro */
const fixas = [['Aluguel da unidade', 'Aluguel', 8400], ['Folha de pagamento', 'Folha de pagamento', 19600], ['Sistema de prontuário', 'Software e sistemas', 890], ['Contabilidade', 'Contabilidade', 1450], ['Material de consumo', 'Material de consumo', 1120], ['Impostos — Simples Nacional', 'Impostos', 5300]];
for (let m = 2; m >= 0; m -= 1) {
  for (const [descricao, categoria, valor] of fixas) {
    const v = new Date(); v.setMonth(v.getMonth() - m, 10); v.setHours(10, 0, 0, 0);
    const pago = v < new Date();
    await repo.create(S.STORES.ENTRIES, {
      ...S.newEntry({ praca: P }), tipo: S.ENTRY_TYPES.EXPENSE, descricao, categoria, centroCusto: 'Campinas / SP', valor,
      vencimento: v.toISOString().slice(0, 10), status: pago ? S.ENTRY_STATUS.PAID : S.ENTRY_STATUS.PENDING,
      pagamentoEm: pago ? v.toISOString() : null, formaPagamento: pago ? 'Transferência' : '',
    });
  }
}
for (let k = 0; k < feitos.length; k += 1) {
  const a = feitos[k];
  const atrasado = k % 11 === 0;
  await repo.create(S.STORES.ENTRIES, {
    ...S.newEntry({ praca: P }), tipo: S.ENTRY_TYPES.REVENUE,
    descricao: `${a.tipo === 'laudo' ? 'Laudo' : a.tipo === 'teleconsulta' ? 'Teleconsulta' : 'Consulta'} — ${pacientes.find((p) => p.id === a.pacienteId).nome}`,
    categoria: a.tipo === 'teleconsulta' ? 'Teleconsulta' : a.tipo === 'laudo' ? 'Laudo e relatório' : 'Consulta particular',
    centroCusto: 'Campinas / SP', valor: a.valor, vencimento: a.inicio.slice(0, 10),
    status: atrasado ? S.ENTRY_STATUS.PENDING : S.ENTRY_STATUS.PAID, pagamentoEm: atrasado ? null : a.inicio,
    formaPagamento: atrasado ? '' : ['Pix', 'Cartão de crédito', 'Dinheiro'][k % 3],
    pacienteId: a.pacienteId, atendimentoId: a.id,
  });
}

/* Consentimentos: tratamento clínico para todos; teleconsulta só para metade
   das famílias — o caso "teleconsulta sem consentimento" existe de verdade. */
const nomeResponsavel = new Map((await repo.list(S.STORES.GUARDIANS, {})).map((g) => [g.id, g.nome]));
for (const [k, p] of pacientes.entries()) {
  // Comunicação: a maioria das famílias autoriza mensagem (é assim que a
  // confirmação sai); teleconsulta só metade — o caso "sem consentimento"
  // existe de verdade.
  const purposes = ['tratamento_clinico'];
  if (k % 2 === 0) purposes.push('teleconsulta');
  if (k % 4 !== 3) purposes.push('comunicacao_whatsapp');
  if (k % 3 === 0) purposes.push('comunicacao_email');
  for (const finalidade of purposes) {
    await repo.create(S.STORES.CONSENTS, {
      ...S.newConsent({ praca: P }), pacienteId: p.id, titularId: p.id, responsavelId: p.responsaveis[0],
      finalidade, versaoTexto: '1.0', textoApresentado: finalidade, concedidoEm: ts(-60, 9),
    }, {
      auditAction: 'CONSENT_GIVEN',
      auditDetail: `${S.CONSENT_PURPOSE_LABELS[finalidade]} · versão 1.0 · responsável ${nomeResponsavel.get(p.responsaveis[0]) ?? 'não vinculado'}`,
    });
  }
}

/* Insumos */
for (const [nome, unidade, estoque, minimo] of [['Luvas de procedimento', 'caixa', 4, 6], ['Álcool 70%', 'litro', 12, 5], ['Papel para maca', 'rolo', 2, 4], ['Martelo de reflexo', 'unidade', 3, 1]]) {
  await repo.create(S.STORES.SUPPLIES, { ...S.envelope({ praca: P }), nome, unidade, estoque, minimo, validade: '', fornecedor: '' });
}

const t = {};
for (const k of ['PATIENTS', 'APPOINTMENTS', 'NOTES', 'ENTRIES', 'ROOMS', 'SUPPLIES']) t[k] = (await repo.list(S.STORES[k], {})).length;
return t;
