import { z } from "zod";
import { AppSchema } from "@sumi/apps-plugin";
import { slot } from "@widgetarium/plugin-framework";
import type { FilledItem } from "@widgetarium/plugin-framework";

export const ANY_EXTENSION = "*";

const EXTENSION = /^(\*|[a-z0-9][a-z0-9-]*)$/;
const NOT_AN_EXTENSION = "an extension is lowercase, without its dot, or * for any file";

export const FileViewerSchema = AppSchema.extend({
	extensions: z.array(z.string().regex(EXTENSION, NOT_AN_EXTENSION)).min(1),
});

export const FileViewersSlot = slot("file-viewers").item(FileViewerSchema).list();

export type FileViewer = FilledItem<typeof FileViewerSchema>;
