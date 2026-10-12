import type { Paragraph } from "canvaskit-wasm";
import type { FamilyWord, Weight } from "./class-style.js";
import type { GpuContext } from "./gpu-context.js";
import type { Rgba } from "./gpu-tokens.js";

export interface TextLook {
	readonly text: string;
	readonly fontSize: number;
	readonly lineHeight: number;
	readonly weight: Weight;
	readonly family: FamilyWord;
	readonly tracking: number;
	readonly tabular: boolean;
	readonly align: "left" | "center" | "right";
	readonly colour: Rgba;
	readonly truncate: boolean;
}

export interface MeasuredText {
	readonly width: number;
	readonly height: number;
}

const UNBOUNDED_PX = 100000;

export class TextBlock {
	private paragraph: Paragraph | null = null;
	private builtFor = "";
	private laidAt = -1;

	constructor(private readonly context: GpuContext) {}

	paragraphAt(look: TextLook, width: number): Paragraph {
		const key = JSON.stringify(look);
		const paragraph = key === this.builtFor && this.paragraph ? this.paragraph : this.rebuild(look, key);
		if (width === this.laidAt) return paragraph;
		paragraph.layout(width);
		this.laidAt = width;
		return paragraph;
	}

	measure(look: TextLook, width: number, fixed: boolean, bounded: boolean): MeasuredText {
		const available = bounded ? width : UNBOUNDED_PX;
		const intrinsic = Math.ceil(this.paragraphAt(look, available).getMaxIntrinsicWidth());
		const measured = fixed ? width : bounded ? Math.min(intrinsic, width) : intrinsic;
		return { width: measured, height: Math.ceil(this.paragraphAt(look, measured).getHeight()) };
	}

	dispose(): void {
		this.paragraph?.delete();
		this.paragraph = null;
	}

	private rebuild(look: TextLook, key: string): Paragraph {
		const { ck, fonts } = this.context;
		this.paragraph?.delete();
		const weightOf = {
			400: ck.FontWeight.Normal,
			500: ck.FontWeight.Medium,
			600: ck.FontWeight.SemiBold,
			700: ck.FontWeight.Bold,
		};
		const alignOf = { left: ck.TextAlign.Left, center: ck.TextAlign.Center, right: ck.TextAlign.Right };
		const style = new ck.ParagraphStyle({
			textStyle: {
				color: ck.Color4f(...look.colour),
				fontFamilies: [look.family, "sans"],
				fontSize: look.fontSize,
				fontStyle: { weight: weightOf[look.weight] },
				heightMultiplier: look.lineHeight / look.fontSize,
				halfLeading: true,
				letterSpacing: look.tracking * look.fontSize,
				fontFeatures: look.tabular ? [{ name: "tnum", value: 1 }] : [],
			},
			textAlign: alignOf[look.align],
			...(look.truncate ? { maxLines: 1, ellipsis: "…" } : {}),
		});
		const builder = ck.ParagraphBuilder.MakeFromFontProvider(style, fonts);
		builder.addText(look.text);
		const paragraph = builder.build();
		builder.delete();
		this.paragraph = paragraph;
		this.builtFor = key;
		this.laidAt = -1;
		return paragraph;
	}
}

export function textOfChildren(children: unknown): string {
	if (children === null || children === undefined || children === false) return "";
	if (Array.isArray(children)) return children.map(textOfChildren).join("");
	return String(children);
}
