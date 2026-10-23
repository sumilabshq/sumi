import { BrowserClientModule } from "../packages/browser/generated/module.ts";
import { ReadPageContentCommand } from "../packages/browser/features/ink/contract.ts";
import { MemoryBrowserAuditGateway } from "../packages/browser/gateways/browser-audit/memory.gateway.ts";
import { MemoryBrowserGrantsGateway } from "../packages/browser/gateways/browser-grants/memory.gateway.ts";
import { NoChatComposerGateway } from "../packages/browser/gateways/chat-composer/none.gateway.ts";
import { MemoryRecentSitesGateway } from "../packages/browser/gateways/recent-sites/memory.gateway.ts";
import { browserPartsOf } from "../packages/browser/gateways/browser-parts/browser-parts.gateway.ts";
import type { BrowserParts } from "../packages/browser/gateways/browser-parts/browser-parts.gateway.ts";
import { isLaidOnScreen } from "../packages/browser/shared/lib/is-laid-on-screen.ts";
import { app } from "@widgetarium/core/requests";
import { FakeBrowserPagesGateway, HurriedClockGateway } from "./browser-fakes.ts";

export const KEPT_PAGE = "data-kept-page";

export function keptBrowserParts(): BrowserParts {
	const parts = browserPartsOf({
		browserPagesGateway: new LaidPagesGateway(),
		browserGrantsGateway: new MemoryBrowserGrantsGateway(),
		browserAuditGateway: new MemoryBrowserAuditGateway(),
		clockGateway: new HurriedClockGateway(),
		recentSitesGateway: new MemoryRecentSitesGateway(),
		chatComposerGateway: new NoChatComposerGateway(),
	});
	const browserApp = app({ modules: [BrowserClientModule.with(parts)] });
	Object.assign(window, {
		__PAGE_ON_SCREEN__: () => parts.browserPagesGateway.isOnScreen("tab-1"),
		__INK_READ__: async () => {
			const answer = await browserApp.send(ReadPageContentCommand);
			return answer.ok ? "ok" : answer.reason;
		},
	});
	return parts;
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
