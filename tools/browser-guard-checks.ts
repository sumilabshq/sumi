import { app } from "../packages/core/src/requests/index.ts";
import type { Answer, StartedApp } from "../packages/core/src/requests/index.ts";
import { BrowserClientModule } from "../packages/browser/generated/module.ts";
import {
	CapturePageCommand,
	INK_REQUESTS,
	InkOpenAddressCommand,
	ReadPageContentCommand,
} from "../packages/browser/features/ink/contract.ts";
import { BrowserNavigationGuard, BrowserReadGuard } from "../packages/browser/features/ink/handlers.ts";
import { AnswerAskCommand } from "../packages/browser/features/asks/contract.ts";
import { SetSiteLevelCommand } from "../packages/browser/features/sites/contract.ts";
import { BrowserGrantsGateway } from "../packages/browser/gateways/browser-grants/browser-grants.gateway.ts";
import { decideBrowserAccess } from "../packages/browser/shared/lib/decide-browser-access.ts";
import { effectiveGrants } from "../packages/browser/shared/lib/once-grants.ts";
import { SENSITIVE_SITES } from "../packages/browser/shared/lib/sensitive-sites.ts";
import { check, waitFor } from "./check-helpers.ts";
import { fakeBrowser } from "./browser-fakes.ts";
import type { FakeBrowser } from "./browser-fakes.ts";

const GUARD_OF = new Map<string, unknown>([
	[ReadPageContentCommand.name, BrowserReadGuard],
	[CapturePageCommand.name, BrowserReadGuard],
	[InkOpenAddressCommand.name, BrowserNavigationGuard],
]);

for (const request of INK_REQUESTS) {
	const handled = BrowserClientModule.handlers.find((one) => one.request === request);
	const wanted = GUARD_OF.get(request.name);
	check(`${request.name} is handled behind its guard`, handled?.steps.some((step) => step === wanted) === true, true);
}

check(
	"every agent-facing request names its guard",
	INK_REQUESTS.every((request) => GUARD_OF.has(request.name)),
	true,
);

for (const request of INK_REQUESTS) {
	const handled = BrowserClientModule.handlers.find((one) => one.request === request);
	const injects = [handled?.inject ?? {}, ...(handled?.steps ?? []).map((step) => step.inject)];
	check(
		`${request.name} cannot reach the grant writer`,
		injects.some((inject) => Object.values(inject).includes(BrowserGrantsGateway)),
		false,
	);
}

function started(browser: FakeBrowser): StartedApp {
	return app({ modules: [BrowserClientModule.with(browser.parts)] });
}

function said(answer: Answer<unknown>): string {
	return answer.ok ? "ok" : answer.reason;
}

const allowed = fakeBrowser();
const read = await started(allowed).send(ReadPageContentCommand);
check("an allowed, visible page is read", read.ok && read.output.text, "Sprint 7");
check(
	"the read is logged without page content",
	allowed.audit.access.map(({ kind, decision, reason, siteKey }) => `${kind} ${decision} ${reason} ${siteKey}`),
	["content allow allowed example.com"],
);
check("the log line holds no page text", JSON.stringify(allowed.audit.access).includes("Sprint 7"), false);

const hidden = fakeBrowser();
hidden.pages.isShownOnScreen = false;
check("a tab not on screen is not read", said(await started(hidden).send(ReadPageContentCommand)), "tab-not-visible");

const moving = fakeBrowser();
moving.pages.navigatesWhileReading = true;
check(
	"a page that navigates during the read is refused",
	said(await started(moving).send(ReadPageContentCommand)),
	"changed-during-capture",
);

const secret = fakeBrowser();
secret.pages.hasSecret = true;
check(
	"a page showing a password field is not read",
	said(await started(secret).send(ReadPageContentCommand)),
	"secret-field-on-page",
);

const bank = fakeBrowser();
bank.pages.tab = {
	...bank.pages.tab,
	url: "https://www.paypal.com/myaccount",
};
check("a bank page is not read", said(await started(bank).send(ReadPageContentCommand)), "sensitive-bank-or-payments");

const framed = fakeBrowser();
framed.pages.frames = ["https://example.com/board", "https://checkout.stripe.com/pay"];
check(
	"a screenshot is refused while a blocked frame is on the page",
	said(await started(framed).send(CapturePageCommand, { region: null })),
	"frame-not-allowed:checkout.stripe.com",
);
check(
	"a payment frame keeps its page content unread too",
	said(await started(framed).send(ReadPageContentCommand)),
	"secret-field-on-page",
);

const plain = fakeBrowser();
plain.pages.tab = {
	...plain.pages.tab,
	url: "http://example.com/",
};
const plainApp = started(plain);
const asking = plainApp.send(ReadPageContentCommand);
await waitFor(() => plain.parts.browserAsksStore.asks().length === 1);
const [asked] = plain.parts.browserAsksStore.asks();
check("an http page asks the person first", asked?.siteKey, "example.com");
check(
	"the person answers through their own command",
	said(await plainApp.send(AnswerAskCommand, { id: asked?.id ?? "", answer: "once" })),
	"ok",
);
check("an answered ask lets the read through", said(await asking), "ok");

