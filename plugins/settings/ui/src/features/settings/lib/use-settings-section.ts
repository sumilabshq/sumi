import { useContext, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { findSection } from "@sumi/settings-registry-plugin";
import { SettingsFocusContext } from "../../../shared/lib/settings-focus-context.js";
import { SettingsPageContext } from "../../../shared/lib/settings-page-context.js";

export interface SectionAnchor {
	readonly ref: RefObject<HTMLDivElement | null>;
	readonly "data-flashing": "" | undefined;
	readonly onAnimationEnd: () => void;
}

export interface SettingsSectionText {
	readonly title: string;
	readonly description: string | undefined;
	readonly anchor: SectionAnchor;
}

export function useSettingsSection(id: string): SettingsSectionText {
	const page = useContext(SettingsPageContext);
	const focus = useContext(SettingsFocusContext);
	const ref = useRef<HTMLDivElement>(null);
	const [isFlashing, setFlashing] = useState(false);
	const section = page === null ? undefined : findSection(page, id);
	const isFocused = page !== null && focus?.pageId === page.id && focus.sectionId === id;

	useEffect(() => {
		if (!isFocused) {
			return;
		}

		ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
		setFlashing(true);
	}, [isFocused, focus]);

	if (section === undefined) {
		throw new Error(`settings section "${id}" is not registered on page "${page?.id ?? "none"}"`);
	}

	return {
		title: section.title,
		description: section.description,
		anchor: { ref, "data-flashing": isFlashing ? "" : undefined, onAnimationEnd: () => setFlashing(false) },
	};
}
