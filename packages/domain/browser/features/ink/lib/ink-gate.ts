import { refuse } from "@widgetarium/data-framework";
import type { BrowserParts } from "../../../gateways/browser-parts/browser-parts.gateway.js";
import { decideBrowserAccess, refuseUrlShape, siteKeyOfAddress } from "../../../shared/lib/decide-browser-access.js";
import { activityWith, isSameActivity } from "../../../shared/lib/ink-activity.js";
import { effectiveGrants } from "../../../shared/lib/once-grants.js";
import { SENSITIVE_SITES } from "../../../shared/lib/sensitive-sites.js";
import { urlOf } from "../../../shared/lib/site-key.js";
import type { AccessAsk, AskOutcome } from "../../../shared/schema/access-ask.schema.js";
import type { InkActivity } from "../../../shared/schema/ink-activity.schema.js";
import type { CommittedPage, PageContent } from "../../../shared/schema/page-read.schema.js";
import type { AccessDecision } from "../../../shared/schema/site-access.schema.js";
import { MARKER_LINGERS_MS, hasReadContentThisTurn, isStopped } from "./ink-turn.js";
import { loggedAddressOf, loggedOf } from "./logged-read.js";
import type { Logged } from "./logged-read.js";
import { UNSEEN_PAGES, refuseClosedFrame, refusePaymentFrame } from "./page-exposure.js";
import { CHANGED_DURING_CAPTURE, SECRET_FIELD_ON_PAGE, isSamePage, refusalOfOutcome } from "./read-refusals.js";
import type { BrowserNavigation, BrowserRead } from "./read-refusals.js";
import { refuseSecretContent } from "./secret-content.js";

const ALLOWED = "allowed";
const UNCHANGED_AFTER_READ = "unchanged-after-read";
const NO_SECRET_IN_CONTENT = "no-secret-in-content";
const STOPPED = "stopped-by-person";
const NOT_VISIBLE = "tab-not-visible";
const TURNED_BACK = "redirected-to-closed-site";
const LEFT_FOR = "about:blank";
const UNANSWERED_AFTER_MS = 2 * 60 * 1000;

// TODO: split reads from navigation once two features can share these gate steps
export type Gate = Pick<
	BrowserParts,
	"browserPages" | "browserGrantReads" | "browserAudit" | "clock" | "onceAllowances" | "accessAsks" | "inkActivity"
>;

export async function readAllowed(gate: Gate, kind: BrowserRead["kind"], asked: string | null): Promise<BrowserRead> {
	const tabId = asked ?? gate.browserPages.shownId();
	const page = tabId === null ? null : gate.browserPages.committed(tabId);
	const logged = loggedOf(tabId, kind, page?.url ?? "");

	if (isStoppedNow(gate)) {
		return refused(gate, logged, STOPPED);
	}

	if (tabId === null || !gate.browserPages.isOnScreen(tabId)) {
		return refused(gate, logged, NOT_VISIBLE);
	}

	if (page === null || UNSEEN_PAGES.has(page.url)) {
		return refused(gate, logged, "tab-holds-no-page");
	}

	await passAccess(gate, logged);
	await passExposure(gate, logged, page);
	logDecision(gate, logged, "allow", ALLOWED);
	changeActivity(gate, { reading: { tabId, kind } }, "ink reads the shown page");
	return {
		tabId,
		siteKey: logged.siteKey,
		kind,
		page,
	};
}

export async function navigationAllowed(gate: Gate, address: string, tabId: string | null): Promise<BrowserNavigation> {
	const url = urlOf(address);
	const logged = loggedOf(tabId, "navigate", url?.href ?? address);
	const shapeRefusal = refuseUrlShape(url);

	if (shapeRefusal !== null) {
		return refused(gate, logged, shapeRefusal);
	}

	if (isStoppedNow(gate)) {
		return refused(gate, logged, STOPPED);
	}

	if (tabId === null) {
		return refused(gate, logged, "no-tab");
	}

	if (!gate.browserPages.isOnScreen(tabId)) {
		return refused(gate, logged, NOT_VISIBLE);
	}

	const leftSiteKey = siteKeyOfAddress(gate.browserPages.committed(tabId)?.url ?? "");
	const wasAsked = await passAccess(gate, logged);

	if (leftSiteKey !== logged.siteKey && !wasAsked && carriesReadContent(gate, logged)) {
		await passPersonAsk(gate, logged);
	}

	logDecision(gate, logged, "allow", ALLOWED);
	return {
		tabId,
		url: logged.finalUrl,
		siteKey: logged.siteKey,
	};
}

