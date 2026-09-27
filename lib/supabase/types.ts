export type Goal = "lose" | "maintain" | "gain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type MealType = "breakfast" | "lunch" | "snacks" | "dinner";

export interface Profile {
  id: string;
  name: string | null;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: Goal | null;
  activity_level: ActivityLevel | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  instructions: string | null;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  date: string;
  name: string;
  duration_min: number | null;
  completed: boolean | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  set_no: number;
  reps: number | null;
  weight_kg: number | null;
  done: boolean | null;
  created_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_desc: string | null;
  serving_grams: number | null;
}

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  food_item_id: string | null;
  custom_name: string | null;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  date: string;
  ml: number;
  created_at: string;
}

export interface Measurement {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  created_at: string;
}

export interface DayTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}
