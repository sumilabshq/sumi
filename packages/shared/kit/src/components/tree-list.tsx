import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export { TreeListItem } from "./tree-list-item";
export type { TreeListItemProps } from "./tree-list-item";

export type TreeListProps = HTMLAttributes<HTMLUListElement>;

export function TreeList({ className, ...rest }: TreeListProps): ReactElement {
	return <ul data-slot="tree-list" {...rest} className={cn("wg-kit-tree-list", className)} />;
}
