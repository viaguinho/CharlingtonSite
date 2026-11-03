# Régua do redesign visual (14/10/2026)

Referências (fixas em todas as passadas, em `.claude/design-loop/refs/`):

- **Barra principal:** `10-pins/arena.jpg` (dashboard Superpower: score em gradiente verde, idade biológica em laranja, números em matriz de pontos) e `10-pins/pin3.jpg` (CreditPros: saudação em duas tintas, cartões em gradiente, faixas de pontuação, pílulas escuras).
- **Apoio:** `10-pins/pin1.jpg` (ladrilhos de vidro e gradiente), `07-metria/` (vidro + lima, LED), `08-veri/` (tiques e cartões de brilho), `09-luma/` (Urbanist, dashboard claro com cards de programa), `05-clerio/` (medidores de tiques, azul), `04-moderncrm/` (área hachurada), `11-dribbble/dyn365.png` (anel de tiques, pílulas de ação).

## Mecanismos (cada um verificável olhando a tela)

1. **Vidro sobre aurora.** Fundo cinza-claro frio com manchas de cor viva só nas bordas da tela; todo card é vidro branco translúcido (raio ≥ 24 px, sombra longa e difusa, borda de luz em cima). Nenhum card com borda escura dura ou canto ≤ 12 px.
2. **Gradiente com sentido, em dose.** Cada tela tem de 1 a 3 ladrilhos em gradiente vivo; o resto é vidro branco. A cor diz o sentido do número: verde→lima bom, laranja→pêssego atenção, azul→ciano volume, rosa→magenta clínico. Texto branco sobre o gradiente legível (corpo ≥ 4,5:1, número ≥ 3:1).
3. **Um número manda.** O número do ladrilho de destaque é desenhado em matriz de pontos (LED) e é a maior massa visual da dobra; os outros números são Urbanist leve (300) com a unidade em corpo menor (R$, %, min, /total).
4. **Uma família, poucos tamanhos.** Urbanist em tudo; no máximo 4 tamanhos de texto por tela além do número de destaque; título de tela grande e leve (≥ 30 px, peso ≤ 400), hierarquia por tinta (cinza × preto), não por negrito.
5. **Gráfico no vocabulário das referências.** Tiques, pontos, cápsulas com trilho pontilhado, hachura e anel de tiques; cor = sentido da série; rótulo ou legenda sempre presente; entrada animada (cresce, desenha, acende) que termina em ≤ 1 s e anda numa direção só.
6. **Tudo é pílula e responde.** Abas, botões e chips com raio total; aba ativa numa pílula escura que desliza até a aba escolhida; botão afunda ao toque; card reage ao cursor (reflexo/elevação) sem mudar de lugar.
7. **Respiro sem perder dado.** Padding interno dos cards ≥ 24 px, vão entre cards de 16–24 px, e nenhuma informação clínica, financeira ou de estado que existia antes some ou fica escondida.

## Fora do veredito

O **menu vertical** (Floating Dock à esquerda: `.rail*`, `floating-dock.*`) é peça manual do dono e não foi tocado. Crítica sobre ele vai para "Observações", nunca reprova.
