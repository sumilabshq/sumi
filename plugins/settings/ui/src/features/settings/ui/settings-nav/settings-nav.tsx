import { createElement as h, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { Icon, Input, Kbd, PopoverItem } from "@widgetarium/kit";
import type { SettingsPageEntry, SettingsPageGroup } from "@sumi/settings-registry-plugin";
import { hitRowsOf } from "../../lib/hit-rows.js";
import type { HitRow } from "../../lib/hit-rows.js";
import { useFocusesOnFind } from "../../lib/use-focuses-on-find.js";
import { SettingsHits } from "../settings-hits/settings-hits.js";

const SEARCH = "Search settings";
const SEARCH_KEY = "⌘F";

export interface SettingsNavProps {
	readonly groups: readonly SettingsPageGroup[];
	readonly pages: readonly SettingsPageEntry[];
	readonly shown: SettingsPageEntry;
	readonly onShow: (page: SettingsPageEntry, sectionId?: string | null) => void;
}

export function SettingsNav({ groups, pages, shown, onShow }: SettingsNavProps): ReactElement {
	const [query, setQuery] = useState("");
	const [cursor, setCursor] = useState(0);
	const navRef = useRef<HTMLElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	useFocusesOnFind(navRef, searchRef);
	const rows = hitRowsOf(pages, query);
	const isSearching = query.trim() !== "";

	useEffect(() => {
		navRef.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
	}, [cursor]);

	const search = (words: string): void => {
		setQuery(words);
		setCursor(0);
	};
	const open = ({ hit, page }: HitRow): void => {
		search("");
		onShow(page, hit.sectionPath.at(-1) ?? null);
	};
	const show = (page: SettingsPageEntry): void => {
		search("");
		onShow(page);
	};
	const steer = (event: KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === "Escape") {
			search("");
		}

		const row = rows[cursor];

		if (event.key === "Enter" && row !== undefined) {
			open(row);
		}

		if ((event.key === "ArrowDown" || event.key === "ArrowUp") && rows.length > 0) {
			event.preventDefault();
			setCursor((cursor + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length);
		}
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
				onValueChange={search}
				onKeyDown={steer}
			/>
			{isSearching ? (
				<SettingsHits rows={rows} cursor={cursor} onCursor={setCursor} onOpen={open} />
			) : (
				groups.map((group) => (
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
				))
			)}
		</nav>
	);
}
