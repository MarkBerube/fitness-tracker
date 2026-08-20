import { copyFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceDirectory = path.join(projectRoot, "workouts");
const destinationDirectory = path.join(projectRoot, "public", "workouts");

if (!destinationDirectory.startsWith(path.join(projectRoot, "public") + path.sep)) {
    throw new Error("Workout destination escaped the public output directory.");
}

await mkdir(destinationDirectory, { recursive: true });
const entries = await readdir(sourceDirectory, { withFileTypes: true });
const files = entries.filter(entry => entry.isFile());

await Promise.all(files.map(entry => copyFile(
    path.join(sourceDirectory, entry.name),
    path.join(destinationDirectory, entry.name),
)));

console.log(`Copied ${files.length} workout files into the static output.`);
