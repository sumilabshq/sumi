import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import type { Door } from "@sumi/command-menu/contract";
import { useAskComposer } from "@sumi/sumi-host-plugin";
import { ASK_COMPOSER_MARK } from "../../lib/ask-composer-mark.js";
import { carriedOf } from "../../lib/carried.js";
import { CarriedAttachments } from "./carried-attachments.js";
import { MenuField } from "./menu-field.js";
import type { MenuFieldAsk } from "./menu-field.js";

export interface AskFieldProps {
	readonly field: MenuFieldAsk;
	readonly door: Door;
	readonly start: ReactNode;
	readonly onDoor: (door: Door) => void;
}

const ASK_COMPOSER_CHAT = {
	chat: null,
};

export function AskField({ field, door, start, onDoor }: AskFieldProps): ReactElement {
	const attachFiles = useCommand(assistant.composer.attachFiles);
	const { data: drafts } = useQuery(assistant.composer.draftAttachments, ASK_COMPOSER_CHAT);
	const { bar: ComposerBar } = useAskComposer();
	const isAsking = door === "ask";
	return (
		<>
			<MenuField
				ask={field}
				start={start}
				end={isAsking ? null : <CarriedAttachments carried={carriedOf(drafts)} onOpen={() => onDoor("ask")} />}
				onFiles={isAsking ? (files) => void attachFiles.run({ ...ASK_COMPOSER_CHAT, files: [...files] }) : null}
			/>
			{isAsking ? (
				<div className="wg-cm-ask" {...ASK_COMPOSER_MARK}>
					<ComposerBar />
				</div>
			) : null}
		</>
	);
}
