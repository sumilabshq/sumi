import { z } from "zod";
import { AccessLogEntrySchema, RecentSiteSchema, SiteGrantSchema } from "@widgetarium/browser";
import type { AccessLogEntry } from "@widgetarium/browser";
import { HeldDoc } from "../store/held-doc.js";
import { GLOBAL_ROOT } from "../store/store-client.js";
import type { DocKind, StoreClient } from "../store/store-client.js";

export const DEFAULT_PROFILE = "default";

const RECENT_ACCESS_READ = 200;

const GrantsDocSchema = z.looseObject({
	grants: z.array(SiteGrantSchema).catch([]),
});

const RecentSitesDocSchema = z.looseObject({
	sites: z.array(RecentSiteSchema).catch([]),
});

export type GrantsDoc = z.infer<typeof GrantsDocSchema>;

export type RecentSitesDoc = z.infer<typeof RecentSitesDocSchema>;

export interface ProfileFiles {
	readonly grants: string;
	readonly grantChanges: string;
	readonly access: string;
	readonly recentSites: string;
}

export interface TauriProfile {
	readonly store: StoreClient;
	readonly files: ProfileFiles;
	readonly grants: HeldDoc<GrantsDoc>;
	readonly recentSites: HeldDoc<RecentSitesDoc>;
	readonly recentAccess: readonly AccessLogEntry[];
}

export function profileFilesOf(profile: string): ProfileFiles {
	const at = (file: string): string => `profiles/${profile}/${file}`;
	return {
		grants: at("grants.json"),
		grantChanges: at("grant-changes.jsonl"),
		access: at("access.jsonl"),
		recentSites: at("recent-sites.json"),
	};
}

export async function readProfile(store: StoreClient, profile: string): Promise<TauriProfile> {
	const files = profileFilesOf(profile);
	const [grants, recentSites, access] = await Promise.all([
		HeldDoc.read({
			store,
			root: GLOBAL_ROOT,
			kind: docKind(files.grants, GrantsDocSchema),
			empty: GrantsDocSchema.parse({}),
		}),
		HeldDoc.read({
			store,
			root: GLOBAL_ROOT,
			kind: docKind(files.recentSites, RecentSitesDocSchema),
			empty: RecentSitesDocSchema.parse({}),
		}),
		store.readLines(GLOBAL_ROOT, {
			file: files.access,
			schema: AccessLogEntrySchema,
			before: null,
			limit: RECENT_ACCESS_READ,
		}),
	]);
	return {
		store,
		files,
		grants,
		recentSites,
		recentAccess: access.lines,
	};
}

function docKind<Doc>(file: string, schema: z.ZodType<Doc>): DocKind<Doc> {
	return {
		file,
		v: 1,
		schema,
	};
}
