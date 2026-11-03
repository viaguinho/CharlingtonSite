/* Corrige a semeadura da paciente de verificação (passada 1): máximo do
   Vanderbilt e ids de marcos fora do catálogo. Só a base local de verificação. */
const repo = await import('/admin/data/repository.js');
const S = await import('/admin/data/schema.js');
if (repo.isServerMode?.()) throw new Error('modo servidor');
const ID = '16df5f04-4169-4ac5-a458-1668c6221ec3';
const sc = await repo.list(S.STORES.SCALES, { where: { pacienteId: ID } });
for (const r of sc.filter((x) => x.instrumentoId === 'vanderbilt')) await repo.update(S.STORES.SCALES, r.id, { escoreMaximo: 54 });
const map = { m1: ['nomeia-cores', 'Nomeia cores'], m2: ['conta-historia', 'Conta uma história'], m3: ['pula-um-pe', 'Pula num pé só'], m4: ['copia-quadrado', 'Copia um quadrado'] };
const ms = await repo.list(S.STORES.MILESTONES, { where: { pacienteId: ID } });
for (const m of ms) if (map[m.marcoId]) await repo.update(S.STORES.MILESTONES, m.id, { marcoId: map[m.marcoId][0], marco: map[m.marcoId][1] });
return { escalas: sc.length, marcos: ms.length };
