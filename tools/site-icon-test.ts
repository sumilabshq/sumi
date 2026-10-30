import { JSDOM } from "jsdom";
import { check, tally } from "./check-helpers.ts";
import { iconAddressesOf, MOST_ICON_ADDRESSES } from "../packages/domain/browser/shared/lib/site-icon-choice.ts";
import {
	ICON_KEPT_MS,
	MOST_KEPT_CHARACTERS,
	MOST_KEPT_ICONS,
	NO_ICON_KEPT_MS,
	freshIconAt,
	latestIconOfOrigin,
	withIconKept,
} from "../packages/domain/browser/shared/lib/site-icon-cache.ts";
import { PageIconsReadSchema } from "../packages/domain/browser/shared/schema/site-icon.schema.ts";
import type {
	IconLink,
	KeptSiteIcon,
	SiteIconAnswer,
} from "../packages/domain/browser/shared/schema/site-icon.schema.ts";
import {
	ICONS_UNCHANGED,
	readPageIconsScript,
} from "../packages/domain/browser/gateways/browser-pages/tauri/page-icon-script.ts";
import { PageIcons } from "../packages/domain/browser/gateways/browser-pages/tauri/page-icons.ts";
import { MemorySiteIconsGateway } from "../packages/domain/browser/gateways/site-icons/memory.gateway.ts";
import { TauriSiteFilesGateway } from "../packages/domain/browser/gateways/site-files/tauri/tauri.gateway.ts";
import type { PagesBridge } from "../packages/domain/browser/gateways/browser-pages/tauri/pages-bridge.ts";

const PAGE = "https://mail.example/inbox";
const FALLBACK = "https://mail.example/favicon.ico";
const ICON = "data:image/png;base64,iVBORw0KGgo=";
const UNREAD_ICON = "data:image/png;base64,R0lGODlh";
const NOW = 1_800_000_000_000;

function linkOf(href: string, rel: string, sizes = "", type = "", isMatching = true): IconLink {
	return {
		href,
		rel,
		sizes,
		type,
		isMatching,
	};
}

function keptOf(address: string, icon: string | null, fetchedAt: number): KeptSiteIcon {
	return {
		address,
		origin: new URL(address).origin,
		icon,
		fetchedAt,
	};
}

function choiceChecks(): void {
	const links = [
		linkOf("https://mail.example/16.png", "icon", "16x16", "image/png"),
		linkOf("https://mail.example/touch.png", "apple-touch-icon", "180x180"),
		linkOf("https://mail.example/32.png", "icon", "32x32", "image/png"),
		linkOf("https://mail.example/mask.svg", "mask-icon"),
		linkOf("https://mail.example/logo.svg", "icon", "", "image/svg+xml"),
		linkOf("https://mail.example/192.png", "icon", "192x192", "image/png"),
	];
	check(
		"a scalable icon comes first, then the smallest at least 32px, then larger, capped",
		iconAddressesOf({ page: PAGE, links }),
		[
			"https://mail.example/logo.svg",
			"https://mail.example/32.png",
			"https://mail.example/192.png",
			"https://mail.example/16.png",
		].slice(0, MOST_ICON_ADDRESSES),
	);
	check("a page naming no icon falls back to /favicon.ico on its origin", iconAddressesOf({ page: PAGE, links: [] }), [
		FALLBACK,
	]);
	check(
		"an apple touch icon stands after /favicon.ico, a mask icon is never used",
		iconAddressesOf({
			page: PAGE,
			links: [
				linkOf("https://mail.example/touch.png", "apple-touch-icon"),
				linkOf("https://mail.example/m.svg", "mask-icon"),
			],
		}),
		[FALLBACK, "https://mail.example/touch.png"],
	);
	check(
		"an icon for the other colour scheme ranks below one that matches",
		iconAddressesOf({
			page: PAGE,
			links: [
				linkOf("https://mail.example/dark.svg", "icon", "any", "", false),
				linkOf("https://mail.example/plain.ico", "shortcut icon"),
			],
		}),
		["https://mail.example/plain.ico", "https://mail.example/dark.svg", FALLBACK],
	);
	check(
		"a page that is not on the web has no icon to look for",
		iconAddressesOf({ page: "about:blank", links: [] }),
		[],
	);
}

