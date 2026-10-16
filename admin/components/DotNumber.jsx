import { memo } from 'react';

/**
 * Número em matriz de pontos — o "LED" das referências Metria, Veri e
 * Superpower, desenhado em SVG (nenhuma fonte nova a carregar).
 *
 * Só desenha o que tem glifo: dígitos e a pontuação de número. Qualquer outra
 * letra devolve `null` e quem chama mostra o texto comum — um "—" ou "2h" em
 * pontos inventados seria pior do que em Urbanist.
 *
 * O texto real vai para o leitor de tela; o desenho é `aria-hidden`.
 * Os pontos acendem em onda da esquerda para a direita (CSS, `--d` por
 * coluna); com movimento reduzido aparecem prontos.
 */

const GLYPHS = {
  0: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '.', '.', '#', '#'],
  ':': ['.', '.', '#', '.', '#', '.', '.'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '−': ['....', '....', '....', '####', '....', '....', '....'],
  '-': ['....', '....', '....', '####', '....', '....', '....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

const ROWS = 7;
const PITCH = 10;      // distância entre centros, em unidades do viewBox
const RADIUS = 4;      // ponto aceso: quase encostando no vizinho, o dígito lê como traço
const GAP_COLS = 1;    // coluna vazia entre glifos

/** O texto pode virar matriz? (só dígitos e pontuação de número) */
export function canDot(text) {
  if (text == null) return false;
  const s = String(text);
  return s.length > 0 && s.length <= 12 && [...s].every((ch) => ch in GLYPHS) && /\d/.test(s);
}

function DotNumberImpl({ value, className = '' }) {
  const text = String(value);
  if (!canDot(text)) return null;

  const dots = [];
  let col = 0;
  [...text].forEach((ch, gi) => {
    const glyph = GLYPHS[ch];
    const width = glyph[0].length;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < width; c += 1) {
        if (glyph[r][c] !== '#') continue;
        dots.push(
          <circle
            key={`${gi}-${r}-${c}`}
            cx={(col + c) * PITCH + PITCH / 2}
            cy={r * PITCH + PITCH / 2}
            r={RADIUS}
            className="dotnum__on"
            // Onda: cada coluna acende 18 ms depois da anterior, com um
            // pequeno atraso por linha para a onda não parecer uma régua.
            style={{ '--d': `${(col + c) * 18 + r * 6}ms` }}
          />,
        );
      }
    }
    col += width + GAP_COLS;
  });
  const cols = col - GAP_COLS;

  return (
    <span className={`dotnum ${className}`.trim()}>
      <svg
        className="dotnum__svg"
        viewBox={`0 0 ${cols * PITCH} ${ROWS * PITCH}`}
        style={{ '--cols': cols }}
        aria-hidden="true"
        focusable="false"
      >
        {dots}
      </svg>
      <span className="sr-only">{text}</span>
    </span>
  );
}

// O número muda pouco e a matriz custa algumas centenas de círculos: só
// redesenha quando o texto muda (e a troca de `key` reacende a onda).
export const DotNumber = memo(DotNumberImpl, (a, b) => String(a.value) === String(b.value) && a.className === b.className);

export default DotNumber;
