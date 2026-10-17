import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import type { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { MIN_LAID_OUT_BOARD_PX } from "@widgetarium/core/surface/use-board-width.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { shellBoardOf } from "./band-board.js";
import type { ShellPlace } from "./band-board.js";

export interface StudioShellBoardProps {
	readonly app: string;
	readonly place: ShellPlace;
	readonly registry: ModuleRegistry;
	readonly host: SurfaceHost;
	readonly studio: StudioHostPort;
	readonly state: StudioState;
	readonly assistant: AssistantPort;
}

export function StudioShellBoard({
	app,
	place,
	registry,
	host,
	studio,
	state,
	assistant,
}: StudioShellBoardProps): ReactElement {
	const [board, setBoard] = useState(() => normalizeBoard(shellBoardOf(app, place)));
	const studioHost = useMemo(
		() => ({ ...host, studio, studioState: state, assistant }),
		[host, studio, state, assistant],
	);
	return h(
		"div",
		{ className: `wg-studio-shell-board is-${place}` },
		h(WidgetSurface, {
			board,
			registry,
			host: studioHost,
			editing: false,
			isReadOnly: true,
			onChange: setBoard,
			initialWidth: MIN_LAID_OUT_BOARD_PX,
		}),
	);
}
