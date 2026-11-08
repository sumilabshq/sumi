import { createContext, useContext } from "react";
import type { GitAddress } from "./git-address.js";

export interface GitPage {
	readonly root: string;
	readonly name: string;
	readonly parent: string;
	readonly branch: string | null;
	readonly address: GitAddress;
	readonly viewed: ReadonlySet<string>;
	toggleViewed(path: string): void;
	go(next: Partial<GitAddress>): void;
}

export interface RangeInput {
	readonly root: string;
	readonly head: string | null;
	readonly base: string;
}

export interface ComparisonInput extends RangeInput {
	readonly only: string | null;
}

const OUTSIDE_PAGE = "a Git block is drawn outside its repository page";
const DETACHED = "detached";

export const GitPageContext = createContext<GitPage | null>(null);

export function useGitPage(): GitPage {
	const page = useContext(GitPageContext);

	if (page === null) {
		throw new Error(OUTSIDE_PAGE);
	}

	return page;
}

export function headLabelOf({ address, branch }: GitPage): string {
	return address.head ?? branch ?? DETACHED;
}

export function rangeInputOf({ root, address }: GitPage): RangeInput {
	return {
		root,
		head: address.head,
		base: address.base,
	};
}

export function comparisonInputOf(page: GitPage): ComparisonInput {
	return {
		...rangeInputOf(page),
		only: page.address.only,
	};
}
