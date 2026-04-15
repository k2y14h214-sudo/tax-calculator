/**
 * 연말정산 계산 엔진
 * 법률 기준: 2024년 귀속 소득세법
 */

// ────────────────────────────────────────────────────────────────
// 입력 타입
// ────────────────────────────────────────────────────────────────

export interface YearEndTaxInput {
  /** 총급여액 (연봉) */
  salary: number

  // 인적공제
  hasSpouse: boolean
  childrenCount: number
  dependentsCount: number

  // 주택 관련
  /** 무주택 세대주 여부 */
  isHousingOwner: boolean
  /** 주택청약저축 납입액 */
  housingSubscription: number
  /** 전세자금대출 원리금 상환액 */
  leaseLoanRepayment: number
  /** 장기주택저당차입금 이자상환액 */
  mortgageInterest: number

  // 카드 사용액
  creditCard: number
  debitCard: number

  // 연금/보험
  /** 연금저축 납입액 */
  pensionSavings: number
  /** IRP 납입액 */
  irp: number
  /** 보장성 보험료 납입액 */
  insurancePremium: number

  // 특별세액공제
  medicalExpense: number
  educationExpense: number
  donation: number

  // 월세
  /** 월세 납부자 여부 */
  isRenting: boolean
  /** 연간 월세 납부액 */
  annualRent: number

  // 기타
  /** 신혼부부 여부 (2024~2026 한시) */
  isNewlyMarried: boolean
  /** 원천징수세액 (기납부세액) */
  withholdingTax: number
}

// ────────────────────────────────────────────────────────────────
// 출력 타입
// ────────────────────────────────────────────────────────────────

export interface YearEndTaxResult {
  /** 최종 납부(+) / 환급(-) 금액 */
  finalAmount: number
  /** 환급 여부 */
  isRefund: boolean
  /** 환급 또는 납부 절대값 */
  finalAmountAbs: number

  /** 계산 흐름 */
  flow: {
    salary: number
    earnedIncomeDeduction: number
    totalIncome: number
    totalIncomeDeduction: number
    taxableIncome: number
    calculatedTax: number
    totalTaxCredit: number
    finalTax: number
    prepaidTax: number
    finalAmount: number
  }

  /** 소득공제 항목별 금액 */
  incomeDeductions: {
    earnedIncomeDeduction: number
    personalDeduction: number
    nationalPensionDeduction: number
    healthInsuranceDeduction: number
    housingSubscriptionDeduction: number
    leaseLoanDeduction: number
    mortgageInterestDeduction: number
    cardDeduction: number
  }

  /** 세액공제 항목별 금액 */
  taxCredits: {
    earnedIncomeTaxCredit: number
    childTaxCredit: number
    pensionSavingsCredit: number
    insuranceTaxCredit: number
    medicalCredit: number
    educationCredit: number
    donationCredit: number
    rentCredit: number
    marriageCredit: number
  }
}

// ────────────────────────────────────────────────────────────────
// 보조 함수 (page.tsx와 동일한 로직)
// ────────────────────────────────────────────────────────────────

/** 누진세율 계산 (2024년 귀속) */
export function calculateProgressiveTax(taxableIncome: number): number {
  const income = Math.max(0, taxableIncome)
  let tax = 0
  if (income <= 14000000) tax = income * 0.06
  else if (income <= 50000000) tax = 840000 + (income - 14000000) * 0.15
  else if (income <= 88000000) tax = 6240000 + (income - 50000000) * 0.24
  else if (income <= 150000000) tax = 15360000 + (income - 88000000) * 0.35
  else if (income <= 300000000) tax = 37060000 + (income - 150000000) * 0.38
  else if (income <= 500000000) tax = 94060000 + (income - 300000000) * 0.4
  else if (income <= 1000000000) tax = 174060000 + (income - 500000000) * 0.42
  else tax = 384060000 + (income - 1000000000) * 0.45
  return Math.max(0, Math.round(tax))
}

/** 근로소득공제 계산 */
export function calculateEarnedIncomeDeduction(salary: number): number {
  const s = Math.max(0, salary)
  let deduction = 0
  if (s <= 5000000) deduction = s * 0.7
  else if (s <= 15000000) deduction = 3500000 + (s - 5000000) * 0.4
  else if (s <= 45000000) deduction = 7500000 + (s - 15000000) * 0.15
  else if (s <= 100000000) deduction = 12000000 + (s - 45000000) * 0.05
  else deduction = 14750000 + (s - 100000000) * 0.02
  return Math.max(0, Math.round(Math.min(deduction, 20000000)))
}

