import { folderOfId, withFolderChanged, withFolderRemoved } from "../../../shared/lib/flows/flow-docs.js";
import type { FlowsPlan } from "../../../shared/lib/flows/flow-moves.js";
import { refusal } from "../../../shared/lib/settling/settling.js";
import type {
	CreateFolderAskSchema,
	FolderAskSchema,
	RenameAskSchema,
	SetBaseDirAskSchema,
	SetColorAskSchema,
	SetIconAskSchema,
} from "../../../shared/schema/flow-asks.schema.js";
import type { z } from "zod";

type CreateFolderAsk = z.infer<typeof CreateFolderAskSchema>;
type FolderAsk = z.infer<typeof FolderAskSchema>;
type RenameAsk = z.infer<typeof RenameAskSchema>;
type SetBaseDirAsk = z.infer<typeof SetBaseDirAskSchema>;
type SetIconAsk = z.infer<typeof SetIconAskSchema>;
type SetColorAsk = z.infer<typeof SetColorAskSchema>;

const NO_FOLDER = 'no folder "{id}" stands here';

export function createFolderPlan(ask: CreateFolderAsk, id: string): FlowsPlan<{ readonly folderId: string }> {
	return ({ flows }) => {
		if (folderOfId(flows, id) !== undefined) {
			return { flows, reason: `folder ${id} stands already, create skipped`, value: { folderId: id } };
		}

		const folder = {
			id,
			name: ask.name,
			icon: null,
			color: null,
			baseDir: ask.baseDir,
			isOpen: true,
			flowIds: [],
		};
		return {
			flows: { ...flows, folders: [...flows.folders, folder] },
			reason: `folders ${flows.folders.length} → ${flows.folders.length + 1} (create ${id} "${ask.name}")`,
			value: { folderId: id },
		};
	};
}

export function renameFolderPlan({ id, name }: RenameAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const folder = folderOfId(flows, id);

		if (folder === undefined) {
			return refusal(NO_FOLDER.replace("{id}", id));
		}

		return {
			flows: folder.name === name ? flows : withFolderChanged(flows, id, { name }),
			reason: `folder ${id} name "${folder.name}" → "${name}"`,
			value: null,
		};
	};
}

export function setFolderIconPlan({ id, icon }: SetIconAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const folder = folderOfId(flows, id);

		if (folder === undefined) {
			return refusal(NO_FOLDER.replace("{id}", id));
		}

		return {
			flows: JSON.stringify(folder.icon) === JSON.stringify(icon) ? flows : withFolderChanged(flows, id, { icon }),
			reason: `folder ${id} icon ${JSON.stringify(folder.icon)} → ${JSON.stringify(icon)}`,
			value: null,
		};
	};
}

export function setFolderColorPlan({ id, color }: SetColorAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const folder = folderOfId(flows, id);

		if (folder === undefined) {
			return refusal(NO_FOLDER.replace("{id}", id));
		}

		return {
			flows: folder.color === color ? flows : withFolderChanged(flows, id, { color }),
			reason: `folder ${id} color ${folder.color ?? "none"} → ${color ?? "none"}`,
			value: null,
		};
	};
}

export function setBaseDirPlan({ id, baseDir }: SetBaseDirAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const folder = folderOfId(flows, id);

		if (folder === undefined) {
			return refusal(NO_FOLDER.replace("{id}", id));
		}

		return {
			flows: folder.baseDir === baseDir ? flows : withFolderChanged(flows, id, { baseDir }),
			reason: `folder ${id} baseDir ${folder.baseDir ?? "none"} → ${baseDir ?? "none"}`,
			value: null,
		};
	};
}

export function toggleFolderPlan({ id }: FolderAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const folder = folderOfId(flows, id);

		if (folder === undefined) {
			return refusal(NO_FOLDER.replace("{id}", id));
		}

		return {
			flows: withFolderChanged(flows, id, { isOpen: !folder.isOpen }),
			reason: `folder ${id} isOpen ${String(folder.isOpen)} → ${String(!folder.isOpen)}`,
			value: null,
		};
	};
}

export function removeFolderPlan({ id }: FolderAsk): FlowsPlan<null> {
	return ({ flows }) => {
		const folder = folderOfId(flows, id);

		if (folder === undefined) {
			return refusal(NO_FOLDER.replace("{id}", id));
		}

		return {
			flows: withFolderRemoved(flows, id),
			reason: `folder ${id} removed, its flows ${folder.flowIds.join(", ") || "none"} → no folder`,
			value: null,
		};
	};
}
