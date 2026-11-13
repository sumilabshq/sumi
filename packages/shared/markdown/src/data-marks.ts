export const DATA_MARK = /\{(meter|bar|trend|ok|fail|progress|neutral|skip)(?: ([^{}\n]+))?\}/;

export const DATA_MARK_ANYWHERE = new RegExp(DATA_MARK.source, "g");

const MOST_SQUARES = 20;
const FEWEST_POINTS = 4;
const TALLEST_PX = 14;
const SHORTEST_PX = 3;
const STATUS_SAID: Readonly<Record<string, string>> = {
	ok: "Done",
	fail: "Failed",
	progress: "In progress",
	neutral: "Noted",
	skip: "Skipped",
};

export function dataMarkOf(page: Document, kind: string, said: string): Element | null {
	if (kind === "meter") {
		return meterOf(page, said);
	}

	if (kind === "bar") {
		return barOf(page, said);
	}

	if (kind === "trend") {
		return trendOf(page, said);
	}

	return said === "" ? statusOf(page, kind) : null;
}

function meterOf(page: Document, said: string): Element | null {
	const counts = said.split("/").map(Number);
	const [done = 0, second = 0, third] = counts;
	const failed = third === undefined ? 0 : second;
	const total = third ?? second;

	if (
		counts.length < 2 ||
		counts.length > 3 ||
		!counts.every(isCount) ||
		total > MOST_SQUARES ||
		done + failed > total
	) {
		return null;
	}

	const meter = markOf(
		page,
		"wg-mark-meter",
		failed === 0 ? `${done} of ${total}` : `${done} passed, ${failed} failed of ${total}`,
	);

	for (let at = 0; at < total; at += 1) {
		meter.appendChild(page.createElement("i")).className = squareClassOf(at, done, failed);
	}

	return meter;
}

function squareClassOf(at: number, done: number, failed: number): string {
	if (at < done) {
		return "";
	}

	return at < done + failed ? "is-failed" : "is-empty";
}

function barOf(page: Document, said: string): Element | null {
	const read = /^(\d{1,3})%$/.exec(said);
	const percent = read === null ? Number.NaN : Number(read[1]);

	if (!(percent >= 0 && percent <= 100)) {
		return null;
	}

	const bar = markOf(page, "wg-mark-bar", `${percent} percent`);
	bar.appendChild(page.createElement("b")).style.width = `${percent}%`;
	return bar;
}

function trendOf(page: Document, said: string): Element | null {
	const points = said.trim().split(/\s+/).map(Number);

	if (points.length < FEWEST_POINTS || points.length > MOST_SQUARES || !points.every(Number.isFinite)) {
		return null;
	}

	const highest = Math.max(...points.map(Math.abs), 1);
	const trend = markOf(page, "wg-mark-trend", `Last ${points.length}: ${points.join(", ")}`);

	points.forEach((point, at) => {
		const column = trend.appendChild(page.createElement("i"));
		column.style.height = `${Math.max(SHORTEST_PX, Math.round((Math.abs(point) / highest) * TALLEST_PX))}px`;
		column.className = at === points.length - 1 ? "is-last" : "";
	});
	return trend;
}

function statusOf(page: Document, kind: string): Element {
	return markOf(page, `wg-mark-status is-${kind}`, STATUS_SAID[kind] ?? kind);
}

function markOf(page: Document, className: string, label: string): HTMLElement {
	const mark = page.createElement("span");
	mark.className = className;
	mark.setAttribute("role", "img");
	mark.setAttribute("aria-label", label);
	return mark;
}

function isCount(count: number): boolean {
	return Number.isInteger(count) && count >= 0;
}
