# The tool

`node {tool} <command>`. Every command takes `--text` for lines instead of JSON.

| Command                               | Gives                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `spec <app>`                          | checks `.widgetarium/apps/<app>/spec.md` and shows it to the person as a card                                                           |
| `stage <app> <stage> --said <line>`   | fills a row of the build card: `data`, `design`, `catalogue`, `widgets`, `pages`                                                        |
| `report <app>`                        | per kept feature: widget, page, check, lint — ✓ or what is left; exits 1 until done                                                     |
| `shot <note>`, `shot --design <app>`  | refused: the canvas draws only on the GPU and a GPU shot is not built yet; the answer says so                                           |
| `screen <app> <screen> --widget <id>` | puts a page widget on the canvas; `--state <name>` draws the state of that name from the widget's `states`                              |
| `design <app>`                        | checks `.widgetarium/apps/<app>/design/` and shows it to the person as a card                                                           |
| `reference <app> <url> --why <line>`  | a picture on the canvas; `--kind app\|site\|marketing\|photo` says what it is, `--page People,Person` the screens it informs            |
| `note <app> <reference> <text>`       | a sticky note beside a reference: `--tone take\|like\|dislike\|note`, `--at 0.4,0.2` the point it is about                              |
| `rules <app>`                         | every rule of `.widgetarium/design-system.md` and the app's own `design-system.md`, as a checklist to answer before `design`            |
| `photos <app>`                        | after Approve design only: downloads every photo the approved screens link to into `design/photos/`, `photos.json` maps address to file |
| `find`                                | the whole catalogue, ranked against what you need                                                                                       |
| `list`                                | the same, unranked                                                                                                                      |
| `packs`, `sources`                    | the scopes installed, and the registries configured                                                                                     |
| `show <id>`                           | one widget's queries, commands, role and size                                                                                           |
| `source <id>`                         | its source, to read before copying anything from it                                                                                     |
| `install <id>`                        | writes it and its scope's shared files into the vault                                                                                   |
| `start <id>`                          | your access to a widget's files, and the progress card in the chat                                                                      |
| `check <id>`                          | the defects below in a widget you wrote; exits 1 while any stands                                                                       |
| `new widget <name>`                   | `widgets/<name>.widget.ts` and `ui/<name>/<name>.tsx`, the view typed from the inject; `--dir` picks the folder                         |
| `bases`                               | every base a screen can start from                                                                                                      |
| `base <name>`                         | one base: its regions, its sections, ready to write into a note                                                                         |
| `base <body> --with aside,dock`       | the body with these shell zones added: `nav`, `index`, `aside`, `dock`                                                                  |
| `card <name>`                         | a card layout: what it wears alone and among peers, and the parts it has                                                                |
| `layout <note>`                       | the real width of every region and tile on a drawn board                                                                                |
| `lint <note>`                         | what is wrong with the board; exits 1 until it is valid                                                                                 |
| `surfaces <note>`                     | which plates look wrong beside each other, on a **drawn** board                                                                         |

## Finding a widget

```bash
node {tool} find --role collection --about "tasks by day"
```

`--pack`, `--tag`, `--source` narrow it. Called with nothing it is the whole catalogue. Every row prints why it ranked where it
did, and nothing is filtered out — a near neighbour with different controls is a good answer.

**It is the catalogue, not the vault.** Every row says `have` or `GET `, and **the difference does
not change what you write**: name a `GET ` widget in a board and the engine fetches it when the note
draws. `install <id>` is still there for taking one before you place it, but you never have to.
Writing a widget because the vault happened not to hold one is the mistake this command exists to
stop.

In a project made by `widgetarium create` there is no vault: the same catalogue is
`widgetarium catalogue search <words>`, `catalogue show <id>` and `widgetarium add <id>`, which copy
the widget into the project as code of its own (catalogue.md).

## The project CLI

`npx widgetarium <command>` in a project; none of the commands above run there.

