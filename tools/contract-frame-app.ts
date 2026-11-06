import {
	AppTabQuery,
	AssistantModule,
	ChatQuery,
	OpenWebPageCommand,
	PickWorkingFolderCommand,
	RecordAppPageCommand,
	SendMessageCommand,
	WebPageModule,
	WebPageQuery,
	ClosedTabsQuery,
	FileSystemModule,
	PlacesModule,
	ReadFileQuery,
	SendTerminalCommand,
	TerminalModule,
	TerminalOutputQuery,
	WriteFileCommand,
} from "@sumi/contract";
import { app, messagePortTransport, portFromParent } from "@widgetarium/data-framework";

const NOTE_PATH = "notes/today.txt";
const NOTE = "written by the frame";
const TYPED = "echo sumi-$((40+2))";
const SHELL_SAID = "sumi-42";
const OUTPUT_WAIT_MS = 5000;
const OUTPUT_STEP_MS = 100;
const SECOND_PORT_WAIT_MS = 1500;
const OWN_TAB = new URLSearchParams(location.hash.slice(1)).get("sumi-tab") ?? "";
const CHAT_SAID = "hello from the frame";
const CHAT_PAGE = "/chat.html";
const CHAT_TAB = "c1";

const transport = messagePortTransport(portFromParent());
const heard = {
	changes: 0,
};
transport.changes(() => {
	heard.changes += 1;
});
const sumi = app()
	.imports(
		FileSystemModule.over(transport),
		TerminalModule.over(transport),
		PlacesModule.over(transport),
		WebPageModule.over(transport),
		AssistantModule.over(transport),
	)
	.start();

async function terminalSaid(): Promise<string> {
	for (let leftMs = OUTPUT_WAIT_MS; leftMs > 0; leftMs -= OUTPUT_STEP_MS) {
		const output = await sumi.send(TerminalOutputQuery, { tab: OWN_TAB });

		if (output.ok && output.output.output.includes(SHELL_SAID)) {
			return output.output.output;
		}

		await new Promise((settled) => setTimeout(settled, OUTPUT_STEP_MS));
	}

	const last = await sumi.send(TerminalOutputQuery, { tab: OWN_TAB });
	return last.ok ? last.output.output : last.reason;
}

async function filesTold(): Promise<object> {
	const written = await sumi.send(WriteFileCommand, { path: NOTE_PATH, content: NOTE });
	const read = await sumi.send(ReadFileQuery, { path: NOTE_PATH });
	const climbed = await sumi.send(ReadFileQuery, { path: "../other-app/secret.txt" });
	return {
		origin: self.origin,
		written: written.ok,
		read: read.ok ? read.output : read.reason,
		climbed: climbed.ok ? "read" : climbed.code,
	};
}

async function placesTold(): Promise<object> {
	const closedTabs = await sumi.send(ClosedTabsQuery);
	const otherTab = await sumi.send(AppTabQuery, { id: "t9" });
	const ownTab = await sumi.send(AppTabQuery, { id: OWN_TAB });
	return {
		closedTabs: closedTabs.ok ? "answered" : closedTabs.code,
		otherTab: otherTab.ok ? "answered" : otherTab.code,
		ownTab: ownTab.ok ? ownTab.output.address : ownTab.reason,
	};
}

async function terminalTold(): Promise<object> {
	const typed = await sumi.send(SendTerminalCommand, { tab: OWN_TAB, line: TYPED });
	return {
		typed: typed.ok,
		terminal: await terminalSaid(),
	};
}

async function webPageTold(): Promise<object> {
	await sumi.send(OpenWebPageCommand, { tab: OWN_TAB, url: "https://example.com/start" });
	const webPage = await sumi.send(WebPageQuery, { tab: OWN_TAB });
	const otherWebPage = await sumi.send(WebPageQuery, { tab: "t9" });
	return {
		webPage: webPage.ok ? webPage.output?.title : webPage.reason,
		otherWebPage: otherWebPage.ok ? "read" : otherWebPage.code,
	};
}

async function chatTold(): Promise<object> {
	await sumi.send(SendMessageCommand, { said: CHAT_SAID });
	const chat = await sumi.send(ChatQuery);
	const pickedFolder = await sumi.send(PickWorkingFolderCommand);
	return {
		chat: chat.ok ? chat.output.session.turns.at(-1)?.text : chat.reason,
		pickedFolder: pickedFolder.ok ? "picked" : pickedFolder.code,
	};
}

async function foreignChatTold(): Promise<object> {
	await sumi.send(RecordAppPageCommand, { id: OWN_TAB, address: `/${CHAT_TAB}` });
	const foreignChat = await sumi.send(ChatQuery);
	return {
		foreignChat: foreignChat.ok ? "read" : foreignChat.code,
	};
}

function run(): Promise<unknown> {
	return location.pathname === CHAT_PAGE ? chatTold() : notesTold();
}

async function notesTold(): Promise<unknown> {
	const told = [
		await filesTold(),
		await placesTold(),
		await terminalTold(),
		await webPageTold(),
		await foreignChatTold(),
	];
	const secondPort = await portFromParent(window, SECOND_PORT_WAIT_MS).then(
		() => "handed",
		() => "refused",
	);
	return Object.assign({}, ...told, {
		secondPort,
		changesHeard: heard.changes,
	});
}

run().then(
	(result) => {
		document.body.dataset["frameResult"] = JSON.stringify(result);
	},
	(failure: unknown) => {
		document.body.dataset["frameResult"] = JSON.stringify({
			failure: String(failure),
		});
	},
);
