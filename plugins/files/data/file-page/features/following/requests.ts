import { places, fileSystem } from "@sumi/contract";
import { subscriber } from "#module";
import { windowCameBack, windowLeft } from "../../shared/events/window.events.js";
import { followStepOf } from "./lib/followed-file.js";

const FOLLOWED = "[widgetarium] file tab {tab} {from} → {to} (its file was renamed while the window was away)";
const STAYED = "[widgetarium] file tab {tab} follow skipped: {reason}";

export const learnTabFile = subscriber(windowLeft).handle(async (_input, { send, pageTab, heldFile }) => {
	const { address } = await send(places.tabFacts.ownAppTab, { id: pageTab.tabId() });

	if (address === null || address === "") {
		return;
	}

	const { identity } = await send(fileSystem.files.info, { path: address });

	if (identity !== null) {
		heldFile.saveHeldFile({ path: address, identity });
	}
});

export const followTabFile = subscriber(windowCameBack).handle(async (_input, { send, pageTab, heldFile }) => {
	const held = heldFile.heldFile();
	const tabId = pageTab.tabId();
	const { address } = await send(places.tabFacts.ownAppTab, { id: tabId });
	const located = held === null ? null : (await send(fileSystem.files.located, held)).path;
	const step = followStepOf(held, address, located);

	if (step.kind === "stay") {
		console.info(STAYED.replace("{tab}", tabId).replace("{reason}", step.reason));
		return;
	}

	await send(places.tabFacts.recordAppAddress, { id: tabId, address: step.to, how: "replace" });
	heldFile.saveHeldFile({ path: step.to, identity: step.from.identity });
	console.info(FOLLOWED.replace("{tab}", tabId).replace("{from}", step.from.path).replace("{to}", step.to));
});
