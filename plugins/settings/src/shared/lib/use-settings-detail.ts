import { useContext, useEffect } from "react";
import { SettingsDetailContext } from "./settings-detail-context.js";

export function useSettingsDetail(title: string | null, onBack: () => void): void {
	const show = useContext(SettingsDetailContext);

	useEffect(() => {
		show(title === null ? null : { title, onBack });
		return () => show(null);
	}, [show, title, onBack]);
}
