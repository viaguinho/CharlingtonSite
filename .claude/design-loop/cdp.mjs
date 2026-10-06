#!/usr/bin/env node
/**
 * Capturador do design-loop — renderiza o painel num Chromium headless com
 * perfil próprio e devolve capturas e medições. Existe para que os críticos
 * julguem a TELA, sem depender do painel do navegador estar visível.
 *
 * A base (IndexedDB) deste perfil é de verificação: fica só nesta máquina,
 * em .claude/design-loop/profile, fora do git e longe do Supabase.
 *
 * Uso:
 *   node cdp.mjs shot  <rota> <saida.png> [--y 0] [--w 1280] [--h 800] [--full] [--click "Texto"]...
 *   node cdp.mjs eval  <rota> <arquivo.js | codigo>      (imprime JSON)
 *   node cdp.mjs stop
 *
 * <rota> é o hash do painel, ex.: "#/financeiro". A autenticação na base de
 * verificação é feita pelo próprio script.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 9333;
const BASE = 'http://localhost:5173/admin.html';
const PROFILE = join(HERE, 'profile');
const CHROME = [
  join(homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);

const LOGIN = { email: 'charlington@clinicacharlington.com.br', senha: 'VerificacaoLocal#2026' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(path, method = 'GET') {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { method });
  return res.json();
}

async function ensureChrome() {
  try { await json('/json/version'); return; } catch { /* sobe abaixo */ }
  if (!CHROME) throw new Error('Chromium não encontrado.');
  mkdirSync(PROFILE, { recursive: true });
  const child = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank',
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  for (let i = 0; i < 50; i += 1) {
    await sleep(200);
    try { await json('/json/version'); return; } catch { /* aguarda */ }
  }
  throw new Error('Chromium não respondeu.');
}

async function openPage() {
  const target = await json('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: ok, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : ok(msg.result);
    }
  };
  const send = (method, params = {}) => new Promise((ok, reject) => {
    id += 1;
    pending.set(id, { resolve: ok, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const close = async () => { ws.close(); await json(`/json/close/${target.id}`).catch(() => {}); };
  return { send, close };
}

async function evaluate(send, expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(async () => { ${expression} })()`,
    awaitPromise: true, returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

const HELPERS = `
  window.__set = (el, v) => {
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  window.__f = (label) => {
    const alvo = label.toUpperCase();
    // Campo do formulário padrão (.field + .field__label).
    const noCampo = Array.from(document.querySelectorAll('.field'))
      .find((f) => (f.querySelector('.field__label')?.innerText || '').trim().toUpperCase().startsWith(alvo))
      ?.querySelector('input,select,textarea');
    if (noCampo) return noCampo;
    // Telas de autenticação usam <label for=…> fora da estrutura .field.
    const rotulo = Array.from(document.querySelectorAll('label'))
      .find((l) => (l.innerText || '').trim().toUpperCase().startsWith(alvo));
    if (rotulo?.htmlFor) return document.getElementById(rotulo.htmlFor);
    if (rotulo) return rotulo.querySelector('input,select,textarea');
    // Último recurso: o tipo do campo.
    if (alvo.startsWith('SENHA') || alvo.startsWith('CONFIRME')) return document.querySelector('input[type=password]');
    if (alvo.startsWith('E-MAIL')) return document.querySelector('input[type=email]');
    return undefined;
  };
  window.__btn = (txt) => Array.from(document.querySelectorAll('button'))
    .find((b) => b.innerText.trim().toLowerCase() === txt.toLowerCase())
    ?? Array.from(document.querySelectorAll('button')).find((b) => b.innerText.trim().toLowerCase().includes(txt.toLowerCase()));
  window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
`;

async function session(route, { w = 1280, h = 800 } = {}) {
  await ensureChrome();
  const page = await openPage();
  const { send } = page;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.navigate', { url: `${BASE}${route}` });
  await sleep(2500);
  await evaluate(send, HELPERS);
  const state = await evaluate(send, `return document.body.innerText.includes('Configuração inicial') ? 'setup'
    : document.querySelector('input[type=password]') ? 'login' : 'in';`);
  if (state === 'login') {
    await evaluate(send, `
      __set(__f('E-MAIL'), ${JSON.stringify(LOGIN.email)});
      __set(__f('SENHA'), ${JSON.stringify(LOGIN.senha)});
      await __sleep(150);
      document.querySelector('button[type=submit]').click();
      await __sleep(2800);
      location.hash = ${JSON.stringify(route || '#/')};
      await __sleep(2200);
    `);
  }
  // Congela animações de entrada para a captura mostrar o estado final.
  await evaluate(send, `
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation-delay:-10s!important;animation-duration:.001s!important;transition-duration:.001s!important;}';
    document.head.appendChild(s);
    await __sleep(300);
  `);
  return { ...page, state };
}

const [cmd, ...args] = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const flags = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));

try {
  if (cmd === 'stop') {
    const version = await json('/json/version').catch(() => null);
    if (version) {
      const page = await openPage();
      await page.send('Browser.close').catch(() => {});
    }
    console.log('parado');
  } else if (cmd === 'shot') {
    const [route, out] = args;
    const w = Number(flag('w', 1280));
    const h = Number(flag('h', 800));
    const page = await session(route, { w, h });
    for (const text of flags('click')) {
      await evaluate(page.send, `__btn(${JSON.stringify(text)})?.click(); await __sleep(700);`);
    }
    const y = Number(flag('y', 0));
    if (y) await evaluate(page.send, `(document.querySelector('.main, main, .shell__main') ?? document.scrollingElement).scrollTo(0, ${y}); window.scrollTo(0, ${y}); await __sleep(400);`);
    const params = { format: 'png' };
    if (args.includes('--full')) {
      const height = await evaluate(page.send, `
        // O shell rola por dentro: a altura real é a do maior contêiner rolável.
        const els = [document.documentElement, ...document.querySelectorAll('main, [class*=main], [class*=content]')];
        return Math.min(Math.ceil(Math.max(...els.map((e) => e.scrollHeight + e.getBoundingClientRect().top))), 6000);
      `);
      await page.send('Emulation.setDeviceMetricsOverride', { width: w, height, deviceScaleFactor: 1, mobile: false });
      await sleep(500);
    }
    const { data } = await page.send('Page.captureScreenshot', params);
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(out, Buffer.from(data, 'base64'));
    await page.close();
    console.log(resolve(out));
  } else if (cmd === 'eval') {
    const [route, code] = args;
    const page = await session(route, { w: Number(flag('w', 1280)), h: Number(flag('h', 800)) });
    const source = existsSync(code) ? readFileSync(code, 'utf8') : code;
    const value = await evaluate(page.send, source);
    await page.close();
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log('comandos: shot | eval | stop');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
