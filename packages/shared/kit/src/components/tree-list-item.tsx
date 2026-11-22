import { createElement as h } from "react";
import type { LiHTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export type TreeListItemProps = LiHTMLAttributes<HTMLLIElement>;

export function TreeListItem({ className, ...rest }: TreeListItemProps): ReactElement {
	return <li data-slot="tree-list-item" {...rest} className={cn("wg-kit-tree-list-item", className)} />;
}
