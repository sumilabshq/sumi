import { PrefillDraftCommand } from "../packages/domain/assistant/generated/contract.ts";
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/shared/core/src/requests/index.ts";
import type { Answer } from "../packages/shared/core/src/requests/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { SearchWebCommand } from "../packages/domain/browser/index.ts";
import { AskInkPromptQuery, LeaveFailureCommand, OpenAddressCommand } from "../packages/domain/browser/index.ts";
import { loadFailureKindOf } from "../packages/domain/browser/shared/lib/load-failure.ts";
import { nearMatchOf } from "../packages/domain/browser/features/tabs/lib/near-match.ts";
import { SEARCH_ENGINE } from "../packages/domain/browser/shared/lib/search-address.ts";
import type { PageFailure } from "../packages/domain/browser/shared/schema/browser-tab.schema.ts";
import { Browser } from "../apps/studio/src/features/browser/ui/browser/browser.tsx";
import { check, waitFor } from "./check-helpers.ts";
import { inBrowserPlate } from "./browser-plate.ts";
import { fakeBrowser } from "./browser-fakes.ts";
import type { FakeBrowser } from "./browser-fakes.ts";
import { exactStatesReport } from "./browser-states-exact.ts";
import { askInkPromptOf } from "../packages/domain/browser/features/tabs/lib/ask-ink-prompt.ts";
import { AssistantModule } from "../packages/domain/assistant/module.ts";
import { Composer } from "../apps/studio/src/features/assistant/ui/composer/composer.tsx";
import { NO_ASSISTANT } from "../packages/shared/core/src/engine/assistant-port.ts";
import { AskComposerContext } from "../apps/studio/src/features/command-menu/lib/ask-composer-context.ts";

const EVENT_DELIVERED_WITHIN_MS = 200;

const STATE_OF_CODE: readonly (readonly [string, number, string | null])[] = [
	["ERR_NAME_NOT_RESOLVED", -105, "not-found"],
	["ERR_NAME_RESOLUTION_FAILED", -137, "not-found"],
	["ERR_INTERNET_DISCONNECTED", -106, "offline"],
	["ERR_CONNECTION_CLOSED", -100, "refused"],
	["ERR_CONNECTION_RESET", -101, "refused"],
	["ERR_CONNECTION_REFUSED", -102, "refused"],
	["ERR_CONNECTION_FAILED", -104, "refused"],
	["ERR_ADDRESS_UNREACHABLE", -109, "refused"],
	["ERR_TIMED_OUT", -7, "timed-out"],
	["ERR_CONNECTION_TIMED_OUT", -118, "timed-out"],
	["ERR_CERT_COMMON_NAME_INVALID", -200, "certificate"],
	["ERR_CERT_DATE_INVALID", -201, "certificate"],
	["ERR_CERT_AUTHORITY_INVALID", -202, "certificate"],
	["the last certificate code", -299, "certificate"],
	["ERR_ABORTED, a navigation cancelling a load", -3, null],
	["ERR_BLOCKED_BY_CLIENT, not a failure state", -20, null],
	["ERR_INSECURE_RESPONSE, past the certificate range", -501, null],
];

for (const [name, code, state] of STATE_OF_CODE) {
	check(`load failure ${name} (${code}) draws ${String(state)}`, loadFailureKindOf(code), state);
}

const NEAR: readonly (readonly [string, readonly string[], string | null])[] = [
	["test.co", [], "test.com"],
	["shop.cm", [], "shop.com"],
	["wikipedia.ogr", [], "wikipedia.org"],
	["example.nte", [], "example.net"],
	["githb.com", ["github.com"], "github.com"],
	["gitgub.com", ["vite.dev", "github.com"], "github.com"],
	["githubb.com", ["github.com"], "github.com"],
	["github.co", ["github.com"], "github.com"],
	["github.com", ["github.com"], null],
	["gtihub.com", ["github.com"], null],
	["example.org", ["github.com"], null],
	["co", [], null],
];

