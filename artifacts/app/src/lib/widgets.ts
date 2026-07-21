const WIDGETS_KEY = "unstable-widgets";

export type WidgetType = "clock" | "date" | "greeting" | "quote" | "branding" | "recent-history" | "bookmarks-bar";

export interface WidgetConfig {
  enabled: WidgetType[];
}

export const DEFAULT_WIDGETS: WidgetType[] = ["clock"];

export function loadWidgetConfig(): WidgetConfig {
  try {
    const raw = localStorage.getItem(WIDGETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetConfig;
      if (Array.isArray(parsed.enabled)) return parsed;
    }
  } catch { /* ignore */ }
  return { enabled: [...DEFAULT_WIDGETS] };
}

export function saveWidgetConfig(config: WidgetConfig): void {
  localStorage.setItem(WIDGETS_KEY, JSON.stringify(config));
}

export function toggleWidget(config: WidgetConfig, type: WidgetType): WidgetConfig {
  const was = config.enabled.includes(type);
  return {
    enabled: was
      ? config.enabled.filter(t => t !== type)
      : [...config.enabled, type],
  };
}

export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "The purpose of our lives is to be happy.", author: "Dalai Lama" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "Get busy living or get busy dying.", author: "Stephen King" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
];

const GREETINGS_MORNING = ["Good morning", "Morning", "Rise and shine", "Hey, good morning"];
const GREETINGS_AFTERNOON = ["Good afternoon", "Afternoon", "Hey there", "Hello"];
const GREETINGS_EVENING = ["Good evening", "Evening", "Hey, good evening", "Hello"];

export function getGreeting(): string {
  const h = new Date().getHours();
  const pool = h < 12 ? GREETINGS_MORNING : h < 17 ? GREETINGS_AFTERNOON : GREETINGS_EVENING;
  return pool[Math.floor(Math.random() * pool.length)];
}
