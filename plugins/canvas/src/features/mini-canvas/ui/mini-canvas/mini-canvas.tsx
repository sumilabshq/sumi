import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import type { ShownCanvasSchema } from "@sumi/canvas-work/contract";
import { McpAppCard } from "@sumi/mcp-apps-plugin";
import type { McpAppCardLook, McpAppViewProps } from "@sumi/mcp-apps-plugin";
import { useOptionalQuery } from "@widgetarium/data-framework";
import type { z } from "zod";
import { MiniField } from "../mini-field/mini-field.js";
import { MiniHead } from "../mini-head/mini-head.js";

export const MINI_CANVAS_HEIGHT = 420;

const CANVAS_LINK = "sumi://canvas/{canvasId}";

export interface MiniCanvasProps extends McpAppViewProps<z.output<typeof ShownCanvasSchema>> {
	readonly look?: McpAppCardLook;
}

export function MiniCanvas({ result, look = "tile" }: MiniCanvasProps): ReactElement {
	const [page, setPage] = useState(result.page);
	const [isEngaged, setEngaged] = useState(false);
	const canvas = useOptionalQuery(artboards.canvases.getCanvas, { canvasId: result.canvasId }).data;
	const boards = useOptionalQuery(artboards.boards.getPageBoards, { canvasId: result.canvasId, page }).data ?? [];
	return (
		<McpAppCard look={look}>
			<div className="sumi-mini-canvas" style={{ height: MINI_CANVAS_HEIGHT }} onPointerLeave={() => setEngaged(false)}>
				<MiniField key={page} boards={boards} background={canvas?.background ?? null} />
				{isEngaged ? null : <div className="sumi-mini-canvas-cover" onPointerDown={() => setEngaged(true)} />}
				<MiniHead
					title={canvas?.title ?? result.title}
					pages={canvas?.pages ?? [{ id: result.page, name: result.pageName }]}
					page={page}
					href={CANVAS_LINK.replace("{canvasId}", result.canvasId)}
					onPick={setPage}
				/>
			</div>
		</McpAppCard>
	);
}