| Command                            | Does                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `create <dir> [--name <app>]`      | a new app in an empty folder: Vite, React, TypeScript, Tailwind, zod, the kit copied in |
| `check [dir]`                      | every layer against `widgetarium.json`; exits 1 on findings                             |
| `catalogue list \| search <words>` | the widgets the registries offer, ranked by the words for `search`                      |
| `catalogue show <id>`              | one widget's card: props, commands, files, libs, npm dependencies                       |
| `add <id> [--as <name>]`           | copies the widget into the widgets folder, never over one of the same name              |

`catalogue` and `add` take `--registry <folder or URL>`; `catalogue` takes `--json`.

## Taking a base

```bash
node {tool} base workspace
```

`node {tool} bases` lists them all. Today: `page`, `page-composed`, `workspace`, `split`, `surface`,
`three-pane`, `supporting-pane`, `journal`, `analytics`, `library`, `gallery`, `atlas`, `showcase`, `notebook`, `drill`.

It hands back a whole page: every region with its role, purpose and surface, its sections in several
shapes, and every line of text already written into a `@default/text-line` tile — the page title,
the line under it, a heading and a caption over each section. The only thing it leaves out is the
widgets, and it prints every empty place and what that place is for. The board keeps `base:`, so
`lint` catches a region count that does not match, a region holding the wrong role, and a declared
region left empty.

A base is where a screen starts, not what it must stay. Reshape the tree the moment the design asks
for something else; keep `base:` honest or drop it. Naming a shell in the chat and building something
else is what this replaces.

## Taking a card

```bash
node {tool} card header-body
```

`header-body`, `media-body`, `metric`, `list-row`. Each says what it wears standing alone and among
peers of its kind, and which parts it holds. Every part stands bare on the one plate.

## Starting a widget

```bash
node {tool} start @you/clock --title "Clock"
```

Run it before the first file you write or edit in a widget's folder, once per widget. It says
whether the widget is new, where its files go, and whether it came from a repository — an update
replaces that folder. The chat reads it and shows the person a card, **Building Clock**, whose steps
follow what you do next: writing into the folder, `check`, writing the note, `lint`. `--title` is
the name a person reads; left out, it is made from the id.

## Checking a widget you wrote

```bash
node {tool} check @you/clock
```

| Finding       | What it means                                                                      |
| ------------- | ---------------------------------------------------------------------------------- |
| **colour**    | a colour written by hand; a theme repaints a token and cannot repaint a hex        |
| **type**      | a `font-family` or `font-size` written by hand                                     |
| **unbounded** | rows drawn from a query read with no `limit`                                       |
| **role**      | a manifest naming none, so no surface law can judge it                             |
| **reaches**   | a name imported from `widgetarium` that the surface does not carry; it will crash  |
| **heading**   | an `h1` or `h2` inside a widget whose role is not `text`                           |
| **titled**    | a collection drawing its own title; the `Section` above it owns it                 |
| **page**      | an `-page` widget without `<Page kind>`, with its own width, or drawing kit `Hero` |
| **restyled**  | a kit component painted through `className`; a swapped kit would miss it           |
| **states**    | no `export const states = defineStates(…)`; the canvas would draw it blank         |

## Measuring a board

```bash
node {tool} layout <note>
node {tool} lint <note> --text
```

`lint` every save. `layout` before claiming a width is right. `surfaces` only when something looks
off on a board already drawn — it reads what is on screen and never hands you surfaces to write.

## The design canvas

Stage 3 is drawn here, a page at a time, and the person corrects it while the next page is drawn.

**References.** For each product the research names, two or three pictures of the screens this app
will have — the product's site, Dribbble, Mobbin, a page's `og:image`:

```
node {tool} reference <app> <https address> --kind app|site|marketing|photo --page "People,Person" --why "<what to take>"
node {tool} note <app> <reference> "Home as quiet titled lists: take this layout" --tone take --at 0.45,0.4
node {tool} note <app> <reference> "Rhythm pill on every row is noise; sort instead" --tone dislike --at 0.62,0.7
```