/** 근로소득 세액공제 계산 */
export function calculateEarnedIncomeCredit(calculatedTax: number, salary: number): number {
  const tax = Math.max(0, calculatedTax)
  const s = Math.max(0, salary)

  let credit = 0
  if (tax <= 1300000) credit = tax * 0.55
  else credit = 715000 + (tax - 1300000) * 0.3

  let limit = 0
  if (s <= 33000000) {
    limit = 740000
  } else if (s <= 70000000) {
    limit = Math.max(740000 - (s - 33000000) * 0.008, 660000)
  } else if (s <= 120000000) {
    limit = Math.max(660000 - (s - 70000000) * 0.005, 500000)
  } else {
    limit = 500000
  }

  return Math.max(0, Math.round(Math.min(credit, limit)))
}

// ────────────────────────────────────────────────────────────────
// 메인 계산 함수
// ────────────────────────────────────────────────────────────────

export function calculateYearEndTax(input: YearEndTaxInput): YearEndTaxResult {
  const {
    salary,
    hasSpouse,
    childrenCount,
    dependentsCount,
    isHousingOwner,
    housingSubscription,
    leaseLoanRepayment,
    mortgageInterest,
    creditCard,
    debitCard,
    pensionSavings,
    irp,
    insurancePremium,
    medicalExpense,
    educationExpense,
    donation,
    isRenting,
    annualRent,
    isNewlyMarried,
    withholdingTax,
  } = input

  // ── 1단계: 근로소득금액 ──────────────────────────────────────
  const earnedIncomeDeduction = calculateEarnedIncomeDeduction(salary)
  const totalIncome = Math.max(0, Math.round(salary - earnedIncomeDeduction))

  // ── 2단계: 소득공제 ──────────────────────────────────────────

  // 인적공제: 본인 150만 + 배우자 150만 + 자녀 150만×명 + 부양가족 150만×명
  let personalDeduction = 1500000
  if (hasSpouse) personalDeduction += 1500000
  personalDeduction += childrenCount * 1500000
  personalDeduction += dependentsCount * 1500000
  personalDeduction = Math.max(0, Math.round(personalDeduction))

  // 국민연금: salary × 4.5%
  const nationalPensionDeduction = Math.max(0, Math.round(salary * 0.045))

  // 건강보험료: salary × 3.991%
  const healthInsuranceDeduction = Math.max(0, Math.round(salary * 0.03991))

  // 주택청약저축: 무주택 세대주 && 총급여 ≤ 7,000만 → min(납입액, 300만) × 40%
  const housingSubscriptionDeduction =
    isHousingOwner && salary <= 70000000
      ? Math.max(0, Math.round(Math.min(housingSubscription, 3000000) * 0.4))
      : 0

  // 전세자금대출 원리금: 무주택 세대주 → min(상환액, 4,000만) × 40%, 연 400만 한도
  // 소득세법 제52조 제5항
  const leaseLoanDeduction = isHousingOwner
    ? Math.max(0, Math.round(Math.min(Math.min(leaseLoanRepayment, 40000000) * 0.4, 4000000)))
    : 0

  // 주담대 이자: min(이자상환액, 2,000만)
  const mortgageInterestDeduction = Math.max(0, Math.round(Math.min(mortgageInterest, 20000000)))

  // 신용카드 공제 (page.tsx와 동일 로직)
  const cardThreshold = salary * 0.25
  const totalCardSpent = creditCard + debitCard
  let cardDeduction = 0
  if (totalCardSpent > cardThreshold) {
    const creditCardExcess = Math.max(creditCard - cardThreshold, 0)
    const debitCardExcess = Math.max(totalCardSpent - cardThreshold - creditCardExcess, 0)
    const rawDeduction = creditCardExcess * 0.15 + debitCardExcess * 0.3
    const cardLimit = Math.min(salary * 0.2, 3000000)
    cardDeduction = Math.max(0, Math.round(Math.min(rawDeduction, cardLimit)))
  }

  // 조특법 소득공제 종합한도: 카드 + 주택청약 + 전세자금 합산 2,500만원 한도
  const combinedLimitTarget = cardDeduction + housingSubscriptionDeduction + leaseLoanDeduction
  const combinedExcess = Math.max(0, Math.round(combinedLimitTarget - 25000000))

  const totalIncomeDeductionBeforeLimit =
    personalDeduction +
    nationalPensionDeduction +
    healthInsuranceDeduction +
    housingSubscriptionDeduction +
    leaseLoanDeduction +
    mortgageInterestDeduction +
    cardDeduction

  const totalIncomeDeduction = Math.max(
    0,
    Math.round(totalIncomeDeductionBeforeLimit - combinedExcess)
  )

  // 과세표준
  const taxableIncome = Math.max(0, Math.round(totalIncome - totalIncomeDeduction))

  // ── 3단계: 산출세액 ──────────────────────────────────────────
  const calculatedTax = calculateProgressiveTax(taxableIncome)

  // ── 4단계: 세액공제 ──────────────────────────────────────────

  // 근로소득 세액공제
  const earnedIncomeTaxCredit = calculateEarnedIncomeCredit(calculatedTax, salary)

  // 자녀 세액공제: 1명 15만, 2명 35만, 3명 이상 35만+(명수-2)×30만
  let childTaxCredit = 0
  if (childrenCount === 1) childTaxCredit = 150000
  else if (childrenCount === 2) childTaxCredit = 350000
  else if (childrenCount >= 3) childTaxCredit = 350000 + (childrenCount - 2) * 300000
  childTaxCredit = Math.max(0, Math.round(childTaxCredit))

  // 연금계좌: min(min(연금저축, 600만) + IRP, 900만) × 세율
  // salary ≤ 5,500만 → 15%, 초과 → 12%
  const pensionEligible = Math.min(Math.min(pensionSavings, 6000000) + irp, 9000000)
  const pensionRate = salary <= 55000000 ? 0.15 : 0.12
  const pensionSavingsCredit = Math.max(0, Math.round(pensionEligible * pensionRate))

  // 보장성 보험료: min(납입액, 100만) × 12%
  const insuranceTaxCredit = Math.max(0, Math.round(Math.min(insurancePremium, 1000000) * 0.12))

  // 의료비: max(0, 의료비 - salary×3%) × 15%, 한도 700만
  const medicalBase = Math.max(0, medicalExpense - salary * 0.03)
  const medicalCredit = Math.max(0, Math.round(Math.min(medicalBase, 7000000) * 0.15))

  // 교육비: 납입액 × 15%
  const educationCredit = Math.max(0, Math.round(educationExpense * 0.15))

  // 기부금: min(기부금, 1,000만) × 15% + 초과분 × 30%
  const donationCredit = Math.max(
    0,
    Math.round(
      Math.min(donation, 10000000) * 0.15 + Math.max(donation - 10000000, 0) * 0.3
    )
  )

  // 월세: isRenting=true && isHousingOwner=true
  // salary ≤ 5,500만 → min(연월세, 1,000만) × 17%
  // salary ≤ 8,000만 → min(연월세, 1,000만) × 15%
  // salary > 8,000만 → 0
  let rentCredit = 0
  if (isRenting && isHousingOwner) {
    const rentBase = Math.min(annualRent, 10000000)
    if (salary <= 55000000) rentCredit = Math.round(rentBase * 0.17)
    else if (salary <= 80000000) rentCredit = Math.round(rentBase * 0.15)
    else rentCredit = 0
  }
  rentCredit = Math.max(0, rentCredit)

  // 혼인 세액공제: 50만 (2024~2026년 한시)
  const marriageCredit = Math.max(0, isNewlyMarried ? 500000 : 0)

  // 총 세액공제
  const totalTaxCredit =
    earnedIncomeTaxCredit +
    childTaxCredit +
    pensionSavingsCredit +
    insuranceTaxCredit +
    medicalCredit +
    educationCredit +
    donationCredit +
    rentCredit +
    marriageCredit

  // ── 5단계: 결정세액 및 최종 ─────────────────────────────────
  const finalTax = Math.max(0, Math.round(calculatedTax - totalTaxCredit))
  const prepaidTax = withholdingTax
  const finalAmount = Math.round(finalTax - prepaidTax)

  return {
    finalAmount,
    isRefund: finalAmount < 0,
    finalAmountAbs: Math.abs(finalAmount),

    flow: {
      salary,
      earnedIncomeDeduction,
      totalIncome,
      totalIncomeDeduction,
      taxableIncome,
      calculatedTax,
      totalTaxCredit,
      finalTax,
      prepaidTax,
      finalAmount,
    },

    incomeDeductions: {
      earnedIncomeDeduction,
      personalDeduction,
      nationalPensionDeduction,
      healthInsuranceDeduction,
      housingSubscriptionDeduction,
      leaseLoanDeduction,
      mortgageInterestDeduction,
      cardDeduction,
    },

    taxCredits: {
      earnedIncomeTaxCredit,
      childTaxCredit,
      pensionSavingsCredit,
      insuranceTaxCredit,
      medicalCredit,
      educationCredit,
      donationCredit,
      rentCredit,
      marriageCredit,
    },
  }
}
