// What this site and the Koma bot (../Koma) share, kept the same: `node scripts/sync.mjs` (`yarn sync`)
//
//   - the sim's version (src/technomagic/sim/version.ts: a hash of the sim, ./sim-version.mjs);
//   - the sim (src/technomagic/sim/bot.ts and all it uses, nothing drawn), built into one file for the bot, with its
//     types beside it: the bot's vendor/technomagic-sim.mjs;
//   - what the bot and the pages say to each other (the bot's src/protocol/), copied into src/protocol/.
//
// Run it whenever either changes, then deploy both. With --check it writes nothing, and fails if anything is out of
// date (`yarn build` does that first): without ../Koma (a build on Vercel), only the sim's version is checked.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { build } from 'vite';
import { simVersion, VERSION_FILE, versionSource } from './sim-version.mjs';

const check = process.argv.includes('--check');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bot = resolve(root, '../Koma');
const simDir = resolve(root, 'src/technomagic/sim');
const vendor = resolve(bot, 'vendor');
const shared = { from: resolve(bot, 'src/protocol'), to: resolve(root, 'src/protocol') };

/** What is out of date (checking), or was written. */
const stale = [];
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8').replaceAll('\r\n', '\n') : null);
/** Writes `text` to `file` if it isn't there already (checking: says it is out of date instead). */
function put(file, text) {
  if (read(file) === text) return;
  stale.push(file);
  if (check) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

// The sim's version.
const version = simVersion(simDir);
put(resolve(simDir, VERSION_FILE), versionSource(version));

if (existsSync(resolve(bot, 'package.json'))) {
  // What the bot and the pages say to each other: each of its files, its imports without their `.js` (as this site has
  // them); and none it hasn't.
  const banner = "// Copied from the bot's src/protocol/ by scripts/sync.mjs: change it there, then `yarn sync`.\n";
  const files = readdirSync(shared.from).filter((file) => file.endsWith('.ts'));
  for (const file of files) put(resolve(shared.to, file), banner + read(resolve(shared.from, file)).replace(/(from '\.\/[\w-]+)\.js'/g, "$1'"));
  for (const file of existsSync(shared.to) ? readdirSync(shared.to) : []) {
    if (files.includes(file)) continue;
    stale.push(resolve(shared.to, file));
    if (!check) rmSync(resolve(shared.to, file));
  }

  // The sim, for the bot: checking, only that the bot's is this version (building it takes a while).
  const out = resolve(vendor, 'technomagic-sim.mjs');
  if (check) {
    const theirs = existsSync(out) ? (await import(pathToFileURL(out).href)).SIM_VERSION : null;
    if (theirs !== version) stale.push(out);
  } else await buildSim();
}

async function buildSim() {
  const entry = resolve(simDir, 'bot.ts');
  const bundled = await build({
    root,
    configFile: false,
    logLevel: 'warn',
    build: { write: false, minify: false, target: 'es2022', lib: { entry, formats: ['es'], fileName: () => 'technomagic-sim.mjs' } },
  });
  const output = (Array.isArray(bundled) ? bundled[0] : bundled).output;
  const chunk = output.find((file) => file.type === 'chunk' && file.isEntry);
  if (!chunk || output.filter((file) => file.type === 'chunk').length !== 1) throw new Error('Expected the sim as one file');
  // Nothing but the sim: whatever changes the fight is in its folder (so its version says when it changes), and nothing draws.
  const outside = chunk.moduleIds.filter((id) => !resolve(id).startsWith(simDir));
  if (outside.length > 0) throw new Error(`The sim must use nothing outside src/technomagic/sim/: ${outside.join(', ')}`);

  const banner = "// Built from Koma-UI's src/technomagic/sim/ by its scripts/sync.mjs: don't edit it here.\n";
  const types = ts.transpileDeclaration(readFileSync(entry, 'utf8'), {
    fileName: entry,
    compilerOptions: { declaration: true, isolatedDeclarations: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  if (types.diagnostics?.length) throw new Error(ts.formatDiagnostics(types.diagnostics, { getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
  const declarations = types.outputText.replace(/^import .*\n/gm, '');
  if (/\bimport\b/.test(declarations)) throw new Error('The sim’s types for the bot must name nothing outside bot.ts');
  put(resolve(vendor, 'technomagic-sim.mjs'), banner + chunk.code);
  put(resolve(vendor, 'technomagic-sim.d.mts'), banner + declarations);
}

const shown = (file) => file.replace(`${resolve(root, '..')}\\`, '').replace(`${resolve(root, '..')}/`, '').replaceAll('\\', '/');
if (check && stale.length > 0) {
  console.error(`Out of date (run \`yarn sync\`):\n${stale.map((file) => `  ${shown(file)}`).join('\n')}`);
  process.exit(1);
}
console.log(check ? `In sync (sim ${version}).` : stale.length > 0 ? `Wrote (sim ${version}):\n${stale.map((file) => `  ${shown(file)}`).join('\n')}` : `Nothing to write (sim ${version}).`);
