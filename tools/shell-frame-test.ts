import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { z } from "zod";
import { bundleOf } from "./harness.ts";

type Theme = "light" | "dark";

interface TimingRow {
	readonly action: string;
	readonly ms: number;
	readonly commits: number;
}

const VIEW: readonly [number, number] = [1440, 900];
const PINK = "rgb(255, 79, 163)";
const NAVY = "rgb(16, 24, 64)";
const SLACK_PX = 1;
const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-shell-frame"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/shell-frame-page.tsx");
const sheets = ["packages/core/browser-host.css", "packages/host-obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");

const spyAt = process.env["SHELL_SPY"];
const spyScript = spyAt === undefined ? "" : readFileSync(spyAt, "utf8");

let failed = 0;
const timings: TimingRow[] = [];

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

function pageFileOf(theme: Theme, query: "" | "?lights" = ""): string {
	const html = `<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta charset="utf-8"><style>${sheets}</style>
<style>html,body,#root{height:100%;margin:0}</style></head>
<body><div id="root"></div><pre id="boom"></pre><script>localStorage.clear();history.replaceState(null, "", "${query}" || location.pathname);</script><script>${spyScript}</script>
<script>${bundle.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const file = path.join(shotsAt, `shell-frame-${theme}${query === "" ? "" : "-lights"}.html`);
	writeFileSync(file, html);
	return file;
}

const FIRST_PAINT = `new Promise((done) => {
	setTimeout(() => done("never painted: " + document.getElementById("boom").textContent), 15000);
	const seen = () => {
		if (document.querySelector(".wg-shell .wg-plate-head.is-app")) {
			requestAnimationFrame(() => done(Math.round(performance.now())));
			return;
		}
		requestAnimationFrame(seen);
	};
	seen();
})`;

const BOX_OF = `(selector) => {
	const element = document.querySelector(selector);
	if (!element) return null;
	const box = element.getBoundingClientRect();
	const look = getComputedStyle(element);
	return {
		left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width), height: Math.round(box.height),
		radius: look.borderTopLeftRadius, background: look.backgroundColor, color: look.color, shadow: look.boxShadow,
		padding: look.padding, gap: look.columnGap, font: look.fontFamily, size: look.fontSize, weight: look.fontWeight,
	};
}`;

const LAYOUT = `(() => {
	const boxOf = ${BOX_OF};
	return {
		frame: boxOf(".wg-shell"),
		left: boxOf(".wg-shell-left"),
		chat: boxOf(".wg-shell-plate.is-chat"),
		app: boxOf(".wg-shell-plate.is-app"),
		right: boxOf(".wg-shell-right"),
		chatHead: boxOf(".wg-plate-head.is-chat"),
		appHead: boxOf(".wg-plate-head.is-app"),
		chatRow: boxOf(".wg-plate-head.is-chat .wg-plate-head-row"),
		appRow: boxOf(".wg-plate-head.is-app .wg-plate-head-row"),
		hideChats: boxOf('.wg-plate-head.is-chat button[aria-label="Hide sidebar"]'),
		hideTabs: boxOf('.wg-plate-head.is-app button[aria-label="Hide tabs"]'),
		chatCrumb: boxOf(".wg-plate-head.is-chat .wg-plate-crumb"),
		chatCrumbFirst: boxOf(".wg-plate-head.is-chat .wg-plate-crumb-first"),
		chatCrumbSecond: boxOf(".wg-plate-head.is-chat .wg-plate-crumb-second"),
		chatWords: document.querySelector(".wg-plate-head.is-chat [data-plate-place=crumb]")?.textContent ?? null,
		appWords: [...document.querySelectorAll(".wg-plate-head.is-app .wg-plate-crumb")].filter((crumb) => crumb.getClientRects().length > 0).map((crumb) => crumb.textContent),
		appButtons: [...document.querySelectorAll(".wg-plate-head.is-app button:not([data-pane-close])")].filter((button) => button.getClientRects().length > 0).map((button) => [button.getAttribute("aria-label"), button.getAttribute("aria-disabled")]),
		chatButtons: [...document.querySelectorAll(".wg-plate-head.is-chat button")].map((button) => [button.getAttribute("aria-label"), button.getAttribute("aria-disabled")]),
		menuOffset: (() => { const menu = document.querySelector(".wg-plate-head.is-chat .wg-studio-menu-trigger")?.getBoundingClientRect(); const head = document.querySelector(".wg-plate-head.is-chat").getBoundingClientRect(); return menu ? Math.round(menu.top + menu.height / 2 - (head.top + head.height / 2)) : null; })(),
		mascots: document.querySelectorAll(".wg-shell .wg-plate-head [data-mascot], .wg-shell .wg-studio-ai-head").length,
		rail: document.querySelectorAll(".wg-studio-rail").length,
		edges: [...document.querySelectorAll("[data-shell-edge]")].map((edge) => edge.getAttribute("data-shell-edge")),
	};
})()`;

const EDGE_AT = `((edge) => {
	const box = document.querySelector('[data-shell-edge="' + edge + '"]').getBoundingClientRect();
	return [box.left + box.width / 2, box.top + box.height / 2];
})`;

const FRAME_RECORDER = `(() => {
	const frames = [];
	let last = performance.now();
	let isOn = true;
	const tick = (now) => {
		frames.push(now - last);
		last = now;
		if (isOn) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
	window.__FRAMES__ = { stop: () => { isOn = false; return frames; } };
	window.__COMMITS_AT_START__ = window.__COMMITS__.frame;
	return true;
})()`;

const FRAMES_TAKEN = `(() => {
	const frames = window.__FRAMES__.stop().slice(1);
	const sorted = [...frames].sort((a, b) => a - b);
	return {
		count: frames.length,
		mean: Math.round((frames.reduce((sum, one) => sum + one, 0) / Math.max(1, frames.length)) * 10) / 10,
		worst: Math.round(sorted[sorted.length - 1] ?? 0),
		commits: window.__COMMITS__.frame - window.__COMMITS_AT_START__,
	};
})()`;

const timedUntilPainted = (act: string, until: string): string => `new Promise((done) => {
	const commitsFrom = window.__COMMITS__.frame;
	const startedAt = performance.now();
	${act};
	const seen = () => {
		if (${until}) {
			requestAnimationFrame(() => done({ ms: Math.round(performance.now() - startedAt), commits: window.__COMMITS__.frame - commitsFrom }));
			return;
		}
		requestAnimationFrame(seen);
	};
	seen();
})`;

const SIDES = `(() => {
	const centre = (selector) => {
		const box = document.querySelector(selector).getBoundingClientRect();
		return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2)];
	};
	return {
		left: document.querySelector('[data-shell-column="left"]').dataset.state,
		right: document.querySelector('[data-shell-column="right"]').dataset.state,
		leftWidth: Math.round(document.querySelector(".wg-shell-left").getBoundingClientRect().width),
		zoneLeft: Math.round(document.querySelector(".wg-shell-app-zone").getBoundingClientRect().left),
		leftToggle: centre('[data-side-toggle="left"]'),
		rightToggle: centre('[data-side-toggle="right"]'),
		pins: document.querySelectorAll("[data-side-pin]").length,
		isPinOnTop: (() => {
			const toggle = document.querySelector('[data-side-toggle="left"]').getBoundingClientRect();
			const found = document.elementFromPoint(toggle.left + toggle.width / 2, toggle.top + toggle.height / 2);
			const pin = document.querySelector('[data-side-pin="left"]');
			if (found === null || pin === null) return false;
			const pinBox = pin.getBoundingClientRect();
			return pin.contains(found) && pinBox.width === toggle.width && pinBox.left === toggle.left && getComputedStyle(pin.querySelector("svg")).fill === "none";
		})(),
		pinSaid: document.querySelector('[data-side-pin="left"]')?.getAttribute("data-tip-said") ?? null,
		pinKeys: document.querySelector('[data-side-pin="left"]')?.getAttribute("data-tip-keys") ?? null,
		leftToggles: document.querySelectorAll('[data-side-toggle="left"]').length,
		isLeftToggleOnTopLeftChat: document.querySelector('.wg-plate-head.is-chat[data-at-top-left] [data-side-toggle="left"]') !== null,
	};
})()`;

const REVEAL_DELAY_PROBE = `new Promise((done) => {
	let reached = null;
	document.addEventListener("pointermove", (event) => {
		if (reached === null && (event.clientX <= 1 || event.clientX >= innerWidth - 2)) reached = performance.now();
	}, { capture: true });
	const side = document.querySelector('[data-shell-side="left"]');
	const tick = () => {
		const look = getComputedStyle(side).transform;
		if (reached !== null && side.parentElement.dataset.state === "peeking" && (look === "none" || look === "matrix(1, 0, 0, 1, 0, 0)")) {
			done(Math.round(performance.now() - reached));
			return;
		}
		requestAnimationFrame(tick);
	};
	tick();
	setTimeout(() => done(-1), 3000);
})`;

const keydownScriptOf = (hasAlt: boolean): string =>
	`(document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { code: "KeyB", key: "b", metaKey: true, altKey: ${String(hasAlt)}, bubbles: true, cancelable: true }))`;

const SidesSchema = z.object({
	left: z.string(),
	right: z.string(),
	leftWidth: z.number(),
	zoneLeft: z.number(),
	leftToggle: z.tuple([z.number(), z.number()]),
	rightToggle: z.tuple([z.number(), z.number()]),
	pins: z.number(),
	isPinOnTop: z.boolean(),
	pinSaid: z.string().nullable(),
	pinKeys: z.string().nullable(),
	leftToggles: z.number(),
	isLeftToggleOnTopLeftChat: z.boolean(),
});

const HEAD_INK = `(() => {
	const head = document.querySelector(".wg-plate-head.is-app");
	const plate = document.querySelector(".wg-shell-plate.is-app");
	const crumb = document.querySelector(".wg-plate-head.is-app .wg-plate-crumb-first");
	return {
		fill: plate.style.getPropertyValue("--wg-plate-fill"),
		head: getComputedStyle(head).backgroundColor,
		inkClass: [...head.classList].find((name) => name.startsWith("sumi-ink")) ?? null,
		text: getComputedStyle(head).color,
		crumb: crumb ? getComputedStyle(crumb).color : null,
		strip: plate.hasAttribute("data-plate-strip"),
	};
})()`;

const STRIPES = `(() => {
	const canvas = document.createElement("canvas");
	canvas.width = 800;
	canvas.height = 44;
	const paint = canvas.getContext("2d");
	const gradient = paint.createLinearGradient(0, 0, 800, 0);
	gradient.addColorStop(0, "#ff7a59");
	gradient.addColorStop(0.5, "#7b5cff");
	gradient.addColorStop(1, "#1fb6ff");
	paint.fillStyle = gradient;
	paint.fillRect(0, 0, 800, 44);
	paint.fillStyle = "rgba(255,255,255,0.8)";
	for (let x = 0; x < 800; x += 40) paint.fillRect(x, 0, 14, 44);
	return canvas.toDataURL("image/png");
})()`;

function contrastOf(one: string, other: string): number {
	const lum = (colour: string): number => {
		const [r = 0, g = 0, b = 0] = (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
		const lin = (channel: number): number => {
			const unit = channel / 255;
			return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
	};
	const [lighter, darker] = [lum(one), lum(other)].sort((a, b) => b - a);
	return Math.round((((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)) * 100) / 100;
}

function isNear(got: number | undefined, wanted: number): boolean {
	return got !== undefined && Math.abs(got - wanted) <= SLACK_PX;
}

const BoxSchema = z
	.object({
		left: z.number(),
		width: z.number(),
		height: z.number(),
		radius: z.string(),
		background: z.string(),
		padding: z.string(),
	})
	.nullable();
const ButtonsSchema = z.array(z.tuple([z.string().nullable(), z.string().nullable()]));
const LayoutSchema = z.object({
	frame: BoxSchema,
	left: BoxSchema,
	chat: BoxSchema,
	app: BoxSchema,
	chatHead: BoxSchema,
	appHead: BoxSchema,
	chatWords: z.string().nullable(),
	appWords: z.array(z.string().nullable()),
	appButtons: ButtonsSchema,
	chatButtons: ButtonsSchema,
	mascots: z.number(),
	menuOffset: z.number().nullable(),
	rail: z.number(),
	edges: z.array(z.string().nullable()),
});
const FramesSchema = z.object({ count: z.number(), mean: z.number(), worst: z.number(), commits: z.number() });
const TimedSchema = z.object({ ms: z.number(), commits: z.number() });
const HeadInkSchema = z.object({
	fill: z.string(),
	head: z.string(),
	inkClass: z.string().nullable(),
	text: z.string(),
	crumb: z.string().nullable(),
	strip: z.boolean(),
});
const PointSchema = z.tuple([z.number(), z.number()]);

type Layout = z.infer<typeof LayoutSchema>;
type Frames = z.infer<typeof FramesSchema>;

async function layoutOf(page: AskedPage): Promise<Layout> {
	return LayoutSchema.parse(await page.ask(LAYOUT));
}

async function draggedEdge(page: AskedPage, edge: string, byPx: number): Promise<Frames> {
	const [x, y] = PointSchema.parse(await page.ask(`(${EDGE_AT})(${JSON.stringify(edge)})`));
	const to: PagePoint = [x + byPx, y];
	await page.ask(FRAME_RECORDER);
	await page.drag({ from: [x, y], to, steps: 30, stepMs: 16 });
	const during = FramesSchema.parse(await page.ask(FRAMES_TAKEN));
	await page.release(to);
	await waited(150);
	return during;
}

async function walk(theme: Theme): Promise<void> {
	const page = await paged(pageFileOf(theme), "shell-frame", { size: VIEW });
	try {
		const painted = await page.ask(FIRST_PAINT);
		if (typeof painted !== "number") {
			throw new Error(String(painted));
		}

		const startedAt = z.number().parse(await page.ask("Math.round(window.__STARTED_AT__)"));
		if (theme === "light") {
			timings.push({ action: "first paint of the frame (navigation start → frame painted)", ms: painted, commits: 0 });
			timings.push({
				action: "first paint of the frame (script start → frame painted)",
				ms: painted - startedAt,
				commits: 0,
			});
		}

		await waited(400);
		const boomAfterOpen = await page.ask(`document.getElementById("boom").textContent`);
		check(`${theme}: the studio stays drawn after opening`, boomAfterOpen === "", boomAfterOpen);
		const opened = await layoutOf(page);
		const frame = opened.frame;
		const left = opened.left;
		const chat = opened.chat;
		const app = opened.app;
		check(`${theme}: the frame is grey with an 8px edge`, frame?.padding === "8px", [
			frame?.padding,
			frame?.background,
		]);
		check(`${theme}: the left sidebar opens 268 wide`, isNear(left?.width, 268), left?.width);
		check(`${theme}: the chat plate opens 560 wide`, isNear(chat?.width, 560), chat?.width);
		check(`${theme}: plates are 14px cards`, chat?.radius === "14px" && app?.radius === "14px", [
			chat?.radius,
			app?.radius,
		]);
		check(`${theme}: both headers are 44 tall`, opened.chatHead?.height === 44 && opened.appHead?.height === 44, [
			opened.chatHead?.height,
			opened.appHead?.height,
		]);
		check(
			`${theme}: the gutters are 8px`,
			isNear((chat?.left ?? 0) - ((left?.left ?? 0) + (left?.width ?? 0)), 8) &&
				isNear((app?.left ?? 0) - ((chat?.left ?? 0) + (chat?.width ?? 0)), 8),
			[chat?.left, app?.left],
		);
		check(`${theme}: the chat header reads workspace / chat`, String(opened.chatWords).includes("/"), opened.chatWords);
		check(
			`${theme}: the chat header starts with an inert sidebar toggle`,
			JSON.stringify(opened.chatButtons).startsWith('[["Hide sidebar",null]'),
			opened.chatButtons,
		);
		check(
			`${theme}: the app header ends with more and an inert tabs toggle`,
			JSON.stringify(opened.appButtons).endsWith('["More",null],["Hide tabs",null]]'),
			opened.appButtons,
		);
		check(`${theme}: no mascot and no workspace rail`, opened.mascots === 0 && opened.rail === 0, [
			opened.mascots,
			opened.rail,
		]);
		check(`${theme}: two drag edges, chats and chat`, JSON.stringify(opened.edges) === '["left","chat"]', opened.edges);
		if (process.env["SHELL_SPY"])
			console.log(
				await page.ask(
					`(() => { const out = []; for (let at = document.querySelector(".wg-plate-head.is-chat .wg-studio-menu-trigger"); at && !at.classList.contains("wg-plate-head-row"); at = at.parentElement) { const box = at.getBoundingClientRect(); const look = getComputedStyle(at); out.push(at.className.slice(0, 40) + " top " + Math.round(box.top) + " h " + Math.round(box.height) + " pad " + look.padding + " disp " + look.display); } return out; })()`,
				),
			);
		check(
			`${theme}: the chat menu sits centred in its header`,
			opened.menuOffset !== null && Math.abs(opened.menuOffset) <= 1,
			opened.menuOffset,
		);
		writeFileSync(path.join(shotsAt, `frame-canvas-${theme}.png`), await page.shoot());

		const chatDrag = await draggedEdge(page, "chat", 200);
		const afterChat = await layoutOf(page);
		const kept = await page.ask(`localStorage.getItem("widgetarium-studio-chat-px")`);
		check(
			`${theme}: dragging the plate edge widens the chat by 200`,
			isNear(afterChat["chat"]?.width, Math.min(760, 560 + (opened.app?.width ?? 0) - 320)),
			afterChat["chat"]?.width,
		);
		check(`${theme}: the drag over the canvas never stalls a frame past 100ms`, chatDrag.worst < 100, chatDrag);
		check(`${theme}: the width is kept on release`, kept === String(afterChat["chat"]?.width), kept);
		if (theme === "light") {
			timings.push({
				action: `chat edge drag, mean frame (${String(chatDrag.count)} frames)`,
				ms: chatDrag.mean,
				commits: chatDrag.commits,
			});
			timings.push({
				action: "chat edge drag, worst frame",
				ms: chatDrag.worst,
				commits: chatDrag.commits,
			});
		}

		await draggedEdge(page, "chat", 2000);
		const widest = await layoutOf(page);
		check(`${theme}: the app plate keeps at least 320`, (widest["app"]?.width ?? 0) >= 319, widest["app"]?.width);
		await draggedEdge(page, "left", -400);
		const narrowest = await layoutOf(page);
		check(`${theme}: the left sidebar stops at 200`, isNear(narrowest["left"]?.width, 200), narrowest["left"]?.width);
		await draggedEdge(page, "chat", -2000);
		const chatLeast = await layoutOf(page);
		check(`${theme}: the chat plate stops at 320`, isNear(chatLeast["chat"]?.width, 320), chatLeast["chat"]?.width);
		await page.ask(
			`document.querySelector('[data-shell-edge="chat"]').dispatchEvent(new MouseEvent("dblclick", { bubbles: true })); true`,
		);
		await waited(150);
		check(
			`${theme}: a double press puts the chat back to 560`,
			isNear((await layoutOf(page))["chat"]?.width, 560),
			(await layoutOf(page))["chat"]?.width,
		);

		const toBrowser = TimedSchema.parse(
			await page.ask(
				timedUntilPainted(
					`window.__STUDIO__.state.show("browser")`,
					`document.querySelector('.wg-plate-head.is-app .wg-plate-target:not(:empty)')`,
				),
			),
		);
		if (theme === "light") timings.push({ action: "tab change canvas → browser, header redrawn", ...toBrowser });
		await waited(200);
		const inBrowser = await layoutOf(page);
		check(
			`${theme}: the browser header reads site / title`,
			JSON.stringify(inBrowser["appWords"]) === '["example.com/Example board"]',
			inBrowser["appWords"],
		);
		check(
			`${theme}: back is off and forward is on`,
			JSON.stringify(inBrowser["appButtons"]).startsWith('[["Back","true"],["Forward",null]'),
			inBrowser["appButtons"],
		);
		await page.ask(`document.querySelector('.wg-plate-head.is-app button[aria-label="Forward"]').click(); true`);
		check(
			`${theme}: forward reaches the browser`,
			JSON.stringify(await page.ask("window.__PAGES__.moves")) === '["forward"]',
			await page.ask("window.__PAGES__.moves"),
		);
		await page.ask(FRAME_RECORDER);
		await waited(1000);
		const idle = FramesSchema.parse(await page.ask(FRAMES_TAKEN));
		if (process.env["SHELL_SPY"]) console.log("idle second", idle);
		await page.ask("window.__WHY__ = {}; window.__PROFILE__ = {}; true");
		const browserDrag = await draggedEdge(page, "chat", 120);
		if (process.env["SHELL_SPY"]) console.log("rendered during the drag", await page.ask("window.__PROFILE__"));
		check(
			`${theme}: dragging beside the browser renders nothing until release`,
			browserDrag.commits === 0,
			browserDrag,
		);
		if (theme === "light") {
			timings.push({
				action: "chat edge drag beside the browser, worst frame",
				ms: browserDrag.worst,
				commits: browserDrag.commits,
			});
		}

		const toPink = TimedSchema.parse(
			await page.ask(
				timedUntilPainted(
					`window.__PAGES__.showLook({ fill: ${JSON.stringify(PINK)}, strip: null })`,
					`document.querySelector(".wg-shell-plate.is-app").style.getPropertyValue("--wg-plate-fill") === ${JSON.stringify(PINK)}`,
				),
			),
		);
		if (theme === "light") timings.push({ action: "page colour change → header repainted (pink)", ...toPink });
		await waited(400);
		const pink = HeadInkSchema.parse(await page.ask(HEAD_INK));
		check(`${theme}: a pink page makes a pink header`, pink["head"] === PINK, pink);
		check(
			`${theme}: ink on pink reads at 4.5:1 or more`,
			contrastOf(pink["text"] ?? "", PINK) >= 4.5,
			contrastOf(pink["text"] ?? "", PINK),
		);
		writeFileSync(path.join(shotsAt, `frame-browser-pink-${theme}.png`), await page.shoot());

		await page.ask(`window.__PAGES__.showLook({ fill: ${JSON.stringify(NAVY)}, strip: null }); true`);
		await waited(400);
		const navy = HeadInkSchema.parse(await page.ask(HEAD_INK));
		check(`${theme}: a navy page flips the ink light`, navy["inkClass"] === "sumi-ink-light", navy);
		check(
			`${theme}: light ink on navy reads at 4.5:1 or more`,
			contrastOf(navy["text"] ?? "", NAVY) >= 4.5,
			contrastOf(navy["text"] ?? "", NAVY),
		);

		const stripes = z.string().parse(await page.ask(STRIPES));
		await page.ask(
			`window.__PAGES__.showLook({ fill: "rgb(150, 120, 230)", strip: ${JSON.stringify(stripes)} }); true`,
		);
		await waited(400);
		const striped = HeadInkSchema.parse(await page.ask(HEAD_INK));
		check(`${theme}: a patterned page draws the strip under the header`, striped["strip"] === true, striped);
		writeFileSync(path.join(shotsAt, `frame-browser-strip-${theme}.png`), await page.shoot());

		const toCanvas = TimedSchema.parse(
			await page.ask(
				timedUntilPainted(
					`window.__STUDIO__.state.show("canvas")`,
					`document.querySelector(".wg-shell-plate.is-app").style.getPropertyValue("--wg-plate-fill") === ""`,
				),
			),
		);
		if (theme === "light")
			timings.push({ action: "tab change browser → canvas, header back to the plate", ...toCanvas });
		await waited(300);
		const back = HeadInkSchema.parse(await page.ask(HEAD_INK));
		check(
			`${theme}: leaving the browser gives the header back to the plate`,
			back["fill"] === "" && back["inkClass"] === null,
			back,
		);
		const bad = await page.ask(`document.getElementById("boom").textContent`);
		check(`${theme}: nothing failed on the page`, bad === "", bad);
	} finally {
		page.close();
	}
}

async function walkSides(theme: Theme): Promise<void> {
	const page = await paged(pageFileOf(theme), "shell-frame", { size: VIEW });
	try {
		await page.ask(FIRST_PAINT);
		await waited(300);
		const sidesAt = async (): Promise<z.infer<typeof SidesSchema>> => SidesSchema.parse(await page.ask(SIDES));
		const docked = await sidesAt();
		check(
			`${theme}: with the chat pane at the top left the left toggle stands there and nowhere else`,
			docked.leftToggles === 1 && docked.isLeftToggleOnTopLeftChat,
			docked,
		);
		await page.press(...docked.leftToggle);
		await waited(400);
		const hidden = await sidesAt();
		check(
			`${theme}: Hide chats folds the chats away and the app zone takes the room`,
			hidden.left === "hidden" && hidden.leftWidth === 0 && hidden.zoneLeft < docked.zoneLeft,
			hidden,
		);
		await page.hover(400, 400);
		await page.ask(`window.__REVEAL__ = ${REVEAL_DELAY_PROBE}; true`);
		await page.hover(1, 400);
		const revealMs = z.number().parse(await page.ask("window.__REVEAL__"));
		check(
			`${theme}: the edge shows the chats within 200ms, slide included`,
			revealMs >= 0 && revealMs <= 200,
			revealMs,
		);
		await waited(200);
		const edgeOpened = await sidesAt();
		check(
			`${theme}: resting at the left edge peeks the chats over the content without moving it`,
			edgeOpened.left === "peeking" && edgeOpened.zoneLeft === hidden.zoneLeft,
			edgeOpened,
		);
		await page.hover(1, 2);
		await waited(300);
		const outside = await sidesAt();
		check(`${theme}: the window's padding keeps the peek open`, outside.left === "peeking", outside);
		await page.hover(700, 400);
		await waited(400);
		const closed = await sidesAt();
		check(`${theme}: entering the content folds the peek away`, closed.left === "hidden", closed);
		await waited(700);
		await page.hover(60, 400);
		await page.hover(-40, 400);
		await waited(300);
		const overshot = await sidesAt();
		check(
			`${theme}: a pointer that overshoots past the window's left edge peeks the chats`,
			overshot.left === "peeking",
			overshot,
		);
		await page.hover(700, 400);
		await waited(900);
		await page.hover(...closed.leftToggle);
		await waited(300);
		const hovered = await sidesAt();
		check(
			`${theme}: hovering Show sidebar peeks the chats and the same button stays on top, saying Show sidebar ⌘B`,
			hovered.left === "peeking" &&
				hovered.pins === 1 &&
				hovered.isPinOnTop &&
				hovered.pinSaid === "Show sidebar" &&
				hovered.pinKeys === "⌘B",
			hovered,
		);
		await page.press(...hovered.leftToggle);
		await waited(400);
		const pinned = await sidesAt();
		check(`${theme}: pressing the pin docks the chats again`, pinned.left === "docked" && pinned.pins === 0, pinned);
		await page.press(...pinned.rightToggle);
		await waited(400);
		const tabsHidden = await sidesAt();
		check(`${theme}: Hide tabs folds the tabs away`, tabsHidden.right === "hidden", tabsHidden);
		await page.press(...tabsHidden.rightToggle);
		await waited(400);
		const tabsBack = await sidesAt();
		check(`${theme}: Show tabs brings the tabs back`, tabsBack.right === "docked", tabsBack);
		await page.ask(keydownScriptOf(false));
		await waited(400);
		const keyHidden = await sidesAt();
		check(`${theme}: ⌘B hides the sidebar`, keyHidden.left === "hidden", keyHidden);
		await page.ask(keydownScriptOf(false));
		await waited(400);
		const keyShown = await sidesAt();
		check(`${theme}: ⌘B again docks it`, keyShown.left === "docked", keyShown);
		await page.hover(700, 400);
		await page.ask(keydownScriptOf(true));
		await waited(400);
		const tabsKeyHidden = await sidesAt();
		check(
			`${theme}: ⌥⌘B hides the tabs`,
			tabsKeyHidden.right === "hidden" && tabsKeyHidden.left === "docked",
			tabsKeyHidden,
		);
		await page.hover(700, 400);
		await page.hover(1300, 400);
		await page.hover(1500, 400);
		await waited(300);
		const tabsOvershot = await sidesAt();
		check(`${theme}: overshooting the right edge peeks the tabs`, tabsOvershot.right === "peeking", tabsOvershot);
		const bad = await page.ask(`document.getElementById("boom").textContent`);
		check(`${theme}: nothing failed while the sides moved`, bad === "", bad);
	} finally {
		page.close();
	}
}

