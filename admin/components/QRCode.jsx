import { useMemo } from 'react';
import QRCode from 'qrcode';

const QUIET = 4;

/**
 * QR code em SVG vetorial, gerado no navegador. Sem imagem externa, sem
 * `dangerouslySetInnerHTML` e sem estilo inline (a política de segurança do
 * painel não permite): o desenho é um único <path> com um quadrado por módulo.
 * Correção de erro "M" (~15%): lê bem mesmo com impressora econômica.
 */
export function QRCodeSvg({ value, className = '', label = 'QR code' }) {
  const geometry = useMemo(() => {
    if (!value) return null;
    try {
      const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
      const size = modules.size;
      let d = '';
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (modules.get(x, y)) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
        }
      }
      return { total: size + QUIET * 2, d };
    } catch {
      return null;
    }
  }, [value]);

  if (!geometry) return null;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${geometry.total} ${geometry.total}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={geometry.total} height={geometry.total} fill="#fff" />
      <path d={geometry.d} fill="#0f1012" />
    </svg>
  );
}

export default QRCodeSvg;
