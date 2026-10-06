import { useEffect } from 'react';

/**
 * Ícone do sprite único.
 *
 * O sprite é injetado uma vez no documento e referenciado por `<use>`. Isso
 * mantém um único arquivo SVG, permite controlar traço e cor por CSS
 * (`currentColor`), e evita tanto biblioteca de ícones quanto emoji na
 * interface — um painel clínico não usa 📝 como ícone de prescrição.
 */

const SPRITE_URL = new URL('../assets/icons/sprite.svg', import.meta.url).href;
const SPRITE_ID = 'charlington-icon-sprite';

let injection = null;

function injectSprite() {
  if (injection) return injection;
  if (document.getElementById(SPRITE_ID)) {
    injection = Promise.resolve();
    return injection;
  }

  injection = fetch(SPRITE_URL)
    .then((response) => response.text())
    .then((markup) => {
      if (document.getElementById(SPRITE_ID)) return;
      const host = document.createElement('div');
      host.id = SPRITE_ID;
      host.setAttribute('aria-hidden', 'true');
      host.style.display = 'none';
      host.innerHTML = markup;
      document.body.prepend(host);
    })
    .catch((error) => {
      console.error('[ícones] não foi possível carregar o sprite', error);
    });

  return injection;
}

export function Icon({ name, size = 20, stroke = 1.5, className = '', title, ...rest }) {
  useEffect(() => { injectSprite(); }, []);

  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <use href={`#i-${name}`} />
    </svg>
  );
}

export default Icon;
