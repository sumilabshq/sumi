import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { readPageIconsScript } from "../packages/domain/browser/gateways/browser-pages/tauri/page-icon-script.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

type Theme = "light" | "dark";

const GATE = "test:site-icon-paint";
const VIEW: readonly [number, number] = [320, 200];
const DRAWN_MS = 400;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-site-icons"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/site-icon-page.tsx");
const sheets = BROWSER_SHEET_SOURCES.map((at) => readFileSync(at, "utf8")).join("\n");

const DrawnCaseSchema = z.object({
	name: z.string(),
	images: z.number(),
	letters: z.number(),
	width: z.number(),
	height: z.number(),
	isLoaded: z.boolean(),
	radius: z.string(),
	fill: z.string(),
	shadow: z.string(),
	srcLength: z.number(),
	srcMiddle: z.string(),
});

type DrawnCase = z.infer<typeof DrawnCaseSchema>;

const DRAWN_CASES = `[...document.querySelectorAll("[data-case]")].map((row) => {
	const image = row.querySelector("img[data-host-tab-favicon]");
	const box = image?.getBoundingClientRect();
	const style = image ? getComputedStyle(image) : null;
	return {
		name: row.dataset.case,
		images: row.querySelectorAll("img").length,
		letters: row.querySelectorAll('[data-tab-art="site"]').length,
		width: box?.width ?? 0,
		height: box?.height ?? 0,
		isLoaded: image ? image.complete && image.naturalWidth > 0 : false,
		radius: style?.borderTopLeftRadius ?? "",
		fill: style?.backgroundColor ?? "",
		shadow: style?.boxShadow ?? "",
		srcLength: image?.getAttribute("src")?.length ?? 0,
		srcMiddle: image?.getAttribute("src")?.slice(200, 232) ?? "",
	};
})`;

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function pageFileOf(theme: Theme): string {
	const html = `<!doctype html><html class="${theme === "dark" ? "dark theme-dark" : ""}"><head><meta charset="utf-8"><style>${sheets}</style>
<style>html,body{margin:0;background:var(--sumi-frame)}</style></head>
<body><div id="root"></div><script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const file = path.join(shotsAt, `site-icons-${theme}.html`);
	writeFileSync(file, html);
	return file;
}

function caseNamed(cases: readonly DrawnCase[], name: string): DrawnCase | undefined {
	return cases.find((one) => one.name === name);
}

function isIconOf(drawn: DrawnCase | undefined, px: number): boolean {
	return (
		drawn !== undefined &&
		drawn.images === 1 &&
		drawn.letters === 0 &&
		drawn.width === px &&
		drawn.height === px &&
		drawn.isLoaded
	);
}

function isLetter(drawn: DrawnCase | undefined): boolean {
	return drawn !== undefined && drawn.images === 0 && drawn.letters === 1;
}

function isBare(drawn: DrawnCase | undefined): boolean {
	return drawn !== undefined && drawn.fill === "rgba(0, 0, 0, 0)" && drawn.shadow === "none" && drawn.radius === "4px";
}

async function checksTheme(theme: Theme): Promise<void> {
	const page = await paged(pageFileOf(theme), GATE, { size: VIEW });

	try {
		await waited(DRAWN_MS);
		const cases = await drawnCases(page);
		const row = caseNamed(cases, "row-icon");
		check(`${theme}: a tab row with a favicon draws a 16×16 image and no letter tile`, isIconOf(row, 16), row);
		check(`${theme}: the favicon wears the xs corner and no plate behind it`, isBare(row), row);
		check(
			`${theme}: a tab row with no favicon draws the letter tile`,
			isLetter(caseNamed(cases, "row-letter")),
			caseNamed(cases, "row-letter"),
		);
		check(
			`${theme}: a favicon that fails to load falls back to the letter tile`,
			isLetter(caseNamed(cases, "row-broken")),
			caseNamed(cases, "row-broken"),
		);
		check(
			`${theme}: an Essentials tile draws its favicon at 20×20`,
			isIconOf(caseNamed(cases, "tile-icon"), 20),
			caseNamed(cases, "tile-icon"),
		);
		await checksUnloadedTabs(page, theme, cases);
		writeFileSync(path.join(shotsAt, `icons-${theme}.png`), await page.shoot());
	} finally {
		page.close();
	}
}

const SWAP_SITE_ICON = "globalThis.swapSiteIcon()";

async function drawnCases(page: AskedPage): Promise<readonly DrawnCase[]> {
	return z.array(DrawnCaseSchema).parse(await page.ask(DRAWN_CASES));
}

async function checksUnloadedTabs(page: AskedPage, theme: Theme, cases: readonly DrawnCase[]): Promise<void> {
	for (const name of ["unloaded-slack", "unloaded-linear"]) {
		check(
			`${theme}: an unloaded tab with an address draws its discovered icon at 16×16, not a letter`,
			isIconOf(caseNamed(cases, name), 16),
			caseNamed(cases, name),
		);
	}

	check(
		`${theme}: two origins draw two different discovered icons`,
		caseNamed(cases, "unloaded-slack")?.srcMiddle !== caseNamed(cases, "unloaded-linear")?.srcMiddle,
		[caseNamed(cases, "unloaded-slack")?.srcMiddle, caseNamed(cases, "unloaded-linear")?.srcMiddle],
	);
	check(
		`${theme}: an unloaded Essentials tile draws its discovered icon at 20×20`,
		isIconOf(caseNamed(cases, "unloaded-tile"), 20),
		caseNamed(cases, "unloaded-tile"),
	);
	const before = caseNamed(cases, "live-swap")?.srcLength ?? 0;
	const swappedLength = Number(await page.ask(SWAP_SITE_ICON));
	await waited(DRAWN_MS);
	const after = caseNamed(await drawnCases(page), "live-swap");
	check(
		`${theme}: a live page swapping its origin's icon redraws the unloaded row`,
		before !== 0 && after?.srcLength !== before && after?.srcLength === swappedLength && isIconOf(after, 16),
		{ before, after: after?.srcLength, swappedLength },
	);
}

