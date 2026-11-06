import { app, localTransport, messagePortListener, messagePortTransport } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import { server } from "@widgetarium/data-framework/server";
import {
	CloseWebPageCommand,
	GoBackWebPageCommand,
	GoForwardWebPageCommand,
	OpenWebPageCommand,
	PlaceWebPageCommand,
	WebPageModule,
	WebPageQuery,
} from "../packages/domain/web-page/index.ts";
import { AppTabsGateway } from "../packages/domain/web-page/gateways/app-tabs/app-tabs.gateway.ts";
import { MemoryWebPagesGateway } from "../packages/domain/web-page/gateways/web-pages/memory.gateway.ts";
import { WebPageModule as RunnableWebPageModule } from "../packages/domain/web-page/module.ts";
import { APP_CALLER_HEADER, AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

const TABS: Readonly<Record<string, string>> = {
	t1: "notes",
	t2: "tasks",
};

class FixedAppTabsGateway extends AppTabsGateway {
	override appOfTab(tab: string): Promise<string | null> {
		return Promise.resolve(TABS[tab] ?? null);
	}
}

const webPages = new MemoryWebPagesGateway();
const served = server()
	.modules(
		RunnableWebPageModule.with({
			webPages,
			appTabs: new FixedAppTabsGateway(),
		}),
	)
	.start({
		env: {},
		host: { authenticate: new AppCallerAuthenticate() },
	});

function appOver(caller: string | null): StartedApp {
	const channel = new MessageChannel();
	const headers = caller === null ? {} : { [APP_CALLER_HEADER]: caller };
	messagePortListener(channel.port1, { headers }).serve(served);
	return app()
		.imports(WebPageModule.over(messagePortTransport(channel.port2)))
		.start();
}

const notes = appOver("notes");
const opened = await notes.send(OpenWebPageCommand, { tab: "t1", url: "https://example.com/a" });
const read = await notes.send(WebPageQuery, { tab: "t1" });
check("open-web-page is answered ok", opened.ok, true);
check("web-page reads the opened page, titled by its host (memory fake)", read.ok ? read.output : read.reason, {
	url: "https://example.com/a",
	title: "example.com",
	isLoading: false,
	canGoBack: false,
	canGoForward: false,
});

const scheme = await notes.send(OpenWebPageCommand, { tab: "t1", url: "file:///etc/passwd" });
check(
	"a url that is not http or https is refused",
	scheme.ok ? "opened" : [scheme.code, scheme.reason.includes("not a web scheme")],
	["refused", true],
);

const foreign = await notes.send(WebPageQuery, { tab: "t2" });
check("a tab holding another app is forbidden", foreign.ok ? "answered" : foreign.code, "forbidden");
const foreignOpen = await notes.send(OpenWebPageCommand, { tab: "t9", url: "https://example.com" });
check("a tab no app holds is forbidden", foreignOpen.ok ? "opened" : foreignOpen.code, "forbidden");

const anonymous = await appOver(null).send(WebPageQuery, { tab: "t1" });
check("a call with no app caller is unauthenticated", anonymous.ok ? "answered" : anonymous.code, "unauthenticated");

await notes.send(OpenWebPageCommand, { tab: "t1", url: "https://example.org/b" });
const back = await notes.send(GoBackWebPageCommand, { tab: "t1" });
const afterBack = await notes.send(WebPageQuery, { tab: "t1" });
check(
	"go-back-web-page moves to the page before",
	[back.ok, afterBack.ok ? afterBack.output?.url : afterBack.reason],
	[true, "https://example.com/a"],
);
const forward = await notes.send(GoForwardWebPageCommand, { tab: "t1" });
const noForward = await notes.send(GoForwardWebPageCommand, { tab: "t1" });
check(
	"go-forward-web-page moves on, and refuses when there is nothing ahead",
	[forward.ok, noForward.ok ? "moved" : noForward.code],
	[true, "refused"],
);

const placed = await notes.send(PlaceWebPageCommand, {
	tab: "t1",
	area: {
		x: 10,
		y: 20,
		width: 300,
		height: 200,
	},
});
check(
	"place-web-page keeps the area in the frame's pixels",
	[placed.ok, webPages.pageArea("t1")],
	[
		true,
		{
			x: 10,
			y: 20,
			width: 300,
			height: 200,
		},
	],
);

const outOfBounds = await Promise.all(
	[-1, 16_385, Number.POSITIVE_INFINITY].map((x) =>
		notes.send(PlaceWebPageCommand, {
			tab: "t1",
			area: {
				x,
				y: 0,
				width: 10,
				height: 10,
			},
		}),
	),
);
check(
	"place-web-page refuses an area off the 0 to 16384 pixel range",
	outOfBounds.map((answer) => (answer.ok ? "placed" : answer.code)),
	["invalid-input", "invalid-input", "invalid-input"],
);

const heard = {
	changes: 0,
};
const local = localTransport();
const stopLocal = local.serve(served);
local.changes((invalidated) => {
	heard.changes += invalidated.filter(({ query }) => query === WebPageQuery.name).length;
});
await webPages.reloadPage("t1");
check("a page changing outside any call re-reads web-page for listeners", await waitFor(() => heard.changes > 0), true);
stopLocal();

const closed = await notes.send(CloseWebPageCommand, { tab: "t1" });
const gone = await notes.send(WebPageQuery, { tab: "t1" });
const placeGone = await notes.send(PlaceWebPageCommand, { tab: "t1", area: null });
check(
	"close-web-page leaves no page, and placing it is refused",
	[closed.ok, gone.ok ? gone.output : gone.reason, placeGone.ok ? "placed" : placeGone.code],
	[true, null, "refused"],
);

console.log(tally.failed ? `web-page pages: ${tally.failed} check(s) failed` : "web-page pages: all checks passed");
process.exit(tally.failed ? 1 : 0);
