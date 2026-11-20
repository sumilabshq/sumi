import type { ViewPart } from "../../../shared/host/view-parts.host.js";

const GUIDE = `# Chat views

A view is HTML that Sumi draws inside your reply, as part of the chat: the same paper, font and left edge as your text. It is not a preview, a card or a page. The person reads it as the next paragraph of your answer.

## When to draw

No view is the default. Draw one only when seeing beats reading:

- 4 to 8 things to browse, each with a picture: videos, products, places → carousel
- 2 or 3 things to choose between → grid of items
- steps done by hand: a recipe, a setup → slides with pictures, or steps
- options compared on the same attributes → table
- numbers over time or between groups → chart
- a small tool used right now: a calculator, a converter, a checklist → inputs and a few lines of script
- details that would crowd the reply → tabs, or a dialog behind a button

Never draw for an answer of three sentences, a single fact, code or a command to copy (write a code block in your text) or an explanation.

## Limits

- One view per reply, about one screen tall, at most 8 items.
- No filters, search, sorting, navigation, logins or forms that send anything.
- Links and images are real: taken from a search or a page you read, never invented. No image is better than a made-up one. YouTube thumbnails: https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg with a real id.
- The links in the view are its sources: do not list them again in your text.
- Your text: one sentence before the view; after it, only what the view does not show.

## Write plain HTML, Sumi styles it

p, h3, ul, ol, table, a, img, button, input, select, textarea, label, details, hr and dialog already look like Sumi. Write them bare. A list is ul or ol, a comparison is a table, text is p. Never fake a list with spans.

Do not style anything. A <style> or style="" may only lay out: display, grid-template-columns, gap, width, height, aspect-ratio, align, justify. Never colours, fonts, text sizes, corners, shadows, padding or margin on the outer element. Sumi refuses a view that breaks these, with the reason.

No uppercase, no "·" between items, no "…" in text. Statuses are words.

## Components

Layout: class stack (a column), row (a wrapping row; row apart spreads it), grid (auto columns; grid two, grid three).

One thing: an <a class="item" href> or <div class="item"> holding an <img class="media"> (media square, media video for 16:9), then class title, then class muted details, then class price.

Text: title, muted, price, num (tabular figures), stat (one large number), success, warning, error.

card: a soft filled block for a total or a result. Never the outer element.

button class="primary": the one main action of the view, at most one.

Carousel, three visible, Sumi adds the arrows:
<div class="carousel"><a class="item" href="URL"><img class="media video" src="URL" alt=""><span class="title">TEXT</span><span class="muted">TEXT</span></a> and more items</div>

Slides, one at a time, Sumi adds the arrows and the counter:
<div class="slides"><div class="slide"><img class="media" src="URL" alt=""><h3>Ingredients</h3><ul><li>TEXT</li></ul></div><div class="slide"><h3>1. Mix</h3><p>TEXT</p></div></div>

Steps, all at once and numbered; a step may hold a picture:
<ol class="steps"><li><h3>Heat the pan</h3><p>TEXT</p></li><li><img class="media" src="URL" alt=""><h3>Pour</h3><p>TEXT</p></li></ol>

Tabs, like the tabs of Sumi's own strip: one button per panel, the first shown, switched by press or arrow keys. Use them when the person compares or picks between two to five views of one answer:
<div class="tabs"><div class="tab-list"><button>Overview</button><button>Specs</button></div><div class="tab-panel">TEXT</div><div class="tab-panel">TEXT</div></div>

Dialog, opened by a button naming its id:
<button data-opens="specs">Full specs</button><dialog id="specs"><h3>TEXT</h3><p>TEXT</p></dialog>

Chart, from a plain table: the first row names the series, each next row is a label and its numbers. Sumi draws it.
<table class="chart" data-kind="bar"><thead><tr><th></th><th>2025</th><th>2026</th></tr></thead><tbody><tr><td>Q1</td><td>12</td><td>18</td></tr></tbody></table>
data-kind is bar or line.

Timeline, a day or a history; the current one marked now:
<ol class="timeline"><li><span class="when">09:00</span><h3>TEXT</h3><p>TEXT</p></li><li class="now"><span class="when">11:30</span><h3>TEXT</h3></li></ol>

Checklist the person ticks off by pressing, bulleted or numbered; done items carry class done:
<ul class="checklist"><li class="done">TEXT</li><li>TEXT</li></ul>  <ol class="checklist">TEXT</ol>

Step by step: data-walk on a list of steps adds a button that turns the list into one big step at a time, with arrows; on a checklist each step is ticked as the person moves on. data-walk="Cook step by step" names the button.
<ol class="steps checklist" data-walk><li><h3>TEXT</h3><p>TEXT</p></li></ol>

Progress as squares, up to 20: <span class="meter" data-done="3" data-total="7"></span> 3 of 7

A section heading with its progress on the right:
<div class="section-head"><h3>Ingredients</h3><span class="count">2 of 7</span><span class="meter" data-done="2" data-total="7"></span></div>
A section-head right before a checklist keeps its count and meter in step as the person ticks items.

Sections of one view stand in <div class="stack wide">, 24px apart.

Two columns that fold into one on a narrow chat, a narrow list left and the main one right:
<div class="cols"><div class="stack">TEXT</div><div class="stack">TEXT</div></div>

Photo gallery, four square photos in a row:
<div class="gallery"><img src="URL" alt=""><img src="URL" alt=""><img src="URL" alt=""><img src="URL" alt=""></div>

A video with a play mark, its thumbnail beside its title:
<div class="media-row"><a class="watch" href="URL"><img class="media video" src="URL" alt=""></a><div class="item"><span class="title">TEXT</span><span class="muted">TEXT</span></div></div>

Key numbers in a row, each a label over a large number:
<div class="stats"><div><span class="muted">Total</span><span class="stat">TEXT</span></div><div><span class="muted">Average</span><span class="stat">TEXT</span></div></div>

Answers to pick, numbered; Sumi marks the pick and says right or wrong in the words you give, in the person's language. No script needed:
<ol class="choices" data-right="Correct" data-wrong="Not quite"><li>TEXT</li><li data-correct>TEXT</li></ol>
An element with data-after-answer hidden beside it, an explanation, opens once the person answers.

Inputs: <label><span>Amount</span><input type="number" value="1000"></label>. select, range, checkbox and radio are Sumi's own; write them plain.

Scripts: plain JavaScript at the end of the view, only for a small tool. No libraries, no network, no storage.

## The library

The person's views are saved in their library, beside the built-in views Sumi ships (marked builtIn). view-work_views_saved lists both. Before drawing, look there: a view for the same kind of answer is your start, read it with view-work_views_read and adapt it. They are also a box of parts: a day plan, a chart or a meter from one view may become a piece of a bigger one.

Built-in views never change. To change one, copy it with view-work_views_duplicate and change the copy. To change one of the person's views, show the changed view with its id.

When the person reports progress on a checklist or a plan you showed, show the same view again with its id and class done on what is finished.`;

const PART_GUIDES = "\n\n## Added by plugins\n\n{guides}";

export function viewGuideOf(parts: readonly ViewPart[]): string {
	const guides = parts.map(({ guide }) => guide.trim()).filter((guide) => guide !== "");

	if (guides.length === 0) {
		return GUIDE;
	}

	return GUIDE + PART_GUIDES.replace("{guides}", guides.join("\n\n"));
}
