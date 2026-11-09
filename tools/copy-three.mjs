import { cp, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const project = process.cwd();
const source = path.join(project, 'node_modules/three');
const target = path.join(project, 'web/static/vendor/three');
await mkdir(path.join(target, 'build'), { recursive: true });
await copyFile(path.join(source, 'build/three.module.js'), path.join(target, 'build/three.module.js'));
await copyFile(path.join(source, 'build/three.core.js'), path.join(target, 'build/three.core.js'));
await copyFile(path.join(source, 'LICENSE'), path.join(target, 'LICENSE'));
await cp(path.join(source, 'examples/jsm'), path.join(target, 'examples/jsm'), { recursive: true, force: true });
console.log('Three.js local copiado para web/static/vendor/three');
