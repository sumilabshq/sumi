const MIRRORED_STYLES = [
	"boxSizing",
	"width",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"borderTopWidth",
	"borderRightWidth",
	"borderBottomWidth",
	"borderLeftWidth",
	"fontFamily",
	"fontSize",
	"fontWeight",
	"fontStyle",
	"letterSpacing",
	"lineHeight",
	"tabSize",
	"textIndent",
	"textTransform",
	"wordSpacing",
] as const;

export function revealCaret(box: HTMLTextAreaElement): void {
	if (box.ownerDocument.activeElement !== box) {
		box.scrollTop = box.scrollHeight;
		return;
	}

	const style = getComputedStyle(box);
	const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
	const caretTop = caretTopOf(box, style);
	const viewTop = box.scrollTop;
	const viewBottom = viewTop + box.clientHeight;

	if (caretTop < viewTop) {
		box.scrollTop = caretTop;
		return;
	}

	if (caretTop + lineHeight > viewBottom) {
		box.scrollTop = caretTop + lineHeight - box.clientHeight;
	}
}

function caretTopOf(box: HTMLTextAreaElement, style: CSSStyleDeclaration): number {
	const page = box.ownerDocument;
	const mirror = page.createElement("div");
	const marker = page.createElement("span");

	for (const name of MIRRORED_STYLES) {
		mirror.style[name] = style[name];
	}

	mirror.style.width = `${box.getBoundingClientRect().width}px`;
	mirror.style.position = "absolute";
	mirror.style.visibility = "hidden";
	mirror.style.top = "0";
	mirror.style.left = "-9999px";
	mirror.style.whiteSpace = "pre-wrap";
	mirror.style.overflowWrap = "break-word";
	mirror.textContent = box.value.slice(0, box.selectionEnd);
	marker.textContent = "​";
	mirror.append(marker);
	page.body.append(mirror);
	const top = marker.offsetTop - parseFloat(style.paddingTop);
	mirror.remove();
	return top;
}
