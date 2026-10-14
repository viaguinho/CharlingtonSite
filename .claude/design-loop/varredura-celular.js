/* Varredura de celular: rode com `node cdp.mjs eval "#/" varredura-celular.js --w 390 --h 844`.
   Acusa (1) elemento que passa da borda fora de área com rolagem, (2) título estreito,
   (3) texto longo numa coluna de menos de 48 px (quebra letra por letra) e (4) irmãos que se sobrepõem. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r = await import('/admin/data/repository.js');
const S = await import('/admin/data/schema.js');
const pac = (await r.list(S.STORES.PATIENTS, {})).find((p) => p.nome.startsWith('Heitor'));
const clicar = (t) => [...document.querySelectorAll('button, [role=tab], a')].find((b) => b.textContent.trim() === t || b.textContent.trim().replace(/^\d+\s*/, '') === t)?.click();
const passos = [
  ['#/'], ['#/', 'Semana'], ['#/', 'Mês'], ['#/', 'Lista'], ['#/agenda'], ['#/agenda', 'Semana'], ['#/agenda', 'Lista'], ['#/agenda', 'Por horário'], ['#/pacientes'], ['#/pacientes', 'Cards'], [`#/pacientes/${pac.id}`],
  [`#/pacientes/${pac.id}`, 'Consentimentos'], [`#/pacientes/${pac.id}`, 'Documentos'], [`#/pacientes/${pac.id}`, 'Medicações'],
  ['#/documentos'], ['#/documentos', 'Emitidos'], ['#/documentos', 'Modelos'], ['#/comunicacao'],
  ['#/financeiro'], ['#/financeiro', 'A receber'], ['#/financeiro', 'A pagar'], ['#/financeiro', 'Repasses'],
  ['#/operacoes'], ['#/operacoes', 'Salas'], ['#/operacoes', 'Equipe'], ['#/relatorios'], ['#/relatorios', 'Semana'], ['#/relatorios', 'Ano'],
  ['#/auditoria'], ['#/configuracoes'], ['#/configuracoes', 'Acessos'], ['#/configuracoes', 'Integrações'], ['#/configuracoes', 'LGPD'],
];
const dentroDeRolagem = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if ((o === 'auto' || o === 'scroll') && n.scrollWidth > n.clientWidth) return true; } return false; };
const out = [];
for (const [rota, aba] of passos) {
  location.hash = rota; await sleep(1500);
  if (aba) { clicar(aba); await sleep(900); }
  const achados = [];
  const main = document.querySelector('main') || document.body;
  for (const el of main.querySelectorAll('*')) {
    if (el.closest('svg, [aria-hidden=true], .sr-only, .day-grid, .week-grid, .table-wrap, .tabs, .doc-measure')) continue;
    const rect = el.getBoundingClientRect();
    const t = el.children.length ? '' : el.textContent.trim();
    // Título ou texto com largura zero (espremido até sumir) também conta como defeito.
    if (t.length > 3 && !rect.width && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden') { achados.push(`largura zero: ${t.slice(0, 30)}`); continue; }
    if (!rect.width || !rect.height) continue;
    // Texto colado na borda do cartão, sem o respiro interno.
    const cartao = el.closest('.card');
    if (t.length > 3 && cartao && !el.closest('.table-wrap, .tabs, .day-grid, .week-grid, .agenda-week') && !dentroDeRolagem(el)) {
      const c = cartao.getBoundingClientRect();
      if (rect.right > c.right - 6) achados.push(`colado na borda do cartão (${Math.round(c.right - rect.right)}px): ${t.slice(0, 30)}`);
    }
    if (rect.right > innerWidth + 1 && !dentroDeRolagem(el) && (t || el.matches('button, a, .chip'))) achados.push(`passa da borda ${Math.round(rect.right)}px: ${(t || el.className).toString().slice(0, 40)}`);
    if (el.matches('h1,h2,h3,.card__title') && t.length > 12 && rect.width < 90) achados.push(`título estreito ${Math.round(rect.width)}px: ${t.slice(0, 30)}`);
    if (t.length > 8 && rect.width < 48 && getComputedStyle(el).display !== 'none') achados.push(`coluna de ${Math.round(rect.width)}px: ${t.slice(0, 30)}`);
    const filhos = [...el.children].filter((c) => { const b = c.getBoundingClientRect(); return b.width > 6 && b.height > 6 && getComputedStyle(c).position !== 'absolute' && getComputedStyle(c).display !== 'inline' && getComputedStyle(c).opacity !== '0' && getComputedStyle(c).visibility !== 'hidden'; });
    for (let i = 0; i < filhos.length; i += 1) for (let j = i + 1; j < filhos.length; j += 1) {
      const a = filhos[i].getBoundingClientRect(); const b = filhos[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left); const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 4 && oy > 4) achados.push(`sobreposição ${Math.round(ox)}×${Math.round(oy)}: "${(filhos[i].textContent || '').trim().slice(0, 20)}" × "${(filhos[j].textContent || '').trim().slice(0, 20)}"`);
    }
  }
  out.push({ rota: (rota + (aba ? ' › ' + aba : '')).replace(pac.id, ':id'), sw: document.documentElement.scrollWidth, achados: [...new Set(achados)].slice(0, 6) });
}
return out;
