import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { FilledIcon, hasFilledIcon } from "@widgetarium/kit/filled-icons";
import { FluentEmoji, hasFluentEmoji } from "@widgetarium/kit/fluent-emojis";
import type { FlowIcon } from "@widgetarium/navigation/contract";

export type FlowGlyphScale = "row" | "choice";

export interface FlowGlyphProps {
	readonly icon: FlowIcon | null;
	readonly fallback: "folder" | "dot";
	readonly scale?: FlowGlyphScale;
}

const ICON_PX: Readonly<Record<FlowGlyphScale, number>> = {
	row: 13,
	choice: 16,
};
const EMOJI_PX: Readonly<Record<FlowGlyphScale, number>> = {
	row: 16,
	choice: 22,
};

export function FlowGlyph({ icon, fallback, scale = "row" }: FlowGlyphProps): ReactElement {
	return (
		<span className="sumi-flows-glyph" data-scale={scale}>
			{glyphOf(icon, fallback, scale)}
		</span>
	);
}

function glyphOf(icon: FlowIcon | null, fallback: FlowGlyphProps["fallback"], scale: FlowGlyphScale): ReactElement {
	if (icon?.kind === "emoji" && hasFluentEmoji(icon.emoji)) {
		return <FluentEmoji glyph={icon.emoji} size={EMOJI_PX[scale]} />;
	}

	if (icon?.kind === "icon" && hasFilledIcon(icon.name)) {
		return <FilledIcon name={icon.name} size={ICON_PX[scale]} />;
	}

	if (icon?.kind === "icon") {
		return <Icon name={icon.name} size={ICON_PX[scale]} />;
	}

	return fallback === "folder" ? <Icon name="folder" size={ICON_PX[scale]} /> : <i className="sumi-flows-dot" />;
}
