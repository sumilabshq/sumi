import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { navigation } from "@widgetarium/navigation/contract";
import { linkTargetOf } from "@widgetarium/core/engine/sumi-link.js";
import { tabsSettled } from "../../shared/events/tabs.events.js";
import { apps as appsContract } from "@sumi/apps/contract";
import { openTabSettled, showTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import { settleAsked } from "../../shared/lib/tab-showing/tab-settling.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
import { AppKindSchema } from "../../shared/schema/app-tab.schema.js";
import type { AppKind } from "../../shared/schema/app-tab.schema.js";
import { LinkToOpenSchema } from "../../shared/schema/link.schema.js";
import type { z } from "zod";

type LinkToOpen = z.infer<typeof LinkToOpenSchema>;

type LinkDestination =
	| { readonly kind: "tab"; readonly id: string }
	| { readonly kind: "app"; readonly app: AppKind; readonly address: string };

const BROWSER_APP: AppKind = "browser";
const BROWSER_PAGE_APP: AppKind = "browser-page";
const WEB_SCHEMES: ReadonlySet<string> = new Set(["https:", "http:"]);
const NO_SUCH_APP = "Sumi has no app named {app}";
const OPENED = "[widgetarium] link {href} opened {where}";

export const openLink = command()
	.public()
	.input(LinkToOpenSchema)
	.idempotencyKey(Repeatable)
	.handle(async (link, { send, emit, ...injects }) => {
		const reach = { injects, send, told: () => emit(tabsSettled) };
		const destination = await destinationOf(reach, link.href);

		if (typeof destination === "string") {
			return refuse(destination);
		}

		const where = await openDestination(reach, destination, link);
		console.info(OPENED.replace("{href}", JSON.stringify(link.href)).replace("{where}", where));
	});

async function destinationOf(reach: TabsReach, href: string): Promise<LinkDestination | string> {
	if (isWebPage(href)) {
		const app = (await isKnownApp(reach, BROWSER_PAGE_APP)) ? BROWSER_PAGE_APP : BROWSER_APP;
		return { kind: "app", app, address: href };
	}

	const read = linkTargetOf(href);

	if (!read.ok) {
		return read.reason;
	}

	if (read.target.kind === "chat" || read.target.kind === "tab") {
		return { kind: "tab", id: read.target.id };
	}

	const app = AppKindSchema.safeParse(read.target.app);
	return app.success && (await isKnownApp(reach, read.target.app))
		? { kind: "app", app: app.data, address: read.target.address }
		: NO_SUCH_APP.replace("{app}", read.target.app);
}

async function openDestination(reach: TabsReach, destination: LinkDestination, link: LinkToOpen): Promise<string> {
	if (destination.kind === "tab") {
		await showTabSettled(reach, { id: destination.id });
		return `by showing ${destination.id}`;
	}

	if (link.home !== null) {
		const beside = await openBesideHome(reach, { ...destination, home: link.home, place: link.place });

		if (beside !== null) {
			return `as ${beside} ${link.place} ${link.home}`;
		}
	}

	return openAsOldTab(reach, destination, link);
}

interface BesideHome {
	readonly app: AppKind;
	readonly address: string;
	readonly home: string;
	readonly place: LinkToOpen["place"];
}

async function openBesideHome(reach: TabsReach, { app, address, home, place }: BesideHome): Promise<string | null> {
	const opened = await settleAsked(reach, (at) =>
		reach.send(navigation.flows.openLinkTab, { at, homeId: home, app, address, place }),
	);
	return opened.id;
}

async function openAsOldTab(
	reach: TabsReach,
	{ app, address }: Extract<LinkDestination, { kind: "app" }>,
	{ opensNew, home }: LinkToOpen,
): Promise<string> {
	const under = opensNew ? null : home;
	await openTabSettled(reach, { app, list: under, groupId: null, address, show: true, reusesHeld: !opensNew });
	return opensNew ? "in a new tab" : under === null ? "" : `as a sub-page of ${under}`;
}

function isWebPage(href: string): boolean {
	return WEB_SCHEMES.has(URL.parse(href)?.protocol ?? "");
}

async function isKnownApp(reach: TabsReach, app: string): Promise<boolean> {
	const { apps } = await reach.send(appsContract.apps.all);
	return apps.some(({ id }) => id === app);
}
