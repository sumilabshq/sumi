import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AccessVerdict } from "../../../../shared/schema/site-access.schema.js";

export type ChipLook = AccessVerdict | "reading";

export interface AccessChipProps {
	readonly look: ChipLook;
}

interface ChipFace {
	readonly icon: string;
	readonly label: string;
	readonly tone: string;
}

const CHIP =
	"cv:flex cv:h-9 cv:flex-none cv:items-center cv:gap-1.5 cv:rounded-full cv:px-3 cv:text-xs cv:font-medium cv:whitespace-nowrap";

const FACE: Readonly<Record<ChipLook, ChipFace>> = {
	reading: {
		icon: "eye",
		label: "Ink is reading",
		tone: "cv:bg-brand-wash cv:text-brand",
	},
	allow: {
		icon: "eye",
		label: "Read only",
		tone: "cv:text-muted-foreground",
	},
	ask: {
		icon: "message-circle-question",
		label: "Ink asks first",
		tone: "cv:text-warning",
	},
	deny: {
		icon: "eye-off",
		label: "Not shared",
		tone: "cv:text-muted-foreground",
	},
};

export function AccessChip({ look }: AccessChipProps): ReactElement {
	const face = FACE[look];
	return (
		<span className={`${CHIP} ${face.tone}`} data-browser-access={look}>
			<Icon name={face.icon} size={14} />
			<span>{face.label}</span>
		</span>
	);
}
