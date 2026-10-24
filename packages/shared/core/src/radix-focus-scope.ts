import { createElement as h, forwardRef, useContext } from "react";
import * as original from "@radix-ui/react-focus-scope";
import type { FocusScopeProps } from "@radix-ui/react-focus-scope";
import { PictureContext } from "./engine/picture-scope.js";

export * from "@radix-ui/react-focus-scope";

export const FocusScope = forwardRef<HTMLDivElement, FocusScopeProps>((props, ref) => {
	const isPicture = useContext(PictureContext);
	if (!isPicture) return h(original.FocusScope, { ...props, ref });
	return h(original.FocusScope, {
		...props,
		ref,
		trapped: false,
		onMountAutoFocus: keepsFocus,
		onUnmountAutoFocus: keepsFocus,
	});
});

export const Root = FocusScope;

const keepsFocus = (event: Event): void => event.preventDefault();
