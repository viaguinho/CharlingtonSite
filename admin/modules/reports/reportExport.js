import { SECTIONS } from './widgets.jsx';
import { rangeCaption } from './period.js';
import { PLAZA_LABELS } from '../../core/rbac.js';
import { APPOINTMENT_TYPE_LABELS } from '../../data/schema.js';
import { dateTime } from '../../core/format.js';

/**
 * Exportação do "Criar relatório": o que os dois formatos têm em comum
 * (os cards já calculados, o cabeçalho) e o CSV.
 *
 * O PDF (`ReportDocument.jsx`) e o CSV leem o MESMO objeto de `collectCards`,
 * que por sua vez chama `head`, `table`, `notes` e `empty` de cada card em
 * `widgets.jsx`. O número que a tela mostra, o que o PDF imprime e o que o
 * CSV grava saem de um lugar só.
 */

export const REPORT_TITLE = 'Relatório de desempenho';

/* ─────────────────────────── Texto dos cards ─────────────────────────── */

/** Unidade colada ao valor quando é símbolo (",00", "%"); separada por espaço quando é palavra. */
const joinUnit = (unit) => (unit ? (/^[,%]/.test(unit) ? unit : ` ${unit}`) : '');

/**
 * O cabeçalho de um card em partes: "Pago no período · R$ 5.740,00 · sub · +12%".
 * `figure` junta prefixo, valor e unidade ("R$ 5.740,00", "12 atendimentos").
 */
export function headParts(head) {
  if (!head) return null;
  const value = `${head.value ?? ''}${joinUnit(head.unit)}`;
  return {
    kicker: head.kicker ?? '',
    figure: head.prefix ? `${head.prefix} ${value}` : value,
    sub: head.sub ?? '',
    delta: head.delta?.text ?? '',
    tone: head.delta?.tone ?? 'neutral',
  };
}

export function headLine(head) {
  const p = headParts(head);
  if (!p) return '';
  return [p.kicker, p.figure, p.sub, p.delta].filter(Boolean).join(' · ');
}

/** Célula de tabela como texto. Decimal solto sai com vírgula, como o resto do painel. */
export function cellText(value) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
  return String(value);
}

/**
 * Os cards escolhidos, já calculados, agrupados por tema na ordem de SECTIONS.
 *
 * @param m         resultado de `computeReport`
 * @param sections  chaves ('resumo') ou objetos de SECTIONS dos temas escolhidos
 * @param widgets   cards candidatos (já sem os ocultos, se for o caso)
 * @param views     visão de cada card ({ [id]: chave }); cai em `defaultView`
 */
export function collectCards({ m, sections, widgets, views = {}, order = null }) {
  const chosen = new Set((sections ?? []).map((s) => (typeof s === 'string' ? s : s.key)));
  // A ordem que o usuário arrastou na tela vale também no PDF e no CSV.
  const rank = (widget) => {
    const list = order?.[widget.section];
    const at = list ? list.indexOf(widget.id) : -1;
    return at < 0 ? Number.MAX_SAFE_INTEGER : at;
  };
  return SECTIONS
    .filter((section) => chosen.has(section.key))
    .map((section) => ({
      section,
      cards: widgets
        .filter((widget) => widget.section === section.key)
        .sort((a, b) => rank(a) - rank(b))
        .map((widget) => {
          const view = views?.[widget.id] ?? widget.defaultView;
          const head = widget.head?.(m, view) ?? null;
          const emptyText = widget.empty?.(m) ?? null;
          // Sem dado: o card diz isso e não imprime tabela de zeros.
          const table = emptyText ? null : (widget.table?.(m, view) ?? null);
          const notes = (widget.notes?.(m, view) ?? []).filter(Boolean);
          return { id: widget.id, title: widget.title, section, view, head, headText: headLine(head), emptyText, table, notes };
        }),
    }))
    .filter((group) => group.cards.length);
}

/* ───────────────────────────── Cabeçalho ───────────────────────────── */

/** Linhas de identificação do relatório, iguais no PDF e no CSV. */
export function buildMeta({ m, range, plaza, types, user, now = new Date() }) {
  const typeLabels = types?.size ? [...types].map((t) => APPOINTMENT_TYPE_LABELS[t] ?? t) : null;
  return {
    title: REPORT_TITLE,
    unit: plaza ? (PLAZA_LABELS[plaza] ?? plaza) : 'Todas as unidades',
    period: rangeCaption(range, now),
    comparison: m.prevLabel,
    filter: typeLabels ? `Tipo de atendimento: ${typeLabels.join(', ')}` : null,
    generatedAt: dateTime(now),
    user: user?.nome ?? null,
    from: range.from,
    to: range.to,
  };
}

/* ──────────────────────────────── CSV ──────────────────────────────── */

/** Texto limpo para planilha: sem "word joiner" (U+2060) e sem espaço sem quebra. */
const plain = (value) => value.replace(/⁠/g, '').replace(/ /g, ' ');

/**
 * Célula que o Excel/Sheets leria como fórmula (=, @, +/- seguidos de letra)
 * ganha um apóstrofo: nome de criança vem de digitação e não executa nada.
 */
const defuse = (text) => (/^[=@\t\r]/.test(text) || /^[+-][^\d\s,.]/.test(text) ? `'${text}` : text);

const quote = (value) => `"${defuse(plain(cellText(value))).replace(/"/g, '""')}"`;

/**
 * CSV do relatório: `;`, toda célula entre aspas (aspas dobradas), BOM UTF-8
 * para o Excel abrir os acentos e quebra de linha CRLF.
 *
 * Estrutura: linhas de identificação, uma linha em branco e, para cada card,
 * `[Tema, Card]`, a linha do cabeçalho, o cabeçalho da tabela, as linhas e
 * uma linha em branco. Card sem dado traz a frase de "sem dado" no lugar da tabela.
 */
export function buildReportCSV({ m, sections, widgets, views, meta, order = null }) {
  const rows = [
    ['Relatório', meta.title ?? REPORT_TITLE],
    ['Unidade', meta.unit],
    ['Período', meta.period],
    ['Comparação', meta.comparison],
    ['Filtro', meta.filter ?? 'Nenhum (todos os tipos de atendimento)'],
    ['Gerado em', meta.generatedAt],
    [],
  ];

  for (const group of collectCards({ m, sections, widgets, views, order })) {
    for (const card of group.cards) {
      rows.push([group.section.label, card.title]);
      if (card.headText) rows.push([card.headText]);
      if (card.emptyText) {
        rows.push([card.emptyText]);
      } else if (card.table) {
        if (card.table.caption) rows.push([card.table.caption]);
        rows.push(card.table.columns);
        for (const row of card.table.rows) rows.push(row);
      }
      rows.push([]);
    }
  }

  return `﻿${rows.map((row) => row.map(quote).join(';')).join('\r\n')}\r\n`;
}

export const reportFilename = (range) => `relatorio-${range.from}-a-${range.to}.csv`;

/** Baixa um texto como arquivo: Blob, link temporário e URL revogada logo depois do clique. */
export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // O Safari lê o Blob depois do clique: revogar na hora cancelaria o download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
