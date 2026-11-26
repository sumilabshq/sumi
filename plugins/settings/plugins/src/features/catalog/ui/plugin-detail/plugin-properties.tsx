import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { reportLinkOf, sourceLinkOf } from "../../lib/plugin-links.js";
import type { RegistryEntry } from "../../lib/registry-types.js";

function Row({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
	return (
		<div className="sumi-plugins-kv">
			<span className="sumi-plugins-kv-label">{label}</span>
			<span>{value}</span>
		</div>
	);
}

export function PluginProperties({ entry }: { readonly entry: RegistryEntry }): ReactElement | null {
	const { metadata } = entry;

	if (metadata === null) {
		return null;
	}

	const source = sourceLinkOf(metadata.source);
	const report = reportLinkOf(metadata.source);
	return (
		<div className="sumi-plugins-properties">
			<div className="sumi-plugins-kv">
				<span className="sumi-plugins-kv-label">Made by</span>
				<span className="sumi-plugins-made">
					{metadata.author}
					{metadata.official ? (
						<span className="sumi-plugins-badge">
							<Icon name="tick" size={9} />
						</span>
					) : null}
					{metadata.official ? <span className="sumi-plugins-kv-label">official</span> : null}
				</span>
			</div>
			{metadata.adds.length === 0 ? null : <h4 className="sumi-plugins-props-heading">Adds</h4>}
			{metadata.adds.map((add) => (
				<Row key={add.where} label={add.where} value={add.what} />
			))}
			<h4 className="sumi-plugins-props-heading">Can reach</h4>
			{metadata.reaches.length === 0 ? <Row label="Anything outside itself" value="no" /> : null}
			{metadata.reaches.map((reach) => (
				<Row key={reach.what} label={reach.what} value={reach.how} />
			))}
			{source === null && report === null ? null : <div className="sumi-plugins-sep" />}
			{source === null ? null : (
				<a className="sumi-plugins-link" href={source}>
					Source code
					<Icon name="external-link" size={13} />
				</a>
			)}
			{report === null ? null : (
				<a className="sumi-plugins-link" href={report}>
					Report a problem
					<Icon name="external-link" size={13} />
				</a>
			)}
		</div>
	);
}
