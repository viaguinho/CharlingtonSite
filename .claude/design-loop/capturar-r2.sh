#!/bin/bash
# Capturas da rodada 2 (dados e componentes) — 1280 px, base de verificação.
set -e
cd "$(dirname "$0")"
OUT=shots/r2
rm -f $OUT/*.png
PID=$(node cdp.mjs eval "#/" "const r = await import('/admin/data/repository.js'); const S = await import('/admin/data/schema.js'); return (await r.list(S.STORES.PATIENTS, {})).find(p => p.nome.startsWith('Heitor')).id;" | tr -d '"')
node cdp.mjs shot "#/" $OUT/01-visao-geral.png --full >/dev/null
node cdp.mjs shot "#/agenda" $OUT/02-agenda-dia.png --full >/dev/null
node cdp.mjs shot "#/agenda" $OUT/03-agenda-semana.png --click Semana --full >/dev/null
node cdp.mjs shot "#/agenda" $OUT/04-agenda-lista.png --click Lista >/dev/null
node cdp.mjs shot "#/agenda" $OUT/05-agenda-ocupacao.png --click "Por horário" --full >/dev/null
node cdp.mjs shot "#/pacientes" $OUT/06-pacientes.png --full >/dev/null
node cdp.mjs shot "#/pacientes/$PID" $OUT/07-prontuario-linha-do-tempo.png >/dev/null
node cdp.mjs shot "#/pacientes/$PID" $OUT/08-prontuario-marcos.png --click "Marcos do desenvolvimento" --full >/dev/null
node cdp.mjs shot "#/pacientes/$PID" $OUT/08b-prontuario-documentos.png --click "a emitir" --full >/dev/null
node cdp.mjs shot "#/financeiro" $OUT/09-financeiro-mes.png --full >/dev/null
node cdp.mjs shot "#/financeiro" $OUT/10-financeiro-trimestre.png --click Trimestre --full >/dev/null
node cdp.mjs shot "#/financeiro" $OUT/11-financeiro-vencidos.png --click "Ver títulos" >/dev/null
node cdp.mjs shot "#/relatorios" $OUT/12-relatorios-mes.png --full >/dev/null
node cdp.mjs shot "#/relatorios" $OUT/13-relatorios-ano.png --click Ano --full >/dev/null
node cdp.mjs shot "#/operacoes" $OUT/14-operacoes-insumos.png --full >/dev/null
node cdp.mjs shot "#/operacoes" $OUT/15-operacoes-salas.png --click Salas --full >/dev/null
node cdp.mjs shot "#/documentos" $OUT/16-documentos-a-emitir.png --full >/dev/null
node cdp.mjs shot "#/documentos" $OUT/17-documentos-emitidos-vazio.png --click Emitidos >/dev/null
ls $OUT | wc -l
