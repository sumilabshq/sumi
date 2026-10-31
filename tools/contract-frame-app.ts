import {
	AppTabQuery,
	ClosedTabsQuery,
	FileSystemModule,
	PlacesModule,
	ReadFileQuery,
	SendTerminalCommand,
	TerminalModule,
	TerminalOutputQuery,
	WriteFileCommand,
} from "@sumi/contract";
import { app, messagePortTransport, portFromParent } from "@widgetarium/core/requests";

const NOTE_PATH = "notes/today.txt";
const NOTE = "written by the frame";
const TYPED = "echo sumi-$((40+2))";
const SHELL_SAID = "sumi-42";
const OUTPUT_WAIT_MS = 5000;
const OUTPUT_STEP_MS = 100;
const SECOND_PORT_WAIT_MS = 1500;

const transport = messagePortTransport(portFromParent());
const heard = {
	changes: 0,
};
transport.changes(() => {
	heard.changes += 1;
});
const sumi = app()
	.imports(FileSystemModule.over(transport), TerminalModule.over(transport), PlacesModule.over(transport))
	.start();

async function terminalSaid(): Promise<string> {
	for (let leftMs = OUTPUT_WAIT_MS; leftMs > 0; leftMs -= OUTPUT_STEP_MS) {
		const output = await sumi.send(TerminalOutputQuery);

		if (output.ok && output.output.output.includes(SHELL_SAID)) {
			return output.output.output;
		}

		await new Promise((settled) => setTimeout(settled, OUTPUT_STEP_MS));
	}

	const last = await sumi.send(TerminalOutputQuery);
	return last.ok ? last.output.output : last.reason;
}

async function run(): Promise<unknown> {
	const written = await sumi.send(WriteFileCommand, { path: NOTE_PATH, content: NOTE });
	const read = await sumi.send(ReadFileQuery, { path: NOTE_PATH });
	const climbed = await sumi.send(ReadFileQuery, { path: "../other-app/secret.txt" });
	const closedTabs = await sumi.send(ClosedTabsQuery);
	const otherTab = await sumi.send(AppTabQuery, {
		id: new URLSearchParams(location.hash.slice(1)).get("sumi-tab") ?? "",
	});
	const typed = await sumi.send(SendTerminalCommand, { line: TYPED });
	return {
		origin: self.origin,
		written: written.ok,
		read: read.ok ? read.output : read.reason,
		climbed: climbed.ok ? "read" : climbed.code,
		closedTabs: closedTabs.ok ? "answered" : closedTabs.code,
		otherTab: otherTab.ok ? "answered" : otherTab.code,
		typed: typed.ok,
		terminal: await terminalSaid(),
		secondPort: await portFromParent(window, SECOND_PORT_WAIT_MS).then(
			() => "handed",
			() => "refused",
		),
		changesHeard: heard.changes,
	};
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
