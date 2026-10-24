import { createElement as h, forwardRef, useContext } from "react";
import * as original from "@radix-ui/react-dismissable-layer";
import type { DismissableLayerProps } from "@radix-ui/react-dismissable-layer";
import { PictureContext } from "./engine/picture-scope.js";

export * from "@radix-ui/react-dismissable-layer";

export const DismissableLayer = forwardRef<HTMLDivElement, DismissableLayerProps>((props, ref) => {
	const isPicture = useContext(PictureContext);
	return h(original.DismissableLayer, {
		...props,
		ref,
		disableOutsidePointerEvents: props.disableOutsidePointerEvents === true && !isPicture,
	});
});

export const Root = DismissableLayer;
