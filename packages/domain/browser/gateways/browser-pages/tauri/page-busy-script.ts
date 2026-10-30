export const NO_BUSY_REASON = "";

export const BUSY_REASON_SCRIPT = `(() => {
	const media = Array.from(document.querySelectorAll("video, audio"));
	const isLiveStream = (element) =>
		element.srcObject instanceof MediaStream && element.srcObject.getTracks().some((track) => track.readyState === "live");
	if (media.some(isLiveStream)) return "in a call";
	if (media.some((element) => !element.paused && !element.muted && element.volume > 0)) return "playing media";
	const quiet = ["hidden", "checkbox", "radio", "submit", "button", "reset", "file", "range", "color", "image"];
	const fields = Array.from(document.querySelectorAll("input, textarea"));
	const isTyped = (field) => !quiet.includes(field.type) && field.value.trim() !== "" && field.value !== field.defaultValue;
	if (fields.some(isTyped)) return "typed text";
	const active = document.activeElement;
	if (active instanceof HTMLElement && active.isContentEditable && (active.textContent || "").trim() !== "") return "typed text";
	return "${NO_BUSY_REASON}";
})()`;
