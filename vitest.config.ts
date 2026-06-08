import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		setupFiles: ["./src/tests/setup.ts"],
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [
				{
					browser: "chromium",
				},
			],
		},
	},
});
