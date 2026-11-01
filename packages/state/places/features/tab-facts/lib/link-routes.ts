import { linkOf, linkTargetOf } from "@widgetarium/core/engine/sumi-link.js";
import { heldTabOf } from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTab, HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import { pushedTab } from "../../../shared/lib/tabs/tab-history.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan, PlacedTabsMove } from "../../../shared/lib/settling/settling.js";
import type { AskedLink, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import type { LinkAsk } from "../../../shared/schema/tab-facts.schema.js";

export type LinkRoute =
	| {
			readonly kind: "navigate";
			readonly address: string;
	  }
	| {
			readonly kind: "ask";
			readonly href: string;
	  }
	| {
			readonly kind: "refused";
			readonly reason: string;
	  };

const WEB_SCHEMES: ReadonlySet<string> = new Set(["https:", "http:"]);
const NOT_A_LINK = "{href} opens nowhere: an app links to /<page>, sumi://<app>/<page> or an http(s):// page";
const NO_TAB = 'no open tab "{id}" to follow a link from';
const NOT_ASKED = 'no link "{id}" is waiting to be opened';

export function linkRouteOf(app: string, { href, inNewTab }: LinkAsk): LinkRoute {
	if (href.startsWith("/") && !href.startsWith("//")) {
		return sameAppRouteOf(app, href.slice(1), inNewTab);
	}

	if (WEB_SCHEMES.has(URL.parse(href)?.protocol ?? "")) {
		return {
			kind: "ask",
			href,
		};
	}

	const read = linkTargetOf(href);

	if (!read.ok) {
		return {
			kind: "refused",
			reason: href.startsWith("sumi:") ? read.reason : NOT_A_LINK.replace("{href}", href),
		};
	}

	const { target } = read;
	return target.kind === "page" && target.app === app
		? sameAppRouteOf(app, target.address, inNewTab)
		: {
				kind: "ask",
				href,
			};
}

export function navigatedPlan(id: string, address: string): MomentPlan<null> {
	return (moment) => {
		const tab = heldTabOf(moment, id);

		if (tab === undefined) {
			return refusal(NO_TAB.replace("{id}", id));
		}

		if ((tab.lastAddress ?? "") === address) {
			return movedPlan(moment, null, null);
		}

		return movedPlan(
			moment,
			{
				moment: withTab(moment, pushedTab(tab, address)),
				reason: `tab ${id} page ${tab.lastAddress ?? "none"} → ${address} (a link in the app, pushed)`,
			},
			null,
		);
	};
}

export function withLinkAsked(placed: PlacedTabs, { from, href, inNewTab }: LinkAsk): PlacedTabsMove<AskedLink> {
	const minted = (placed.mintedLinks ?? 0) + 1;
	const asked: AskedLink = {
		id: `link-${minted}`,
		from,
		href,
		inNewTab,
	};
	return {
		next: {
			...placed,
			askedLinks: [...(placed.askedLinks ?? []), asked],
			mintedLinks: minted,
		},
		reason: `asked links +${asked.id} ${href} from ${from}${inNewTab ? " in a new tab" : ""}`,
		answer: asked,
	};
}

export function withLinkTaken(placed: PlacedTabs, id: string): PlacedTabsMove<AskedLink | string> {
	const asked = (placed.askedLinks ?? []).find((link) => link.id === id);

	if (asked === undefined) {
		return {
			next: null,
			reason: NOT_ASKED.replace("{id}", id),
			answer: NOT_ASKED.replace("{id}", id),
		};
	}

	return {
		next: {
			...placed,
			askedLinks: (placed.askedLinks ?? []).filter((link) => link.id !== id),
		},
		reason: `asked links -${id} ${asked.href} (taken to open)`,
		answer: asked,
	};
}

function sameAppRouteOf(app: string, address: string, inNewTab: boolean): LinkRoute {
	if (inNewTab) {
		return {
			kind: "ask",
			href: linkOf({
				kind: "page",
				app,
				address,
			}),
		};
	}

	return {
		kind: "navigate",
		address,
	};
}

function withTab(moment: HostTabsMoment, changed: HostTab): HostTabsMoment {
	return {
		...moment,
		tabs: moment.tabs.map((one) => (one.id === changed.id ? changed : one)),
	};
}
