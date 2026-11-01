import { TauriBrowserPagesGateway } from "../packages/domain/browser/gateways/browser-pages/tauri/tauri.gateway.ts";
import { tauriPagesBridge } from "../packages/domain/browser/gateways/browser-pages/tauri/pages-bridge.ts";
import type {
	BrowserPagesIpc,
	PageFacts,
} from "../packages/domain/browser/gateways/browser-pages/tauri/pages-bridge.ts";
import { check, waitFor } from "./check-helpers.ts";

interface Called {
	readonly command: string;
	readonly args: Readonly<Record<string, unknown>> | undefined;
}

interface Box {
	left: number;
	top: number;
	width: number;
	height: number;
}

const PNG_WIDTH = 840;
const PNG_HEIGHT = 640;
const FIRST = "tab-1";

class FakeRust implements BrowserPagesIpc {
	readonly calls: Called[] = [];
	readonly evaluated: string[] = [];
	frameAnswers: { url: string; answer: string | null }[] = [];
	ownWindows: string[] = [];
	standing: string[] = [];
	isSnapshotRefused = false;
	pageText = { url: "https://example.com/", title: "Example", text: "Hello", hasSecretField: false };
	private listener: ((message: unknown) => void) | null = null;

	invoke(command: string, args?: Readonly<Record<string, unknown>>): Promise<unknown> {
		this.calls.push({ command, args });
		const name = command.replace("plugin:browser|", "");

		if (name === "snapshot") {
			return this.isSnapshotRefused
				? Promise.reject(new Error("An unknown error occurred"))
				: Promise.resolve(fakePng());
		}

		if (name === "evaluate") {
			return Promise.resolve(this.answerTo(String(args?.["script"])));
		}

		if (name === "evaluate_frames") {
			return Promise.resolve(this.frameAnswers);
		}

		if (name === "own_windows") {
			return Promise.resolve(this.ownWindows);
		}

		if (name === "standing_pages") {
			return Promise.resolve(this.standing);
		}

		if (name === "facts") {
			return Promise.resolve(facts("https://example.com/", "Example"));
		}

		if (name === "site_icon") {
			return Promise.resolve({
				icon: String(args?.["address"]).endsWith("/favicon.ico") ? FAKE_ICON : null,
				isReached: true,
			});
		}

		if (name === "open_studio_window") {
			return Promise.resolve({ window: "studio-2" });
		}

		return Promise.resolve(null);
	}

	channel(onMessage: (message: unknown) => void): unknown {
		this.listener = onMessage;
		return { id: 1 };
	}

	send(message: unknown): void {
		this.listener?.(message);
	}

	named(name: string): Called[] {
		return this.calls.filter((call) => call.command === `plugin:browser|${name}`);
	}

	private answerTo(script: string): string {
		this.evaluated.push(script);

		if (script.includes("innerText")) {
			return JSON.stringify(this.pageText);
		}

		if (script.includes("secretFieldShown")) {
			return "false";
		}

		if (script.includes("getContext")) {
			return JSON.stringify({ theme: null, page: "rgb(20, 20, 20)", canvas: "rgb(20, 20, 20)" });
		}

		if (script.includes("scrollWidth")) {
			return JSON.stringify({
				page: { width: 1000, height: 2000 },
				viewport: { x: 0, y: 0, width: 1000, height: 800 },
			});
		}

		if (script.includes("__wgSiteIcons")) {
			return JSON.stringify({ page: "https://example.com/", links: [] });
		}

		return "https://example.com/favicon.ico";
	}
}

const FAKE_ICON = "data:image/png;base64,iVBORw0KGgo=";

function fakePng(): ArrayBuffer {
	const bytes = new Uint8Array(24);
	const header = new DataView(bytes.buffer);
	header.setUint32(16, PNG_WIDTH);
	header.setUint32(20, PNG_HEIGHT);
	return bytes.buffer;
}

