import * as original from "aria-hidden";
import { PICTURE_ATTRIBUTE } from "./engine/picture-scope.js";

export * from "aria-hidden";

type Target = Parameters<typeof original.hideOthers>[0];

export const hideOthers: typeof original.hideOthers = (target, parent, marker) => {
	if (isInPicture(target)) return leavesNothing;
	return original.hideOthers(target, parent, marker);
};

const leavesNothing = (): void => {};

function isInPicture(target: Target): boolean {
	return [target].flat().some((one) => !one.isConnected || one.closest(`[${PICTURE_ATTRIBUTE}]`) !== null);
}
