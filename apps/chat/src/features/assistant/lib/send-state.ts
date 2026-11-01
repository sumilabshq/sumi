export type SendState = "streaming" | "typing" | "idle";

export function sendState({ busy, hasInput }: { readonly busy: boolean; readonly hasInput: boolean }): SendState {
	if (busy) return "streaming";
	return hasInput ? "typing" : "idle";
}
