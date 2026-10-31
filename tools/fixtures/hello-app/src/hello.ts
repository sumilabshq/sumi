import { AppTabQuery, PlacesModule, RecordAppPageCommand } from "@sumi/contract";
import { app, messagePortTransport, portFromParent } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";

declare const HELLO_VERSION: string;
declare const HELLO_SENDS_READY: boolean;

const NEXT_ADDRESS = "/page-2";
const GO_ADDRESS = "/go";
const TAB_KEY = "sumi-tab";

const said = document.querySelector("#said");
const next = document.querySelector("#next");
const tabId = new URLSearchParams(location.hash.slice(1)).get(TAB_KEY) ?? "";

function say(text: string): void {
	if (said !== null) {
		said.textContent = text;
	}

	document.body.dataset.said = text;
}

async function shownAddress(sumi: StartedApp): Promise<string> {
	const tab = await sumi.send(AppTabQuery, { id: tabId });

	if (!tab.ok) {
		say(tab.reason);
		return "";
	}

	return tab.output.address ?? "";
}

async function show(sumi: StartedApp, address: string): Promise<void> {
	say(`Hello ${HELLO_VERSION} at ${address === "" ? "/" : address}`);

	if (address === GO_ADDRESS) {
		await goNext(sumi);
	}
}

async function goNext(sumi: StartedApp): Promise<void> {
	await sumi.send(RecordAppPageCommand, { id: tabId, address: NEXT_ADDRESS });
	say(`Hello ${HELLO_VERSION} at ${NEXT_ADDRESS}`);
}

async function started(): Promise<void> {
	if (!HELLO_SENDS_READY) {
		say(`Hello ${HELLO_VERSION} never answers`);
		return;
	}

	const transport = messagePortTransport(portFromParent());
	const sumi = app().imports(PlacesModule.over(transport)).start();
	const shown = {
		address: await shownAddress(sumi),
	};
	await sumi.send(RecordAppPageCommand, { id: tabId, title: `Hello ${HELLO_VERSION}` });
	await show(sumi, shown.address);
	transport.changes(() => {
		void shownAddress(sumi).then((address) => {
			if (address !== shown.address) {
				shown.address = address;
				void show(sumi, address);
			}
		});
	});
	next?.addEventListener("click", () => void goNext(sumi));
}

started().catch((failure: unknown) => say(failure instanceof Error ? failure.message : String(failure)));
