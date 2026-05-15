// Subcategory display labels — kept 1:1 with the canonical enum in
// `src/ai/taxonomy.ts`. The taxonomy file is still the source of truth
// for which subcategories exist (the keyword classifier and the
// extractor schema both read from it). This file just exposes the
// labels via `react-intl` so other components can call
// `formatMessage({ id: 'subcategories.groceries_dairy' })` consistently.
export default {
  // food
  groceries_produce: 'Produce',
  groceries_dairy: 'Dairy & eggs',
  groceries_meat: 'Meat & seafood',
  groceries_pantry: 'Pantry staples',
  groceries_snacks: 'Snacks & sweets',
  groceries_beverages: 'Beverages',
  groceries_bakery: 'Bread & bakery',
  groceries_frozen: 'Frozen foods',
  dining_out: 'Dining out',
  coffee_tea: 'Coffee & tea',
  fast_food: 'Fast food',
  delivery: 'Food delivery',
  // bills
  electricity: 'Electricity',
  water: 'Water',
  internet: 'Internet',
  mobile: 'Mobile',
  tv_streaming: 'TV & streaming',
  gas: 'Gas',
  subscription: 'Subscription',
  insurance: 'Insurance',
};
