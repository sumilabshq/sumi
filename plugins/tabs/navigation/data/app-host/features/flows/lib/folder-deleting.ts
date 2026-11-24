import { navigation } from "@widgetarium/navigation/contract";
import type { TabsReach } from "../../../shared/lib/tab-showing/tab-settling.js";
import { deleteFlowWithChats, failureOfDeleting } from "./flow-deleting.js";
import type { FlowDeleted } from "./flow-deleting.js";

export async function deleteFolderWithFlows(reach: TabsReach, folderId: string): Promise<Error | null> {
	const sidebar = await reach.send(navigation.flows.sidebar, { window: reach.injects.studioWindow.placesWindow() });
	const folder = sidebar.folders.find(({ id }) => id === folderId);

	if (folder === undefined) {
		throw new Error(`no folder "${folderId}" stands here`);
	}

	const deleted: FlowDeleted[] = [];

	for (const { id } of folder.flows) {
		deleted.push(await deleteFlowWithChats(reach, id));
	}

	await reach.send(navigation.folders.remove, { id: folderId });
	console.info(`[widgetarium] folder ${folderId} deleted with ${deleted.length} flows`);
	return failureOfDeleting(deleted);
}
