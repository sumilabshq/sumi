import { createElement as h } from "react";
import type { ReactElement } from "react";

const SAMPLES = {
	heading: "Release plan for March",
	ui: "Done. The settings page now lists every plugin, and the search finds a setting by any word in it.",
} as const;

export function FontExample({ role }: { readonly role: "heading" | "ui" | "code" }): ReactElement {
	if (role === "code") {
		return (
			<span className="sumi-appearance-sample is-code">
				<span className="sumi-appearance-keyword">const</span> plan ={" "}
				<span className="sumi-appearance-keyword">await</span> tasks.search(
				<span className="sumi-appearance-string">"release"</span>)
			</span>
		);
	}

	return <span className={`sumi-appearance-sample is-${role}`}>{SAMPLES[role]}</span>;
}
