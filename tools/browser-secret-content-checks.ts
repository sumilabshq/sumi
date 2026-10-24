import { refuseSecretContent } from "../packages/domain/browser/features/ink/lib/secret-content.ts";
import { check } from "./check-helpers.ts";

const REFUSED = "secret-in-content";

const SECRET_TEXTS: Readonly<Record<string, string>> = {
	"a Visa number in groups": "Card 4111 1111 1111 1111 on file",
	"a card number with dashes": "4111-1111-1111-1111",
	"a contiguous card number": "5555555555554444",
	"an Amex number in its own groups": "3782 822463 10005",
	"a grouped IBAN": "IBAN: GB82 WEST 1234 5698 7654 32 BIC WEST",
	"a compact IBAN": "DE89370400440532013000",
	"an OpenAI key": `key sk-${"a1B2".repeat(6)}`,
	"a Stripe live key": `sk_live_${"x9".repeat(12)}`,
	"a GitHub token": `ghp_${"Ab3".repeat(12)}`,
	"a GitHub fine-grained token": `github_pat_${"11AB_cd".repeat(4)}`,
	"an AWS access key": "AKIAIOSFODNN7EXAMPLE",
	"a Slack bot token": "xoxb-1234567890-abcdef",
	"a Slack user token": "xoxp-1234567890-abcdef",
	"a JWT": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlLXZhbHVl",
	"a private key block": "-----BEGIN RSA PRIVATE KEY-----\nMIIE",
	"a bare private key block": "-----BEGIN PRIVATE KEY-----",
	"a card number followed by its CVV": "4111 1111 1111 1111 123",
	"a card number in no-break spaces": "4111\u00a01111\u00a01111\u00a01111",
	"a card number after a date": "2026-10-18 4111-1111-1111-1111",
	"an IBAN followed by a word": "BE68 5390 0754 7034 SEPA",
	"a lowercase IBAN": "gb82 west 1234 5698 7654 32",
	"a Stripe test key": `sk_test_${"x9".repeat(12)}`,
	"a Stripe restricted key": `rk_live_${"x9".repeat(12)}`,
	"a GitHub OAuth token": `gho_${"Ab3".repeat(12)}`,
	"a GitLab token": `glpat-${"Ab3_".repeat(5)}`,
	"an AWS session key": "ASIAIOSFODNN7EXAMPLE",
	"a Google API key": `AIza${"Sy0_".repeat(8)}abc`,
	"a token in an address": `https://example.com/?key=AKIAIOSFODNN7EXAMPLE`,
};

const PLAIN_TEXTS: Readonly<Record<string, string>> = {
	"a card look-alike failing Luhn": "4111 1111 1111 1112",
	"a contiguous look-alike failing Luhn": "5555555555554445",
	"a short order number": "Order 1234567890",
	"a phone number": "+1 415 555 2671",
	"a date": "2026-10-18",
	"an IBAN look-alike failing its checksum": "GB82 WEST 1234 5698 7654 33",
	"a word ending in sk-": `task-${"a".repeat(24)}`,
	"a short sk- prefix": "sk-short",
	"a short GitHub prefix": "ghp_abc",
	"an AWS look-alike one letter short": "AKIAIOSFODNN7EXAMP",
	"another Slack token kind": "xoxa-1234567890-abcdef",
	"two dotted parts": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0",
	"a public key block": "-----BEGIN PUBLIC KEY-----",
	"ordinary prose": "Sprint 7 closes on Friday",
	"a table of small numbers": "12 34 56 78 90 12 34 56 78 90",
	"an account number in odd groups": "41 1111 1111 1111 11",
	"a Luhn-failing number followed by digits": "4111 1111 1111 1112 999",
};

for (const [what, text] of Object.entries(SECRET_TEXTS)) {
	check(`${what} is refused`, refuseSecretContent(text), REFUSED);
}

for (const [what, text] of Object.entries(PLAIN_TEXTS)) {
	check(`${what} passes`, refuseSecretContent(text), null);
}
