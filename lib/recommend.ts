import type { Goal, MealType } from "./supabase/types";

/* ================= WORKOUT PLANS ================= */

export type PlanLevel = "beginner" | "intermediate" | "advanced";
export type GymMode = "gym" | "home";

export interface PlanExercise {
  name: string;
  sets: number;
  reps: string;
  note?: string;
}

export interface PlanDay {
  day: string;
  title: string;
  focus: string;
  exercises: PlanExercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  tagline: string;
  daysPerWeek: number;
  days: PlanDay[];
}

const GYM_GAIN_BEGINNER: WorkoutPlan = {
  id: "gain-beg-gym",
  name: "Foundation Builder",
  tagline: "4-day upper / lower split for new lifters chasing size.",
  daysPerWeek: 4,
  days: [
    {
      day: "Mon", title: "Upper A — Push Focus", focus: "Chest · Shoulders · Triceps",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: "8-10" },
        { name: "Overhead Press", sets: 3, reps: "8-10" },
        { name: "Incline Dumbbell Press", sets: 3, reps: "10-12" },
        { name: "Lateral Raise", sets: 3, reps: "12-15" },
        { name: "Tricep Pushdown", sets: 3, reps: "10-12" },
      ],
    },
    {
      day: "Tue", title: "Lower A — Quad Focus", focus: "Quads · Glutes · Calves",
      exercises: [
        { name: "Barbell Squat", sets: 4, reps: "8-10" },
        { name: "Romanian Deadlift", sets: 3, reps: "10-12" },
        { name: "Leg Press", sets: 3, reps: "10-12" },
        { name: "Walking Lunge", sets: 3, reps: "12 each" },
        { name: "Standing Calf Raise", sets: 4, reps: "12-15" },
      ],
    },
    {
      day: "Thu", title: "Upper B — Pull Focus", focus: "Back · Biceps · Rear Delts",
      exercises: [
        { name: "Deadlift", sets: 4, reps: "6-8" },
        { name: "Pull-Up", sets: 3, reps: "AMRAP" },
        { name: "Barbell Row", sets: 3, reps: "8-10" },
        { name: "Face Pull", sets: 3, reps: "12-15" },
        { name: "Barbell Curl", sets: 3, reps: "10-12" },
      ],
    },
    {
      day: "Fri", title: "Lower B — Hamstring Focus", focus: "Hamstrings · Glutes · Core",
      exercises: [
        { name: "Front Squat", sets: 3, reps: "8-10" },
        { name: "Romanian Deadlift", sets: 4, reps: "8-10" },
        { name: "Bulgarian Split Squat", sets: 3, reps: "10 each" },
        { name: "Leg Curl", sets: 3, reps: "12-15" },
        { name: "Hanging Knee Raise", sets: 3, reps: "12-15" },
      ],
    },
  ],
};

