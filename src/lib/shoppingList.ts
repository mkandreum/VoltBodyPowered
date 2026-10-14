/** Lista de la compra semanal a partir del menú (port de util/ShoppingList.kt de la app). */
import type { DietPlan, Meal } from '../store/useAppStore';

export type ShoppingItem = { key: string; name: string; aisle: string; amounts: Record<string, number>; uses: number };
export type ShoppingAisle = { name: string; emoji: string; items: ShoppingItem[] };

/** Pasillos en el orden habitual de un supermercado. */
const AISLES: Array<[string, string, string[]]> = [
  ['Frutas y verduras', '🥬', [
    'brocoli', 'espinaca', 'lechuga', 'tomate', 'cebolla', 'ajo', 'pimiento', 'calabacin', 'berenjena', 'zanahoria', 'pepino',
    'champinon', 'seta', 'esparrago', 'judia verde', 'coliflor', 'col ', 'kale', 'rucula', 'canonigo', 'aguacate', 'limon',
    'platano', 'manzana', 'pera', 'naranja', 'fresa', 'arandano', 'frutos rojos', 'kiwi', 'pina', 'mango', 'uva', 'melon',
    'sandia', 'fruta', 'verdura', 'patata', 'boniato', 'calabaza', 'puerro', 'apio', 'jengibre', 'perejil', 'cilantro', 'albahaca',
  ]],
  ['Carne y pescado', '🥩', [
    'pollo', 'pavo', 'ternera', 'cerdo', 'lomo', 'solomillo', 'carne', 'jamon', 'salmon', 'atun fresco', 'merluza', 'bacalao',
    'dorada', 'lubina', 'sardina', 'caballa', 'gamba', 'langostino', 'pescado', 'calamar', 'sepia', 'mejillon', 'hamburguesa',
  ]],
  ['Huevos y lácteos', '🥚', [
    'huevo', 'clara', 'leche', 'yogur', 'kefir', 'skyr', 'queso', 'requeson', 'mantequilla', 'nata', 'bebida de avena', 'bebida vegetal',
  ]],
  ['Despensa', '🫙', [
    'arroz', 'pasta', 'espagueti', 'macarron', 'quinoa', 'cuscus', 'avena', 'copos', 'pan', 'tortilla de trigo', 'wrap', 'harina',
    'lenteja', 'garbanzo', 'alubia', 'judia blanca', 'legumbre', 'atun', 'conserva', 'tomate triturado', 'frutos secos', 'nuez',
    'nueces', 'almendra', 'cacahuete', 'crema de', 'semilla', 'chia', 'lino', 'aceite', 'aove', 'vinagre', 'sal', 'pimienta',
    'especia', 'oregano', 'comino', 'canela', 'miel', 'chocolate', 'cacao', 'proteina', 'whey', 'tortita', 'galleta', 'cereal',
  ]],
];
const OTHER = 'Otros';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '').trim();

function aisleOf(key: string): string {
  const k = ` ${key} `;
  for (const [name, , words] of AISLES) if (words.some((w) => k.includes(w))) return name;
  return OTHER;
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gr: 'g', grs: 'g', gramos: 'g', kg: 'kg', ml: 'ml', l: 'l', litro: 'l', litros: 'l',
  ud: 'ud', uds: 'ud', unidad: 'ud', unidades: 'ud', u: 'ud',
  cda: 'cda', cdas: 'cda', cucharada: 'cda', cucharadas: 'cda', cdta: 'cdta', cucharadita: 'cdta', cucharaditas: 'cdta',
  rebanada: 'rebanada', rebanadas: 'rebanada', loncha: 'loncha', lonchas: 'loncha', lata: 'lata', latas: 'lata',
  punado: 'puñado', punados: 'puñado', scoop: 'scoop', scoops: 'scoop', cacito: 'scoop', cacitos: 'scoop',
};

const QTY = /^(\d+(?:[.,]\d+)?)\s*([a-zñáéíóú]+)?\.?\s+(?:de\s+)?(.+)$/;
const NAME_FIXES: Array<[RegExp, string]> = [
  [/\baove\b/g, 'aceite de oliva virgen extra'],
  [/\b(en crudo|crudo|cruda|cocido|cocida|al natural|escurrido|picado|picada|troceado|troceada|fresco|fresca)\b/g, ''],
];

