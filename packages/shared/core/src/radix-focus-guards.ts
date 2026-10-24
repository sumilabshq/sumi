import { useContext } from "react";
import type { ReactNode } from "react";
import * as original from "@radix-ui/react-focus-guards";
import { PictureContext } from "./engine/picture-scope.js";

export * from "@radix-ui/react-focus-guards";

// TRADE-OFF: conditional hook; a picture's context never changes while it is mounted, and Radix gives no way to opt out
export function useFocusGuards(): void {
	if (useContext(PictureContext)) return;
	original.useFocusGuards();
}

export function FocusGuards({ children }: { readonly children?: ReactNode }): ReactNode {
	useFocusGuards();
	return children;
}

export const Root = FocusGuards;
