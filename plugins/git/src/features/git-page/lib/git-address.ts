import { LastCommitSchema, UncommittedSchema } from "@sumi/git";

export interface GitAddress {
	readonly folder: string;
	readonly head: string | null;
	readonly base: string;
	readonly only: string | null;
}

export const LAST_COMMIT = LastCommitSchema.value;
export const UNCOMMITTED = UncommittedSchema.value;

const ASKED_MARK = "?";
const HEAD_KEY = "head";
const BASE_KEY = "base";
const ONLY_KEY = "only";
const APP_TITLE = "Git";

export function gitAddressOf(address: string): GitAddress {
	const mark = address.indexOf(ASKED_MARK);
	const asked = new URLSearchParams(mark === -1 ? "" : address.slice(mark + 1));
	return {
		folder: mark === -1 ? address : address.slice(0, mark),
		head: filledOrNull(asked.get(HEAD_KEY)),
		base: filledOrNull(asked.get(BASE_KEY)) ?? LAST_COMMIT,
		only: filledOrNull(asked.get(ONLY_KEY)),
	};
}

export function addressOf({ folder, head, base, only }: GitAddress): string {
	const asked = new URLSearchParams();

	if (head !== null) {
		asked.set(HEAD_KEY, head);
	}

	if (base !== LAST_COMMIT) {
		asked.set(BASE_KEY, base);
	}

	if (only !== null) {
		asked.set(ONLY_KEY, only);
	}

	const written = asked.toString();
	return written === "" ? folder : `${folder}${ASKED_MARK}${written}`;
}

export function gitTitleOf(address: string): string {
	const name = gitAddressOf(address).folder.replace(/\/+$/, "").split("/").at(-1) ?? "";
	return name === "" ? APP_TITLE : name;
}

function filledOrNull(value: string | null): string | null {
	return value === null || value.trim() === "" ? null : value;
}