const GYM_GAIN_ADV: WorkoutPlan = {
  id: "gain-adv-gym",
  name: "Hypertrophy PPL",
  tagline: "6-day push / pull / legs for serious muscle.",
  daysPerWeek: 6,
  days: [
    {
      day: "Mon", title: "Push — Heavy", focus: "Chest · Shoulders · Triceps",
      exercises: [
        { name: "Barbell Bench Press", sets: 5, reps: "5-8" },
        { name: "Overhead Press", sets: 4, reps: "6-8" },
        { name: "Incline Dumbbell Press", sets: 4, reps: "8-12" },
        { name: "Dips", sets: 3, reps: "AMRAP" },
        { name: "Lateral Raise", sets: 4, reps: "12-15" },
        { name: "Overhead Tricep Extension", sets: 3, reps: "10-12" },
      ],
    },
    {
      day: "Tue", title: "Pull — Heavy", focus: "Back · Biceps",
      exercises: [
        { name: "Deadlift", sets: 5, reps: "5" },
        { name: "Weighted Pull-Up", sets: 4, reps: "6-8" },
        { name: "Barbell Row", sets: 4, reps: "8-10" },
        { name: "Lat Pulldown", sets: 3, reps: "10-12" },
        { name: "Face Pull", sets: 3, reps: "15" },
        { name: "Hammer Curl", sets: 3, reps: "10-12" },
      ],
    },
    {
      day: "Wed", title: "Legs — Heavy", focus: "Quads · Hamstrings · Calves",
      exercises: [
        { name: "Barbell Squat", sets: 5, reps: "5-8" },
        { name: "Romanian Deadlift", sets: 4, reps: "8-10" },
        { name: "Leg Press", sets: 4, reps: "10-12" },
        { name: "Leg Curl", sets: 3, reps: "12-15" },
        { name: "Standing Calf Raise", sets: 5, reps: "12-15" },
      ],
    },
    {
      day: "Thu", title: "Push — Volume", focus: "Chest · Shoulders · Triceps",
      exercises: [
        { name: "Incline Dumbbell Press", sets: 4, reps: "10-12" },
        { name: "Machine Chest Press", sets: 3, reps: "12-15" },
        { name: "Arnold Press", sets: 3, reps: "10-12" },
        { name: "Cable Fly", sets: 3, reps: "12-15" },
        { name: "Tricep Pushdown", sets: 4, reps: "10-12" },
      ],
    },
    {
      day: "Fri", title: "Pull — Volume", focus: "Back · Biceps · Rear Delts",
      exercises: [
        { name: "Pull-Up", sets: 4, reps: "AMRAP" },
        { name: "Seated Cable Row", sets: 4, reps: "10-12" },
        { name: "Straight Arm Pulldown", sets: 3, reps: "12-15" },
        { name: "Reverse Fly", sets: 3, reps: "15" },
        { name: "Barbell Curl", sets: 4, reps: "10-12" },
      ],
    },
    {
      day: "Sat", title: "Legs — Volume", focus: "Glutes · Quads · Core",
      exercises: [
        { name: "Front Squat", sets: 4, reps: "8-10" },
        { name: "Bulgarian Split Squat", sets: 3, reps: "10 each" },
        { name: "Hip Thrust", sets: 4, reps: "10-12" },
        { name: "Walking Lunge", sets: 3, reps: "12 each" },
        { name: "Plank", sets: 3, reps: "60s" },
      ],
    },
  ],
};

const GYM_LOSE: WorkoutPlan = {
  id: "lose-gym",
  name: "Lean & Burn",
  tagline: "5-day full-body circuits to torch fat and keep muscle.",
  daysPerWeek: 5,
  days: [
    {
      day: "Mon", title: "Full Body A", focus: "Strength circuit",
      exercises: [
        { name: "Barbell Squat", sets: 4, reps: "10-12" },
        { name: "Push-Up", sets: 3, reps: "AMRAP" },
        { name: "Barbell Row", sets: 3, reps: "10-12" },
        { name: "Dumbbell Shoulder Press", sets: 3, reps: "12" },
        { name: "Plank", sets: 3, reps: "45s" },
      ],
    },
    {
      day: "Tue", title: "HIIT + Core", focus: "Conditioning",
      exercises: [
        { name: "Burpees", sets: 4, reps: "30s on / 30s off" },
        { name: "Mountain Climbers", sets: 4, reps: "30s on / 30s off" },
        { name: "Kettlebell Swing", sets: 4, reps: "15" },
        { name: "Bicycle Crunch", sets: 3, reps: "20" },
        { name: "Jump Squats", sets: 3, reps: "15" },
      ],
    },
    {
      day: "Thu", title: "Full Body B", focus: "Strength circuit",
      exercises: [
        { name: "Deadlift", sets: 4, reps: "8-10" },
        { name: "Incline Dumbbell Press", sets: 3, reps: "10-12" },
        { name: "Lat Pulldown", sets: 3, reps: "12" },
        { name: "Walking Lunge", sets: 3, reps: "12 each" },
        { name: "Hanging Knee Raise", sets: 3, reps: "12" },
      ],
    },
    {
      day: "Fri", title: "HIIT + Glutes", focus: "Conditioning",
      exercises: [
        { name: "Box Jumps", sets: 4, reps: "10" },
        { name: "Battle Ropes", sets: 4, reps: "30s" },
        { name: "Hip Thrust", sets: 4, reps: "12-15" },
        { name: "Russian Twist", sets: 3, reps: "20" },
        { name: "Skipping", sets: 3, reps: "60s" },
      ],
    },
    {
      day: "Sat", title: "Full Body C", focus: "Pump & burn",
      exercises: [
        { name: "Leg Press", sets: 3, reps: "15" },
        { name: "Machine Chest Press", sets: 3, reps: "12-15" },
        { name: "Seated Cable Row", sets: 3, reps: "12-15" },
        { name: "Lateral Raise", sets: 3, reps: "15" },
        { name: "Cable Crunch", sets: 3, reps: "15" },
      ],
    },
  ],
};

