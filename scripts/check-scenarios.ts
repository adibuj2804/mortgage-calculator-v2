import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const scenarioFiles = ['docs/v1/03-test-scenarios.md', 'docs/v2/03-test-scenarios.md'];
const NAME = /^[a-z0-9][a-z0-9.-]+$/;
const NOT_SCENARIOS = new Set(['python-is-3-12-or-newer']);

// A scenario name and the name of its test are compared by this key: `-` and `.` become `_`.
const key = (name: string) => name.replace(/[^a-z0-9]+/g, '_');

const documented = new Map<string, string>();
for (const file of scenarioFiles) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const first = line.split('|')[1]?.trim() ?? '';
    if (NAME.test(first) && first !== 'test') documented.set(key(first), first);
  }
}

function files(dir: string, suffix: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (entry === 'node_modules' || entry === '.venv' || entry.startsWith('.')) return [];
    if (statSync(path).isDirectory()) return files(path, suffix);
    return path.endsWith(suffix) ? [path] : [];
  });
}

const coded: string[] = [];
for (const file of files('frontend/src', '.test.ts')) {
  for (const match of readFileSync(file, 'utf8').matchAll(/\bit\('([^']+)'/g)) {
    coded.push(key(match[1] as string));
  }
}
for (const file of files('backend/tests', '.py')) {
  for (const match of readFileSync(file, 'utf8').matchAll(/^(?:async )?def test_(\w+)\(/gm)) {
    const name = key(match[1] as string);
    if (!NOT_SCENARIOS.has(name.replace(/_/g, '-'))) coded.push(name);
  }
}

const codedSet = new Set(coded);
const missing = [...documented.keys()].filter((name) => !codedSet.has(name));
const extra = [...codedSet].filter((name) => !documented.has(name));
const duplicates = [...new Set(coded.filter((name, index) => coded.indexOf(name) !== index))];

console.log(`scenarios documented: ${documented.size}, tests in code: ${coded.length}`);
if (missing.length) console.log(`missing in code (${missing.length}):`, missing.join(', '));
if (extra.length) console.log(`not in the scenarios (${extra.length}):`, extra.join(', '));
if (duplicates.length)
  console.log(`duplicate test names (${duplicates.length}):`, duplicates.join(', '));

process.exit(missing.length || extra.length || duplicates.length ? 1 : 0);
