import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { navigation } from "@widgetarium/navigation/contract";
import type { FlowIcon, GroupHue } from "@widgetarium/navigation/contract";

export type RowKind = "flow" | "folder";

export interface FlowPlace {
	readonly folderId: string | null;
	readonly before: string | null;
}

export interface FlowActs {
	readonly open: (flowId: string) => void;
	readonly remove: (flowId: string) => void;
	readonly duplicate: (flowId: string) => void;
	readonly create: (name: string, place: FlowPlace) => void;
	readonly move: (flowId: string, place: FlowPlace) => void;
	readonly rename: (kind: RowKind, id: string, name: string) => void;
	readonly setIcon: (kind: RowKind, id: string, icon: FlowIcon | null) => void;
	readonly setFolderColor: (id: string, color: GroupHue | null) => void;
	readonly toggleFolder: (id: string) => void;
	readonly removeFolder: (id: string) => void;
}

export function useFlowActs(): FlowActs {
	const openFlow = useCommand(appHost.flows.open);
	const removeFlow = useCommand(appHost.flows.remove);
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
	const open = (flowId: string): void => void openFlow.run({ flowId });
	return {
		open,
		remove: (flowId) => void removeFlow.run({ flowId }),
		duplicate: (flowId) => void duplicateFlow.run({ flowId }),
		create: (name, place) => void createFlow.run({ name, place }).then((made) => made.ok && open(made.output.flowId)),
		move: (flowId, place) => void moveFlow.run({ flowId, place }),
		rename: (kind, id, name) => void (kind === "flow" ? renameFlow : renameFolder).run({ id, name }),
		setIcon: (kind, id, icon) => void (kind === "flow" ? setFlowIcon : setFolderIcon).run({ id, icon }),
		setFolderColor: (id, color) => void setFolderColor.run({ id, color }),
		toggleFolder: (id) => void toggleFolder.run({ id }),
		removeFolder: (id) => void removeFolder.run({ id }),
	};
}
