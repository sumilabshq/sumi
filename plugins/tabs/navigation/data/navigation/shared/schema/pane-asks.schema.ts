import { z } from "zod";
import { PanePlacementSchema, WindowSeatSchema } from "./pane-tree.schema.js";

export const SeatAskSchema = z.object({ seat: WindowSeatSchema });

export const PreviewAskSchema = SeatAskSchema.extend({ placement: PanePlacementSchema.nullable() });

export const PlaceAskSchema = SeatAskSchema.extend({ placement: PanePlacementSchema });

export const PaneAskSchema = SeatAskSchema.extend({ id: z.string() });

export const ResizePaneSplitAskSchema = SeatAskSchema.extend({
	splitId: z.string(),
	at: z.number().int().nonnegative(),
	share: z.number().nonnegative(),
});

export const TabInPaneAskSchema = SeatAskSchema.extend({ tabId: z.string() });

export const ChatInPaneAskSchema = SeatAskSchema.extend({
	chatId: z.string().min(1),
	paneId: z.string().nullable(),
});

export const TabsInPanesAskSchema = SeatAskSchema.extend({ tabIds: z.array(z.string()).readonly() });

export const HeldTabsInPanesAskSchema = SeatAskSchema.extend({ heldTabIds: z.array(z.string()).readonly() });

export const WindowSidesSchema = z.object({ leftHidden: z.boolean().nullable() });

export const HideSideAskSchema = z.object({
	window: z.string().min(1),
	isHidden: z.boolean(),
});
