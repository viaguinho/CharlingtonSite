#!/usr/bin/env node
/**
 * Verificação de segurança do painel — roda antes de todo build.
 *
 * Falha a build quando encontra, nos arquivos entregues ao navegador:
 *   · credencial embutida (o erro do painel anterior, que servia o
 *     `clientSecret` do Bird ID a qualquer visitante);
 *   · CPF, CNPJ ou telefone gravados no código;
 *   · `onclick=` ou `style=` inline, que a CSP com nonce proíbe;
 *   · `innerHTML` com interpolação, porta de entrada de XSS;
 *   · resíduo de dado fictício do painel anterior.
 *
 * Uso:  node scripts/check-secrets.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// `new URL(...).pathname` devolve o caminho percent-encoded, e o diretório
// deste projeto tem espaço no nome ("Site Charlington" vira "Site%20..."),
// o que fazia o readdir falhar em silêncio e a varredura passar em zero
// arquivos. `fileURLToPath` decodifica corretamente.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Diretórios varridos. Podem ser sobrescritos por argumento, o que permite
// apontar o verificador para outro código — útil para conferir que ele de
// fato detecta (ex.: `node scripts/check-secrets.mjs legacy/admin-v1`).
const SCAN_DIRS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['admin', 'supabase/functions'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json']);

/** Arquivos onde o padrão é legítimo (documentação, este próprio script). */
const ALLOWLIST = [
  'admin/data/documentTemplates.js',   // fraseologia legal, não credencial
  'admin/data/cid10.js',
  'admin/data/scales.js',
  'admin/data/milestones.js',
];

const RULES = [
  {
    id: 'credencial-embutida',
    severity: 'crítico',
    // Atribuição de valor literal não vazio a algo que parece segredo.
    pattern: /\b(client_?secret|api_?key|secret_?key|access_?token|private_?key|service_?role)\b\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/gi,
    message: 'Credencial literal no código entregue ao navegador.',
  },
  {
    id: 'bearer-literal',
    severity: 'crítico',
    pattern: /['"`]Bearer\s+[A-Za-z0-9._-]{20,}['"`]/g,
    message: 'Token Bearer literal no código.',
  },
  {
    id: 'chave-longa',
    severity: 'alto',
    // Sequência longa base64/hex fora de contexto conhecido.
    pattern: /['"`](?=[A-Za-z0-9+/=_-]{48,}['"`])(?![A-Za-z]+:\/\/)[A-Za-z0-9+/=_-]{48,}['"`]/g,
    message: 'Sequência longa que pode ser uma chave.',
    ignoreIn: [/\.css$/, /sprite\.svg$/],
  },
  {
    id: 'cpf-cnpj',
    severity: 'alto',
    pattern: /\b\d{11}\b(?!\d)|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
    message: 'CPF ou CNPJ gravado no código.',
    // Uma máscara de campo ("000.000.000-00") não é um CPF. O que importa é
    // documento real gravado no código.
    falsePositive: (match, line) =>
      /placeholder|máscara|mascara|format|exemplo/i.test(line)
      || /^(\d)\1+$/.test(match.replace(/\D/g, '')),
  },
  {
    id: 'handler-inline',
    severity: 'alto',
    // on*= em HTML. Em JSX o atributo é onClick={...}, que não casa.
    pattern: /\son(?:click|change|submit|load|error|input|focus|blur)\s*=\s*["'][^"']/gi,
    message: 'Handler inline no HTML — a CSP com nonce bloqueia.',
  },
  {
    id: 'innerhtml-interpolado',
    severity: 'crítico',
    pattern: /\.innerHTML\s*=\s*(?!['"`]\s*['"`])[^;]*[$`+]/g,
    message: 'innerHTML com interpolação — risco de XSS.',
  },
  {
    id: 'dado-ficticio',
    severity: 'alto',
    pattern: /Lucas Silva|Silva Santos|senha123|Renata Godoy|Alcione Gomes|Rodrigo Carvalho|clinicacharlington\.com\.br['"`]\s*[,)]/g,
    message: 'Resíduo de dado fictício do painel anterior.',
    ignoreIn: [/LoginScreen\.jsx$/, /\.html$/],   // placeholder de e-mail é legítimo
  },
  {
    id: 'console-com-dado',
    severity: 'médio',
    pattern: /console\.(log|info|debug)\([^)]*\b(paciente|cpf|senha|prontuario|evolucao)\b/gi,
    message: 'Log de console com possível dado pessoal.',
  },
];

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    // Um diretório inexistente é erro de configuração, não "tudo certo":
    // falhar em silêncio aqui transformaria a verificação em teatro.
    console.error(`Diretório não encontrado na varredura: ${dir}`);
    process.exitCode = 1;
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'fonts' || entry.startsWith('.')) continue;
      walk(full, files);
    } else if (EXTENSIONS.has(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

const findings = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file);
    if (ALLOWLIST.includes(rel)) continue;

    const source = readFileSync(file, 'utf8');
    const lines = source.split('\n');

    for (const rule of RULES) {
      if (rule.ignoreIn?.some((re) => re.test(rel))) continue;

      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(source)) !== null) {
        const line = source.slice(0, match.index).split('\n').length;
        const text = lines[line - 1]?.trim() ?? '';
        // Comentários explicando o problema não são o problema.
        if (/^\s*(\*|\/\*|\/\/|--|<!--)/.test(text)) continue;
        if (rule.falsePositive?.(match[0], text)) continue;
        findings.push({ rule, file: rel, line, excerpt: text.slice(0, 110) });
      }
    }
  }
}

const critical = findings.filter((f) => f.rule.severity === 'crítico');
const high = findings.filter((f) => f.rule.severity === 'alto');

if (!findings.length) {
  console.log('✓ Verificação de segurança: nenhum achado.');
  process.exit(0);
}

console.error(`\nVerificação de segurança — ${findings.length} achado(s):\n`);
for (const f of findings) {
  console.error(`  [${f.rule.severity}] ${f.rule.message}`);
  console.error(`      ${f.file}:${f.line}`);
  console.error(`      ${f.excerpt}\n`);
}

if (critical.length || high.length) {
  console.error(`Build interrompida: ${critical.length} crítico(s), ${high.length} alto(s).\n`);
  process.exit(1);
}

console.error('Achados apenas de severidade média — build segue.\n');
process.exit(0);
