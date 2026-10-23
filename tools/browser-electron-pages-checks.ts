import { ElectronBrowserPagesGateway } from "../packages/browser/gateways/browser-pages/electron/electron.gateway.ts";
import { check, waitFor } from "./check-helpers.ts";

interface FakeContents {
	readonly lifecycle: string[];
}

const contentsById = new Map<number, FakeContents>();
let viewsMade = 0;

function fakeRemote(): object {
	const session = {
		setPermissionRequestHandler: () => undefined,
		setPermissionCheckHandler: () => undefined,
		on: () => undefined,
	};
	return {
		session: {
			fromPartition: () => session,
		},
		webContents: {
			fromId: (id: number) => contentsOf(id),
		},
	};
}

function contentsOf(id: number): object {
	const held = contentsById.get(id) ?? {
		lifecycle: [],
	};
	contentsById.set(id, held);
	let isAttached = false;
	return {
		setBackgroundThrottling: () => undefined,
		debugger: {
			isAttached: () => isAttached,
			attach: () => {
				isAttached = true;
			},
			sendCommand: (_method: string, params: { readonly state: string }) => {
				held.lifecycle.push(params.state);
				return Promise.resolve({});
			},
		},
	};
}

function fakeWebview(made: HTMLElement): HTMLElement {
	viewsMade += 1;
	const contentsId = viewsMade;
	let url = "";
	Object.assign(made, {
		loadURL: (next: string) => {
			url = next;
			return Promise.resolve();
		},
		getURL: () => url || (made.getAttribute("src") ?? ""),
		getTitle: () => "",
		canGoBack: () => false,
		canGoForward: () => false,
		goBack: () => undefined,
		goForward: () => undefined,
		reload: () => undefined,
		stop: () => undefined,
		getWebContentsId: () => contentsId,
		capturePage: () => Promise.resolve(null),
	});
	setTimeout(() => {
		const ready = made.ownerDocument.createEvent("Event");
		ready.initEvent("dom-ready");
		made.dispatchEvent(ready);
	}, 0);
	return made;
}

function layFakeWebviews(): void {
	const make = document.createElement.bind(document);
	Reflect.set(document, "createElement", (name: string) =>
		name === "webview" ? fakeWebview(make("div")) : make(name),
	);
	Object.defineProperty(document, "visibilityState", {
		value: "visible",
		configurable: true,
	});
}

function pagesIn(container: HTMLElement): readonly HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>("[data-browser-page]")];
}

function lifecycleOf(view: HTMLElement | undefined): readonly string[] {
	const id: unknown = view === undefined ? null : Reflect.apply(Reflect.get(view, "getWebContentsId"), view, []);
	return typeof id === "number" ? (contentsById.get(id)?.lifecycle ?? []) : [];
}

export async function checksElectronPages(): Promise<void> {
	layFakeWebviews();
	const gateway = new ElectronBrowserPagesGateway(fakeRemote(), "default");
	const container = document.createElement("div");
	Object.defineProperty(container, "getClientRects", {
		value: () => [container],
	});
	document.body.append(container);
	gateway.attach(container);
	gateway.create("page-b");
	gateway.create("page-c");
	gateway.open("tab-1", "https://example.com/");
	gateway.open("page-b", "https://example.org/");
	gateway.open("page-c", "https://example.net/");
	const [first, second, third] = pagesIn(container);
	await waitFor(() => gateway.committed("page-c") !== null);
	gateway.show("page-b");
	gateway.freeze("tab-1");
	gateway.freeze("page-c");
	gateway.thaw("page-b");
	check(
		"each tab draws its own webview, all kept in the one container",
		pagesIn(container).length === 3 && [first, second, third].every((view) => view?.parentElement === container),
		true,
	);
	check(
		"a hidden page stays mounted with visibility hidden, the shown one visible",
		[first, second, third].map((view) => view?.style.visibility),
		["hidden", "visible", "hidden"],
	);
	check(
		"only the shown page is on screen",
		["tab-1", "page-b", "page-c"].map((tabId) => gateway.isOnScreen(tabId)),
		[false, true, false],
	);
	await waitFor(() => lifecycleOf(first).length === 1);
	check("freezing a hidden page sends the frozen lifecycle state", lifecycleOf(first), ["frozen"]);
	gateway.show("tab-1");
	gateway.thaw("tab-1");
	gateway.freeze("page-b");
	await waitFor(() => lifecycleOf(first).length === 2);
	check("showing it again wakes it", lifecycleOf(first), ["frozen", "active"]);
	check(
		"switching moves no webview: the same elements stand in the same container",
		pagesIn(container).every((view, at) => view === [first, second, third][at]),
		true,
	);
	gateway.close("page-c");
	check(
		"closing a page removes its webview and its tab",
		[pagesIn(container).length, third?.isConnected, gateway.tabs().map((tab) => tab.id)],
		[2, false, ["tab-1", "page-b"]],
	);
}
