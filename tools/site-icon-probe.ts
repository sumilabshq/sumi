import { execFileSync } from "node:child_process";
import path from "node:path";
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
import { TauriSiteFilesGateway } from "../packages/domain/browser/gateways/site-files/tauri/tauri.gateway.ts";

const PROBE = path.resolve(
	process.env["CARGO_TARGET_DIR"] ?? "apps/tauri/src-tauri/target",
	"debug/examples/site_icon_probe",
);
const COMMANDS: Readonly<Record<string, string>> = {
	"plugin:browser|site_page_head": "head",
	"plugin:browser|site_icon": "icon",
};
const ORIGINS = [
	"https://app.slack.com",
	"https://linear.app",
	"https://github.com",
	"https://mail.google.com",
	"https://example.com",
];

Object.assign(globalThis, { DOMParser: new JSDOM("").window.DOMParser });

const rustProbe = {
	invoke: async (command: string, args?: Readonly<Record<string, unknown>>): Promise<unknown> =>
		JSON.parse(execFileSync(PROBE, [COMMANDS[command] ?? command, String(args?.["address"])], { encoding: "utf8" })),
	channel: () => null,
};
const siteIcons = new MemorySiteIconsGateway();
const started = app()
	.modules(
		BrowserModule({ injects: browserPartsOf({
				browserPages: new WebBrowserPagesGateway(),
				browserGrants: new MemoryBrowserGrantsGateway(),
				browserAudit: new MemoryBrowserAuditGateway(),
				recentSites: new MemoryRecentSitesGateway(),
				siteIcons,
				siteFiles: new TauriSiteFilesGateway(rustProbe),
			}), }),
	)
	.start({ platform: "browser", scope: { workspaceId: "probe" } });

for (const origin of ORIGINS) {
	const answer = await started.send(SiteIconQuery, { origin });
	const kept = siteIcons.siteIcons().find((icon) => icon.origin === origin);
	const icon = answer.ok ? answer.output.icon : null;
	console.log(
		`${origin} → ${kept?.address ?? "not kept"} → ${icon === null ? "no icon" : `${icon.slice(0, icon.indexOf(";"))}, ${icon.length} characters`}`,
	);
}

process.exit(0);
