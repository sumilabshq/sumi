import { createElement as h, useContext, useState } from "react";
import type { ReactNode } from "react";
import { RuntimeProvider } from "@widgetarium/data-framework";
import { tooltipMarks } from "@widgetarium/kit";
import { useTitleKeeper } from "../../../../shared/lib/title-keeper.js";
import { WindowAppContext } from "../../../../shared/lib/window-app-context.js";
import { useChatTitle } from "../../lib/use-chat-title.js";
import { TitleField } from "./title-field.js";

const RENAME = "Rename";

export interface HeadTitleProps {
	readonly chatId: string;
}

export function HeadTitle({ chatId }: HeadTitleProps): ReactNode {
	const windowApp = useContext(WindowAppContext);

	if (windowApp === null) {
		return null;
	}

	return (
		<RuntimeProvider runtime={windowApp}>
			<RenamableTitle chatId={chatId} />
		</RuntimeProvider>
	);
}

function RenamableTitle({ chatId }: HeadTitleProps): ReactNode {
	const title = useChatTitle(chatId);
	const keeper = useTitleKeeper();
	const [isRenaming, setRenaming] = useState(false);

	if (title === null) {
		return null;
	}

	if (isRenaming) {
		return (
			<TitleField
				title={title}
				onDone={(renamed) => {
					setRenaming(false);

					if (renamed !== null) {
						void keeper.name(chatId, renamed, "person");
					}
				}}
			/>
		);
	}

	return (
		<button type="button" className="sumi-head-title" onClick={() => setRenaming(true)} {...tooltipMarks({ said: RENAME })}>
			{title}
		</button>
	);
}
