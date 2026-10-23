import { studioAppHostParts } from "../packages/app-host/gateways/app-host-parts/studio.gateway.ts";
import type { AppHostParts } from "../packages/app-host/gateways/app-host-parts/app-host-parts.gateway.ts";
import { EssentialsGateway } from "../packages/app-host/gateways/essentials/essentials.gateway.ts";
import { PageFactsGateway } from "../packages/app-host/gateways/page-facts/page-facts.gateway.ts";
import { TabsSessionGateway } from "../packages/app-host/gateways/tabs-session/tabs-session.gateway.ts";
import type { KeptEssentials } from "../packages/app-host/shared/schema/essential.schema.ts";
import type { PageFacts } from "../packages/app-host/shared/schema/page-facts.schema.ts";
import type { KeptTabs } from "../packages/app-host/shared/schema/tabs-session.schema.ts";
import type { ActiveChat, ActiveChatPort } from "../packages/core/src/engine/active-chat-port.ts";
import type { StudioState } from "../packages/core/src/engine/studio-state-port.ts";

export const EXACT_WORKSPACE = "Exact tabs";
export const EXACT_COLUMN_PX = 240;
export const TEAR_OFF_ASKED: string[] = [];

const CHATS: readonly ActiveChat[] = [
	{
		id: "chat-release",
		title: "Release plan",
	},
	{
		id: "chat-translator",
		title: "Translator",
	},
];

interface BoardPage {
	readonly id: string;
	readonly title: string;
	readonly url: string;
}

const PAGES: readonly BoardPage[] = [
	{ id: "page-2", title: "Release plan.md", url: "https://files.local/notes/Release%20plan.md" },
	{ id: "page-3", title: "widget.tsx", url: "https://files.local/src/widget.tsx" },
	{ id: "page-4", title: "ginetik/widgetarium", url: "https://github.com/ginetik/widgetarium" },
	{ id: "page-5", title: "Material 3 Expressive", url: "https://m3.material.io/" },
	{ id: "page-7", title: "Invoices.csv", url: "https://files.local/Invoices.csv" },
	{ id: "page-8", title: "MON-1445 Translation gadget", url: "https://jira.local/browse/MON-1445" },
	{ id: "page-10", title: "Phrasebook.md", url: "https://files.local/Phrasebook.md" },
	{ id: "page-11", title: "DeepL API docs", url: "https://developers.deepl.com/" },
];

const SITE_ESSENTIALS: readonly (readonly [string, string])[] = [
	["GitHub", "https://github.com/"],
	["Files", "https://files.local/"],
	["Routines", "https://routines.local/"],
	["Mail", "https://mail.google.com/"],
	["Calendar", "https://calendar.google.com/"],
	["Figma", "https://figma.com/"],
	["Jira", "https://jira.local/"],
];

const KEPT_ESSENTIALS: KeptEssentials = {
	essentials: [
		{ id: "essential-1", app: "canvas", address: null, title: "Canvas", favicon: null },
		...SITE_ESSENTIALS.map(([title, address], at) => ({
			id: `essential-${at + 2}`,
			app: "browser" as const,
			address,
			title,
			favicon: null,
		})),
	],
	minted: 8,
};

const browserTab = (id: string, pageId: string): KeptTabs["tabs"][number] => ({
	id,
	app: "browser",
	pageId,
	label: null,
	essentialId: null,
});

const KEPT_TABS: KeptTabs = {
	tabs: [
		{ id: "tab-1", app: "canvas", pageId: null, label: null, essentialId: "essential-1" },
		browserTab("tab-2", "page-2"),
		browserTab("tab-3", "page-3"),
		browserTab("tab-4", "page-4"),
		browserTab("tab-5", "page-5"),
		{ id: "tab-6", app: "canvas", pageId: null, label: "Canvas · Release board", essentialId: null },
		browserTab("tab-7", "page-7"),
		browserTab("tab-8", "page-8"),
		{ id: "tab-9", app: "canvas", pageId: null, label: "Translator", essentialId: null },
		browserTab("tab-10", "page-10"),
		browserTab("tab-11", "page-11"),
	],
	lists: {
		"chat-release": [
			{ kind: "group", id: "group-12" },
			{ kind: "group", id: "group-13" },
			{ kind: "tab", id: "tab-7" },
			{ kind: "tab", id: "tab-8" },
		],
		"chat-translator": [
			{ kind: "tab", id: "tab-9" },
			{ kind: "tab", id: "tab-10" },
			{ kind: "tab", id: "tab-11" },
		],
	},
	groups: [
		{ id: "group-12", name: "Ship", hue: null, isOpen: true, tabIds: ["tab-2", "tab-3", "tab-4"] },
		{ id: "group-13", name: "Research", hue: "blue", isOpen: true, tabIds: ["tab-5", "tab-6"] },
	],
	shownId: "tab-2",
	lastShown: { "chat-release": "tab-2" },
	minted: 13,
	closed: [],
};

