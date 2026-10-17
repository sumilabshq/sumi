import { deny, refuse } from "@widgetarium/core/requests";
import type { BrowserAuditGateway } from "../../../gateways/browser-audit/browser-audit.gateway.js";
import type { BrowserGrantReadsGateway } from "../../../gateways/browser-grant-reads/browser-grant-reads.gateway.js";
import type { BrowserPagesGateway } from "../../../gateways/browser-pages/browser-pages.gateway.js";
import type { ClockGateway } from "../../../gateways/clock/clock.gateway.js";
import type { AskOutcome, BrowserAsksStore } from "../../../shared/lib/browser-asks-store.js";
import type { InkActivityStore } from "../../../shared/lib/ink-activity-store.js";
import type { OnceAllowancesStore } from "../../../shared/lib/once-allowances-store.js";
import { effectiveGrants } from "../../../shared/lib/once-grants.js";
import { SENSITIVE_SITES } from "../../../shared/lib/sensitive-sites.js";
import { decideBrowserAccess, refuseUrlShape, siteKeyOfAddress } from "../../../shared/lib/decide-browser-access.js";
import { urlOf } from "../../../shared/lib/site-key.js";
import type { AccessAsk } from "../../../shared/schema/access-ask.schema.js";
import type { AccessDecision, ReadKind } from "../../../shared/schema/site-access.schema.js";
import type { CommittedPage } from "../../../shared/schema/page-read.schema.js";
import { hasReadContentThisTurn, isStopped } from "./ink-turn.js";
import { UNSEEN_PAGES, refuseClosedFrame, refusePaymentFrame } from "./page-exposure.js";

export interface InkGateParts {
	readonly browserPagesGateway: BrowserPagesGateway;
	readonly browserGrantReadsGateway: BrowserGrantReadsGateway;
	readonly browserAuditGateway: BrowserAuditGateway;
	readonly clockGateway: ClockGateway;
	readonly onceAllowancesStore: OnceAllowancesStore;
	readonly browserAsksStore: BrowserAsksStore;
	readonly inkActivityStore: InkActivityStore;
}

export interface BrowserRead {
	readonly tabId: string;
	readonly siteKey: string;
	readonly kind: ReadKind;
	readonly page: CommittedPage;
}

export interface BrowserNavigation {
	readonly tabId: string;
	readonly url: string;
	readonly siteKey: string;
}

interface Logged {
	readonly tab: string;
	readonly siteKey: string;
	readonly kind: ReadKind;
	readonly finalUrl: string;
}

const ALLOWED = "allowed";
const LEFT_FOR = "about:blank";
const UNANSWERED_AFTER_MS = 2 * 60 * 1000;
const WEB_PROTOCOL = /^https?:$/;
const REFUSAL_OF_OUTCOME: Readonly<Record<AskOutcome, string | null>> = {
	site: null,
	once: null,
	no: "person-said-no",
	unanswered: "ask-unanswered",
};

export class InkGate {
	constructor(private readonly parts: InkGateParts) {}

	async readAllowed(kind: ReadKind): Promise<BrowserRead> {
		const { browserPagesGateway, inkActivityStore } = this.parts;
		const tabId = browserPagesGateway.shownId();
		const page = tabId === null ? null : browserPagesGateway.committed(tabId);
		const logged = loggedOf(tabId, kind, page?.url ?? "");

		if (this.isStoppedNow()) {
			return this.refused(logged, "stopped-by-person");
		}

		if (tabId === null || !browserPagesGateway.isOnScreen()) {
			return this.refused(logged, "tab-not-visible");
		}

		if (page === null || UNSEEN_PAGES.has(page.url)) {
			return this.refused(logged, "tab-holds-no-page");
		}

		await this.passAccess(logged);
		await this.refuseExposedPage(logged, page);
		this.logDecision(logged, "allow", ALLOWED);
		inkActivityStore.change(
			{
				reading: {
					tabId,
					kind,
				},
			},
			"ink reads the shown page",
		);
		return {
			tabId,
			siteKey: logged.siteKey,
			kind,
			page,
		};
	}

