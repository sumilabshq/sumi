import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export type McpAppCardLook = "border" | "tile" | "none";

export interface McpAppCardProps {
	readonly look: McpAppCardLook;
	readonly children: ReactNode;
}

export function McpAppCard({ look, children }: McpAppCardProps): ReactElement {
	return (
		<div className={`sumi-mcp-card is-${look}`} data-mcp-card={look}>
			{children}
		</div>
	);
}
