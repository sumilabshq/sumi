export const TEXT_KEPT = 200_000;

const SECRET_FIELDS =
	'input[type="password" i], input[autocomplete^="cc-" i], input[autocomplete="one-time-code" i], input[autocomplete="current-password" i], input[autocomplete="new-password" i], input[name*="card" i], input[name*="cvc" i], input[name*="cvv" i], input[name*="iban" i]';

const SECRET_FIELD_SHOWN = `const secretFieldShown = () => {
	const shown = (field) => {
		const box = field.getBoundingClientRect();
		const look = getComputedStyle(field);
		return box.width > 0 && box.height > 0 && look.visibility !== "hidden" && look.display !== "none";
	};
	const masked = (field) => {
		const mask = getComputedStyle(field).getPropertyValue("-webkit-text-security");
		return mask !== "" && mask !== "none";
	};
	const named = document.querySelectorAll('${SECRET_FIELDS}');
	const typed = Array.from(document.querySelectorAll("input, textarea")).filter(masked);
	return [...Array.from(named), ...typed].some(shown);
};`;

export const PAGE_LAYOUT = `({
	page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
	viewport: { x: window.scrollX, y: window.scrollY, width: window.innerWidth, height: window.innerHeight },
})`;

export const READ_PAGE = `(() => {
	${SECRET_FIELD_SHOWN}
	return {
		hasSecretField: secretFieldShown(),
		url: location.href,
		title: document.title,
		text: document.body ? document.body.innerText.slice(0, ${TEXT_KEPT}) : "",
	};
})()`;

export const READ_DOM = `(() => {
	${SECRET_FIELD_SHOWN}
	const unread = '${SECRET_FIELDS}, input[type="hidden" i], input[type="file" i]';
	const isMasked = (field) => {
		const mask = getComputedStyle(field).getPropertyValue("-webkit-text-security");
		return mask !== "" && mask !== "none";
	};
	const blank = (field) => {
		field.removeAttribute("value");
		if (field.tagName === "TEXTAREA") {
			field.textContent = "";
		}
	};
	const reflect = (field, source) => {
		if (source.tagName === "TEXTAREA") {
			field.textContent = source.value;
			return;
		}
		if (source.tagName === "SELECT") {
			Array.from(field.options).forEach((option, at) => option.toggleAttribute("selected", source.options[at]?.selected === true));
			return;
		}
		if (source.type === "checkbox" || source.type === "radio") {
			field.toggleAttribute("checked", source.checked);
			return;
		}
		field.setAttribute("value", source.value);
	};
	const fields = "input, textarea, select";
	const live = Array.from(document.querySelectorAll(fields));
	const copy = document.documentElement.cloneNode(true);
	Array.from(copy.querySelectorAll(fields)).forEach((field, at) => {
		const source = live[at];
		if (!source || source.matches(unread) || isMasked(source)) {
			blank(field);
			return;
		}
		reflect(field, source);
	});
	copy.querySelectorAll("script, style, noscript, template").forEach((dropped) => dropped.remove());
	return {
		hasSecretField: secretFieldShown(),
		url: location.href,
		title: document.title,
		text: copy.outerHTML.slice(0, ${TEXT_KEPT}),
	};
})()`;

export const FIND_SECRET_FIELD = `(() => {
	${SECRET_FIELD_SHOWN}
	return secretFieldShown();
})()`;