	async navigationAllowed(address: string): Promise<BrowserNavigation> {
		const { browserPagesGateway } = this.parts;
		const url = urlOf(address);
		const tabId = browserPagesGateway.shownId();
		const logged = loggedOf(tabId, "navigate", url?.href ?? address);
		const shapeRefusal = refuseUrlShape(url);

		if (shapeRefusal !== null) {
			return this.refused(logged, shapeRefusal);
		}

		if (this.isStoppedNow()) {
			return this.refused(logged, "stopped-by-person");
		}

		if (tabId === null) {
			return this.refused(logged, "no-tab");
		}

		if (!browserPagesGateway.isOnScreen()) {
			return this.refused(logged, "tab-not-visible");
		}

		const leftSiteKey = siteKeyOfAddress(browserPagesGateway.committed(tabId)?.url ?? "");
		const wasAsked = await this.passAccess(logged);

		if (leftSiteKey !== logged.siteKey && !wasAsked && this.carriesReadContent(logged)) {
			await this.passPersonAsk(logged);
		}

		this.logDecision(logged, "allow", ALLOWED);
		return {
			tabId,
			url: logged.finalUrl,
			siteKey: logged.siteKey,
		};
	}

	async arrivalAllowed(navigation: BrowserNavigation): Promise<string> {
		const arrived = this.parts.browserPagesGateway.committed(navigation.tabId);
		const logged = loggedOf(navigation.tabId, "navigate", arrived?.url ?? "");

		if (arrived === null) {
			return this.turnBack(logged);
		}

		const { decision } = this.decided(logged);
		const isRedirected = logged.siteKey !== navigation.siteKey;

		if (decision === "deny" || (isRedirected && !(await this.redirectPasses(logged, decision)))) {
			return this.turnBack(logged);
		}

		this.logDecision(logged, "allow", ALLOWED);
		return arrived.url;
	}

	stillAllowed(read: BrowserRead): void {
		const after = this.parts.browserPagesGateway.committed(read.tabId);
		const reason = this.changeAfterRead(read, after);

		if (reason === null) {
			return;
		}

		this.logDecision(loggedOf(read.tabId, read.kind, after?.url ?? ""), "deny", reason);
		refuse(reason);
	}

	private changeAfterRead(read: BrowserRead, after: CommittedPage | null): string | null {
		if (this.isStoppedNow()) {
			return "stopped-by-person";
		}

		if (!this.parts.browserPagesGateway.isOnScreen()) {
			return "tab-not-visible";
		}

		if (after === null || after.entry !== read.page.entry || after.url !== read.page.url) {
			return "changed-during-capture";
		}

		const { decision, reason } = this.decided(loggedOf(read.tabId, read.kind, after.url));

		return decision === "deny" ? reason : null;
	}

	private async passAccess(logged: Logged): Promise<boolean> {
		const { decision, reason } = this.decided(logged);

		if (decision === "deny") {
			return this.refused(logged, reason);
		}

		if (decision === "ask") {
			await this.passPersonAsk(logged);
		}

		return decision === "ask";
	}

	private async passPersonAsk(logged: Logged): Promise<void> {
		const refusal = REFUSAL_OF_OUTCOME[await this.personAnswer(logged)];

		if (refusal !== null) {
			this.refused(logged, refusal);
		}
	}

	private async redirectPasses(logged: Logged, decision: AccessDecision["decision"]): Promise<boolean> {
		if (decision !== "ask" && !this.carriesReadContent(logged)) {
			return true;
		}

		return REFUSAL_OF_OUTCOME[await this.personAnswer(logged)] === null;
	}

