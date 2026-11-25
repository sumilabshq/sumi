export const FRAME_SHEET = `
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; padding: 0; background: transparent; }
body {
	color: var(--text);
	font: var(--fw-regular) var(--fs-14) / 1.6 var(--font-ui);
	font-feature-settings: var(--font-features);
	-webkit-font-smoothing: antialiased;
	overflow: hidden;
}
::selection { background: var(--selection); }
body > * + * { margin-top: 12px; }
h1, h2, h3, h4, p, figure, blockquote, ul, ol, dl, dd { margin: 0; }
h1, h2, h3, h4 { font-size: inherit; font-weight: var(--fw-semi); }
strong, b { font-weight: var(--fw-semi); }
img { display: block; max-width: 100%; }
a { color: var(--accent-text); text-decoration: none; text-underline-offset: 3px; }
a:hover { text-decoration: underline; }
hr { height: 1px; margin: 4px 0; border: 0; background: var(--line); }
small, figcaption { color: var(--text-3); font-size: inherit; }
blockquote { padding-left: 12px; border-left: 1px solid var(--line-strong); color: var(--text-2); }
code, kbd, pre { font-family: var(--font-code); }
:not(pre) > code { font-size: var(--fs-13); }

ul, ol { padding: 0; list-style: none; line-height: 1.65; }
ul > li, ol > li { position: relative; padding-left: 26px; }
ol { counter-reset: view-item; }
ol > li::before {
	content: counter(view-item);
	counter-increment: view-item;
	position: absolute;
	left: 0;
	color: var(--text-3);
	font-variant-numeric: tabular-nums;
}
ul > li::before {
	content: "";
	position: absolute;
	top: 0.8em;
	left: 0;
	width: 4px;
	height: 4px;
	margin-top: -2px;
	background: var(--text-3);
}

table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th, td { height: var(--h-row); padding: 0 var(--space-6) 0 0; text-align: start; vertical-align: middle; }
th { color: var(--text-3); font-weight: var(--fw-regular); white-space: nowrap; border-bottom: 1px solid var(--line); }
tbody tr:first-child td { padding-top: var(--space-1); }
th:last-child, td:last-child { padding-right: 0; }
td.num, th.num { text-align: end; }

button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	height: var(--h-md);
	padding: 0 12px;
	border: 1px solid var(--line);
	border-radius: var(--r-sm);
	background: transparent;
	color: var(--text);
	font: inherit;
	cursor: pointer;
	transition: background var(--dur-hover) var(--ease-emphasized);
}
button:hover { background: var(--hover); }
button:active { background: var(--active); }
button:disabled { color: var(--text-3); background: transparent; cursor: default; }
button.primary { border-color: transparent; background: var(--text); color: var(--plate); }
button.primary:hover { background: var(--text-2); }
:focus-visible { outline: 1px solid var(--focus-ring); outline-offset: 1px; }

input, textarea, .select-button {
	min-width: 0;
	height: var(--h-md);
	padding: 0 8px;
	border: 0;
	border-radius: var(--r-sm);
	background: var(--soft);
	color: var(--text);
	font: inherit;
	font-variant-numeric: tabular-nums;
}
textarea { height: auto; min-height: 72px; padding: 6px 8px; resize: vertical; }
input::placeholder, textarea::placeholder { color: var(--text-3); }
input:focus, textarea:focus { outline: 1px solid var(--focus-ring); }
input[type="number"] { -moz-appearance: textfield; }
input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
label { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
label > span:first-child { color: var(--text-3); }
label:has(> input[type="checkbox"]), label:has(> input[type="radio"]) { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; }
label:has(> input[type="checkbox"]) > span:first-child, label:has(> input[type="radio"]) > span:first-child { color: inherit; }

input[type="checkbox"], input[type="radio"] {
	appearance: none;
	flex: none;
	width: 14px;
	height: 14px;
	padding: 0;
	margin: 0;
	border: 1px solid var(--line-strong);
	background: transparent;
	cursor: pointer;
}
input[type="radio"] { border-radius: 50%; }
input[type="checkbox"]:checked { border-color: var(--text); background: var(--text); }
input[type="radio"]:checked { border-color: var(--text); background: radial-gradient(circle, var(--text) 0 3px, transparent 3.5px); }

input[type="range"] { appearance: none; height: 20px; padding: 0; background: transparent; cursor: pointer; }
input[type="range"]::-webkit-slider-runnable-track { height: 2px; background: var(--line-strong); }
input[type="range"]::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; margin-top: -5px; background: var(--text); }
input[type="range"]:focus { outline: none; }

select { display: none; }
.select { position: relative; display: inline-flex; flex-direction: column; min-width: 160px; }
.select-button { display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: start; cursor: pointer; }
.select-button:hover { background: var(--soft); }
.select-button svg, .select-menu svg { flex: none; width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.4; }
.select-button svg { color: var(--text-3); }
.select-menu {
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	z-index: 2;
	min-width: 100%;
	max-height: 240px;
	overflow-y: auto;
	padding: 4px 0;
	background: var(--overlay);
	box-shadow: var(--shadow-pop);
}
.select-option { display: flex; align-items: center; justify-content: space-between; gap: 12px; height: var(--h-md); padding: 0 12px; cursor: pointer; white-space: nowrap; }
.select-option:hover, .select-option.is-active { background: var(--hover); }
.select-option svg { visibility: hidden; }
.select-option[aria-selected="true"] svg { visibility: visible; }

details > summary { cursor: pointer; color: var(--text); list-style: none; }
details > summary::-webkit-details-marker { display: none; }
details > summary::before { content: "›"; display: inline-block; width: 16px; color: var(--text-3); transition: rotate var(--dur-base) var(--ease-emphasized); }
details[open] > summary::before { rotate: 90deg; }
details > :not(summary) { margin-top: 8px; padding-left: 16px; }

dialog {
	width: min(560px, calc(100% - 32px));
	max-height: calc(100% - 32px);
	padding: 16px 20px;
	border: 0;
	background: var(--overlay);
	box-shadow: var(--shadow-pop);
	color: var(--text);
}
dialog::backdrop { background: color-mix(in srgb, var(--plate) 72%, transparent); }
dialog > * + * { margin-top: 8px; }
.dialog-close { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; padding: 0; border: 0; color: var(--text-3); }
.dialog-close:hover { color: var(--text); }

.stack { display: flex; flex-direction: column; gap: 8px; }
.stack.loose { gap: 16px; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.row.apart { justify-content: space-between; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 24px 16px; }
.grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.item { display: flex; flex-direction: column; gap: 2px; min-width: 0; color: inherit; text-decoration: none; }
a.item:hover { text-decoration: none; }
a.item:hover .title { color: var(--accent-text); }
.media { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; background: var(--soft); margin-bottom: 6px; }
.media.square { aspect-ratio: 1 / 1; }
.media.video { aspect-ratio: 16 / 9; }
.card { padding: 12px 16px; background: var(--soft); }
.title { font-weight: var(--fw-semi); }
.muted { color: var(--text-3); }
.num, .price { font-variant-numeric: tabular-nums; }
.price { font-weight: var(--fw-semi); }
.stat { font-size: var(--fs-22); font-weight: var(--fw-semi); font-variant-numeric: tabular-nums; line-height: 1.3; }
.success { color: var(--success-text); }
.warning { color: var(--warning-text); }
.error { color: var(--danger); }

.carousel { display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 32px) / 3); gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
.carousel::-webkit-scrollbar { display: none; }
.carousel > * { scroll-snap-align: start; }
.carousel.two { grid-auto-columns: calc((100% - 16px) / 2); }
.view-bar { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.view-bar button { width: var(--h-md); padding: 0; }

.slides { display: grid; }
.slides > .slide { grid-area: 1 / 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.slides > .slide.is-hidden, .slides:not(.is-wired) > .slide:not(:first-child) { visibility: hidden; }
.slide .media { margin-bottom: 8px; }

ol.steps { display: flex; flex-direction: column; gap: 16px; }
ol.steps > li { padding-left: 32px; }
ol.steps > li > h3 + p { margin-top: 2px; }
ol.steps > li > .media { width: 240px; margin: 8px 0 0; }

.tabs { display: flex; flex-direction: column; gap: 12px; }
.tab-list { display: flex; flex-wrap: wrap; gap: var(--space-0-5); }
.tab-list > button {
	height: var(--h-sm);
	padding: 0 10px;
	border: 0;
	color: var(--text-3);
	font-size: var(--fs-13);
	transition: background-color var(--dur-out) var(--ease-touch);
}
.tab-list > button:hover { background: var(--hover); transition-duration: 0ms; }
.tab-list > button[aria-selected="true"] { background: var(--selected); color: var(--text); }
.tab-list > button:focus-visible { outline: 1px solid var(--line-strong); outline-offset: -1px; }
.tabs:not(.is-wired) > .tab-panel:not(:nth-child(2)) { display: none; }

table.chart.is-drawn { display: none; }
.chart-view { display: flex; flex-direction: column; gap: 8px; }
.chart-view svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart-view text { fill: var(--text-3); font-size: var(--fs-11); font-family: var(--font-ui); font-variant-numeric: tabular-nums; }
.chart-axis { stroke: var(--line); stroke-width: 1; }
.chart-legend { display: flex; flex-wrap: wrap; gap: 4px 16px; color: var(--text-3); }
.chart-legend span { display: inline-flex; align-items: center; gap: 6px; }
.chart-legend i { width: 8px; height: 8px; }
.series-1 { --series: var(--text-2); }
.series-2 { --series: var(--accent-base); }
.series-3 { --series: var(--hue-blue); }
.series-4 { --series: var(--hue-green); }
.series-5 { --series: var(--hue-pink); }
.chart-view .bar { fill: var(--series); }
.chart-view .line { fill: none; stroke: var(--series); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.chart-view .dot { fill: var(--series); }
.chart-legend i { background: var(--series); }
ol.timeline { display: flex; flex-direction: column; }
ol.timeline > li { display: grid; grid-template-columns: 56px 16px 1fr; gap: 0 12px; padding: 0 0 16px; }
ol.timeline > li:last-child { padding-bottom: 0; }
ol.timeline > li::before {
	content: "";
	grid-column: 2;
	grid-row: 1 / span 9;
	justify-self: center;
	width: 1px;
	height: calc(100% + 16px);
	margin-top: 10px;
	background: var(--line);
	position: static;
}
ol.timeline > li:last-child::before { visibility: hidden; }
ol.timeline > li::after {
	content: "";
	grid-column: 2;
	grid-row: 1;
	justify-self: center;
	width: 7px;
	height: 7px;
	margin-top: 8px;
	border-radius: 50%;
	background: var(--text-3);
}
ol.timeline > li.now::after { background: var(--accent-base); }
ol.timeline > li > .when { grid-column: 1; grid-row: 1; color: var(--text-3); font-variant-numeric: tabular-nums; }
ol.timeline > li > :not(.when) { grid-column: 3; }

.meter { display: inline-flex; gap: 2px; vertical-align: middle; }
.meter i { width: 8px; height: 8px; background: var(--line-strong); }
.meter i.is-done { background: var(--text); }

.checklist > li { padding-top: 4px; padding-bottom: 4px; cursor: pointer; transition: color var(--dur-base) var(--ease-emphasized), background var(--dur-hover) var(--ease-emphasized); }
.checklist > li::before {
	position: static;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	width: 16px;
	height: 16px;
	margin: 0 10px 0 -26px;
	vertical-align: baseline;
	border: 1px solid var(--line-strong);
	background: transparent;
	color: var(--text-3);
	font-size: var(--fs-11);
	line-height: 1;
}
ul.checklist > li::before { content: "\\200b"; }
.checklist > li:hover { background: var(--hover); }
.checklist > li:hover::before { border-color: var(--text-2); }
.checklist > li.done { color: var(--text-3); text-decoration: line-through; }
.checklist > li.done::before {
	content: "\\200b";
	border: 0;
	background: var(--text-3);
	-webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.5l2.5 2.5 4.5-6' fill='none' stroke='black' stroke-width='1.6'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
	mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.5l2.5 2.5 4.5-6' fill='none' stroke='black' stroke-width='1.6'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
}

.walk-start { align-self: flex-start; }
[data-walk].is-walking { min-height: 160px; }
[data-walk].is-walking > li { display: none; }
[data-walk].is-walking > li.is-current { display: block; padding-left: 0; font-size: var(--fs-16); line-height: 1.4; }
[data-walk].is-walking > li.is-current::before { display: none; }
[data-walk].is-walking > li.is-current > .media { width: 100%; max-width: 360px; margin: 0 0 16px; }
[data-walk].is-walking > li.is-current > h3 { margin-bottom: 4px; }

.stack.wide { gap: 24px; }
.section-head { display: flex; align-items: center; gap: 8px; }
.section-head > :first-child { margin-right: auto; }
.count { color: var(--text-3); font-variant-numeric: tabular-nums; }
.stats { display: flex; flex-wrap: wrap; gap: 8px 32px; }
.stats > * { display: flex; flex-direction: column; }
.gallery { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.gallery img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; margin: 0; background: var(--soft); }
.media-row { display: grid; grid-template-columns: 240px 1fr; gap: 16px; align-items: center; }
body { container-type: inline-size; }
.cols { display: flex; flex-direction: column; gap: 24px; }
@container (min-width: 640px) {
	.cols { display: grid; grid-template-columns: 232px minmax(0, 1fr); gap: 32px; align-items: start; }
}
@container (max-width: 479px) {
	.media-row { grid-template-columns: minmax(0, 1fr); }
}
a.watch { position: relative; display: block; }
a.watch > .media { margin-bottom: 0; }
a.watch::before { content: ""; position: absolute; left: 12px; bottom: 12px; width: 40px; height: 40px; background: var(--plate); }
a.watch::after { content: ""; position: absolute; left: 28px; bottom: 24px; border-left: 12px solid var(--text); border-top: 8px solid transparent; border-bottom: 8px solid transparent; }
a.watch:hover::before { background: var(--text); }
a.watch:hover::after { border-left-color: var(--plate); }
ol.choices > li { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 36px; padding: 0 8px 0 34px; cursor: pointer; }
ol.choices > li::before { left: 8px; }
ol.choices > li:hover { background: var(--hover); }
ol.choices > li.picked { background: var(--soft); }
ol.choices.is-answered > li { cursor: default; }
ol.choices.is-answered > li:not(.picked):hover { background: transparent; }
`;
