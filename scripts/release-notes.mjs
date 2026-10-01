import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const changelog = readFileSync('CHANGELOG.md', 'utf8').replace(/\r\n/g, '\n');
const section = changelog.split(/^## /m).find(entry => entry.startsWith(`${version}\n`));
const notes = section?.split('\n').slice(1).join('\n').trim();

if (!notes) {
  throw new Error(`Missing or empty CHANGELOG.md entry for ${version}`);
}

process.stdout.write(`${notes}\n`);
