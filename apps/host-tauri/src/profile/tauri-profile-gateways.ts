import { BrowserAuditGateway, BrowserGrantsGateway, RecentSitesGateway } from "@widgetarium/browser/gateways";
import type { AccessLogEntry, GrantChange, RecentSite, SiteGrant } from "@widgetarium/browser";
import { GLOBAL_ROOT } from "@widgetarium/behaviors/tauri-store";
import type { TauriProfile } from "./profile-docs.js";

const RECENT_ACCESS_KEPT = 200;

export interface ProfileGateways {
	readonly browserGrantsGateway: BrowserGrantsGateway;
	readonly browserAuditGateway: BrowserAuditGateway;
	readonly recentSitesGateway: RecentSitesGateway;
}

export function tauriProfileGateways(profile: TauriProfile): ProfileGateways {
	return {
		browserGrantsGateway: new TauriBrowserGrantsGateway(profile),
		browserAuditGateway: new TauriBrowserAuditGateway(profile),
		recentSitesGateway: new TauriRecentSitesGateway(profile),
	};
}

class TauriBrowserGrantsGateway extends BrowserGrantsGateway {
	constructor(private readonly profile: TauriProfile) {
		super();
	}

	readGrants(): readonly SiteGrant[] {
		return this.profile.grants.now().grants;
	}

	watch(changed: () => void): () => void {
		return this.profile.grants.watch(changed);
	}

	writeGrantChange(grants: readonly SiteGrant[], change: GrantChange): void {
		this.profile.grants.change({ grants: [...grants] }, `${change.siteKey} ${change.was ?? "none"} → ${change.became}`);
		appendLater(this.profile, this.profile.files.grantChanges, change);
	}
}

class TauriBrowserAuditGateway extends BrowserAuditGateway {
	private kept: readonly AccessLogEntry[];

	constructor(private readonly profile: TauriProfile) {
		super();
		this.kept = profile.recentAccess;
	}

	appendAccess(entry: AccessLogEntry): void {
		this.kept = [...this.kept, entry].slice(-RECENT_ACCESS_KEPT);
		appendLater(this.profile, this.profile.files.access, entry);
	}

	recentAccess(): readonly AccessLogEntry[] {
		return this.kept;
	}
}

class TauriRecentSitesGateway extends RecentSitesGateway {
	constructor(private readonly profile: TauriProfile) {
		super();
	}

	sites(): readonly RecentSite[] {
		return this.profile.recentSites.now().sites;
	}

	watch(changed: () => void): () => void {
		return this.profile.recentSites.watch(changed);
	}

	keep(sites: readonly RecentSite[], reason: string): void {
		this.profile.recentSites.change({ sites: [...sites] }, reason);
	}
}

function appendLater(profile: TauriProfile, file: string, entry: object): void {
	const line = {
		...entry,
		id: crypto.randomUUID(),
	};
	profile.store.appendLine(GLOBAL_ROOT, file, line).catch((failure: unknown) => {
		console.error(`[ink] ${file} lost a line`, failure);
	});
}