function facts(url: string, title: string, isLoading = false, window: string | null = "main"): PageFacts {
	return {
		url,
		title,
		canGoBack: url !== "https://example.com/",
		canGoForward: false,
		isLoading,
		window,
	};
}

const resizeCallbacks: (() => void)[] = [];

class FakeResizeObserver {
	constructor(private readonly changed: () => void) {}

	observe(): void {
		resizeCallbacks.push(this.changed);
	}

	disconnect(): void {
		resizeCallbacks.splice(resizeCallbacks.indexOf(this.changed), 1);
	}
}

function layBrowserGlobals(): () => void {
	const held = {
		ResizeObserver: Reflect.get(globalThis, "ResizeObserver"),
		MutationObserver: Reflect.get(globalThis, "MutationObserver"),
		requestAnimationFrame: Reflect.get(globalThis, "requestAnimationFrame"),
	};
	Object.assign(globalThis, {
		ResizeObserver: FakeResizeObserver,
		MutationObserver: window.MutationObserver,
		requestAnimationFrame: (run: () => void) => setTimeout(run, 0),
	});
	Object.defineProperty(document, "visibilityState", {
		value: "visible",
		configurable: true,
	});
	Object.assign(window.HTMLImageElement.prototype, {
		decode: () => Promise.resolve(),
	});
	return () => {
		Reflect.deleteProperty(document, "visibilityState");
		Object.assign(globalThis, held);
	};
}

function laidAt(element: HTMLElement, box: Box): void {
	const rect = () => ({
		...box,
		x: box.left,
		y: box.top,
		right: box.left + box.width,
		bottom: box.top + box.height,
		toJSON: () => box,
	});
	Object.assign(element, {
		getBoundingClientRect: rect,
		getClientRects: () => [rect()],
	});
}

async function resizedTo(container: HTMLElement, box: Box): Promise<void> {
	laidAt(container, box);

	for (const resized of resizeCallbacks) {
		resized();
	}

	await settledTicks();
}

async function settledTicks(): Promise<void> {
	for (let tick = 0; tick < 5; tick += 1) {
		await new Promise((done) => setTimeout(done, 0));
	}
}

async function checksNavigation(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	check("the gateway listens to Rust once", rust.named("open").length, 1);
	gateway.open(FIRST, "https://example.com/");
	await settledTicks();
	check("a first open creates the page in its profile", rust.named("create")[0]?.args, {
		page: FIRST,
		profile: "default",
	});
	check("then navigates it", rust.named("navigate")[0]?.args, { page: FIRST, url: "https://example.com/" });
	check("the tab loads while Rust works", gateway.tabs()[0]?.isLoading, true);
	check("nothing is committed before Rust says so", gateway.committed(FIRST)?.entry, 0);

	const settled = gateway.settled(FIRST);
	rust.send({ page: FIRST, kind: "committed", facts: facts("https://example.com/", "", true), failure: null });
	check("a commit counts an entry", gateway.committed(FIRST), { url: "https://example.com/", entry: 1 });
	rust.send({ page: FIRST, kind: "finished", facts: facts("https://example.com/", "Example"), failure: null });
	await settled;
	check("a finished load settles", gateway.tabs()[0]?.isLoading, false);
	check("a finished load names the page", gateway.tabs()[0]?.title, "Example");
	await waitFor(() => gateway.tabs()[0]?.favicon !== null);
	check("a finished load wears the site's icon as an image", gateway.tabs()[0]?.favicon, FAKE_ICON);

	rust.send({ page: FIRST, kind: "title", facts: facts("https://example.com/#second", "Second"), failure: null });
	check("an in-page move counts an entry", gateway.committed(FIRST), { url: "https://example.com/#second", entry: 2 });
	rust.send({ page: "tab-9", kind: "title", facts: facts("x", "y"), failure: null });
	check(
		"an event for another page leaves this page's facts alone",
		[gateway.tabs()[0]?.title, gateway.tabs()[0]?.url],
		["Second", "https://example.com/#second"],
	);
	rust.send({ page: FIRST, kind: "nonsense" });
	check("an unreadable event is dropped", gateway.tabs()[0]?.title, "Second");

	gateway.back(FIRST);
	gateway.forward(FIRST);
	gateway.reload(FIRST);
	await settledTicks();
	check(
		"back, forward and reload reach Rust",
		[rust.named("back").length, rust.named("forward").length, rust.named("reload").length],
		[1, 1, 1],
	);
}