for (const [host, recent, wanted] of NEAR) {
	check(`near match of ${host} among [${recent.join(", ")}]`, nearMatchOf(host, recent), wanted);
}

function started(browser: FakeBrowser) {
	return app().modules(BrowserModule.with(browser.parts)).start();
}

function said(answer: Answer<unknown>): string {
	return answer.ok ? "ok" : answer.reason;
}

const searching = fakeBrowser();
const searched = await started(searching).send(SearchWebCommand, { text: "test.co", heldTabId: null });
check("a search answers", said(searched), "ok");
check("a search opens the one engine in the same tab", searching.pages.opened, [`${SEARCH_ENGINE}test.co`]);
check(
	"the guard logs the search like any navigation",
	searching.audit.access.map(({ kind, decision, siteKey }) => [kind, decision, siteKey]),
	[["navigate", "allow", "duckduckgo.com"]],
);

const hidden = fakeBrowser();
hidden.pages.isShownOnScreen = false;
check(
	"the guard refuses a search into a tab that is not on screen",
	said(await started(hidden).send(SearchWebCommand, { text: "test.co", heldTabId: null })),
	"tab-not-visible",
);
check("and nothing opens", hidden.pages.opened, []);

const NOT_FOUND: PageFailure = {
	kind: "not-found",
	address: "https://test.co/",
	code: "ERR_NAME_NOT_RESOLVED",
};

const shown = fakeBrowser();
shown.pages.tab = {
	...shown.pages.tab,
	url: NOT_FOUND.address,
	failure: NOT_FOUND,
};
const shownApp = started(shown);
const host = document.createElement("div");
document.body.append(host);
createRoot(host).render(h(AppProvider, { app: shownApp }, inBrowserPlate()));
await waitFor(() => host.querySelector("[data-browser-page-state]") !== null);

check(
	"not found draws Sumi asking",
	host.querySelector("[data-browser-page-state]")?.getAttribute("data-browser-page-state"),
	"question",
);
check(
	"with the board's title",
	host.querySelector("[data-browser-page-state] h2")?.textContent,
	"test.co didn't answer",
);
check(
	"the near match is offered",
	host.querySelector("[data-browser-near-match]")?.textContent,
	"Did you mean test.com?",
);
await waitFor(() => host.querySelector('[data-plate-place="crumb"] .wg-plate-crumb-first') !== null);
check(
	"the plate header's crumb names the site that didn't answer",
	host.querySelector('[data-plate-place="crumb"] .wg-plate-crumb-first')?.textContent,
	"test.co",
);
const searchPress = [...host.querySelectorAll<HTMLButtonElement>("[data-browser-primary-action]")].find(
	(button) => button.textContent === "Search for test.co",
);
searchPress?.click();
await waitFor(() => shown.pages.opened.length === 1);
check("pressing search opens the engine through the guard", shown.pages.opened, [`${SEARCH_ENGINE}test.co`]);

shown.pages.tab = {
	...shown.pages.tab,
	url: "",
	failure: null,
};
shown.recentSites.saveRecentSites([
	{
		host: "github.com",
		address: "https://github.com/",
		favicon: null,
	},
]);
shown.pages.told();
await waitFor(() => host.querySelector("[data-browser-new-tab-field]") !== null);
check(
	"a tab with no address draws the new tab",
	host.querySelector("[data-browser-page-state] h2")?.textContent,
	"Where to?",
);
check(
	"Sumi waits idle on it",
	host.querySelector("[data-browser-page-state]")?.getAttribute("data-browser-page-state"),
	"idle",
);
check(
	"the field keeps the header's placeholder",
	host.querySelector("[data-browser-new-tab-field] input")?.getAttribute("placeholder"),
	"Search or type an address",
);
check("the page field holds focus", document.activeElement?.closest("[data-browser-new-tab-field]") !== null, true);
check(
	"recent sites are chips",
	host.querySelector("[data-browser-recent-site]")?.getAttribute("data-browser-recent-site"),
	"github.com",
);
const newTabPrompt = await shownApp.send(AskInkPromptQuery, { tabId: "tab-1" });
check("asking Sumi on a new tab drafts its prompt", newTabPrompt.ok && newTabPrompt.output, "Find a page for me");

