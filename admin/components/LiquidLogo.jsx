import { Component, Suspense, lazy, useEffect, useState } from 'react';

/**
 * Logo da marca em metal líquido (/liquid-logo, decisão de 14/10): shader
 * WebGL da Paper (`LiquidMetal`) com o próprio logo.svg como máscara, no tom
 * "warm chrome" — prata quente com reflexo azul da marca.
 *
 * Só o login carrega isto: o shader vem num pedaço de bundle à parte
 * (`lazy`), e nenhuma outra tela paga por ele. Enquanto carrega, sem WebGL,
 * ou com movimento reduzido, aparece o logo estático no mesmo lugar e no
 * mesmo tamanho — a tela nunca fica com um buraco.
 */

const LiquidMetal = lazy(() => import('@paper-design/shaders-react').then((m) => ({ default: m.LiquidMetal })));

const LOGO = '/assets/logo.svg';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Se o shader falhar (driver, contexto perdido), volta ao logo estático. */
class ShaderBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function LiquidLogo({ size = 200, label = 'Dr. Charlington Cavalcante', className = '', style = {} }) {
  const [live, setLive] = useState(false);
  // Cores do shader vêm dos tokens (nenhum hexadecimal fora de tokens.css).
  const [colors, setColors] = useState(null);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const cs = getComputedStyle(document.documentElement);
    setColors({
      back: cs.getPropertyValue('--liquid-back').trim(),
      tint: cs.getPropertyValue('--liquid-tint').trim(),
    });
    setLive(!reduced && hasWebGL());
  }, []);

  const still = (
    <img
      src={LOGO}
      alt=""
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      className="liquid-logo__still"
    />
  );

  return (
    <div
      className={`liquid-logo ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
      role="img"
      aria-label={label}
    >
      {live && colors ? (
        <ShaderBoundary fallback={still}>
          <Suspense fallback={still}>
            <LiquidMetal
              className="liquid-logo__shader"
              style={{ width: '100%', height: '100%' }}
              image={LOGO}
              shape="none"
              colorBack={colors.back}
              colorTint={colors.tint}
              repetition={2.9}
              softness={0.12}
              shiftRed={0.3}
              shiftBlue={0.32}
              distortion={0.06}
              contour={0.4}
              angle={72}
              speed={0.55}
              scale={0.82}
              fit="contain"
            />
          </Suspense>
        </ShaderBoundary>
      ) : still}
    </div>
  );
}
