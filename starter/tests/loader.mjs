import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Unit tests exercise game rules without a browser or audio device.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'phaser') return { url: new URL('./engine-stub.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier.endsWith('/AudioBus')) return {
    url: 'data:text/javascript,export const audioBus={play(){},setMusic(){},setPaused(){}};', shortCircuit: true,
  };
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) specifier += '.ts';
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) return {
    format: 'module', shortCircuit: true,
    source: ts.transpileModule(await readFile(new URL(url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText,
  };
  if (url.endsWith('.json')) return { format: 'module', shortCircuit: true, source: `export default ${await readFile(new URL(url), 'utf8')};` };
  return nextLoad(url, context);
}
