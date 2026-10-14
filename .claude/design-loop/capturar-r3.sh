#!/bin/bash
# Capturas da rodada 3 (acabamento): documentos clínicos no timbrado, modais, impressão.
set -e
cd "$(dirname "$0")"
OUT=shots/r3
mkdir -p $OUT
rm -f $OUT/*.png $OUT/*.pdf
PID=$(node cdp.mjs eval "#/" "const r = await import('/admin/data/repository.js'); const S = await import('/admin/data/schema.js'); return (await r.list(S.STORES.PATIENTS, {})).find(p => p.nome.startsWith('Heitor')).id;" | tr -d '"')
CLICKROW="document.querySelector('tbody tr')?.click()"
# 1 · lista de emitidos e a folha aberta
node cdp.mjs shot "#/documentos" $OUT/01-emitidos.png --click Emitidos --full >/dev/null
node cdp.mjs shot "#/documentos" $OUT/02-folha-emitida.png --click Emitidos --eval "$CLICKROW" >/dev/null
# 2 · modal de emissão (vazio) a partir do prontuário
node cdp.mjs shot "#/pacientes/$PID" $OUT/03-modal-emissao.png --click "Emitir documento" >/dev/null
# 3 · impressão real (PDF A4) do documento emitido, convertido em PNG
node cdp.mjs pdf "#/documentos" $OUT/04-impressao.pdf --click Emitidos --eval "$CLICKROW" >/dev/null
sips -s format png $OUT/04-impressao.pdf --out $OUT/04-impressao.png >/dev/null 2>&1 || true
# 3b · as demais folhas emitidas (prescrição com itens, laudo)
for i in 1 2; do
  node cdp.mjs pdf "#/documentos" $OUT/04-impressao-$i.pdf --click Emitidos --eval "document.querySelectorAll('tbody tr')[$i]?.click()" >/dev/null
  sips -s format png $OUT/04-impressao-$i.pdf --out $OUT/04-impressao-$i.png >/dev/null 2>&1 || true
done

# 4 · modais e sobreposições
node cdp.mjs shot "#/financeiro" $OUT/05-modal-lancamento.png --click "Novo lançamento" >/dev/null
node cdp.mjs shot "#/agenda" $OUT/06-sheet-agendamento.png --click "Novo agendamento" >/dev/null
node cdp.mjs shot "#/pacientes" $OUT/07-modal-paciente.png --click "Novo paciente" >/dev/null
node cdp.mjs shot "#/" $OUT/08-paleta-comandos.png --eval "document.querySelector('.search-trigger')?.click()" >/dev/null
node cdp.mjs shot "#/agenda" $OUT/09-detalhe-agendamento.png --eval "document.querySelector('.slot')?.click()" >/dev/null
# 5 · responsivo
node cdp.mjs shot "#/" $OUT/10-tablet-visao-geral.png --w 768 --h 1024 >/dev/null
node cdp.mjs shot "#/" $OUT/11-celular-visao-geral.png --w 390 --h 844 --full >/dev/null
node cdp.mjs shot "#/pacientes" $OUT/12-celular-pacientes.png --w 390 --h 844 >/dev/null
node cdp.mjs shot "#/documentos" $OUT/13-celular-documentos.png --w 390 --h 844 --click Emitidos >/dev/null
# 6 · telas de celular que as passadas 5 a 8 mostraram frágeis
node cdp.mjs shot "#/agenda" $OUT/15-celular-agenda.png --w 390 --h 844 --eval "document.querySelector('.day-grid')?.scrollIntoView(); window.scrollBy(0,-40)" >/dev/null
node cdp.mjs shot "#/agenda" $OUT/17-celular-agenda-lista.png --w 390 --h 844 --click Lista --eval "document.querySelector('.appointment-list')?.scrollIntoView(); window.scrollBy(0,-120)" >/dev/null
node cdp.mjs shot "#/pacientes/$PID" $OUT/18-celular-prontuario.png --w 390 --h 1400 >/dev/null
node cdp.mjs shot "#/financeiro" $OUT/19-celular-financeiro.png --w 390 --h 844 >/dev/null
node cdp.mjs shot "#/documentos" $OUT/24-celular-folha-emitida.png --w 390 --h 1100 --click Emitidos --eval "document.querySelector('tbody tr')?.click()" >/dev/null
node cdp.mjs shot "#/pacientes" $OUT/25-celular-pacientes-cards.png --w 390 --h 900 --click Cards --eval "document.querySelectorAll('.patient-card')[2]?.scrollIntoView({block:'start'}); window.scrollBy(0,-70)" >/dev/null
node cdp.mjs shot "#/relatorios" $OUT/26-celular-relatorios-semana.png --w 390 --h 900 --click Semana >/dev/null
node cdp.mjs shot "#/configuracoes" $OUT/27-tablet-integracoes.png --w 768 --h 1000 --click Integrações >/dev/null
# 7 · painel de agenda da Visão geral (peça do dono) e telas corrigidas depois
node cdp.mjs shot "#/" $OUT/30-celular-visao-proximos.png --w 390 --h 700 --eval "document.querySelector('.agenda-panel__next')?.scrollIntoView({block:'center'})" >/dev/null
node cdp.mjs shot "#/" $OUT/32-celular-pendencias.png --w 390 --h 900 --eval "[...document.querySelectorAll('.card__title')].find(e=>e.textContent.includes('Precisa de você'))?.scrollIntoView({block:'start'}); window.scrollBy(0,-70)" >/dev/null
node cdp.mjs shot "#/operacoes" $OUT/33-celular360-salas.png --w 360 --h 760 --click Salas >/dev/null
node cdp.mjs shot "#/" $OUT/34-celular-visao-semana.png --w 390 --h 900 --click Semana --eval "document.querySelector('.agenda-panel')?.scrollIntoView({block:'start'}); window.scrollBy(0,-70)" >/dev/null
node cdp.mjs shot "#/" $OUT/35-celular-visao-mes.png --w 390 --h 900 --click Mês --eval "document.querySelector('.agenda-panel')?.scrollIntoView({block:'start'}); window.scrollBy(0,-70)" >/dev/null
node cdp.mjs shot "#/configuracoes" $OUT/28-config-timbrado.png --w 1280 --h 1000 --eval "document.querySelector('.letterheads')?.scrollIntoView({block:'center'})" >/dev/null
ls $OUT
