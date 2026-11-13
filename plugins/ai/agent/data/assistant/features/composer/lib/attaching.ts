import { refuse } from "@widgetarium/data-framework";
import type { AssistantSetupGateway } from "../../../gateways/assistant-setup/assistant-setup.gateway.js";
import type { DraftAttachmentsGateway } from "../../../gateways/draft-attachments/draft-attachments.gateway.js";
import { chosenOf } from "../../../shared/lib/chosen-provider.js";
import type { ChosenProvider } from "../../../shared/lib/chosen-provider.js";
import type { ProviderReads } from "../../../shared/schema/agent-setup.schema.js";
import type { DroppedFile } from "../../../shared/schema/file-drag.schema.js";
import { kindOf, refusalOfCount, refusalOfFile } from "./attachment-rules.js";
import { draftOfFile, draftedFolders, draftedTogether, refusedWith } from "./drafts.js";
import type { Drafted } from "./drafts.js";
import { saveDrafts } from "./held-drafts.js";

export interface AttachingParts {
	readonly assistantSetup: AssistantSetupGateway;
	readonly draftAttachments: DraftAttachmentsGateway;
}

export interface OfferedAttachments {
	readonly files: readonly DroppedFile[];
	readonly folders: readonly string[];
}

const ATTACHED = "attached {names}";

export async function attachOffered(injects: AttachingParts, offered: OfferedAttachments): Promise<void> {
	const provider = chosenOf(await injects.assistantSetup.setup());
	const folders = draftedFolders(offered.folders, provider, injects.draftAttachments.draftAttachments());

	if (folders.refusal !== null) {
		return refuse(folders.refusal);
	}

	attachDrafted(
		injects.draftAttachments,
		draftedTogether([folders, await draftedFiles(offered.files, provider)]),
		provider.reads,
	);
}

export function attachDrafted(
	draftAttachments: DraftAttachmentsGateway,
	{ drafts, refusal }: Drafted,
	reads: ProviderReads,
): void {
	const counted = refusal ?? refusalOfCount(draftAttachments.draftAttachments().length, drafts.length, reads);

	if (counted !== null) {
		return refuse(counted);
	}

	saveDrafts(
		draftAttachments,
		[...draftAttachments.draftAttachments(), ...drafts],
		ATTACHED.replace("{names}", drafts.map(({ name }) => name).join(", ")),
	);
}

async function draftedFiles(offered: readonly DroppedFile[], provider: ChosenProvider): Promise<Drafted> {
	const refusal = offered.map((one) => refusalOfFile(one, provider)).find((found) => found !== null);

	if (refusal) {
		return refusedWith(refusal);
	}

	const each = await Promise.all(
		offered.map(async (one) => {
			const file = await one.file();
			const read = {
				name: file.name,
				type: file.type,
				bytes: new Uint8Array(await file.arrayBuffer()),
			};
			return draftOfFile(read, kindOf(one.name) ?? "text");
		}),
	);
	return draftedTogether(each);
}
