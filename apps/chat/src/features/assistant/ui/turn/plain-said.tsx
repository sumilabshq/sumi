import { createElement as h } from "react";
import type { ReactElement } from "react";
import { LongSaid } from "./long-said.js";

const LONG_OVER_LINES = 12;
const LONG_OVER_CHARACTERS = 1200;

export function PlainSaid({ text }: { readonly text: string }): ReactElement {
	if (text.length > LONG_OVER_CHARACTERS || text.split("\n").length > LONG_OVER_LINES) {
		return <LongSaid text={text} />;
	}

	return <div className="wg-studio-ai-said">{text}</div>;
}
