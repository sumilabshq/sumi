import { z } from "zod";

export const IconLinkSchema = z.object({
	href: z.string(),
	rel: z.string(),
	sizes: z.string(),
	type: z.string(),
	isMatching: z.boolean(),
});

export type IconLink = z.infer<typeof IconLinkSchema>;

export const PageIconsReadSchema = z.object({
	page: z.string(),
	links: z.array(IconLinkSchema).max(64),
});

export type PageIconsRead = z.infer<typeof PageIconsReadSchema>;

export const SiteIconSchema = z.string().regex(/^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/);

export const SiteIconAnswerSchema = z.object({
	icon: SiteIconSchema.nullable(),
	isReached: z.boolean(),
});

export type SiteIconAnswer = z.infer<typeof SiteIconAnswerSchema>;

export interface WornIcon {
	readonly favicon: string;
	readonly origin: string;
}

export const KeptSiteIconSchema = z.object({
	address: z.string(),
	origin: z.string(),
	icon: SiteIconSchema.nullable(),
	fetchedAt: z.number(),
});

export type KeptSiteIcon = z.infer<typeof KeptSiteIconSchema>;

export const KeptSiteIconsSchema = z.looseObject({
	icons: z.array(KeptSiteIconSchema).catch([]),
});

export type KeptSiteIcons = z.infer<typeof KeptSiteIconsSchema>;

export const PageHeadReadSchema = z.object({
	page: z.string(),
	head: z.string().nullable(),
	isReached: z.boolean(),
});

export type PageHeadRead = z.infer<typeof PageHeadReadSchema>;

export const SiteOriginSchema = z.object({
	origin: z.string(),
});

export const SiteIconOfOriginSchema = z.object({
	icon: SiteIconSchema.nullable(),
});

export type SiteIconOfOrigin = z.infer<typeof SiteIconOfOriginSchema>;
