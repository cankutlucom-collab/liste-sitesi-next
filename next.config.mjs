import { fileURLToPath } from "node:url";
export default { experimental: { cpus: 1 }, distDir: process.env.LISTE_BUILD_DIR || ".next", turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) } };


