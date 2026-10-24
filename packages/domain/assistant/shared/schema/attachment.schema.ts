import { z } from "zod";

export const FileKindSchema = z.enum(["image", "text"]);

export type FileKind = z.infer<typeof FileKindSchema>;

export const AttachmentKindSchema = z.enum(["image", "text", "folder"]);

export type AttachmentKind = z.infer<typeof AttachmentKindSchema>;

export const AttachmentChipSchema = z.object({
	id: z.string(),
	name: z.string(),
	kind: AttachmentKindSchema,
	size: z.string(),
	bytes: z.number().int().nonnegative(),
	preview: z.string().nullable(),
	where: z.string().nullable(),
});

export type AttachmentChip = z.infer<typeof AttachmentChipSchema>;

export const DraftAttachmentsSchema = z.array(AttachmentChipSchema);

export const AttachReachSchema = z.object({ canAttachFolders: z.boolean() });

export type AttachReach = z.infer<typeof AttachReachSchema>;

export const FilesAskedSchema = z.object({ files: z.array(z.instanceof(File)).min(1) });

export const AttachmentAskedSchema = z.object({ id: z.string() });

export const MessageAskedSchema = z.object({ said: z.string() });
