import { lookPathOf } from "@widgetarium/core/app-look.js";
import { designPathOf } from "@widgetarium/core/app-design.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";
import type { DrawnDesign } from "../../../shared/schema/drawn-design.schema.js";
import { changeStampOf } from "../../../shared/lib/design/drawn-design.js";
import type { DesignVault } from "./drawn-design.js";

export interface PolledDesigns {
	readonly vault: DesignVault;
	readonly drawn: () => ReadonlyMap<string, DrawnDesign | null>;
	readonly changed: (app: string) => void;
}

const DESIGN_POLL_MS = 1500;

export function polledChanges({ vault, drawn, changed }: PolledDesigns): () => void {
	const seen = new Map<string, string>();
	const polling = {
		isBusy: false,
		isStopped: false,
	};
	const poll = async (): Promise<void> => {
		if (polling.isBusy) {
			return;
		}

		polling.isBusy = true;
		const stamps = await stampsNow(vault, drawn()).finally(() => (polling.isBusy = false));

		if (polling.isStopped) {
			return;
		}

		for (const [app, stamp] of stamps) {
			const was = seen.get(app);
			seen.set(app, stamp);

			if (was !== undefined && was !== stamp) {
				changed(app);
			}
		}
	};
	const timer = window.setInterval(() => void poll().catch(pollFailed), DESIGN_POLL_MS);
	void poll().catch(pollFailed);
	return () => {
		polling.isStopped = true;
		window.clearInterval(timer);
	};
}

function pollFailed(failure: unknown): void {
	console.error("[widgetarium] the design was not polled for changes", failure);
}

async function stampsNow(
	vault: DesignVault,
	drawn: ReadonlyMap<string, DrawnDesign | null>,
): Promise<Map<string, string>> {
	const stamps = await Promise.all(
		[...drawn].map(async ([app, design]) => [app, await stampNow(vault, app, design)] as const),
	);
	return new Map(stamps);
}

async function stampNow(vault: DesignVault, app: string, drawn: DrawnDesign | null): Promise<string> {
	const stats = await Promise.all(
		[designPathOf(app), specPathOf(app), lookPathOf(app)].map((path) => vault.adapter.stat(path).catch(() => null)),
	);
	return changeStampOf(
		vault.registry,
		stats.map((stat) => stat?.mtime ?? null),
		drawn ?? undefined,
	);
}