const GYM_MAINTAIN: WorkoutPlan = {
  id: "maintain-gym",
  name: "Balanced Athlete",
  tagline: "4-day balanced split to stay strong and athletic.",
  daysPerWeek: 4,
  days: [
    {
      day: "Mon", title: "Push", focus: "Chest · Shoulders · Triceps",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: "8-10" },
        { name: "Overhead Press", sets: 3, reps: "8-10" },
        { name: "Dips", sets: 3, reps: "AMRAP" },
        { name: "Lateral Raise", sets: 3, reps: "12-15" },
      ],
    },
    {
      day: "Tue", title: "Pull", focus: "Back · Biceps",
      exercises: [
        { name: "Deadlift", sets: 4, reps: "6-8" },
        { name: "Pull-Up", sets: 3, reps: "AMRAP" },
        { name: "Barbell Row", sets: 3, reps: "10" },
        { name: "Hammer Curl", sets: 3, reps: "12" },
      ],
    },
    {
      day: "Thu", title: "Legs", focus: "Quads · Hamstrings · Calves",
      exercises: [
        { name: "Barbell Squat", sets: 4, reps: "8-10" },
        { name: "Romanian Deadlift", sets: 3, reps: "10-12" },
        { name: "Walking Lunge", sets: 3, reps: "12 each" },
        { name: "Standing Calf Raise", sets: 4, reps: "15" },
      ],
    },
    {
      day: "Sat", title: "Athletic", focus: "Conditioning · Core",
      exercises: [
        { name: "Kettlebell Swing", sets: 4, reps: "15" },
        { name: "Push-Up", sets: 3, reps: "AMRAP" },
        { name: "Farmer's Carry", sets: 3, reps: "40m" },
        { name: "Plank", sets: 3, reps: "60s" },
      ],
    },
  ],
};

const HOME_PLAN: WorkoutPlan = {
  id: "home",
  name: "Home Warrior",
  tagline: "Dumbbell + bodyweight plan. No gym needed.",
  daysPerWeek: 4,
  days: [
    {
      day: "Mon", title: "Upper Body", focus: "Chest · Shoulders · Arms",
      exercises: [
        { name: "Push-Up", sets: 4, reps: "AMRAP" },
        { name: "Dumbbell Shoulder Press", sets: 3, reps: "10-12" },
        { name: "Dumbbell Floor Press", sets: 3, reps: "10-12" },
        { name: "Lateral Raise", sets: 3, reps: "12-15" },
        { name: "Dumbbell Curl", sets: 3, reps: "12" },
      ],
    },
    {
      day: "Tue", title: "Lower Body", focus: "Legs · Glutes",
      exercises: [
        { name: "Goblet Squat", sets: 4, reps: "12-15" },
        { name: "Dumbbell Romanian Deadlift", sets: 3, reps: "12" },
        { name: "Bulgarian Split Squat", sets: 3, reps: "10 each" },
        { name: "Glute Bridge", sets: 3, reps: "15" },
        { name: "Standing Calf Raise", sets: 4, reps: "15" },
      ],
    },
    {
      day: "Thu", title: "Back & Core", focus: "Back · Abs",
      exercises: [
        { name: "Dumbbell Row", sets: 4, reps: "10-12 each" },
        { name: "Reverse Fly", sets: 3, reps: "12-15" },
        { name: "Superman Hold", sets: 3, reps: "30s" },
        { name: "Bicycle Crunch", sets: 3, reps: "20" },
        { name: "Plank", sets: 3, reps: "45s" },
      ],
    },
    {
      day: "Sat", title: "HIIT Burn", focus: "Full-body conditioning",
      exercises: [
        { name: "Burpees", sets: 4, reps: "30s on / 30s off" },
        { name: "Jump Squats", sets: 3, reps: "15" },
        { name: "Mountain Climbers", sets: 3, reps: "30s" },
        { name: "Skipping", sets: 3, reps: "60s" },
      ],
    },
  ],
};

