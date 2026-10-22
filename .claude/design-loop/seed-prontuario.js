/*
 * Complemento da base de VERIFICAÇÃO (perfil headless do design-loop) para o
 * redesign do prontuário: um paciente com escalas, marcos, medicações,
 * alergia e exames em imagem. Só local; nunca no painel do dono nem no Supabase.
 */
const repo = await import('/admin/data/repository.js');
const S = await import('/admin/data/schema.js');
if (repo.isServerMode?.()) throw new Error('modo servidor — semeadura abortada');

const ID = '16df5f04-4169-4ac5-a458-1668c6221ec3';
const p = await repo.get(S.STORES.PATIENTS, ID);
const already = (await repo.list(S.STORES.SCALES, { where: { pacienteId: ID } })).length;
if (already) return { ok: true, ja: true, id: ID };

const day = (n) => new Date(Date.now() - n * 864e5).toISOString();

await repo.update(S.STORES.PATIENTS, ID, {
  sexo: 'feminino',
  clinico: { ...(p.clinico ?? {}), alergias: ['Dipirona'], diagnosticos: [{ codigo: 'G40.9', descricao: 'Epilepsia, não especificada' }, { codigo: 'F90.0', descricao: 'Distúrbio da atividade e da atenção' }] },
  perfilSensorial: { gatilhos: 'Sons altos e luz forte na sala', estrategias: 'Fone abafador e explicar cada etapa antes', toleranciaEspera: 'Até 15 minutos' },
  escola: { instituicao: 'EMEF Jardim das Flores', serie: '2º ano' },
});

const scale = (id, nome, max, pts) => pts.map(([dias, escore, interp, risco]) => repo.create(S.STORES.SCALES, {
  pacienteId: ID, instrumentoId: id, instrumento: nome, escore, escoreMaximo: max,
  interpretacao: interp, risco, aplicadaEm: day(dias), aplicadaPorNome: 'Charlington M. Cavalcante',
}));
await Promise.all([
  ...scale('snap-iv', 'SNAP-IV', 54, [[220, 31, 'Sintomas acentuados', 'alto'], [150, 26, 'Sintomas significativos', 'moderado'], [80, 22, 'Sintomas significativos', 'moderado'], [20, 17, 'Sintomas significativos', 'moderado']]),
  ...scale('vanderbilt', 'Vanderbilt', 54, [[180, 20, 'Critérios parcialmente atendidos', 'moderado'], [40, 14, 'Critérios parcialmente atendidos', 'moderado']]),
  ...scale('mchat-r', 'M-CHAT-R/F', 20, [[300, 2, 'Baixo risco', 'baixo']]),
]);

await repo.create(S.STORES.MEDICATIONS, { pacienteId: ID, principioAtivo: 'Levetiracetam', nome: 'Keppra', concentracao: '100 mg/mL', posologia: '2,5 mL de 12/12 h', iniciadaEm: day(200) });
await repo.create(S.STORES.MEDICATIONS, { pacienteId: ID, principioAtivo: 'Metilfenidato', nome: 'Ritalina', concentracao: '10 mg', posologia: '1 comprimido pela manhã', iniciadaEm: day(90) });

for (const [marcoId, marco, status, dias] of [['nomeia-cores', 'Nomeia cores', 'atingido', 300], ['conta-historia', 'Conta uma história', 'atingido', 250], ['pula-um-pe', 'Pula num pé só', 'emergente', 60], ['copia-quadrado', 'Copia um quadrado', 'atrasado', 30]]) {
  await repo.create(S.STORES.MILESTONES, { pacienteId: ID, marcoId, marco, dominio: 'motor_grosso', idadeEsperada: 24, status, observadoEm: day(dias) });
}

// Exames: imagens sintéticas desenhadas aqui (tons de cinza, como um exame).
async function fakeImage(seed, kind) {
  const c = document.createElement('canvas'); c.width = 480; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(12,14,18)'; g.fillRect(0, 0, 480, 320);
  if (kind === 'eeg') {
    g.strokeStyle = 'rgb(200,210,220)'; g.lineWidth = 1.2;
    for (let ch = 0; ch < 10; ch++) { g.beginPath(); for (let x = 0; x < 480; x += 3) { const y = 20 + ch * 30 + Math.sin(x * .07 * (ch % 3 + 1) + seed) * 6 + Math.sin(x * .31 + ch) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  } else {
    const grd = g.createRadialGradient(240, 160, 20, 240, 160, 140); grd.addColorStop(0, 'rgb(190,195,200)'); grd.addColorStop(.6, 'rgb(90,95,100)'); grd.addColorStop(1, 'rgb(15,16,18)');
    g.fillStyle = grd; g.beginPath(); g.ellipse(240, 160, 120 + seed * 4, 140, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(30,30,34,.8)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(240 + Math.cos(i + seed) * 40, 160 + Math.sin(i * 2) * 50, 20 + i * 4, i, i + 2); g.stroke(); }
  }
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer()).buffer;
}
const att = [
  ['RM de crânio com contraste', 'exame_imagem', 'mri', 60], ['RM de crânio — controle', 'exame_imagem', 'mri', 20], ['TC de crânio', 'exame_imagem', 'mri', 240],
  ['EEG em vigília', 'exame_neurofisiologico', 'eeg', 45], ['EEG com privação de sono', 'exame_neurofisiologico', 'eeg', 120], ['Vídeo-EEG 24 h', 'exame_neurofisiologico', 'eeg', 200],
];
let i = 0;
for (const [titulo, origem, kind, dias] of att) {
  const buffer = await fakeImage(i++, kind);
  const blobId = crypto.randomUUID();
  await repo.putBlob(blobId, buffer, 'image/png');
  await repo.create(S.STORES.ATTACHMENTS, { pacienteId: ID, blobId, titulo, nomeArquivo: 'exame.png', contentType: 'image/png', tamanho: buffer.byteLength, origem, realizadoEm: day(dias).slice(0, 10), observacoes: '' });
}
await repo.create(S.STORES.ATTACHMENTS, { pacienteId: ID, blobId: null, titulo: 'Parecer fonoaudiológico', nomeArquivo: 'parecer.pdf', contentType: 'application/pdf', tamanho: 120000, origem: 'parecer_fono', realizadoEm: day(30).slice(0, 10), observacoes: '' });

return { ok: true, id: ID };
