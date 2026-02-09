/**
 * Credit Card Payment Calculator
 *
 * Estimates the time to pay off a credit card balance and total interest paid.
 * Supports minimum-payment schedules (% of balance or fixed), optional fixed
 * monthly payments, and 0% introductory periods.
 */

export interface CreditCardInput {
  currentBalance: number;
  annualInterestRate: number; // percentage, e.g. 21
  minPaymentPercent: number; // percentage of balance, e.g. 5
  minPaymentPlusInterest: boolean; // whether min payment % is "plus interest"
  minPaymentFloor: number; // minimum payment when balance is low, e.g. 25
  fixedMonthlyPayment: number; // 0 means use minimum payment schedule
  introMonths: number; // number of months at 0% interest
}

export interface CreditCardSummary {
  firstPayment: number;
  maxPayment: number;
  monthsToPayOff: number;
  yearsToPayOff: number;
  totalInterestPaid: number;
  totalAmountPaid: number;
}

export interface CreditCardRow {
  paymentNumber: number;
  rate: number; // annual rate for this month
  payment: number; // calculated payment (min or fixed)
  extraPayment: number;
  totalPayment: number;
  interestPaid: number;
  principalPaid: number;
  balance: number;
}

export interface CreditCardResult {
  summary: CreditCardSummary;
  schedule: CreditCardRow[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateCreditCard(input: CreditCardInput): CreditCardResult {
  const {
    currentBalance,
    annualInterestRate,
    minPaymentPercent,
    minPaymentPlusInterest,
    minPaymentFloor,
    fixedMonthlyPayment,
    introMonths,
  } = input;

  const schedule: CreditCardRow[] = [];
  let balance = currentBalance;
  let totalInterest = 0;
  let totalPaid = 0;
  let maxPayment = 0;
  let firstPayment = 0;
  let month = 0;

  // Safety limit: 600 months (50 years)
  const MAX_MONTHS = 600;

  while (balance > 0.01 && month < MAX_MONTHS) {
    month++;

    // Determine interest rate for this month
    const effectiveAnnualRate = month <= introMonths ? 0 : annualInterestRate;
    const monthlyRate = effectiveAnnualRate / 100 / 12;

    // Calculate interest
    const interestCharge = balance * monthlyRate;

    // Calculate minimum payment
    let minPayment: number;
    if (minPaymentPlusInterest) {
      // Min payment = (% of balance) + interest
      minPayment = (balance * minPaymentPercent / 100) + interestCharge;
    } else {
      // Min payment = % of balance (interest included)
      minPayment = balance * minPaymentPercent / 100;
    }

    // Apply floor
    minPayment = Math.max(minPayment, minPaymentFloor);

    // Determine actual payment
    let payment: number;
    if (fixedMonthlyPayment > 0) {
      payment = fixedMonthlyPayment;
    } else {
      payment = minPayment;
    }

    // Can't pay more than balance + interest
    if (payment > balance + interestCharge) {
      payment = balance + interestCharge;
    }

    const principalPaid = payment - interestCharge;
    balance = Math.max(0, balance - principalPaid);

    totalInterest += interestCharge;
    totalPaid += payment;

    if (month === 1) firstPayment = round2(payment);
    if (payment > maxPayment) maxPayment = round2(payment);

    schedule.push({
      paymentNumber: month,
      rate: effectiveAnnualRate,
      payment: round2(payment),
      extraPayment: 0,
      totalPayment: round2(payment),
      interestPaid: round2(interestCharge),
      principalPaid: round2(principalPaid),
      balance: round2(balance),
    });
  }

  const monthsToPayOff = month;
  const yearsToPayOff = round2(monthsToPayOff / 12);

  return {
    summary: {
      firstPayment,
      maxPayment,
      monthsToPayOff,
      yearsToPayOff,
      totalInterestPaid: round2(totalInterest),
      totalAmountPaid: round2(totalPaid),
    },
    schedule,
  };
}

