import { z } from "zod";

export interface StatePicture {
	readonly widget: string;
	readonly props: Readonly<Record<string, unknown>>;
	readonly mounts: Readonly<Record<string, readonly MountPicture[]>> | null;
}

export interface MountPicture {
	readonly name: string;
	readonly widget: string;
	readonly title: string;
	readonly surface: "group" | "none" | null;
	readonly picture: StatePicture;
}

export const MountPictureSchema: z.ZodType<MountPicture> = z.lazy(() =>
	z.object({
		name: z.string(),
		widget: z.string(),
		title: z.string(),
		surface: z.enum(["group", "none"]).nullable(),
		picture: StatePictureSchema,
	}),
);

export const StatePictureSchema: z.ZodType<StatePicture> = z.lazy(() =>
	z.object({
		widget: z.string(),
		props: z.record(z.string(), z.unknown()).readonly(),
		mounts: z.record(z.string(), z.array(MountPictureSchema).readonly()).readonly().nullable(),
	}),
);