const refusing = fakeBrowser();
refusing.pages.tab = {
	...refusing.pages.tab,
	url: "https://mail.google.com/",
};
const refused = started(refusing).send(ReadPageContentCommand);
await waitFor(() => refusing.parts.browserAsksStore.asks().length === 1);
refusing.parts.browserAsksStore.settle(refusing.parts.browserAsksStore.asks()[0]?.id ?? "", "no");
check("a no answer refuses the read", said(await refused), "person-said-no");

const navigating = fakeBrowser();
const navigator = started(navigating);
check(
	"ink may not open javascript:",
	said(await navigator.send(InkOpenAddressCommand, { url: "javascript:alert(1)" })),
	"scheme-not-allowed",
);
check(
	"ink may not open file:",
	said(await navigator.send(InkOpenAddressCommand, { url: "file:///etc/passwd" })),
	"scheme-not-allowed",
);
check(
	"ink may not open a bank",
	said(await navigator.send(InkOpenAddressCommand, { url: "https://www.paypal.com/" })),
	"sensitive-bank-or-payments",
);
check(
	"ink may open an ordinary page",
	said(await navigator.send(InkOpenAddressCommand, { url: "https://example.org/a" })),
	"ok",
);
check("the opened page is in the tab", navigating.pages.opened, ["https://example.org/a"]);

const carrying = fakeBrowser();
const carrier = started(carrying);
await carrier.send(ReadPageContentCommand);
const leaving = carrier.send(InkOpenAddressCommand, { url: "https://elsewhere.net/?q=secret" });
await waitFor(() => carrying.parts.browserAsksStore.asks().length === 1);
check(
	"after reading content, a new host asks with the full address",
	carrying.parts.browserAsksStore.asks()[0]?.url,
	"https://elsewhere.net/?q=secret",
);
carrying.parts.browserAsksStore.settle(carrying.parts.browserAsksStore.asks()[0]?.id ?? "", "no");
check("and a no keeps the page where it was", said(await leaving), "person-said-no");
check(
	"the same host needs no ask",
	said(await carrier.send(InkOpenAddressCommand, { url: "https://example.com/other" })),
	"ok",
);

const writer = fakeBrowser();
const writerApp = started(writer);
await writerApp.send(SetSiteLevelCommand, { siteKey: "example.com", level: "blocked" });
await writerApp.send(SetSiteLevelCommand, { siteKey: "example.com", level: "blocked" });
check(
	"the grant writer logs was and became once per change",
	writer.grants.changes.map(({ was, became }) => `${String(was)}→${became}`),
	["null→blocked"],
);
check("a blocked site stops the read", said(await started(writer).send(ReadPageContentCommand)), "person-blocked");
check(
	"plain http asks on every read, even after once, and an unanswered ask refuses",
	said(await plainApp.send(ReadPageContentCommand)),
	"ask-unanswered",
);
check(
	"the unanswered ask is logged",
	plain.audit.access.some(({ reason }) => reason === "ask-unanswered"),
	true,
);

const webmail = fakeBrowser();
webmail.pages.tab = {
	...webmail.pages.tab,
	url: "https://mail.google.com/mail",
};
const webmailApp = started(webmail);
const firstRead = webmailApp.send(ReadPageContentCommand);
await waitFor(() => webmail.parts.browserAsksStore.asks().length === 1);
await webmailApp.send(AnswerAskCommand, { id: webmail.parts.browserAsksStore.asks()[0]?.id ?? "", answer: "once" });
check("once lets an asking site be read", said(await firstRead), "ok");
check("and the next read in that hour needs no ask", said(await webmailApp.send(ReadPageContentCommand)), "ok");
check(
	"once is written to the grant log as was and became",
	webmail.grants.changes.map(({ was, became, reason }) => `${String(was)}→${became} ${reason}`),
	["null→allowed allowed once"],
);
check(
	"once covers only the tab it was given in",
	decideBrowserAccess(
		{ address: "https://mail.google.com/mail", tabId: "tab-2" },
		effectiveGrants(
			webmail.parts.browserGrantReadsGateway.readGrants(),
			webmail.parts.onceAllowancesStore.allowances(),
			Date.now(),
		),
		SENSITIVE_SITES,
	).decision,
	"ask",
);
webmail.pages.open("tab-1", "https://example.org/");
webmail.pages.open("tab-1", "https://mail.google.com/mail");
const afterLeaving = webmailApp.send(ReadPageContentCommand);
check("leaving the host ends once", await waitFor(() => webmail.parts.browserAsksStore.asks().length === 1), true);
webmail.parts.browserAsksStore.settle(webmail.parts.browserAsksStore.asks()[0]?.id ?? "", "no");
await afterLeaving;
