import { createElement as h, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import { SectionDepthContext } from "../../../../shared/lib/section-depth-context.js";
import { useSettingsSection } from "../../lib/use-settings-section.js";

export interface SettingsSectionProps {
	readonly id: string;
	readonly children?: ReactNode;
}

export function SettingsSection({ id, children }: SettingsSectionProps): ReactElement {
	const { title, description, anchor } = useSettingsSection(id);
	const depth = useContext(SectionDepthContext);

	if (depth > 0) {
		return (
			<section {...anchor} className="sumi-settings-subsection">
				<div>
					<h3 className="sumi-settings-subsection-title">{title}</h3>
					{description === undefined ? null : <p className="sumi-settings-subsection-hint">{description}</p>}
				</div>
				<div className="sumi-settings-subsection-body">{children}</div>
			</section>
		);
	}

	return (
		<SectionDepthContext.Provider value={depth + 1}>
			<section {...anchor} className="sumi-settings-section">
				<h2 className="sumi-settings-section-title">{title}</h2>
				{description === undefined ? null : <p className="sumi-settings-section-hint">{description}</p>}
				{children}
			</section>
		</SectionDepthContext.Provider>
	);
}
