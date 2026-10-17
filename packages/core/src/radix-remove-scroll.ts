import { createElement as h, forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { RemoveScroll as original } from "react-remove-scroll";
import { PictureContext } from "./engine/picture-scope.js";

export type RemoveScrollProps = ComponentPropsWithoutRef<typeof original>;

const Picturing = forwardRef<HTMLElement, RemoveScrollProps>((props, ref) => {
	const isPicture = useContext(PictureContext);
	return h(original, { ...props, ref, enabled: props.enabled !== false && !isPicture });
});

export const RemoveScroll = Object.assign(Picturing, { classNames: original.classNames });
