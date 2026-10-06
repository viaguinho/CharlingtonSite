# bar.md — mecanismos extraídos das referências

Régua do design-loop. Cada linha é verificável **olhando** a tela renderizada.
Nada de adjetivo: "parece premium" não serve para nada.

**Referências que estabelecem a régua**
- **REF 3 — AI Health Platform** · `behance.net/gallery/251598713`
  (imagens em `refs/03-aihealth/`) — a mais próxima do nosso domínio clínico.
- **REF 4 — Orvion / Modern CRM** · `behance.net/gallery/236915009`
  (imagens em `refs/04-moderncrm/`) — a régua do grid bento e da toolbar.

---

## M1 · Escala tipográfica contida
No máximo **quatro** tamanhos de texto visíveis por tela. A razão entre o
número dominante e o corpo é de **pelo menos 2,4×** (na REF 3, o escore
`8.4%` tem 24px contra corpo de 11px; na REF 4, `29,48m` tem 34px contra 13px).

**Como verificar:** contar os tamanhos distintos numa captura. Cinco ou mais
reprova.

## M2 · Um acento, no máximo três aparições
Azul `#0071e3` é a **única** cor saturada decorativa, e não aparece em mais de
**três** elementos por tela. Verde, âmbar e vermelho só entram carregando
significado clínico ou financeiro (alergia, atraso, vencido) — nunca para
"dar vida". Na REF 3 o azul aparece em exatamente três lugares por tela: aba
ativa, uma micro-visualização e um valor.

**Como verificar:** contar manchas de cor saturada na captura. Quatro ou mais
sem justificativa semântica reprova.

## M3 · A métrica dominante é imediata
O número que responde à pergunta central da tela é o **maior elemento da
primeira dobra** e vem acompanhado de rótulo em corpo pequeno **acima** dele,
não abaixo. Unidade e denominador em corpo menor, alinhados à linha de base
(`10.8` **k**, `4.2` **/10** — REF 1 e REF 3).

**Como verificar:** o maior texto da dobra é um número? Tem rótulo acima?

## M4 · Planaridade — borda OU sombra
Card em repouso usa **hairline de 1px** e, no máximo, sombra de 1–2px de
desfoque. Nada de card "boiando". Elevação forte é reservada a camada
sobreposta (modal, popover, gaveta). As duas referências são chapadas: a
separação vem da borda e do espaço, não da sombra.

**Como verificar:** algum card em repouso projeta sombra visível a olho nu?
Reprova.

## M5 · A primeira dobra é acionável
Acima de 700px de altura há **pelo menos um** elemento que diz o que fazer
agora, com contagem real: quem está esperando, o que falta assinar, o que
vence hoje. Painel que abre só com números contemplativos reprova.

**Como verificar:** em 3 segundos de olhar, dá para dizer qual é a próxima
ação? Se a resposta exige rolar, reprova.

## M6 · Nada truncado em navegação e rótulo
Nenhum item de menu, rótulo de métrica ou título de seção termina em
reticências. Rótulo longo quebra em duas linhas — cortar "Marcos do
desenvolvimento" em "Marcos do desenvo…" destrói justamente a palavra que
identifica a seção.

**Como verificar:** procurar `…` na captura. Qualquer ocorrência em navegação
ou rótulo reprova.

## M7 · Ritmo único de grid
Um único gutter em toda a tela (24px) e alturas de widget em múltiplos de uma
mesma linha-base. Linhas de lista com **no mínimo 44px** de altura de alvo.
Na REF 4 o bento inteiro respira no mesmo intervalo, e é isso que faz a tela
parecer montada e não empilhada.

**Como verificar:** medir dois espaçamentos horizontais distintos entre cards.
Diferentes reprovam.

## M8 · Estado vazio honesto
Onde não há dado: ícone, frase que diz o que apareceria ali e a ação que gera
o primeiro registro. **Nunca** uma curva, barra ou número decorativo para
"preencher". Este é o único mecanismo que as referências não exibem — elas
mostram telas cheias de dado fictício — e onde nós precisamos ser melhores
do que elas, porque o sistema real nasce vazio.

**Como verificar:** algum gráfico desenha uma linha sem dado por trás?
Reprova na hora.
