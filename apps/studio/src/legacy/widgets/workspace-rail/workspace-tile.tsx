import { createElement as h, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Popover } from "@widgetarium/kit";
import { markLetterOf, tileLabelOf } from "../../shared/studio-app.js";
import type { StudioApp } from "../../shared/studio-app.js";
import { QuietLine } from "../quiet-line.js";
import { useRefusal } from "../use-refusal.js";
import type { Answer } from "../use-refusal.js";
import { RailTile } from "./rail-tile.js";
import { RenameField } from "./rename-field.js";

export interface WorkspaceTileProps {
	readonly app: StudioApp;
	readonly isCurrent: boolean;
	readonly onOpen: () => Promise<Answer>;
	readonly onRename: (name: string) => Promise<Answer>;
}

export function WorkspaceTile({ app, isCurrent, onOpen, onRename }: WorkspaceTileProps): ReactElement {
	const [isRenaming, setRenaming] = useState(false);
	const { refusal, isAnsweredOk, dismiss } = useRefusal();
	const startRenaming = (event: MouseEvent): void => {
		event.preventDefault();
		setRenaming(true);
	};
	const closed = (): void => {
		setRenaming(false);
		dismiss();
	};
	const tile = (
		<RailTile
			label={tileLabelOf(app)}
			isCurrent={isCurrent}
			onPress={isCurrent ? undefined : () => void isAnsweredOk(onOpen())}
			onContextMenu={startRenaming}
		>
			{markLetterOf(app)}
		</RailTile>
	);
	return (
		<Popover
			open={isRenaming || refusal !== null}
			onOpenChange={(open) => open || closed()}
			placement="below"
			trigger={tile}
		>
			{isRenaming ? <RenameField name={app.name} onRename={onRename} onRenamed={closed} /> : null}
			<QuietLine said={refusal} name="Refusal" />
		</Popover>
	);
}
