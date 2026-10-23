import { handler } from "@widgetarium/core/requests";
import { FrameWidthsGateway } from "../../gateways/frame-widths/frame-widths.gateway.js";
import { FRAME_BOUNDS, edgePxWithin } from "../../shared/lib/frame-bounds.js";
import { FrameWidthsStore } from "../../shared/lib/frame-widths-store.js";
import type { FrameEdge } from "../../shared/schema/frame-widths.schema.js";
import { ShellClientModule } from "../../module.js";
import { FrameWidthsQuery, ResetFrameEdgeCommand, ResizeFrameEdgeCommand } from "./contract.js";

const WIDTHS = {
	frameWidthsStore: FrameWidthsStore,
	frameWidthsGateway: FrameWidthsGateway,
};

interface WidthsParts {
	readonly frameWidthsStore: FrameWidthsStore;
	readonly frameWidthsGateway: FrameWidthsGateway;
}

export const FrameWidthsQueryHandler = handler(FrameWidthsQuery, ShellClientModule)
	.inject({ frameWidthsStore: FrameWidthsStore })
	.watch((_input, { frameWidthsStore }, changed) => frameWidthsStore.watch(changed))
	.handle((_input, { frameWidthsStore }) => frameWidthsStore.now());

export const ResizeFrameEdgeCommandHandler = handler(ResizeFrameEdgeCommand, ShellClientModule)
	.inject(WIDTHS)
	.handle(({ edge, px, mostPx }, parts) => keepEdge(edge, edgePxWithin(edge, px, mostPx), "drag", parts));

export const ResetFrameEdgeCommandHandler = handler(ResetFrameEdgeCommand, ShellClientModule)
	.inject(WIDTHS)
	.handle(({ edge, mostPx }, parts) =>
		keepEdge(edge, edgePxWithin(edge, FRAME_BOUNDS[edge].usualPx, mostPx), "reset", parts),
	);

function keepEdge(edge: FrameEdge, px: number, reason: string, parts: WidthsParts): void {
	parts.frameWidthsStore.become({ ...parts.frameWidthsStore.now(), [edge]: px }, `${edge} ${reason}`);
	parts.frameWidthsGateway.keep(edge, parts.frameWidthsStore.now()[edge]);
}
