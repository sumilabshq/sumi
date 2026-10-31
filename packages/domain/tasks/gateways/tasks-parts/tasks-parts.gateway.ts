import { invoke } from "@tauri-apps/api/core";
import type { ModuleFacts, Platform } from "@widgetarium/core/requests";
import { StoreClient, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import { ClockGateway, SystemClockGateway } from "../clock/clock.gateway.js";
import { MemoryTasksGateway } from "../tasks/memory.gateway.js";
import { TauriTasksGateway } from "../tasks/tauri.gateway.js";
import type { TasksGateway } from "../tasks/tasks.gateway.js";

export type TasksParts = {
	readonly tasks: TasksGateway;
	readonly clock: ClockGateway;
};

const TASKS_STORE = "TASKS_STORE";
const TAURI_TASKS_STORE = "tauri";

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => TasksParts>> = {
	browser: memoryTasksParts,
	tauri: memoryTasksParts,
	server: serverTasksParts,
};

export function tasksPartsOn(facts: ModuleFacts): TasksParts {
	return PARTS_ON[facts.platform](facts);
}

export function memoryTasksParts(): TasksParts {
	return {
		tasks: new MemoryTasksGateway(),
		clock: new SystemClockGateway(),
	};
}

// TRADE-OFF: the core window serves tasks as a server module, so its Tauri store is picked by env rather than by platform
function serverTasksParts(facts: ModuleFacts): TasksParts {
	if (facts.env[TASKS_STORE] !== TAURI_TASKS_STORE) {
		return memoryTasksParts();
	}

	const store = new StoreClient((command, args) => invoke(command, args));
	return {
		tasks: new TauriTasksGateway(store, workspaceRootOf(facts.scope.workspaceId)),
		clock: new SystemClockGateway(),
	};
}
