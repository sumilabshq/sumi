import { readFileSync } from "node:fs";
import { app, localTransport, messagePortListener, messagePortTransport } from "@widgetarium/data-framework";
import { createFrameRelay, hearsAll } from "../apps/studio/src/features/app-frame/lib/frame-relay.ts";
import { frameModuleRouteOf } from "../apps/studio/src/tabs/frame-routes.ts";
import { server } from "@widgetarium/data-framework/server";
import { CONTRACT_VERSION, contractRefusal, defineApp } from "../packages/shared/contract/index.ts";
import { ReadFileQuery, WriteFileCommand, FileSystemModule } from "../packages/shared/contract/index.ts";
import {
	AssistantModule,
	AttachFolderCommand,
	ChatQuery,
	ChooseProviderCommand,
	FileDragQuery,
	OpenProvidersCommand,
	OpenWebPageCommand,
	PickWorkingFolderCommand,
	SendMessageCommand,
	WebPageModule,
	WebPageQuery,
} from "../packages/shared/contract/index.ts";
import type { RemoteModule, RemoteTransport, ServingServer, StartedApp } from "@widgetarium/data-framework";
import { WebPageModule as RunnableWebPageModule } from "../plugins/browser-page/data/web-page/module.ts";
import { AssistantModule as RunnableAssistantModule } from "../plugins/chat/data/assistant/module.ts";
import { echoAssistantPort } from "./echo-assistant-port.ts";
import { MemoryFilesGateway } from "../apps/tauri/capabilities/file-system/gateways/files/memory.gateway.ts";
import { FileSystemModule as RunnableFileSystemModule } from "../apps/tauri/capabilities/file-system/module.ts";
import { AppCallerAuthenticate, APP_CALLER_HEADER } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally, thrownBy } from "./check-helpers.ts";

const WEB_PAGE_TABS: ReadonlyMap<string, string> = new Map([
	["t1", "notes"],
	["t2", "tasks"],
]);

const MANIFEST = {
	id: "tasks",
	name: "Tasks",
	version: "1.0.0",
	contract: "^0.1",
	ui: "index.html",
};

check("a newer minor of the same major serves an older app", contractRefusal("^1.4", "1.7.0"), null);
check(
	"an app needing a newer minor asks for a Sumi update",
	contractRefusal("^1.9", "1.7.0")?.includes("update Sumi"),
	true,
);
check(
	"an app built for an older major asks for an app update",
	contractRefusal("^1.4", "2.0.0")?.includes("update the app"),
	true,
);
check(
	"an app built for a newer major asks for a Sumi update",
	contractRefusal("^2.0", "1.7.0")?.includes("update Sumi"),
	true,
);
check(
	"before 1.0 a minor is a breaking line",
	[contractRefusal("^0.1", "0.1.3"), contractRefusal("^0.1", "0.2.0")?.includes("update the app")],
	[null, true],
);
check(
	"a range that is not ^major.minor is refused with the shape it needs",
	contractRefusal("1.4", "1.7.0")?.includes("^major.minor"),
	true,
);
check(
	"^0.0.x pins the exact patch",
	[contractRefusal("^0.0.3", "0.0.3"), contractRefusal("^0.0.3", "0.0.9")?.includes("update the app")],
	[null, true],
);
check(
	"the contract version is the package version",
	CONTRACT_VERSION,
	JSON.parse(readFileSync("packages/shared/contract/package.json", "utf8")).version,
);
check("a manifest fills what it leaves out", [defineApp(MANIFEST).modules, defineApp(MANIFEST).mcp], [[], false]);
check(
	"an id with capitals is refused",
	thrownBy(() => defineApp({ ...MANIFEST, id: "Tasks" })).includes("lowercase"),
	true,
);

const core = server()
	.modules(RunnableFileSystemModule({ injects: { files: new MemoryFilesGateway("/data", "contract") } }))
	.start({ env: {}, host: { authenticate: new AppCallerAuthenticate() } });
const channel = new MessageChannel();
const stopServing = messagePortListener(channel.port1, { headers: { [APP_CALLER_HEADER]: "notes" } }).serve(core);
const heard = { changes: 0 };
const transport = messagePortTransport(channel.port2);
transport.changes(() => {
	heard.changes += 1;
});
const sumi = app().imports(FileSystemModule({ over: transport })).start();
await sumi.send(WriteFileCommand, { path: "a.txt", content: "over a port" });
const read = await sumi.send(ReadFileQuery, { path: "a.txt" });
check(
	"a call over a MessagePort is answered, stamped by the listener",
	read.ok ? read.output : read.reason,
	"over a port",
);
check("a change crosses the port to the calling side", heard.changes > 0, true);
stopServing();
channel.port2.close();

