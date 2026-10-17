import { REACH_REASONS } from "./reach-names.js";
import type { ReachKind } from "./reach-names.js";

export type ReachRule =
	"global" | "property" | "text-as-code" | "dynamic-import" | "webview" | "unreadable" | "obfuscated";

export interface ReachFinding {
	readonly file: string;
	readonly line: number;
	readonly token: string;
	readonly rule: ReachRule;
	readonly kind: ReachKind | null;
	readonly isRefused: boolean;
}

export type Found = Omit<ReachFinding, "file">;

type Spotted = Omit<Found, "isRefused">;

const UNREADABLE_SAID = "could not be read, so nothing shows it stays inside its ports";
const OBFUSCATED_SAID = "reads as minified or obfuscated; a widget is published as the source its author wrote";
const DYNAMIC_IMPORT_SAID = "loads a module chosen while running, which the build never sees";

export function refusalAt(spotted: Spotted): Found {
	return {
		...spotted,
		isRefused: true,
	};
}

export function warningAt(token: string, line: number): Found {
	return {
		line,
		token,
		rule: "obfuscated",
		kind: null,
		isRefused: false,
	};
}

export function saidReachFinding(finding: ReachFinding): string {
	return `${finding.file}:${finding.line} ${finding.token} ${reasonOf(finding)}`;
}

function reasonOf({ rule, kind }: ReachFinding): string {
	if (kind !== null) {
		const { why, instead } = REACH_REASONS[kind];
		return instead === null ? why : `${why}; use ${instead}`;
	}

	if (rule === "dynamic-import") {
		return DYNAMIC_IMPORT_SAID;
	}

	return rule === "unreadable" ? UNREADABLE_SAID : OBFUSCATED_SAID;
}
