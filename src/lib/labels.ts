import type { DerivedTag } from '../core/diet';
import type { Activity, Category, Diet, Exclusion, Goal, MealType, Micro, Unit } from '../core/types';

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

export const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
export const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const TAG_LABEL: Record<DerivedTag, string> = {
  vegan: 'Веган',
  vegetarian: 'Вегетарианское',
  'gluten-free': 'Без глютена',
  'dairy-free': 'Без молочного',
};

export const DIET_LABEL: Record<Diet, string> = {
  omnivore: 'Ем всё',
  pescatarian: 'Без мяса, но с рыбой',
  vegetarian: 'Вегетарианство',
  vegan: 'Веганство',
};

export const EXCLUSION_LABEL: Record<Exclusion, string> = {
  gluten: 'Глютен',
  dairy: 'Молочное',
  egg: 'Яйца',
  nuts: 'Орехи',
  peanut: 'Арахис',
  fish: 'Рыба',
  shellfish: 'Морепродукты',
  soy: 'Соя',
  sesame: 'Кунжут',
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: 'Сидячая работа, почти без тренировок',
  light: 'Лёгкая: 1–3 тренировки в неделю',
  moderate: 'Средняя: 3–5 тренировок в неделю',
  high: 'Высокая: 6–7 тренировок в неделю',
  athlete: 'Очень высокая: спорт или тяжёлый физический труд',
};

export const GOAL_LABEL: Record<Goal, string> = {
  lose: 'Снизить вес',
  maintain: 'Держать вес',
  gain: 'Набрать вес',
};

export const CATEGORY_NAME: Record<Category, string> = {
  produce: 'Овощи, фрукты, зелень',
  meat: 'Мясо и птица',
  fish: 'Рыба и морепродукты',
  dairy: 'Молочное и яйца',
  grains: 'Крупы и макароны',
  bakery: 'Хлеб',
  pantry: 'Консервы и бакалея',
  oils: 'Масла и соусы',
  nuts: 'Орехи и сухофрукты',
  spices: 'Специи',
  other: 'Прочее',
};

export const UNIT_NAME: Record<Unit, string> = {
  g: 'г',
  ml: 'мл',
  pcs: 'шт',
  tbsp: 'ст. л.',
  tsp: 'ч. л.',
};

export const MICRO_LABEL: Record<Micro, string> = {
  fiber: 'Клетчатка',
  vitC: 'Витамин C',
  vitA: 'Витамин A',
  vitD: 'Витамин D',
  b12: 'Витамин B12',
  folate: 'Фолаты (B9)',
  calcium: 'Кальций',
  iron: 'Железо',
  magnesium: 'Магний',
  potassium: 'Калий',
  zinc: 'Цинк',
};

export const MICRO_UNIT: Record<Micro, string> = {
  fiber: 'г',
  vitC: 'мг',
  vitA: 'мкг',
  vitD: 'мкг',
  b12: 'мкг',
  folate: 'мкг',
  calcium: 'мг',
  iron: 'мг',
  magnesium: 'мг',
  potassium: 'мг',
  zinc: 'мг',
};

export const MACRO_PRESET_LABEL = {
  standard: 'Стандартное: белок по весу, жиры 30%',
  mentzer: 'По Ментцеру: углеводы 60%, белки 25%, жиры 15%',
  custom: 'Своё',
} as const;