async function checksFailures(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	const failure = {
		kind: "not-found",
		address: "https://nowhere.invalid/",
		code: "A server with the specified hostname could not be found.",
	};
	rust.send({ page: FIRST, kind: "failed", facts: facts("https://example.com/", "Second"), failure });
	check("a failed load shows the failure", gateway.tabs()[0]?.failure, failure);
	check("a failed load shows the address that failed", gateway.tabs()[0]?.url, "https://nowhere.invalid/");
	gateway.open(FIRST, "https://example.com/download.zip");
	rust.send({ page: FIRST, kind: "stopped", facts: facts("https://example.com/", "Second"), failure: null });
	check(
		"a stopped load settles without a failure",
		[gateway.tabs()[0]?.isLoading, gateway.tabs()[0]?.failure],
		[false, null],
	);
	rust.send({ page: FIRST, kind: "failed", facts: facts("https://example.com/", "Second"), failure });
	gateway.dismissFailure(FIRST);
	await settledTicks();
	check("dismissing a failure blanks the page in Rust", rust.named("navigate").at(-1)?.args, {
		page: FIRST,
		url: "about:blank",
	});
	check("dismissing a failure returns to a new tab", gateway.tabs()[0]?.url, "");
	gateway.showRefused(FIRST, "file:///etc/passwd");
	check("a refused scheme is shown, not loaded", gateway.tabs()[0]?.failure?.kind, "scheme");
	gateway.dismissFailure(FIRST);
	await settledTicks();
	check("dismissing a refusal rereads the page", gateway.tabs()[0]?.url, "https://example.com/");
}

async function checksPlacement(
	rust: FakeRust,
	gateway: TauriBrowserPagesGateway,
	container: HTMLElement,
): Promise<void> {
	const box: Box = { left: 320, top: 100, width: 840, height: 640 };
	laidAt(container, box);
	gateway.attach(container);
	await settledTicks();
	check("attaching sends the card's rect for the shown page", rust.named("place").at(-1)?.args, {
		page: FIRST,
		x: 320,
		y: 100,
		width: 840,
		height: 640,
		corner: 0,
		cornerSides: 0,
	});
	check("a drawn page is shown natively in the card's rect", rust.named("show").at(-1)?.args, {
		frames: [
			{
				page: FIRST,
				x: 320,
				y: 100,
				width: 840,
				height: 640,
				corner: 0,
				cornerSides: 0,
			},
		],
	});

	await resizedTo(container, {
		...box,
		width: 600,
	});
	check("a resized card moves the page", rust.named("place").at(-1)?.args, {
		page: FIRST,
		x: 320,
		y: 100,
		width: 600,
		height: 640,
		corner: 0,
		cornerSides: 0,
	});

	gateway.create("tab-2", null);
	gateway.show("tab-2");
	await settledTicks();
	check("a new tab hides the native page for its own new-tab card", rust.named("show").at(-1)?.args, { frames: [] });
	gateway.show(FIRST);
	await settledTicks();
	check(
		"switching back shows the kept page again",
		JSON.stringify(rust.named("show").at(-1)?.args).includes(`"page":"${FIRST}"`),
		true,
	);
	check("switching tabs never recreates a page", rust.named("create").length, 1);
}

