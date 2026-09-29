# MatchStyle

Choose a font family, size, and weight for matched text in VS Code. The rest of your text keeps its usual editor font and theme.

## Get started

1. Run **Extensions: Install from VSIX…** in the VS Code Command Palette, select `matchstyle-0.1.0.vsix`, and reload VS Code.
2. Install the font you want to use on your computer.
3. Open **Preferences: Open User Settings (JSON)** and add the settings below. MatchStyle is disabled until you enable it.

This example uses the preview's built-in Hebrew matcher to style text such as `שָׁלוֹם`:

```json
"matchStyle.enabled": true,
"matchStyle.hebrew": {
  "fontFamily": "Noto Serif Hebrew",
  "fontSize": 32,
  "fontWeight": "500"
}
```

- **fontFamily:** An installed font name or a comma-separated font stack.
- **fontSize:** A size in pixels, from 6 to 100.
- **fontWeight:** `normal`, `bold`, or `100` through `900` in steps of 100.

Change these values to suit your font. Changes apply immediately. Set `"matchStyle.enabled": false` to turn the styling off.

If a larger font gets clipped, increase `editor.lineHeight`. For a 32px font, try `"editor.lineHeight": 44`.

This preview uses a fixed matcher; custom matching rules are not available yet.

MatchStyle is not published yet. To build the VSIX from source, use Node.js 22 or later and run `npm install`, then `npm run package`.
