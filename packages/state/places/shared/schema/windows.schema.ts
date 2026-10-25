import { z } from "zod";

export const OpenWindowSchema = z.object({
	label: z.string().min(1),
	openedAt: z.number().nonnegative(),
});

export type OpenWindow = z.infer<typeof OpenWindowSchema>;

export const WindowsSchema = z.object({
	windows: z.array(OpenWindowSchema),
});

export type Windows = z.infer<typeof WindowsSchema>;

export const WindowLabelSchema = z.object({
	window: z.string().min(1),
});

export const LiveWindowsSchema = z.object({
	windows: z.array(z.string().min(1)),
});

export interface WindowsMoved {
	readonly windows: Windows;
	readonly reason: string;
}

export type MoveWindows = (now: Windows) => WindowsMoved | null;
