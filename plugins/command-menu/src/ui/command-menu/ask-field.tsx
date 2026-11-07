import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { AttachFilesCommand, DraftAttachmentsQuery } from "@widgetarium/assistant";
import { useAskComposer } from "@sumi/sumi-host-plugin";
import { ASK_COMPOSER_MARK } from "../../lib/ask-composer-mark.js";
import { carriedOf } from "../../lib/carried.js";
import { CarriedAttachments } from "./carried-attachments.js";
import { MenuField } from "./menu-field.js";
import type { MenuFieldAsk } from "./menu-field.js";

export function AskField({ field }: { readonly field: MenuFieldAsk }): ReactElement {
	const attachFiles = useCommand(AttachFilesCommand);
	const { data: drafts } = useQuery(DraftAttachmentsQuery);
	const { bar: ComposerBar } = useAskComposer();
	const isAsking = field.door === "ask";
	return (
		<>
			<MenuField
				ask={field}
				end={isAsking ? null : <CarriedAttachments carried={carriedOf(drafts)} onOpen={() => field.onDoor("ask")} />}
				onFiles={isAsking ? (files) => void attachFiles.run({ files: [...files] }) : null}
			/>
			{isAsking ? (
				<div className="wg-cm-ask" {...ASK_COMPOSER_MARK}>
					<ComposerBar />
				</div>
			) : null}
		</>
	);
}
