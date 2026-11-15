import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Icon } from "@widgetarium/kit";
import { appHost } from "@widgetarium/app-host/contract";
import { CARD_HEAD_NAME, CHEVRON_TURN, ROW_CHEVRON, SIDEBAR_ROW } from "../../lib/tabs-look/tabs-look.js";
import { GroupRenameField } from "../rename-field/group-rename-field.js";
import type { BoxedGroup } from "./group-box.js";

export interface GroupHeadProps {
	readonly group: BoxedGroup;
	readonly isRenaming: boolean;
	readonly onRenamed: () => void;
}

const HEAD = `${SIDEBAR_ROW} cv:font-[inherit] cv:group-data-[hue]/card:text-(--group-hue)`;
const FOLDER_ICON =
	"cv:mx-px cv:flex cv:size-4 cv:flex-none cv:items-center cv:justify-center cv:not-italic cv:[color:var(--group-hue,var(--sumi-text-2))]";
const FOLDER_VIEW_BOX = "3 3 18 18";
// TODO: move into the kit as a filled icon name
const FOLDER_GLYPH = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";

export function GroupHead({ group: { id, name, isOpen }, isRenaming, onRenamed }: GroupHeadProps): ReactElement {
	const foldGroup = useCommand(appHost.groups.fold);
	const folded = isOpen ? undefined : "";
	const folder = (
		<i className={FOLDER_ICON} aria-hidden="true">
			<svg width={16} height={16} viewBox={FOLDER_VIEW_BOX} fill="currentColor">
				<path d={FOLDER_GLYPH} />
			</svg>
		</i>
	);

	if (isRenaming) {
		return (
			<div className={HEAD} data-tabs-item="group" data-tabs-id={id}>
				{folder}
				<GroupRenameField id={id} name={name} onDone={onRenamed} />
			</div>
		);
	}

	return (
		<button
			type="button"
			aria-expanded={isOpen}
			className={HEAD}
			onClick={() => void foldGroup.run({ id })}
			data-tabs-item="group"
			data-tabs-id={id}
		>
			{folder}
			<span className={CARD_HEAD_NAME} data-tabs-words="">
				{name}
			</span>
			<span className={ROW_CHEVRON} data-folded={folded} data-card-chevron="">
				<span className={CHEVRON_TURN} data-folded={folded}>
					<Icon name="chevron-down" size={12} />
				</span>
			</span>
		</button>
	);
}
