/**
 * Calculator tests — all 5 calculators: input → calculate → result → PDF.
 */
import { test, expect } from '@playwright/test';

interface CalcConfig {
  path: string;
  heading: string | RegExp;
  inputs: { label?: string | RegExp; placeholder?: string | RegExp; value: string }[];
}

const CALCULATORS: CalcConfig[] = [
  {
    path: '/calculators/simple-loan',
    heading: /simple loan|قرض بسيط/i,
    inputs: [
      { placeholder: /e\.g\. 5000|5000/, value: '10000' },
      { placeholder: /e\.g\. 5\.5|5\.5/, value: '6' },
      { placeholder: /e\.g\. 5|5/, value: '3' },
    ],
  },
  {
    path: '/calculators/credit-card',
    heading: /credit card|بطاقة ائتمان/i,
    // Form order: [0] balance, [1] annualRate, [2] minPaymentPct (1-100%), [3] fixedMonthlyPayment
    inputs: [
      { value: '3000' },   // balance
      { value: '18' },     // annual interest rate %
      { value: '3' },      // min payment % (must be 1-100, NOT a dollar amount!)
      { value: '150' },    // fixed monthly payment (optional)
    ],
  },
  {
    path: '/calculators/home-affordability',
    heading: /home affordability|قدرة شراء/i,
    // 20 number inputs in order. Required: income(0), housingPct(1), maxDTI(8), minDown(17), term(18), rate(19)
    inputs: [
      { value: '65000' },  // 0: grossIncome (REQUIRED)
      { value: '28' },     // 1: maxHousingPct (REQUIRED, 1-100)
      { value: '0' },      // 2: carLoans
      { value: '0' },      // 3: creditCards
      { value: '0' },      // 4: studentLoans
      { value: '0' },      // 5: childSupport
      { value: '0' },      // 6: otherMortgages
      { value: '0' },      // 7: otherLoans
      { value: '36' },     // 8: maxDTI (REQUIRED, 1-100)
      { value: '0' },      // 9: propertyTax
      { value: '0' },      // 10: insurance
      { value: '0' },      // 11: pmi
      { value: '0' },      // 12: hoa
      { value: '0' },      // 13: otherExpenses
      { value: '50000' },  // 14: availableFunds
      { value: '0' },      // 15: fixedClosing
      { value: '4' },      // 16: variableClosing
      { value: '20' },     // 17: minDown (REQUIRED, 1-100)
      { value: '30' },     // 18: mortgageTerm (REQUIRED, 1-50)
      { value: '4' },      // 19: interestRate (REQUIRED, 0-100)
    ],
  },
  {
    path: '/calculators/mortgage-payoff',
    heading: /mortgage payoff|سداد الرهن/i,
    // Form order: [0] loanAmount, [1] interestRate, [2] loanTermYears, [3] paymentsPerYear (REQUIRED 1-52), [4] extraPayment
    inputs: [
      { value: '200000' }, // loanAmount
      { value: '4.5' },    // annualInterestRate
      { value: '30' },     // loanTermYears
      { value: '12' },     // paymentsPerYear (REQUIRED: 1-52, 12=monthly)
    ],
  },
  {
    path: '/calculators/compound-savings',
    heading: /compound savings|ادخار مركب/i,
    // Form order: [0] yearsToInvest, [1] initialInvestment, [2] interestRate, [3] depositAmount
    inputs: [
      { value: '10' },    // yearsToInvest
      { value: '5000' },  // initialInvestment
      { value: '6' },     // interestRate
      { value: '300' },   // depositAmount
    ],
  },
];

for (const calc of CALCULATORS) {
  test.describe(`Calculator: ${calc.path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(calc.path);
      await page.waitForLoadState('networkidle');
    });

    test('renders heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: calc.heading })).toBeVisible();
    });

    test('has Calculate button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /calculate|احسب/i })).toBeVisible();
    });

    test('produces results after calculation', async ({ page }) => {
      // Fill all inputs in order
      const numberInputs = page.locator('input[type="number"]');
      const count = await numberInputs.count();
      const inputCount = Math.min(count, calc.inputs.length);

      for (let i = 0; i < inputCount; i++) {
        await numberInputs.nth(i).fill(calc.inputs[i].value);
      }

      // Set date input if present
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.count() > 0) {
        await dateInput.fill('2026-04-01');
      }

      await page.getByRole('button', { name: /calculate|احسب/i }).click();
      await page.waitForTimeout(1000);

      // Results section should appear
      await expect(
        page.locator('text=/monthly payment|total|result|النتيجة|إجمالي/i').first()
      ).toBeVisible({ timeout: 8000 });
    });

    test('Download PDF button appears after calculation', async ({ page }) => {
      const numberInputs = page.locator('input[type="number"]');
      const count = await numberInputs.count();
      const inputCount = Math.min(count, calc.inputs.length);

      for (let i = 0; i < inputCount; i++) {
        await numberInputs.nth(i).fill(calc.inputs[i].value);
      }

      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.count() > 0) {
        await dateInput.fill('2026-04-01');
      }

      await page.getByRole('button', { name: /calculate|احسب/i }).click();

      await expect(
        page.getByRole('button', { name: /download pdf|تنزيل|pdf/i })
      ).toBeVisible({ timeout: 8000 });
    });

    test('Reset button clears results', async ({ page }) => {
      const numberInputs = page.locator('input[type="number"]');
      const count = await numberInputs.count();
      if (count > 0) {
        await numberInputs.first().fill('1000');
      }

      const resetBtn = page.getByRole('button', { name: /reset|مسح|clear/i });
      if (await resetBtn.isVisible()) {
        await resetBtn.click();
        await page.waitForTimeout(500);
        const val = await numberInputs.first().inputValue();
        expect(val).toBe('');
      }
    });
  });
}
