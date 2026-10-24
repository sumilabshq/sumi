export type SensitiveCategory =
	| "bank-or-payments"
	| "password-manager"
	| "crypto-exchange"
	| "tax-or-identity"
	| "sign-in"
	| "webmail"
	| "health"
	| "hr-or-payroll";

export interface SensitiveDomain {
	readonly domain: string;
	readonly category: SensitiveCategory;
}

export interface SensitiveSites {
	readonly version: number;
	readonly blocked: readonly SensitiveDomain[];
	readonly asked: readonly SensitiveDomain[];
	readonly signInHostPrefixes: readonly string[];
	readonly paymentFrames: readonly string[];
	readonly framesAllowed: readonly string[];
}

const BANKS: readonly string[] = [
	"paypal.*",
	"stripe.*",
	"wise.com",
	"revolut.*",
	"klarna.*",
	"venmo.com",
	"cash.app",
	"chase.com",
	"bankofamerica.com",
	"wellsfargo.com",
	"citi.com",
	"capitalone.com",
	"americanexpress.*",
	"usbank.com",
	"schwab.com",
	"fidelity.com",
	"vanguard.com",
	"robinhood.com",
	"hsbc.*",
	"barclays.*",
	"lloydsbank.com",
	"santander.*",
	"ing.*",
	"bnpparibas.com",
	"deutsche-bank.de",
	"n26.*",
	"monzo.com",
	"privatbank.ua",
	"monobank.ua",
];

const PASSWORD_MANAGERS: readonly string[] = [
	"1password.*",
	"bitwarden.*",
	"lastpass.*",
	"dashlane.com",
	"keepersecurity.com",
	"pass.proton.me",
	"nordpass.com",
];

const CRYPTO_EXCHANGES: readonly string[] = [
	"coinbase.*",
	"binance.*",
	"kraken.*",
	"crypto.com",
	"bitstamp.net",
	"okx.com",
	"bybit.com",
	"kucoin.com",
	"gemini.com",
	"metamask.io",
];

const TAX_AND_IDENTITY: readonly string[] = [
	"irs.gov",
	"ssa.gov",
	"login.gov",
	"id.me",
	"gov.uk",
	"diia.gov.ua",
	"tax.gov.ua",
	"elster.de",
	"impots.gouv.fr",
	"canada.ca",
];

const SIGN_IN_HOSTS: readonly string[] = [
	"appleid.apple.com",
	"account.apple.com",
	"myaccount.google.com",
	"account.microsoft.com",
	"myaccount.microsoft.com",
	"account.live.com",
	"account.proton.me",
	"okta.com",
	"auth0.com",
	"onelogin.com",
	"microsoftonline.com",
];

const WEBMAIL: readonly string[] = [
	"mail.google.com",
	"outlook.live.com",
	"outlook.office.com",
	"mail.yahoo.com",
	"proton.me",
	"icloud.com",
	"fastmail.com",
	"gmx.net",
	"mail.ukr.net",
];

const PAYMENT_FRAMES: readonly string[] = [
	"stripe.*",
	"paypal.*",
	"klarna.*",
	"braintreegateway.com",
	"braintree-api.com",
	"adyen.com",
	"adyenpayments.com",
	"checkout.com",
	"squareup.com",
	"pay.google.com",
	"apple-pay-gateway.apple.com",
];

const FRAMES_ALLOWED: readonly string[] = ["youtube.com", "youtube-nocookie.com", "player.vimeo.com"];

const HEALTH: readonly string[] = ["mychart.com", "nhs.uk", "zocdoc.com", "healthcare.gov", "helsi.me"];

const HR_AND_PAYROLL: readonly string[] = [
	"workday.com",
	"myworkday.com",
	"adp.com",
	"gusto.com",
	"rippling.com",
	"bamboohr.com",
	"deel.com",
	"personio.com",
	"paychex.com",
];

function inCategory(category: SensitiveCategory, domains: readonly string[]): readonly SensitiveDomain[] {
	return domains.map((domain) => ({
		domain,
		category,
	}));
}

export const SENSITIVE_SITES: SensitiveSites = {
	version: 1,
	blocked: [
		...inCategory("bank-or-payments", BANKS),
		...inCategory("password-manager", PASSWORD_MANAGERS),
		...inCategory("crypto-exchange", CRYPTO_EXCHANGES),
		...inCategory("tax-or-identity", TAX_AND_IDENTITY),
		...inCategory("sign-in", SIGN_IN_HOSTS),
	],
	asked: [
		...inCategory("webmail", WEBMAIL),
		...inCategory("health", HEALTH),
		...inCategory("hr-or-payroll", HR_AND_PAYROLL),
	],
	signInHostPrefixes: ["accounts", "login", "auth", "id", "sso", "signin"],
	paymentFrames: PAYMENT_FRAMES,
	framesAllowed: FRAMES_ALLOWED,
};
