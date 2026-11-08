import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const init = fileURLToPath(new URL('../iniciar-projeto.mjs', import.meta.url));
const audit = fileURLToPath(new URL('../revisar-projeto.mjs', import.meta.url));
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
function fixture(fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'desenvolver-web-'));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
function scan(root, args = []) {
  const result = run(audit, [root, '--json', ...args]);
  return { ...result, report: JSON.parse(result.stdout) };
}

test('inicializador cria documentos preenchíveis e não cria Git ou dependências', () => fixture(root => {
  const result = run(init, ['--dest', root, '--name', 'Arquivo Seguro', '--kind', 'app']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(path.join(root, 'contexto.md'), 'utf8'), /Arquivo Seguro/u);
  assert.ok(existsSync(path.join(root, 'docs/design.md')));
  assert.ok(existsSync(path.join(root, 'product')));
  assert.equal(existsSync(path.join(root, '.git')), false);
  assert.equal(existsSync(path.join(root, 'package.json')), false);
  assert.equal(existsSync(path.join(root, 'product/server.py')), false);
}));

test('não sobrescreve documento existente e é repetível', () => fixture(root => {
  writeFileSync(path.join(root, 'contexto.md'), 'Conteúdo da pessoa');
  for (let index = 0; index < 2; index += 1) {
    const result = run(init, ['--dest', root]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(JSON.parse(result.stdout).skipped.includes('contexto.md'));
  }
  assert.equal(readFileSync(path.join(root, 'contexto.md'), 'utf8'), 'Conteúdo da pessoa');
}));

test('dry-run não cria destino', () => fixture(root => {
  const dest = path.join(root, 'ausente');
  const result = run(init, ['--dest', dest, '--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(dest), false);
}));

test('API recebe contrato em vez de documento visual', () => fixture(root => {
  const result = run(init, ['--dest', root, '--kind', 'api']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(path.join(root, 'docs/api.md')));
  assert.equal(existsSync(path.join(root, 'docs/design.md')), false);
}));

test('argumentos inválidos falham antes de escrever', () => fixture(root => {
  assert.equal(run(init, ['--dest', root, '--kind', 'desconhecido']).status, 2);
  assert.equal(existsSync(path.join(root, 'contexto.md')), false);
  assert.equal(run(init, ['--dest']).status, 2);
  assert.equal(run(audit, [root, '--force']).status, 2);
}));

test('não segue symlink de destino nem altera o alvo', t => fixture(root => {
  const other = path.join(root, 'outro');
  const dest = path.join(root, 'projeto');
  mkdirSync(other); mkdirSync(dest);
  const target = path.join(other, 'contexto.md');
  writeFileSync(target, 'Preservar');
  try { symlinkSync(target, path.join(dest, 'contexto.md')); }
  catch (error) { if (error.code === 'EPERM') { t.skip('Ambiente sem permissão de symlink'); return; } throw error; }
  assert.equal(run(init, ['--dest', dest]).status, 2);
  assert.equal(readFileSync(target, 'utf8'), 'Preservar');
  assert.equal(existsSync(path.join(dest, 'docs')), false);
}));

test('revisor identifica links e handlers vazios, incluindo quebra de linha', () => fixture(root => {
  mkdirSync(path.join(root, 'product'));
  writeFileSync(path.join(root, 'product/index.tsx'), '<a\n href="#">Abrir</a>\n<button onClick={() => {}}>Salvar</button>');
  const { status, report } = scan(root);
  assert.equal(status, 0);
  assert.ok(report.findings.some(item => item.code === 'EMPTY_LINK' && item.line === 2));
  assert.ok(report.findings.some(item => item.code === 'EMPTY_HANDLER'));
}));

test('links válidos e funções com efeito não são marcados como vazios', () => fixture(root => {
  writeFileSync(path.join(root, 'index.tsx'), '<a href="#detalhes">Ver</a><a href="/conta">Conta</a><button onClick={() => { save(); }}>Salvar</button>');
  const { report } = scan(root);
  assert.equal(report.findings.some(item => ['EMPTY_LINK', 'EMPTY_HANDLER'].includes(item.code)), false);
}));

test('revisor não trata exemplos documentais e testes como produto', () => fixture(root => {
  mkdirSync(path.join(root, 'docs'));
  mkdirSync(path.join(root, 'tests'));
  writeFileSync(path.join(root, 'docs/exemplo.html'), '<a href="#">Exemplo</a>');
  writeFileSync(path.join(root, 'tests/fixture.tsx'), '<a href="#">Fixture</a>');
  const { report } = scan(root);
  assert.equal(report.findings.some(item => item.code === 'EMPTY_LINK'), false);
}));

test('revisor não revela segredo nem lê .env real e nunca altera arquivos', () => fixture(root => {
  const secret = 'VALOR_PRIVADO_QUE_NAO_PODE_APARECER';
  const source = `const NEXT_PUBLIC_PRIVATE_KEY = '${secret}';`;
  writeFileSync(path.join(root, 'app.ts'), source);
  writeFileSync(path.join(root, '.env'), `SECRET=${secret}`);
  const { report, stdout } = scan(root);
  assert.equal(stdout.includes(secret), false);
  assert.equal(report.excluded.environmentFiles, 1);
  assert.ok(report.findings.some(item => item.code === 'PUBLIC_SECRET_NAME'));
  assert.equal(readFileSync(path.join(root, 'app.ts'), 'utf8'), source);
}));

test('modo estrito distingue sinal alto de aviso e erro de uso', () => fixture(root => {
  writeFileSync(path.join(root, 'app.ts'), 'const PUBLIC_PASSWORD = "exemplo";');
  assert.equal(scan(root, ['--strict']).status, 1);
  writeFileSync(path.join(root, 'app.ts'), 'const name = "válido";');
  assert.equal(scan(root, ['--strict']).status, 0);
  assert.equal(run(audit, [path.join(root, 'ausente')]).status, 2);
}));

test('arquivo grande sinaliza escopo incompleto', () => fixture(root => {
  writeFileSync(path.join(root, 'app.ts'), ' '.repeat(1024 * 1024 + 1));
  const { report } = scan(root);
  assert.equal(report.complete, false);
  assert.equal(report.excluded.oversizedText, 1);
}));

test('revisor ignora symlinks sem vazar conteúdo externo', t => fixture(root => {
  const outside = path.join(root, 'externo');
  const project = path.join(root, 'projeto');
  mkdirSync(outside); mkdirSync(project);
  writeFileSync(path.join(outside, 'private.ts'), 'const PUBLIC_PASSWORD = "nunca-ler";');
  try { symlinkSync(outside, path.join(project, 'atalho'), 'dir'); }
  catch (error) { if (error.code === 'EPERM') { t.skip('Ambiente sem permissão de symlink'); return; } throw error; }
  const { report } = scan(project);
  assert.equal(report.excluded.symlinks, 1);
  assert.equal(report.complete, false);
  assert.equal(report.findings.some(item => item.code === 'PUBLIC_SECRET_NAME'), false);
}));

test('CLI de ajuda termina sem exigir destino', () => {
  assert.match(execFileSync(process.execPath, [init, '--help'], { encoding: 'utf8' }), /Uso:/u);
  assert.match(execFileSync(process.execPath, [audit, '--help'], { encoding: 'utf8' }), /Uso:/u);
});

test('projeto sem dependências não recebe aviso artificial de lockfile', () => fixture(root => {
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module', scripts: { test: 'node --test' } }));
  const { report } = scan(root);
  assert.equal(report.findings.some(item => item.code === 'LOCKFILE_MISSING'), false);
}));

test('dependências sem lockfile são sinalizadas e lockfile existente é reconhecido', () => fixture(root => {
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { example: '1.0.0' } }));
  assert.ok(scan(root).report.findings.some(item => item.code === 'LOCKFILE_MISSING'));
  writeFileSync(path.join(root, 'yarn.lock'), '# Fixture de inventário');
  assert.equal(scan(root).report.findings.some(item => item.code === 'LOCKFILE_MISSING'), false);
}));
