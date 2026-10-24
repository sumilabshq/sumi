import { z } from "zod";

export const NoteToneSchema = z.enum(["take", "like", "dislike", "note"]);
