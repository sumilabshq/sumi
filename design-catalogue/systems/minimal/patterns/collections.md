# Collections: table, list, cards

How many things of one kind are shown. The form is picked by **what the person does with the items**, never by how the page should look. Any list can be drawn as cards; that is why the choice needs a rule.

## Pick the form

| The person…                                                     | Form              | Typical content                                           |
| --------------------------------------------------------------- | ----------------- | --------------------------------------------------------- |
| compares items on the same fields, sorts, filters, acts on many | **table**         | deals, invoices, files, orders, anything past ~25 rows    |
| scans names top to bottom and picks one; little to say per item | **list**          | people, notifications, settings, a short slice of records |
| recognises an item by its picture and browses rather than seeks | **card grid**     | templates, media, products, designs, places               |
| sees a short selection of a larger collection                   | **card row**      | featured, recent, picked for you                          |
| moves items between states                                      | **board** (lanes) | tasks, deals by stage, projects by status                 |

Two questions settle almost every case:

```
 Is the picture what they decide by? ── yes ──▶ card grid
                │ no
 Do they compare, sort or act on many? ── yes ──▶ table
                │ no
                ▼
               list
```

## Table

- Three or more fields worth comparing. With one or two fields it is a list.
- Edge to edge in its region, no card around it; rows, header and sorting as `system.md` § Data display.
- The toolbar above it holds search, filter chips, sort and, where it fits, the view switch.

## List

- One line per item, two at most: the name, then one fact. A mark leads the row (an emblem, an avatar, an icon).
- No card on the page; a line between rows. In the aside, one card holds the rows (`cards.md`).
- Past ~25 items, or once people ask to sort, it becomes a table.

## Card grid

- Each card is a **picture first**: the preview on a 3% plate, then the name and one fact on the page under it, not inside the plate. The whole card is the link (`cards.md`, pressable card).
- Only for items that have a picture worth seeing: a cover, a preview, a photo, a render. A grid of text-only cards is a list that wastes space.
- 3–4 columns on a working page, 2 on a phone; every picture the same aspect ratio.

## Card row

- 3–6 cards of a grid, under a section heading with `View all →` on the right, which opens the whole collection in its own form.
- Scrolls sideways only when more cards than fit are worth showing; otherwise it simply ends.

## Both: the view switch

Offer a table/grid switch only when the same items are both browsed by picture **and** compared on fields: files with previews, products, projects with covers. Prior art: Finder, Google Drive, Notion database views, Airtable.

- It sits in the toolbar beside sort and filter, as a two-icon segmented control.
- The default is the view of the page's main task; the choice is remembered per collection.
- The grid shows less than the table: picture, name, one fact. Equal content in both makes the grid only longer.
- No switch where items have no picture; no switch to a list (a list is a narrow table).

## Never

- Cards to make a page "look designed" when nothing on them is a picture.
- A table of two columns, or a list that people need to sort.
- A card grid and a table of the same items on one page.
