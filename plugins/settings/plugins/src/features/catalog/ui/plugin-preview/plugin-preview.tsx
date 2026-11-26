import { createElement as h } from "react";
import type { ReactElement } from "react";

// TODO: preview images
export function PluginPreview({ isLarge = false }: { readonly isLarge?: boolean }): ReactElement {
	return (
		<span className={isLarge ? "sumi-plugins-mini is-large" : "sumi-plugins-mini"}>
			<span className="sumi-plugins-mini-line" style={{ width: "56%" }} />
			<span className="sumi-plugins-mini-line is-quiet" style={{ width: "32%" }} />
		</span>
	);
}