function cacheChecks(): void {
	const kept = [keptOf(FALLBACK, ICON, NOW)];
	check("a fresh icon is a hit", freshIconAt(kept, FALLBACK, NOW + ICON_KEPT_MS - 1)?.icon, ICON);
	check("an icon a week old is a miss", freshIconAt(kept, FALLBACK, NOW + ICON_KEPT_MS), null);
	const none = [keptOf(FALLBACK, null, NOW)];
	check(
		"a site with no icon is asked again after hours, not a week",
		freshIconAt(none, FALLBACK, NOW + NO_ICON_KEPT_MS),
		null,
	);
	check(
		"the latest icon of an origin is remembered for its next page",
		latestIconOfOrigin(kept, "https://mail.example", NOW),
		ICON,
	);
	const many = Array.from({ length: MOST_KEPT_ICONS }, (_, at) =>
		keptOf(`https://site${at}.example/favicon.ico`, ICON, NOW + at),
	);
	const capped = withIconKept(many, keptOf(FALLBACK, ICON, NOW + MOST_KEPT_ICONS));
	check(
		"the cache keeps at most its count, dropping the oldest",
		[capped.length, capped.some((icon) => icon.address === "https://site0.example/favicon.ico"), capped[0]?.address],
		[MOST_KEPT_ICONS, false, FALLBACK],
	);
	const heavy = "data:image/png;base64," + "A".repeat(MOST_KEPT_CHARACTERS / 2);
	const weighed = withIconKept(
		[keptOf("https://a.example/i.png", heavy, NOW), keptOf("https://b.example/i.png", heavy, NOW + 1)],
		keptOf(FALLBACK, ICON, NOW + 2),
	);
	check(
		"the cache keeps at most its characters, dropping the oldest",
		weighed.map((icon) => icon.address),
		[FALLBACK, "https://b.example/i.png"],
	);
	check(
		"a newer fetch of one address replaces the older",
		withIconKept(kept, keptOf(FALLBACK, UNREAD_ICON, NOW + 1)).map((icon) => icon.icon),
		[UNREAD_ICON],
	);
}

function pageOf(): JSDOM {
	const dom = new JSDOM('<!doctype html><head><link rel="icon" href="/read.png" sizes="32x32"></head><body></body>', {
		url: PAGE,
		runScripts: "outside-only",
	});
	Object.assign(dom.window, { matchMedia: () => ({ matches: true }) });
	return dom;
}

const ranIn = (dom: JSDOM, isForced: boolean): string => String(dom.window.eval(readPageIconsScript(isForced)));
const firstHrefIn = (answer: string): string | undefined =>
	answer === ICONS_UNCHANGED ? answer : PageIconsReadSchema.parse(JSON.parse(answer)).links[0]?.href;
const settled = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

async function scriptChecks(): Promise<void> {
	const dom = pageOf();
	check("the first read names the page's icon links", firstHrefIn(ranIn(dom, false)), "https://mail.example/read.png");
	check("an unchanged head answers that it is unchanged", ranIn(dom, false), ICONS_UNCHANGED);
	check("a forced read answers anyway", firstHrefIn(ranIn(dom, true)), "https://mail.example/read.png");
	dom.window.document.querySelector("link")?.setAttribute("href", "/unread-3.png");
	await settled();
	check(
		"an unread count swapping the icon is read again",
		firstHrefIn(ranIn(dom, false)),
		"https://mail.example/unread-3.png",
	);
	check("and then the head is unchanged again", ranIn(dom, false), ICONS_UNCHANGED);
}

function iconServedAt(address: string): string | null {
	if (address.includes("unread")) {
		return UNREAD_ICON;
	}

	return address.endsWith("read.png") ? ICON : null;
}

class FakeIconBridge implements Pick<PagesBridge, "evaluate"> {
	readonly fetched: string[] = [];
	answer = JSON.stringify({ page: PAGE, links: [linkOf("https://mail.example/read.png", "icon", "32x32")] });

	evaluate(): Promise<string> {
		return Promise.resolve(this.answer);
	}

	isOffline = false;

	siteIcon(address: string): Promise<SiteIconAnswer> {
		this.fetched.push(address);

		if (this.isOffline) {
			return Promise.resolve({ icon: null, isReached: false });
		}

		return Promise.resolve({ icon: iconServedAt(address), isReached: true });
	}
}

