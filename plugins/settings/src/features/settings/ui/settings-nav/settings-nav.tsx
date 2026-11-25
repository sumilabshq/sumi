import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Icon, Input, Kbd, PopoverItem } from "@widgetarium/kit";
import type { SettingsPage } from "../../../../shared/lib/settings-page.js";
import { groupsMatching } from "../../lib/groups-matching.js";
import type { PageGroup } from "../../lib/pages-by-group.js";
import { useFocusesOnFind } from "../../lib/use-focuses-on-find.js";

const SEARCH = "Search settings";
const SEARCH_KEY = "⌘F";
const NO_MATCH = "Nothing matches";

export interface SettingsNavProps {
	readonly groups: readonly PageGroup[];
	readonly shown: SettingsPage;
	readonly onShow: (page: SettingsPage) => void;
}

export function SettingsNav({ groups, shown, onShow }: SettingsNavProps): ReactElement {
	const [query, setQuery] = useState("");
	const navRef = useRef<HTMLElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	useFocusesOnFind(navRef, searchRef);
	const matching = groupsMatching(groups, query);
	const first = matching[0]?.pages[0];
	const show = (page: SettingsPage): void => {
		setQuery("");
		onShow(page);
	};
	return (
		<nav ref={navRef} className="sumi-settings-nav" aria-label="Settings">
			<Input
				ref={searchRef}
				block={true}
				size="s"
				className="sumi-settings-search"
				aria-label={SEARCH}
				placeholder={SEARCH}
				icon={<Icon name="search" size={14} />}
				end={<Kbd>{SEARCH_KEY}</Kbd>}
				value={query}
				onValueChange={setQuery}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						setQuery("");
					}

					if (event.key === "Enter" && first !== undefined) {
						show(first);
					}
				}}
			/>
			{first === undefined ? <p className="sumi-settings-group-label">{NO_MATCH}</p> : null}
			{matching.map((group) => (
				<div key={group.label ?? "sumi"} className="sumi-settings-group">
					{group.label === null ? null : <p className="sumi-settings-group-label">{group.label}</p>}
					{group.pages.map((page) => (
						<PopoverItem
							key={page.id}
							className="sumi-settings-item"
							aria-current={page.id === shown.id ? "true" : undefined}
							title={page.title}
							icon={<Icon name={page.icon} size={16} />}
							onClick={() => show(page)}
						>
							<span className="sumi-settings-item-text">{page.title}</span>
						</PopoverItem>
					))}
				</div>
			))}
		</nav>
	);
}
