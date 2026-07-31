import { access, copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const clientRoot = join(projectRoot, "dist/client");
const serverRoot = join(projectRoot, "dist/server");

await access(join(clientRoot, "index.html"));
await mkdir(serverRoot, { recursive: true });
await copyFile(
  join(projectRoot, "worker/index.js"),
  join(serverRoot, "index.js"),
);
