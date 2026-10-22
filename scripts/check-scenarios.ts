import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const scenarioFile = 'docs/v1/03-test-scenarios.md';
const NAME = /^[a-z0-9][a-z0-9.-]+$/;

const documented = new Set<string>();
for (const line of readFileSync(scenarioFile, 'utf8').split('\n')) {
  if (!line.startsWith('|')) continue;
  const first = line.split('|')[1]?.trim() ?? '';
  if (NAME.test(first) && first !== 'test') documented.add(first);
}

function testFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return testFiles(path);
    return path.endsWith('.test.ts') ? [path] : [];
  });
}

const coded: string[] = [];
for (const file of testFiles('frontend/src')) {
  for (const match of readFileSync(file, 'utf8').matchAll(/\bit\('([^']+)'/g)) {
    coded.push(match[1] as string);
  }
}

const codedSet = new Set(coded);
const missing = [...documented].filter((name) => !codedSet.has(name));
const extra = [...codedSet].filter((name) => !documented.has(name));
const duplicates = coded.filter((name, index) => coded.indexOf(name) !== index);

console.log(`scenarios in ${scenarioFile}: ${documented.size}, tests in src: ${coded.length}`);
if (missing.length) console.log('missing in code:', missing.join(', '));
if (extra.length) console.log('not in the scenarios:', extra.join(', '));
if (duplicates.length) console.log('duplicate test names:', duplicates.join(', '));

process.exit(missing.length || extra.length || duplicates.length ? 1 : 0);
