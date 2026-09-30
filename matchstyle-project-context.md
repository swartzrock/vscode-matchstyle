# MatchStyle — Project Context

Last checked: September 30, 2026. This is a short, descriptive reference for product, documentation, and engineering work. Check the current code before treating a detail here as a release guarantee.

## At a glance

MatchStyle is an unpublished VS Code extension that changes the appearance of text matching user-defined regular expressions in the source editor. A rule can set an installed font family, font size, font weight, and hex text color. Text outside a match keeps its normal editor styling; the extension does not change file contents.

The original use case was making Hebrew text easier to read within otherwise Latin-script files. The product is language-neutral: users supply the regex and font for Hebrew, Korean, or any other text. Other useful applications include sizing Markdown headings, coloring TODO markers and log levels, distinguishing inline code, and highlighting template placeholders.

## Product identity and positioning

- Name and extension ID: **MatchStyle** / `jasonswartz.matchstyle`.
- Repository: <https://github.com/swartzrock/vscode-matchstyle>.
- Current package version: `0.1.0`; minimum declared VS Code version: `1.87.0`.
- License: MIT.
- Distribution status: not yet published to the VS Code Extensions Marketplace. The README describes local VSIX installation.

MatchStyle's focus is per-match **typography**, especially font family and size, in a small settings-based tool. Regex highlighting is an established extension category, so do not describe MatchStyle as the first extension to style regex matches. Avoid claims of unique font support without a current, broader competitor check.

## Core workflow

1. Install the VSIX and any fonts the rules will use.
2. Add `"matchStyle.enabled": true` and a `"matchStyle.rules"` array to VS Code settings. Both defaults are off/empty, so installation alone changes nothing.
3. Give each rule a JavaScript regex `pattern` without `/` delimiters and any of `fontFamily`, `fontSize`, `fontWeight`, or `color`. Double backslashes when writing patterns in JSON.
4. Optionally set `regexFlags` (`i`, `m`, `s`, `u`; `g` is automatic). Unicode mode is the default when this key is omitted; a supplied value replaces that default. Settings may be scoped to a language, such as `[markdown]`.
5. Edit a document normally. MatchStyle updates visible editors after changes and setting updates. Set `matchStyle.enabled` to `false` to turn it off.

Rules style the **entire regex match**, including punctuation and spaces included by the pattern. Earlier rules take priority; a later match that overlaps an earlier one is skipped. Rules run on source text, including Markdown code fences. Markdown preview renders separately and is not styled by MatchStyle. A language-specific rule array replaces the broader array rather than combining with it.

The supported sizes are 6–100 pixels. Weight accepts `normal`, `bold`, or hundreds from `100` to `900`. Color accepts CSS hex values. Leaving a property out preserves the corresponding editor styling. Larger fonts may need a higher `editor.lineHeight` to avoid clipping.

## Implementation and boundaries

- [`package.json`](./package.json) defines extension metadata, settings, and build commands.
- [`src/index.ts`](./src/index.ts) handles activation, visible-editor events, configuration changes, decorations, and warnings.
- [`src/matches.ts`](./src/matches.ts) starts cancellable matching work after a short typing pause. A scan is stopped after one second so a slow regex does not hold up the extension host.
- [`src/matcher.ts`](./src/matcher.ts) validates patterns and flags, finds matches, and enforces rule priority in a worker thread.
- [`src/fonts.ts`](./src/fonts.ts) validates style values and builds VS Code editor decorations.

Font family and size use an **experimental CSS decoration workaround** because the declared VS Code extension API has no public per-range font family or size property. This behavior should be checked in supported VS Code versions and themes before making broad compatibility claims. MatchStyle does not install fonts, alter syntax grammars, or edit the user's document.

## Development and release

The repository uses TypeScript, esbuild, and Node's built-in test runner. `npm run compile` checks types; `npm test` runs the extension behavior tests; `npm run package` builds a VSIX. The README asks for Node.js 22 or later when building from source. [`tests/fonts.test.cjs`](./tests/fonts.test.cjs) covers matching, styling, configuration, cancellation, and timeouts. Follow the current build and Marketplace requirements before publishing; the package version and release metadata here describe the working tree, not an approved release.

Use [`README.md`](./README.md) for the short installation and settings guide, [`EXAMPLES.md`](./EXAMPLES.md) for copyable use cases, and the source files above for actual behavior. Keep future documentation clear that users control the patterns and that examples are illustrative rather than built-in language rules.
