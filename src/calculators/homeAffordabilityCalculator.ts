/**
 * Home Affordability Calculator
 *
 * Determines the maximum home price a buyer can afford based on income,
 * debts, housing expenses, available funds, and financing terms.
 *
 * Uses four constraints:
 *   M1 – max monthly payment based on income
 *   M2 – max monthly payment based on debt-to-income ratio
 *   M3 – max PI payment after housing expenses
 *   M4 – max PI payment based on available funds / down payment
 */

export interface HomeAffordabilityInput {
  // Income
  grossAnnualIncome: number;
  maxHousingExpensePercent: number; // e.g. 28

  // Monthly debts
  carLoans: number;
  creditCardMinimums: number;
  studentLoans: number;
  childSupportOther: number;
  otherMortgages: number;
  otherLoans: number;

  // Debt-to-income
  maxDTIRatio: number; // e.g. 36

  // Monthly housing expenses
  propertyTaxMonthly: number;
  homeInsuranceMonthly: number;
  pmiMonthly: number;
  hoaFees: number;
  otherHousingExpenses: number;

  // Available funds
  availableFunds: number;
  fixedClosingCosts: number;
  variableClosingCostsPercent: number; // e.g. 4
  minDownPaymentPercent: number; // e.g. 20

  // Financing
  mortgageTermYears: number;
  annualInterestRate: number; // percentage, e.g. 4.0
}

export interface HomeAffordabilityResult {
  // Intermediate calculations
  currentMonthlyDebts: number;
  m1MaxPaymentIncome: number;
  m2MaxPaymentDTI: number;
  maxMonthlyPayment: number;
  totalHousingExpenses: number;
  m3MaxPIExpenses: number;
  maxHomePriceBasedOnFunds: number;
  m4MaxPIFunds: number;
  maxPIPayment: number;

  // Final results
  loanAmount: number;
  downPaymentAmount: number;
  downPaymentPercent: number;
  estimatedClosingCosts: number;
  closingCostsPercent: number;
  maxHomePrice: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate the PI (principal + interest) monthly payment for a given loan.
 */
function calcPIPayment(loanAmount: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return loanAmount / n;
  const compoundFactor = Math.pow(1 + monthlyRate, n);
  return (loanAmount * monthlyRate * compoundFactor) / (compoundFactor - 1);
}

/**
 * Given a target PI payment, reverse-calculate the loan amount.
 */
function loanFromPIPayment(piPayment: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return piPayment * n;
  const compoundFactor = Math.pow(1 + monthlyRate, n);
  return (piPayment * (compoundFactor - 1)) / (monthlyRate * compoundFactor);
}

export function calculateHomeAffordability(
  input: HomeAffordabilityInput,
): HomeAffordabilityResult {
  const {
    grossAnnualIncome,
    maxHousingExpensePercent,
    carLoans,
    creditCardMinimums,
    studentLoans,
    childSupportOther,
    otherMortgages,
    otherLoans,
    maxDTIRatio,
    propertyTaxMonthly,
    homeInsuranceMonthly,
    pmiMonthly,
    hoaFees,
    otherHousingExpenses,
    availableFunds,
    fixedClosingCosts,
    variableClosingCostsPercent,
    minDownPaymentPercent,
    mortgageTermYears,
    annualInterestRate,
  } = input;

  const monthlyIncome = grossAnnualIncome / 12;

  // ----- M1: based on income -----
  const m1MaxPaymentIncome = monthlyIncome * (maxHousingExpensePercent / 100);

  // ----- M2: based on DTI -----
  const currentMonthlyDebts =
    carLoans + creditCardMinimums + studentLoans + childSupportOther + otherMortgages + otherLoans;
  const maxTotalDebtPayment = monthlyIncome * (maxDTIRatio / 100);
  const m2MaxPaymentDTI = maxTotalDebtPayment - currentMonthlyDebts;

  // Lower of M1 and M2
  const maxMonthlyPayment = Math.min(m1MaxPaymentIncome, m2MaxPaymentDTI);

  // ----- M3: based on housing expenses -----
  const totalHousingExpenses =
    propertyTaxMonthly + homeInsuranceMonthly + pmiMonthly + hoaFees + otherHousingExpenses;
  const m3MaxPIExpenses = maxMonthlyPayment - totalHousingExpenses;

  // ----- M4: based on available funds -----
  // Available funds must cover: down payment + closing costs
  // homePrice = loanAmount / (1 - downPayment%)
  // closingCosts = fixedClosing + variableClosing% * homePrice
  // availableFunds = downPayment% * homePrice + fixedClosing + variableClosing% * homePrice
  // availableFunds - fixedClosing = homePrice * (downPayment% + variableClosing%)
  const downPct = minDownPaymentPercent / 100;
  const varClosePct = variableClosingCostsPercent / 100;
  const maxHomePriceBasedOnFunds = (availableFunds - fixedClosingCosts) / (downPct + varClosePct);
  const loanAmountFromFunds = maxHomePriceBasedOnFunds * (1 - downPct);
  const m4MaxPIFunds = calcPIPayment(
    loanAmountFromFunds,
    annualInterestRate,
    mortgageTermYears,
  );

  // Lower of M3 and M4
  const maxPIPayment = Math.min(m3MaxPIExpenses, m4MaxPIFunds);

  // ----- Final calculation -----
  const loanAmount = loanFromPIPayment(
    Math.max(0, maxPIPayment),
    annualInterestRate,
    mortgageTermYears,
  );
  // homePrice = loanAmount / (1 - downPct)
  const maxHomePrice = loanAmount / (1 - downPct);
  const downPaymentAmount = maxHomePrice * downPct;
  const estimatedClosingCosts = fixedClosingCosts + maxHomePrice * varClosePct;
  const closingCostsPercent =
    maxHomePrice > 0 ? (estimatedClosingCosts / maxHomePrice) * 100 : 0;
  const downPaymentPercent = maxHomePrice > 0 ? (downPaymentAmount / maxHomePrice) * 100 : 0;

  return {
    currentMonthlyDebts: round2(currentMonthlyDebts),
    m1MaxPaymentIncome: round2(m1MaxPaymentIncome),
    m2MaxPaymentDTI: round2(m2MaxPaymentDTI),
    maxMonthlyPayment: round2(maxMonthlyPayment),
    totalHousingExpenses: round2(totalHousingExpenses),
    m3MaxPIExpenses: round2(m3MaxPIExpenses),
    maxHomePriceBasedOnFunds: round2(maxHomePriceBasedOnFunds),
    m4MaxPIFunds: round2(m4MaxPIFunds),
    maxPIPayment: round2(maxPIPayment),
    loanAmount: round2(loanAmount),
    downPaymentAmount: round2(downPaymentAmount),
    downPaymentPercent: round2(downPaymentPercent),
    estimatedClosingCosts: round2(estimatedClosingCosts),
    closingCostsPercent: round2(closingCostsPercent),
    maxHomePrice: round2(maxHomePrice),
  };
}

