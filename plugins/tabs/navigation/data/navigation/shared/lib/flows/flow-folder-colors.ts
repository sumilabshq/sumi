import type { FlowFolder, FlowsDoc } from "../../schema/flows.schema.js";
import type { TabGroup } from "../tabs/tab-lists.js";
import { folderIdOf } from "./flow-ids.js";

export interface FolderColorsFilled {
	readonly doc: FlowsDoc;
	readonly said: readonly string[];
}

const COLOR_FILLED = 'folder {id} color missing → {color} (from tab group "{group}")';

export function withFolderColorsFilled(doc: FlowsDoc, groups: readonly TabGroup[]): FolderColorsFilled {
	const said: string[] = [];
	const folders = doc.folders.map((folder) => {
		const group = groups.find(({ id }) => folderIdOf(id) === folder.id);

		if (folder.color !== undefined || group === undefined) {
			return folder;
		}

		said.push(COLOR_FILLED.replace("{id}", folder.id).replace("{color}", group.hue ?? "none").replace("{group}", group.id));
		return colored(folder, group.hue);
	});
	return said.length === 0 ? { doc, said } : { doc: { ...doc, folders }, said };
}

function colored(folder: FlowFolder, color: TabGroup["hue"]): FlowFolder {
	return {
		...folder,
		color,
	};
}
