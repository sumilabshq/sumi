import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export function SidePanelAction({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>): ReactElement {
	return <button type="button" {...rest} className={cn("wg-kit-side-panel-action", className)} />;
}
