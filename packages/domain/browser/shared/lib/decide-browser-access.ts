import type {
	AccessDecision,
	AccessLevel,
	AccessSource,
	AccessVerdict,
	SiteGrant,
} from "../schema/site-access.schema.js";
import { isPrivateHost } from "./private-hosts.js";
import type { SensitiveSites } from "./sensitive-sites.js";
import { urlOf } from "./site-key.js";

export interface AccessAsked {
	readonly address: string;
	readonly tabId: string | null;
}

interface LevelFound {
	readonly level: AccessLevel;
	readonly reason: string;
	readonly source: AccessSource;
}

const VERDICT_OF: Readonly<Record<AccessLevel, AccessVerdict>> = {
	allowed: "allow",
	ask: "ask",
	blocked: "deny",
};

const WEB_SCHEMES: ReadonlySet<string> = new Set(["https:", "http:"]);
const ANY_SUFFIX = ".*";
const SUFFIX_LABEL_LONGEST = 3;

const ALLOWED_BY_DEFAULT: LevelFound = {
	level: "allowed",
	reason: "allowed-by-default",
	source: "default",
};

const ASKED_ON_PRIVATE_NETWORK: LevelFound = {
	level: "ask",
	reason: "private-network",
	source: "default",
};

export function decideBrowserAccess(
	asked: AccessAsked,
	grants: readonly SiteGrant[],
	list: SensitiveSites,
): AccessDecision {
	const url = urlOf(asked.address);

	if (url === null) {
		return denied("not-a-url", "");
	}

	const siteKey = siteKeyOf(url);
	const refusal = refuseUrlShape(url);

	if (refusal !== null) {
		return denied(refusal, siteKey);
	}

	const found = personLevelOf(siteKey, grants, asked.tabId) ?? listLevelOf(siteKey, list) ?? privateLevelOf(siteKey);
	const decision = VERDICT_OF[found.level];
	const isInsecure = url.protocol === "http:" && decision === "allow";

	return {
		decision: isInsecure ? "ask" : decision,
		reason: isInsecure ? "insecure-http" : found.reason,
		siteKey,
		level: found.level,
		source: found.source,
	};
}

export function isKeptOut(decision: AccessDecision | null): boolean {
	return decision !== null && decision.level === "blocked" && decision.source !== "default";
}

export function refuseUrlShape(url: URL | null): string | null {
	if (url === null) {
		return "not-a-url";
	}

	if (!WEB_SCHEMES.has(url.protocol)) {
		return "scheme-not-allowed";
	}

	if (url.username !== "" || url.password !== "") {
		return "credentials-in-url";
	}

	return url.hostname === "" ? "no-host" : null;
}

export function siteKeyOfAddress(address: string): string {
	const url = urlOf(address);

	return url === null ? "" : siteKeyOf(url);
}

export function isOnList(siteKey: string, domains: readonly string[]): boolean {
	return domains.some((domain) => isListed(siteKey, domain));
}

function siteKeyOf(url: URL): string {
	return url.hostname.toLowerCase().replace(/\.$/, "");
}

function isWithin(siteKey: string, domain: string): boolean {
	return siteKey === domain || siteKey.endsWith(`.${domain}`);
}

function isListed(siteKey: string, domain: string): boolean {
	if (!domain.endsWith(ANY_SUFFIX)) {
		return isWithin(siteKey, domain);
	}

	const brand = domain.slice(0, -ANY_SUFFIX.length);
	const labels = siteKey.split(".");

	return labels.some((label, at) => label === brand && isCountrySuffix(labels.slice(at + 1)));
}

function isCountrySuffix(labels: readonly string[]): boolean {
	return (
		labels.length >= 1 &&
		labels.length <= 2 &&
		labels.every((label) => label.length > 0 && label.length <= SUFFIX_LABEL_LONGEST)
	);
}

function personLevelOf(siteKey: string, grants: readonly SiteGrant[], tabId: string | null): LevelFound | null {
	const covering = grants.filter((grant) => grant.source !== "default" && covers(grant, siteKey, tabId));
	const blocking = covering.find((grant) => grant.level === "blocked");
	const chosen = blocking ?? [...covering].sort(bySpecificity)[0];

	if (!chosen) {
		return null;
	}

	return {
		level: chosen.level,
		reason: `person-${chosen.level}`,
		source: chosen.source,
	};
}

function listLevelOf(siteKey: string, list: SensitiveSites): LevelFound | null {
	const blocked = list.blocked.find(({ domain }) => isListed(siteKey, domain));

	if (blocked) {
		return listed("blocked", `sensitive-${blocked.category}`);
	}

	if (list.signInHostPrefixes.includes(siteKey.split(".")[0] ?? "")) {
		return listed("blocked", "sensitive-sign-in");
	}

	const asked = list.asked.find(({ domain }) => isListed(siteKey, domain));

	return asked ? listed("ask", `sensitive-${asked.category}`) : null;
}

function privateLevelOf(siteKey: string): LevelFound {
	return isPrivateHost(siteKey) ? ASKED_ON_PRIVATE_NETWORK : ALLOWED_BY_DEFAULT;
}

function listed(level: AccessLevel, reason: string): LevelFound {
	return {
		level,
		reason,
		source: "list",
	};
}

function covers(grant: SiteGrant, siteKey: string, tabId: string | null): boolean {
	if (grant.tabId !== undefined && grant.tabId !== tabId) {
		return false;
	}

	return grant.scope === "domain" ? isWithin(siteKey, grant.siteKey) : grant.siteKey === siteKey;
}

function bySpecificity(first: SiteGrant, second: SiteGrant): number {
	return second.siteKey.length - first.siteKey.length || (first.scope === "host" ? -1 : 1);
}

function denied(reason: string, siteKey: string): AccessDecision {
	return {
		decision: "deny",
		reason,
		siteKey,
		level: "blocked",
		source: "default",
	};
}
