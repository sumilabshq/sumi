export const HOVERED = 5;
export const SHOWN = 6;
export const DRAGGED = 8;
const ROWS_BEFORE_DROP_LINE = 8;

export type TabsParts = Readonly<Record<string, string>>;

export const GEIST_LOADED = `(async (faces) => { if (faces !== "") { const sheet = document.createElement("style"); sheet.textContent = faces; document.head.append(sheet); } await Promise.all(["400 13px Geist", "500 13px Geist", "600 14px Geist", "400 12px Geist"].map((face) => document.fonts.load(face))); await document.fonts.ready; return document.fonts.check("500 13px Geist"); })`;

export const BOARD_PARTS: TabsParts = {
	column: ".tcol:not(.icons)",
	plate: ".hcard",
	toggle: ".tcol .top > .r48b:first-child",
	menu: ".tcol .top > .r48b:last-child",
	title: ".tcol .top .ttl",
	count: ".tcol .top .ttl span",
	group: ".tcol .grp",
	row: ".tcol .trow",
	icon: ".ib",
	glyph: ".ib > svg, .ib > .fav",
	words: ".tx b",
	subtitle: ".tx b i",
	status: ".tx .st",
	mark: ".ib > .sdot",
	ring: ".ib",
	grip: ".grip svg",
	close: ".x",
	closeGlyph: ".x svg",
	lifted: ".tcol .trow.drag",
	dropLine: ".tcol .dropline",
	newTab: ".tcol .newtab",
	newTabGlyph: ".tcol .newtab > svg",
	newTabKey: ".tcol .newtab kbd",
};

export const BUILT_PARTS: TabsParts = {
	column: "[data-studio-kept=shown] [data-host-column]",
	plate: "[data-studio-kept=shown] [data-app-host-frame]",
	toggle: "[data-studio-kept=shown] [data-host-column] [data-host-column-toggle]",
	menu: "[data-studio-kept=shown] [data-host-column-menu]",
	title: "[data-studio-kept=shown] [data-host-tabs-count]",
	count: "[data-studio-kept=shown] [data-host-tabs-count] > span",
	group: "[data-studio-kept=shown] [data-host-tab-group]",
	row: "[data-studio-kept=shown] [data-host-list-tab]",
	icon: "[data-host-tab-icon]",
	glyph: "[data-host-tab-icon] > svg, [data-host-tab-icon] > img",
	words: "button > span:last-child > span:first-child",
	subtitle: "[data-host-tab-subtitle]",
	status: "button > span:last-child > span:nth-child(2)",
	mark: "[data-host-tab-status]:not([data-host-tab-status=reading])",
	ring: "[data-host-tab-status=reading]",
	grip: "[data-host-tab-grip] svg",
	close: "[data-host-close-tab]",
	closeGlyph: "[data-host-close-tab] svg",
	lifted: "[data-studio-kept=shown] [data-host-list-tab][data-lifted]",
	dropLine: "[data-studio-kept=shown] [data-host-drop-line]",
	newTab: "[data-studio-kept=shown] [data-host-tab-list] [data-host-column-add]",
	newTabGlyph: "[data-studio-kept=shown] [data-host-tab-list] [data-host-column-add] svg",
	newTabKey: "[data-studio-kept=shown] [data-host-tab-list] [data-host-column-add] kbd",
};

