import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal, useToast } from '../../components/Overlay.jsx';
import { Button } from '../../components/primitives.jsx';
import { Checkbox, Select, TextField } from '../../components/Field.jsx';
import { useSession } from '../../core/session.jsx';
import { PLAZAS, PLAZA_LABELS } from '../../core/rbac.js';
import { printElement } from '../../core/print.js';
import * as audit from '../../core/audit.js';
import { computeReport } from './metrics.js';
import { PRESETS, presetRange, customRange, comparisonRange, rangeCaption } from './period.js';
import { loadReportData } from './data.js';
import { SECTIONS, WIDGETS } from './widgets.jsx';
import { buildMeta, buildReportCSV, collectCards, downloadText, reportFilename } from './reportExport.js';
import ReportDocument from './ReportDocument.jsx';
import { LETTERHEADS } from '../documents/LetterheadPreview.jsx';
import { loadCustomLetterhead } from '../documents/customLetterhead.js';

/**
 * Criar relatório — o assistente que gera o PDF no papel timbrado da unidade
 * e o CSV com as mesmas tabelas.
 *
 * @param open      aberto ou não
 * @param onClose   fecha o assistente
 * @param data      dados já carregados para `defaults.plaza` (reaproveitados
 *                  quando a unidade escolhida é a mesma; outra unidade é
 *                  carregada com `loadReportData`)
 * @param defaults  { range, sections, plaza, types, hiddenIds, views } — o que a
 *                  tela tinha na hora: recorte, temas, unidade, filtro de tipo,
 *                  cards ocultos e a visão escolhida de cada card
 */

const CUSTOM = 'custom';
const PLAZA_OPTIONS = [
  { value: '', label: 'Todas as unidades' },
  ...Object.values(PLAZAS).map((value) => ({ value, label: PLAZA_LABELS[value] })),
];
const PRESET_OPTIONS = [...PRESETS, { value: CUSTOM, label: 'Personalizado' }];
const SECTION_KEYS = new Set(SECTIONS.map((s) => s.key));

/** Dia "AAAA-MM-DD" válido e em faixa plausível: digitar o ano ("0002", "0020"…) não dispara um cálculo de séculos. */
function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const year = Number(value.slice(0, 4));
  if (year < 2000 || year > 2100) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const plural = (n, one, many) => (n === 1 ? one : many);

