import { decideBrowserAccess } from "../packages/browser/shared/lib/decide-browser-access.ts";
import { SENSITIVE_SITES } from "../packages/browser/shared/lib/sensitive-sites.ts";
import type { SiteGrant } from "../packages/browser/shared/schema/site-access.schema.ts";
import { regionWithin } from "../packages/browser/shared/lib/region-within.ts";
import { webAddressOf } from "../packages/browser/features/tabs/handlers.ts";
import { check } from "./check-helpers.ts";

const NONE: readonly SiteGrant[] = [];

function personSays(siteKey: string, level: SiteGrant["level"], scope: SiteGrant["scope"] = "host"): SiteGrant {
	return {
		siteKey,
		scope,
		level,
		source: "person",
		grantedAt: 1,
		by: "person",
	};
}

function decided(url: string, grants: readonly SiteGrant[] = NONE): string {
	const { decision, reason } = decideBrowserAccess({ address: url, tabId: "tab-1" }, grants, SENSITIVE_SITES);
	return `${decision} ${reason}`;
}

check("an ordinary https site is allowed by default", decided("https://example.com/a"), "allow allowed-by-default");
check(
	"the site key is the exact host",
	decideBrowserAccess({ address: "https://Docs.Example.com./x", tabId: null }, NONE, SENSITIVE_SITES).siteKey,
	"docs.example.com",
);
check("a bank is blocked by the list", decided("https://www.paypal.com/"), "deny sensitive-bank-or-payments");
check("a password manager is blocked", decided("https://my.1password.com/"), "deny sensitive-password-manager");
check("a crypto exchange is blocked", decided("https://pro.coinbase.com/"), "deny sensitive-crypto-exchange");
check("a tax site is blocked", decided("https://www.irs.gov/"), "deny sensitive-tax-or-identity");
check("an sso host is blocked by its first label", decided("https://accounts.google.com/"), "deny sensitive-sign-in");
check("webmail asks", decided("https://mail.google.com/mail"), "ask sensitive-webmail");
check("health asks", decided("https://www.nhs.uk/"), "ask sensitive-health");
check("payroll asks", decided("https://acme.myworkday.com/"), "ask sensitive-hr-or-payroll");
check(
	"a person's allow beats the list",
	decided("https://mail.google.com/", [personSays("mail.google.com", "allowed")]),
	"allow person-allowed",
);
check(
	"a person's block beats the default",
	decided("https://example.com/", [personSays("example.com", "blocked")]),
	"deny person-blocked",
);
check(
	"a host grant does not cover a subdomain",
	decided("https://docs.example.com/", [personSays("example.com", "blocked")]),
	"allow allowed-by-default",
);
check(
	"a blocked ancestor domain wins over a more specific allow",
	decided("https://docs.example.com/", [
		personSays("example.com", "blocked", "domain"),
		personSays("docs.example.com", "allowed"),
	]),
	"deny person-blocked",
);
check(
	"the most specific grant wins otherwise",
	decided("https://docs.example.com/", [
		personSays("example.com", "ask", "domain"),
		personSays("docs.example.com", "allowed"),
	]),
	"allow person-allowed",
);
check("plain http is at best ask", decided("http://example.com/"), "ask insecure-http");
check(
	"plain http stays ask even when allowed",
	decided("http://example.com/", [personSays("example.com", "allowed")]),
	"ask insecure-http",
);
check("a blocked http site stays denied", decided("http://www.paypal.com/"), "deny sensitive-bank-or-payments");
check("credentials in the url are denied", decided("https://user:secret@example.com/"), "deny credentials-in-url");
check("javascript: is denied", decided("javascript:alert(1)"), "deny scheme-not-allowed");
check("file: is denied", decided("file:///etc/passwd"), "deny scheme-not-allowed");
check("data: is denied", decided("data:text/html,hi"), "deny scheme-not-allowed");
check("obsidian: is denied", decided("obsidian://open?vault=x"), "deny scheme-not-allowed");
check("blob: is denied", decided("blob:https://example.com/1"), "deny scheme-not-allowed");
check("not a url is denied", decided("not a url"), "deny not-a-url");

check("localhost asks", decided("https://localhost:5173/"), "ask private-network");
check("a .local name asks", decided("https://printer.local/"), "ask private-network");
check("10/8 asks", decided("https://10.1.2.3/"), "ask private-network");
check("172.16/12 asks", decided("https://172.20.0.1/"), "ask private-network");
check("172.32 is public", decided("https://172.32.0.1/"), "allow allowed-by-default");
check("192.168/16 asks", decided("https://192.168.1.4/"), "ask private-network");
check("127/8 written as a number asks", decided("https://2130706433/"), "ask private-network");
check("::1 asks", decided("https://[::1]:8080/"), "ask private-network");
check("fc00::/7 asks", decided("https://[fd12:3456::1]/"), "ask private-network");
check("an ipv4-mapped loopback asks", decided("https://[::ffff:127.0.0.1]/"), "ask private-network");
check(
	"a person's allow beats private",
	decided("https://localhost/", [personSays("localhost", "allowed")]),
	"allow person-allowed",
);
check(
	"a brand is blocked under a country domain",
	decided("https://www.paypal.de/"),
	"deny sensitive-bank-or-payments",
);
check("and under a two-label one", decided("https://www.paypal.co.uk/"), "deny sensitive-bank-or-payments");
check("a brand label inside another site is not", decided("https://paypal.example.com/"), "allow allowed-by-default");
check("an account host is blocked", decided("https://myaccount.google.com/"), "deny sensitive-sign-in");
check(
	"the decision carries the level and who set it",
	(({ level, source }) => `${level} ${source}`)(
		decideBrowserAccess(
			{ address: "http://example.com/", tabId: null },
			[personSays("example.com", "allowed")],
			SENSITIVE_SITES,
		),
	),
	"allowed person",
);
check(
	"a region past the page is clamped",
	regionWithin({ x: 900, y: 0, width: 400, height: 50 }, { width: 1000, height: 600 }),
	{
		x: 900,
		y: 0,
		width: 100,
		height: 50,
	},
);
check(
	"a region wholly outside is refused",
	regionWithin({ x: 2000, y: 0, width: 10, height: 10 }, { width: 1000, height: 600 }),
	null,
);

check("a typed host becomes https", webAddressOf("example.com/path"), "https://example.com/path");
check("localhost with a port becomes https", webAddressOf("localhost:5173"), "https://localhost:5173");
check("typed words become a search", webAddressOf("obsidian plugins"), "https://duckduckgo.com/?q=obsidian%20plugins");
check("a typed scheme is kept for the gate to judge", webAddressOf("javascript:alert(1)"), "javascript:alert(1)");
