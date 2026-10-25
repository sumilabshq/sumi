import { app } from "../packages/shared/core/src/requests/index.ts";
import type { Answer, StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import {
	CapturePageCommand,
	InkOpenAddressCommand,
	ReadPageContentCommand,
	SearchWebCommand,
} from "../packages/domain/browser/index.ts";
import { AnswerAskCommand } from "../packages/domain/browser/index.ts";
import { SetSiteLevelCommand } from "../packages/domain/browser/index.ts";
import { BrowserGrantsGateway } from "../packages/domain/browser/gateways/browser-grants/browser-grants.gateway.ts";
import { decideBrowserAccess } from "../packages/domain/browser/shared/lib/decide-browser-access.ts";
import { effectiveGrants } from "../packages/domain/browser/shared/lib/once-grants.ts";
import { SENSITIVE_SITES } from "../packages/domain/browser/shared/lib/sensitive-sites.ts";
import { check, waitFor } from "./check-helpers.ts";
import { fakeBrowser } from "./browser-fakes.ts";
import type { FakeBrowser } from "./browser-fakes.ts";

const INK_REQUESTS = [ReadPageContentCommand, CapturePageCommand, InkOpenAddressCommand, SearchWebCommand];

for (const request of INK_REQUESTS) {
	const handled = BrowserModule.handlers.find((one) => one.request.name === request.name);
	check(
		`${request.name} cannot reach the grant writer`,
		Object.values(handled?.inject ?? {}).includes(BrowserGrantsGateway),
		false,
	);
}

function started(browser: FakeBrowser): StartedApp {
	return app().modules(BrowserModule.with(browser.parts)).start();
}

function said(answer: Answer<unknown>): string {
	return answer.ok ? "ok" : answer.reason;
}

const allowed = fakeBrowser();
const read = await started(allowed).send(ReadPageContentCommand, { tabId: null });
check("an allowed, visible page is read", read.ok && read.output.text, "Sprint 7");
check(
	"the read is logged without page content",
	allowed.audit.access.map(({ kind, decision, reason, siteKey }) => `${kind} ${decision} ${reason} ${siteKey}`),
	[
		"content allow allowed example.com",
		"content allow unchanged-after-read example.com",
		"content allow no-secret-in-content example.com",
	],
);
check("the log line holds no page text", JSON.stringify(allowed.audit.access).includes("Sprint 7"), false);

const hidden = fakeBrowser();
hidden.pages.isShownOnScreen = false;
check(
	"a tab not on screen is not read",
	said(await started(hidden).send(ReadPageContentCommand, { tabId: null })),
	"tab-not-visible",
);

const moving = fakeBrowser();
moving.pages.navigatesWhileReading = true;
check(
	"a page that navigates during the read is refused",
	said(await started(moving).send(ReadPageContentCommand, { tabId: null })),
	"changed-during-capture",
);

const secret = fakeBrowser();
secret.pages.hasSecret = true;
check(
	"a page showing a password field is not read",
	said(await started(secret).send(ReadPageContentCommand, { tabId: null })),
	"secret-field-on-page",
);

const revealing = fakeBrowser();
revealing.pages.duringRead = () => {
	revealing.pages.hasSecret = true;
};
const revealed = await started(revealing).send(ReadPageContentCommand, { tabId: null });
check("a field shown during the text read is refused on the way out", said(revealed), "secret-field-on-page");
check("and the text never reaches the agent", JSON.stringify(revealed).includes("Sprint 7"), false);
check(
	"the refusal is logged after the allowed way in",
	revealing.audit.access.map(({ decision, reason }) => `${decision} ${reason}`),
	["allow allowed", "deny secret-field-on-page"],
);

const flashing = fakeBrowser();
flashing.pages.isFieldShownOnlyToRead = true;
check(
	"a field the read itself saw is refused though no probe saw it",
	said(await started(flashing).send(ReadPageContentCommand, { tabId: null })),
	"secret-field-on-page",
);

const drifting = fakeBrowser();
drifting.pages.readsAt = "https://example.com/elsewhere";
check(
	"a read whose page names another address than the committed one is refused",
	said(await started(drifting).send(ReadPageContentCommand, { tabId: null })),
	"changed-during-capture",
);

const shooting = fakeBrowser();
shooting.pages.duringRead = () => {
	shooting.pages.hasSecret = true;
};
const shot = await started(shooting).send(CapturePageCommand, { region: null });
check("a field shown during the capture discards the image", said(shot), "secret-field-on-page");
check("and the image never reaches the agent", JSON.stringify(shot).includes("iVBORw0KGgo"), false);

const carded = fakeBrowser();
carded.pages.text = "Paid with 4111 1111 1111 1111 yesterday";
const cardRead = await started(carded).send(ReadPageContentCommand, { tabId: null });
check("a card number in the page text is refused", said(cardRead), "secret-in-content");
check("and the number never reaches the agent", JSON.stringify(cardRead).includes("4111"), false);
check(
	"the inspection logs its refusal",
	carded.audit.access.map(({ decision, reason }) => `${decision} ${reason}`),
	["allow allowed", "allow unchanged-after-read", "deny secret-in-content"],
);

const bank = fakeBrowser();
bank.pages.tab = {
	...bank.pages.tab,
	url: "https://www.paypal.com/myaccount",
};
check(
	"a bank page is not read",
	said(await started(bank).send(ReadPageContentCommand, { tabId: null })),
	"sensitive-bank-or-payments",
);

const framed = fakeBrowser();
framed.pages.frames = ["https://example.com/board", "https://checkout.stripe.com/pay"];
check(
	"a screenshot is refused while a blocked frame is on the page",
	said(await started(framed).send(CapturePageCommand, { region: null })),
	"frame-not-allowed:checkout.stripe.com",
);
check(
	"a payment frame keeps its page content unread too",
	said(await started(framed).send(ReadPageContentCommand, { tabId: null })),
	"secret-field-on-page",
);

const plain = fakeBrowser();
plain.pages.tab = {
	...plain.pages.tab,
	url: "http://example.com/",
};
const plainApp = started(plain);
const asking = plainApp.send(ReadPageContentCommand, { tabId: null });
await waitFor(() => plain.parts.accessAsks.accessAsks().length === 1);
const [asked] = plain.parts.accessAsks.accessAsks();
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
const refused = started(refusing).send(ReadPageContentCommand, { tabId: null });
await waitFor(() => refusing.parts.accessAsks.accessAsks().length === 1);
refusing.parts.accessAsks.saveAnswer(refusing.parts.accessAsks.accessAsks()[0]?.id ?? "", "no");
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
await carrier.send(ReadPageContentCommand, { tabId: null });
const leaving = carrier.send(InkOpenAddressCommand, { url: "https://elsewhere.net/?q=secret" });
await waitFor(() => carrying.parts.accessAsks.accessAsks().length === 1);
check(
	"after reading content, a new host asks with the full address",
	carrying.parts.accessAsks.accessAsks()[0]?.url,
	"https://elsewhere.net/?q=secret",
);
carrying.parts.accessAsks.saveAnswer(carrying.parts.accessAsks.accessAsks()[0]?.id ?? "", "no");
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
check(
	"a blocked site stops the read",
	said(await started(writer).send(ReadPageContentCommand, { tabId: null })),
	"person-blocked",
);
check(
	"plain http asks on every read, even after once, and an unanswered ask refuses",
	said(await plainApp.send(ReadPageContentCommand, { tabId: null })),
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
const firstRead = webmailApp.send(ReadPageContentCommand, { tabId: null });
await waitFor(() => webmail.parts.accessAsks.accessAsks().length === 1);
await webmailApp.send(AnswerAskCommand, { id: webmail.parts.accessAsks.accessAsks()[0]?.id ?? "", answer: "once" });
check("once lets an asking site be read", said(await firstRead), "ok");
check(
	"and the next read in that hour needs no ask",
	said(await webmailApp.send(ReadPageContentCommand, { tabId: null })),
	"ok",
);
check(
	"once is written to the grant log as was and became",
	webmail.grants.changes.map(({ was, became, reason }) => `${String(was)}→${became} ${reason}`),
	["null→allowed allowed once"],
);
check(
	"once covers only the tab it was given in",
	decideBrowserAccess(
		{ address: "https://mail.google.com/mail", tabId: "tab-2" },
		effectiveGrants(webmail.parts.browserGrants.grants(), webmail.parts.onceAllowances.onceAllowances(), Date.now()),
		SENSITIVE_SITES,
	).decision,
	"ask",
);
webmail.pages.open("tab-1", "https://example.org/");
check(
	"a page change prunes once through its subscriber",
	await waitFor(() => webmail.parts.onceAllowances.onceAllowances().length === 0),
	true,
);
webmail.pages.open("tab-1", "https://mail.google.com/mail");
const afterLeaving = webmailApp.send(ReadPageContentCommand, { tabId: null });
check("leaving the host ends once", await waitFor(() => webmail.parts.accessAsks.accessAsks().length === 1), true);
webmail.parts.accessAsks.saveAnswer(webmail.parts.accessAsks.accessAsks()[0]?.id ?? "", "no");
await afterLeaving;
