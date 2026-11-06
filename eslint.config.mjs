import widgetarium from "@widgetarium/eslint-plugin";

export default [
	{
		ignores: [
			"**/*.js",
			"**/*.mjs",
			"**/*.cjs",
			"**/node_modules/**",
			"**/dist/**",
			"**/generated/**",
			"tools/**",
			"registry/**",
		],
	},
	...widgetarium.configs.recommended,
];
