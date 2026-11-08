#!/usr/bin/env node
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const usage = 'Uso: node revisar-projeto.mjs CAMINHO [--json] [--strict]';
const ignoredDirs = new Set([
  '.git', '.next', '.nuxt', '.output', '.svelte-kit', '.cache', '.turbo',
  'node_modules', 'vendor', 'dist', 'build', 'coverage', 'playwright-report',
  'test-results', 'uploads', 'storage', 'tmp', 'temp',
]);
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts', '.vue', '.svelte', '.astro', '.html', '.css', '.json', '.yaml', '.yml', '.go', '.lua', '.sql', '.pem', '.key']);
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts', '.vue', '.svelte', '.astro', '.html', '.go', '.lua']);
const maxFiles = 5000;
const maxBytes = 1024 * 1024;
const maxFindings = 500;

function parseArgs(args) {
  const options = { json: false, strict: false };
  for (const arg of args) {
    if (arg === '--help') return { help: true };
    if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg.startsWith('-')) throw new Error(`Opção desconhecida: ${arg}`);
    else if (!options.root) options.root = path.resolve(arg);
    else throw new Error('Informar apenas um diretório');
  }
  if (!options.root) throw new Error('Informar o diretório do projeto');
  return options;
}

const slash = value => value.split(path.sep).join('/');
const printable = value => value.replace(/[\u0000-\u001f\u007f]/gu, '?');

