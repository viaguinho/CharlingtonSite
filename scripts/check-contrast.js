/**
 * Verificador de contraste do painel.
 *
 * Como usar: abra o painel, entre, e cole este arquivo inteiro no console do
 * navegador. Ele varre todo texto renderizado na tela atual e lista o que não
 * atinge o mínimo da WCAG 2.1 AA — 4,5:1 para texto normal, 3:1 para texto
 * com 18px ou mais (ou 14px em negrito).
 *
 * Por que não é um teste de build: contraste depende do que está de fato
 * empilhado atrás do texto em tempo de execução. Um `rgba(15,16,18,.08)` sobre
 * um card branco sobre o canvas cinza compõe um valor que nenhum analisador
 * estático de CSS consegue prever — e ler o rgba como se fosse opaco produz
 * falso positivo em massa (foi o que aconteceu na primeira tentativa: quatro
 * "reprovações" que eram artefato de medição, não problema real).
 *
 * Rode nas três telas: Visão geral, Pacientes e Prontuário.
 */

(() => {
  const parse = (color) => {
    const n = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
    return { r: n[0], g: n[1], b: n[2], a: n[3] ?? 1 };
  };

  /** Composição alfa: `fg` sobre `bg`, ambos já resolvidos. */
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  const luminance = (c) => {
    const f = [c.r, c.g, c.b]
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };

  const ratio = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  /** Empilha todos os fundos até a raiz e compõe de trás para frente. */
  const effectiveBackground = (el) => {
    const stack = [];
    let node = el;
    while (node) {
      const color = parse(getComputedStyle(node).backgroundColor);
      if (color.a > 0) stack.push(color);
      node = node.parentElement;
    }
    stack.push(parse(getComputedStyle(document.body).backgroundColor));
    return stack.reduceRight((acc, color) => over(color, acc));
  };

  const failures = [];
  const seen = new Set();

  document.querySelectorAll('body *').forEach((el) => {
    // Só nós que renderizam texto próprio, não contêineres.
    if (!el.firstChild || el.firstChild.nodeType !== Node.TEXT_NODE) return;
    if (!el.textContent.trim()) return;

    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return;
    if (!el.getClientRects().length) return;

    const size = parseFloat(style.fontSize);
    const weight = parseInt(style.fontWeight, 10) || 400;
    const isLarge = size >= 18 || (size >= 14 && weight >= 700);
    const minimum = isLarge ? 3 : 4.5;

    const measured = ratio(parse(style.color), effectiveBackground(el));
    if (measured >= minimum) return;

    const key = `${style.color}|${size}|${el.className}`;
    if (seen.has(key)) return;
    seen.add(key);

    failures.push({
      seletor: el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(' ')[0]}` : ''),
      texto: el.textContent.trim().slice(0, 40),
      cor: style.color,
      tamanho: `${size}px/${weight}`,
      medido: `${measured.toFixed(2)}:1`,
      minimo: `${minimum}:1`,
    });
  });

  if (!failures.length) {
    console.log('%c✓ Contraste: nenhuma reprovação nesta tela.', 'color:#158c41;font-weight:600');
  } else {
    console.log(`%c✗ Contraste: ${failures.length} reprovação(ões) nesta tela.`, 'color:#b32f20;font-weight:600');
    console.table(failures);
  }
  return failures;
})();
