import { query, subscriber } from "@widgetarium/data-framework";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { SiteFilesGateway } from "../../gateways/site-files/site-files.gateway.js";
import { SiteIconChangedEvent } from "../../gateways/site-icons/site-icons.events.js";
import { SiteIconsGateway } from "../../gateways/site-icons/site-icons.gateway.js";
import { DATA_IMAGE, iconLinksOfHead } from "../../shared/lib/page-icon-links.js";
import { keptIconOfOrigin, originPageOf, withIconKept } from "../../shared/lib/site-icon-cache.js";
import { iconAddressesOf } from "../../shared/lib/site-icon-choice.js";
import { originOf } from "../../shared/lib/site-key.js";
import {
	SiteIconAnswerSchema,
	SiteIconOfOriginSchema,
	SiteOriginSchema,
} from "../../shared/schema/site-icon.schema.js";
import type { KeptSiteIcon, SiteIconAnswer } from "../../shared/schema/site-icon.schema.js";

interface DiscoveredIcon extends SiteIconAnswer {
	readonly address: string;
}

const WEB_ORIGIN = /^https?:\/\//;
const MOST_LOGGED_ADDRESS = 120;

export const SiteIconQuery = query("site-icon")
	.input(SiteOriginSchema)
	.output(SiteIconOfOriginSchema)
	.inject({
		siteIcons: SiteIconsGateway,
		siteFiles: SiteFilesGateway,
		clock: ClockGateway,
	})
	.handle(async ({ origin }, { siteIcons, siteFiles, clock }) => {
		if (!WEB_ORIGIN.test(origin) || originOf(origin) !== origin) {
			return { icon: null };
		}

		const kept = keptIconOfOrigin(siteIcons.siteIcons(), origin, clock.now());

		if (kept !== null) {
			console.info(`[widgetarium] site icon ${origin} → ${saidOf(kept.icon)} (cached)`);
			return { icon: kept.icon };
		}

		const discovered = await discoveredIconOf(origin, siteFiles);

		if (!discovered.isReached) {
			console.info(`[widgetarium] site icon ${origin} → none, not kept: the site was not reached`);
			return { icon: null };
		}

		const fresh: KeptSiteIcon = {
			address: discovered.address,
			origin,
			icon: discovered.icon,
			fetchedAt: clock.now(),
		};
		const reason = `site icon ${origin} → ${saidOf(fresh.icon)} (fetched, ${fresh.address.slice(0, MOST_LOGGED_ADDRESS)})`;
		siteIcons.saveSiteIcons(withIconKept(siteIcons.siteIcons(), fresh), origin, reason);
		console.info(`[widgetarium] ${reason}`);
		return { icon: fresh.icon };
	});

export const RereadSiteIconSubscriber = subscriber(SiteIconChangedEvent).handle(({ origin }, { invalidate }) => {
	invalidate(SiteIconQuery, { origin });
});

async function discoveredIconOf(origin: string, siteFiles: SiteFilesGateway): Promise<DiscoveredIcon> {
	const originPage = originPageOf(origin);
	const read = await siteFiles.pageHead(originPage);

	if (!read.isReached) {
		return { address: originPage, icon: null, isReached: false };
	}

	const page = originOf(read.page) === null ? originPage : read.page;
	const links = read.head === null ? [] : iconLinksOfHead(read.head, page, isMediaMatching);
	return firstIconOf(iconAddressesOf({ page, links }), origin, siteFiles);
}

async function firstIconOf(
	addresses: readonly string[],
	origin: string,
	siteFiles: SiteFilesGateway,
): Promise<DiscoveredIcon> {
	for (const address of addresses) {
		const answer = await iconAt(address, siteFiles);

		if (!answer.isReached) {
			return { address, ...answer };
		}

		if (answer.icon !== null) {
			return { address: address.startsWith(DATA_IMAGE) ? originPageOf(origin) : address, ...answer };
		}
	}

	return { address: originPageOf(origin), icon: null, isReached: true };
}

async function iconAt(address: string, siteFiles: SiteFilesGateway): Promise<SiteIconAnswer> {
	if (!address.startsWith(DATA_IMAGE)) {
		return siteFiles.siteIcon(address);
	}

	const inline = SiteIconAnswerSchema.shape.icon.safeParse(address);
	return { icon: inline.success ? inline.data : null, isReached: true };
}

// TRADE-OFF: the studio window's matchMedia, not a gateway: a pure reading of this screen, no I/O
function isMediaMatching(media: string): boolean {
	return typeof matchMedia === "function" && matchMedia(media).matches;
}

function saidOf(icon: string | null): string {
	return icon === null ? "none" : `${icon.length} characters`;
}
