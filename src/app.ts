import {
    buildSetId,
    calculateWeight,
    formatWeight,
    getDaySetIds,
    isDayComplete,
    parseStoredSetIds,
    parseTrainingMaxFile,
    parseWorkoutProgram,
    type TrainingMax,
    type WorkoutProgram,
} from "./core.js";

const STORAGE_KEY = "checkedSets";

function requiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (element === null) throw new Error(`Missing required element: #${id}`);
    return element as T;
}

async function loadJson(path: string): Promise<unknown> {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
    return response.json() as Promise<unknown>;
}

function formatDate(value: string | undefined): string | null {
    if (value === undefined) return null;
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
    if (match === null) return value;

    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

class FitnessTracker {
    private program: WorkoutProgram | null = null;
    private trainingMaxes: TrainingMax[] = [];
    private completedSetIds = parseStoredSetIds(localStorage.getItem(STORAGE_KEY));
    private activeDayIndex = 0;

    private readonly title = requiredElement<HTMLHeadingElement>("workout-title");
    private readonly status = requiredElement<HTMLParagraphElement>("app-status");
    private readonly clearButton = requiredElement<HTMLButtonElement>("clear-all-btn");
    private readonly tabs = requiredElement<HTMLDivElement>("workout-tabs");
    private readonly workoutList = requiredElement<HTMLDivElement>("workout-list");
    private readonly maxList = requiredElement<HTMLDivElement>("one-rm-list");

    constructor() {
        this.clearButton.addEventListener("click", () => this.clearProgress());
        void this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            const [programData, maxData] = await Promise.all([
                loadJson("/workouts/current.json"),
                loadJson("/workouts/onerepmax.json"),
            ]);

            this.program = parseWorkoutProgram(programData);
            this.trainingMaxes = parseTrainingMaxFile(maxData).exercises;
            this.title.textContent = this.program.title;
            this.clearButton.disabled = false;
            this.status.textContent = "Completion progress is saved only in this browser.";
            this.render();
        } catch (error) {
            const message = error instanceof Error ? error.message : "The workout data could not be loaded.";
            this.status.textContent = message;
            this.status.classList.add("status-error");
            this.workoutList.replaceChildren(this.emptyState("Check that the workout files are present, then reload the page."));
        }
    }

    private saveProgress(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.completedSetIds]));
    }

    private clearProgress(): void {
        if (this.completedSetIds.size === 0) return;
        if (!window.confirm("Reset all completed sets?")) return;

        this.completedSetIds.clear();
        localStorage.removeItem(STORAGE_KEY);
        this.render();
    }

    private render(): void {
        this.renderTabs();
        this.renderWorkoutDay();
        this.renderTrainingMaxes();
    }

    private renderTabs(): void {
        this.tabs.replaceChildren();
        if (this.program === null) return;

        this.program.days.forEach((day, dayIndex) => {
            const complete = isDayComplete(day, dayIndex, this.completedSetIds);
            const wrapper = document.createElement("div");
            wrapper.className = "tab-wrapper";

            const dayToggle = document.createElement("input");
            dayToggle.type = "checkbox";
            dayToggle.className = "day-toggle";
            dayToggle.checked = complete;
            dayToggle.setAttribute("aria-label", `${complete ? "Mark" : "Mark all sets in"} ${day.name} ${complete ? "incomplete" : "complete"}`);
            dayToggle.addEventListener("change", () => this.toggleDay(dayIndex, dayToggle.checked));

            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "tab";
            tab.id = `day-tab-${dayIndex}`;
            tab.setAttribute("role", "tab");
            tab.setAttribute("aria-selected", String(dayIndex === this.activeDayIndex));
            tab.setAttribute("aria-controls", `day-panel-${dayIndex}`);
            tab.textContent = day.name;
            tab.addEventListener("click", () => {
                this.activeDayIndex = dayIndex;
                this.renderTabs();
                this.renderWorkoutDay();
            });

            wrapper.append(dayToggle, tab);
            this.tabs.append(wrapper);
        });
    }

    private toggleDay(dayIndex: number, complete: boolean): void {
        const day = this.program?.days[dayIndex];
        if (day === undefined) return;

        getDaySetIds(day, dayIndex).forEach(id => {
            if (complete) this.completedSetIds.add(id);
            else this.completedSetIds.delete(id);
        });
        this.saveProgress();
        this.renderTabs();
        if (dayIndex === this.activeDayIndex) this.renderWorkoutDay();
    }

    private renderWorkoutDay(): void {
        this.workoutList.replaceChildren();
        const day = this.program?.days[this.activeDayIndex];
        if (day === undefined) return;

        const panel = document.createElement("div");
        panel.className = "workout-grid";
        panel.id = `day-panel-${this.activeDayIndex}`;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", `day-tab-${this.activeDayIndex}`);

        day.workouts.forEach((workout, workoutIndex) => {
            const card = document.createElement("article");
            card.className = "exercise-card";

            const heading = document.createElement("h3");
            heading.textContent = workout.exerciseName;
            card.append(heading);

            const setList = document.createElement("div");
            setList.className = "set-list";
            const trainingMax = this.trainingMaxes.find(item => item.exerciseName.toLowerCase() === workout.exerciseName.toLowerCase());
            let displayedSetNumber = 0;

            workout.sets.forEach((set, setIndex) => {
                if ("section" in set) {
                    const divider = document.createElement("div");
                    divider.className = "section-divider";
                    divider.textContent = set.section;
                    setList.append(divider);
                    return;
                }

                displayedSetNumber += 1;
                const id = buildSetId(this.activeDayIndex, workoutIndex, setIndex);
                const checked = this.completedSetIds.has(id);
                const item = document.createElement("div");
                item.className = `set-item${checked ? " checked" : ""}`;

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "set-checkbox";
                checkbox.id = id;
                checkbox.checked = checked;
                checkbox.addEventListener("change", () => this.toggleSet(id, checkbox.checked));

                const label = document.createElement("label");
                label.className = "set-label";
                label.htmlFor = id;
                label.textContent = this.formatSet(displayedSetNumber, set.reps, set.isAmrap, set.percentage, trainingMax?.weight);

                item.append(checkbox, label);
                setList.append(item);
            });

            card.append(setList);
            panel.append(card);
        });

        this.workoutList.append(panel);
    }

    private formatSet(setNumber: number, reps: number, isAmrap: boolean, percentage: number | undefined, trainingMax: number | undefined): string {
        const repLabel = `${reps}${isAmrap ? "+" : ""} reps`;
        if (percentage === undefined || percentage === 0) return `Set ${setNumber}: ${repLabel}`;
        if (trainingMax === undefined) return `Set ${setNumber}: ${repLabel} @ ${percentage}%`;

        return `Set ${setNumber}: ${repLabel} @ ${formatWeight(calculateWeight(percentage, trainingMax))} lbs`;
    }

    private toggleSet(id: string, complete: boolean): void {
        if (complete) this.completedSetIds.add(id);
        else this.completedSetIds.delete(id);
        this.saveProgress();
        this.renderTabs();
        this.renderWorkoutDay();
    }

    private renderTrainingMaxes(): void {
        this.maxList.replaceChildren();

        this.trainingMaxes.forEach(trainingMax => {
            const card = document.createElement("article");
            card.className = "max-card";

            const exercise = document.createElement("div");
            exercise.className = "max-exercise";
            exercise.textContent = trainingMax.exerciseName;

            const value = document.createElement("div");
            value.className = "max-value";
            value.textContent = `${formatWeight(trainingMax.weight)} lbs`;

            card.append(exercise, value);
            const updated = formatDate(trainingMax.lastUpdated);
            if (updated !== null) {
                const note = document.createElement("div");
                note.className = "max-note";
                note.textContent = `Updated ${updated}`;
                card.append(note);
            }

            this.maxList.append(card);
        });
    }

    private emptyState(message: string): HTMLDivElement {
        const element = document.createElement("div");
        element.className = "empty-state";
        element.textContent = message;
        return element;
    }
}

new FitnessTracker();
