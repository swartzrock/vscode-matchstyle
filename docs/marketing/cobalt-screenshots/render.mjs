import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../../..');
const here = import.meta.dirname;
const asset = (path) => `data:image/${path.endsWith('.jpg') ? 'jpeg' : 'png'};base64,${readFileSync(join(root, path)).toString('base64')}`;
const local = (path) => `data:image/png;base64,${readFileSync(join(here, path)).toString('base64')}`;
const shots = {
  markers: { href: asset('public/images/action-markers.jpg'), width: 586, height: 196 },
  language: { href: asset('public/images/multilingual-text.jpg'), width: 505, height: 121 },
  logs: { href: asset('public/images/scannable-logs.jpg'), width: 651, height: 229 },
  headings: { href: asset('public/images/headings-by-level.jpg'), width: 391, height: 276 },
};
const icon = asset('icon.png');
const backgrounds = {
  landscape: local('backgrounds/cobalt-landscape.png'),
  portrait: local('backgrounds/cobalt-portrait.png'),
};
const fonts = {
  display: join(here, 'fonts/Anton-Regular.ttf'),
  body: join(here, 'fonts/Inter-Variable.ttf'),
};

const textCache = new Map();
function textImage(value, size, color, font = 'body', kerning = 0) {
  const key = JSON.stringify([value, size, color, font, kerning]);
  if (!textCache.has(key)) {
    const png = execFileSync('magick', ['-background', 'none', '-fill', color, '-font', fonts[font], '-pointsize', String(size), '-kerning', String(kerning), `label:${value}`, '-trim', '+repage', 'PNG:-']);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    textCache.set(key, { href: `data:image/png;base64,${png.toString('base64')}`, width, height });
  }
  return textCache.get(key);
}
function text(value, x, top, size, color = '#fff', font = 'body', kerning = 0) {
  const image = textImage(value, size, color, font, kerning);
  return `<image href="${image.href}" x="${x}" y="${top}" width="${image.width}" height="${image.height}"/>`;
}
function headline(lines, x, y, size, leading = 0.92) {
  return `<g filter="url(#typeShadow)">${lines.map((line, i) => text(line, x, y - size * .77 + i * size * leading, size, '#fff', 'display', -2)).join('')}</g>`;
}
function support(lines, x, y, size, leading = 1.22) {
  return lines.map((line, i) => text(line, x, y - size * .8 + i * size * leading, size)).join('');
}
function card(key, x, y, width, height, label, rotation = 0) {
  const shot = shots[key];
  const pad = width > 900 ? 32 : 27;
  const maxWidth = width - 2 * pad;
  const maxHeight = height - (width > 900 ? 110 : 105);
  const scale = Math.min(maxWidth / shot.width, maxHeight / shot.height);
  const imageWidth = shot.width * scale;
  const imageHeight = shot.height * scale;
  const imageX = x + (width - imageWidth) / 2;
  const imageY = y + 77 + (maxHeight - imageHeight) / 2;
  const angle = rotation ? ` transform="rotate(${rotation} ${x + width / 2} ${y + height / 2})"` : '';
  return `<g${angle} filter="url(#panelShadow)"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="25" fill="#fff" stroke="#dfe3e8" stroke-width="2"/>${text(label, x + pad, y + 27, 19, '#54667c', 'body', 1)}<image href="${shot.href}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}"/></g>`;
}
function brand(portrait = false) {
  const x = portrait ? 58 : 59;
  const y = portrait ? 1440 : 885;
  const size = portrait ? 66 : 67;
  return `<image href="${icon}" x="${x}" y="${y}" width="${size}" height="${size}"/>${text('MatchStyle', x + size + 17, y + 3, portrait ? 55 : 58, '#fff', 'body', -2)}${text('FOR VS CODE', x + size + 20, y + 62, portrait ? 20 : 22, '#9cdcf5', 'body', 4)}`;
}
function image(name, orientation, body) {
  const portrait = orientation === 'portrait';
  const width = portrait ? 900 : 1536;
  const height = portrait ? 1600 : 1024;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="panelShadow" x="-25%" y="-35%" width="150%" height="180%"><feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#001b5b" flood-opacity=".37"/></filter><filter id="typeShadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="1" dy="4" stdDeviation="4" flood-color="#001445" flood-opacity=".5"/></filter></defs><image href="${backgrounds[orientation]}" x="0" y="0" width="${width}" height="${height}"/>${body}${brand(portrait)}</svg>`;
  const output = join(here, orientation, `${name}.png`);
  const source = join(here, orientation, `${name}.svg`);
  writeFileSync(source, svg);
  execFileSync('rsvg-convert', ['--output', output, source]);
}

