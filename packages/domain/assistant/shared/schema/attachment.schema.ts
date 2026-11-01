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

export const DraftAttachmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	kind: AttachmentKindSchema,
	mime: z.string(),
	bytes: z.custom<Uint8Array>(),
	preview: z.string().nullable(),
	path: z.string().nullable(),
});

export type DraftAttachment = z.infer<typeof DraftAttachmentSchema>;

export const TakenDraftSchema = z.object({
	attachments: z.array(DraftAttachmentSchema),
});

export const AdoptedDraftSchema = z.object({
	chatId: z.string().min(1),
	said: z.string(),
	attachments: z.array(DraftAttachmentSchema),
	sends: z.boolean(),
});

export type AdoptedDraft = z.infer<typeof AdoptedDraftSchema>;

export const AttachReachSchema = z.object({
	canAttachFolders: z.boolean(),
	accepted: z.string(),
});

export type AttachReach = z.infer<typeof AttachReachSchema>;

export const FilesAskedSchema = z.object({
	files: z.array(z.custom<File>()).min(1),
});

export const AttachmentAskedSchema = z.object({
	id: z.string(),
});

export const MessageAskedSchema = z.object({
	said: z.string(),
	replaces: z.string().optional(),
});

export const TextAskedSchema = z.object({
	said: z.string(),
});
