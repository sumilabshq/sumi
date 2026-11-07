import type { Runtime } from "./runtime";

export function mountOrStop<Mounted>(started: Runtime, mount: (runtime: Runtime) => Mounted): Mounted {
	try {
		return mount(started);
	} catch (refused) {
		started.stop();
		throw refused;
	}
}
