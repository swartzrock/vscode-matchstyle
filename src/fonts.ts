import type vscode from 'vscode';

type Font = {
  fontFamily: string,
  fontSize: number,
  fontWeight: string
};

const HEBREW_FONT: Font = {fontFamily: 'Noto Serif Hebrew', fontSize: 32, fontWeight: '500'};
const FONT_FAMILY = /^(?:"[\p{L}\p{N} _-]+"|'[\p{L}\p{N} _-]+'|[\p{L}\p{N}_-][\p{L}\p{N} _-]*)(?: *, *(?:"[\p{L}\p{N} _-]+"|'[\p{L}\p{N} _-]+'|[\p{L}\p{N}_-][\p{L}\p{N} _-]*))*$/u;

const fontDecoration = ( value: unknown ): vscode.DecorationRenderOptions => {
  const font = typeof value === 'object' && value !== null ? value as Partial<Font> : {};
  const fontFamily = typeof font.fontFamily === 'string' && FONT_FAMILY.exec ( font.fontFamily )?.[0] === font.fontFamily ? font.fontFamily : HEBREW_FONT.fontFamily;
  const fontSize = typeof font.fontSize === 'number' && Number.isFinite ( font.fontSize ) && font.fontSize >= 6 && font.fontSize <= 100 ? font.fontSize : HEBREW_FONT.fontSize;
  const fontWeight = typeof font.fontWeight === 'string' && /^(normal|bold|[1-9]00)$/.exec ( font.fontWeight )?.[0] === font.fontWeight ? font.fontWeight : HEBREW_FONT.fontWeight;

  return {
    rangeBehavior: 3,
    fontStyle: 'normal',
    fontWeight,
    // Existing text has no public per-range font family/size API. Validate every
    // value above before using this experimental CSS decoration workaround.
    textDecoration: `none; font-family: ${fontFamily} !important; font-size: ${fontSize}px !important`,
    // Ask the editor to remeasure glyph widths for cursor hit testing.
    letterSpacing: 'normal'
  };
};

const hebrewRuns = ( text: string ): {start: number, end: number}[] => {
  const runs = [];
  // VS Code isolates RTL spans. Keep connecting spaces in the same span so
  // Hebrew words are reordered together instead of independently.
  for ( const match of text.matchAll ( /[\u0590-\u05FF\uFB1D-\uFB4F]+(?:[ \t]+[\u0590-\u05FF\uFB1D-\uFB4F]+)*/g ) ) {
    runs.push ({
      start: match.index,
      end: match.index + match[0].length
    });
  }
  return runs;
};

export {fontDecoration, hebrewRuns};
