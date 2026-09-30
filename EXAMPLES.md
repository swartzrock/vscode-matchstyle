# MatchStyle examples

Try these examples in the Markdown source editor. Open **Preferences: Open User Settings (JSON)** and merge one settings block into your settings. Each block is a complete, standalone configuration for Markdown files; its `matchStyle.rules` array replaces your existing rules for Markdown.

To combine examples, collect their rule objects into one `matchStyle.rules` array. Put specific rules first: an overlapping match from a later rule is skipped. Install the named fonts or substitute fonts already on your computer.

MatchStyle styles the full regex match, including any punctuation. It scans text inside code blocks too. Styling changes the source editor; the Markdown preview uses its own styles.

## 1. Bold Markdown headings

Make second-level headings stand out while you write:

```markdown
## Project overview
## Next steps
```

Suggested settings:

```json
{
  "[markdown]": {
    "editor.lineHeight": 32,
    "matchStyle.enabled": true,
    "matchStyle.rules": [
      {
        "pattern": "^ {0,3}##[ \\t]+[^\\r\\n]+",
        "flags": "mu",
        "fontWeight": "bold",
        "fontSize": 22
      }
    ]
  }
}
```

This includes the `##` marker. Markdown themes often make headings bold already, so the larger size makes the change easier to see. Replace `##` in the pattern with `#{1,6}` to style all six heading levels. You can also add `fontFamily`.

## 2. Readable multilingual text

Give Korean phrases their own font and size while surrounding English keeps the editor font. This is useful for translation files and language study notes.

```text
Greeting: 안녕하세요
Example phrase: 안녕하세요 세계
```

Suggested settings:

```json
{
  "[markdown]": {
    "editor.lineHeight": 36,
    "matchStyle.enabled": true,
    "matchStyle.rules": [
      {
        "pattern": "\\p{Script=Hangul}+(?:[ \\t]+\\p{Script=Hangul}+)*",
        "fontFamily": "Noto Sans KR",
        "fontSize": 24
      }
    ]
  }
}
```

The pattern includes spaces between Korean words. For another script, change both `Hangul` occurrences to its Unicode script name, such as `Arabic` or `Hiragana`, and choose a suitable installed font. Increase `editor.lineHeight` if larger text is clipped.

## 3. Prominent action markers

Make action markers bold so they are easy to spot in notes and code comments:

```text
TODO: Write the installation guide.
FIXME: Check the broken link.
HACK: Replace the temporary workaround.
```

Suggested settings:

```json
{
  "[markdown]": {
    "editor.lineHeight": 30,
    "matchStyle.enabled": true,
    "matchStyle.rules": [
      {
        "pattern": "\\b(?:TODO|FIXME|HACK)\\b",
        "fontWeight": "bold",
        "fontSize": 20
      }
    ]
  }
}
```

Only the marker becomes larger and bold; the rest of the line keeps its styling. Add `"flags": "iu"` to also match lowercase markers. If your font or theme already makes the markers look bold, the size change makes the rule easier to check.

## 4. Distinct prose and inline code

Use a serif editor font for writing, with a monospace font for backticked commands and identifiers:

Run `npm install`, then build the extension with `npm run package`.

Suggested settings:

```json
{
  "[markdown]": {
    "editor.fontFamily": "Georgia, serif",
    "matchStyle.enabled": true,
    "matchStyle.rules": [
      {
        "pattern": "`[^`\\r\\n]+`",
        "fontFamily": "Courier New, monospace"
      }
    ]
  }
}
```

The editor font setting applies to all Markdown source text. MatchStyle changes single-backtick spans, including the backticks, to the monospace font. This simple pattern is intended for single-backtick examples on one line.

## 5. Easy-to-scan logs

Make serious error labels bold in logs pasted into a Markdown incident report:

```text
2026-09-29 10:00:00 INFO Server started
2026-09-29 10:00:01 ERROR Connection refused
2026-09-29 10:00:02 FATAL Unable to continue
```

Suggested settings:

```json
{
  "[markdown]": {
    "matchStyle.enabled": true,
    "matchStyle.rules": [
      {
        "pattern": "\\b(?:ERROR|FATAL)\\b",
        "fontWeight": "bold"
      }
    ]
  }
}
```

To emphasize entire error lines, use `"pattern": "^[^\\r\\n]*\\b(?:ERROR|FATAL)\\b[^\\r\\n]*$"` and `"flags": "mu"`. For actual log files, use a language override matching the file's language mode, or put the MatchStyle settings at the top level to apply them across languages.

## 6. Visible template placeholders

Make unfinished substitutions stand out in a document template:

```text
Hello {{ customer_name }},
Your invoice total is {{invoice_total}}.
Please reply by {{due_date}}.
```

Suggested settings:

```json
{
  "[markdown]": {
    "matchStyle.enabled": true,
    "matchStyle.rules": [
      {
        "pattern": "\\{\\{[^{}\\r\\n]+\\}\\}",
        "fontWeight": "bold"
      }
    ]
  }
}
```

Each placeholder is styled with its surrounding braces. Add `fontFamily` to give substitutions a distinct font as well.