export const TABS_PROBE = `((S, phase, at) => {
	const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
	const pen = canvas.getContext("2d", { willReadFrequently: true });
	const bytes = (c) => { pen.clearRect(0, 0, 1, 1); pen.fillStyle = "rgba(0,0,0,0)"; pen.fillStyle = c; pen.fillRect(0, 0, 1, 1); return [...pen.getImageData(0, 0, 1, 1).data]; };
	const seen = (el) => { const layers = []; for (let node = el; node; node = node.parentElement) { const b = bytes(getComputedStyle(node).backgroundColor); if (b[3] > 0) layers.push(b); if (b[3] === 255) break; } let out = [255, 255, 255]; for (const l of layers.reverse()) { const a = l[3] / 255; out = out.map((v, i) => Math.round(l[i] * a + v * (1 - a))); } return out; };
	const ink = (el) => { let alpha = 1; for (let node = el; node; node = node.parentElement) alpha *= Number(getComputedStyle(node).opacity); const b = bytes(getComputedStyle(el).color); const back = seen(el); const a = (b[3] / 255) * alpha; return b.slice(0, 3).map((v, i) => Math.round(v * a + back[i] * (1 - a))); };
	const fill = (el) => { const b = bytes(getComputedStyle(el).backgroundColor); return b[3] === 0 ? "none" : seen(el); };
	const column = [...document.querySelectorAll(S.column)].find((n) => n.getClientRects().length > 0);
	const cs = getComputedStyle(column);
	const cb = column.getBoundingClientRect();
	const col = { left: cb.left + parseFloat(cs.paddingLeft), right: cb.right - parseFloat(cs.paddingRight), top: cb.top + parseFloat(cs.paddingTop), bottom: cb.bottom - parseFloat(cs.paddingBottom) };
	const plate = column.closest(S.plate) ?? document.querySelector(S.plate);
	const r1 = (v) => Math.round(v * 10) / 10;
	const box = (el) => { const b = el.getBoundingClientRect(); return { x: r1(b.left - col.left), y: r1(b.top - col.top), w: r1(b.width), h: r1(b.height) }; };
	const textBox = (el) => { const node = [...el.childNodes].find((one) => one.nodeType === 3 && one.textContent.trim() !== ""); if (!node) return null; const range = document.createRange(); range.selectNodeContents(node); const b = range.getBoundingClientRect(); return { x: r1(b.left - col.left), h: r1(b.height) }; };
	const font = (el) => { const s = getComputedStyle(el); return { size: s.fontSize, weight: s.fontWeight }; };
	const radius = (el) => { const b = el.getBoundingClientRect(); const r = parseFloat(getComputedStyle(el).borderTopLeftRadius); return r >= b.height / 2 - 0.5 ? "pill" : r; };
	const rows = [...column.querySelectorAll(S.row)];
	const one = (root, sel) => root.querySelector(sel);
	const out = {};
	if (phase === "brand") return getComputedStyle(column).getPropertyValue("--brand").trim();
	if (phase === "rest") {
		const pb = plate.getBoundingClientRect();
		out.column = { w: r1(col.right - col.left), fromPlateRight: r1(pb.right - col.right), fromPlateTop: r1(col.top - pb.top), radius: radius(column), fill: fill(column) };
		for (const name of ["toggle", "menu"]) { const el = document.querySelector(S[name]); out[name] = { ...box(el), radius: radius(el), fill: fill(el), ink: ink(el), glyph: Math.round(el.querySelector("svg").getBoundingClientRect().width) }; }
		const title = document.querySelector(S.title); out.title = { text: textBox(title), ...font(title), ink: ink(title) };
		const count = document.querySelector(S.count); out.count = { text: textBox(count), ...font(count), ink: ink(count) };
		out.groups = [...column.querySelectorAll(S.group)].map((g) => ({ ...box(g), text: textBox(g), ...font(g), ink: ink(g) }));
		out.rows = rows.map((row, index) => {
			const icon = one(row, S.icon); const glyph = one(row, S.glyph); const words = one(row, S.words); const subtitle = one(row, S.subtitle); const status = one(row, S.status);
			const item = { h: r1(row.getBoundingClientRect().height), x: box(row).x, w: box(row).w, radius: radius(row), fill: fill(row), icon: icon && box(icon), glyph: glyph && { x: box(glyph).x, w: box(glyph).w }, title: words && { text: textBox(words), ...font(words), ink: ink(words) }, subtitle: subtitle && { text: textBox(subtitle), ...font(subtitle), ink: ink(subtitle) }, status: status && { text: textBox(status), ...font(status), ink: ink(status) } };
			const isAboveDropLine = index < ${ROWS_BEFORE_DROP_LINE};
			if (isAboveDropLine) item.y = box(row).y;
			if (!isAboveDropLine && item.icon) item.icon = { x: item.icon.x, w: item.icon.w, h: item.icon.h };
			const mark = one(row, S.mark); if (mark) { const markBox = box(mark); item.mark = { x: markBox.x, w: markBox.w, h: markBox.h, fromIconTop: r1(mark.getBoundingClientRect().top - icon.getBoundingClientRect().top), fill: fill(mark), ring: getComputedStyle(mark).boxShadow !== "none" }; }
			const ring = one(row, S.ring); if (ring && getComputedStyle(ring).boxShadow !== "none" && index === at.shown) item.ring = { w: box(ring).w };
			return item;
		});
		const last = rows.at(-1); const prev = rows.at(-2);
		out.lastGap = r1(last.getBoundingClientRect().top - prev.getBoundingClientRect().bottom);
		out.shown = { closeShown: one(rows[at.shown], S.close) !== null && getComputedStyle(one(rows[at.shown], S.close)).opacity !== "0" };
		const newTab = document.querySelector(S.newTab); const glyph = document.querySelector(S.newTabGlyph); const key = document.querySelector(S.newTabKey);
		out.newTab = { ...box(newTab), fromBottom: r1(col.bottom - newTab.getBoundingClientRect().bottom), radius: radius(newTab), fill: fill(newTab), text: textBox(newTab), ...font(newTab), ink: ink(newTab), glyph: { x: box(glyph).x, w: box(glyph).w }, key: { right: r1(col.right - key.getBoundingClientRect().right), size: getComputedStyle(key).fontSize, weight: getComputedStyle(key).fontWeight, ink: ink(key), said: key.textContent } };
	}
	if (phase === "hover") {
		const row = rows[at.hovered];
		const grip = one(row, S.grip); const close = one(row, S.close); const closeGlyph = one(row, S.closeGlyph);
		out.hovered = { fill: fill(row), icon: box(one(row, S.icon)).x, grip: grip && { ...box(grip), ink: ink(grip) }, close: close && { right: r1(col.right - close.getBoundingClientRect().right), w: box(close).w, h: box(close).h, fill: fill(close), ink: ink(close), glyph: Math.round(closeGlyph.getBoundingClientRect().width) } };
	}
	if (phase === "drag") {
		const lifted = document.querySelector(S.lifted); const line = document.querySelector(S.dropLine);
		const ls = getComputedStyle(lifted);
		const matrix = new DOMMatrix(ls.transform === "none" ? undefined : ls.transform);
		const rotate = ls.rotate === "none" ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : parseFloat(ls.rotate);
		const shiftX = ls.translate === "none" ? matrix.e : parseFloat(ls.translate);
		const dot = line && getComputedStyle(line, "::before");
		const lineBox = line && line.getBoundingClientRect();
		out.lifted = { fill: fill(lifted), shadow: ls.boxShadow.split(/,(?![^(]*\\))/).map((one) => one.trim()).filter((one) => !/^rgba\\(0, 0, 0, 0\\) 0px 0px 0px 0px$/.test(one)).map((one) => { const colour = one.match(/^(?:rgba?|color|oklch)\\([^)]*\\)/)?.[0] ?? "transparent"; const b = bytes(colour); return { colour: b.slice(0, 3), alpha: b[3], geometry: one.slice(colour.length).trim().split(/\\s+/).map(parseFloat) }; }), rotate: r1(rotate), shiftX: r1(shiftX) };
		out.dropLine = line && { h: r1(lineBox.height), left: r1(lineBox.left - col.left), right: r1(col.right - lineBox.right), fill: fill(line), dot: { w: parseFloat(dot.width), h: parseFloat(dot.height), left: parseFloat(dot.left), fill: bytes(dot.backgroundColor).slice(0, 3) } };
	}
	return out;
})`;