const refused = await shownApp.send(OpenAddressCommand, {
	tabId: "tab-1",
	address: "javascript:open()",
	heldTabId: null,
});
check("a refused scheme answers without a toast", said(refused), "ok");
await waitFor(() => host.querySelector('[data-browser-page-state="error"]') !== null);
check(
	"and draws the refused scheme",
	host.querySelector("[data-browser-page-state] h2")?.textContent,
	"javascript: links don't open here",
);
check("nothing was opened for it", shown.pages.opened, [`${SEARCH_ENGINE}test.co`]);

const COPY_SHOWN_FOR_MS = 2500;
const copied: string[] = [];
const copyButtonText = (): string | null | undefined => host.querySelector("[data-browser-quiet-action]")?.textContent;
const clipboardAnswers = (write: (text: string) => Promise<void>): void => {
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText: write },
		configurable: true,
	});
};
clipboardAnswers((text) => {
	copied.push(text);
	return Promise.resolve();
});
host.querySelector<HTMLButtonElement>("[data-browser-quiet-action]")?.click();
check("Copy link copies the refused address", (await waitFor(() => copied.length === 1)) && copied, [
	"javascript:open()",
]);
check("and says it copied", await waitFor(() => copyButtonText() === "Copied"), true);
check(
	"in the success token",
	host.querySelector("[data-browser-quiet-action]")?.classList.contains("cv:text-success"),
	true,
);
check("then turns back", await waitFor(() => copyButtonText() === "Copy link", COPY_SHOWN_FOR_MS), true);
clipboardAnswers(() => Promise.reject(new Error("denied")));
host.querySelector<HTMLButtonElement>("[data-browser-quiet-action]")?.click();
check("a failed copy says so", await waitFor(() => copyButtonText() === "Couldn't copy"), true);
check(
	"in the error token",
	host.querySelector("[data-browser-quiet-action]")?.classList.contains("cv:text-error"),
	true,
);
check("and turns back too", await waitFor(() => copyButtonText() === "Copy link", COPY_SHOWN_FOR_MS), true);
await shownApp.send(LeaveFailureCommand, { tabId: "tab-1" });
check("going back from a refused scheme dismisses it", shown.pages.moves.at(-1), "dismiss");

const visiting = fakeBrowser();
started(visiting);
visiting.pages.tab = {
	...visiting.pages.tab,
	url: "https://vite.dev/guide",
	favicon: "https://vite.dev/logo.svg",
};
visiting.pages.told();
await waitFor(() => visiting.recentSites.recentSites().length > 0);
check("a finished page is noted among recent sites", visiting.recentSites.recentSites(), [
	{
		host: "vite.dev",
		address: "https://vite.dev/",
		favicon: "https://vite.dev/logo.svg",
	},
]);
visiting.pages.tab = {
	...visiting.pages.tab,
	failure: NOT_FOUND,
	url: NOT_FOUND.address,
};
visiting.pages.told();
await waitFor(() => visiting.recentSites.recentSites().length > 1, EVENT_DELIVERED_WITHIN_MS);
check("a failed load is never noted", visiting.recentSites.recentSites().length, 1);

const PROMPTED: readonly (readonly [string, PageFailure | null, string])[] = [
	["a new tab", null, "Find a page for me"],
	["a name that did not resolve", NOT_FOUND, "Find the site I meant by test.co"],
	[
		"a site that timed out",
		{
			kind: "timed-out",
			address: "https://api.acme.dev/status",
			code: "ERR_CONNECTION_TIMED_OUT",
		},
		"Why won't api.acme.dev load?",
	],
	[
		"a bad certificate",
		{
			kind: "certificate",
			address: "https://shop-acme.com/",
			code: "ERR_CERT_AUTHORITY_INVALID",
		},
		"Why won't shop-acme.com load?",
	],
];