image('01-spot-action-items', 'landscape',
  headline(['SPOT ACTION', 'ITEMS FAST'], 60, 185, 126) +
  support(['Give TODO, FIXME,', 'and HACK distinct colors.'], 66, 505, 47) +
  `<rect x="740" y="271" width="728" height="331" rx="30" fill="#6cbaff" opacity=".55" transform="rotate(-8 1104 436)"/>` +
  card('markers', 680, 230, 805, 345, 'EDITOR EXAMPLE  /  ACTION MARKERS', -8));

image('02-read-multilingual-text', 'landscape',
  `<rect x="99" y="266" width="735" height="279" rx="28" fill="#6cbaff" opacity=".46"/>` +
  card('language', 53, 218, 742, 272, 'EDITOR EXAMPLE  /  MULTILINGUAL TEXT') +
  headline(['MAKE TEXT', 'LEGIBLE IN', 'YOUR FONT'], 850, 216, 103) +
  support(['Choose an installed font', 'and size for matched text.'], 856, 485, 39));

image('03-scan-log-severity', 'landscape',
  headline(['SEE SEVERITY AT A GLANCE'], 57, 168, 119) +
  support(['Color INFO, WARN, ERROR, and FATAL labels in the editor.'], 64, 232, 42) +
  card('logs', 90, 309, 1355, 512, 'EDITOR EXAMPLE  /  SCANNABLE LOGS'));

image('04-size-headings-by-level', 'landscape',
  headline(['SIZE HEADINGS', 'BY LEVEL'], 63, 217, 115) +
  support(['Set separate sizes for H1, H2,', 'and H3 as you write.'], 69, 538, 44) +
  card('headings', 828, 171, 605, 575, 'EDITOR EXAMPLE  /  MARKDOWN'));

image('01-spot-action-items', 'portrait',
  headline(['SPOT ACTION', 'ITEMS FAST'], 57, 217, 130) +
  support(['Give TODO, FIXME, and HACK', 'their own colors.'], 63, 433, 44) +
  `<rect x="93" y="755" width="775" height="373" rx="30" fill="#6cbaff" opacity=".55" transform="rotate(-7 480 941)"/>` +
  card('markers', 47, 697, 814, 381, 'EDITOR EXAMPLE  /  ACTION MARKERS', -7));

image('02-read-multilingual-text', 'portrait',
  headline(['MAKE TEXT', 'LEGIBLE IN', 'YOUR FONT'], 55, 205, 112) +
  support(['Apply an installed font and size', 'to the text your regex matches.'], 61, 525, 40) +
  `<rect x="96" y="787" width="770" height="294" rx="28" fill="#6cbaff" opacity=".46"/>` +
  card('language', 45, 732, 800, 294, 'EDITOR EXAMPLE  /  MULTILINGUAL TEXT'));

image('03-scan-log-severity', 'portrait',
  headline(['SEE LOG', 'SEVERITY'], 55, 205, 133) +
  support(['Color INFO, WARN, ERROR,', 'and FATAL labels in the editor.'], 62, 424, 42) +
  card('logs', 42, 680, 816, 392, 'EDITOR EXAMPLE  /  SCANNABLE LOGS'));

image('04-size-headings-by-level', 'portrait',
  headline(['SIZE HEADINGS', 'BY LEVEL'], 56, 215, 116) +
  support(['Set separate sizes for H1, H2,', 'and H3 as you write.'], 63, 425, 43) +
  card('headings', 112, 641, 676, 618, 'EDITOR EXAMPLE  /  MARKDOWN'));
