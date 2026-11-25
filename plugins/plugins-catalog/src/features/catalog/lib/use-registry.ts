import { plugins } from "@widgetarium/plugin-registry/contract";
import type { Runtime } from "@widgetarium/data-framework";
import { useCallback, useEffect, useState } from "react";
import type { RegistrySchemaOutput } from "./registry-types.js";

export interface RegistryView {
	readonly registry: RegistrySchemaOutput | null;
	readonly refresh: () => void;
	readonly planOf: (id: string) => Promise<readonly string[]>;
	readonly setEnabled: (id: string, enabled: boolean) => Promise<string | null>;
}

export function useRegistry(windowApp: Runtime): RegistryView {
	const [registry, setRegistry] = useState<RegistrySchemaOutput | null>(null);
	const refresh = useCallback((): void => {
		void windowApp.send(plugins.registry.all).then((answer) => {
			if (!answer.ok) {
				console.error(`[widgetarium] settings could not read the plugins: ${answer.reason}`);
				return;
			}

			setRegistry(answer.output);
		});
	}, [windowApp]);
	useEffect(refresh, [refresh]);
	return {
		registry,
		refresh,
		planOf: async (id) => {
			const answer = await windowApp.send(plugins.registry.disablePlan, { id });
			return answer.ok ? answer.output.alsoOff : [];
		},
		setEnabled: async (id, enabled) => {
			const answer = await windowApp.send(plugins.registry.setEnabled, { id, enabled });
			refresh();
			return answer.ok ? null : answer.reason;
		},
	};
}
