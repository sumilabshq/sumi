import { z } from "zod";

export const AccessLevelSchema = z.enum(["allowed", "ask", "blocked"]);

export type AccessLevel = z.infer<typeof AccessLevelSchema>;

export const GrantSourceSchema = z.enum(["default", "person", "ask"]);

export const GrantScopeSchema = z.enum(["host", "domain"]);

export const SiteGrantSchema = z.object({
	siteKey: z.string(),
	scope: GrantScopeSchema,
	level: AccessLevelSchema,
	source: GrantSourceSchema,
	grantedAt: z.number(),
	by: z.string(),
	tabId: z.string().optional(),
});

export type SiteGrant = z.infer<typeof SiteGrantSchema>;

export const AccessVerdictSchema = z.enum(["allow", "ask", "deny"]);

export type AccessVerdict = z.infer<typeof AccessVerdictSchema>;

export const AccessSourceSchema = z.enum(["person", "ask", "list", "default"]);

export type AccessSource = z.infer<typeof AccessSourceSchema>;

export const AccessDecisionSchema = z.object({
	decision: AccessVerdictSchema,
	reason: z.string(),
	siteKey: z.string(),
	level: AccessLevelSchema,
	source: AccessSourceSchema,
});

export type AccessDecision = z.infer<typeof AccessDecisionSchema>;

export const SiteRowSchema = z.object({
	siteKey: z.string(),
	level: AccessLevelSchema,
	source: GrantSourceSchema,
	since: z.number().nullable(),
});

export type SiteRow = z.infer<typeof SiteRowSchema>;

export const SiteAccessSchema = z.object({
	shown: AccessDecisionSchema.nullable(),
	rows: z.array(SiteRowSchema).readonly(),
});

export const ReadKindSchema = z.enum(["content", "screenshot", "navigate"]);

export type ReadKind = z.infer<typeof ReadKindSchema>;

export const AccessLogEntrySchema = z.object({
	at: z.number(),
	tab: z.string(),
	siteKey: z.string(),
	kind: ReadKindSchema,
	finalUrl: z.string(),
	decision: AccessVerdictSchema,
	reason: z.string(),
});

export type AccessLogEntry = z.infer<typeof AccessLogEntrySchema>;

export const GrantChangeSchema = z.object({
	at: z.number(),
	siteKey: z.string(),
	was: AccessLevelSchema.nullable(),
	became: AccessLevelSchema,
	by: z.string(),
	reason: z.string(),
});

export type GrantChange = z.infer<typeof GrantChangeSchema>;

export const OnceAllowanceSchema = z.object({
	siteKey: z.string(),
	tabId: z.string(),
	until: z.number(),
});

export type OnceAllowance = z.infer<typeof OnceAllowanceSchema>;

export const SiteLevelSchema = z.object({
	siteKey: z.string(),
	level: AccessLevelSchema,
});
