import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { TabArt } from "../apps/studio/src/features/app-host/ui/tab-face/tab-art.tsx";
import type { TabArtSize } from "../apps/studio/src/features/app-host/ui/tab-face/tab-art.tsx";
import { AppProvider, app } from "../packages/shared/data-framework/src/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { browserPartsOf } from "../packages/domain/browser/gateways/browser-parts/memory.gateway.ts";
import { WebBrowserPagesGateway } from "../packages/domain/browser/gateways/browser-pages/web.gateway.ts";
import { MemoryBrowserGrantsGateway } from "../packages/domain/browser/gateways/browser-grants/memory.gateway.ts";
import { MemoryBrowserAuditGateway } from "../packages/domain/browser/gateways/browser-audit/memory.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/domain/browser/gateways/recent-sites/memory.gateway.ts";
import { MemorySiteIconsGateway } from "../packages/domain/browser/gateways/site-icons/memory.gateway.ts";
import { MemorySiteFilesGateway } from "../packages/domain/browser/gateways/site-files/memory.gateway.ts";

const ICON_PX = 32;
const BROKEN_ICON = "data:image/png;base64,AAAA";

interface IconCase {
	readonly name: string;
	readonly favicon: string | null;
	readonly size: TabArtSize;
	readonly address?: string;
}

const SLACK = "https://app.slack.com";
const LINEAR = "https://linear.app";
const SWAPPED = "https://swapped.example";

function drawnIcon(fill = "rgb(234, 67, 53)"): string {
	const canvas = document.createElement("canvas");
	canvas.width = ICON_PX;
	canvas.height = ICON_PX;
	const paint = canvas.getContext("2d");

	if (paint === null) {
		return BROKEN_ICON;
	}

	paint.fillStyle = fill;
	paint.beginPath();
	paint.arc(ICON_PX / 2, ICON_PX / 2, ICON_PX / 2 - 2, 0, Math.PI * 2);
	paint.fill();
	return canvas.toDataURL("image/png");
}

const icon = drawnIcon();
const siteIcons = new MemorySiteIconsGateway();
const siteFiles = new MemorySiteFilesGateway({
	heads: {
		[`${SLACK}/`]: '<link rel="icon" href="/slack.png">',
		[`${LINEAR}/`]: "<title>Linear</title>",
		[`${SWAPPED}/`]: "",
	},
	icons: {
		[`${SLACK}/slack.png`]: icon,
		[`${LINEAR}/favicon.ico`]: drawnIcon("rgb(94, 106, 210)"),
		[`${SWAPPED}/favicon.ico`]: icon,
	},
});
const studio = app()
	.modules(
		BrowserModule.with(
			browserPartsOf({
				browserPages: new WebBrowserPagesGateway(),
				browserGrants: new MemoryBrowserGrantsGateway(),
				browserAudit: new MemoryBrowserAuditGateway(),
				recentSites: new MemoryRecentSitesGateway(),
				siteIcons,
				siteFiles,
			}),
		),
	)
	.start({ platform: "browser", scope: { workspaceId: "icons" } });
const UNREAD_ICON = drawnIcon("rgb(52, 168, 83)");

Reflect.set(globalThis, "swapSiteIcon", () => {
	const swapped = { address: `${SWAPPED}/unread.png`, origin: SWAPPED, icon: UNREAD_ICON, fetchedAt: Date.now() };
	siteIcons.saveSiteIcons([swapped, ...siteIcons.siteIcons()], SWAPPED, "a live page swapped its icon");
	return UNREAD_ICON.length;
});

function IconCases(): ReactElement {
	const cases: readonly IconCase[] = [
		{ name: "row-icon", favicon: icon, size: "row" },
		{ name: "row-letter", favicon: null, size: "row", address: "https://unreached.example/" },
		{ name: "row-broken", favicon: BROKEN_ICON, size: "row" },
		{ name: "tile-icon", favicon: icon, size: "tile" },
		{ name: "unloaded-slack", favicon: null, size: "row", address: `${SLACK}/client/T1/C2` },
		{ name: "unloaded-linear", favicon: null, size: "row", address: `${LINEAR}/team/issues` },
		{ name: "unloaded-tile", favicon: null, size: "tile", address: `${SLACK}/client/T1` },
		{ name: "live-swap", favicon: null, size: "row", address: `${SWAPPED}/inbox` },
	];
	return (
		<div className="cv:w-[248px] cv:bg-(--sumi-frame) cv:p-2">
			{cases.map(({ name, favicon, size, address = "https://mail.example/" }) => (
				<div
					key={name}
					data-case={name}
					className="cv:flex cv:h-8 cv:items-center cv:gap-2 cv:px-2 cv:text-[13px] cv:text-(--sumi-text)"
				>
					<TabArt icon="site" favicon={favicon} title="Mail" address={address} size={size} />
					<span>{name}</span>
				</div>
			))}
		</div>
	);
}

const root = document.getElementById("root");

if (root !== null) {
	createRoot(root).render(
		<AppProvider app={studio}>
			<IconCases />
		</AppProvider>,
	);
}
