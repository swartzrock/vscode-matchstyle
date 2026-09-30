# MatchStyle cobalt screenshot set

Four product-marketing slides, each exported at 1536 × 1024 and 900 × 1600. The artwork follows the saved cobalt style reference while using MatchStyle's own icon, verified VS Code positioning, and the existing editor examples under `public/images/`.

| Slide | Headline | Supporting copy | Real UI source | Composition |
| --- | --- | --- | --- | --- |
| 01 | Spot action items fast | Give TODO, FIXME, and HACK distinct colors. | `action-markers.jpg` | Angled hero |
| 02 | Make text legible in your font | Apply an installed font and size to the text your regex matches. | `multilingual-text.jpg` | Reversed upright split |
| 03 | See log severity at a glance | Color INFO, WARN, ERROR, and FATAL labels in the editor. | `scannable-logs.jpg` | Wide editorial panel |
| 04 | Size headings by level | Set separate sizes for H1, H2, and H3 as you write. | `headings-by-level.jpg` | Contained detail panel |

Slide 02's landscape support line is shortened to “Choose an installed font and size for matched text” to fit its layout. Both phrasings describe the same supported rule properties.

## Generated background prompts

Built-in `image_gen` was used only for the abstract cobalt backdrops. Source UI screenshots, icon, labels, and campaign copy were composited directly by `render.mjs`, so their content is not AI-reconstructed. The portrait background was proportionally resized and center-cropped from the generated 941 × 1672 image to 900 × 1600.

### Landscape

> Use case: ads-marketing. Asset type: reusable abstract background artwork for a VS Code extension screenshot campaign. Create a polished 3:2 landscape 1536 x 1024 full-bleed cobalt blue background only, with rich deep cobalt tonal variation from #08317D to #0953C4, subtle broad curved blue forms near the lower right, a single elegant hairline cyan sweep crossing the lower third, refined luminous depth, and a mostly calm upper two-thirds with enough contrast for large white type and UI panels to be placed later. Flat to lightly dimensional digital art, no objects, no interface, no logos, no letters, no text, no icons, no gradients in other hues, no sparkles or particles. This is background art only, to be overlaid with exact product screenshots and typography.

### Portrait

> Use case: ads-marketing. Asset type: reusable abstract background artwork for a portrait product screenshot campaign. Create a polished vertical 9:16 cobalt blue background only, deep cobalt blue #08317D to #0953C4 with subtle tonal variation, one restrained large blue arc in the lower third and one thin elegant cyan sweep near the bottom, calm open upper and central areas to receive large white text and real UI screenshots later. No letters, no words, no UI, no icons, no logos, no objects, no other color accents, no particles or sparkles. Background artwork only.

## Rebuild

Run `node docs/marketing/cobalt-screenshots/render.mjs` with Node 22+, ImageMagick, and `rsvg-convert` installed. The script uses the bundled OFL-licensed Anton and Inter fonts and writes SVG sources and PNG exports to `landscape/` and `portrait/`.