export function getWorkoutPlan(goal: Goal | null, level: PlanLevel, mode: GymMode): WorkoutPlan {
  if (mode === "home") return HOME_PLAN;
  if (goal === "lose") return GYM_LOSE;
  if (goal === "gain") return level === "beginner" ? GYM_GAIN_BEGINNER : GYM_GAIN_ADV;
  return GYM_MAINTAIN;
}

export function todaysPlanDay(plan: WorkoutPlan): PlanDay | null {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = names[new Date().getDay()];
  return plan.days.find((d) => d.day === today) ?? null;
}

/* ================= DIET PLANS ================= */

export interface MealSuggestion {
  name: string;
  grams: number;
  veg: boolean;
  /** fallback macros per 100g, used when the food isn't in the DB */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  why: string;
}

export interface DietPlan {
  breakfast: MealSuggestion[];
  lunch: MealSuggestion[];
  snacks: MealSuggestion[];
  dinner: MealSuggestion[];
}

const BREAKFASTS: MealSuggestion[] = [
  { name: "Boiled Eggs", grams: 100, veg: false, kcal: 155, protein: 13, carbs: 1.1, fat: 11, why: "Complete protein to start the day" },
  { name: "Whole Wheat Bread", grams: 60, veg: true, kcal: 247, protein: 13, carbs: 41, fat: 4.2, why: "Slow-release energy" },
  { name: "Oats", grams: 60, veg: true, kcal: 389, protein: 17, carbs: 66, fat: 7, why: "Fibre-rich, keeps you full" },
  { name: "Milk", grams: 250, veg: true, kcal: 42, protein: 3.4, carbs: 5, fat: 1, why: "Calcium + protein" },
  { name: "Peanut Butter", grams: 20, veg: true, kcal: 588, protein: 25, carbs: 20, fat: 50, why: "Healthy fats, big satiety" },
  { name: "Banana", grams: 120, veg: true, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, why: "Quick natural energy" },
  { name: "Masala Omelette", grams: 120, veg: false, kcal: 160, protein: 11, carbs: 2, fat: 12, why: "Protein-packed desi classic" },
  { name: "Idli", grams: 160, veg: true, kcal: 145, protein: 4.5, carbs: 30, fat: 0.5, why: "Light, steamed, easy to digest" },
  { name: "Vegetable Upma", grams: 200, veg: true, kcal: 130, protein: 3.5, carbs: 24, fat: 2.5, why: "Wholesome semolina breakfast" },
  { name: "Paneer Bhurji", grams: 120, veg: true, kcal: 145, protein: 12, carbs: 4, fat: 10, why: "High-protein veggie option" },
  { name: "Moong Dal Chilla", grams: 150, veg: true, kcal: 120, protein: 8, carbs: 16, fat: 2, why: "Lentil power, low oil" },
  { name: "Poha", grams: 180, veg: true, kcal: 130, protein: 2.5, carbs: 27, fat: 1.5, why: "Light Maharashtrian staple" },
  { name: "Greek Yogurt", grams: 150, veg: true, kcal: 97, protein: 9, carbs: 4, fat: 5, why: "Thick, creamy, protein-dense" },
  { name: "Sprouted Moong", grams: 100, veg: true, kcal: 105, protein: 7, carbs: 19, fat: 0.5, why: "Live enzymes + protein" },
];

