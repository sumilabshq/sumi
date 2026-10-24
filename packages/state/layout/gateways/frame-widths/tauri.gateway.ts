import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { FrameWidths } from "../../shared/schema/frame-widths.schema.js";
import { FrameWidthsGateway } from "./frame-widths.gateway.js";

export const KeptWidthsSchema = z.object({
	leftWidthPx: z.number().positive().nullable().catch(null),
	chatWidthPx: z.number().positive().nullable().catch(null),
});

export type KeptWidths = z.infer<typeof KeptWidthsSchema>;

export class TauriFrameWidthsGateway extends FrameWidthsGateway {
	constructor(
		private readonly settings: HeldDoc<KeptWidths>,
		private readonly first: FrameWidths,
	) {
		super();
	}

	widths(): FrameWidths {
		const kept = this.settings.now();
		return {
			left: kept.leftWidthPx ?? this.first.left,
			chat: kept.chatWidthPx ?? this.first.chat,
		};
	}

	saveWidths(widths: FrameWidths, reason: string): void {
		this.settings.change(
			{
				leftWidthPx: widths.left,
				chatWidthPx: widths.chat,
			},
			reason,
		);
		void this.settings.flush();
	}

	widthsChanged(listener: () => void): () => void {
		return this.settings.watch(listener);
	}
}
