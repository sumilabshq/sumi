import type { BoardFile } from "../../shared/host/tasks-host.js";
import { ClockGateway, SystemClockGateway } from "../clock/clock.gateway.js";
import { FileTasksGateway } from "../tasks/file.gateway.js";
import type { TasksGateway } from "../tasks/tasks.gateway.js";

export type TasksParts = {
	readonly tasks: TasksGateway;
	readonly clock: ClockGateway;
};

export function tasksPartsOn({ host }: { readonly host: { readonly file: BoardFile } }): TasksParts {
	return {
		tasks: new FileTasksGateway(host.file),
		clock: new SystemClockGateway(),
	};
}
