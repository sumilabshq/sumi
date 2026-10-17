# Design catalogue

Design systems taken from references a person liked, written so an agent can build a **new** product in the same spirit. A system is never the source product: its domain, data and screens stay behind.

## Layout

```
design-catalogue/
  shells/<id>.md     app shells: navigation levels, page header, detail, folding — structure only
  patterns/<id>.md   product structures (what stands in the centre, which regions serve it)
```

Systems live in `design-systems/<id>/` at the repository root, each an OpenDesign package (`od-design-system-project/v1`): `manifest.json` (fit parameters to filter by, source, credit), `USAGE.md`, `DESIGN.md`, `tokens.css`, `preview/`, `references/` (the pictures it was written from, numbered), and where a system has them `settings.json`, `patterns/` and `tests/`.

An app has **one shell and one design system**, chosen once for the whole app. A shell never names a colour or a font; a system never decides where navigation stands, only how it is painted, and names the shells it suits. `docs/ai/clean-ui.md` holds under both.

A source's screen structure goes to `patterns/`, never into its system.

One `DESIGN.md` per system: an agent reads it whole and judges the idea, which a split into JSON fragments would lose. Only `manifest.json` is for filtering.

## How a system is written

From the person's description of the references and the pictures themselves. Every section answers _why_, not only _what_. `DESIGN.md` opens with `# <Name>`, then OpenDesign's nine sections and four of ours, in this order.

| Where                     | Holds                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`           | `id`, `name`, `category`, `description` (the idea in one sentence), `source`, `credit`, and `fit` as arrays: `centre` (object · function · information · journey · atmosphere), `activity` (browse · edit · study · track · create · play · operate), `photogenic` (yes · user-photos · no), `session` (glance · browse · long-work), `density` (low · medium · high), `tone`, `device` |
| Visual Theme & Atmosphere | the idea in one or two sentences a person would say about it; the references and what to read each for; the settings: the few values a product picks and a person may switch later (ground, edges, density, fonts, base), each with its values and default, everything else fixed                                                                                                       |
| Color Palette & Roles     | each shadcn and kit role the system binds (`background`, `card`, `primary`, `border`, `group`, `raise`, the tones …) and the step of the Colour algorithm it takes                                                                                                                                                                                                                      |
| Typography Rules          | families, weights, the scale, and the patterns of emphasis                                                                                                                                                                                                                                                                                                                              |
| Component Stylings        | each kit control's own style in this system; charts, tables, numbers                                                                                                                                                                                                                                                                                                                    |
| Layout Principles         | how any screen in the system breathes, groups and floats — principles only; the source's screens go to `patterns/`                                                                                                                                                                                                                                                                      |
| Depth & Elevation         | which plates exist, what they group, their anatomy, padding rules; where a line stands                                                                                                                                                                                                                                                                                                  |
| Do's and Don'ts           | what products it suits and which it does not; the rules a copy most often breaks                                                                                                                                                                                                                                                                                                        |
| Responsive Behavior       | what changes on a phone or in a narrow region                                                                                                                                                                                                                                                                                                                                           |
| Agent Prompt Guide        | how an agent uses the system: which file to read for which task                                                                                                                                                                                                                                                                                                                         |
| Colour algorithm          | how the colours are **derived**, never only the hex values: the steps, the job of each, their lightness and chroma ranges, what is free (hue) and what is fixed (semantic status colours). Written for **both light and dark themes**; the source's theme is one instance                                                                                                               |
| Imagery                   | the role (forms the design · domain content · decoration), the kind of picture, how a picture is brought in line, and where to get such pictures for another domain                                                                                                                                                                                                                     |
| Behaviour                 | what the main object and the panels do when pressed, dragged, scrolled, collapsed; live updates; motion: fades, edges, speed                                                                                                                                                                                                                                                            |
| Never                     | the defaults a generated screen falls into (a gradient card, an unchosen violet accent, a card per number), each refused by name                                                                                                                                                                                                                                                        |

`tokens.css` is the Colour algorithm as formulas: the parameters (`--hue`, `--chroma`, lightness steps per theme, `--neutral-chroma`) and every role as an `oklch()` formula of them, in both themes. `USAGE.md` holds the read order, the highlights, Do and Avoid.

Three layers stay apart: the **look** (the system), the **structure** of a product (which screen kinds exist), and **behaviour**. The source's own business features are not written down.

## Using a system for a new product

1. Pick the system by fit.
2. **Design the product's structure first, from its own tasks**: which screens, which regions, what each holds. Only then apply the system. The source's screens are never a starting layout.
3. Choose the product's own hue and imagery **by the system's algorithm**, not by copying values.
4. Find pictures of the new domain in the system's imagery kind.
5. Build both themes.
6. **Copy check:** set every screen beside the reference pictures. If one reads as the same screen with the nouns changed — same regions, same panels in the same places, same order of cards — it is a copy: rebuild its structure.

## Pictures are found, never drawn

An agent never draws pictures: no illustrations, no object or body drawings, no maps or territory, no decorative SVG, no tracing or edge-detecting a photo into line art. Every picture is a real file from a source:

- photos and aerials from CC0 / public-domain sources, graded by the system's imagery rule;
- ready vector line art (Wikimedia Commons SVG, public-domain technical drawings, open icon sets) used as it is;
- the kit's icons;
- when nothing fits, a labelled placeholder: `[outline drawing: athlete, side view]`.

Code may draw only data and interface geometry: charts, ticks, dividers, a selection ring, markers on a real map or photo.