A reference stands on the pages it names. `take` is what the design copies, `like` what it admires,
`dislike` what it leaves and why, `note` anything else; each note says what exactly, in a few words.
When a take becomes a widget, write it again with `--into @<app>/<widget>`. Nothing is downloaded
while you design: a widget shows a photo by its literal `https://` address, and the implement job runs
`photos <app>` before it places the page.

**The look before anything is drawn.** The app's design system ships its settings beside its
`DESIGN.md` (`minimal/settings.json` for Minimal): the choices a person may make about its look (corners and motion, how much colour, the
ground, density, fonts) with what each offers. Offer them on the canvas, then shape the offer to this
app: drop a setting the domain has no use for and one that changes nothing on its pages (how plates stand
apart when the pages draw no plates), narrow its options, recommend the one you would pick
and say why in the chat, and add what the system leaves to you, such as the shell or a cover photo:

```
node {tool} look <app> --system minimal
node {tool} look <app> --drop density
node {tool} look <app> --setting shell --options sidebar,top-bar --recommend sidebar --ask "Navigation"
node {tool} look <app>
```

The person picks on the canvas; the screens redraw at once for what tokens can show, and the rest
you draw. Read the picks with `look <app>` before every page and draw in exactly what they say.

**The systems on disk**, each read in this order — usage, design, then the tokens, whose parameters
you may change and whose formulas you never do:

| System            | Read                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------- |
| `default`         | `default/USAGE.md`, `default/DESIGN.md`, `default/tokens.css`                          |
| `minimal`         | `minimal/USAGE.md`, `minimal/DESIGN.md`, `minimal/tokens.css`, `minimal/settings.json` |
| `minimal-landing` | `minimal-landing/USAGE.md`, `minimal-landing/DESIGN.md`, `minimal-landing/tokens.css`  |
| `frosted`         | `frosted/USAGE.md`, `frosted/DESIGN.md`, `frosted/tokens.css`, `frosted/settings.json` |

**Three directions first.** Pick the shell from the App shell table in `design-system.md`, then draw
the opening page three ways that differ in structure — what leads, how the page is cut — as
`@<app>/<page>-a-page`, `-b-page` and `-c-page`, placed as screens `<Page> · A`, `· B`, `· C`. Ask
the person to compare them on the canvas, and end your turn:

```
node {tool} job ask <app> <job> --options "A,B,C" "<what each direction bets on, in one line>"
```

Keep the pick as `@<app>/<page>-page`, delete the other two, and write the shell and each page's
archetype in the app's `design-system.md`. Never copy another app in this vault.

**Every situation is a screen.** Before drawing, write the page's situation map in `design.md`: who
arrives with what, their job right now, what must and must not be visible, the main action. Each
situation is a frame, named as the key in the page widget's `states`:

```
node {tool} screen <app> "People" --widget @<app>/people-page --for "back on a routine day: who is due"
node {tool} screen <app> "People" --widget @<app>/people-page --state Empty --for "first visit, nobody added yet"
node {tool} screen <app> "People" --widget @<app>/people-page --state "Add person" --for "adding someone"
node {tool} screen <app> "People" --widget @<app>/people-page --state Phone --size phone --for "checking who is due on the way"
```

`--size` draws the frame at the size the person will hold it: `phone`, `tablet`, `desktop` (the
default) or `<width>x<height>`.

Every screen that shows rows has an `Empty` state; every press that opens something — add, edit,
delete, confirm — has its own state with its Radix `Dialog` open over the page. Never edit
`canvas.json`.

**Then the rules.** `node {tool} rules <app>` prints every rule of `.widgetarium/design-system.md` and
the app's own, measures the canvas against the measured ones and names each failing frame; answer
every judged one yes or no and redraw until all pass. A rule is the person's word: never skip one.