/** Ingredientes de una comida a partir de su descripción ("120 g pechuga de pollo, 70 g arroz, 10 g AOVE. Plancha..."). */
export function parseIngredients(description: string): Array<[string, string, number | null]> {
  if (!description?.trim()) return [];
  const list = description.split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/)[0].replace(/[.\s]+$/, '');
  return list.split(/,|;|\s+y\s+|\s+\+\s+/).flatMap((raw) => {
    let frag = raw.toLowerCase().replace(/\(.*?\)/g, '').trim();
    if (!frag || frag.length > 60) return [];
    let unit = '';
    let qty: number | null = null;
    const m = frag.match(QTY);
    if (m) {
      const u = m[2] ?? '';
      const alias = UNIT_ALIASES[normalize(u)];
      qty = parseFloat(m[1].replace(',', '.'));
      frag = alias ? m[3] : [u, m[3]].filter(Boolean).join(' ');
      unit = alias ?? 'ud';
    }
    for (const [re, rep] of NAME_FIXES) frag = frag.replace(re, rep);
    frag = frag.replace(/\s+/g, ' ').trim().replace(/^de /, '').trim();
    return frag.length < 2 ? [] : [[frag, unit, Number.isFinite(qty) ? qty : null] as [string, string, number | null]];
  });
}

function base(unit: string, v: number): [string, number] {
  if (unit === 'kg') return ['g', v * 1000];
  if (unit === 'l') return ['ml', v * 1000];
  return [unit, v];
}

const n1 = (x: number) => (x % 1 === 0 ? String(Math.trunc(x)) : x.toFixed(1).replace('.', ','));
function formatAmount(v: number, unit: string): string {
  if (unit === 'g' && v >= 1000) return `${n1(Math.round(v / 100) / 10)} kg`;
  if (unit === 'ml' && v >= 1000) return `${n1(Math.round(v / 100) / 10)} l`;
  if (unit === 'g' || unit === 'ml') return `${n1(Math.round(v / 10) * 10)} ${unit}`;
  return `${n1(v)} ${unit}`;
}

/** "840 g", "1,2 kg + 2 ud", o "x3" si el menú no daba cantidades. */
export function amountLabel(item: ShoppingItem): string {
  const parts = Object.entries(item.amounts).filter(([u]) => u).map(([u, v]) => formatAmount(v, u));
  return parts.length ? parts.join(' + ') : `x${item.uses}`;
}

/** Lista de los 7 días del menú (o 7 veces el menú base), agrupada por pasillo y con cantidades sumadas. */
export function buildShoppingList(diet: DietPlan): ShoppingAisle[] {
  const days: Meal[][] = diet.week?.length ? diet.week.map((d) => d.meals) : Array.from({ length: 7 }, () => diet.meals);
  const acc = new Map<string, { name: string; amounts: Record<string, number>; uses: number }>();
  for (const meals of days) for (const meal of meals) for (const [name, unit, qty] of parseIngredients(meal.description)) {
    const key = normalize(name).replace(/s$/, '').replace(/e$/, '');
    const cur = acc.get(key) ?? { name, amounts: {}, uses: 0 };
    if (qty != null) { const [u, v] = base(unit, qty); cur.amounts[u] = (cur.amounts[u] ?? 0) + v; }
    cur.uses += 1;
    acc.set(key, cur);
  }
  const byAisle = new Map<string, ShoppingItem[]>();
  acc.forEach((v, key) => {
    const aisle = aisleOf(normalize(v.name));
    (byAisle.get(aisle) ?? byAisle.set(aisle, []).get(aisle)!).push({ key, name: v.name.charAt(0).toUpperCase() + v.name.slice(1), aisle, amounts: v.amounts, uses: v.uses });
  });
  const order: Array<[string, string]> = [...AISLES.map(([n, e]) => [n, e] as [string, string]), [OTHER, '🛒']];
  return order.flatMap(([name, emoji]) => {
    const items = byAisle.get(name);
    return items ? [{ name, emoji, items: items.sort((a, b) => a.name.localeCompare(b.name, 'es')) }] : [];
  });
}

/** Texto plano para compartir la lista. */
export function shoppingListText(aisles: ShoppingAisle[], done: Set<string>): string {
  let s = '🛒 Lista de la compra VoltBody\n';
  for (const a of aisles) {
    const pending = a.items.filter((i) => !done.has(i.key));
    if (!pending.length) continue;
    s += `\n${a.emoji} ${a.name}\n`;
    pending.forEach((i) => { s += `• ${i.name} — ${amountLabel(i)}\n`; });
  }
  return s;
}
