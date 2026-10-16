// The sim's version: a hash of every file of it (src/technomagic/sim/, but the file it is written to), so that any
// change to the fight is a new version, and a page and the bot running two sims tell they are (a page then reloads).
// scripts/sync.mjs writes it to src/technomagic/sim/version.ts; the bot's tests read it from here, to check its copy.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** The file the version is written to: not counted. */
export const VERSION_FILE = 'version.ts';

/** The version of the sim in `dir` (its folder): twelve hex digits. Line endings don't count, nor the order files are found in. */
export function simVersion(dir) {
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(entry.parentPath, entry.name))
    .map((file) => relative(dir, file).replaceAll('\\', '/'))
    .filter((file) => file !== VERSION_FILE)
    .sort();
  const hash = createHash('sha256');
  for (const file of files) hash.update(`${file}\n${readFileSync(join(dir, file), 'utf8').replaceAll('\r\n', '\n')}\n`);
  return hash.digest('hex').slice(0, 12);
}

/** What version.ts holds for a version. */
export const versionSource = (version) => `// Made by scripts/sync.mjs from every other file here (a hash of them): don't edit it.\nexport const VERSION = '${version}';\n`;