export class SwitchedChat implements ActiveChatPort {
	private chat: ActiveChat = CHATS[0] ?? { id: "chat-release", title: "Release plan" };
	private readonly listeners = new Set<() => void>();

	now = (): ActiveChat => this.chat;

	watch = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	};

	switchTo(id: string): void {
		this.chat = CHATS.find((chat) => chat.id === id) ?? this.chat;
		this.listeners.forEach((listener) => listener());
	}
}

class KeptTabsGateway extends TabsSessionGateway {
	kept(): KeptTabs {
		return KEPT_TABS;
	}

	keep(): void {}
}

export const NO_ESSENTIALS: KeptEssentials = { essentials: [], minted: 0 };

class KeptEssentialsGateway extends EssentialsGateway {
	constructor(private readonly held: KeptEssentials) {
		super();
	}

	kept(): KeptEssentials {
		return this.held;
	}

	keep(): void {}
}

export function exactAppHostParts(
	state: StudioState,
	activeChat: ActiveChatPort = new SwitchedChat(),
	essentials: KeptEssentials = KEPT_ESSENTIALS,
): AppHostParts {
	localStorage.setItem(
		`widgetarium-studio-tabs-column:${EXACT_WORKSPACE}`,
		JSON.stringify({ fullPx: EXACT_COLUMN_PX, side: "end", shutLists: [] }),
	);
	state.show("browser");
	return studioAppHostParts({
		studioState: state,
		workspace: EXACT_WORKSPACE,
		pageFactsGateway: new BoardPageFactsGateway(),
		tabsSessionGateway: new KeptTabsGateway(),
		essentialsGateway: new KeptEssentialsGateway(essentials),
		activeChat,
	});
}

class BoardPageFactsGateway extends PageFactsGateway {
	private facts: readonly PageFacts[] = PAGES.map((page) => factsOf(page.id, page.title, page.url));
	private readonly watchers = new Set<() => void>();

	isAvailable(): boolean {
		return true;
	}

	pages(): readonly PageFacts[] {
		return this.facts;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	openPage(pageId: string): void {
		this.change([...this.facts, factsOf(pageId, "New tab", "")]);
	}

	closePage(pageId: string): void {
		this.change(this.facts.filter((page) => page.pageId !== pageId));
	}

	showPage(): void {}

	canOpenOwnWindow(): boolean {
		return true;
	}

	openPageInOwnWindow(pageId: string): void {
		this.change(
			this.facts.map((page) =>
				page.pageId === pageId
					? {
							...page,
							isInOwnWindow: true,
						}
					: page,
			),
		);
	}

	focusPageWindow(): void {}

	watchTearOff(pageId: string): void {
		TEAR_OFF_ASKED.push(`watch ${pageId}`);
	}

	stopTearOff(): void {
		TEAR_OFF_ASKED.push("stop");
	}

	openAddress(pageId: string, address: string): void {
		this.change(
			this.facts.map((page) =>
				page.pageId === pageId
					? {
							...page,
							url: address,
							title: new URL(address).host,
						}
					: page,
			),
		);
	}

	reloadPage(): void {}

	stop(): void {}

	private change(next: readonly PageFacts[]): void {
		this.facts = next;
		this.watchers.forEach((changed) => changed());
	}
}

function factsOf(pageId: string, title: string, url: string): PageFacts {
	return {
		pageId,
		title,
		url,
		favicon: null,
		isInkReading: false,
		isAskWaiting: false,
		isClosedToInk: false,
		isInOwnWindow: false,
	};
}
