import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { aimedBoxOf } from "@sumi/canvas-work/card-look";
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
	const stored = useOptionalQuery(artboards.chatViews.getChatView, { canvasId: result.canvasId, view: result.view ?? "" }).data;
	const aim = stored ?? { pages: [result.page], page: result.page, boards: [], area: null };
	const aimKey = JSON.stringify([aim.page, aim.boards, aim.area]);
	const boards = useOptionalQuery(artboards.boards.getPageBoards, { canvasId: result.canvasId, page }).data ?? [];
	const known = canvas?.pages ?? [{ id: result.page, name: result.pageName }];
	useEffect(() => setPage(aim.page), [aim.page, aimKey]);
	return (
		<McpAppCard look={look}>
			<div className="sumi-mini-canvas" style={{ height: MINI_CANVAS_HEIGHT }} onPointerLeave={() => setEngaged(false)}>
				<MiniField
					key={page}
					boards={boards}
					background={canvas?.background ?? null}
					aim={page === aim.page ? aimedBoxOf(aim, boards) : null}
				/>
				{isEngaged ? null : <div className="sumi-mini-canvas-cover" onPointerDown={() => setEngaged(true)} />}
				<MiniHead
					title={canvas?.title ?? result.title}
					pages={aim.pages.flatMap((id) => known.filter((one) => one.id === id))}
					page={page}
					href={CANVAS_LINK.replace("{canvasId}", result.canvasId)}
					onPick={setPage}
				/>
			</div>
		</McpAppCard>
	);
}
