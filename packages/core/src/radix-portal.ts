import { createElement as h, forwardRef, useContext } from "react";
import * as original from "@radix-ui/react-portal";
import type { PortalProps } from "@radix-ui/react-portal";
import { PICTURE_ATTRIBUTE, PictureContext } from "./engine/picture-scope.js";

export * from "@radix-ui/react-portal";

const MARKED = { [PICTURE_ATTRIBUTE]: "" };

export const Portal = forwardRef<HTMLDivElement, PortalProps>((props, ref) => {
	const isPicture = useContext(PictureContext);
	return h(original.Portal, Object.assign({}, props, isPicture ? MARKED : null, { ref }));
});

export const Root = Portal;
