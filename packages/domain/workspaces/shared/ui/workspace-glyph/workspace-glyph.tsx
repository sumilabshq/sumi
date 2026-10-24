import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import type { WorkspaceIcon } from "../../schema/workspace.schema.js";
import { EmojiGlyph } from "./emoji-glyph.js";
import { FilledIcon } from "./filled-icon.js";

export const WorkspaceGlyph = memo(function WorkspaceGlyph({
	icon,
}: {
	readonly icon: WorkspaceIcon | null;
}): ReactElement {
	if (icon === null) {
		return <span className="wg-ws-dot" aria-hidden="true" />;
	}

	if (icon.kind === "emoji") {
		return <EmojiGlyph emoji={icon.emoji} />;
	}

	return <FilledIcon name={icon.name} />;
});
