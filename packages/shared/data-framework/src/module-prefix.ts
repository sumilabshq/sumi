import { checkedPrefix } from "./identity";
import { HandledModule } from "./module";
import type { StartableModule } from "./module";
import { isRunnableModule } from "./platform-module";
import type { DeviceModule, ServerSideModule } from "./runtime";

export function prefixedModule(module: ServerSideModule, prefix: string | null): ServerSideModule;
export function prefixedModule(module: DeviceModule, prefix: string | null): DeviceModule;
export function prefixedModule(module: StartableModule, prefix: string | null): StartableModule {
	if (prefix === null) {
		return module;
	}

	if (module instanceof HandledModule || isRunnableModule(module)) {
		return module.prefixed(prefix);
	}

	return {
		...module,
		prefix: checkedPrefix(prefix),
	};
}