async function checksOwnWindow(
	rust: FakeRust,
	gateway: TauriBrowserPagesGateway,
	container: HTMLElement,
): Promise<void> {
	gateway.openInOwnWindow(FIRST);
	await settledTicks();
	check(
		"opening a tab in its own window asks Rust for that window, titled by the page",
		rust.named("open_own_window").at(-1)?.args,
		{
			page: FIRST,
			title: gateway.tabs()[0]?.title,
		},
	);
	rust.send({ page: FIRST, kind: "own-window-opened", facts: facts("https://example.com/", "Example"), failure: null });
	await settledTicks();
	check(
		"a page in its own window is marked so and leaves the frames the studio shows",
		[gateway.isInOwnWindow(FIRST), rust.named("show").at(-1)?.args],
		[true, { frames: [] }],
	);
	const placedBefore = rust.named("place").length;
	await resizedTo(container, {
		left: 300,
		top: 90,
		width: 700,
		height: 600,
	});
	check("a resized card never moves a page that lives in its own window", rust.named("place").length, placedBefore);
	await resizedTo(container, {
		left: 320,
		top: 100,
		width: 600,
		height: 640,
	});
	gateway.focusOwnWindow(FIRST);
	await settledTicks();
	check("a press on a tab in its own window brings its window forward", rust.named("focus_own_window").at(-1)?.args, {
		page: FIRST,
	});
	rust.send({ page: FIRST, kind: "own-window-closed", facts: facts("https://example.com/", "Example"), failure: null });
	await settledTicks();
	check(
		"a returned page is drawn in the studio again",
		[gateway.isInOwnWindow(FIRST), JSON.stringify(rust.named("show").at(-1)?.args).includes(`"page":"${FIRST}"`)],
		[false, true],
	);
	await checksClosingOwnWindow(rust, gateway);
	await checksFreshTabOwnWindow(rust, gateway);
	await checksFreshTabTearOff(rust, gateway);
}

async function checksStudioWindows(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	const bridge = tauriPagesBridge(rust);
	check(
		"a tab torn off into a new studio window names the window Rust opened",
		[await bridge.openStudioWindow(FIRST, { x: 640, y: 120 }), rust.named("open_studio_window").at(-1)?.args],
		["studio-2", { tab: FIRST, at: { x: 640, y: 120 } }],
	);
	await bridge.focusWindow("studio-2");
	check("bringing a studio window forward names it", rust.named("focus_window").at(-1)?.args, { window: "studio-2" });
	const tabWindow = (): string | null | undefined => gateway.tabs().find((tab) => tab.id === FIRST)?.window;
	rust.send({
		page: FIRST,
		kind: "moved",
		facts: facts("https://example.com/", "Example", false, "studio-2"),
		failure: null,
	});
	check("a page Rust moved into another studio window says where it stands", tabWindow(), "studio-2");
	check("a page standing in another studio window counts as held by that window", gateway.isInOwnWindow(FIRST), true);
	rust.send({ kind: "window-closed", window: "studio-3" });
	check("another studio window closing leaves the page where it stands", tabWindow(), "studio-2");
	rust.send({ kind: "window-closed", window: "studio-2" });
	check("its studio window closing leaves the page in no window", tabWindow(), null);
	rust.send({ page: FIRST, kind: "moved", facts: facts("https://example.com/", "Example"), failure: null });
	check("a page shown again in the first studio says so", tabWindow(), "main");
}

async function checksFreshTabTearOff(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	const lifted = "page-lifted";
	gateway.create(lifted, null);
	gateway.tearOff(lifted, "tab-9");
	await settledTicks();
	check(
		"a dragged tab asks Rust for a studio window of its own, opened with that tab, where the drag ended",
		rust.named("open_studio_window").at(-1)?.args,
		{ tab: "tab-9", at: null },
	);
	rust.send({
		page: lifted,
		kind: "moved",
		facts: { ...facts("https://example.com/", "Example"), window: "studio-2" },
		failure: null,
	});
	await settledTicks();
	check("the page the new window took counts as held by another window", gateway.isInOwnWindow(lifted), true);
}

async function checksFreshTabOwnWindow(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	const fresh = "tab-4";
	gateway.create(fresh, null);
	gateway.openInOwnWindow(fresh);
	await settledTicks();
	const asked = rust.calls
		.filter((call) => call.args?.["page"] === fresh)
		.map((call) => call.command.replace("plugin:browser|", ""));
	check("a fresh tab gets its native page before Rust is asked for its own window", asked, [
		"create",
		"open_own_window",
	]);
}

