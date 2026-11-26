import { createElement as h } from "react";
import type { ReactElement } from "react";
import { artboards } from "@sumi/artboards/contract";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Button, Icon } from "@widgetarium/kit";
import { canvasHrefOf } from "../../../../shared/lib/canvas-links.js";
import { useOpensLink } from "../../../../shared/lib/use-opens-link.js";
import { freeCanvasIdOf } from "../../lib/free-canvas-id.js";

const ICON_PX = 14;

export function NewCanvasButton({ tabId }: { readonly tabId: string }): ReactElement {
	const canvases = useQuery(artboards.canvases.getCanvases, {}).data;
	const create = useCommand(artboards.canvases.createCanvas);
	const openLink = useOpensLink(tabId);
	const startNew = async (inNewTab: boolean): Promise<void> => {
		const canvasId = freeCanvasIdOf(tabId, new Set(canvases.map((row) => row.canvasId)));
		const created = await create.run({ canvasId });

		if (!created.ok) {
			return;
		}

		openLink(canvasHrefOf(canvasId), inNewTab);
	};
	return (
		<Button variant="primary" size="l" className="sumi-canvas-new" onClick={(event) => void startNew(event.metaKey)}>
			<Icon name="plus" size={ICON_PX} />
			<span>New canvas</span>
		</Button>
	);
}
