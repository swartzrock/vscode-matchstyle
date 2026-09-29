# MatchStyle

Choose a font family, size, and weight for any text that matches your regex rules in VS Code. The rest of your text keeps its usual editor font and theme.

## Get started

1. Run **Extensions: Install from VSIX…** in the VS Code Command Palette, select `matchstyle-0.1.0.vsix`, and reload VS Code.
2. Install the fonts you want to use on your computer.
3. Open **Preferences: Open User Settings (JSON)** and add your rules. MatchStyle is disabled until you enable it.

For example, these rules style Hebrew and Korean phrases:

```json
"matchStyle.enabled": true,
"matchStyle.rules": [
  {
    "pattern": "\\p{Script=Hebrew}+(?:[ \\t]+\\p{Script=Hebrew}+)*",
    "fontFamily": "Noto Serif Hebrew",
    "fontSize": 32,
    "fontWeight": "500"
  },
  {
    "pattern": "\\p{Script=Hangul}+(?:[ \\t]+\\p{Script=Hangul}+)*",
    "fontFamily": "Noto Sans KR",
    "fontSize": 24
  }
]
```

Add a rule for each kind of text you want to style:

- **pattern:** A JavaScript regex without `/` delimiters. Double backslashes in JSON, as shown above. The whole match is styled.
- **flags:** Optional; defaults to `u` for Unicode. Use `i` to ignore case, `m` for line anchors, or `s` to let `.` match newlines. Matching always finds all occurrences.
- **fontFamily:** An installed font name or comma-separated font stack.
- **fontSize:** Pixels, from 6 to 100.
- **fontWeight:** `normal`, `bold`, or `100` through `900` in steps of 100.

Font options are optional; omitted options keep the editor styling. Earlier rules take priority: an overlapping match from a later rule is skipped. Invalid regexes are skipped with a warning; slow scans stop after one second.

Changes apply automatically. Set `"matchStyle.enabled": false` to turn styling off. If a larger font gets clipped, increase `editor.lineHeight`; try `44` for a 32px font.

MatchStyle is not published yet. To build the VSIX from source, use Node.js 22 or later and run `npm install`, then `npm run package`.
