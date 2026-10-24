import widgetarium from "@widgetarium/eslint-plugin";

export default [{ ignores: ["dist/**", "**/generated/**", "vendor/**"] }, ...widgetarium.configs.recommended];
