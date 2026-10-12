import { z } from "zod";

export const PhotosSchema = z.object({ photos: z.array(z.instanceof(File)) });

export type Photos = z.output<typeof PhotosSchema>;
