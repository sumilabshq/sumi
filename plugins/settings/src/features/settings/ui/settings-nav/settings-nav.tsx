import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import {
	Icon,
	Input,
	Kbd,
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@widgetarium/kit";
import type { SettingsPage } from "../../../../shared/lib/settings-page.js";
import { groupsMatching } from "../../lib/groups-matching.js";
import type { PageGroup } from "../../lib/pages-by-group.js";
import { useFocusesOnFind } from "../../lib/use-focuses-on-find.js";

const SEARCH = "Search settings";
const SEARCH_KEY = "⌘F";
const NO_MATCH = "Nothing matches";
const ICON_PX = 16;

export interface SettingsNavProps {
	readonly groups: readonly PageGroup[];
	readonly shown: SettingsPage;
	readonly onShow: (page: SettingsPage) => void;
}

export function SettingsNav({ groups, shown, onShow }: SettingsNavProps): ReactElement {
	const [query, setQuery] = useState("");
	const leftRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	useFocusesOnFind(leftRef, searchRef);
	const matching = groupsMatching(groups, query);
	const first = matching[0]?.pages[0];
	const show = (page: SettingsPage): void => {
		setQuery("");
		onShow(page);
	};
	return (
		<div ref={leftRef} className="sumi-settings-left">
			<Sidebar
				as="nav"
				mode="quiet"
				surface="edge"
				collapsible="none"
				className="sumi-settings-nav"
				aria-label="Settings"
			>
				<SidebarHeader className="sumi-settings-search">
					<Input
						ref={searchRef}
						block={true}
						size="s"
						variant="quiet"
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
				</SidebarHeader>
				<SidebarContent>
					{first === undefined ? <SidebarGroupLabel>{NO_MATCH}</SidebarGroupLabel> : null}
					{matching.map((group) => (
						<SidebarGroup key={group.label ?? "sumi"}>
							{group.label === null ? null : <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
							<SidebarMenu>
								{group.pages.map((page) => (
									<SidebarMenuItem key={page.id}>
										<SidebarMenuButton isActive={page.id === shown.id} tooltip={page.title} onClick={() => show(page)}>
											<Icon name={page.icon} size={ICON_PX} />
											<span className="sumi-settings-item-text">{page.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroup>
					))}
				</SidebarContent>
			</Sidebar>
		</div>
	);
}