	private async personAnswer(logged: Logged): Promise<AskOutcome> {
		const { browserAsksStore, clockGateway } = this.parts;
		const ask: AccessAsk = {
			id: crypto.randomUUID(),
			tabId: logged.tab,
			siteKey: logged.siteKey,
			url: logged.finalUrl,
			isNavigation: logged.kind === "navigate",
		};
		const stopWaiting = clockGateway.after(UNANSWERED_AFTER_MS, () => browserAsksStore.settle(ask.id, "unanswered"));

		try {
			return await browserAsksStore.ask(ask);
		} finally {
			stopWaiting();
		}
	}

	private isStoppedNow(): boolean {
		return isStopped(this.parts.inkActivityStore.now(), this.parts.clockGateway.now());
	}

	private carriesReadContent(logged: Logged): boolean {
		if (!hasReadContentThisTurn(this.parts.inkActivityStore.now(), this.parts.clockGateway.now())) {
			return false;
		}

		const { level, source } = this.decided(logged);

		return level !== "allowed" || source !== "person";
	}

	private turnBack(logged: Logged): never {
		const { browserPagesGateway } = this.parts;
		const tab = browserPagesGateway.tabs().find(({ id }) => id === logged.tab);

		if (tab?.canGoBack) {
			browserPagesGateway.back(logged.tab);
		} else {
			browserPagesGateway.open(logged.tab, LEFT_FOR);
		}

		this.logDecision(logged, "deny", "redirected-to-closed-site");
		return refuse("redirected-to-closed-site");
	}

	private async refuseExposedPage(logged: Logged, page: CommittedPage): Promise<void> {
		const frames = await this.parts.browserPagesGateway.frameUrls(logged.tab).catch(() => null);

		if (frames === null) {
			this.refused(logged, "frames-unreadable");
		}

		const isAllowed = (url: string): boolean =>
			this.decided(loggedOf(logged.tab, logged.kind, url)).decision === "allow";
		const frameRefusal =
			logged.kind === "screenshot"
				? refuseClosedFrame({
						pageUrl: page.url,
						frames,
						isAllowed,
					})
				: null;
		const refusal = frameRefusal ?? refusePaymentFrame(frames) ?? (await this.refuseSecretField(logged));

		if (refusal !== null) {
			this.refused(logged, refusal);
		}
	}

	private async refuseSecretField(logged: Logged): Promise<string | null> {
		const hasSecretField = await this.parts.browserPagesGateway.hasSecretField(logged.tab).catch(() => null);

		if (hasSecretField === null) {
			return "page-unreadable";
		}

		return hasSecretField ? "secret-field-on-page" : null;
	}

	private decided(logged: Logged): AccessDecision {
		const { browserGrantReadsGateway, onceAllowancesStore, clockGateway } = this.parts;
		const grants = effectiveGrants(
			browserGrantReadsGateway.readGrants(),
			onceAllowancesStore.allowances(),
			clockGateway.now(),
		);

		return decideBrowserAccess(
			{
				address: logged.finalUrl,
				tabId: logged.tab,
			},
			grants,
			SENSITIVE_SITES,
		);
	}

	private refused(logged: Logged, reason: string): never {
		this.logDecision(logged, "deny", reason);
		return deny(reason);
	}

	private logDecision(logged: Logged, decision: "allow" | "deny", reason: string): void {
		this.parts.browserAuditGateway.appendAccess({
			at: this.parts.clockGateway.now(),
			...logged,
			finalUrl: loggedAddressOf(logged.finalUrl),
			decision,
			reason,
		});
	}
}

function loggedOf(tabId: string | null, kind: ReadKind, address: string): Logged {
	return {
		tab: tabId ?? "",
		siteKey: siteKeyOfAddress(address),
		kind,
		finalUrl: address,
	};
}

function loggedAddressOf(address: string): string {
	const url = urlOf(address);

	if (url === null) {
		return "";
	}

	if (!WEB_PROTOCOL.test(url.protocol)) {
		return url.protocol;
	}

	return `${url.origin}${url.pathname}`;
}
