const INLINE_INJECT = /\.inject\(\s*\{/;
const BUILT_WIDGET = /const\s+([A-Za-z_$][\w$]*)\s*=\s*widget\(\)/;
const UNNAMED = "<name>";
const INLINE_INJECT_SAID =
	"an inject written inline in the builder; declare `const {name}Inject = inject({…})` and type the view with `InjectProps<typeof {name}Inject>`";

export interface InlineInjectFinding {
	readonly rule: "inline-inject";
	readonly message: string;
}

export function inlineInjectFindings(source: string): readonly InlineInjectFinding[] {
	if (!INLINE_INJECT.test(source)) return [];
	const name = camelOf(BUILT_WIDGET.exec(source)?.[1] ?? UNNAMED);
	return [{ rule: "inline-inject", message: INLINE_INJECT_SAID.split("{name}").join(name) }];
}

function camelOf(name: string): string {
	return name === UNNAMED ? name : `${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}