export async function arrivalAllowed(gate: Gate, navigation: BrowserNavigation): Promise<string> {
	const arrived = gate.browserPages.committed(navigation.tabId);
	const logged = loggedOf(navigation.tabId, "navigate", arrived?.url ?? "");

	if (arrived === null) {
		return turnBack(gate, logged);
	}

	const { decision } = decided(gate, logged);
	const isRedirected = logged.siteKey !== navigation.siteKey;

	if (decision === "deny" || (isRedirected && !(await redirectPasses(gate, logged, decision)))) {
		return turnBack(gate, logged);
	}

	logDecision(gate, logged, "allow", ALLOWED);
	return arrived.url;
}

export async function stillAllowed(gate: Gate, read: BrowserRead, reportedRefusal: string | null): Promise<void> {
	const after = gate.browserPages.committed(read.tabId);
	const logged = loggedOf(read.tabId, read.kind, after?.url ?? "");
	const reason =
		changeAfterRead(gate, read, after) ?? reportedRefusal ?? (await exposureRefusal(gate, logged, read.page));

	if (reason !== null) {
		refused(gate, logged, reason);
	}

	logDecision(gate, logged, "allow", UNCHANGED_AFTER_READ);
}

export function inspected(gate: Gate, read: BrowserRead, { url, title, text }: PageContent): PageContent {
	const logged = loggedOf(read.tabId, read.kind, read.page.url);
	const reason = refuseSecretContent(`${url}\n${title}\n${text}`);

	if (reason !== null) {
		refused(gate, logged, reason);
	}

	logDecision(gate, logged, "allow", NO_SECRET_IN_CONTENT);
	return {
		url,
		title,
		text,
	};
}

export function changeActivity({ inkActivity }: Gate, changed: Partial<InkActivity>, reason: string): void {
	const was = inkActivity.inkActivity();
	const became = activityWith(was, changed);

	if (isSameActivity(was, became)) {
		return;
	}

	inkActivity.saveInkActivity(became);
	console.debug(`[widgetarium] ink activity ${JSON.stringify(was)} → ${JSON.stringify(became)} (${reason})`);
}

export function fadeReading(gate: Gate): void {
	const finished = gate.inkActivity.inkActivity().reading;

	if (finished === null) {
		return;
	}

	gate.clock.after(MARKER_LINGERS_MS, () => {
		if (gate.inkActivity.inkActivity().reading !== finished) {
			return;
		}

		changeActivity(gate, { reading: null }, "the reading marker faded");
	});
}

function changeAfterRead(gate: Gate, read: BrowserRead, after: CommittedPage | null): string | null {
	if (isStoppedNow(gate)) {
		return STOPPED;
	}

	if (!gate.browserPages.isOnScreen(read.tabId)) {
		return NOT_VISIBLE;
	}

	if (after === null || !isSamePage(read, after)) {
		return CHANGED_DURING_CAPTURE;
	}

	const { decision, reason } = decided(gate, loggedOf(read.tabId, read.kind, after.url));
	return decision === "deny" ? reason : null;
}

async function passAccess(gate: Gate, logged: Logged): Promise<boolean> {
	const { decision, reason } = decided(gate, logged);

	if (decision === "deny") {
		return refused(gate, logged, reason);
	}

	if (decision === "ask") {
		await passPersonAsk(gate, logged);
	}

	return decision === "ask";
}

async function passPersonAsk(gate: Gate, logged: Logged): Promise<void> {
	const refusal = refusalOfOutcome(await personAnswer(gate, logged));

	if (refusal !== null) {
		refused(gate, logged, refusal);
	}
}

