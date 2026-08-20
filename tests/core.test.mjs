import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    calculateWeight,
    formatWeight,
    getDaySetIds,
    isDayComplete,
    parseStoredSetIds,
    parseTrainingMaxFile,
    parseWorkoutProgram,
} from "../public/assets/core.js";

test("calculates and formats quarter-pound increments", () => {
    assert.equal(calculateWeight(65, 125), 81.25);
    assert.equal(calculateWeight(75, 160), 120);
    assert.equal(formatWeight(81.25), "81.25");
    assert.equal(formatWeight(120), "120");
});

test("handles invalid weight calculation inputs", () => {
    assert.equal(calculateWeight(0, 200), 0);
    assert.equal(calculateWeight(75, Number.NaN), 0);
});

test("parses saved set ids defensively", () => {
    assert.deepEqual([...parseStoredSetIds('["set-1", 3, "set-2"]')], ["set-1", "set-2"]);
    assert.equal(parseStoredSetIds("not json").size, 0);
    assert.equal(parseStoredSetIds(null).size, 0);
});

test("tracks whole-day completion without counting section markers", () => {
    const day = {
        name: "Day 1",
        workouts: [{
            exerciseName: "Squat",
            sets: [
                { reps: 5, isAmrap: false, percentage: 75 },
                { section: "Back-off" },
                { reps: 8, isAmrap: true, percentage: 60 },
            ],
        }],
    };
    const ids = getDaySetIds(day, 0);

    assert.equal(ids.length, 2);
    assert.equal(isDayComplete(day, 0, new Set(ids)), true);
    assert.equal(isDayComplete(day, 0, new Set(ids.slice(0, 1))), false);
});

test("accepts the checked-in workout data", async () => {
    const [programText, maxText] = await Promise.all([
        readFile(new URL("../workouts/current.json", import.meta.url), "utf8"),
        readFile(new URL("../workouts/onerepmax.json", import.meta.url), "utf8"),
    ]);

    const program = parseWorkoutProgram(JSON.parse(programText));
    const maxes = parseTrainingMaxFile(JSON.parse(maxText));

    assert.ok(program.days.length > 0);
    assert.ok(maxes.exercises.length > 0);
});
