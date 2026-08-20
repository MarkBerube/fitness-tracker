import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDirectory = path.resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const port = Number.parseInt(process.env.FITNESS_TRACKER_PORT ?? process.env.PORT ?? "3000", 10);
const mimeTypes = new Map([
    [".css", "text/css; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".map", "application/json; charset=utf-8"],
    [".svg", "image/svg+xml"],
    [".txt", "text/plain; charset=utf-8"],
    [".webmanifest", "application/manifest+json"],
]);

const server = createServer(async (request, response) => {
    try {
        const requestUrl = new URL(request.url ?? "/", "http://localhost");
        const requestedPath = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
        const filePath = path.resolve(publicDirectory, `.${requestedPath}`);

        if (!filePath.startsWith(publicDirectory + path.sep)) {
            response.writeHead(403).end("Forbidden");
            return;
        }

        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) throw new Error("Not a file");

        response.writeHead(200, {
            "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        });
        createReadStream(filePath).pipe(response);
    } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    }
});

server.listen(port, "127.0.0.1", () => {
    console.log(`Fitness Tracker is running at http://localhost:${port}`);
});
