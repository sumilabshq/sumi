import type { TabStanding } from "@sumi/apps-plugin";

export function isOutsideHolders({ holderApp }: TabStanding): boolean {
	return holderApp === null;
}
