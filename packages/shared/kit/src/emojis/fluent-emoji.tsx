import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import { cn } from "../utils/cn";
import { fluentCellOf } from "./fluent-3d-drawings";
import type { Fluent3dCell } from "./fluent-3d-drawings";
import { FLUENT_3D_SHEET_SIDE } from "./fluent-3d-table";

export interface FluentEmojiProps {
	readonly glyph: string;
	readonly size?: number;
	readonly className?: string | undefined;
	readonly label?: string | undefined;
}

const FLUENT_EMOJI_PX = 20;

export function FluentEmoji({
	glyph,
	size = FLUENT_EMOJI_PX,
	className: cls,
	label,
}: FluentEmojiProps): ReactElement | null {
	const cell = fluentCellOf(glyph);
	if (cell === null) {
		return null;
	}

	return (
		<span
			className={cn("wg-kit-fluent-emoji", cls)}
			role="img"
			aria-label={label ?? cell.emoji.name}
			data-glyph={cell.emoji.glyph}
			style={pictureStyleOf(cell, size)}
		/>
	);
}

function pictureStyleOf(cell: Fluent3dCell, size: number): CSSProperties {
	const sheetPx = size * FLUENT_3D_SHEET_SIDE;
	return {
		display: "inline-block",
		flex: "none",
		width: size,
		height: size,
		backgroundImage: `url("${cell.sheetUrl}")`,
		backgroundRepeat: "no-repeat",
		backgroundSize: `${sheetPx}px ${sheetPx}px`,
		backgroundPosition: `${-cell.column * size}px ${-cell.row * size}px`,
	};
}
