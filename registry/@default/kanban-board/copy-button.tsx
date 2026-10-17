import { copyText, iconButtonClass } from "widgetarium/kit";
import { createPortal } from "react-dom";
import { Glyph } from "./glyph";
import { useSettlingCopied } from "./use-settling-copied";

const COPY_BUTTON_CLASS = `${iconButtonClass({ size: "s" })} otd-copy`;

export function CopyButton({ block }: { block: HTMLElement }) {
	const [isCopied, setCopied] = useSettlingCopied();

	const copy = async () => {
		setCopied(await copyText((block.querySelector("code") ?? block).textContent ?? ""));
	};

	return createPortal(
		<button type="button" className={COPY_BUTTON_CLASS} aria-label="Copy" title="Copy" onClick={copy}>
			<Glyph name={isCopied ? "tick" : "copy"} />
		</button>,
		block,
	);
}
