#!/usr/bin/env node
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const templates = fileURLToPath(new URL('../assets/templates/', import.meta.url));
const usage = 'Uso: node iniciar-projeto.mjs --dest CAMINHO [--name NOME] [--kind landing|app|api] [--dry-run]';

function parseArgs(args) {
  const options = { kind: 'app', name: 'Novo produto', dryRun: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') return { help: true };
    if (arg === '--dry-run') { options.dryRun = true; continue; }
    if (!['--dest', '--name', '--kind'].includes(arg)) throw new Error(`Opção desconhecida: ${arg}`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Falta valor para ${arg}`);
    options[arg.slice(2)] = value;
  }
  if (!options.dest) throw new Error('--dest é obrigatório');
  if (!['landing', 'app', 'api'].includes(options.kind)) throw new Error('--kind deve ser landing, app ou api');
  if (/[\r\n\u0000]/u.test(options.name)) throw new Error('O nome deve ocupar uma linha');
  options.dest = path.resolve(options.dest);
  return options;
}

async function statOrMissing(target) {
  try { return await lstat(target); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function checkDirectories(target) {
  const root = path.parse(target).root;
  let current = root;
  for (const segment of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stat = await statOrMissing(current);
    if (!stat) continue;
    if (stat.isSymbolicLink()) throw new Error(`Destino contém link simbólico: ${current}`);
    if (!stat.isDirectory()) throw new Error(`O caminho não é diretório: ${current}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage); return; }
  const outputs = [
    ['contexto.md', 'contexto.md'],
    ['AGENTS.md', 'AGENTS.md'],
    ['produto.md', 'docs/produto.md'],
    ['arquitetura.md', 'docs/arquitetura.md'],
    ['verificacao.md', 'docs/verificacao.md'],
    ['operacao.md', 'docs/operacao.md'],
  ];
  outputs.push(options.kind === 'api' ? ['api.md', 'docs/api.md'] : ['design.md', 'docs/design.md']);
  await checkDirectories(options.dest);
  await checkDirectories(path.join(options.dest, 'docs'));
  await checkDirectories(path.join(options.dest, 'product'));

  // Preflight de todos os alvos antes de gravar qualquer documento.
  const plan = [];
  for (const [template, relative] of outputs) {
    const target = path.join(options.dest, relative);
    const stat = await statOrMissing(target);
    if (stat?.isSymbolicLink() || (stat && !stat.isFile())) throw new Error(`Alvo não é arquivo regular: ${target}`);
    const source = await readFile(path.join(templates, template), 'utf8');
    const data = source.replaceAll('{{NOME}}', options.name)
      .replaceAll('{{TIPO}}', options.kind)
      .replaceAll('{{DATA}}', new Date().toISOString().slice(0, 10));
    plan.push({ target, relative, data, exists: Boolean(stat) });
  }

  if (!options.dryRun) {
    await mkdir(path.join(options.dest, 'docs'), { recursive: true });
    await mkdir(path.join(options.dest, 'product'), { recursive: true });
  }
  const created = [];
  const skipped = [];
  for (const item of plan) {
    if (item.exists) { skipped.push(item.relative); continue; }
    if (!options.dryRun) {
      // 'wx' protege arquivos criados por outra execução entre preflight e escrita.
      try { await writeFile(item.target, item.data, { flag: 'wx' }); }
      catch (error) {
        if (error.code === 'EEXIST') { skipped.push(item.relative); continue; }
        throw error;
      }
    }
    created.push(item.relative);
  }
  console.log(JSON.stringify({
    destination: options.dest, dryRun: options.dryRun,
    created, skipped,
    notice: 'Somente documentação inicial. Preencher e implementar antes de entregar. Nenhum Git, pacote, site ou serviço foi criado.',
  }, null, 2));
}

main().catch(error => {
  console.error(`${error.message}\n${usage}`);
  process.exitCode = 2;
});
