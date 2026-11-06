import { JSDOM } from "jsdom";
import { app } from "../packages/shared/data-framework/src/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { SiteIconQuery } from "../packages/domain/browser/index.ts";
import { browserPartsOf } from "../packages/domain/browser/gateways/browser-parts/memory.gateway.ts";
import { WebBrowserPagesGateway } from "../packages/domain/browser/gateways/browser-pages/web.gateway.ts";
import { MemoryBrowserGrantsGateway } from "../packages/domain/browser/gateways/browser-grants/memory.gateway.ts";
import { MemoryBrowserAuditGateway } from "../packages/domain/browser/gateways/browser-audit/memory.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/domain/browser/gateways/recent-sites/memory.gateway.ts";
import { MemorySiteIconsGateway } from "../packages/domain/browser/gateways/site-icons/memory.gateway.ts";
import { MemorySiteFilesGateway } from "../packages/domain/browser/gateways/site-files/memory.gateway.ts";
import type { ServedSiteFiles } from "../packages/domain/browser/gateways/site-files/memory.gateway.ts";
import { iconLinksOfHead } from "../packages/domain/browser/shared/lib/page-icon-links.ts";
import { check, tally } from "./check-helpers.ts";

const SVG = "data:image/svg+xml;base64,PHN2Zy8+";
const ICO = "data:image/x-icon;base64,AAABAA==";
const INLINE = "data:image/png;base64,iVBORw0KGgo=";
const SITE = "https://mail.example";

Object.assign(globalThis, { DOMParser: new JSDOM("").window.DOMParser });

interface Discovery {
	readonly icon: string | null;
	readonly asked: readonly string[];
	readonly kept: number;
}

function startedOver(served: ServedSiteFiles) {
	const siteFiles = new MemorySiteFilesGateway(served);
	const siteIcons = new MemorySiteIconsGateway();
	const parts = browserPartsOf({
		browserPages: new WebBrowserPagesGateway(),
		browserGrants: new MemoryBrowserGrantsGateway(),
		browserAudit: new MemoryBrowserAuditGateway(),
		recentSites: new MemoryRecentSitesGateway(),
		siteIcons,
		siteFiles,
	});
	const started = app()
		.modules(BrowserModule.with(parts))
		.start({ platform: "browser", scope: { workspaceId: "icons" } });
	return { started, siteFiles, siteIcons };
}

async function discoveredOf(served: ServedSiteFiles, origin = SITE, times = 1): Promise<Discovery> {
	const { started, siteFiles, siteIcons } = startedOver(served);
	let icon: string | null = null;

	for (let asked = 0; asked < times; asked += 1) {
		const answer = await started.send(SiteIconQuery, { origin });
		icon = answer.ok ? answer.output.icon : `refused: ${answer.reason}`;
	}

	return { icon, asked: [...siteFiles.asked], kept: siteIcons.siteIcons().length };
}

function headLinkChecks(): void {
	const links = iconLinksOfHead(
		'<base href="/app/"><link rel="icon" href="logo.svg"><link rel="stylesheet" href="x.css"><link rel="apple-touch-icon" href="//cdn.example/t.png" media="(prefers-color-scheme: dark)">',
		`${SITE}/`,
		() => false,
	);
	check(
		"a head's icon links resolve against its base, skip stylesheets and read media",
		links.map(({ href, isMatching }) => [href, isMatching]),
		[
			[`${SITE}/app/logo.svg`, true],
			["https://cdn.example/t.png", false],
		],
	);
}

async function discoveryChecks(): Promise<void> {
	const linked = await discoveredOf({
		heads: {
			[`${SITE}/`]:
				'<link rel="icon" sizes="16x16" href="/16.png"><link rel="icon" type="image/svg+xml" href="/logo.svg">',
		},
		icons: { [`${SITE}/logo.svg`]: SVG },
	});
	check("an unloaded tab's origin is discovered from its page head: the scalable icon is chosen", linked, {
		icon: SVG,
		asked: [`${SITE}/`, `${SITE}/logo.svg`],
		kept: 1,
	});
	const bare = await discoveredOf({
		heads: { [`${SITE}/`]: "<title>Mail</title>" },
		icons: { [`${SITE}/favicon.ico`]: ICO },
	});
	check("a head naming no icon falls back to /favicon.ico", bare.icon, ICO);
	const empty = await discoveredOf({
		heads: { [`${SITE}/`]: '<link rel="icon" href="data:,">' },
		icons: { [`${SITE}/favicon.ico`]: ICO },
	});
	check("an empty data: icon link is skipped, not worn", empty.icon, ICO);
	const inline = await discoveredOf({ heads: { [`${SITE}/`]: `<link rel="icon" href="${INLINE}">` } });
	check("an inline image icon is worn without a fetch", [inline.icon, inline.asked.length], [INLINE, 1]);
	const missing = await discoveredOf(
		{ heads: { [`${SITE}/`]: "" }, icons: { [`${SITE}/favicon.ico`]: null } },
		SITE,
		2,
	);
	check("a site with no icon is kept as none and asked once", missing, {
		icon: null,
		asked: [`${SITE}/`, `${SITE}/favicon.ico`],
		kept: 1,
	});
	const offline = await discoveredOf({}, SITE, 2);
	check("an unreached site is not kept and is asked again", offline, {
		icon: null,
		asked: [`${SITE}/`, `${SITE}/`],
		kept: 0,
	});
	const cached = await discoveredOf({ heads: { [`${SITE}/`]: "" }, icons: { [`${SITE}/favicon.ico`]: ICO } }, SITE, 3);
	check("a known origin is answered from the cache", cached.asked.length, 2);
	const local = await discoveredOf({}, "file://", 1);
	check("an origin off the web asks nothing", local, { icon: null, asked: [], kept: 0 });
}

headLinkChecks();
await discoveryChecks();
console.log(
	tally.failed ? `site icon discovery: ${tally.failed} check(s) failed` : "site icon discovery: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
