import type { Recipe } from '../../core/types';
import { recipe as r } from './helpers';

export const SNACKS: Recipe[] = [
  r('apple-peanut-butter', 'Яблоко с арахисовой пастой', ['snack'], 1, 3,
    [['apple', 1, 'pcs'], ['peanut-butter', 20]],
    ['Нарежьте яблоко дольками и подавайте с арахисовой пастой.']),

  r('hummus-veggie-sticks', 'Хумус с овощными палочками', ['snack'], 1, 5,
    [['hummus', 80], ['carrot', 1, 'pcs'], ['cucumber', 1, 'pcs'], ['bell-pepper', 0.5, 'pcs']],
    ['Нарежьте морковь, огурец и перец палочками и подавайте с хумусом.']),

  r('cottage-kiwi', 'Творог с киви', ['snack'], 1, 3,
    [['cottage-cheese', 150], ['kiwi', 2, 'pcs']],
    ['Нарежьте киви кубиками и смешайте с творогом.']),

  r('yogurt-berries-almonds', 'Йогурт с ягодами и миндалём', ['snack'], 1, 3,
    [['yogurt-greek', 150], ['berries-frozen', 80], ['honey', 1, 'tsp'], ['almonds', 10]],
    ['Смешайте йогурт с размороженными ягодами, добавьте мёд и миндаль.']),

  r('nut-dried-fruit-mix', 'Орехи с курагой', ['snack'], 1, 2,
    [['almonds', 20], ['walnuts', 10], ['dried-apricots', 30]],
    ['Смешайте орехи и нарезанную курагу. Порцию лучше отмерять заранее.']),

  r('boiled-eggs-cucumber', 'Яйца вкрутую с огурцом', ['snack'], 1, 12,
    [['egg', 2, 'pcs'], ['cucumber', 1, 'pcs'], ['salt', 0.25, 'tsp']],
    ['Варите яйца 9–10 минут, остудите, очистите и подавайте с огурцом.']),

  r('rye-cheese-tomato', 'Бутерброд на ржаном хлебе с сыром и помидором', ['snack'], 1, 5,
    [['bread-rye', 40], ['cheese-hard', 25], ['tomato', 1, 'pcs']],
    ['Положите на хлеб сыр и ломтики помидора.']),

  r('pear-cheese', 'Груша с сыром', ['snack'], 1, 3,
    [['pear', 1, 'pcs'], ['cheese-hard', 25]],
    ['Нарежьте грушу и сыр ломтиками и подавайте вместе.']),

  r('orange-almonds', 'Апельсин с миндалём', ['snack'], 1, 3,
    [['orange', 1, 'pcs'], ['almonds', 20]],
    ['Очистите апельсин и подавайте с миндалём.']),

  r('kefir-berries', 'Кефир с ягодами', ['snack'], 1, 3,
    [['kefir', 250, 'ml'], ['berries-frozen', 100]],
    ['Взбейте кефир с ягодами блендером или просто смешайте.']),
];
