// Builds the TechnoMagic Raid's sim (src/technomagic/sim/verify.ts and all it uses, nothing drawn) into one
// file the bot plays raids over with, and its types beside it: `node scripts/build-sim.mjs [out dir]`, the
// bot's vendor/ (../Koma/vendor/) unless it says otherwise. Run it whenever the fight changes (and raise
// SIM_VERSION in verify.ts with anything that changes how a fight goes), then deploy both.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'src/technomagic/sim/bot.ts');
const out = resolve(process.argv[2] ?? resolve(root, '../Koma/vendor'));
const name = 'technomagic-sim';

const bundled = await build({
  root,
  configFile: false,
  logLevel: 'warn',
  build: {
    write: false,
    minify: false,
    target: 'es2022',
    lib: { entry, formats: ['es'], fileName: () => `${name}.mjs` },
    rollupOptions: {
      // Nothing that draws: three.js, or the page, have no business in it.
      external: (id) => {
        if (/^three(\/|$)/.test(id)) throw new Error(`The sim must not use three.js (${id})`);
        return false;
      },
    },
  },
});
const output = (Array.isArray(bundled) ? bundled[0] : bundled).output;
const chunk = output.find((file) => file.type === 'chunk' && file.isEntry);
if (!chunk || output.filter((file) => file.type === 'chunk').length !== 1) throw new Error('Expected the sim as one file');

const banner = `// Built from Koma-UI's src/technomagic/sim/ by scripts/build-sim.mjs: don't edit it here.\n`;
const types = ts.transpileDeclaration(readFileSync(entry, 'utf8'), { fileName: entry, compilerOptions: { declaration: true, isolatedDeclarations: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
if (types.diagnostics?.length) throw new Error(ts.formatDiagnostics(types.diagnostics, { getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
const declarations = types.outputText.replace(/^import .*\n/gm, '');
if (/\bimport\b/.test(declarations)) throw new Error('The sim’s types must name nothing outside verify.ts');

mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, `${name}.mjs`), banner + chunk.code);
writeFileSync(resolve(out, `${name}.d.mts`), banner + declarations);
console.log(`Wrote ${name}.mjs (${Math.round(chunk.code.length / 1024)} KB) and its types to ${out}`);