async function redirectPasses(gate: Gate, logged: Logged, decision: AccessDecision["decision"]): Promise<boolean> {
	if (decision !== "ask" && !carriesReadContent(gate, logged)) {
		return true;
	}

	return refusalOfOutcome(await personAnswer(gate, logged)) === null;
}

async function personAnswer({ accessAsks, clock }: Gate, logged: Logged): Promise<AskOutcome> {
	const ask: AccessAsk = {
		id: crypto.randomUUID(),
		tabId: logged.tab,
		siteKey: logged.siteKey,
		url: logged.finalUrl,
		isNavigation: logged.kind === "navigate",
	};
	const stopWaiting = clock.after(UNANSWERED_AFTER_MS, () => accessAsks.saveAnswer(ask.id, "unanswered"));
	console.info(`[widgetarium] browser ask ${ask.id} none → waiting (${logged.kind} ${logged.siteKey})`);

	try {
		return await accessAsks.waitForAnswer(ask);
	} finally {
		stopWaiting();
	}
}

function isStoppedNow({ inkActivity, clock }: Gate): boolean {
	return isStopped(inkActivity.inkActivity(), clock.now());
}

function carriesReadContent(gate: Gate, logged: Logged): boolean {
	if (!hasReadContentThisTurn(gate.inkActivity.inkActivity(), gate.clock.now())) {
		return false;
	}

	const { level, source } = decided(gate, logged);
	return level !== "allowed" || source !== "person";
}

function turnBack(gate: Gate, logged: Logged): never {
	const tab = gate.browserPages.tabs().find(({ id }) => id === logged.tab);

	if (tab?.canGoBack === true) {
		gate.browserPages.back(logged.tab);
	} else {
		gate.browserPages.open(logged.tab, LEFT_FOR);
	}

	return refused(gate, logged, TURNED_BACK);
}

async function passExposure(gate: Gate, logged: Logged, page: CommittedPage): Promise<void> {
	const refusal = await exposureRefusal(gate, logged, page);

	if (refusal !== null) {
		refused(gate, logged, refusal);
	}
}

async function exposureRefusal(gate: Gate, logged: Logged, page: CommittedPage): Promise<string | null> {
	const frames = await gate.browserPages.frameUrls(logged.tab).catch(() => null);

	if (frames === null) {
		return "frames-unreadable";
	}

	const isAllowed = (url: string): boolean =>
		decided(gate, loggedOf(logged.tab, logged.kind, url)).decision === "allow";
	const frameRefusal =
		logged.kind === "screenshot"
			? refuseClosedFrame({
					pageUrl: page.url,
					frames,
					isAllowed,
				})
			: null;
	return frameRefusal ?? refusePaymentFrame(frames) ?? (await refuseSecretField(gate, logged));
}

async function refuseSecretField({ browserPages }: Gate, logged: Logged): Promise<string | null> {
	const hasSecretField = await browserPages.hasSecretField(logged.tab).catch(() => null);

	if (hasSecretField === null) {
		return "page-unreadable";
	}

	return hasSecretField ? SECRET_FIELD_ON_PAGE : null;
}

function decided({ browserGrantReads, onceAllowances, clock }: Gate, logged: Logged): AccessDecision {
	const grants = effectiveGrants(browserGrantReads.grants(), onceAllowances.onceAllowances(), clock.now());
	return decideBrowserAccess(
		{
			address: logged.finalUrl,
			tabId: logged.tab,
		},
		grants,
		SENSITIVE_SITES,
	);
}

function refused(gate: Gate, logged: Logged, reason: string): never {
	logDecision(gate, logged, "deny", reason);
	return refuse(reason);
}

function logDecision({ browserAudit, clock }: Gate, logged: Logged, decision: "allow" | "deny", reason: string): void {
	browserAudit.appendAccess({
		at: clock.now(),
		...logged,
		finalUrl: loggedAddressOf(logged.finalUrl),
		decision,
		reason,
	});
}
