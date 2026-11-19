import { createElement as h, memo } from "react";
import type { ReactElement } from "react";
import type { WorkspaceIcon } from "@widgetarium/workspaces/contract";
import { FILLED_ICONS } from "../../lib/filled-icons.js";
import { FilledIcon } from "./filled-icon.js";

export const WorkspaceGlyph = memo(function WorkspaceGlyph({
	icon,
}: {
	readonly icon: WorkspaceIcon | null;
}): ReactElement {
	const body = icon?.kind === "icon" ? FILLED_ICONS[icon.name] : undefined;
	if (body === undefined) {
		return <span className="sumi-ws-dot" aria-hidden="true" />;
	}

	return <FilledIcon body={body} />;
});
