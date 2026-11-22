import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement, Ref } from "react";

export interface FilePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
	readonly ref?: Ref<HTMLInputElement>;
}

export function FilePicker(props: FilePickerProps): ReactElement {
	return <input data-slot="file-picker" {...props} type="file" hidden />;
}
