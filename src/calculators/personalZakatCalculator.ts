/**
 * Personal Zakat Calculator
 *
 * Mirrors the math in `Personal Zakat Calculator English.xlsx` so the
 * web UI computes the same result as the spreadsheet template the
 * product team distributed:
 *
 *   - Nisab thresholds: 85 g of pure gold OR 595 g of pure silver
 *     (whichever LOWER, per classical fiqh — gives Zakat to the
 *     greatest number of people).
 *   - 2.5% of total net Zakat-able wealth, applied only when wealth
 *     >= MIN(nisabGold, nisabSilver).
 *   - Per-asset row math: cash uses the value field directly; metal
 *     rows multiply weight (in grams) by per-gram value.
 *
 * Disclaimer: this is a calculation engine, not a fatwa. The UI
 * surfaces that disclaimer to the user.
 */

export type ZakatAssetCategory =
  | 'cash'
  | 'gold_24k'
  | 'gold_21k'
  | 'gold_14k'
  | 'gold_other'
  | 'silver_pure'
  | 'silver_utensils';

export interface ZakatAssetRow {
  category: ZakatAssetCategory;
  /** Description / label shown back to the user (free text). */
  description: string;
  /** Grams for metal rows. Ignored for cash. */
  weight: number;
  /** Value per unit (per gram for metals). For cash, the total cash on hand. */
  valuePerUnit: number;
}

export interface PersonalZakatInput {
  /** Price per 24K gram, in the user's local currency. */
  goldPricePerGram: number;
  /** Price per gram of silver, in the user's local currency. */
  silverPricePerGram: number;
  rows: ZakatAssetRow[];
}

export interface PersonalZakatRowResult {
  category: ZakatAssetCategory;
  description: string;
  weight: number;
  valuePerUnit: number;
  /** Net Zakat-able value contributed by this row. */
  netValue: number;
}

export interface PersonalZakatResult {
  /** 85g of gold * gold price, in local currency. */
  nisabGold: number;
  /** 595g of silver * silver price, in local currency. */
  nisabSilver: number;
  /** Threshold the user's wealth is compared against. */
  effectiveNisab: number;
  /** Total net Zakat-able wealth (sum of row contributions). */
  totalWealth: number;
  /** True when totalWealth >= effectiveNisab. */
  meetsNisab: boolean;
  /** 2.5% of total wealth when meetsNisab; otherwise 0. */
  zakatDue: number;
  rows: PersonalZakatRowResult[];
}

const NISAB_GOLD_GRAMS = 85;
const NISAB_SILVER_GRAMS = 595;
const ZAKAT_RATE = 0.025;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePersonalZakat(input: PersonalZakatInput): PersonalZakatResult {
  const { goldPricePerGram, silverPricePerGram, rows } = input;

  const nisabGold = goldPricePerGram * NISAB_GOLD_GRAMS;
  const nisabSilver = silverPricePerGram * NISAB_SILVER_GRAMS;
  // Classical opinion: the LOWER of the two thresholds is used so
  // more people qualify to give. Matches the spreadsheet's MIN().
  const effectiveNisab = Math.min(nisabGold, nisabSilver);

  const rowResults: PersonalZakatRowResult[] = rows.map((row) => {
    // Cash rows are treated as already in currency value — weight
    // is ignored. Metal rows multiply weight (g) by value per gram.
    const netValue = row.category === 'cash'
      ? row.valuePerUnit
      : row.weight * row.valuePerUnit;
    return {
      category: row.category,
      description: row.description,
      weight: row.weight,
      valuePerUnit: row.valuePerUnit,
      netValue: round2(netValue),
    };
  });

  const totalWealth = round2(rowResults.reduce((sum, r) => sum + r.netValue, 0));
  const meetsNisab = totalWealth >= effectiveNisab && effectiveNisab > 0;
  const zakatDue = meetsNisab ? round2(totalWealth * ZAKAT_RATE) : 0;

  return {
    nisabGold: round2(nisabGold),
    nisabSilver: round2(nisabSilver),
    effectiveNisab: round2(effectiveNisab),
    totalWealth,
    meetsNisab,
    zakatDue,
    rows: rowResults,
  };
}
