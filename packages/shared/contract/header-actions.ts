import type { RemoteTransport, Runtime } from "@widgetarium/data-framework";
import { AppPageQuery, RecordAppPageCommand, TakeActionPressCommand } from "./generated/apps.js";
import type { AppAction } from "./generated/apps.js";

export interface HeaderActionsFrame {
	readonly sumi: Runtime;
	readonly transport: RemoteTransport;
	readonly tabId: string;
}

export interface HeaderAction extends AppAction {
	readonly run: () => void;
}

export interface HeaderActions {
	readonly show: (actions: readonly HeaderAction[]) => void;
	readonly stop: () => void;
}

export function startHeaderActions(frame: HeaderActionsFrame): HeaderActions {
	const runs = new Map<string, () => void>();
	let recording = Promise.resolve();
	return {
		show: (actions) => {
			runs.clear();
			actions.forEach(({ id, run }) => runs.set(id, run));
			recording = recording.then(() => recordActions(frame, actions.map(appActionOf)));
		},
		stop: watchActionPresses(frame, (action) => runPressed(runs, action)),
	};
}

function runPressed(runs: ReadonlyMap<string, () => void>, action: string): void {
	const run = runs.get(action);

	if (run === undefined) {
		console.warn(`[sumi] action ${action} was pressed while no page shows it`);
		return;
	}

	run();
}

function appActionOf(action: HeaderAction): AppAction {
	return {
		id: action.id,
		label: action.label,
		icon: action.icon,
		isOff: action.isOff,
		isBusy: action.isBusy,
	};
}

async function recordActions({ sumi, tabId }: HeaderActionsFrame, actions: AppAction[]): Promise<void> {
	const recorded = await sumi.send(RecordAppPageCommand, { id: tabId, actions });

	if (!recorded.ok) {
		console.error(`[sumi] showing the actions of tab ${tabId} was refused: ${recorded.reason}`);
	}
}

function watchActionPresses(frame: HeaderActionsFrame, onPress: (action: string) => void): () => void {
	const seenPressIds = new Set<string>();
	const takeWaiting = (): void => void takeWaitingPresses(frame, seenPressIds, onPress);
	takeWaiting();
	return frame.transport.changes(takeWaiting);
}

async function takeWaitingPresses(
	frame: HeaderActionsFrame,
	seenPressIds: Set<string>,
	onPress: (action: string) => void,
): Promise<void> {
	const page = await frame.sumi.send(AppPageQuery, { id: frame.tabId });

	if (!page.ok) {
		console.error(`[sumi] reading the presses of tab ${frame.tabId} was refused: ${page.reason}`);
		return;
	}

	for (const { id } of page.output.presses.filter((press) => !seenPressIds.has(press.id))) {
		seenPressIds.add(id);
		void takePress(frame, id, onPress);
	}
}

async function takePress(
	{ sumi, tabId }: HeaderActionsFrame,
	pressId: string,
	onPress: (action: string) => void,
): Promise<void> {
	const taken = await sumi.send(TakeActionPressCommand, { id: tabId, press: pressId });

	if (!taken.ok) {
		console.info(`[sumi] press ${pressId} of tab ${tabId} not taken here: ${taken.reason}`);
		return;
	}

	onPress(taken.output.action);
}
