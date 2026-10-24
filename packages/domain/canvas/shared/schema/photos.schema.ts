import { z } from "zod";

export const PhotosSchema = z.object({ photos: z.array(z.custom<File>()) });
