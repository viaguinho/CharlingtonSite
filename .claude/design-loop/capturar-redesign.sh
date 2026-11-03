#!/bin/bash
# Capturas do redesign visual (14/10): uma pasta por passada. Uso: ./capturar-redesign.sh p1
set -e
cd "$(dirname "$0")"
OUT=shots/redesign-${1:-p1}
mkdir -p $OUT
rm -f $OUT/*.png
node cdp.mjs eval "#/" "localStorage.setItem('charlington.rail.expanded','0'); return 1;" >/dev/null
PID=$(node cdp.mjs eval "#/" "const r = await import('/admin/data/repository.js'); const S = await import('/admin/data/schema.js'); return (await r.list(S.STORES.PATIENTS, {})).find(p => p.nome.startsWith('Heitor'))?.id ?? (await r.list(S.STORES.PATIENTS, {}))[0].id;" | tr -d '"')
# Peça 1 · Visão geral
node cdp.mjs shot "#/" $OUT/p1-01-visao-geral.png --w 1440 --h 900 --full >/dev/null
node cdp.mjs shot "#/" $OUT/p1-02-visao-geral-dobra.png --w 1440 --h 900 >/dev/null
node cdp.mjs shot "#/" $OUT/p1-03-celular.png --w 390 --h 844 --full >/dev/null
# movimento: régua trocando para "Ano" (quadro no meio da onda) e entrada da tela
node cdp.mjs shot "#/" $OUT/p1-04-movimento-regua.png --w 1440 --h 900 --live --eval "__btn('Ano')?.click(); await __sleep(140)" >/dev/null
node cdp.mjs shot "#/agenda" $OUT/p1-05-movimento-entrada.png --w 1440 --h 900 --live --eval "location.hash='#/'; await __sleep(260)" >/dev/null
# Peça 2 · Telas de dados
node cdp.mjs shot "#/financeiro" $OUT/p2-01-financeiro.png --w 1440 --h 900 --full >/dev/null
node cdp.mjs shot "#/relatorios" $OUT/p2-02-relatorios.png --w 1440 --h 900 --full >/dev/null
node cdp.mjs shot "#/pacientes" $OUT/p2-03-pacientes-lista.png --w 1440 --h 900 >/dev/null
node cdp.mjs shot "#/pacientes" $OUT/p2-04-pacientes-cards.png --w 1440 --h 900 --click Cards >/dev/null
node cdp.mjs shot "#/relatorios" $OUT/p2-05-movimento-relatorios.png --w 1440 --h 900 --live --eval "location.hash='#/agenda'; await __sleep(400); location.hash='#/relatorios'; await __sleep(420)" >/dev/null
# Peça 3 · Fluxos, sobreposições e entrada
node cdp.mjs shot "#/agenda" $OUT/p3-01-agenda.png --w 1440 --h 900 >/dev/null
node cdp.mjs shot "#/documentos" $OUT/p3-02-documentos.png --w 1440 --h 900 >/dev/null
node cdp.mjs shot "#/pacientes/$PID" $OUT/p3-03-prontuario.png --w 1440 --h 900 >/dev/null
node cdp.mjs shot "#/pacientes" $OUT/p3-04-modal-paciente.png --w 1440 --h 900 --click "Novo paciente" >/dev/null
node cdp.mjs shot "#/agenda" $OUT/p3-05-gaveta-agendamento.png --w 1440 --h 900 --click "Novo agendamento" >/dev/null
node cdp.mjs shot "#/" $OUT/p3-06-paleta.png --w 1440 --h 900 --eval "document.querySelector('.search-trigger')?.click()" >/dev/null
node cdp.mjs shot "#/operacoes" $OUT/p3-07-operacoes.png --w 1440 --h 900 >/dev/null
node cdp.mjs shot "#/configuracoes" $OUT/p3-08-configuracoes.png --w 1440 --h 900 >/dev/null
# Por último (sai da sessão): login com o logo em metal líquido, animação viva
node cdp.mjs eval "#/" "localStorage.setItem('charlington.rail.expanded','1'); return 1;" >/dev/null
node cdp.mjs shot "#/" $OUT/p3-09-login.png --w 1440 --h 900 --live --eval "document.querySelector('.rail__logout')?.click(); await __sleep(3500)" >/dev/null
node cdp.mjs eval "#/" "localStorage.setItem('charlington.rail.expanded','0'); return 1;" >/dev/null
ls $OUT | wc -l
