import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { Icon } from "@widgetarium/kit";
import { FoldGroupCommand } from "@widgetarium/app-host";
import {
	CARD_HEAD,
	CARD_HEAD_COUNT,
	CARD_HEAD_ICON,
	CARD_HEAD_NAME,
	HOVER_SHOWN,
} from "../../lib/tabs-look/tabs-look.js";
import type { BoxedGroup } from "./group-box.js";

export interface GroupHeadProps {
	readonly group: BoxedGroup;
	readonly count: number;
}

const HEAD = `${CARD_HEAD} cv:group-data-[hue]/card:text-(--group-hue)`;
const FOLDER_ICON = `${CARD_HEAD_ICON} cv:[color:var(--group-hue,var(--sumi-text-2))]`;
// TODO: move into the kit as a filled icon name
const FOLDER_GLYPH = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";
const CHEVRON = `cv:flex cv:flex-none cv:text-(--sumi-text-3) cv:group-hover/head:opacity-100 cv:group-focus-visible/head:opacity-100 ${HOVER_SHOWN}`;
const TURN =
	"cv:flex cv:transition-transform cv:duration-(--sumi-dur-base) cv:ease-(--sumi-ease-out) cv:motion-reduce:transition-none cv:data-[folded]:-rotate-90";

export function GroupHead({ group: { id, name, isOpen }, count }: GroupHeadProps): ReactElement {
	const foldGroup = useCommand(FoldGroupCommand);
	const folded = isOpen ? undefined : "";
	return (
		<button
			type="button"
			aria-expanded={isOpen}
			className={HEAD}
			onClick={() => void foldGroup.run({ id })}
			data-tabs-item="group"
			data-tabs-id={id}
		>
			<i className={FOLDER_ICON} aria-hidden="true">
				<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
					<path d={FOLDER_GLYPH} />
				</svg>
			</i>
			<span className={CARD_HEAD_NAME} data-tabs-words="">
				{name}
			</span>
			<span className={CARD_HEAD_COUNT} data-card-count="">
				{count}
			</span>
			<span className={CHEVRON} data-folded={folded} data-card-chevron="">
				<span className={TURN} data-folded={folded}>
					<Icon name="chevron-down" size={12} />
				</span>
			</span>
		</button>
	);
}
