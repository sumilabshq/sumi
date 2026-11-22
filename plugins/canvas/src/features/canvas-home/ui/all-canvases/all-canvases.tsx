import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { CanvasOrder } from "@sumi/artboards/contract";
import { PLAIN_CARD_PX } from "../../lib/grid-span.js";
import { usePagedCanvases } from "../../lib/use-paged-canvases.js";
import { CanvasCard } from "../canvas-card/canvas-card.js";
import { NoCanvases } from "../no-canvases/no-canvases.js";
import { OrderMenu } from "../order-menu/order-menu.js";
import { VirtualGrid } from "../virtual-grid/virtual-grid.js";
import { WaitingCard } from "../waiting-card/waiting-card.js";

export interface AllCanvasesProps {
	readonly tabId: string;
	readonly words: string;
	readonly scroller: HTMLElement | null;
}

const TITLE = "All canvases";

export function AllCanvases({ tabId, words, scroller }: AllCanvasesProps): ReactElement {
	const [order, setOrder] = useState<CanvasOrder>("edited");
	const paged = usePagedCanvases(order, words);

	if (paged.total === 0) {
		return <NoCanvases tabId={tabId} words={words} />;
	}

	return (
		<section className="sumi-canvas-home-section" aria-label={TITLE}>
			<div className="sumi-canvas-home-head">
				<h2>{TITLE}</h2>
				<OrderMenu order={order} onOrder={setOrder} />
			</div>
			<VirtualGrid
				scroller={scroller}
				total={paged.total}
				cardPx={PLAIN_CARD_PX}
				itemAt={paged.rowAt}
				onWanted={paged.want}
				drawItem={(row) => (row === undefined ? <WaitingCard /> : <CanvasCard tabId={tabId} row={row} chat={null} />)}
			/>
		</section>
	);
}
