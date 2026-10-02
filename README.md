# MatchStyle

Custom fonts and typography for text matching your regex rules in VS Code. Change the font family, size, weight, or color of matching text while the rest of the editor keeps its usual styling. MatchStyle works on source text in any language; it does not change your files or the Markdown preview.


|   |   |
| --- | --- |
| [<img src="docs/marketing/cobalt-screenshots/landscape/01-spot-action-items.png" width="512" alt="Styled action markers" />](docs/marketing/cobalt-screenshots/landscape/01-spot-action-items.png) | [<img src="docs/marketing/cobalt-screenshots/landscape/02-read-multilingual-text.png" width="512" alt="Multilingual text with custom fonts" />](docs/marketing/cobalt-screenshots/landscape/02-read-multilingual-text.png) |
| [<img src="docs/marketing/cobalt-screenshots/landscape/03-scan-log-severity.png" width="512" alt="Color-coded log levels" />](docs/marketing/cobalt-screenshots/landscape/03-scan-log-severity.png) | [<img src="docs/marketing/cobalt-screenshots/landscape/04-size-headings-by-level.png" width="512" alt="Headings sized by level" />](docs/marketing/cobalt-screenshots/landscape/04-size-headings-by-level.png) |

Click a screenshot to view it at full size.

## Get started

Install [MatchStyle from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=JasonSwartz.matchstyle), or search for **MatchStyle** in VS Code's Extensions view and select **Install**.

For manual installation, download a `.vsix` file from the [GitHub releases page](https://github.com/swartzrock/vscode-matchstyle/releases), then run **Extensions: Install from VSIX…** in VS Code.

Open the Command Palette and run **Preferences: Open User Settings (JSON)**. Add this to `settings.json` to style Markdown level-two headings and TODO markers:

```json
{
  "[markdown]": {
    "editor.lineHeight": 38,
    "matchStyle.enabled": true,
    "matchStyle.rules": [
      {
        "pattern": "^##[ \\t]+[^\\r\\n]+",
        "regexFlags": "mu",
        "fontFamily": "Georgia, serif",
        "fontSize": 24,
        "fontWeight": "bold"
      },
      {
        "pattern": "\\bTODO\\b",
        "fontWeight": "bold",
        "color": "#FFD60A"
      }
    ]
  }
}
```

Merge these keys into your existing settings; if you already have a `[markdown]` block, add the keys there. Replace `Georgia` with a font installed on your computer. Remove the `[markdown]` wrapper to apply rules in every language. Changes take effect when you save settings.

Change a rule's `pattern` to match your own text. Use a JavaScript regex without `/` delimiters, and double backslashes in JSON as shown above. MatchStyle styles the whole match, including text inside code fences. Optional `regexFlags` include `i` (ignore case), `m` (line anchors), and `s` (match across lines). Omitting it defaults to `u` (Unicode); if you set it, include `u` when needed (for example, `iu`). Global matching is automatic.

Add any of `fontFamily`, `fontSize` (6–100 pixels), `fontWeight` (`normal`, `bold`, or `100`–`900`), and hex `color`. Omitted styles keep the editor's defaults. Earlier rules win when matches overlap. Increase `editor.lineHeight` if a larger font is clipped.

For copyable rules that produce the effects above, see [more examples](EXAMPLES.md). Set `"matchStyle.enabled": false` to turn styling off.

## Development

Run `bun install` and `bun run check` to check formatting, lint, type-check, run tests, and build the VSIX. Run `bun run format` to apply Prettier formatting.

## Releasing

Add a changeset with `bun run changeset` for each change that should be released. Merging it into `main` opens or updates a version pull request. Merging that pull request runs `bun run check` and creates a GitHub release with the compiled VSIX attached. Publishing that version to the Marketplace is a separate step. See [.changeset/README.md](.changeset/README.md) for setup details.
