import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { Icon } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { PageRow } from "../page-row/page-row.js";

export function PagesList(): ReactElement {
	const { tabId } = useCanvasView();
	const canvas = useQuery(artboards.canvases.getCanvas, { tabId }).data;
	const create = useCommand(artboards.pages.createPage);
	return (
		<section className="sumi-canvas-pages" aria-label="Pages">
			<div className="sumi-canvas-label">
				<span>Pages</span>
				<button
					type="button"
					className="sumi-canvas-icon"
					aria-label="New page"
					onClick={() => void create.run({ tabId, name: null })}
				>
					<Icon name="plus" size={16} />
				</button>
			</div>
			{canvas.pages.map((page) => (
				<PageRow key={page.id} page={page} isShown={page.id === canvas.shownPage} />
			))}
		</section>
	);
}
