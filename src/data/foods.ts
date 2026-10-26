import type { Category, Flag, Food } from '../core/types';

// Approximate values per 100 g, compiled by hand from common reference tables.
// They are a guide, not laboratory data. Corrections are welcome (see CONTRIBUTING.md).

type Extra = Partial<Pick<Food, 'density' | 'gPerPiece' | 'shop' | 'staple' | 'flags'>>;

const f = (
  id: string,
  name: string,
  category: Category,
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  extra: Extra = {},
): Food => ({ id, name, category, kcal, protein, fat, carbs, ...extra });

const pcs = (grams: number): Extra => ({ gPerPiece: grams, shop: 'pcs' });
const flags = (...fl: Flag[]): Extra => ({ flags: fl });

export const FOODS: Food[] = [
  // --- Овощи, фрукты, зелень -------------------------------------------------
  f('tomato', 'Помидоры', 'produce', 18, 0.9, 0.2, 3.9, pcs(120)),
  f('cucumber', 'Огурцы', 'produce', 15, 0.7, 0.1, 3.6, pcs(120)),
  f('bell-pepper', 'Болгарский перец', 'produce', 26, 1, 0.3, 6, pcs(150)),
  f('onion', 'Лук репчатый', 'produce', 40, 1.1, 0.1, 9.3, pcs(90)),
  f('garlic', 'Чеснок (зубчики)', 'produce', 149, 6.4, 0.5, 33, pcs(4)),
  f('carrot', 'Морковь', 'produce', 41, 0.9, 0.2, 9.6, { gPerPiece: 80 }),
  f('potato', 'Картофель', 'produce', 77, 2, 0.1, 17, { gPerPiece: 150 }),
  f('sweet-potato', 'Батат', 'produce', 86, 1.6, 0.1, 20, { gPerPiece: 200 }),
  f('zucchini', 'Кабачок', 'produce', 17, 1.2, 0.3, 3.1, pcs(250)),
  f('eggplant', 'Баклажан', 'produce', 25, 1, 0.2, 6, pcs(300)),
  f('broccoli', 'Брокколи', 'produce', 34, 2.8, 0.4, 7),
  f('cauliflower', 'Цветная капуста', 'produce', 25, 1.9, 0.3, 5),
  f('cabbage', 'Капуста белокочанная', 'produce', 25, 1.3, 0.1, 5.8),
  f('spinach', 'Шпинат', 'produce', 23, 2.9, 0.4, 3.6),
  f('lettuce', 'Салатные листья', 'produce', 15, 1.4, 0.2, 2.9),
  f('mushrooms', 'Шампиньоны', 'produce', 22, 3.1, 0.3, 3.3),
  f('green-peas', 'Горошек зелёный (замороженный)', 'produce', 77, 5, 0.4, 14),
  f('beet', 'Свёкла', 'produce', 43, 1.6, 0.2, 9.6, { gPerPiece: 150 }),
  f('pumpkin', 'Тыква', 'produce', 26, 1, 0.1, 6.5),
  f('greens', 'Зелень (укроп, петрушка)', 'produce', 35, 3, 0.7, 6),
  f('lemon', 'Лимоны', 'produce', 29, 1.1, 0.3, 9, pcs(100)),
  f('ginger', 'Имбирь', 'produce', 80, 1.8, 0.8, 18),
  f('avocado', 'Авокадо', 'produce', 160, 2, 14.7, 8.5, pcs(150)),
  f('banana', 'Бананы', 'produce', 89, 1.1, 0.3, 23, pcs(120)),
  f('apple', 'Яблоки', 'produce', 52, 0.3, 0.2, 14, pcs(180)),
  f('orange', 'Апельсины', 'produce', 47, 0.9, 0.1, 12, pcs(180)),
  f('pear', 'Груши', 'produce', 57, 0.4, 0.1, 15, pcs(170)),
  f('kiwi', 'Киви', 'produce', 61, 1.1, 0.5, 15, pcs(75)),
  f('berries-frozen', 'Ягоды (замороженные)', 'produce', 45, 0.7, 0.3, 10),

  // --- Орехи, семена, сухофрукты --------------------------------------------
  f('dried-apricots', 'Курага', 'nuts', 241, 3.4, 0.5, 63),
  f('raisins', 'Изюм', 'nuts', 299, 3.1, 0.5, 79),
  f('dates', 'Финики', 'nuts', 282, 2.5, 0.4, 75),
  f('almonds', 'Миндаль', 'nuts', 579, 21, 50, 22, flags('nuts')),
  f('walnuts', 'Грецкие орехи', 'nuts', 654, 15, 65, 14, flags('nuts')),
  f('peanut-butter', 'Арахисовая паста', 'nuts', 588, 25, 50, 20, flags('peanut')),
  f('chia', 'Семена чиа', 'nuts', 486, 16.5, 30.7, 42),

  // --- Мясо и птица ---------------------------------------------------------
  f('chicken-breast', 'Куриная грудка', 'meat', 120, 22.5, 2.6, 0, flags('meat')),
  f('chicken-thigh', 'Куриные бёдра (филе)', 'meat', 121, 19.7, 4.1, 0, flags('meat')),
  f('turkey-fillet', 'Филе индейки', 'meat', 112, 23.5, 1.5, 0, flags('meat')),
  f('ground-turkey', 'Фарш из индейки', 'meat', 148, 19, 8, 0, flags('meat')),
  f('beef-lean', 'Говядина (постная)', 'meat', 143, 21, 6, 0, flags('meat')),
  f('ground-beef', 'Фарш говяжий', 'meat', 176, 20, 10, 0, flags('meat')),
  f('pork-tenderloin', 'Свиная вырезка', 'meat', 120, 21, 3.5, 0, flags('meat')),

  // --- Рыба и морепродукты --------------------------------------------------
  f('salmon', 'Лосось (филе)', 'fish', 208, 20, 13, 0, flags('fish')),
  f('white-fish', 'Белая рыба (треска, хек)', 'fish', 82, 18, 0.7, 0, flags('fish')),
  f('tuna-canned', 'Тунец консервированный', 'fish', 116, 26, 1, 0, flags('fish')),
  f('shrimp', 'Креветки', 'fish', 85, 20, 0.5, 0, flags('shellfish')),

  // --- Молочное и яйца ------------------------------------------------------
  f('egg', 'Яйца', 'dairy', 143, 12.6, 9.5, 0.7, { ...pcs(55), ...flags('egg') }),
  f('milk', 'Молоко 2,5%', 'dairy', 52, 2.8, 2.5, 4.7, { density: 1.03, shop: 'ml', ...flags('dairy') }),
  f('kefir', 'Кефир 1%', 'dairy', 40, 3, 1, 4, { density: 1.03, shop: 'ml', ...flags('dairy') }),
  f('soy-milk', 'Соевое молоко (без сахара)', 'dairy', 33, 2.9, 1.8, 1.2, { density: 1.03, shop: 'ml', ...flags('soy') }),
  f('yogurt-greek', 'Греческий йогурт 2%', 'dairy', 73, 9.9, 2, 4, flags('dairy')),
  f('yogurt-plain', 'Йогурт натуральный', 'dairy', 61, 3.5, 3.3, 4.7, flags('dairy')),
  f('cottage-cheese', 'Творог 5%', 'dairy', 121, 17, 5, 1.8, flags('dairy')),
  f('cheese-hard', 'Сыр твёрдый', 'dairy', 350, 25, 27, 0.5, flags('dairy')),
  f('feta', 'Брынза (фета)', 'dairy', 262, 17, 21, 1, flags('dairy')),
  f('parmesan', 'Пармезан', 'dairy', 431, 38, 29, 4, flags('dairy')),
  f('sour-cream', 'Сметана 15%', 'dairy', 162, 2.6, 15, 3.6, flags('dairy')),
  f('butter', 'Масло сливочное', 'dairy', 717, 0.9, 81, 0.1, flags('dairy')),

  // --- Крупы и макароны -----------------------------------------------------
  f('oats', 'Овсяные хлопья', 'grains', 370, 12.5, 6.5, 64, flags('gluten')),
  f('buckwheat', 'Гречка', 'grains', 343, 13.3, 3.4, 71.5),
  f('rice', 'Рис белый', 'grains', 365, 7.1, 0.7, 80),
  f('brown-rice', 'Рис бурый', 'grains', 370, 7.9, 2.9, 77),
  f('quinoa', 'Киноа', 'grains', 368, 14.1, 6.1, 64),
  f('bulgur', 'Булгур', 'grains', 342, 12.3, 1.3, 76, flags('gluten')),
  f('couscous', 'Кускус', 'grains', 376, 12.8, 0.6, 77, flags('gluten')),
  f('pasta', 'Макароны', 'grains', 371, 13, 1.5, 75, flags('gluten')),
  f('pasta-whole', 'Макароны цельнозерновые', 'grains', 350, 13.5, 2.5, 68, flags('gluten')),
  f('lentils-red', 'Чечевица красная', 'grains', 352, 24.6, 1.1, 63),
  f('flour', 'Мука пшеничная', 'grains', 364, 10.3, 1, 76, { density: 0.55, ...flags('gluten') }),

  // --- Хлеб -----------------------------------------------------------------
  f('bread-whole', 'Хлеб цельнозерновой', 'bakery', 247, 13, 3.4, 41, flags('gluten')),
  f('bread-rye', 'Хлеб ржаной', 'bakery', 259, 8.5, 3.3, 48, flags('gluten')),
  f('lavash', 'Лаваш', 'bakery', 275, 9.1, 1.2, 56, flags('gluten')),

  // --- Консервы и бакалея ---------------------------------------------------
  f('chickpeas-canned', 'Нут консервированный', 'pantry', 130, 7, 2.7, 20),
  f('beans-canned', 'Фасоль консервированная', 'pantry', 95, 6.5, 0.5, 15.5),
  f('corn-canned', 'Кукуруза консервированная', 'pantry', 80, 2.5, 1.2, 14),
  f('tofu', 'Тофу', 'pantry', 76, 8, 4.8, 1.9, flags('soy')),
  f('hummus', 'Хумус', 'pantry', 166, 8, 9.6, 14, flags('sesame')),
  f('tomatoes-canned', 'Томаты в собственном соку', 'pantry', 21, 1, 0.2, 4.3),
  f('tomato-paste', 'Томатная паста', 'pantry', 82, 4.3, 0.5, 19, { density: 1.1 }),
  f('coconut-milk', 'Кокосовое молоко', 'pantry', 197, 2, 21, 2.8, { shop: 'ml' }),
  f('honey', 'Мёд', 'pantry', 304, 0.3, 0, 82, { density: 1.4, ...flags('honey') }),

  // --- Масла и соусы (обычно уже есть дома) --------------------------------
  f('olive-oil', 'Оливковое масло', 'oils', 884, 0, 100, 0, { density: 0.92, shop: 'ml', staple: true }),
  f('veg-oil', 'Подсолнечное масло', 'oils', 899, 0, 99.9, 0, { density: 0.92, shop: 'ml', staple: true }),
  f('soy-sauce', 'Соевый соус', 'oils', 53, 8, 0.6, 4.9, { density: 1.2, shop: 'ml', staple: true, ...flags('soy', 'gluten') }),

  // --- Специи (обычно уже есть дома) ---------------------------------------
  f('salt', 'Соль', 'spices', 0, 0, 0, 0, { density: 1.2, staple: true }),
  f('pepper', 'Перец чёрный молотый', 'spices', 251, 10, 3.3, 64, { density: 0.5, staple: true }),
  f('paprika', 'Паприка молотая', 'spices', 282, 14, 13, 54, { density: 0.5, staple: true }),
  f('cumin', 'Зира молотая', 'spices', 375, 18, 22, 44, { density: 0.4, staple: true }),
  f('turmeric', 'Куркума', 'spices', 312, 10, 3, 67, { density: 0.6, staple: true }),
  f('herbs', 'Итальянские травы', 'spices', 265, 9, 4, 64, { density: 0.25, staple: true }),
  f('cinnamon', 'Корица молотая', 'spices', 247, 4, 1.2, 81, { density: 0.55, staple: true }),
  f('curry-powder', 'Карри (порошок)', 'spices', 325, 14, 14, 58, { density: 0.5, staple: true }),
  f('chili-flakes', 'Чили (хлопья)', 'spices', 282, 12, 14, 50, { density: 0.4, staple: true }),

  // --- Ещё овощи, фрукты и зелень -------------------------------------------
  f('celery', 'Сельдерей (стебель)', 'produce', 16, 0.7, 0.2, 3),
  f('radish', 'Редис', 'produce', 16, 0.7, 0.1, 3.4),
  f('leek', 'Лук-порей', 'produce', 31, 1.8, 0.3, 7.3),
  f('green-beans', 'Стручковая фасоль', 'produce', 31, 1.8, 0.2, 7),
  f('chinese-cabbage', 'Пекинская капуста', 'produce', 16, 1.2, 0.2, 3.2),
  f('arugula', 'Руккола', 'produce', 25, 2.6, 0.7, 3.7),
  f('asparagus', 'Спаржа', 'produce', 20, 2.2, 0.1, 3.9),
  f('sauerkraut', 'Квашеная капуста', 'produce', 19, 1.8, 0.1, 4.4),
  f('peach', 'Персики', 'produce', 39, 0.9, 0.3, 9.5, pcs(150)),
  f('mandarin', 'Мандарины', 'produce', 53, 0.8, 0.3, 13.3, pcs(80)),
  f('grapes', 'Виноград', 'produce', 69, 0.7, 0.2, 18),
  f('mango', 'Манго', 'produce', 60, 0.8, 0.4, 15),

  // --- Ещё орехи, семена, сухофрукты ----------------------------------------
  f('cashew', 'Кешью', 'nuts', 553, 18, 44, 30, flags('nuts')),
  f('peanuts', 'Арахис', 'nuts', 551, 26, 45, 10, flags('peanut')),
  f('sunflower-seeds', 'Семечки подсолнечника (очищенные)', 'nuts', 584, 21, 51, 20),
  f('pumpkin-seeds', 'Тыквенные семечки', 'nuts', 559, 30, 49, 11),
  f('flax', 'Семена льна', 'nuts', 534, 18, 42, 29),
  f('sesame-seeds', 'Кунжут', 'nuts', 573, 18, 50, 23, flags('sesame')),
  f('tahini', 'Тахини (кунжутная паста)', 'nuts', 595, 17, 54, 21, { density: 0.95, ...flags('sesame') }),
  f('prunes', 'Чернослив', 'nuts', 240, 2.2, 0.4, 64),

  // --- Ещё мясо, рыба ---------------------------------------------------------
  f('chicken-ground', 'Фарш куриный', 'meat', 143, 17.4, 8, 0.5, flags('meat')),
  f('chicken-liver', 'Куриная печень', 'meat', 136, 19, 6, 0.7, flags('meat')),
  f('mackerel', 'Скумбрия', 'fish', 191, 18, 13, 0, flags('fish')),
  f('sardines-canned', 'Сардины в собственном соку', 'fish', 170, 21, 9, 0, flags('fish')),
  f('trout', 'Форель (филе)', 'fish', 148, 21, 7, 0, flags('fish')),
  f('squid', 'Кальмары', 'fish', 92, 18, 1.4, 2, flags('shellfish')),

  // --- Ещё молочное и растительные напитки ----------------------------------
  f('mozzarella', 'Моцарелла', 'dairy', 254, 18, 19.5, 2, flags('dairy')),
  f('cream', 'Сливки 10%', 'dairy', 118, 3, 10, 4, { density: 1, shop: 'ml', ...flags('dairy') }),
  f('rice-milk', 'Рисовое молоко', 'dairy', 47, 0.3, 1, 9.5, { density: 1.03, shop: 'ml' }),
  f('oat-milk', 'Овсяное молоко', 'dairy', 45, 1, 1.5, 7, { density: 1.03, shop: 'ml', ...flags('gluten') }),

  // --- Ещё крупы и мука -------------------------------------------------------
  f('lentils-green', 'Чечевица зелёная', 'grains', 352, 24, 1.5, 60),
  f('pearl-barley', 'Перловая крупа', 'grains', 324, 9.3, 1.1, 73, flags('gluten')),
  f('millet', 'Пшено', 'grains', 348, 11.5, 3.3, 69),
  f('rice-noodles', 'Рисовая лапша', 'grains', 364, 3.5, 0.6, 83),
  f('chickpea-flour', 'Нутовая мука', 'grains', 387, 22, 6.7, 58, { density: 0.5 }),
  f('rice-cakes', 'Рисовые хлебцы', 'bakery', 387, 8, 3, 80, pcs(9)),

  // --- Ещё бакалея ------------------------------------------------------------
  f('olives', 'Оливки', 'pantry', 115, 0.8, 10.7, 6.3),
  f('edamame', 'Эдамаме (замороженные)', 'pantry', 121, 12, 5, 9, flags('soy')),
  f('cocoa', 'Какао-порошок', 'pantry', 228, 20, 14, 10, { density: 0.5 }),
  f('mustard', 'Горчица', 'oils', 66, 4.4, 4, 5, { density: 1.05, staple: true }),
  f('balsamic', 'Бальзамический уксус', 'oils', 88, 0.5, 0, 19.5, { density: 1.1, shop: 'ml', staple: true }),
];