const BACK_OFF_MS = 5 * 60 * 1000;

function siteFilesOver(bridge: FakeIconBridge, clock: { now: number }): TauriSiteFilesGateway {
	const ipc = {
		invoke: (_command: string, args?: Readonly<Record<string, unknown>>) => bridge.siteIcon(String(args?.["address"])),
		channel: () => null,
	};
	return new TauriSiteFilesGateway(ipc, () => clock.now);
}

async function pageIconsChecks(): Promise<void> {
	const bridge = new FakeIconBridge();
	const worn = new Map<string, string>();
	const wornFor = new Map<string, string>();
	const siteIcons = new MemorySiteIconsGateway();
	const studio = { isOnScreen: true };
	const icons = new PageIcons({
		bridge,
		siteIcons,
		siteFiles: siteFilesOver(bridge, { now: NOW }),
		drawnPages: () => ["tab-1", "tab-2"],
		isOnScreen: () => studio.isOnScreen,
		wear: (page, { favicon, origin }) => {
			worn.set(page, favicon);
			wornFor.set(page, origin);
		},
	});
	await icons.readNow("tab-1");
	check("a finished page wears its fetched icon", worn.get("tab-1"), ICON);
	await icons.readNow("tab-2");
	check(
		"a second page of the site is served from the cache, never fetched again",
		[worn.get("tab-2"), bridge.fetched.length],
		[ICON, 1],
	);
	bridge.answer = JSON.stringify({ page: PAGE, links: [linkOf("https://mail.example/unread-3.png", "icon", "32x32")] });
	studio.isOnScreen = false;
	await icons.reread();
	check("a poll while the studio is off screen reads nothing", worn.get("tab-1"), ICON);
	studio.isOnScreen = true;
	await icons.reread();
	check("a poll after the head changed wears the new icon", worn.get("tab-1"), UNREAD_ICON);
	check("two pages asking for one icon at once fetch it once", bridge.fetched.length, 2);
	check(
		"the fetched icons are kept in the profile's cache",
		siteIcons
			.siteIcons()
			.map((icon) => icon.address)
			.sort(),
		["https://mail.example/read.png", "https://mail.example/unread-3.png"],
	);
	icons.wearRemembered("tab-3", "https://mail.example/other");
	check("a new page of a known origin wears its icon at once", worn.get("tab-3") !== undefined, true);
	await cdnAndOfflineChecks();
}

async function cdnAndOfflineChecks(): Promise<void> {
	const bridge = new FakeIconBridge();
	const worn = new Map<string, string>();
	const siteIcons = new MemorySiteIconsGateway();
	const clock = { now: NOW };
	const icons = new PageIcons({
		bridge,
		siteIcons,
		siteFiles: siteFilesOver(bridge, clock),
		drawnPages: () => [],
		isOnScreen: () => true,
		wear: (page, { favicon, origin }) => worn.set(page, `${origin} ${favicon}`),
	});
	bridge.answer = JSON.stringify({ page: PAGE, links: [linkOf("https://cdn.example/read.png", "icon", "32x32")] });
	bridge.isOffline = true;
	await icons.readNow("tab-1");
	check(
		"an unreached site is not kept as having no icon",
		[worn.get("tab-1"), siteIcons.siteIcons().length],
		[undefined, 0],
	);
	bridge.isOffline = false;
	await icons.readNow("tab-1");
	check("an unreached icon is not asked again for 5 min", [worn.get("tab-1"), bridge.fetched.length], [undefined, 2]);
	clock.now += BACK_OFF_MS;
	await icons.readNow("tab-1");
	check(
		"the next read after the back-off fetches again and wears it",
		worn.get("tab-1"),
		`https://mail.example ${ICON}`,
	);
	icons.wearRemembered("tab-2", "https://mail.example/next");
	check(
		"an icon served from a CDN is remembered for the page's origin",
		worn.get("tab-2"),
		`https://mail.example ${ICON}`,
	);
}

choiceChecks();
cacheChecks();
await scriptChecks();
await pageIconsChecks();
console.log(tally.failed ? `site icons: ${tally.failed} check(s) failed` : "site icons: all checks passed");
process.exit(tally.failed ? 1 : 0);