const LUNCHES: MealSuggestion[] = [
  { name: "Cooked White Rice", grams: 200, veg: true, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, why: "The base of the plate" },
  { name: "Dal Tadka", grams: 150, veg: true, kcal: 115, protein: 7, carbs: 17, fat: 2.5, why: "Lentil protein + comfort" },
  { name: "Grilled Chicken Breast", grams: 120, veg: false, kcal: 165, protein: 31, carbs: 0, fat: 3.6, why: "Leanest protein source" },
  { name: "Paneer Butter Masala", grams: 120, veg: true, kcal: 180, protein: 9, carbs: 6, fat: 15, why: "Cottage-cheese indulgence" },
  { name: "Roti (Whole Wheat)", grams: 80, veg: true, kcal: 265, protein: 9, carbs: 55, fat: 2, why: "Fibre-rich staple" },
  { name: "Rajma Curry", grams: 150, veg: true, kcal: 120, protein: 7, carbs: 20, fat: 1.5, why: "Beans = protein + fibre" },
  { name: "Fish Curry", grams: 150, veg: false, kcal: 110, protein: 16, carbs: 3, fat: 4, why: "Omega-3 rich protein" },
  { name: "Chicken Biryani", grams: 250, veg: false, kcal: 165, protein: 8, carbs: 22, fat: 5, why: "Weekend-worthy fuel" },
  { name: "Palak Paneer", grams: 150, veg: true, kcal: 120, protein: 8, carbs: 5, fat: 9, why: "Iron + protein combo" },
  { name: "Egg Curry", grams: 150, veg: false, kcal: 140, protein: 9, carbs: 4, fat: 10, why: "Budget protein hero" },
  { name: "Chole Masala", grams: 150, veg: true, kcal: 130, protein: 7, carbs: 20, fat: 2.5, why: "Chickpea powerhouse" },
  { name: "Curd", grams: 100, veg: true, kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, why: "Probiotics for gut health" },
];

const SNACKS: MealSuggestion[] = [
  { name: "Roasted Peanuts", grams: 30, veg: true, kcal: 567, protein: 26, carbs: 16, fat: 49, why: "Crunchy healthy fats" },
  { name: "Boiled Eggs", grams: 100, veg: false, kcal: 155, protein: 13, carbs: 1.1, fat: 11, why: "Portable protein" },
  { name: "Fruit Bowl", grams: 200, veg: true, kcal: 60, protein: 0.8, carbs: 15, fat: 0.2, why: "Vitamins + hydration" },
  { name: "Roasted Makhana", grams: 30, veg: true, kcal: 350, protein: 9, carbs: 77, fat: 0.5, why: "Light, munchable, low-fat" },
  { name: "Protein Shake", grams: 40, veg: true, kcal: 400, protein: 80, carbs: 8, fat: 6, why: "Fastest protein top-up" },
  { name: "Sprouted Moong", grams: 100, veg: true, kcal: 105, protein: 7, carbs: 19, fat: 0.5, why: "Fresh crunchy protein" },
  { name: "Buttermilk", grams: 250, veg: true, kcal: 40, protein: 3, carbs: 5, fat: 1, why: "Cooling + light protein" },
];

const DINNERS: MealSuggestion[] = [
  { name: "Grilled Chicken Breast", grams: 150, veg: false, kcal: 165, protein: 31, carbs: 0, fat: 3.6, why: "High protein, light night meal" },
  { name: "Paneer Tikka", grams: 120, veg: true, kcal: 150, protein: 13, carbs: 4, fat: 10, why: "Smoky high-protein veg" },
  { name: "Dal Tadka", grams: 150, veg: true, kcal: 115, protein: 7, carbs: 17, fat: 2.5, why: "Light lentil dinner" },
  { name: "Roti (Whole Wheat)", grams: 60, veg: true, kcal: 265, protein: 9, carbs: 55, fat: 2, why: "Keep carbs lighter at night" },
  { name: "Fish Curry", grams: 150, veg: false, kcal: 110, protein: 16, carbs: 3, fat: 4, why: "Light, digestible protein" },
  { name: "Chicken Curry (Home-style)", grams: 150, veg: false, kcal: 150, protein: 18, carbs: 4, fat: 7, why: "Comforting lean protein" },
  { name: "Vegetable Khichdi", grams: 250, veg: true, kcal: 110, protein: 4, carbs: 20, fat: 2, why: "One-pot gentle dinner" },
  { name: "Egg Bhurji", grams: 120, veg: false, kcal: 150, protein: 10, carbs: 3, fat: 11, why: "Quick night protein" },
  { name: "Soya Chunk Curry", grams: 120, veg: true, kcal: 140, protein: 16, carbs: 10, fat: 1, why: "Veg protein champion" },
];

function pick<T>(arr: T[], n: number, vegOnly: boolean, isVeg: (t: T) => boolean): T[] {
  const pool = vegOnly ? arr.filter(isVeg) : [...arr];
  const out: T[] = [];
  const used = new Set<number>();
  let i = 0;
  while (out.length < Math.min(n, pool.length) && i < pool.length * 3) {
    const idx = (i * 7 + 3) % pool.length; // deterministic spread
    if (!used.has(idx)) {
      used.add(idx);
      out.push(pool[idx]);
    }
    i++;
  }
  return out;
}

