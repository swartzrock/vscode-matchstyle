import type vscode from 'vscode';

const FONT_NAME = /^(?:"[\p{L}\p{N} _-]+"|'[\p{L}\p{N} _-]+'|[\p{L}\p{N}_-][\p{L}\p{N} _-]*)$/u;

const fontDecoration = (value: unknown): vscode.DecorationRenderOptions => {
  const font = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const css = [];
  if (
    typeof font.fontFamily === 'string' &&
    font.fontFamily.split(',').every(name => {
      const family = name.trim();
      return !/[^\S ]/u.test(name) && FONT_NAME.exec(family)?.[0] === family;
    })
  ) {
    css.push(`font-family: ${font.fontFamily} !important`);
  }
  if (
    typeof font.fontSize === 'number' &&
    Number.isFinite(font.fontSize) &&
    font.fontSize >= 6 &&
    font.fontSize <= 100
  ) {
    css.push(`font-size: ${font.fontSize}px !important`);
  }

  const options: vscode.DecorationRenderOptions = { rangeBehavior: 3 };
  if (
    typeof font.color === 'string' &&
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(font.color)?.[0] === font.color
  ) {
    options.color = font.color;
  }
  if (typeof font.fontWeight === 'string' && /^(normal|bold|[1-9]00)$/.exec(font.fontWeight)?.[0] === font.fontWeight) {
    options.fontWeight = font.fontWeight;
  }
  // Existing text has no public per-range font family/size API. Validate every
  // value above before using this experimental CSS decoration workaround.
  if (css.length) options.textDecoration = `none; ${css.join('; ')}`;
  // Ask the editor to remeasure glyph widths when a font changes.
  if (css.length || options.fontWeight) options.letterSpacing = 'normal';
  return options;
};

export { fontDecoration };
