export const TEXT_KEPT = 200_000;
export const HTML_KEPT = 500_000;

export const READ_PAGE = `(() => ({
	title: document.title,
	text: document.body ? document.body.innerText.slice(0, ${TEXT_KEPT}) : "",
	html: document.documentElement.outerHTML.slice(0, ${HTML_KEPT}),
}))()`;

export const FIND_SECRET_FIELD = `(() => {
	const shown = (field) => {
		const box = field.getBoundingClientRect();
		const look = getComputedStyle(field);
		return box.width > 0 && box.height > 0 && look.visibility !== "hidden" && look.display !== "none";
	};
	const masked = (field) => {
		const mask = getComputedStyle(field).getPropertyValue("-webkit-text-security");
		return mask !== "" && mask !== "none";
	};
	const named = document.querySelectorAll(
		'input[type="password" i], input[autocomplete^="cc-" i], input[autocomplete="one-time-code" i], input[autocomplete="current-password" i], input[autocomplete="new-password" i], input[name*="card" i], input[name*="cvc" i], input[name*="cvv" i], input[name*="iban" i]',
	);
	const typed = Array.from(document.querySelectorAll("input, textarea")).filter(masked);
	return [...Array.from(named), ...typed].some(shown);
})()`;