/** Scale a suggestion's grams so the whole plan roughly matches the calorie target. */
function scalePlan(plan: DietPlan, targetKcal: number): DietPlan {
  const total = (list: MealSuggestion[]) =>
    list.reduce((a, m) => a + (m.kcal * m.grams) / 100, 0);
  const current = total(plan.breakfast) + total(plan.lunch) + total(plan.snacks) + total(plan.dinner);
  if (!current) return plan;
  const factor = Math.min(1.8, Math.max(0.6, targetKcal / current));
  const scale = (list: MealSuggestion[]) =>
    list.map((m) => ({ ...m, grams: Math.round(m.grams * factor / 5) * 5 }));
  return { breakfast: scale(plan.breakfast), lunch: scale(plan.lunch), snacks: scale(plan.snacks), dinner: scale(plan.dinner) };
}

export function getDietPlan(targetKcal: number, vegOnly: boolean): DietPlan {
  const isVeg = (m: MealSuggestion) => m.veg;
  // Breakfast: protein anchor + carb base + fruit/dairy
  const breakfast = [
    ...pick(BREAKFASTS.filter((b) => !b.veg || b.name === "Paneer Bhurji" || b.name === "Moong Dal Chilla"), 1, vegOnly, isVeg),
    ...pick(BREAKFASTS.filter((b) => b.veg), 2, vegOnly, isVeg),
  ].slice(0, 3);
  const plan: DietPlan = {
    breakfast,
    lunch: pick(LUNCHES, 3, vegOnly, isVeg),
    snacks: pick(SNACKS, 2, vegOnly, isVeg),
    dinner: pick(DINNERS, 3, vegOnly, isVeg),
  };
  return scalePlan(plan, targetKcal);
}

/** Spotlight picks for the breakfast recommender section. */
export function getBreakfastSpotlight(vegOnly: boolean): MealSuggestion[] {
  const pool = vegOnly ? BREAKFASTS.filter((b) => b.veg) : BREAKFASTS;
  // protein-first ordering: eggs / paneer / chilla / oats...
  const order = ["Boiled Eggs", "Masala Omelette", "Paneer Bhurji", "Moong Dal Chilla", "Oats", "Sprouted Moong", "Whole Wheat Bread", "Peanut Butter", "Milk", "Banana", "Vegetable Upma", "Idli", "Poha", "Greek Yogurt"];
  return [...pool].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)).slice(0, 8);
}

export function mealMacros(m: MealSuggestion) {
  const f = m.grams / 100;
  return {
    kcal: Math.round(m.kcal * f),
    protein: Math.round(m.protein * f * 10) / 10,
    carbs: Math.round(m.carbs * f * 10) / 10,
    fat: Math.round(m.fat * f * 10) / 10,
  };
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

export const MEDICAL_DISCLAIMER =
  "General guidance only — not medical advice. If you have a health condition, check with a professional before changing training or diet.";

export const GOAL_LABELS: Record<string, string> = {
  lose: "Lose fat",
  maintain: "Stay fit",
  gain: "Build muscle",
};

/**
 * Estimate weeks to go from `fromKg` to `toKg` at a steady, sustainable pace
 * (roughly 0.5–0.75% of bodyweight per week, clamped to a sensible band).
 * Returns null when the goal direction is unclear. General guidance only.
 */
export function projectWeeks(fromKg: number, toKg: number, goal: string): { weeks: number; label: string } | null {
  if (!fromKg || !toKg || fromKg === toKg) return null;
  const losing = toKg < fromKg;
  if ((goal === "lose") === !losing && goal !== "maintain") return null;
  if (goal === "gain" && losing) return null;
  if (goal === "lose" && !losing) return null;
  const delta = Math.abs(toKg - fromKg);
  const weekly = Math.min(1, Math.max(0.4, fromKg * 0.006)); // kg per week
  const weeks = Math.max(2, Math.ceil(delta / weekly));
  const label = losing
    ? `~${weeks} weeks to ${toKg} kg at a steady fat-loss pace`
    : `~${weeks} weeks to ${toKg} kg at a lean-gain pace`;
  return { weeks, label };
}
