export interface WorkoutSet {
    reps: number;
    isAmrap: boolean;
    percentage?: number;
}

export interface SectionMarker {
    section: string;
}

export type ProgramSet = WorkoutSet | SectionMarker;

export interface WorkoutExercise {
    exerciseName: string;
    sets: ProgramSet[];
}

export interface WorkoutDay {
    name: string;
    workouts: WorkoutExercise[];
}

export interface WorkoutProgram {
    title: string;
    days: WorkoutDay[];
}

export interface TrainingMax {
    exerciseName: string;
    weight: number;
    lastUpdated?: string;
}

export interface TrainingMaxFile {
    exercises: TrainingMax[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function isWorkoutSet(value: unknown): value is WorkoutSet {
    if (!isRecord(value)) return false;

    const percentage = value.percentage;
    return Number.isInteger(value.reps)
        && Number(value.reps) > 0
        && Number(value.reps) <= 100
        && typeof value.isAmrap === "boolean"
        && (percentage === undefined
            || (typeof percentage === "number" && Number.isFinite(percentage) && percentage >= 0 && percentage <= 150));
}

function isSectionMarker(value: unknown): value is SectionMarker {
    return isRecord(value) && typeof value.section === "string";
}

function isWorkoutExercise(value: unknown): value is WorkoutExercise {
    return isRecord(value)
        && isNonEmptyString(value.exerciseName)
        && Array.isArray(value.sets)
        && value.sets.every(set => isWorkoutSet(set) || isSectionMarker(set));
}

function isWorkoutDay(value: unknown): value is WorkoutDay {
    return isRecord(value)
        && isNonEmptyString(value.name)
        && Array.isArray(value.workouts)
        && value.workouts.every(isWorkoutExercise);
}

export function parseWorkoutProgram(value: unknown): WorkoutProgram {
    if (!isRecord(value)
        || !isNonEmptyString(value.title)
        || !Array.isArray(value.days)
        || value.days.length === 0
        || !value.days.every(isWorkoutDay)) {
        throw new Error("Workout program data is invalid.");
    }

    return value as unknown as WorkoutProgram;
}

function isTrainingMax(value: unknown): value is TrainingMax {
    if (!isRecord(value)) return false;

    return isNonEmptyString(value.exerciseName)
        && typeof value.weight === "number"
        && Number.isFinite(value.weight)
        && value.weight > 0
        && value.weight <= 2000
        && (value.lastUpdated === undefined || isNonEmptyString(value.lastUpdated));
}

export function parseTrainingMaxFile(value: unknown): TrainingMaxFile {
    if (!isRecord(value)
        || !Array.isArray(value.exercises)
        || !value.exercises.every(isTrainingMax)) {
        throw new Error("Training max data is invalid.");
    }

    return value as unknown as TrainingMaxFile;
}

export function calculateWeight(percentage: number, trainingMax: number): number {
    if (!Number.isFinite(percentage) || !Number.isFinite(trainingMax) || percentage <= 0 || trainingMax <= 0) {
        return 0;
    }

    return Math.round((percentage / 100) * trainingMax * 4) / 4;
}

export function formatWeight(weight: number): string {
    return Number.isInteger(weight) ? String(weight) : weight.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function buildSetId(dayIndex: number, workoutIndex: number, setIndex: number): string {
    return `day${dayIndex}-workout${workoutIndex}-set${setIndex}`;
}

export function parseStoredSetIds(serialized: string | null): Set<string> {
    if (serialized === null) return new Set();

    try {
        const value: unknown = JSON.parse(serialized);
        if (!Array.isArray(value)) return new Set();
        return new Set(value.filter((item): item is string => typeof item === "string"));
    } catch {
        return new Set();
    }
}

export function getDaySetIds(day: WorkoutDay, dayIndex: number): string[] {
    const ids: string[] = [];

    day.workouts.forEach((workout, workoutIndex) => {
        workout.sets.forEach((set, setIndex) => {
            if ("reps" in set) ids.push(buildSetId(dayIndex, workoutIndex, setIndex));
        });
    });

    return ids;
}

export function isDayComplete(day: WorkoutDay, dayIndex: number, completedSetIds: ReadonlySet<string>): boolean {
    const ids = getDaySetIds(day, dayIndex);
    return ids.length > 0 && ids.every(id => completedSetIds.has(id));
}