async function checksClosingOwnWindow(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	const apart = "tab-3";
	gateway.create(apart, null);
	gateway.open(apart, "https://example.com/");
	await settledTicks();
	gateway.openInOwnWindow(apart);
	rust.send({ page: apart, kind: "own-window-opened", facts: facts("https://example.com/", "Example"), failure: null });
	await settledTicks();
	gateway.close(apart);
	await settledTicks();
	check(
		"closing a tab in its own window asks Rust to close its page and the studio forgets the window",
		[rust.named("close").at(-1)?.args, gateway.isInOwnWindow(apart)],
		[{ page: apart }, false],
	);
}

async function checksCover(rust: FakeRust): Promise<void> {
	const menu = document.createElement("div");
	menu.setAttribute("role", "menu");
	laidAt(menu, { left: 600, top: 110, width: 280, height: 300 });
	document.body.append(menu);
	await waitFor(() => rust.named("cover").length > 0);
	check("a menu over the card pictures the page first", rust.named("snapshot").at(-1)?.args, {
		page: FIRST,
		region: null,
		format: "jpeg",
	});
	check("then steps the native page aside", rust.named("cover").at(-1)?.args, { page: FIRST, covered: true });
	check("the picture stands in the card", document.querySelectorAll("[data-browser-page-cover]").length, 1);
	menu.remove();
	await waitFor(() => rust.named("cover").length > 1);
	check("a closed menu brings the page back", rust.named("cover").at(-1)?.args, { page: FIRST, covered: false });

	const anchor = document.createElement("div");
	anchor.className = "wg-portal";
	laidAt(anchor, { left: 600, top: 110, width: 0, height: 0 });
	document.body.append(anchor);
	await settledTicks();
	check("a zero-size menu anchor over the card leaves the page", rust.named("cover").length, 2);
	anchor.remove();

	const aside = document.createElement("div");
	aside.setAttribute("role", "tooltip");
	laidAt(aside, { left: 0, top: 0, width: 100, height: 40 });
	document.body.append(aside);
	await settledTicks();
	check("a tooltip away from the card leaves the page", rust.named("cover").length, 2);
	aside.remove();
}

async function checksCoverWithoutPicture(rust: FakeRust): Promise<void> {
	const covers = (): readonly unknown[] => rust.named("cover").map((call) => call.args);
	const coversBefore = covers().length;
	rust.isSnapshotRefused = true;
	const menu = document.createElement("div");
	menu.setAttribute("role", "menu");
	laidAt(menu, { left: 600, top: 110, width: 280, height: 300 });
	document.body.append(menu);
	await waitFor(() => covers().length > coversBefore);
	check("a menu over a page that cannot be pictured still steps the page aside", covers().at(-1), {
		page: FIRST,
		covered: true,
	});
	menu.remove();
	await waitFor(() => covers().length > coversBefore + 1);
	rust.isSnapshotRefused = false;
	check("closing that menu brings the page back", covers().at(-1), { page: FIRST, covered: false });
}

async function checksCoverFollowsShownPage(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	const next = "tab-2";
	const covers = (): string => JSON.stringify(rust.named("cover").map((call) => call.args));
	gateway.open(next, "https://example.org/");
	await settledTicks();
	const menu = document.createElement("div");
	menu.setAttribute("role", "menu");
	laidAt(menu, {
		left: 600,
		top: 110,
		width: 280,
		height: 300,
	});
	document.body.append(menu);
	await waitFor(() => covers().endsWith(`{"page":"${FIRST}","covered":true}]`));
	gateway.show(next);
	await waitFor(() => covers().includes(`{"page":"${next}","covered":true}`));
	await settledTicks();
	check(
		"switching the shown tab under an open menu covers the new page and brings the old one back",
		covers().endsWith(`{"page":"${next}","covered":true},{"page":"${FIRST}","covered":false}]`),
		true,
	);
	menu.remove();
	gateway.show(FIRST);
	await waitFor(() => covers().endsWith(`{"page":"${next}","covered":false}]`));
	await settledTicks();
}

