import { createElement as h } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";

export interface TextLinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly href?: undefined;
	readonly ref?: Ref<HTMLButtonElement>;
}

export interface TextLinkAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	readonly href: string;
	readonly ref?: Ref<HTMLAnchorElement>;
}

export type TextLinkProps = TextLinkButtonProps | TextLinkAnchorProps;

const TEXT_LINK_CLASS = "wg-kit-text-link";

export function TextLink(props: TextLinkProps): ReactElement {
	if (props.href !== undefined) {
		const { className, ...anchor } = props;
		return <a data-slot="text-link" className={cn(TEXT_LINK_CLASS, className)} {...anchor} />;
	}

	const { className, type = "button", ...button } = props;
	return <button type={type} data-slot="text-link" className={cn(TEXT_LINK_CLASS, className)} {...button} />;
}
