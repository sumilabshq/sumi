const NOT_IN_A_PAGE = "Tauri is the shell's: an app page reaches native powers only by asking Sumi";

// TRADE-OFF: core's tauriEvent imports Tauri lazily; aliased here until core drops it
export function invoke(): Promise<never> {
	return Promise.reject(new Error(NOT_IN_A_PAGE));
}

export function listen(): Promise<never> {
	return Promise.reject(new Error(NOT_IN_A_PAGE));
}
