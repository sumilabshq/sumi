import { app } from "../packages/shared/data-framework/src/index.ts";
import type { Answer, StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { CapturePageCommand, InkOpenAddressCommand, ReadPageContentCommand } from "../packages/domain/browser/index.ts";
import { LocalStorageBrowserGrantsGateway } from "../packages/domain/browser/gateways/browser-grants/local-storage.gateway.ts";
import { hasReadContentThisTurn } from "../packages/domain/browser/features/ink/lib/ink-turn.ts";
import { check, thrownBy, waitFor } from "./check-helpers.ts";
import { fakeBrowser } from "./browser-fakes.ts";
import type { FakeBrowser } from "./browser-fakes.ts";

function started(browser: FakeBrowser): StartedApp {
	return app().modules(BrowserModule({ injects: browser.parts })).start();
}

function said(answer: Answer<unknown>): string {
	return answer.ok ? "ok" : answer.reason;
}

const redirected = fakeBrowser();
redirected.pages.redirectTo = "https://www.paypal.com/signin";
redirected.pages.tab = {
	...redirected.pages.tab,
	canGoBack: true,
};
check(
	"a redirect to a blocked host is refused",
	said(await started(redirected).send(InkOpenAddressCommand, { url: "https://example.org/go" })),
	"redirected-to-closed-site",
);
check("and the tab is taken back", redirected.pages.moves, ["back"]);

const stranded = fakeBrowser();
stranded.pages.redirectTo = "https://www.paypal.com/signin";
await started(stranded).send(InkOpenAddressCommand, { url: "https://example.org/go" });
check("with no history the tab is left blank", stranded.pages.tab.url, "about:blank");

const arriving = fakeBrowser();
arriving.pages.redirectTo = "https://example.net/landed";
const arrived = await started(arriving).send(InkOpenAddressCommand, { url: "https://example.org/go" });
check("the committed address is what open answers", arrived.ok && arrived.output.url, "https://example.net/landed");

const sameHost = fakeBrowser();
sameHost.pages.tab = {
	...sameHost.pages.tab,
	url: "http://example.com/a",
};
const sameHostOpen = started(sameHost).send(InkOpenAddressCommand, { url: "http://example.com/b" });
check("the same host is checked too", await waitFor(() => sameHost.parts.accessAsks.accessAsks().length === 1), true);
sameHost.parts.accessAsks.saveAnswer(sameHost.parts.accessAsks.accessAsks()[0]?.id ?? "", "no");
check("and its no refuses", said(await sameHostOpen), "person-said-no");

const offScreen = fakeBrowser();
offScreen.pages.isShownOnScreen = false;
check(
	"open needs the tab on screen",
	said(await started(offScreen).send(InkOpenAddressCommand, { url: "https://example.org/" })),
	"tab-not-visible",
);

const shooting = fakeBrowser();
check("a screenshot is taken", said(await started(shooting).send(CapturePageCommand, { region: null })), "ok");
check("and counts as content read", hasReadContentThisTurn(shooting.parts.inkActivity.inkActivity(), Date.now()), true);

const stopping = fakeBrowser();
stopping.pages.duringRead = () =>
	stopping.parts.inkActivity.saveInkActivity({
		...stopping.parts.inkActivity.inkActivity(),
		stoppedAt: Date.now(),
	});
check(
	"a stop during the read refuses it",
	said(await started(stopping).send(ReadPageContentCommand, { tabId: null })),
	"stopped-by-person",
);

const blockedMidRead = fakeBrowser();
blockedMidRead.pages.duringRead = () =>
	blockedMidRead.grants.saveGrants(
		[
			{
				siteKey: "example.com",
				scope: "host",
				level: "blocked",
				source: "person",
				grantedAt: Date.now(),
				by: "person",
			},
		],
		{
			at: Date.now(),
			siteKey: "example.com",
			was: null,
			became: "blocked",
			by: "person",
			reason: "blocked during the read",
		},
	);
check(
	"a block set during the read refuses it",
	said(await started(blockedMidRead).send(ReadPageContentCommand, { tabId: null })),
	"person-blocked",
);

const hiddenMidRead = fakeBrowser();
hiddenMidRead.pages.duringRead = () => {
	hiddenMidRead.pages.isShownOnScreen = false;
};
check(
	"a tab hidden during the read refuses it",
	said(await started(hiddenMidRead).send(ReadPageContentCommand, { tabId: null })),
	"tab-not-visible",
);

const crossFramed = fakeBrowser();
crossFramed.pages.frames = ["https://example.com/board", "https://ads.example.net/slot"];
check(
	"a screenshot is refused with a cross-origin frame",
	said(await started(crossFramed).send(CapturePageCommand, { region: null })),
	"frame-not-allowed:ads.example.net",
);

const videoFramed = fakeBrowser();
videoFramed.pages.frames = ["https://example.com/board", "https://www.youtube.com/embed/x"];
check(
	"an allowed frame host does not block it",
	said(await started(videoFramed).send(CapturePageCommand, { region: null })),
	"ok",
);

const paying = fakeBrowser();
paying.pages.frames = ["https://example.com/board", "https://js.stripe.com/v3/elements"];
check(
	"a payment frame keeps the content unread",
	said(await started(paying).send(ReadPageContentCommand, { tabId: null })),
	"secret-field-on-page",
);

const queried = fakeBrowser();
queried.pages.tab = {
	...queried.pages.tab,
	url: "https://example.com/board?token=abc#secret",
};
await started(queried).send(ReadPageContentCommand, { tabId: null });
check(
	"the access log keeps origin and path only",
	queried.audit.access.map(({ finalUrl }) => finalUrl),
	["https://example.com/board", "https://example.com/board", "https://example.com/board"],
);

const kept = new Map<string, string>();
const failingChanges: Storage = {
	length: 0,
	clear: () => kept.clear(),
	key: () => null,
	getItem: (key: string) => kept.get(key) ?? null,
	removeItem: (key: string) => {
		kept.delete(key);
	},
	setItem: (key: string, value: string) => {
		if (key.includes("grant-changes")) {
			throw new Error("storage is full");
		}

		kept.set(key, value);
	},
};
const rolledBack = new LocalStorageBrowserGrantsGateway(failingChanges, "rollback-check");
check(
	"a grant whose log cannot be written is not kept",
	thrownBy(() =>
		rolledBack.saveGrants(
			[
				{
					siteKey: "example.com",
					scope: "host",
					level: "blocked",
					source: "person",
					grantedAt: 1,
					by: "person",
				},
			],
			{
				at: 1,
				siteKey: "example.com",
				was: null,
				became: "blocked",
				by: "person",
				reason: "test",
			},
		),
	),
	"storage is full",
);
check("and the grants read as before", rolledBack.grants(), []);
