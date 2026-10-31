import { connect } from "@sumi/contract";
import type { SumiPort } from "@sumi/contract";

declare const HELLO_VERSION: string;
declare const HELLO_SENDS_READY: boolean;

const BUSY_ADDRESS = "/busy";
const IDLE_ADDRESS = "/idle";
const NEXT_ADDRESS = "/page-2";
const GO_ADDRESS = "/go";

const said = document.querySelector("#said");
const next = document.querySelector("#next");

function say(text: string): void {
	if (said !== null) {
		said.textContent = text;
	}

	document.body.dataset.said = text;
}

function shown(port: SumiPort, address: string): void {
	say(`Hello ${HELLO_VERSION} at ${address === "" ? "/" : address} in ${port.welcome.workspace.name}`);

	if (address === BUSY_ADDRESS) {
		port.emit({
			type: "busy",
			isBusy: true,
			reason: "holding a draft",
		});
	}

	if (address === IDLE_ADDRESS) {
		port.emit({
			type: "busy",
			isBusy: false,
			reason: null,
		});
	}

	if (address === GO_ADDRESS) {
		goNext(port);
	}
}

function goNext(port: SumiPort): void {
	port.emit({
		type: "navigated",
		address: NEXT_ADDRESS,
		mode: "push",
	});
	say(`Hello ${HELLO_VERSION} at ${NEXT_ADDRESS} in ${port.welcome.workspace.name}`);
}

function started(port: SumiPort): void {
	shown(port, port.welcome.address);
	port.emit({
		type: "title",
		text: `Hello ${HELLO_VERSION} in ${port.welcome.workspace.name}`,
	});
	port.on((event) => {
		if (event.type === "show") {
			shown(port, event.address);
		}
	});
	next?.addEventListener("click", () => goNext(port));

	if (HELLO_SENDS_READY) {
		port.emit({
			type: "ready",
		});
	}
}

connect({
	app: "hello",
	version: HELLO_VERSION,
}).then(started, (failure: unknown) => say(failure instanceof Error ? failure.message : String(failure)));
