import type { Runtime } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";

export function reopensOnWorkspaceSwitch(
	workspacesApp: Runtime,
	openedId: string,
	reopen: () => Promise<void>,
): () => void {
	let shownId = openedId;
	return workspacesApp.routes.watch(workspaces.workspaces.workspaces, undefined, () => {
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
	const read = workspacesApp.routes.readNow(workspaces.workspaces.workspaces);
	return read === null ? null : workspaces.workspaces.workspaces.outputSchema.parse(read.output).current.id;
}