function bubblingEvent(type: string): Event {
	const event = document.createEvent("Event");
	event.initEvent(type, true);
	return event;
}

async function checksCoverDuringDrag(rust: FakeRust): Promise<void> {
	const covers = (): string => JSON.stringify(rust.named("cover").map((call) => call.args));
	const row = document.createElement("div");
	document.body.append(row);
	row.dispatchEvent(bubblingEvent("dragstart"));
	await waitFor(() => covers().endsWith(`{"page":"${FIRST}","covered":true}]`));
	check(
		"a drag that starts in the studio pictures the native page and steps it aside, so the studio hears the drag over it",
		[rust.named("snapshot").at(-1)?.args, covers().endsWith(`{"page":"${FIRST}","covered":true}]`)],
		[{ page: FIRST, region: null, format: "jpeg" }, true],
	);
	row.dispatchEvent(bubblingEvent("dragend"));
	await waitFor(() => covers().endsWith(`{"page":"${FIRST}","covered":false}]`));
	check("the drag's end brings the native page back", covers().endsWith(`{"page":"${FIRST}","covered":false}]`), true);
	row.dispatchEvent(bubblingEvent("dragstart"));
	await waitFor(() => covers().endsWith(`{"page":"${FIRST}","covered":true}]`));
	document.dispatchEvent(bubblingEvent("pointermove"));
	await waitFor(() => covers().endsWith(`{"page":"${FIRST}","covered":false}]`));
	check(
		"a drag whose end never reached the document ends at the next pointer move",
		covers().endsWith(`{"page":"${FIRST}","covered":false}]`),
		true,
	);
	row.remove();
	await settledTicks();
}

async function checksReads(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	const content = await gateway.content(FIRST, "text");
	check("a read answers the page's text", content.text, "Hello");
	check(
		"a read runs as an isolated JSON script",
		rust.evaluated.some((script) => script.startsWith("JSON.stringify(")),
		true,
	);
	check("no secret field on a plain page", await gateway.hasSecretField(FIRST), false);
	rust.frameAnswers = [{ url: "https://pay.example/", answer: "true" }];
	check("a secret field inside a frame is found", await gateway.hasSecretField(FIRST), true);
	rust.frameAnswers = [
		{ url: "https://pay.example/", answer: "https://pay.example/card" },
		{ url: "https://ads.example/", answer: null },
	];
	check("frame addresses come from the frames", await gateway.frameUrls(FIRST), [
		"https://pay.example/card",
		"https://ads.example/",
	]);
	const shot = await gateway.capture(FIRST, { area: "viewport", region: { x: 500, y: 0, width: 400, height: 100 } });
	check("a picture is clamped to the card", rust.named("snapshot").at(-1)?.args, {
		page: FIRST,
		region: { x: 500, y: 0, width: 100, height: 100 },
		format: "png",
	});
	check("a picture reports its own size", [shot.width, shot.height], [PNG_WIDTH, PNG_HEIGHT]);
}

async function checksLooksInPanes(rust: FakeRust, gateway: TauriBrowserPagesGateway): Promise<void> {
	const panes = ["tab-5", "tab-6"].map((tabId, at) => {
		const container = document.createElement("div");
		document.body.append(container);
		laidAt(container, { left: 300 + at * 420, top: 100, width: 400, height: 600 });
		gateway.create(tabId, null);
		gateway.open(tabId, `https://example.com/${tabId}`);
		gateway.attachInPane(tabId, container);
		return { tabId, container };
	});
	await settledTicks();
	rust.send({ page: "tab-5", kind: "finished", facts: facts("https://example.com/tab-5", "Five"), failure: null });
	await waitFor(() => gateway.look("tab-5") !== null && gateway.look("tab-6") !== null);
	check(
		"every page drawn in a pane gets its own header colour, not only the shown page",
		[gateway.look("tab-5")?.fill ?? null, gateway.look("tab-6")?.fill ?? null].every((fill) => fill !== null),
		true,
	);
	panes.forEach(({ tabId, container }) => {
		gateway.detachFromPane(tabId, container);
		container.remove();
	});
	await settledTicks();
}

