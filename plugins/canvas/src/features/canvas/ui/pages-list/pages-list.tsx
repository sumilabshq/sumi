import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { Icon, SidePanelAction, SidePanelSection } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useCanvasView } from "../../lib/canvas-view-context.js";
import { PageRow } from "../page-row/page-row.js";

export function PagesList(): ReactElement {
	const { tabId } = useCanvasView();
	const canvas = useQuery(artboards.canvases.getCanvas, { tabId }).data;
	const create = useCommand(artboards.pages.createPage);
	return (
		<SidePanelSection
			label="Pages"
			action={
				<SidePanelAction aria-label="New page" onClick={() => void create.run({ tabId, name: null })}>
					<Icon name="plus" size={16} />
				</SidePanelAction>
			}
		>
			{canvas.pages.map((page) => (
				<PageRow key={page.id} page={page} isShown={page.id === canvas.shownPage} />
			))}
		</SidePanelSection>
	);
}
