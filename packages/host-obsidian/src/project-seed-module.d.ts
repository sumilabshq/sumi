declare module "widgetarium:project-seed" {
	export const packedHash: string;
	export default function unpack(): Promise<string>;
}