const LAY_ICON_LINK = `(() => {
	const link = document.createElement("link");
	link.rel = "icon";
	link.sizes = "32x32";
	link.href = "read.png";
	document.head.append(link);
	return true;
})()`;
const SWAP_ICON_LINK = `(() => {
	document.querySelector('link[rel="icon"]').setAttribute("href", "unread-3.png");
	return true;
})()`;

async function iconHrefIn(page: AskedPage): Promise<string> {
	const answer = String(await page.ask(readPageIconsScript(false)));
	const read: unknown = answer.startsWith("{") ? JSON.parse(answer) : null;
	const parsed = z.object({ links: z.array(z.object({ href: z.string() })) }).safeParse(read);
	return parsed.success ? (parsed.data.links[0]?.href.split("/").at(-1) ?? "none") : answer;
}

async function checksPageScript(): Promise<void> {
	const page = await paged(pageFileOf("light"), GATE, { size: VIEW });

	try {
		await page.ask(LAY_ICON_LINK);
		const first = await iconHrefIn(page);
		const unchanged = await iconHrefIn(page);
		await page.ask(SWAP_ICON_LINK);
		await waited(50);
		const swapped = await iconHrefIn(page);
		check(
			"in Chrome the page script reads the icon link, then says unchanged, then reads a swapped one",
			JSON.stringify([first, unchanged, swapped]) === JSON.stringify(["read.png", "same", "unread-3.png"]),
			[first, unchanged, swapped],
		);
	} finally {
		page.close();
	}
}

await checksPageScript();
await checksTheme("light");
await checksTheme("dark");
console.log(`shots in ${shotsAt}`);
console.log(failed ? `${GATE}: ${failed} check(s) failed` : `${GATE}: all checks passed`);
process.exit(failed ? 1 : 0);
