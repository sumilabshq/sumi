import { ReadPageContentCommand } from "../packages/domain/browser/index.ts";
import { MemoryBrowserAuditGateway } from "../packages/domain/browser/gateways/browser-audit/memory.gateway.ts";
import { MemoryBrowserGrantsGateway } from "../packages/domain/browser/gateways/browser-grants/memory.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/domain/browser/gateways/recent-sites/memory.gateway.ts";
import { browserPartsOf } from "../packages/domain/browser/gateways/browser-parts/memory.gateway.ts";
import { isLaidOnScreen } from "../packages/domain/browser/shared/lib/is-laid-on-screen.ts";
import type { StartedApp } from "@widgetarium/data-framework";
import { restoreTabs } from "../apps/studio/src/tabs/studio-app.ts";
import { FakeBrowserPagesGateway, HurriedClockGateway } from "./browser-fakes.ts";
import { studioAppOf } from "./studio-app-fixture.ts";

export const KEPT_PAGE = "data-kept-page";

export function keptStudioApp(): StartedApp {
	const parts = browserPartsOf(
		{
			browserPages: new LaidPagesGateway(),
			browserGrants: new MemoryBrowserGrantsGateway(),
			browserAudit: new MemoryBrowserAuditGateway(),

			recentSites: new MemoryRecentSitesGateway(),
		},
		new HurriedClockGateway(),
	);
	const browserApp = studioAppOf({ browser: parts, workspaceId: "kept" });
	void restoreTabs(browserApp);
	Object.assign(window, {
		__PAGE_ON_SCREEN__: () => parts.browserPages.isOnScreen("tab-1"),
		__INK_READ__: async () => {
			const answer = await browserApp.send(ReadPageContentCommand, { tabId: null });
			return answer.ok ? "ok" : answer.reason;
		},
	});
	return browserApp;
}

class LaidPagesGateway extends FakeBrowserPagesGateway {
	private container: HTMLElement | null = null;

	override isOnScreen(): boolean {
		return isLaidOnScreen(this.container);
	}

	override attach(into: HTMLElement): void {
		if (this.container === into) {
			return;
		}

		this.container = into;
		const page = into.ownerDocument.createElement("input");
		page.setAttribute(KEPT_PAGE, "");
		into.append(page);
	}

	override detach(): void {
		this.container?.querySelector(`[${KEPT_PAGE}]`)?.remove();
		this.container = null;
	}
}