for (const [what, failure, prompt] of PROMPTED) {
	check(`Ask Sumi on ${what} drafts "${prompt}"`, askInkPromptOf({ ...shown.pages.tab, failure }), prompt);
}

const chatSent: string[] = [];
const chatApp = app()
	.modules(AssistantModule)
	.start({
		platform: "browser",
		scope: {
			workspaceId: "browser-state",
		},
		host: {
			webAssistant: NO_ASSISTANT,
		},
	});
const chatHost = document.createElement("div");
document.body.append(chatHost);
createRoot(chatHost).render(
	h(
		AppProvider,
		{ app: chatApp },
		h(Composer, {
			busy: false,
			isFirst: true,
			attached: null,
			onSend: async (said: string) => {
				chatSent.push(said);
				return true;
			},
			onStop: () => undefined,
			onTyped: () => undefined,
		}),
	),
);

const asking = fakeBrowser();
asking.pages.tab = {
	...asking.pages.tab,
	url: NOT_FOUND.address,
	failure: NOT_FOUND,
};
const askingHost = document.createElement("div");
document.body.append(askingHost);
createRoot(askingHost).render(
	h(
		AppProvider,
		{ app: app().modules(BrowserModule.with(asking.parts)).start() },
		h(
			AskComposerContext,
			{
				value: {
					app: null,
					ask: (text: string) => void chatApp.send(PrefillDraftCommand, { text }),
				},
			},
			h(Browser, {}),
		),
	),
);
await waitFor(
	() => askingHost.querySelector("[data-browser-ask-ink]") !== null && chatHost.querySelector("textarea") !== null,
);
const askInk = askingHost.querySelector<HTMLButtonElement>("[data-browser-ask-ink]");
check(
	"Ask Sumi is a live press with no native title",
	[askInk?.disabled, askInk?.hasAttribute("title")],
	[false, false],
);
askInk?.click();
const composerBox = chatHost.querySelector("textarea");
await waitFor(() => composerBox?.value !== "");
check("pressing Ask Sumi drafts the prompt in the composer", composerBox?.value, "Find the site I meant by test.co");
check("and focuses the composer", document.activeElement === composerBox, true);
check("and sends nothing", chatSent, []);

const signingIn = fakeBrowser();
signingIn.pages.tab = {
	...signingIn.pages.tab,
	url: "https://accounts.google.com/",
	failure: null,
};
const signingInHost = document.createElement("div");
document.body.append(signingInHost);
createRoot(signingInHost).render(h(AppProvider, { app: started(signingIn) }, inBrowserPlate()));
await waitFor(() => signingInHost.querySelector("[data-browser-kept-out]") !== null);
check(
	"a sign-in site Sumi may not read says so in the header's controls",
	signingInHost.querySelector('[data-plate-place="controls"] [data-browser-kept-out]')?.textContent,
	"Sumi kept out",
);
check(
	"and nothing stands over the page, so the page is never covered by a picture",
	signingInHost.querySelector("[data-browser-page-area] > :not([data-browser-pages])")?.outerHTML ?? null,
	null,
);
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
globalThis.requestAnimationFrame = (run: FrameRequestCallback): number => Number(setTimeout(() => run(0), 0));

try {
	signingInHost.querySelector<HTMLButtonElement>("[data-browser-kept-out]")?.click();
	await waitFor(() => document.querySelector("[data-browser-site-access]") !== null);
	check("pressing it opens site access", document.querySelector("[data-browser-site-access]") !== null, true);
} finally {
	globalThis.requestAnimationFrame = originalRequestAnimationFrame;
}

const exact = await exactStatesReport();
check("every state measures as its board in light and dark: the diff is empty", exact.differences, 0);
