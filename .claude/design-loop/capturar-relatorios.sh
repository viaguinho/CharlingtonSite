#!/bin/bash
# Capturas do redesign dos Relatórios (16/10): uma pasta por passada.
# Uso: ./capturar-relatorios.sh p1
set -e
cd "$(dirname "$0")"
OUT=shots/relatorios-${1:-p1}
mkdir -p "$OUT"
rm -f "$OUT"/*.png
R='#/relatorios'
SCROLL="document.getElementById('conteudo').scrollTo(0"
node cdp.mjs eval "$R" "Object.keys(localStorage).filter(k=>k.startsWith('charlington.reports.layout')).forEach(k=>localStorage.removeItem(k)); localStorage.setItem('charlington.rail.expanded','0'); return 1;" >/dev/null
# Página inteira e dobras (1440)
node cdp.mjs shot "$R" "$OUT/01-pagina-inteira.png" --w 1440 --h 900 --full >/dev/null
node cdp.mjs shot "$R" "$OUT/02-dobra-resumo.png" --w 1440 --h 900 >/dev/null
for y in 820 1700 2550 3400 4300; do
  node cdp.mjs shot "$R" "$OUT/03-rolagem-$y.png" --w 1440 --h 900 --eval "$SCROLL,$y)" >/dev/null
done
# Larguras
node cdp.mjs shot "$R" "$OUT/04-1280.png" --w 1280 --h 800 >/dev/null
node cdp.mjs shot "$R" "$OUT/05-1024.png" --w 1024 --h 768 --full >/dev/null
node cdp.mjs shot "$R" "$OUT/06-celular.png" --w 390 --h 844 --full >/dev/null
node cdp.mjs shot "$R" "$OUT/07-celular-dobra.png" --w 390 --h 844 >/dev/null
# Estados e funções
node cdp.mjs shot "$R" "$OUT/10-periodo.png" --w 1440 --h 900 --eval "document.querySelector('.rp-toolbar__dates .rp-round').click()" >/dev/null
node cdp.mjs shot "$R" "$OUT/11-filtro.png" --w 1440 --h 900 --eval "document.querySelectorAll('.rp-toolbar .rp-round')[1].click()" >/dev/null
node cdp.mjs shot "$R" "$OUT/12-busca.png" --w 1440 --h 900 --eval "document.querySelector('.rp-toolbar .rp-round').click(); await __sleep(200); const i=document.querySelector('.rp-search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'pix'); i.dispatchEvent(new Event('input',{bubbles:true}))" >/dev/null
node cdp.mjs shot "$R" "$OUT/13-ajustes.png" --w 1440 --h 900 --eval "document.querySelector('[data-widget=comparacao] .rp-round').click()" >/dev/null
node cdp.mjs shot "$R" "$OUT/14-como-ler.png" --w 1440 --h 900 --eval "document.querySelectorAll('[data-widget=comparacao] .rp-round')[1].click()" >/dev/null
node cdp.mjs shot "$R" "$OUT/15-ampliado.png" --w 1440 --h 900 --eval "document.querySelectorAll('[data-widget=recebido] .rp-round')[2].click()" >/dev/null
node cdp.mjs shot "$R" "$OUT/16-catalogo.png" --w 1440 --h 900 --eval "[...document.querySelectorAll('.rp-pill')].find(b=>b.textContent.includes('Adicionar')).click()" >/dev/null
node cdp.mjs shot "$R" "$OUT/17-criar-relatorio.png" --w 1440 --h 900 --eval "[...document.querySelectorAll('.rp-pill')].find(b=>b.textContent.includes('Criar relat')).click(); await __sleep(900)" >/dev/null
node cdp.mjs shot "$R" "$OUT/18-lista-sem-retorno.png" --w 1440 --h 900 --eval "document.querySelector('.rp-hero__glass-head .rp-round').click()" >/dev/null
node cdp.mjs shot "$R" "$OUT/19-hover-barras.png" --w 1440 --h 900 --eval "const g=document.querySelectorAll('[data-widget=atividade] .rp-bars__bar')[1]; g.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))" >/dev/null
# Movimento: entrada da tela (quadro no meio da animação)
node cdp.mjs shot "#/agenda" "$OUT/20-movimento-entrada.png" --w 1440 --h 900 --live --eval "location.hash='#/relatorios'; await __sleep(650)" >/dev/null
# Trimestre (grão por semana)
node cdp.mjs shot "$R" "$OUT/21-trimestre-ano.png" --w 1440 --h 900 --eval "document.querySelector('.rp-toolbar__dates .rp-round').click(); await __sleep(300); [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Últimos 30 dias').click(); await __sleep(600); $SCROLL,0)" >/dev/null
node cdp.mjs eval "$R" "Object.keys(localStorage).filter(k=>k.startsWith('charlington.reports.layout')).forEach(k=>localStorage.removeItem(k)); return 1;" >/dev/null
ls "$OUT" | wc -l
