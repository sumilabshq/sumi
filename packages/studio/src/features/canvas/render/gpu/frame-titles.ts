import type { Canvas, Paragraph } from "canvaskit-wasm";
import type { Camera } from "./camera.js";
import type { FrameRoot } from "./frame-root.js";
import type { GpuContext } from "./gpu-context.js";
import { colourOf } from "./gpu-tokens.js";

export const FRAME_GAP_PX = 120;
const TITLE_ROOM_PX = 24;
const TITLE_RISE_PX = 20;
const TITLE_MIN_WIDTH_PX = 40;

export class FrameTitles {
	private readonly titles = new Map<FrameRoot, Paragraph>();

	constructor(private readonly context: GpuContext) {}

	draw(canvas: Canvas, frames: readonly FrameRoot[], camera: Camera): void {
		if (camera.zoom * FRAME_GAP_PX < TITLE_ROOM_PX) return;
		for (const frame of frames) {
			const title = this.titleOf(frame);
			title.layout(Math.max(TITLE_MIN_WIDTH_PX, frame.width * camera.zoom));
			canvas.drawParagraph(title, frame.x * camera.zoom + camera.x, frame.y * camera.zoom + camera.y - TITLE_RISE_PX);
		}
	}

	drop(frame: FrameRoot): void {
		this.titles.get(frame)?.delete();
		this.titles.delete(frame);
	}

	dropAll(): void {
		for (const frame of [...this.titles.keys()]) this.drop(frame);
	}

	private titleOf(frame: FrameRoot): Paragraph {
		const cached = this.titles.get(frame);
		if (cached) return cached;
		const { ck, fonts, tokens } = this.context;
		const style = new ck.ParagraphStyle({
			textStyle: {
				color: ck.Color4f(...(colourOf(tokens, "muted-foreground") ?? [0.5, 0.5, 0.5, 1])),
				fontFamilies: ["sans"],
				fontSize: tokens.lengths["text-sm"] ?? 12,
				fontStyle: { weight: ck.FontWeight.Medium },
			},
			maxLines: 1,
			ellipsis: "…",
		});
		const builder = ck.ParagraphBuilder.MakeFromFontProvider(style, fonts);
		builder.addText(frame.spec.title);
		const paragraph = builder.build();
		builder.delete();
		this.titles.set(frame, paragraph);
		return paragraph;
	}
}
