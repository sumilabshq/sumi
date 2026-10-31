import { MemoryDocStore } from "@sumi/contract";
import type { AnswerResult, DocStore } from "@sumi/contract";
import { app, localTransport } from "../packages/shared/core/src/requests/index.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import { KeptBoardQuery, TasksModule as TasksContract } from "../packages/domain/tasks/generated/contract.ts";
import type { Board, Task } from "../packages/domain/tasks/generated/contract.ts";
import { TasksModule } from "../packages/domain/tasks/module.ts";
import { TASKS_DOC_KEY } from "../packages/domain/tasks/shared/schema/kept-board.schema.ts";
import { frameServicesOf } from "../apps/studio/src/features/app-frame/lib/frame-services.ts";
import { seededBoard } from "./tasks-fixture.ts";

export type FrameStorage = (input: unknown) => Promise<AnswerResult>;

export function shellOver(storage: DocStore): StartedApp {
	const link = localTransport();
	server()
		.modules(TasksModule)
		.listen(link)
		.start({
			env: {},
			scope: {
				workspaceId: "w",
			},
			host: {
				storage,
			},
		});
	return app().imports(TasksContract.over(link)).start();
}

export function seededStore(): MemoryDocStore {
	const store = new MemoryDocStore();
	void store.write(TASKS_DOC_KEY, seededBoard(Date.now()), 0);
	return store;
}

export function frameStorageOn(shell: StartedApp, app = "tasks"): FrameStorage {
	const services = frameServicesOf(app, shell.send.bind(shell));
	return (input) => services("storage", input);
}

export async function keptOn(shell: StartedApp): Promise<{ readonly board: Board; readonly rev: number }> {
	const kept = await shell.send(KeptBoardQuery);

	if (!kept.ok) {
		throw new Error(`the shell refused its own board: ${kept.reason}`);
	}

	return kept.output;
}

export function withTask(board: Board, number: number, change: Partial<Task>): Board {
	return {
		...board,
		tasks: board.tasks.map((task) => (task.number === number ? { ...task, ...change } : task)),
	};
}

export function taskIn(board: Board, number: number): Task {
	const task = board.tasks.find((held) => held.number === number);

	if (task === undefined) {
		throw new Error(`the seeded board holds no T-${number}`);
	}

	return task;
}

export function reasonOf(answer: AnswerResult): string {
	return answer.ok ? `answered ${JSON.stringify(answer.output)}` : answer.reason;
}
