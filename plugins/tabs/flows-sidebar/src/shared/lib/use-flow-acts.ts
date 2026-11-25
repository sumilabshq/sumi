import { useCommand } from "@widgetarium/data-framework";
import { toast } from "@widgetarium/kit";
import { fileSystem } from "@sumi/contract";
import { appHost } from "@widgetarium/app-host/contract";
import { navigation } from "@widgetarium/navigation/contract";
import type { FlowIcon, GroupHue } from "@widgetarium/navigation/contract";

import { requestFolderRename } from "./folder-rename-request.js";
import { requestProjectRename } from "./project-rename-request.js";

export type RowKind = "flow" | "folder";

export interface FlowPlace {
	readonly folderId: string | null;
	readonly before: string | null;
	readonly projectId?: string | null | undefined;
}

export interface FlowActs {
	readonly open: (flowId: string) => void;
	readonly archive: (flowId: string) => void;
	readonly deleteFlow: (flowId: string) => void;
	readonly duplicate: (flowId: string) => void;
	readonly create: (name: string, place: FlowPlace) => void;
	readonly move: (flowId: string, place: FlowPlace) => void;
	readonly rename: (kind: RowKind, id: string, name: string) => void;
	readonly setIcon: (kind: RowKind, id: string, icon: FlowIcon | null) => void;
	readonly setFolderColor: (id: string, color: GroupHue | null) => void;
	readonly toggleFolder: (id: string) => void;
	readonly removeFolder: (id: string) => void;
	readonly deleteFolder: (id: string) => void;
	readonly createFolder: (name: string) => void;
	readonly createProject: (flowId?: string) => void;
	readonly toggleProject: (id: string) => void;
	readonly renameProject: (id: string, name: string) => void;
	readonly pickBaseFolder: (id: string) => void;
	readonly removeProject: (id: string) => void;
	readonly reorderProject: (id: string, before: string | null) => void;
	readonly moveToProject: (flowId: string, projectId: string) => void;
	readonly moveFolderToProject: (folderId: string, projectId: string) => void;
}

function reported(what: string): (result: { readonly ok: boolean; readonly reason?: string }) => void {
	return (result) => {
		if (!result.ok) {
			toast.error(`Could not ${what}`, { description: result.reason });
		}
	};
}

export function useFlowActs(): FlowActs {
	const openFlow = useCommand(appHost.flows.open);
	const archiveFlow = useCommand(navigation.flows.archive);
	const deleteFlow = useCommand(appHost.flows.deleteFlow);
	const deleteFolder = useCommand(appHost.flows.deleteFolder);
	const duplicateFlow = useCommand(appHost.flows.duplicate);
	const createFlow = useCommand(navigation.flows.create);
	const moveFlow = useCommand(navigation.flows.move);
	const renameFlow = useCommand(navigation.flows.rename);
	const renameFolder = useCommand(navigation.folders.rename);
	const setFlowIcon = useCommand(navigation.flows.setIcon);
	const setFolderIcon = useCommand(navigation.folders.setIcon);
	const setFolderColor = useCommand(navigation.folders.setColor);
	const toggleFolder = useCommand(navigation.folders.toggle);
	const removeFolder = useCommand(navigation.folders.remove);
	const createFolder = useCommand(navigation.folders.create);
	const createProject = useCommand(navigation.projects.create);
	const toggleProject = useCommand(navigation.projects.toggle);
	const renameProject = useCommand(navigation.projects.rename);
	const setProjectBaseFolder = useCommand(navigation.projects.setBaseFolder);
	const removeProject = useCommand(navigation.projects.remove);
	const reorderProject = useCommand(navigation.projects.reorder);
	const moveFlowToProject = useCommand(navigation.projects.moveFlow);
	const moveFolderToProject = useCommand(navigation.projects.moveFolder);
	const pickFolder = useCommand(fileSystem.files.pickFolder);
	const open = (flowId: string): void => void openFlow.run({ flowId });
	return {
		open,
		archive: (flowId) => void archiveFlow.run({ flowId }).then(reported("archive the Flow")),
		deleteFlow: (flowId) => void deleteFlow.run({ flowId }).then(reported("delete the Flow")),
		duplicate: (flowId) => void duplicateFlow.run({ flowId }),
		create: (name, place) => void createFlow.run({ name, place }).then((made) => made.ok && open(made.output.flowId)),
		move: (flowId, place) => void moveFlow.run({ flowId, place }),
		rename: (kind, id, name) => void (kind === "flow" ? renameFlow : renameFolder).run({ id, name }),
		setIcon: (kind, id, icon) => void (kind === "flow" ? setFlowIcon : setFolderIcon).run({ id, icon }),
		setFolderColor: (id, color) => void setFolderColor.run({ id, color }),
		toggleFolder: (id) => void toggleFolder.run({ id }),
		removeFolder: (id) => void removeFolder.run({ id }),
		deleteFolder: (folderId) => void deleteFolder.run({ folderId }).then(reported("delete the folder")),
		createFolder: (name) =>
			void createFolder
				.run({ name, baseDir: null })
				.then((made) => made.ok && requestFolderRename(made.output.folderId)),
		createProject: (flowId) =>
			void createProject.run({ flowId }).then((made) => {
				if (made.ok) {
					requestProjectRename(made.output.projectId);
					return;
				}

				reported("create the project")(made);
			}),
		toggleProject: (id) => void toggleProject.run({ id }),
		renameProject: (id, name) => void renameProject.run({ id, name }).then(reported("rename the project")),
		pickBaseFolder: (id) =>
			void pickFolder.run().then((picked) => {
				if (picked.ok && picked.output.path !== null) {
					void setProjectBaseFolder
						.run({ id, baseFolder: picked.output.path })
						.then(reported("change the base folder"));
				}
			}),
		removeProject: (id) => void removeProject.run({ id }).then(reported("delete the project")),
		reorderProject: (id, before) => void reorderProject.run({ id, before }).then(reported("move the project")),
		moveToProject: (flowId, projectId) =>
			void moveFlowToProject.run({ flowId, projectId }).then(reported("move the session")),
		moveFolderToProject: (folderId, projectId) =>
			void moveFolderToProject.run({ folderId, projectId }).then(reported("move the folder")),
	};
}
