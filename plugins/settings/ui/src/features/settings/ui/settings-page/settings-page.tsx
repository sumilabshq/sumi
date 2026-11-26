import { createElement as h, Fragment, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import { SettingsPageContext } from "../../../../shared/lib/settings-page-context.js";

export interface SettingsPageProps {
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function SettingsPageHead(): ReactElement {
	const page = useContext(SettingsPageContext);

	if (page === null) {
		throw new Error("SettingsPageHead is drawn outside a settings page");
	}

	return (
		<>
			<h1 className="sumi-settings-page-title">{page.title}</h1>
			{page.description === undefined ? null : <p className="sumi-settings-lede">{page.description}</p>}
		</>
	);
}

export function SettingsPage({ className, children }: SettingsPageProps): ReactElement {
	return (
		<div className={className === undefined ? "sumi-settings-page" : `sumi-settings-page ${className}`}>
			<SettingsPageHead />
			{children}
		</div>
	);
}
