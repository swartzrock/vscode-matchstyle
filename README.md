# MatchStyle

Choose a font family, size, and weight for matched text in VS Code. Other text uses the normal editor font and syntax theme. This local preview uses a fixed built-in matcher. Configurable regex matching is proposed for a later version.

## Settings

Install your chosen fonts on your computer, then add these settings in **Preferences: Open User Settings (JSON)**. This example configures the preview's built-in Hebrew matcher for text such as `שָׁלוֹם` and `בְּמִצְוֺתָיו וְרָצָה בָנוּ`:

```json
"matchStyle.enabled": true,
"matchStyle.hebrew": {
  "fontFamily": "Noto Serif Hebrew",
  "fontSize": 32,
  "fontWeight": "500"
}
```

The feature is disabled by default. Matched text uses the configured font. Spaces and tabs connecting matched words share that font to keep each phrase in one span and preserve word order. Unmatched text keeps its normal editor styling. Line breaks are excluded. Settings apply to text editors in any file language and can be overridden per folder or language.

Sizes are in pixels, from 6 to 100. Font weights accept `normal`, `bold`, or `100` through `900`. Font stacks support quoted or unquoted family names. Missing fonts fall back according to the operating system; this extension does not install fonts.

Changes apply immediately. Set `matchStyle.enabled` to `false` to remove the styles. This extension has no commands, configurable regex rules, TODO highlighting, network requests, telemetry, or automatic settings changes.

## Rendering limitations

VS Code's public [decoration API](https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions) does not expose font family or size for existing text. This extension sends validated CSS through `textDecoration`. That workaround depends on editor implementation details and may break after VS Code updates. It does not modify your files or patch the VS Code installation.

VS Code uses one line height for the editor. For a 32px font, try `"editor.lineHeight": 44` in your settings, then adjust for your font's marks. Keep `editor.fontSize` at your preferred size for unmatched text. Larger fonts can otherwise clip. Mixed fonts and sizes need manual checks for caret placement, mouse clicks, selection, wrapping, and right-to-left text. The extension changes typography; it does not add an RTL layout engine.

Each edit rescans the visible document for matches. This keeps the implementation small; very large documents with many matches may be slower.

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

Open a file containing the text from the settings example alongside unmatched text, numbers, and emoji. Select and edit matched and unmatched text, insert/delete lines, enable word wrap and resize the editor, open split views, change the match font settings and normal editor font, and disable/re-enable the feature. Confirm that unmatched typography and theme styles are preserved and matched phrases retain their word order. Automated tests cover range matching, configuration, validation, and disposal with a mocked VS Code API; visual rendering remains a manual release check.