async function checksPressInPage(rust: FakeRust, container: HTMLElement): Promise<void> {
	const heard: string[] = [];
	const hear = (event: Event): void => void heard.push(event.type);
	container.addEventListener("pointerdown", hear);
	rust.send({ page: FIRST, kind: "pressed" });
	rust.send({ page: "tab-404", kind: "pressed" });
	await settledTicks();
	container.removeEventListener("pointerdown", hear);
	check("a press Rust reports inside a page reaches that page's card as a press, once", heard, ["pointerdown"]);
}

export async function checksTauriPages(): Promise<void> {
	const restore = layBrowserGlobals();
	const rust = new FakeRust();
	const gateway = new TauriBrowserPagesGateway(tauriPagesBridge(rust), { profileId: "default" });
	const container = document.createElement("div");
	document.body.append(container);

	try {
		await checksNavigation(rust, gateway);
		await checksFailures(rust, gateway);
		await checksPlacement(rust, gateway, container);
		await checksPressInPage(rust, container);
		await checksLooksInPanes(rust, gateway);
		await checksCover(rust);
		await checksCoverWithoutPicture(rust);
		await checksCoverFollowsShownPage(rust, gateway);
		await checksCoverDuringDrag(rust);
		await checksOwnWindow(rust, gateway, container);
		await checksStudioWindows(rust, gateway);
		await checksReads(rust, gateway);
		gateway.detach(container);
		await settledTicks();
		check("detaching hides every native page", rust.named("show").at(-1)?.args, { frames: [] });
		gateway.close(FIRST);
		await settledTicks();
		check("closing a tab closes its page in Rust", rust.named("close").at(-1)?.args, { page: FIRST });
		await checksAfterReload();
		await checksSecondWindowAdopts();
	} finally {
		container.remove();
		restore();
	}
}

async function checksSecondWindowAdopts(): Promise<void> {
	const rust = new FakeRust();
	rust.standing = ["page-torn"];
	const gateway = new TauriBrowserPagesGateway(tauriPagesBridge(rust), { profileId: "default", ownLabel: "studio-2" });
	await settledTicks();
	rust.send({
		page: "page-made-elsewhere",
		kind: "title",
		facts: facts("https://example.com/", "Example"),
		failure: null,
	});
	await settledTicks();
	check(
		"a page another studio window made is adopted the first time Rust tells about it, and marked as held there",
		[gateway.tabs().some((tab) => tab.id === "page-made-elsewhere"), gateway.isInOwnWindow("page-made-elsewhere")],
		[true, true],
	);
	const created = rust.named("create").map((call) => call.args?.["page"]);
	check(
		"a studio opening beside a running one adopts the pages Rust already holds, never creating them again",
		[
			gateway.tabs().some((tab) => tab.id === "page-torn"),
			created.includes("page-torn"),
			rust.named("facts").some((call) => call.args?.["page"] === "page-torn"),
		],
		[true, false, true],
	);
}

async function checksAfterReload(): Promise<void> {
	const rust = new FakeRust();
	rust.ownWindows = ["tab-7"];
	const gateway = new TauriBrowserPagesGateway(tauriPagesBridge(rust), { profileId: "default" });
	await settledTicks();
	check(
		"after a reload the studio asks Rust which pages have their own window and marks them",
		[rust.named("own_windows").length, gateway.isInOwnWindow("tab-7"), gateway.isInOwnWindow(FIRST)],
		[1, true, false],
	);
	check(
		"after a reload the studio tells Rust to show no page, so a page from before the reload is hidden",
		rust.named("show").map((call) => call.args),
		[{ frames: [] }],
	);
}

await checksTauriPages();
