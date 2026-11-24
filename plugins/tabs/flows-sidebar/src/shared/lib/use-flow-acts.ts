import { useCommand } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import type { FlowIcon } from "@widgetarium/navigation/contract";
import { useFlowsWindow } from "./use-flows-window.js";

export type RowKind = "flow" | "folder";

export interface FlowPlace {
	readonly folderId: string | null;
	readonly before: string | null;
}

export interface FlowActs {
	readonly open: (flowId: string) => void;
	readonly create: (name: string, place: FlowPlace) => void;
	readonly move: (flowId: string, place: FlowPlace) => void;
	readonly rename: (kind: RowKind, id: string, name: string) => void;
	readonly setIcon: (kind: RowKind, id: string, icon: FlowIcon | null) => void;
	readonly toggleFolder: (id: string) => void;
	readonly removeFolder: (id: string) => void;
}

export function useFlowActs(): FlowActs {
	const placesWindow = useFlowsWindow();
	const openFlow = useCommand(navigation.flows.open);
	const createFlow = useCommand(navigation.flows.create);
	const moveFlow = useCommand(navigation.flows.move);
	const renameFlow = useCommand(navigation.flows.rename);
	const renameFolder = useCommand(navigation.folders.rename);
	const setFlowIcon = useCommand(navigation.flows.setIcon);
	const setFolderIcon = useCommand(navigation.folders.setIcon);
	const toggleFolder = useCommand(navigation.folders.toggle);
	const removeFolder = useCommand(navigation.folders.remove);
	// TODO: settle the open effects in the host once appHost has a flows.open; the effects are dropped here
	const open = (flowId: string): void => void openFlow.run({ window: placesWindow, flowId });
	return {
		open,
		create: (name, place) => void createFlow.run({ name, place }).then((made) => made.ok && open(made.output.flowId)),
		move: (flowId, place) => void moveFlow.run({ flowId, place }),
		rename: (kind, id, name) => void (kind === "flow" ? renameFlow : renameFolder).run({ id, name }),
		setIcon: (kind, id, icon) => void (kind === "flow" ? setFlowIcon : setFolderIcon).run({ id, icon }),
		toggleFolder: (id) => void toggleFolder.run({ id }),
		removeFolder: (id) => void removeFolder.run({ id }),
	};
}
