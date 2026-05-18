/*global Ultraviolet*/
self.__uv$config = {
	prefix: "/service/",
	bare: "/api/bare/",
	encodeUrl: Ultraviolet.codec.xor.encode,
	decodeUrl: Ultraviolet.codec.xor.decode,
	handler: "/uv.handler.js",
	client: "/uv.client.js",
	bundle: "/uv.bundle.js",
	config: "/uv.config.js",
	sw: "/uv.sw.js",
	inject: [
		{
			host: /(^|\.)youtube\.com$/,
			injectTo: "head",
			html: `<script>
				if (window.trustedTypes && window.trustedTypes.createPolicy) {
					try {
						window.trustedTypes.createPolicy("default", {
							createHTML: (string) => string,
							createScriptURL: (string) => string,
							createScript: (string) => string,
						});
					} catch (e) {}
				}
			</script>`,
		},
	],
};
