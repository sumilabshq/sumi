export type SendState = "streaming" | "queueing" | "typing" | "idle";

export function sendState({ busy, hasInput }: { readonly busy: boolean; readonly hasInput: boolean }): SendState {
	if (busy) {
		return hasInput ? "queueing" : "streaming";
	}

	return hasInput ? "typing" : "idle";
}
