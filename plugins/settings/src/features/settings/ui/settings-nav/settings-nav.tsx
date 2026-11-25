import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { SettingsPage } from "../../../../shared/lib/settings-page.js";
import type { PageGroup } from "../../lib/pages-by-group.js";

// TODO: settings search
const SEARCH = "Search settings";
const SEARCH_KEY = "⌘F";

export interface SettingsNavProps {
	readonly groups: readonly PageGroup[];
	readonly shown: SettingsPage;
	readonly onShow: (page: SettingsPage) => void;
}

export function SettingsNav({ groups, shown, onShow }: SettingsNavProps): ReactElement {
	return (
		<nav className="sumi-settings-nav" aria-label="Settings">
			<div className="sumi-settings-search">
				<Icon name="search" size={14} />
				<span className="sumi-settings-search-text">{SEARCH}</span>
				<span className="sumi-settings-search-key">{SEARCH_KEY}</span>
			</div>
			{groups.map((group) => (
				<div key={group.label ?? "sumi"} className="sumi-settings-group">
					{group.label === null ? null : <p className="sumi-settings-group-label">{group.label}</p>}
					{group.pages.map((page) => (
						<button
							key={page.id}
							type="button"
							className="sumi-settings-item"
							aria-current={page.id === shown.id ? "page" : undefined}
							title={page.title}
							onClick={() => onShow(page)}
						>
							<Icon name={page.icon} size={16} />
							<span className="sumi-settings-item-text">{page.title}</span>
						</button>
					))}
				</div>
			))}
		</nav>
	);
}
