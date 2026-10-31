import { workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { TasksFacts } from "../../shared/host/tasks-host.js";
import { ClockGateway, SystemClockGateway } from "../clock/clock.gateway.js";
import { StorageTasksGateway } from "../tasks/storage.gateway.js";
import { TauriTasksGateway } from "../tasks/tauri.gateway.js";
import type { TasksGateway } from "../tasks/tasks.gateway.js";

export type TasksParts = {
	readonly tasks: TasksGateway;
	readonly clock: ClockGateway;
};

export function tasksPartsOn(facts: TasksFacts): TasksParts {
	return {
		tasks: tasksGatewayOf(facts),
		clock: new SystemClockGateway(),
	};
}

function tasksGatewayOf({ host, scope }: TasksFacts): TasksGateway {
	if (host.kind === "storage") {
		return new StorageTasksGateway(host.storage);
	}

	return new TauriTasksGateway(host.store, workspaceRootOf(scope.workspaceId));
}
