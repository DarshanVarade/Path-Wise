import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_admin: boolean;
  goal?: string;
  preferences?: any;
  created_at: string;
  updated_at: string;
}

export interface Roadmap {
  id: string;
  user_id: string;
  title: string;
  goal: string;
  weeks: any[];
  questions?: any;
  answers?: any;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  roadmap_id: string;
  week_number: number;
  title: string;
  lesson_objective: string;
  estimated_time: string;
  content?: any;
  order_index: number;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  roadmap_id: string;
  total_lessons: number;
  completed_lessons: number;
  total_time_spent: number;
  average_accuracy: number;
  current_week: number;
  updated_at: string;
}

export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  score?: number;
  time_spent?: number;
  answers?: any;
  completed_at: string;
}