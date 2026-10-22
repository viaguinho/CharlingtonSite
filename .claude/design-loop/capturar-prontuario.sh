#!/bin/bash
# Capturas e medições do redesign do prontuário (20/10): uma pasta por passada.
# Uso: ./capturar-prontuario.sh p1
set -e
cd "$(dirname "$0")"
OUT=shots/prontuario-${1:-p1}
mkdir -p "$OUT"
rm -f "$OUT"/*.png "$OUT"/*.json
R='#/pacientes/16df5f04-4169-4ac5-a458-1668c6221ec3'
W="await __sleep(4500)"
STAGE="const c=document.querySelector('.pr-stage canvas'); const r=c.getBoundingClientRect();"
# O busto é estreito e gira sozinho até a 1ª interação: uma coordenada fixa cai
# fora da malha (por isso 10/11/12 saíam iguais ao repouso). FIND varre o canvas
# até o rótulo do pino dizer a estrutura pedida e deixa x,y nesse ponto.
FIND="const __pm=(px,py)=>c.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:px,clientY:py,pointerType:'mouse',pointerId:1,isPrimary:true})); let x=0,y=0; const __find=async(re)=>{ for (let fy=.12; fy<.8; fy+=.03) for (let fx=.25; fx<.75; fx+=.02){ const px=r.left+r.width*fx, py=r.top+r.height*fy; __pm(px,py); await __sleep(40); const t=document.querySelector('.an-pin__label')?.textContent||''; if (re.test(t)) { x=px; y=py; return true; } } return false; };"
MOVE="for (let i=0;i<4;i++){ __pm(x+i*.2,y); await __sleep(60);} await __sleep(700);"
CLICK="const __o={bubbles:true,clientX:x,clientY:y,pointerType:'mouse',pointerId:1,isPrimary:true,button:0}; c.dispatchEvent(new PointerEvent('pointerdown',__o)); c.dispatchEvent(new PointerEvent('pointerup',__o)); c.dispatchEvent(new MouseEvent('click',__o)); await __sleep(900);"

# Dobras
node cdp.mjs shot "$R" "$OUT/01-dobra-1440.png" --w 1440 --h 900 --eval "$W" >/dev/null
node cdp.mjs shot "$R" "$OUT/02-dobra-1920.png" --w 1920 --h 1080 --eval "$W" >/dev/null
node cdp.mjs shot "$R" "$OUT/03-pagina-1440.png" --w 1440 --h 900 --full --eval "$W" >/dev/null
# Palco: hover, seleção, camadas, vista
node cdp.mjs shot "$R" "$OUT/10-hover-temporal.png" --w 1440 --h 900 --eval "$W; $STAGE $FIND await __find(/temporal/i); $MOVE" >/dev/null
node cdp.mjs shot "$R" "$OUT/11-hover-cerebelo.png" --w 1440 --h 900 --eval "$W; $STAGE $FIND (await __find(/cerebelo/i)) || (await __find(/occipital|tronco/i)); $MOVE" >/dev/null
node cdp.mjs shot "$R" "$OUT/12-popover.png" --w 1440 --h 900 --eval "$W; $STAGE $FIND await __find(/temporal/i); $MOVE $CLICK" >/dev/null
node cdp.mjs shot "$R" "$OUT/13-sem-cranio.png" --w 1440 --h 900 --eval "$W; [...document.querySelectorAll('.pr-stage button')].find(b=>/cr[aâ]nio/i.test(b.getAttribute('aria-label')||b.title||'')).click(); await __sleep(900)" >/dev/null
node cdp.mjs shot "$R" "$OUT/14-zoom-busto.png" --w 1440 --h 900 --eval "$W; const m=[...document.querySelectorAll('.pr-stage button')].find(b=>/afastar|diminuir|menos/i.test(b.getAttribute('aria-label')||'')); for(let i=0;i<4;i++){ m.click(); await __sleep(250);} await __sleep(900)" >/dev/null
node cdp.mjs shot "$R" "$OUT/15-lista-teclado.png" --w 1440 --h 900 --eval "$W; const l=document.querySelector('.pr-stage [role=listbox]'); l && l.focus(); await __sleep(300); l && l.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})); await __sleep(700)" >/dev/null
# Colunas
node cdp.mjs shot "$R" "$OUT/20-pastas.png" --w 1440 --h 900 --eval "$W; document.getElementById('conteudo').scrollTo(0,520); await __sleep(1500)" >/dev/null
node cdp.mjs shot "$R" "$OUT/21-pasta-aberta.png" --w 1440 --h 900 --eval "$W; document.getElementById('conteudo').scrollTo(0,520); await __sleep(1200); document.querySelector('.pr-folder .gf-hit').click(); await __sleep(1200)" >/dev/null
node cdp.mjs shot "$R" "$OUT/22-coluna-direita.png" --w 1440 --h 900 --eval "$W; document.getElementById('conteudo').scrollTo(0,700); await __sleep(1200)" >/dev/null
# Seções no painel
for s in linha-do-tempo evolucoes escalas marcos medicacoes anexos documentos consentimentos; do
  node cdp.mjs shot "$R?secao=$s" "$OUT/30-painel-$s.png" --w 1440 --h 900 --eval "await __sleep(2500)" >/dev/null
done
# Larguras
node cdp.mjs shot "$R" "$OUT/40-1280.png" --w 1280 --h 800 --eval "$W" >/dev/null
node cdp.mjs shot "$R" "$OUT/40b-1180.png" --w 1180 --h 800 --eval "$W" >/dev/null
node cdp.mjs shot '#/pacientes/4579401a-c511-4131-a339-7588293467c6' "$OUT/40c-1366x768-2alertas.png" --w 1366 --h 768 --eval "$W" >/dev/null
node cdp.mjs shot "$R" "$OUT/41-1024.png" --w 1024 --h 768 --full --eval "$W" >/dev/null
node cdp.mjs shot "$R" "$OUT/41b-1024-medicacoes.png" --w 1024 --h 768 --eval "$W; document.querySelector('.pr-meds').scrollIntoView({block:'center'}); await __sleep(1200)" >/dev/null
node cdp.mjs shot "$R" "$OUT/42-celular.png" --w 390 --h 844 --full --eval "$W" >/dev/null
node cdp.mjs shot "$R?secao=evolucoes" "$OUT/43-celular-painel.png" --w 390 --h 844 --eval "await __sleep(2500)" >/dev/null
# Medições
node cdp.mjs eval "$R" medir-prontuario.js --w 1440 --h 900 > "$OUT/medidas-1440.json" 2>/dev/null || true
node cdp.mjs eval "$R" medir-prontuario.js --w 390 --h 844 > "$OUT/medidas-390.json" 2>/dev/null || true
ls "$OUT" | wc -l
