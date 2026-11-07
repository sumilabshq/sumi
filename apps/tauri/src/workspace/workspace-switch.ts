import type { Runtime } from "@widgetarium/data-framework";
import { WorkspacesQuery } from "@widgetarium/workspaces";

export function reopensOnWorkspaceSwitch(
	workspacesApp: Runtime,
	openedId: string,
	reopen: () => Promise<void>,
): () => void {
	let shownId = openedId;
	return workspacesApp.routes.watch(WorkspacesQuery, undefined, () => {
		const currentId = currentWorkspaceIdIn(workspacesApp) ?? shownId;

		if (currentId === shownId) {
			return;
		}

		console.info(`[widgetarium] window workspace ${shownId} → ${currentId}: reopening`);
		shownId = currentId;
		void reopen();
	});
}

function currentWorkspaceIdIn(workspacesApp: Runtime): string | null {
	const read = workspacesApp.routes.readNow(WorkspacesQuery);
	return read === null ? null : WorkspacesQuery.outputSchema.parse(read.output).current.id;
}