const TRAFFIC_LIGHTS_RIGHT_EDGE_PX = 76;
const TRAFFIC_LIGHTS_CLEARANCE_PX = 4;

async function walkLights(): Promise<void> {
	const page = await paged(pageFileOf("light", "?lights"), "shell-frame", { size: VIEW });
	try {
		await page.ask(FIRST_PAINT);
		await waited(300);
		const boxOfSelector = async (selector: string): Promise<readonly [number, number, number, number]> =>
			z
				.tuple([z.number(), z.number(), z.number(), z.number()])
				.parse(
					await page.ask(
						`(() => { const b = document.querySelector('${selector}').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; })()`,
					),
				);
		const docked = await boxOfSelector('[data-side-toggle="left"]');
		await page.press(docked[0] + docked[2] / 2, docked[1] + docked[3] / 2);
		await page.hover(700, 400);
		await waited(500);
		const hidden = await boxOfSelector('[data-side-toggle="left"]');
		check(
			"lights: with the sidebar hidden the toggle stands clear of the traffic lights",
			hidden[0] >= TRAFFIC_LIGHTS_RIGHT_EDGE_PX + TRAFFIC_LIGHTS_CLEARANCE_PX,
			hidden,
		);
		await page.hover(hidden[0] + hidden[2] / 2, hidden[1] + hidden[3] / 2);
		await waited(400);
		const pin = await boxOfSelector('[data-side-pin="left"]');
		check(
			"lights: over the floating sidebar the toggle keeps its place",
			JSON.stringify(pin) === JSON.stringify(hidden),
			pin,
		);
	} finally {
		page.close();
	}
}

await walkLights();
await walk("light");
await walk("dark");
await walkSides("light");
await walkSides("dark");
console.log("\naction | ms | commits");
for (const row of timings) console.log(`${row.action} | ${row.ms} | ${row.commits}`);
console.log(`\nscreenshots in ${shotsAt}`);
if (failed > 0) {
	console.log(`${failed} check(s) failed`);
	process.exit(1);
}
