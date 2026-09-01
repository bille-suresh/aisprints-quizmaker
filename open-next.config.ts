import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
	...defineCloudflareConfig(),
	// OpenNext invokes this instead of `npm run build` to avoid a recursive loop.
	buildCommand: "npm run build:next",
};
