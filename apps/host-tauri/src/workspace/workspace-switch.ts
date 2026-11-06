import type { StartedApp } from "@widgetarium/framework";
import { WorkspacesQuery } from "@widgetarium/workspaces";

export function reopensOnWorkspaceSwitch(
	workspacesApp: StartedApp,
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

function currentWorkspaceIdIn(workspacesApp: StartedApp): string | null {
	const read = workspacesApp.routes.readNow(WorkspacesQuery);
	return read === null ? null : WorkspacesQuery.outputSchema.parse(read.output).current.id;
}
