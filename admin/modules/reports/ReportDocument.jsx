import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { cellText, headParts } from './reportExport.js';

/**
 * O documento do "Criar relatório": páginas A4 no papel timbrado da unidade.
 *
 * Cada página é uma `.sheet-a4` — a MESMA folha dos documentos clínicos
 * (`LetterheadPreview`): timbrado como <img> absoluta, conteúdo na caixa de
 * margens calibradas contra o papel impresso (63 mm no topo, 50 mm na base,
 * 27 mm à esquerda, 20 mm à direita) e as regras de `print.css`. Quem usa o
 * componente passa o `letterheadSrc` já resolvido (timbrado próprio da
 * unidade ou o padrão).
 *
 * Por que paginar à mão em vez de deixar o navegador quebrar a página: o
 * timbrado e as margens precisam repetir em TODA página, e fundo/margem de
 * `@page` não se repete por elemento de forma confiável entre navegadores.
 * Aqui toda página é uma folha de verdade, e o conteúdo é distribuído nela
 * por altura medida:
 *
 *   1. mede — o fluxo inteiro é desenhado uma vez, na largura útil da folha,
 *      e cada bloco ("átomo") tem a altura lida do layout real;
 *   2. pagina — os átomos entram nas páginas por ordem, respeitando o que não
 *      pode se separar (título do tema + título do card + cabeçalho da tabela
 *      + as primeiras linhas) e repetindo o cabeçalho da tabela na página
 *      seguinte, com "(continuação)";
 *   3. avisa — com as páginas desenhadas e o timbrado decodificado, `onReady`
 *      recebe o elemento raiz, pronto para `printElement`.
 */

const SAFETY_PX = 6;       // folga na altura útil: arredondamento do navegador não pode empurrar uma linha para fora
const KEEP_RATIO = 0.4;    // card que cabe numa página inteira, mas não no espaço que sobrou, só é dividido se sobrar mais que isso
const HEAD_ROWS = 2;       // linhas que ficam junto do título do card
const TAIL_ROWS = 2;       // linhas que ficam junto das notas, no fim

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/* ─────────────────────────────── Átomos ─────────────────────────────── */

/**
 * O relatório em blocos. `flat` é a lista na ordem do documento (o que se
 * mede e se imprime); `units` guarda a mesma coisa por card, para a paginação
 * saber o que cada card tem de título, linhas e notas.
 */
function buildAtoms(groups) {
  const flat = [];
  const units = [];
  const header = { id: 'header', kind: 'header' };
  flat.push(header);

  groups.forEach((group, gi) => {
    group.cards.forEach((card, ci) => {
      const unit = { card, section: null, lead: null, rows: [], empty: null, trailing: null };
      if (ci === 0) {
        unit.section = { id: `s:${group.section.key}`, kind: 'section', section: group.section, breakBefore: gi > 0 };
        flat.push(unit.section);
      }
      unit.lead = { id: `l:${card.id}`, kind: 'lead', card };
      flat.push(unit.lead);
      if (card.emptyText) {
        unit.empty = { id: `e:${card.id}`, kind: 'empty', card };
        flat.push(unit.empty);
      } else if (card.table?.rows?.length) {
        card.table.rows.forEach((row, index) => {
          const atom = { id: `r:${card.id}:${index}`, kind: 'row', card, row };
          unit.rows.push(atom);
          flat.push(atom);
        });
      }
      // Fecha o card: as notas "Como ler" ou, sem notas, só o respiro até o próximo.
      unit.trailing = card.notes.length
        ? { id: `n:${card.id}`, kind: 'notes', card }
        : { id: `g:${card.id}`, kind: 'gap', card };
      flat.push(unit.trailing);
      units.push(unit);
    });
  });
  return { header, flat, units };
}

/* ───────────────────────────── Tabelas ───────────────────────────── */

const NUMERIC = /^(R\$[\s ]?)?[−+-]?\d[\d.,]*([\s ]?(%|min))?$/;
const isNumeric = (value) => typeof value === 'number' || (typeof value === 'string' && NUMERIC.test(value.trim()));

