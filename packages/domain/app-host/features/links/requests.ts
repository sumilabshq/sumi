import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { linkTargetOf } from "@widgetarium/core/engine/sumi-link.js";
import type { LinkTarget } from "@widgetarium/core/engine/sumi-link.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { AppsQuery } from "@sumi/apps";
import { openTabSettled, showChatSettled, showTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
import { AppKindSchema } from "../../shared/schema/app-tab.schema.js";
import type { AppKind } from "../../shared/schema/app-tab.schema.js";
import { LinkToOpenSchema } from "../../shared/schema/link.schema.js";

interface LinkOpening {
	readonly target: LinkTarget;
	readonly opensNew: boolean;
	readonly reach: TabsReach;
}

const BROWSER_APP: AppKind = "browser";
const BROWSER_PAGE_APP: AppKind = "browser-page";
const WEB_SCHEMES: ReadonlySet<string> = new Set(["https:", "http:"]);
const NO_SUCH_APP = "Sumi has no app named {app}";
const OPENED = "[widgetarium] link {href} opened{where}";

export const OpenLinkCommand = command("open-link")
	.public()
	.input(LinkToOpenSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ href, opensNew }, { send, emit, ...injects }) => {
		const reach = { injects, send, told: () => emit(TabsSettledEvent) };
		const refusal = isWebPage(href)
			? await openWebPageLinked(href, opensNew, reach)
			: await openSumiLinked(href, opensNew, reach);

		if (refusal !== null) {
			return refuse(refusal);
		}

		console.info(OPENED.replace("{href}", JSON.stringify(href)).replace("{where}", opensNew ? " in a new tab" : ""));
	});

function isWebPage(href: string): boolean {
	return WEB_SCHEMES.has(URL.parse(href)?.protocol ?? "");
}

async function openSumiLinked(href: string, opensNew: boolean, reach: TabsReach): Promise<string | null> {
	const read = linkTargetOf(href);
	return read.ok ? openTargetLinked({ target: read.target, opensNew, reach }) : read.reason;
}

async function openTargetLinked({ target, opensNew, reach }: LinkOpening): Promise<string | null> {
	if (target.kind === "chat") {
		await showChatSettled(reach, { chatId: target.id, paneId: null });
		return null;
	}

	if (target.kind === "tab") {
		await showTabSettled(reach, target.id);
		return null;
	}

	const app = AppKindSchema.safeParse(target.app);

	if (!app.success || !(await isKnownApp(reach, target.app))) {
		return NO_SUCH_APP.replace("{app}", target.app);
	}

	await openAppTab(reach, { app: app.data, address: target.address, opensNew });
	return null;
}

async function openWebPageLinked(href: string, opensNew: boolean, reach: TabsReach): Promise<null> {
	const app = (await isKnownApp(reach, BROWSER_PAGE_APP)) ? BROWSER_PAGE_APP : BROWSER_APP;
	await openAppTab(reach, { app, address: href, opensNew });
	return null;
}

interface AppTabAsk {
	readonly app: AppKind;
	readonly address: string;
	readonly opensNew: boolean;
}

async function openAppTab(reach: TabsReach, { app, address, opensNew }: AppTabAsk): Promise<void> {
	await openTabSettled(reach, {
		app,
		list: null,
		groupId: null,
		address,
		show: true,
		reusesHeld: !opensNew,
	});
}

async function isKnownApp(reach: TabsReach, app: string): Promise<boolean> {
	const { apps } = await reach.send(AppsQuery);
	return apps.some(({ id }) => id === app);
}
