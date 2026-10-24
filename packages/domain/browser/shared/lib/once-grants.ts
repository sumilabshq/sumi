import type { OnceAllowance, SiteGrant } from "../schema/site-access.schema.js";
import { siteKeyOfAddress } from "./decide-browser-access.js";

export interface TabAt {
	readonly id: string;
	readonly url: string;
}

const ONCE_LASTS_MS = 60 * 60 * 1000;
const THE_PERSON = "person";

export function onceAllowanceOf(siteKey: string, tabId: string, now: number): OnceAllowance {
	return {
		siteKey,
		tabId,
		until: now + ONCE_LASTS_MS,
	};
}

export function liveOnce(once: readonly OnceAllowance[], now: number): readonly OnceAllowance[] {
	return once.filter((allowance) => allowance.until > now);
}

export function onceKeptOnTabs(
	once: readonly OnceAllowance[],
	tabs: readonly TabAt[],
	now: number,
): readonly OnceAllowance[] {
	return liveOnce(once, now).filter((allowance) =>
		tabs.some((tab) => tab.id === allowance.tabId && siteKeyOfAddress(tab.url) === allowance.siteKey),
	);
}

export function effectiveGrants(
	persisted: readonly SiteGrant[],
	once: readonly OnceAllowance[],
	now: number,
): readonly SiteGrant[] {
	return [...persisted, ...liveOnce(once, now).map(onceGrantOf)];
}

export function onceGrantOf(allowance: OnceAllowance): SiteGrant {
	return {
		siteKey: allowance.siteKey,
		scope: "host",
		level: "allowed",
		source: "ask",
		grantedAt: allowance.until - ONCE_LASTS_MS,
		by: THE_PERSON,
		tabId: allowance.tabId,
	};
}