/**
 * Largura e alinhamento das colunas de um card. A largura sai do conteúdo
 * (maior texto da coluna, com teto) e é a MESMA em todo trecho da tabela:
 * com `table-layout: fixed`, a linha mede igual na medição e na página.
 */
function tableInfo(card) {
  const columns = card.table?.columns ?? [];
  const rows = card.table?.rows ?? [];
  const weights = columns.map((title, j) => {
    const longest = rows.reduce((max, row) => Math.max(max, cellText(row[j]).length), 0);
    return Math.max(Math.min(longest, 36), Math.min(String(title).length, 22) * 0.75, 4);
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const numeric = columns.map((_, j) => {
    if (j === 0) return false;
    const values = rows.map((row) => row[j]).filter((v) => v != null && v !== '' && v !== '—');
    return values.length > 0 && values.every(isNumeric);
  });
  return { widths: weights.map((w) => Math.round((w / total) * 1000) / 10), numeric };
}

function TableFragment({ card, info, rows, continued = false, measure = false }) {
  const { columns } = card.table;
  return (
    <table className="rp-doc__table">
      <colgroup>
        {info.widths.map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}
      </colgroup>
      <thead data-atom={measure ? `h:${card.id}` : undefined}>
        {continued ? (
          <tr className="rp-doc__cont">
            <th colSpan={columns.length}>{card.title} (continuação)</th>
          </tr>
        ) : null}
        <tr>
          {columns.map((title, i) => (
            <th key={i} scope="col" className={info.numeric[i] ? 'is-num' : undefined}>{title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((atom) => (
          <tr key={atom.id} data-atom={measure ? atom.id : undefined}>
            {columns.map((_, i) => (
              <td key={i} className={info.numeric[i] ? 'is-num' : i === 0 ? 'is-label' : undefined}>{cellText(atom.row[i])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ───────────────────────────── Blocos ───────────────────────────── */

function Head({ head }) {
  const parts = headParts(head);
  if (!parts) return null;
  const pieces = [
    parts.kicker ? <span key="k" className="rp-doc__kicker">{parts.kicker}</span> : null,
    parts.figure ? <strong key="f" className="rp-doc__figure">{parts.figure}</strong> : null,
    parts.sub ? <span key="s">{parts.sub}</span> : null,
    parts.delta ? <span key="d" className="rp-doc__delta">{parts.delta}</span> : null,
  ].filter(Boolean);
  return (
    <p className="rp-doc__head">
      {pieces.map((piece, i) => (
        <Fragment key={piece.key}>
          {i ? <span className="rp-doc__sep"> · </span> : null}
          {piece}
        </Fragment>
      ))}
    </p>
  );
}

function Atom({ atom, meta, measure }) {
  const tag = measure ? atom.id : undefined;
  switch (atom.kind) {
    case 'header':
      return (
        <div className="rp-doc__atom is-header" data-atom={tag}>
          <p className="rp-doc__eyebrow">{meta.unit}</p>
          <h1 className="rp-doc__title">{meta.title}</h1>
          <dl className="rp-doc__meta">
            <div><dt>Período</dt><dd>{meta.period}</dd></div>
            <div><dt>Comparação</dt><dd>{meta.comparison}</dd></div>
            {meta.filter ? <div><dt>Filtro</dt><dd>{meta.filter}</dd></div> : null}
            <div><dt>Gerado em</dt><dd>{meta.generatedAt}{meta.user ? ` · ${meta.user}` : ''}</dd></div>
          </dl>
        </div>
      );
    case 'section':
      return (
        <div className="rp-doc__atom is-section" data-atom={tag}>
          <h2 className="rp-doc__section-title">{atom.section.label}</h2>
          {atom.section.caption ? <p className="rp-doc__section-caption">{atom.section.caption}</p> : null}
        </div>
      );
    case 'lead':
      return (
        <div className="rp-doc__atom is-lead" data-atom={tag}>
          <h3 className="rp-doc__card-title">{atom.card.title}</h3>
          <Head head={atom.card.head} />
          {atom.card.table?.caption && !atom.card.emptyText ? <p className="rp-doc__table-caption">{atom.card.table.caption}</p> : null}
        </div>
      );
    case 'empty':
      return (
        <div className="rp-doc__atom is-empty" data-atom={tag}>
          <p className="rp-doc__empty">{atom.card.emptyText}</p>
        </div>
      );
    case 'notes':
      return (
        <div className="rp-doc__atom is-notes" data-atom={tag}>
          <h4 className="rp-doc__notes-title">Como ler</h4>
          <ul className="rp-doc__notes">
            {atom.card.notes.map((note, i) => <li key={i}>{note}</li>)}
          </ul>
        </div>
      );
    case 'gap':
      return <div className="rp-doc__atom is-gap" data-atom={tag} />;
    default:
      return null;
  }
}

/** Átomos consecutivos de linha do mesmo card viram UMA tabela; o resto segue como bloco. */
function toNodes(items, { meta, infos, measure }) {
  const nodes = [];
  for (let i = 0; i < items.length; i += 1) {
    const atom = items[i];
    if (atom.kind !== 'row') {
      nodes.push(<Atom key={atom.id} atom={atom} meta={meta} measure={measure} />);
    } else {
      const rows = [atom];
      while (items[i + 1]?.kind === 'row' && items[i + 1].card === atom.card) { i += 1; rows.push(items[i]); }
      const before = items[i - rows.length];
      // Sem o título do card logo acima, o trecho abre com "(continuação)" e o cabeçalho da tabela.
      const continued = !measure && !(before?.kind === 'lead' && before.card === atom.card);
      nodes.push(
        <TableFragment key={atom.id} card={atom.card} info={infos.get(atom.card.id)} rows={rows} continued={continued} measure={measure} />,
      );
    }
  }
  return nodes;
}

/* ───────────────────────────── Paginação ───────────────────────────── */

function paginate({ header, units }, heights, headH, contH, cap) {
  const pages = [];
  let page = null;
  let used = 0;
  let prev = null;

  const open = () => { page = []; pages.push(page); used = 0; prev = null; };

  // Altura de um átomo no ponto em que ele cairia: a linha que abre um trecho
  // de tabela carrega o cabeçalho da tabela (e o "(continuação)", se o título
  // do card ficou numa página anterior).
  const costOf = (atom, before) => {
    let cost = heights[atom.id] ?? 0;
    if (atom.kind === 'row' && !(before?.kind === 'row' && before.card === atom.card)) {
      cost += headH[atom.card.id] ?? 0;
      if (!(before?.kind === 'lead' && before.card === atom.card)) cost += contH;
    }
    return cost;
  };
  const costOfGroup = (group, before) => {
    let total = 0;
    let p = before;
    for (const atom of group) { total += costOf(atom, p); p = atom; }
    return total;
  };
  const put = (group) => {
    if (!page) open();
    if (page.length && used + costOfGroup(group, prev) > cap) open();
    for (const atom of group) { used += costOf(atom, prev); page.push(atom); prev = atom; }
  };

  put([header]);

  for (const { section, lead, rows, empty, trailing } of units) {
    if (section?.breakBefore && page?.length) open();

    const body = empty ? [empty] : rows;
    const whole = [section, lead, ...body, trailing].filter(Boolean);

    // Card que cabe numa página mas não no que sobrou desta: só se divide se
    // o que sobrou for generoso; senão, começa limpo na página seguinte.
    if (page?.length) {
      const total = costOfGroup(whole, prev);
      const room = cap - used;
      if (total > room && total <= cap && room < KEEP_RATIO * cap) open();
    }

    if (!rows.length || empty) {
      put(whole);
    } else {
      const first = [section, lead, ...rows.slice(0, HEAD_ROWS)].filter(Boolean);
      const rest = rows.slice(HEAD_ROWS);
      if (!rest.length) {
        put([...first, trailing]);
      } else {
        const tail = rest.slice(-TAIL_ROWS);
        const middle = rest.slice(0, rest.length - tail.length);
        put(first);
        middle.forEach((row) => put([row]));
        put([...tail, trailing]);
      }
    }
  }
  return pages;
}

/* ───────────────────────────── Componente ───────────────────────────── */

/**
 * @param groups        saída de `collectCards`
 * @param meta          saída de `buildMeta`
 * @param letterheadSrc imagem do papel timbrado (URL, blob: ou data:)
 * @param onReady       (elementoRaiz, nºDePáginas) — páginas prontas e timbrado decodificado
 * @param onError       (erro) — a medição ou a montagem falhou
 *
 * Quem monta o componente o põe numa portal em `document.body`, fora da tela
 * (a classe `rp-doc` faz isso) mas com layout — `printElement` precisa dele
 * renderizado. Um novo `groups` pede um novo componente (`key`).
 */
export default function ReportDocument({ groups, meta, letterheadSrc, onReady, onError }) {
  const rootRef = useRef(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const atoms = useMemo(() => buildAtoms(groups), [groups]);
  const infos = useMemo(() => new Map(atoms.units.map(({ card }) => [card.id, tableInfo(card)])), [atoms]);
  const [pages, setPages] = useState(null);

  // 1) Mede o fluxo inteiro e distribui nas páginas.
  useEffect(() => {
    let alive = true;
    (async () => {
      const root = rootRef.current;
      if (!root) return;
      root.getBoundingClientRect(); // força o layout: só então a fonte pedida começa a carregar
      try { await document.fonts?.ready; } catch { /* sem API de fontes: mede com o que há */ }
      await nextFrame();
      if (!alive) return;

      const heights = {};
      const headH = {};
      root.querySelectorAll('[data-atom]').forEach((el) => {
        const key = el.getAttribute('data-atom');
        const height = el.getBoundingClientRect().height;
        if (key.startsWith('h:')) headH[key.slice(2)] = height;
        else heights[key] = height;
      });
      const cap = root.querySelector('[data-probe="page"]').getBoundingClientRect().height - SAFETY_PX;
      const contH = root.querySelector('[data-probe="cont"]')?.getBoundingClientRect().height ?? 0;
      setPages(paginate(atoms, heights, headH, contH, cap));
    })().catch((error) => { if (alive) errorRef.current?.(error); });
    return () => { alive = false; };
  }, [atoms]);

  // 2) Com as páginas desenhadas, espera o timbrado e avisa.
  useEffect(() => {
    if (!pages) return undefined;
    let alive = true;
    (async () => {
      const root = rootRef.current;
      const images = [...root.querySelectorAll('.sheet-a4__letterhead')];
      // Sem decodificar, a primeira página poderia sair sem o papel (mesmo cuidado de DocumentSheet).
      const decoded = await Promise.allSettled(images.map((img) => img.decode?.()));
      // Timbrado que não abre não vira PDF em folha branca: o assistente avisa.
      if (decoded.some((result) => result.status === 'rejected')) throw new Error('O papel timbrado não pôde ser carregado.');
      await nextFrame();
      if (alive) readyRef.current?.(root, pages.length);
    })().catch((error) => { if (alive) errorRef.current?.(error); });
    return () => { alive = false; };
  }, [pages]);

  const nodeOptions = { meta, infos };

  return (
    <div ref={rootRef} className={`rp-doc${pages ? '' : ' rp-doc--measure'}`} aria-hidden="true">
      {pages ? pages.map((items, index) => (
        <section className="sheet-a4 rp-doc__page" key={index}>
          <img className="sheet-a4__letterhead" src={letterheadSrc} alt="" aria-hidden="true" />
          <div className="sheet-a4__inner">
            <div className="rp-doc__running">
              <span>{index ? `${meta.title} · ${meta.unit}` : ''}</span>
              <span>Página {index + 1} de {pages.length}</span>
            </div>
            <div className="rp-doc__body">{toNodes(items, { ...nodeOptions, measure: false })}</div>
          </div>
        </section>
      )) : (
        <>
          <div className="rp-doc__probe" data-probe="page" />
          <table className="rp-doc__table rp-doc__probe-table">
            <thead>
              <tr className="rp-doc__cont" data-probe="cont"><th>Continuação</th></tr>
            </thead>
          </table>
          <div className="rp-doc__flow">{toNodes(atoms.flat, { ...nodeOptions, measure: true })}</div>
        </>
      )}
    </div>
  );
}
