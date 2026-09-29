# MatchStyle

Choose a font family, size, and weight for Hebrew text in VS Code. Other text uses the normal editor font and syntax theme. MatchStyle is the new name and package ID for this local preview. Configurable regex matching is proposed for a later version; the current build matches Hebrew phrases.

## Settings

Install your chosen fonts on your computer, then add these settings in **Preferences: Open User Settings (JSON)**:

```json
"matchStyle.enabled": true,
"matchStyle.hebrew": {
  "fontFamily": "Noto Serif Hebrew",
  "fontSize": 32,
  "fontWeight": "500"
}
```

The feature is disabled by default. Hebrew letters, niqqud, cantillation, and presentation forms use the Hebrew font. Spaces and tabs between Hebrew words share that font to keep each phrase in one RTL span and preserve word order. Everything else, including English, numbers, punctuation, surrounding spaces, and emoji, keeps its normal editor styling. Line breaks are excluded. Settings apply to text editors in any file language and can be overridden per folder or language.

Sizes are in pixels, from 6 to 100. Font weights accept `normal`, `bold`, or `100` through `900`. Font stacks support quoted or unquoted family names. Missing fonts fall back according to the operating system; this extension does not install fonts.

Changes apply immediately. Set `matchStyle.enabled` to `false` to remove the styles. This extension has no commands, configurable regex rules, TODO highlighting, network requests, telemetry, or automatic settings changes.

## Migrating from the Highlight preview

MatchStyle uses a new extension ID, `jasonswartz.matchstyle`, so VS Code installs it separately from the old `jasonswartz.vscode-highlight2` preview. Disable or uninstall the old preview before enabling MatchStyle so both extensions do not style the same text.

Rename `highlight.fonts.enabled` to `matchStyle.enabled` and `highlight.fonts.hebrew` to `matchStyle.hebrew`, keeping their values. Remove the old settings afterward; MatchStyle does not read them.

If upgrading from 2.1.x, also delete `highlight.fonts.other` and use VS Code's editor settings for non-Hebrew text. To keep the previous sample font:

```json
"editor.fontFamily": "Consolas,Menlo",
"editor.fontSize": 16,
"editor.fontWeight": "normal"
```

Keep `matchStyle.enabled` and `matchStyle.hebrew` as above. Editor settings also control the base typography when the extension is disabled; syntax themes can still apply bold or italic to non-Hebrew tokens. The extension does not migrate or write settings automatically.

## Rendering limitations

VS Code's public [decoration API](https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions) does not expose font family or size for existing text. This extension sends validated CSS through `textDecoration`. That workaround depends on editor implementation details and may break after VS Code updates. It does not modify your files or patch the VS Code installation.

VS Code uses one line height for the editor. For 32px Hebrew, try `"editor.lineHeight": 44` in your settings, then adjust for your font's marks. Keep `editor.fontSize` at your preferred size for non-Hebrew text. Larger fonts can otherwise clip. Mixed fonts and sizes need manual checks for caret placement, mouse clicks, selection, wrapping, and right-to-left text. The extension changes typography; it does not add an RTL layout engine.

Each edit rescans the visible document for Hebrew phrases. This keeps the implementation small; very large documents with many Hebrew phrases may be slower.

## Build and try locally

Use Node.js 22 or later for the packaging tool:

```sh
npm ci
npm run compile
npm test
npm run package
```

Packaging type-checks the source and builds `dist/index.js` automatically. Install the generated `matchstyle-0.1.0.vsix` with **Extensions: Install from VSIX…**, reload VS Code, and add the settings above. This preview is not yet published to an extension registry.

To inspect the source in an Extension Development Host:

```sh
code --extensionDevelopmentPath .
```

Open a file containing `hello שָׁלוֹם 😀 123` and `בְּמִצְוֺתָיו וְרָצָה בָנוּ`. Select and edit both scripts, insert/delete lines, enable word wrap and resize the editor, open split views, change the Hebrew font settings and normal editor font, and disable/re-enable the feature. Confirm that non-Hebrew typography and theme styles are preserved and Hebrew word order stays right-to-left. Automated tests cover range matching, configuration, validation, and disposal with a mocked VS Code API; visual rendering remains a manual release check.
