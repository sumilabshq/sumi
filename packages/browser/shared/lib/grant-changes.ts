import { refuse } from "@widgetarium/core/requests";
import type { AccessLevel, GrantChange, OnceAllowance, SiteGrant } from "../schema/site-access.schema.js";
import { onceGrantOf } from "./once-grants.js";

export interface SiteLevelWanted {
	readonly siteKey: string;
	readonly level: AccessLevel;
	readonly by: "person" | "ask";
	readonly reason: string;
	readonly at: number;
}

export interface GrantWrite {
	readonly grants: readonly SiteGrant[];
	readonly change: GrantChange;
}

const SITE_KEY = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;
const NOT_A_SITE = 'site access is kept per host name, and "{siteKey}" is not one';
const THE_PERSON = "person";
const ALLOWED_ONCE = "allowed once";

export function siteLevelToWrite(held: readonly SiteGrant[], wanted: SiteLevelWanted): GrantWrite | null {
	if (!SITE_KEY.test(wanted.siteKey)) {
		return refuse(NOT_A_SITE.replace("{siteKey}", wanted.siteKey));
	}

	const was = hostGrantOf(held, wanted.siteKey);

	if (was?.level === wanted.level && was.source === wanted.by) {
		return null;
	}

	const granted: SiteGrant = {
		siteKey: wanted.siteKey,
		scope: "host",
		level: wanted.level,
		source: wanted.by,
		grantedAt: wanted.at,
		by: THE_PERSON,
	};
	return {
		grants: [...held.filter((grant) => grant !== was), granted],
		change: changeOf(was, granted, wanted.reason),
	};
}

export function onceToWrite(held: readonly SiteGrant[], allowance: OnceAllowance): GrantWrite {
	return {
		grants: held,
		change: changeOf(hostGrantOf(held, allowance.siteKey), onceGrantOf(allowance), ALLOWED_ONCE),
	};
}

function hostGrantOf(grants: readonly SiteGrant[], siteKey: string): SiteGrant | null {
	return grants.find((grant) => grant.siteKey === siteKey && grant.scope === "host") ?? null;
}

function changeOf(was: SiteGrant | null, became: SiteGrant, reason: string): GrantChange {
	return {
		at: became.grantedAt,
		siteKey: became.siteKey,
		was: was?.level ?? null,
		became: became.level,
		by: THE_PERSON,
		reason,
	};
}