const relay = createFrameRelay([
	{
		module: FileSystemModule,
		transport: localTransport(),
		hears: hearsAll,
	},
]);
const notRelayed = await relay.answer({
	name: "tasks/board",
	input: undefined,
	idempotencyKey: null,
	signal: new AbortController().signal,
});
check(
	"the relay refuses a request of a module the contract does not list",
	notRelayed.ok ? "answered" : notRelayed.code,
	"not-found",
);
const forged = await new AppCallerAuthenticate().userOf(new Headers({ [APP_CALLER_HEADER]: "../Other App" })).then(
	() => "accepted",
	() => "refused",
);
check("a caller header that is not an app id is refused, never read as no caller", forged, "refused");

function appOver(
	served: ServingServer,
	imported: (transport: RemoteTransport) => RemoteModule,
	caller: string | null,
): StartedApp {
	const port = new MessageChannel();
	const headers = caller === null ? {} : { [APP_CALLER_HEADER]: caller };
	messagePortListener(port.port1, { headers }).serve(served);
	return app()
		.imports(imported(messagePortTransport(port.port2)))
		.start();
}

const webPages = server()
	.modules(
		RunnableWebPageModule({
			kind: "web",
			webAppTabs: {
				appOfTab: (tab: string) => Promise.resolve(WEB_PAGE_TABS.get(tab) ?? null),
			},
		}),
	)
	.start({
		env: {},
		scope: {
			workspaceId: "contract",
		},
		host: {
			authenticate: new AppCallerAuthenticate(),
		},
	});
const webPagesLocal = localTransport();
webPagesLocal.serve(webPages);
const heardByT1: string[] = [];
createFrameRelay([
	frameModuleRouteOf(
		{
			transport: webPagesLocal,
			release: () => undefined,
		},
		WebPageModule,
		"t1",
	),
]).changes((invalidated) => {
	heardByT1.push(...invalidated.map(({ inputKey }) => inputKey ?? "all"));
});
const pages = appOver(webPages, (transport) => WebPageModule({ over: transport }), "notes");
await pages.send(OpenWebPageCommand, { tab: "t1", url: "https://example.com/page#private-token" });
await appOver(webPages, (transport) => WebPageModule({ over: transport }), "tasks").send(OpenWebPageCommand, {
	tab: "t2",
	url: "https://example.org/",
});
const page = await pages.send(WebPageQuery, { tab: "t1" });
check(
	"web-page from the contract opens and reads a page over memory (a fake browser), its fragment left out",
	page.ok ? [page.output?.title, page.output?.url] : page.reason,
	["example.com", "https://example.com/page"],
);
const otherPage = await pages.send(WebPageQuery, { tab: "t2" });
check("web-page refuses a tab that does not hold the calling app", otherPage.ok ? "read" : otherPage.code, "forbidden");
check(
	"a frame's web-page route hears its own tab's changes, never another tab's",
	[heardByT1.includes(JSON.stringify({ tab: "t1" })), heardByT1.includes(JSON.stringify({ tab: "t2" }))],
	[true, false],
);

const chat = server()
	.modules(
		RunnableAssistantModule({
			kind: "web",
			webAssistant: echoAssistantPort(),
		}),
	)
	.start({
		env: {},
		scope: {
			workspaceId: "contract",
		},
		host: {
			authenticate: new AppCallerAuthenticate(),
		},
	});
const chatOfApp = appOver(chat, (transport) => AssistantModule({ over: transport }), "chat");
await chatOfApp.send(SendMessageCommand, { chat: null, said: "hi" });
const chatRead = await chatOfApp.send(ChatQuery, { chat: null });
check(
	"an app sends a message and reads the answer through the assistant contract",
	chatRead.ok ? chatRead.output.session.turns.map(({ text }) => text) : chatRead.reason,
	["hi", "echo: hi"],
);
const chosenByChat = [
	await chatOfApp.send(PickWorkingFolderCommand, { chat: null }),
	await chatOfApp.send(ChooseProviderCommand, { chat: null, id: "claude" }),
	await chatOfApp.send(OpenProvidersCommand, { chat: null }),
];
check(
	"the chat app picks a folder, chooses a provider and opens the providers itself",
	chosenByChat.map((answer) => answer.ok || answer.code !== "forbidden"),
	[true, true, true],
);
const shellOnly = [await chatOfApp.send(AttachFolderCommand, { chat: null }), await chatOfApp.send(FileDragQuery, { chat: null })];
check(
	"an app may not lend a folder or hear file drags: those are the shell's",
	shellOnly.map((answer) => (answer.ok ? "answered" : answer.code)),
	["forbidden", "forbidden"],
);
const shellPicked = await appOver(chat, (transport) => AssistantModule({ over: transport }), null).send(
	PickWorkingFolderCommand,
	{ chat: null },
);
check(
	"the shell, with no app caller, is not held to the app list",
	shellPicked.ok ? "picked" : shellPicked.code !== "forbidden",
	true,
);

console.log(tally.failed ? `sumi contract: ${tally.failed} check(s) failed` : "sumi contract: all checks passed");
process.exit(tally.failed ? 1 : 0);