async function audit(root) {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('A raiz deve ser diretório real, sem link simbólico');
  const files = [];
  const findings = [];
  const excluded = { directories: 0, symlinks: 0, environmentFiles: 0, oversizedText: 0, unreadable: 0 };
  let limited = false;
  let truncatedFindings = false;
  const add = (code, severity, file, line, message) => {
    if (findings.length >= maxFindings) { truncatedFindings = true; return; }
    findings.push({ code, severity, file: printable(file), line, message, confirmed: false });
  };

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (files.length >= maxFiles) { limited = true; return; }
      const full = path.join(directory, entry.name);
      const relative = slash(path.relative(root, full));
      if (entry.isSymbolicLink()) { excluded.symlinks += 1; continue; }
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) { excluded.directories += 1; continue; }
        try { await walk(full); }
        catch { excluded.unreadable += 1; add('DIRECTORY_UNREADABLE', 'medium', relative, null, 'Diretório não lido; revisar permissões e escopo.'); }
      } else if (entry.isFile()) files.push(relative);
    }
  }
  await walk(root);
  const fileSet = new Set(files);
  for (const expected of ['contexto.md', 'AGENTS.md']) {
    if (!fileSet.has(expected)) add('CONTEXT_MISSING', 'info', expected, null, 'Documento de continuidade ausente; adaptar à política do projeto.');
  }
  const hasProduct = files.some(file => file.startsWith('product/'));
  const manifests = [];
  let scanned = 0;

  for (const relative of files) {
    const base = path.posix.basename(relative);
    if (/^\.env(?:\.|$)/u.test(base) && base !== '.env.example') { excluded.environmentFiles += 1; continue; }
    const extension = path.posix.extname(relative).toLowerCase();
    if (!textExtensions.has(extension) && base !== '.env.example') continue;
    const full = path.join(root, relative);
    let content;
    try {
      // Rechecar o alvo imediatamente antes de ler; nunca seguir links encontrados.
      const stat = await lstat(full);
      if (stat.isSymbolicLink() || !stat.isFile()) { excluded.symlinks += 1; continue; }
      if (stat.size > maxBytes) { excluded.oversizedText += 1; continue; }
      content = await readFile(full, 'utf8');
    } catch { excluded.unreadable += 1; add('FILE_UNREADABLE', 'medium', relative, null, 'Arquivo não lido; nenhuma conclusão sobre seu conteúdo.'); continue; }
    scanned += 1;

    if (base === 'package.json') {
      try {
        const manifest = JSON.parse(content);
        const scripts = manifest.scripts && typeof manifest.scripts === 'object' ? manifest.scripts : {};
        const dependencyCount = ['dependencies', 'devDependencies', 'optionalDependencies']
          .reduce((count, group) => count + Object.keys(manifest[group] ?? {}).length, 0);
        manifests.push({ file: printable(relative), scripts: Object.keys(scripts).map(printable).sort(), dependencyCount });
        for (const [name, command] of Object.entries(scripts)) {
          if (/^(test|check|typecheck|lint)$/u.test(name) && typeof command === 'string' && /^\s*(?:echo\b[^&;]*|exit\s+0)\s*$/u.test(command)) {
            add('CHECK_STUB', 'medium', relative, null, 'Script de verificação parece apenas imprimir mensagem ou encerrar; confirmar intenção.');
          }
        }
        for (const group of ['dependencies', 'devDependencies']) {
          for (const version of Object.values(manifest[group] ?? {})) {
            if (version === '*' || version === 'latest') { add('UNBOUNDED_DEPENDENCY', 'medium', relative, null, 'Há dependência com versão ampla; verificar pinning e lockfile.'); break; }
          }
        }
      } catch { add('MANIFEST_INVALID', 'high', relative, null, 'package.json não pôde ser interpretado; verificar formato antes de executar ferramentas.'); }
    }

    // Não tratar modelos, documentação ou fixtures como código de produção.
    const isSupport = /(?:^|\/)(?:docs|references|assets\/templates|tests?|__tests__|fixtures)(?:\/|$)/u.test(relative) || /\.(?:test|spec)\.[^/]+$/u.test(relative);
    if (isSupport) continue;
    const inProduct = !hasProduct || relative.startsWith('product/');
    if (!inProduct && base !== '.env.example') continue;
    const isSource = sourceExtensions.has(extension);
    const lineAt = index => content.slice(0, index).split('\n').length;
    const check = (code, severity, regex, message) => {
      for (const match of content.matchAll(regex)) add(code, severity, relative, lineAt(match.index), message);
    };

    check('PRIVATE_KEY_MARKER', 'high', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu, 'Marcador de chave privada encontrado; investigar sem expor o valor e rotacionar se houver vazamento real.');
    check('PUBLIC_SECRET_NAME', 'high', /\b(?:VITE_|NEXT_PUBLIC_|PUBLIC_)[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|PASSWORD|ACCESS_TOKEN)\b/gu, 'Nome público sugere dado sensível; conferir exposição e semântica sem mostrar valores.');

    if (!isSource) continue;
    check('EMPTY_LINK', 'medium', /\bhref\s*=\s*(?:["']\s*(?:#|javascript:[^"']*)?\s*["']|\{\s*["']\s*#?\s*["']\s*\})/giu, 'Link vazio ou javascript: exige revisão do destino e da semântica.');
    check('EMPTY_HANDLER', 'medium', /\bon(?:Click|Submit)\s*=\s*\{\s*(?:\(\s*\)|[a-zA-Z_$][\w$]*)\s*=>\s*\{\s*\}\s*\}/gu, 'Handler explicitamente vazio; confirmar se o controle deveria executar operação.');
    check('EMPTY_HTML_HANDLER', 'medium', /\bon(?:click|submit)\s*=\s*["']\s*["']/giu, 'Handler HTML vazio; rastrear efeito real do controle.');
    check('ALERT_EFFECT', 'info', /\b(?:window\.)?alert\s*\(/gu, 'Uso de alert: confirmar que não substitui integração, persistência ou resultado real.');
    check('RAW_HTML', 'medium', /\b(?:dangerouslySetInnerHTML|innerHTML)\b/gu, 'HTML cru exige inspeção de origem, contexto e sanitização; uso legítimo é possível.');
    check('PENDING_WORK', 'info', /\b(?:TODO|FIXME|HACK)\b/gu, 'Pendência explícita encontrada; avaliar impacto no escopo da entrega.');
    if (content.split('\n').length > 450) add('LARGE_MODULE', 'info', relative, null, 'Arquivo extenso: avaliar responsabilidades; tamanho sozinho não é defeito.');
  }

  const hasNodeDependencies = manifests.some(manifest => manifest.dependencyCount > 0);
  if (hasNodeDependencies && !files.some(file => /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/u.test(file))) {
    add('LOCKFILE_MISSING', 'medium', '.', null, 'Nenhum lockfile Node reconhecido; verificar gerenciador e política do repositório.');
  }
  const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.file.localeCompare(b.file, 'en') || (a.line ?? 0) - (b.line ?? 0));
  return {
    schemaVersion: 1,
    scope: 'selected-source-and-config-only',
    root: printable(root),
    complete: !limited && !truncatedFindings && excluded.unreadable === 0 && excluded.oversizedText === 0 && excluded.symlinks === 0,
    filesInventoried: files.length, filesScanned: scanned, excluded,
    limits: { maxFiles, maxBytesPerTextFile: maxBytes, maxFindings, fileLimitReached: limited, findingsTruncated: truncatedFindings },
    manifests, findings,
    notice: 'Sinais estáticos não confirmados. Não executa o projeto, testes, scanner completo de segredos, auditoria de segurança, acessibilidade ou avaliação visual. Ausência de achados não é aprovação.',
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage); return; }
  const report = await audit(options.root);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Inspeção estática: ${report.filesScanned} arquivos de texto; ${report.findings.length} sinais para investigação.`);
    for (const item of report.findings) console.log(`[${item.severity}] ${item.file}${item.line ? ':' + item.line : ''} ${item.code}: ${item.message}`);
    if (!report.complete) console.log('Escopo selecionado incompleto: consultar exclusões e limites no relatório JSON.');
    console.log(report.notice);
  }
  if (options.strict && report.findings.some(item => ['high', 'critical'].includes(item.severity))) process.exitCode = 1;
}

main().catch(error => {
  // Mensagens do filesystem podem conter nomes, mas nunca conteúdo dos arquivos.
  console.error(`${printable(error.message)}\n${usage}`);
  process.exitCode = 2;
});