/** Timbrado próprio é uma imagem de até 6 MB em data URL: vira blob URL para não repetir 6 MB em cada página. */
function toObjectUrl(src) {
  if (!src?.startsWith('data:')) return null;
  try {
    const [head, body] = src.split(',');
    const mime = head.match(/^data:([^;]+)/)?.[1] ?? 'image/png';
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

/** O mesmo papel dos documentos clínicos: o timbrado enviado para a unidade ou, sem ele, o padrão. */
async function resolveLetterhead(plaza) {
  const custom = await loadCustomLetterhead(plaza);
  const objectUrl = custom ? toObjectUrl(custom) : null;
  const src = objectUrl ?? custom ?? LETTERHEADS[plaza]?.src ?? LETTERHEADS[PLAZAS.CAMPINAS].src;
  return { src, objectUrl };
}

function Dialog({ onClose, data, defaults = {} }) {
  const toast = useToast();
  const { user, plaza: sessionPlaza } = useSession();

  // `onClose` costuma chegar como seta nova a cada render da tela; o modal refaria o foco a cada uma.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback(() => closeRef.current?.(), []);

  const defaultPlaza = defaults.plaza || '';
  const hiddenSet = useMemo(() => new Set(defaults.hiddenIds ?? []), [defaults.hiddenIds]);
  const hiddenCount = useMemo(() => WIDGETS.filter((w) => hiddenSet.has(w.id)).length, [hiddenSet]);

  const [selected, setSelected] = useState(
    () => new Set((defaults.sections ?? SECTIONS.map((s) => s.key)).filter((key) => SECTION_KEYS.has(key))),
  );
  const [range, setRange] = useState(() => defaults.range ?? presetRange('month'));
  const [draft, setDraft] = useState(() => ({ from: range.from, to: range.to }));
  const [plaza, setPlaza] = useState(defaultPlaza);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [busy, setBusy] = useState(null);          // 'pdf' | 'csv' | null
  const [loaded, setLoaded] = useState({});        // dados de outras unidades, por chave
  const [job, setJob] = useState(null);            // documento em impressão
  const printCleanup = useRef(null);

  /* ——————————————————————— Período ——————————————————————— */

  const datesOk = validDay(draft.from) && validDay(draft.to);
  const rangeInvalid = datesOk && draft.from > draft.to;
  const rangeProblem = !datesOk
    ? 'Informe a data inicial e a final, entre 2000 e 2100.'
    : rangeInvalid ? 'A data final é anterior à inicial.' : null;
  const presetValue = PRESETS.some((p) => p.value === range.preset) ? range.preset : CUSTOM;

  function pickPreset(value) {
    const next = value === CUSTOM ? { ...range, preset: CUSTOM } : presetRange(value);
    setRange(next);
    setDraft({ from: next.from, to: next.to });
  }

  function editDate(which, value) {
    const next = { ...draft, [which]: value };
    setDraft(next);
    // Só vira recorte quando as duas pontas são datas inteiras e na ordem certa.
    if (validDay(next.from) && validDay(next.to) && next.from <= next.to) setRange(customRange(next.from, next.to));
  }

  /* ——————————————————————— Unidade e dados ——————————————————————— */

  const activeData = plaza === defaultPlaza ? data : loaded[plaza];
  const loadingData = !activeData;

  useEffect(() => {
    if (plaza === defaultPlaza || loaded[plaza]) return undefined;
    let alive = true;
    loadReportData(plaza || null)
      .then((next) => { if (alive) setLoaded((current) => ({ ...current, [plaza]: next })); })
      .catch(() => {
        if (!alive) return;
        toast.error('Não foi possível carregar os dados dessa unidade.');
        setPlaza(defaultPlaza);
      });
    return () => { alive = false; };
  }, [plaza, defaultPlaza, loaded, toast]);

  /* ——————————————————————— Temas ——————————————————————— */

  const counts = useMemo(() => Object.fromEntries(SECTIONS.map((s) => [
    s.key,
    WIDGETS.filter((w) => w.section === s.key && (includeHidden || !hiddenSet.has(w.id))).length,
  ])), [includeHidden, hiddenSet]);

  const usable = SECTIONS.filter((s) => selected.has(s.key) && counts[s.key] > 0);
  const canExport = usable.length > 0 && !rangeProblem;

  function toggleSection(key, on) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(key); else next.delete(key);
      return next;
    });
  }

  /* ——————————————————————— Geração ——————————————————————— */

  function prepare() {
    const now = new Date();
    const plazaKey = plaza || null;
    const types = defaults.types ?? null;
    const m = computeReport({
      data: activeData,
      range,
      prev: comparisonRange(range, now),
      types,
      plaza: plazaKey,
      now,
      continuityDays: Number(defaults.views?.continuidade ?? 90),
    });
    const widgets = WIDGETS.filter((w) => selected.has(w.section) && (includeHidden || !hiddenSet.has(w.id)));
    const views = defaults.views ?? {};
    const meta = buildMeta({ m, range, plaza: plazaKey, types, user, now });
    return { m, sections: usable, widgets, views, meta, plazaKey };
  }

  async function exportCsv() {
    if (busy || !canExport || loadingData) return;
    setBusy('csv');
    try {
      const { m, sections, widgets, views, meta } = prepare();
      downloadText(reportFilename(range), buildReportCSV({ m, sections, widgets, views, meta, order: defaults.order }));
      audit.logExport(`Relatório de desempenho (CSV) · ${meta.unit} · ${range.from} a ${range.to}`).catch(() => {});
      toast.success('CSV baixado.');
    } catch (error) {
      console.error('[relatórios] CSV', error);
      toast.error('Não foi possível gerar o CSV. Tente de novo.');
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    if (busy || !canExport || loadingData) return;
    setBusy('pdf');
    try {
      const { m, sections, widgets, views, meta, plazaKey } = prepare();
      const groups = collectCards({ m, sections, widgets, views, order: defaults.order });
      // "Todas as unidades" sai no papel da unidade em que a pessoa está.
      const paper = await resolveLetterhead(plazaKey || sessionPlaza || PLAZAS.CAMPINAS);
      setJob({ id: Date.now(), groups, meta, src: paper.src, objectUrl: paper.objectUrl, cards: groups.reduce((n, g) => n + g.cards.length, 0) });
    } catch (error) {
      console.error('[relatórios] PDF', error);
      toast.error('Não foi possível gerar o PDF. Tente de novo.');
      setBusy(null);
    }
  }

  // O documento ficou pronto (páginas medidas e timbrado decodificado): imprime.
  const printJob = useRef(null);
  printJob.current = job;
  const onDocumentReady = useCallback((node) => {
    const current = printJob.current;
    if (!current) return;
    audit.log({
      action: audit.ACTIONS.PRINT,
      entity: 'relatorios',
      detail: `Relatório de desempenho (PDF) · ${current.meta.unit} · ${current.meta.from} a ${current.meta.to} · ${current.cards} cards`,
    }).catch(() => {});

    let timer = null;
    const finish = () => {
      window.removeEventListener('afterprint', finish);
      window.clearTimeout(timer);
      printCleanup.current = null;
      setJob(null);
      setBusy(null);
      toast.success('Relatório enviado para impressão. Escolha "Salvar como PDF" no destino.');
    };
    printCleanup.current = () => {
      window.removeEventListener('afterprint', finish);
      window.clearTimeout(timer);
    };
    window.addEventListener('afterprint', finish);
    // Alguns navegadores não disparam `afterprint` se o diálogo é descartado: o documento não fica na página para sempre.
    timer = window.setTimeout(finish, 120_000);
    printElement(node);
  }, [toast]);

  // A medição ou o timbrado falhou: o botão volta e o documento sai da página.
  const onDocumentError = useCallback((error) => {
    console.error('[relatórios] documento', error);
    setJob(null);
    setBusy(null);
    toast.error('Não foi possível montar o PDF. Tente de novo.');
  }, [toast]);

  // O blob do timbrado próprio some com o documento.
  useEffect(() => {
    const url = job?.objectUrl;
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [job]);

  // Fechar o assistente no meio do caminho não deixa ouvinte nem temporizador para trás.
  useEffect(() => () => { printCleanup.current?.(); }, []);

  /* ——————————————————————— Tela ——————————————————————— */

  const loadingExport = loadingData;

  return (
    <>
      <Modal
        open
        onClose={close}
        size="lg"
        title="Criar relatório"
        description="Escolha o que entra. O PDF sai no papel timbrado da unidade; o CSV leva as mesmas tabelas."
        footer={(
          <>
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button
              variant="secondary"
              icon="download"
              onClick={exportCsv}
              loading={busy === 'csv' || loadingExport}
              disabled={!canExport || (busy !== null && busy !== 'csv')}
            >
              Baixar CSV
            </Button>
            <Button
              variant="primary"
              icon="print"
              onClick={exportPdf}
              loading={busy === 'pdf' || loadingExport}
              disabled={!canExport || (busy !== null && busy !== 'pdf')}
            >
              Gerar PDF
            </Button>
          </>
        )}
      >
        <div className="rp-dialog">
          <fieldset className="rp-dialog__group">
            <legend className="rp-dialog__legend">
              <span className="field__label">Temas</span>
              <span className="rp-dialog__links">
                <button
                  type="button"
                  className="rp-dialog__link"
                  onClick={() => setSelected(new Set(SECTIONS.filter((s) => counts[s.key] > 0).map((s) => s.key)))}
                >
                  Marcar todos
                </button>
                <button type="button" className="rp-dialog__link" onClick={() => setSelected(new Set())}>Limpar</button>
              </span>
            </legend>
            <div className="rp-dialog__themes">
              {SECTIONS.map((section) => {
                const count = counts[section.key];
                const on = selected.has(section.key) && count > 0;
                return (
                  <div key={section.key} className={`rp-dialog__theme ${on ? 'is-on' : ''} ${count === 0 ? 'is-off' : ''}`.trim()}>
                    <Checkbox
                      label={section.label}
                      description={count ? `${count} ${plural(count, 'card', 'cards')}` : 'Todos os cards estão ocultos'}
                      checked={on}
                      disabled={count === 0}
                      onChange={(checked) => toggleSection(section.key, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="rp-dialog__col">
            <div className="rp-dialog__group">
              <Select
                label="Período"
                value={presetValue}
                onChange={(event) => pickPreset(event.target.value)}
                options={PRESET_OPTIONS}
              />
              <div className="rp-dialog__dates">
                <TextField
                  label="Início"
                  type="date"
                  value={draft.from}
                  onChange={(event) => editDate('from', event.target.value)}
                />
                <TextField
                  label="Fim"
                  type="date"
                  value={draft.to}
                  onChange={(event) => editDate('to', event.target.value)}
                />
              </div>
              {rangeProblem ? (
                <p className="rp-dialog__caption is-error" role="alert">{rangeProblem}</p>
              ) : (
                <p className="rp-dialog__caption">{rangeCaption(range)}</p>
              )}
            </div>

            <Select
              label="Unidade"
              value={plaza}
              onChange={(event) => setPlaza(event.target.value)}
              options={PLAZA_OPTIONS}
              hint={loadingData ? 'Carregando os dados da unidade…' : undefined}
            />

            <Checkbox
              label="Incluir cards ocultos"
              description={hiddenCount
                ? `${hiddenCount} ${plural(hiddenCount, 'card oculto', 'cards ocultos')} na tela`
                : 'Nenhum card oculto na tela'}
              checked={includeHidden}
              disabled={hiddenCount === 0}
              onChange={setIncludeHidden}
            />
          </div>
        </div>
      </Modal>

      {job ? createPortal(
        <ReportDocument
          key={job.id}
          groups={job.groups}
          meta={job.meta}
          letterheadSrc={job.src}
          onReady={onDocumentReady}
          onError={onDocumentError}
        />,
        document.body,
      ) : null}
    </>
  );
}

export default function CreateReportDialog({ open, ...props }) {
  // Sem `open`, nada fica montado: ao reabrir, o assistente volta a partir dos padrões da tela.
  return open ? <Dialog {...props} /> : null;
}
