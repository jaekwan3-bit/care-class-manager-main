
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ClassSettings {
    id: string;
    className: string;
    capacity: number;
}

export type CriterionType = "avg_stay_time" | "absence_days";

interface ScreeningCriterion {
    id: string;
    type: CriterionType;
    value: number; // minutes for stay time, days for absence
    operator: "greater" | "less";
}

interface AdminStore {
    classSettings: ClassSettings[];
    screeningCriteria: ScreeningCriterion[];
    caregiverStart: string;
    caregiverEnd: string;
    updateCapacity: (className: string, capacity: number) => void;
    updateCaregiverHours: (start: string, end: string) => void;
    getClassCapacity: (className: string) => number;
    // Screening Criteria Methods
    addCriterion: (criterion: Omit<ScreeningCriterion, "id">) => void;
    removeCriterion: (id: string) => void;
    updateCriterion: (id: string, updates: Partial<ScreeningCriterion>) => void;
}

export const useAdminStore = create<AdminStore>()(
    persist(
        (set, get) => ({
            classSettings: [],
            screeningCriteria: [
                { id: "1", type: "avg_stay_time", value: 60, operator: "less" },
                { id: "2", type: "absence_days", value: 3, operator: "greater" }
            ],
            caregiverStart: "13:00",
            caregiverEnd: "18:00",
            updateCapacity: (className, capacity) => {
                set((state) => {
                    const existing = state.classSettings.find((c) => c.className === className);
                    if (existing) {
                        return {
                            classSettings: state.classSettings.map((c) =>
                                c.className === className ? { ...c, capacity } : c
                            ),
                        };
                    }
                    return {
                        classSettings: [...state.classSettings, { id: crypto.randomUUID(), className, capacity }],
                    };
                });
            },
            getClassCapacity: (className) => {
                const found = get().classSettings.find((c) => c.className === className);
                return found ? found.capacity : 20; // Default capacity 20
            },
            updateCaregiverHours: (start, end) => {
                set({ caregiverStart: start, caregiverEnd: end });
            },
            addCriterion: (criterion) => {
                set((state) => ({
                    screeningCriteria: [...state.screeningCriteria, { ...criterion, id: crypto.randomUUID() }]
                }));
            },
            removeCriterion: (id) => {
                set((state) => ({
                    screeningCriteria: state.screeningCriteria.filter(c => c.id !== id)
                }));
            },
            updateCriterion: (id, updates) => {
                set((state) => ({
                    screeningCriteria: state.screeningCriteria.map(c => c.id === id ? { ...c, ...updates } : c)
                }));
            },
        }),
        {
            name: "admin-settings",
        }
    )
);
