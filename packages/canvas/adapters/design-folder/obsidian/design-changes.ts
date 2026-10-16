import { lookPathOf } from "@widgetarium/core/app-look.js";
import { designPathOf } from "@widgetarium/core/app-design.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";
import type { DrawnDesign } from "../../../shared/schema/design.schema.js";
import { changeStampOf } from "../../../shared/lib/design/drawn-design.js";
import type { DesignVault } from "./drawn-design.js";

const DESIGN_POLL_MS = 1500;

export function polledChanges(
	vault: DesignVault,
	app: string,
	drawn: () => DrawnDesign | undefined,
	changed: () => void,
): () => void {
	let seen = "";
	let isBusy = false;
	let isStopped = false;
	const poll = async (): Promise<void> => {
		if (isBusy) return;
		isBusy = true;
		const now = await stampNow(vault, app, drawn()).finally(() => (isBusy = false));
		if (isStopped) return;
		if (seen !== "" && now !== seen) changed();
		seen = now;
	};
	const timer = window.setInterval(() => void poll().catch(pollFailed), DESIGN_POLL_MS);
	void poll().catch(pollFailed);
	return () => {
		isStopped = true;
		window.clearInterval(timer);
	};
}

function pollFailed(failure: unknown): void {
	console.error("[widgetarium] the design was not polled for changes", failure);
}

async function stampNow(vault: DesignVault, app: string, drawn: DrawnDesign | undefined): Promise<string> {
	const stats = await Promise.all(
		[designPathOf(app), specPathOf(app), lookPathOf(app)].map((path) => vault.adapter.stat(path).catch(() => null)),
	);
	return changeStampOf(
		vault.registry,
		stats.map((stat) => stat?.mtime ?? null),
		drawn,
	);
}
