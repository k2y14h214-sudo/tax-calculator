"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Check, Minus, Plus, AlertTriangle, ArrowRight, ArrowLeft, Info, X, ExternalLink } from "lucide-react"
import AppHeader from "./components/AppHeader"

// 숫자 포맷 함수 (천단위 콤마)
function formatNumber(value: string): string {
  const num = value.replace(/[^0-9]/g, "")
  if (!num) return ""
  return Number(num).toLocaleString("ko-KR")
}

// 포맷된 숫자에서 실제 숫자 추출
function parseNumber(value: string): number {
  return Number(value.replace(/[^0-9]/g, "")) || 0
}

// 결과 타입 정의
interface TaxCalculationResult {
  // 최종 결과
  final: { isRefund: boolean; amount: number }
  // 연말정산 한 경우 / 안 한 경우
  withYearEnd: { isRefund: boolean; amount: number }
  withoutYearEnd: { isRefund: boolean; amount: number }
  // 기타 안내용 플래그
  isSeparatelyTaxed: boolean
  // 소득공제 항목
  incomeDeductions: {
    earnedIncomeDeduction: number // 근로소득공제
    personalDeduction: number // 인적공제
    nationalPensionDeduction: number // 국민연금 공제
    healthInsuranceDeduction: number // 건강보험료 공제 (mock)
    housingSubscriptionDeduction: number // 주택청약저축 소득공제
    cardDeduction: number // 신용카드 등 소득공제
    mortgageInterestDeduction: number // 장기주택저당차입금 이자상환액 (mock)
    yellowUmbrellaDeduction: number // 노란우산공제 (mock)
  }
  // 세액공제 항목
  taxCredits: {
    earnedIncomeTaxCredit: number // 근로소득 세액공제
    childTaxCredit: number // 자녀 세액공제 (mock)
    pensionSavingsCredit: number // 연금저축/IRP 세액공제
    insuranceTaxCredit: number // 보장성 보험료 세액공제
    rentCredit: number // 월세 세액공제
    medicalCredit: number // 의료비 세액공제
    educationCredit: number // 교육비 세액공제
    donationCredit: number // 기부금 세액공제
    marriageCredit: number // 결혼 세액공제
  }
  // 계산 흐름
  flow: {
    totalIncome: number // 종합소득금액
    totalIncomeDeduction: number // 소득공제 합계
    taxableIncome: number // 과세표준
    calculatedTax: number // 산출세액
    totalTaxCredit: number // 세액공제 합계
    finalTax: number // 결정세액
    prepaidTax: number // 기납부세액
    finalAmount: number // 최종 납부/환급액
  }
}

// 누진세율 계산
function calculateProgressiveTax(taxableIncome: number): number {
  // 2024년 기준 종합소득세 세율
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

// 근로소득공제 계산
function calculateEarnedIncomeDeduction(salary: number): number {
  const s = Math.max(0, salary)
  let deduction = 0
  if (s <= 5000000) deduction = s * 0.7
  else if (s <= 15000000) deduction = 3500000 + (s - 5000000) * 0.4
  else if (s <= 45000000) deduction = 7500000 + (s - 15000000) * 0.15
  else if (s <= 100000000) deduction = 12000000 + (s - 45000000) * 0.05
  else deduction = 14750000 + (s - 100000000) * 0.02

  return Math.max(0, Math.round(Math.min(deduction, 20000000)))
}

// 근로소득 세액공제 계산
function calculateEarnedIncomeCredit(calculatedTax: number, salary: number): number {
  const tax = Math.max(0, calculatedTax)
  const s = Math.max(0, salary)

  let credit = 0
  if (tax <= 1300000) credit = tax * 0.55
  else credit = 715000 + (tax - 1300000) * 0.3

  let limit = 0
  if (s <= 33000000) {
    limit = 740000
  } else if (s <= 70000000) {
    limit = 740000 - (s - 33000000) * 0.008
    limit = Math.max(limit, 660000)
  } else if (s <= 120000000) {
    limit = 660000 - (s - 70000000) * 0.005
    limit = Math.max(limit, 500000)
  } else {
    limit = 500000
  }

  return Math.max(0, Math.round(Math.min(credit, limit)))
}

export default function TaxCalculator() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<"calculator" | "info">("calculator")
  const lastMobileTabRef = useRef<"calculator" | "info">("calculator")
  const calculatorPanelRef = useRef<HTMLDivElement | null>(null)
  const infoRef = useRef<HTMLDivElement | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  // 결과 화면 탭 상태
  const [resultTab, setResultTab] = useState<"summary" | "incomeDeduction" | "taxCredit" | "prepaidTax">("summary")

  // 연말정산 여부
  const [knowsYearEndResult, setKnowsYearEndResult] = useState<boolean | null>(null)
  const [yearEndFinalTax, setYearEndFinalTax] = useState("")

  // 아코디언 상태
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["income"]))

  // 카테고리 1: 소득 정보
  const [salary, setSalary] = useState("")
  const [sideIncome, setSideIncome] = useState("")
  const [incomeType, setIncomeType] = useState<"occasional" | "regular" | null>(null)

  // 카테고리 2: 가족 구성
  const [hasSpouse, setHasSpouse] = useState<boolean | null>(null)
  const [childrenCount, setChildrenCount] = useState(0)
  const [dependentsCount, setDependentsCount] = useState(0)
  const [isNewlyMarried, setIsNewlyMarried] = useState<boolean | null>(null)

  // 카테고리 3: 노후 준비
  const [pensionSavings, setPensionSavings] = useState("")
  const [irp, setIrp] = useState("")
  const [yellowUmbrella, setYellowUmbrella] = useState("")

  // 카테고리 4: 주거 관련
  const [isRenting, setIsRenting] = useState<boolean | null>(null)
  const [isHousingOwner, setIsHousingOwner] = useState<boolean | null>(null)
  const [annualRent, setAnnualRent] = useState("")
  const [housingSubscription, setHousingSubscription] = useState("")

  // 카테고리 5: 지출 내역
  const [medicalExpense, setMedicalExpense] = useState("")
  const [educationExpense, setEducationExpense] = useState("")
  const [donation, setDonation] = useState("")
  const [insurancePremium, setInsurancePremium] = useState("")
  // 신용카드/체크카드
  const [creditCardExpense, setCreditCardExpense] = useState("")
  const [debitCardExpense, setDebitCardExpense] = useState("")
  const [dontKnowCardAmount, setDontKnowCardAmount] = useState(false)
  const [totalCardExpense, setTotalCardExpense] = useState("")
  const [cardRatio, setCardRatio] = useState<"5:5" | "6:4" | "7:3" | "8:2" | "9:1">("7:3")
  // 주택담보대출 이자
  const [mortgageInterest, setMortgageInterest] = useState("")

  // 카테고리 6: 기납부 세금
  const [withholdingTax, setWithholdingTax] = useState("")
  const [sideIncomeTax, setSideIncomeTax] = useState("")
  const [use44Percent, setUse44Percent] = useState(false)

  // 결과 화면 표시 여부
  const [showResult, setShowResult] = useState(false)
  const [calculatedResult, setCalculatedResult] = useState<TaxCalculationResult | null>(null)
  const [showFormulaPopup, setShowFormulaPopup] = useState(false)
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null)
  const [tooltipAnchorEl, setTooltipAnchorEl] = useState<HTMLElement | null>(null)
  const [showTaxRateTable, setShowTaxRateTable] = useState(false)

  const infoContentByKey = useMemo(() => {
    return {
      // 요약 탭
      "summary.totalIncome": {
        title: "종합소득금액",
        body: "근로소득과 부업소득을 합친 금액이에요. 여기서 각종 공제를 빼서 세금을 계산해요.",
      },
      "summary.incomeDeduction": {
        title: "소득공제",
        body: "소득에서 미리 빼주는 금액이에요. 많이 받을수록 세금 계산 기준이 낮아져요.",
      },
      "summary.taxableIncome": {
        title: "과세표준",
        body: "종합소득금액에서 소득공제를 뺀 금액이에요. 실제로 세금을 매기는 기준이 돼요.",
      },
      "summary.calculatedTax": {
        title: "산출세액",
        body: "과세표준에 세율을 곱해서 나온 기본 세금이에요. 과세표준이 낮으면 세율도 낮아져요.",
      },
      "summary.taxCredit": {
        title: "세액공제",
        body: "계산된 기본 세금(산출세액)에서 직접 빼주는 금액이에요.",
      },
      "summary.finalTax": {
        title: "결정세액",
        body: "산출세액에서 세액공제를 뺀 최종 세금이에요.",
      },
      "summary.prepaidTax": {
        title: "기납부세액",
        body: "이미 낸 세금이에요. 회사에서 매달 원천징수한 금액과 부업에서 뗀 3.3%가 포함돼요.",
      },
      "summary.finalAmount": {
        title: "최종 납부/환급액",
        body: "실제로 내야 할 세금(결정세액)에서 이미 낸 세금(기납부세액)을 뺀 금액이에요. 플러스면 추가로 내야 하고, 마이너스면 돌려받아요.",
      },

      // 소득공제 탭
      "incomeDeduction.earnedIncomeDeduction": {
        title: "근로소득공제",
        body: "직장인이라면 누구나 자동으로 받는 공제예요. 연봉 구간에 따라 금액이 달라져요.",
      },
      "incomeDeduction.personalDeduction": {
        title: "인적공제",
        body: "본인과 부양가족 1인당 150만원씩 빼줘요. 가족이 많을수록 유리해요.",
      },
      "incomeDeduction.nationalPensionDeduction": {
        title: "국민연금 공제",
        body: "작년에 낸 국민연금 보험료 전액을 소득에서 빼줘요.",
      },
      "incomeDeduction.healthInsuranceDeduction": {
        title: "건강보험료 공제",
        body: "작년에 낸 건강보험료와 고용보험료를 소득에서 빼줘요.",
      },
      "incomeDeduction.cardDeduction": {
        title: "신용카드 공제",
        body: "카드·현금 사용금액이 연봉의 25%를 넘으면 초과분의 일부를 빼줘요. 신용카드는 15%, 체크카드·현금은 30% 공제율이에요.",
      },
      "incomeDeduction.housingSubscriptionDeduction": {
        title: "주택청약저축 공제",
        body: "무주택자가 주택청약저축에 넣은 금액의 40%를 빼줘요. 연 300만원 한도예요.",
      },
      "incomeDeduction.mortgageInterestDeduction": {
        title: "장기주택저당차입금 이자상환액",
        body: "주택담보대출 이자로 낸 금액을 소득에서 빼줘요. 연 최대 2,000만원까지 가능해요.",
      },
      "incomeDeduction.yellowUmbrellaDeduction": {
        title: "노란우산공제",
        body: "소상공인이 노란우산공제에 납입한 금액을 소득에서 빼줘요.",
      },

      // 세액공제 탭
      "taxCredit.earnedIncomeTaxCredit": {
        title: "근로소득 세액공제",
        body: "직장인이라면 자동으로 받는 세액공제예요. 산출세액의 일정 비율을 세금에서 직접 빼줘요.",
      },
      "taxCredit.childTaxCredit": {
        title: "자녀 세액공제",
        body: "8세~20세 자녀가 있으면 1명당 최대 25만원을 세금에서 빼줘요.",
      },
      "taxCredit.pensionSavingsCredit": {
        title: "연금저축·IRP 세액공제",
        body: "연금저축과 IRP에 넣은 금액의 12~15%를 세금에서 빼줘요. 합산 연 900만원 한도예요.",
      },
      "taxCredit.insuranceTaxCredit": {
        title: "보장성 보험료 세액공제",
        body: "실손·암보험 등 보장성 보험료의 12%를 세금에서 빼줘요. 연 100만원 한도예요.",
      },
      "taxCredit.medicalCredit": {
        title: "의료비 세액공제",
        body: "병원비가 연봉의 3%를 넘으면 초과분의 15%를 세금에서 빼줘요.",
      },
      "taxCredit.educationCredit": {
        title: "교육비 세액공제",
        body: "자녀 학교·유치원·어린이집 비용의 15%를 세금에서 빼줘요.",
      },
      "taxCredit.donationCredit": {
        title: "기부금 세액공제",
        body: "기부한 금액의 15~30%를 세금에서 빼줘요.",
      },
      "taxCredit.rentCredit": {
        title: "월세 세액공제",
        body: "월세로 낸 금액의 15~17%를 세금에서 빼줘요. 연 1,000만원 한도예요.",
      },
      "taxCredit.marriageCredit": {
        title: "결혼 세액공제",
        body: "2024~2026년에 혼인신고를 했다면 50만원을 세금에서 한 번만 빼줘요.",
      },

      // 기납부세액 탭
      "prepaidTax.withholding": {
        title: "근로소득 원천징수세액",
        body: "회사에서 매달 월급에서 미리 뗀 세금이에요.",
      },
      "prepaidTax.side": {
        title: "부업 원천징수세액",
        body: "부업 수입에서 3.3% 또는 4.4%로 미리 뗀 세금이에요.",
      },
    } as const
  }, [])

  const handleResultTabChange = (tab: "summary" | "incomeDeduction" | "taxCredit" | "prepaidTax") => {
    setResultTab(tab)
    requestAnimationFrame(() => {
      const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
      if (isDesktop) {
        calculatorPanelRef.current?.scrollTo({ top: 0, behavior: "auto" })
      } else {
        window.scrollTo({ top: 0, behavior: "auto" })
      }
    })
  }

  useEffect(() => {
    setActiveTooltipKey(null)
    setTooltipAnchorEl(null)
  }, [resultTab])

  useEffect(() => {
    setActiveTooltipKey(null)
    setTooltipAnchorEl(null)
  }, [activeTab])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(min-width: 768px)")

    const sync = () => {
      if (mql.matches) {
        setActiveTab("calculator")
      } else {
        setActiveTab(lastMobileTabRef.current)
      }
    }

    sync()
    // Safari < 14 fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mql as any
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", sync)
      return () => mql.removeEventListener("change", sync)
    }
    if (typeof m.addListener === "function") {
      m.addListener(sync)
      return () => m.removeListener(sync)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const isDesktop = window.matchMedia("(min-width: 768px)").matches
    if (!isDesktop) lastMobileTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    const handleScroll = () => {
      const infoEl = infoRef.current
      if (!infoEl) return
      const scrollTop = window.scrollY
      const maxScroll = infoEl.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
      setScrollProgress(Math.min(100, Math.max(0, progress)))
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // 원천징수세 자동계산 (부업소득 없이 근로소득만으로 계산한 결정세액 기준)
  const estimatedWithholding = () => {
    const salaryNum = parseNumber(salary)
    if (salaryNum <= 0) return 0

    // 카드 금액(이미 분리된 값을 그대로 사용: dontKnowCardAmount/cardRatio 로직 유지)
    let creditCardNum = 0
    let debitCardNum = 0
    if (dontKnowCardAmount) {
      const totalCard = parseNumber(totalCardExpense)
      const ratios: Record<string, [number, number]> = {
        "5:5": [0.5, 0.5],
        "6:4": [0.6, 0.4],
        "7:3": [0.7, 0.3],
        "8:2": [0.8, 0.2],
        "9:1": [0.9, 0.1],
      }
      const [creditRatio, debitRatio] = ratios[cardRatio]
      creditCardNum = Math.round(totalCard * creditRatio)
      debitCardNum = Math.round(totalCard * debitRatio)
    } else {
      creditCardNum = parseNumber(creditCardExpense)
      debitCardNum = parseNumber(debitCardExpense)
    }

    const pensionSavingsNum = parseNumber(pensionSavings)
    const irpNum = parseNumber(irp)
    const annualRentNum = parseNumber(annualRent)
    const housingSubscriptionNum = parseNumber(housingSubscription)
    const medicalExpenseNum = parseNumber(medicalExpense)
    const educationExpenseNum = parseNumber(educationExpense)
    const donationNum = parseNumber(donation)
    const insurancePremiumNum = parseNumber(insurancePremium)
    const mortgageInterestNum = parseNumber(mortgageInterest)

    // 1) 소득금액: 근로소득만
    const earnedIncomeDeduction = calculateEarnedIncomeDeduction(salaryNum)
    const earnedIncomeAmount = Math.max(0, Math.round(salaryNum - earnedIncomeDeduction))
    const totalIncomeAmount = earnedIncomeAmount

    // 2) 소득공제
    let personalDeduction = 1500000
    if (hasSpouse) personalDeduction += 1500000
    personalDeduction += childrenCount * 1500000
    personalDeduction += dependentsCount * 1500000
    personalDeduction = Math.max(0, Math.round(personalDeduction))

    const nationalPensionDeduction = Math.max(0, Math.round(salaryNum * 0.045))
    const healthInsuranceDeduction = Math.max(0, Math.round(salaryNum * 0.03991))
    const mortgageInterestDeduction = Math.max(0, Math.round(Math.min(mortgageInterestNum, 20000000)))

    const housingSubscriptionDeduction =
      isHousingOwner === true && salaryNum <= 70000000
        ? Math.max(0, Math.round(Math.min(housingSubscriptionNum, 3000000) * 0.4))
        : 0

    let cardDeduction = 0
    const cardThreshold = salaryNum * 0.25
    const totalCardSpent = creditCardNum + debitCardNum
    if (totalCardSpent > cardThreshold) {
      const creditCardExcess = Math.max(creditCardNum - cardThreshold, 0)
      const debitCardExcess = Math.max(totalCardSpent - cardThreshold - creditCardExcess, 0)
      const rawDeduction = creditCardExcess * 0.15 + debitCardExcess * 0.3
      const cardLimit = Math.min(salaryNum * 0.2, 3000000)
      cardDeduction = Math.max(0, Math.round(Math.min(rawDeduction, cardLimit)))
    }

    const yellowUmbrellaDeduction = 0

    const totalIncomeDeductionBeforeLimit =
      personalDeduction +
      nationalPensionDeduction +
      healthInsuranceDeduction +
      housingSubscriptionDeduction +
      cardDeduction +
      yellowUmbrellaDeduction +
      mortgageInterestDeduction

    const combinedLimitTarget = cardDeduction + housingSubscriptionDeduction + yellowUmbrellaDeduction
    const combinedExcess = Math.max(0, Math.round(combinedLimitTarget - 25000000))
    const totalIncomeDeduction = Math.max(0, Math.round(totalIncomeDeductionBeforeLimit - combinedExcess))

    const taxableIncome = Math.max(0, Math.round(totalIncomeAmount - totalIncomeDeduction))

    // 3) 산출세액
    const calculatedTax = calculateProgressiveTax(taxableIncome)

    // 4) 세액공제
    const earnedIncomeTaxCredit = calculateEarnedIncomeCredit(calculatedTax, salaryNum)

    let childTaxCredit = 0
    if (childrenCount <= 0) childTaxCredit = 0
    else if (childrenCount === 1) childTaxCredit = 150000
    else if (childrenCount === 2) childTaxCredit = 350000
    else childTaxCredit = 350000 + (childrenCount - 2) * 300000
    childTaxCredit = Math.max(0, Math.round(childTaxCredit))

    const pensionEligible = Math.min(Math.min(pensionSavingsNum, 6000000) + irpNum, 9000000)
    const pensionRate = salaryNum <= 55000000 ? 0.15 : 0.12
    const pensionSavingsCredit = Math.max(0, Math.round(pensionEligible * pensionRate))

    const insuranceTaxCredit = Math.max(0, Math.round(Math.min(insurancePremiumNum, 1000000) * 0.12))

    const medicalBase = Math.max(0, medicalExpenseNum - salaryNum * 0.03)
    const medicalEligible = Math.min(medicalBase, 7000000)
    const medicalCredit = Math.max(0, Math.round(medicalEligible * 0.15))

    const educationCredit = Math.max(0, Math.round(educationExpenseNum * 0.15))

    const donationCredit = Math.max(
      0,
      Math.round(Math.min(donationNum, 10000000) * 0.15 + Math.max(donationNum - 10000000, 0) * 0.3)
    )

    let rentCredit = 0
    if (isRenting === true && isHousingOwner === true) {
      const rentLimit = Math.min(annualRentNum, 10000000)
      if (salaryNum <= 55000000) rentCredit = Math.round(rentLimit * 0.17)
      else if (salaryNum <= 80000000) rentCredit = Math.round(rentLimit * 0.15)
      else rentCredit = 0
    }
    rentCredit = Math.max(0, rentCredit)

    const marriageCredit = Math.max(0, isNewlyMarried ? 500000 : 0)

    const totalTaxCredit =
      earnedIncomeTaxCredit +
      childTaxCredit +
      pensionSavingsCredit +
      insuranceTaxCredit +
      rentCredit +
      medicalCredit +
      educationCredit +
      donationCredit +
      marriageCredit

    // 결정세액(근로소득만)
    return Math.max(0, Math.round(calculatedTax - totalTaxCredit))
  }

  // 부업소득 원천징수 (3.3% 또는 4.4%)
  const estimatedSideIncomeTax = () => {
    const sideIncomeNum = parseNumber(sideIncome)
    const rate = use44Percent ? 0.044 : 0.033
    return Math.round(sideIncomeNum * rate)
  }

  // 아코디언 토글
  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // 카테고리별 완료 체크
  const isIncomeComplete = !!salary && !!sideIncome && incomeType !== null
  const isFamilyComplete = hasSpouse !== null && isNewlyMarried !== null
  const isRetirementComplete = pensionSavings !== "" && irp !== "" && (incomeType !== "regular" || yellowUmbrella !== "")
  const isHousingComplete =
    isHousingOwner !== null && isRenting !== null && housingSubscription !== "" && (isRenting === false || annualRent !== "")
  const isExpenseComplete = medicalExpense !== "" && educationExpense !== "" && donation !== "" && insurancePremium !== ""
  const isTaxPaidComplete = (withholdingTax !== "" || salary !== "") && (sideIncomeTax !== "" || sideIncome !== "")

  // CTA 버튼 활성화 조건
  const canCalculate = isIncomeComplete

  // 세금 계산 함수
  const calculateTax = (): TaxCalculationResult => {
    const salaryNum = parseNumber(salary)
    const sideIncomeNum = parseNumber(sideIncome)
    const pensionSavingsNum = parseNumber(pensionSavings)
    const irpNum = parseNumber(irp)
    const yellowUmbrellaNum = parseNumber(yellowUmbrella)
    const annualRentNum = parseNumber(annualRent)
    const housingSubscriptionNum = parseNumber(housingSubscription)
    const medicalExpenseNum = parseNumber(medicalExpense)
    const educationExpenseNum = parseNumber(educationExpense)
    const donationNum = parseNumber(donation)
    const insurancePremiumNum = parseNumber(insurancePremium)
    const mortgageInterestNum = parseNumber(mortgageInterest)
    const sideIncomeTaxNum = sideIncomeTax ? parseNumber(sideIncomeTax) : estimatedSideIncomeTax()
    
    // 연말정산 결과를 알고 있는 경우
    const yearEndFinalTaxNum = knowsYearEndResult ? parseNumber(yearEndFinalTax) : 0
    const withholdingTaxNum = knowsYearEndResult 
      ? yearEndFinalTaxNum 
      : (withholdingTax ? parseNumber(withholdingTax) : estimatedWithholding())

    // 신용카드/체크카드 금액 계산
    let creditCardNum = 0
    let debitCardNum = 0
    if (dontKnowCardAmount) {
      const totalCard = parseNumber(totalCardExpense)
      const ratios: Record<string, [number, number]> = {
        "5:5": [0.5, 0.5],
        "6:4": [0.6, 0.4],
        "7:3": [0.7, 0.3],
        "8:2": [0.8, 0.2],
        "9:1": [0.9, 0.1],
      }
      const [creditRatio, debitRatio] = ratios[cardRatio]
      creditCardNum = Math.round(totalCard * creditRatio)
      debitCardNum = Math.round(totalCard * debitRatio)
    } else {
      creditCardNum = parseNumber(creditCardExpense)
      debitCardNum = parseNumber(debitCardExpense)
    }

    // ===== 1단계 — 소득금액 =====
    const earnedIncomeDeduction = calculateEarnedIncomeDeduction(salaryNum)
    const earnedIncomeAmount = Math.max(0, Math.round(salaryNum - earnedIncomeDeduction))

    let sideIncomeAmount = 0
    let isSeparatelyTaxed = false

    if (incomeType === "occasional") {
      // 기타소득금액 = 수입금액 × 40%
      const otherIncomeAmount = Math.max(0, Math.round(sideIncomeNum * 0.4))
      if (sideIncomeNum <= 7500000) {
        sideIncomeAmount = 0
        isSeparatelyTaxed = true
      } else {
        sideIncomeAmount = otherIncomeAmount
      }
    } else if (incomeType === "regular") {
      // 사업소득금액 = 수입금액 × (1 - 0.641)
      sideIncomeAmount = Math.max(0, Math.round(sideIncomeNum * (1 - 0.641)))
    }

    const totalIncomeAmount = Math.max(0, Math.round(earnedIncomeAmount + sideIncomeAmount))

    // ===== 2단계 — 소득공제 =====
    // 인적공제 (본인 150만원 + 배우자 150만원 + 자녀 150만원×명 + 부양가족 150만원×명)
    let personalDeduction = 1500000 // 본인
    if (hasSpouse) personalDeduction += 1500000
    personalDeduction += childrenCount * 1500000
    personalDeduction += dependentsCount * 1500000
    personalDeduction = Math.max(0, Math.round(personalDeduction))

    // 연금보험료 공제 (자동계산)
    const nationalPensionDeduction = Math.max(0, Math.round(salaryNum * 0.045))
    const healthInsuranceDeduction = Math.max(0, Math.round(salaryNum * 0.03991))

    // 특별소득공제
    const mortgageInterestDeduction = Math.max(0, Math.round(Math.min(mortgageInterestNum, 20000000)))

    // 주택청약저축 소득공제 (무주택 세대주 && 총급여 7천만원 이하)
    const housingSubscriptionDeduction =
      isHousingOwner === true && salaryNum <= 70000000
        ? Math.max(0, Math.round(Math.min(housingSubscriptionNum, 3000000) * 0.4))
        : 0

    // 그밖의 소득공제: 노란우산공제 (사업소득일 때만, 사업소득금액 기준)
    let yellowUmbrellaDeduction = 0
    if (incomeType === "regular") {
      const businessIncomeAmount = sideIncomeAmount
      let limit = 0
      if (businessIncomeAmount <= 40000000) limit = 6000000
      else if (businessIncomeAmount <= 100000000) limit = 4000000
      else limit = 2000000
      yellowUmbrellaDeduction = Math.max(0, Math.round(Math.min(yellowUmbrellaNum, limit)))
    }

    // 신용카드 공제 (기존 카드 분리 로직 결과값 그대로 사용)
    const cardThreshold = salaryNum * 0.25
    const totalCardSpent = creditCardNum + debitCardNum
    let cardDeduction = 0
    if (totalCardSpent > cardThreshold) {
      const creditCardExcess = Math.max(creditCardNum - cardThreshold, 0)
      const debitCardExcess = Math.max(totalCardSpent - cardThreshold - creditCardExcess, 0)
      const rawDeduction = creditCardExcess * 0.15 + debitCardExcess * 0.3
      const cardLimit = Math.min(salaryNum * 0.2, 3000000)
      cardDeduction = Math.max(0, Math.round(Math.min(rawDeduction, cardLimit)))
    }

    // 총 소득공제
    const totalIncomeDeductionBeforeLimit =
      personalDeduction +
      nationalPensionDeduction +
      healthInsuranceDeduction +
      housingSubscriptionDeduction +
      cardDeduction +
      yellowUmbrellaDeduction +
      mortgageInterestDeduction

    // 조특법 소득공제 종합한도 (카드+주택청약+노란우산 합산 2,500만원)
    const combinedLimitTarget = cardDeduction + housingSubscriptionDeduction + yellowUmbrellaDeduction
    const combinedExcess = Math.max(0, Math.round(combinedLimitTarget - 25000000))
    const totalIncomeDeduction = Math.max(0, Math.round(totalIncomeDeductionBeforeLimit - combinedExcess))

    // 과세표준
    const taxableIncome = Math.max(0, Math.round(totalIncomeAmount - totalIncomeDeduction))

    // ===== 3단계 — 산출세액 =====
    const calculatedTax = calculateProgressiveTax(taxableIncome)

    // ===== 4단계 — 세액공제 =====
    // 근로소득 세액공제 (항상 정상 계산)
    const earnedIncomeTaxCredit = calculateEarnedIncomeCredit(calculatedTax, salaryNum)

    // 자녀 세액공제
    let childTaxCredit = 0
    if (childrenCount <= 0) childTaxCredit = 0
    else if (childrenCount === 1) childTaxCredit = 150000
    else if (childrenCount === 2) childTaxCredit = 350000
    else childTaxCredit = 350000 + (childrenCount - 2) * 300000
    childTaxCredit = Math.max(0, Math.round(childTaxCredit))

    // 연금계좌 세액공제
    const pensionEligible = Math.min(Math.min(pensionSavingsNum, 6000000) + irpNum, 9000000)
    const pensionRate = salaryNum <= 55000000 ? 0.15 : 0.12
    const pensionSavingsCredit = Math.max(0, Math.round(pensionEligible * pensionRate))

    // 보장성 보험료
    const insuranceTaxCredit = Math.max(0, Math.round(Math.min(insurancePremiumNum, 1000000) * 0.12))

    // 의료비
    const medicalBase = Math.max(0, medicalExpenseNum - salaryNum * 0.03)
    const medicalEligible = Math.min(medicalBase, 7000000)
    const medicalCredit = Math.max(0, Math.round(medicalEligible * 0.15))

    // 교육비
    const educationCredit = Math.max(0, Math.round(educationExpenseNum * 0.15))

    // 기부금
    const donationCredit = Math.max(
      0,
      Math.round(Math.min(donationNum, 10000000) * 0.15 + Math.max(donationNum - 10000000, 0) * 0.3)
    )

    // 월세 세액공제 (월세 && 무주택 세대주일 때만)
    let rentCredit = 0
    if (isRenting === true && isHousingOwner === true) {
      const rentLimit = Math.min(annualRentNum, 10000000)
      if (salaryNum <= 55000000) rentCredit = Math.round(rentLimit * 0.17)
      else if (salaryNum <= 80000000) rentCredit = Math.round(rentLimit * 0.15)
      else rentCredit = 0
    }
    rentCredit = Math.max(0, rentCredit)

    // 결혼 세액공제
    const marriageCredit = Math.max(0, isNewlyMarried ? 500000 : 0)

    // 총 세액공제
    const totalTaxCredit =
      earnedIncomeTaxCredit +
      childTaxCredit +
      pensionSavingsCredit +
      insuranceTaxCredit +
      rentCredit +
      medicalCredit +
      educationCredit +
      donationCredit +
      marriageCredit

    // ===== 5단계 — 기납부세액 및 최종 납부/환급액 =====
    const finalTax = Math.max(0, Math.round(calculatedTax - totalTaxCredit))

    const prepaidTax = Math.max(0, Math.round(withholdingTaxNum + sideIncomeTaxNum))

    const finalAmount = Math.round(finalTax - prepaidTax)

    // 연말정산 한 경우 / 안 한 경우 계산
    const withYearEndAmount = finalAmount
    const withoutYearEndTax = Math.max(0, Math.round(calculatedTax - (totalTaxCredit - earnedIncomeTaxCredit)))
    const withoutYearEndAmount = Math.round(withoutYearEndTax - prepaidTax)

    return {
      final: {
        isRefund: finalAmount < 0,
        amount: Math.abs(finalAmount),
      },
      withYearEnd: {
        isRefund: withYearEndAmount < 0,
        amount: Math.abs(withYearEndAmount),
      },
      withoutYearEnd: {
        isRefund: withoutYearEndAmount < 0,
        amount: Math.abs(withoutYearEndAmount),
      },
      isSeparatelyTaxed,
      incomeDeductions: {
        earnedIncomeDeduction,
        personalDeduction,
        nationalPensionDeduction,
        healthInsuranceDeduction,
        housingSubscriptionDeduction,
        cardDeduction,
        mortgageInterestDeduction,
        yellowUmbrellaDeduction,
      },
      taxCredits: {
        earnedIncomeTaxCredit,
        childTaxCredit,
        pensionSavingsCredit,
        insuranceTaxCredit,
        rentCredit,
        medicalCredit,
        educationCredit,
        donationCredit,
        marriageCredit,
      },
      flow: {
        totalIncome: totalIncomeAmount,
        totalIncomeDeduction,
        taxableIncome,
        calculatedTax,
        totalTaxCredit: Math.max(0, Math.round(totalTaxCredit)),
        finalTax,
        prepaidTax,
        finalAmount,
      },
    }
  }

  // 계산하기 버튼 클릭
  const handleCalculate = () => {
    const result = calculateTax()
    setCalculatedResult(result)
    setShowResult(true)
  }

  // 다시 계산하기
  const handleBackToInput = () => {
    setShowResult(false)
  }

  const tooltipInfo =
    (activeTooltipKey ? infoContentByKey[activeTooltipKey as keyof typeof infoContentByKey] : null) ?? null

  const handleInfoClick = (key: string, el: HTMLElement) => {
    setActiveTooltipKey((prev) => (prev === key ? null : key))
    setTooltipAnchorEl(el)
  }

  const infoSection = (
    <div className="p-5 pt-12 space-y-0">
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-2">
        <h1 className="text-[1.65rem] font-bold text-gray-900">종합소득세가 뭔데??!!! 💸</h1>
      </div>

      {/* 1. 종합소득세란? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">1</span>
          <h2 className="text-lg font-semibold text-gray-900">종합소득세란?</h2>
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-2">1년동안 번 <strong>&apos;모든&apos;</strong> 소득을 합쳐서 내는 세금.</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          직장 월급 외에 부업 수입이 있다면, 5월에 한 번 더 정산해야 해요.<br />
          부업 수입이 없는 직장인이라면 할 필요 없어요.
        </p>
      </section>

      {/* 2. 연말정산이랑 다른 건가요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">2</span>
          <h2 className="text-lg font-semibold text-gray-900">연말정산이랑 다른 건가요?</h2>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-[#e3eefc]">
              <tr>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2 w-[34%]">항목</th>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">연말정산</th>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">종합소득세 신고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">언제</td>
                <td className="px-3 py-2">매년 1~2월</td>
                <td className="px-3 py-2">매년 5월</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">누가</td>
                <td className="px-3 py-2">회사가 대신 처리</td>
                <td className="px-3 py-2">내가 직접 신고</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">대상 소득</td>
                <td className="px-3 py-2">월급만</td>
                <td className="px-3 py-2">모든 소득 합산</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">부업 수입</td>
                <td className="px-3 py-2">포함 안 됨</td>
                <td className="px-3 py-2">포함됨</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-500 mt-3">연말정산으로 끝난 게 아니에요. 부업 수입은 빠져 있어요.</p>
      </section>

      {/* 3. 세금이 어떻게 계산되나요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">3</span>
          <h2 className="text-lg font-semibold text-gray-900">세금이 어떻게 계산되나요?</h2>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <FormulaSvg />
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-[#e3eefc]">
              <tr>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2 w-[34%]">단계</th>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">종합소득금액 계산</td>
                <td className="px-3 py-2">근로소득 + 부업소득</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">소득 공제하기</td>
                <td className="px-3 py-2">인적공제, 연금, 카드 사용액 등을 빼요. 이 결과가 과세표준이에요.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">세율 적용하기</td>
                <td className="px-3 py-2">과세표준에 세율을 곱한 게 기본 세금이에요. 과세표준 구간에 따라 세율이 달라져요.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">세액 공제하기</td>
                <td className="px-3 py-2">기본 세금에서 자녀, 월세, 의료비 등을 직접 빼요. 이까지 계산한 결과가 결정세액(내 상황에서 최종적으로 내야 할 세금)이에요.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">기납부세액과 비교하기</td>
                <td className="px-3 py-2">결정세액과 기납부세액을 비교해서 환급받거나 추가납부를 결정해요. 기납부세액은 이미 낸 세금(연말정산분 + 부업 원천징수액)이에요.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">환급 or 추가납부</td>
                <td className="px-3 py-2">차액만큼 돌려받거나 추가로 내요</td>
              </tr>
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setShowTaxRateTable((v) => !v)}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-900"
          aria-expanded={showTaxRateTable}
        >
          <span>적용 세율 구간 보기</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTaxRateTable ? "rotate-180" : ""}`} />
        </button>

        {showTaxRateTable && (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mt-2 max-w-xs shadow-md">
            <table className="w-full">
              <thead className="bg-[#e3eefc]">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">과세표준</th>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">세율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                <tr><td className="px-3 py-2">1,400만원 이하</td><td className="px-3 py-2">6%</td></tr>
                <tr><td className="px-3 py-2">1,400만~5,000만원</td><td className="px-3 py-2">15%</td></tr>
                <tr><td className="px-3 py-2">5,000만~8,800만원</td><td className="px-3 py-2">24%</td></tr>
                <tr><td className="px-3 py-2">8,800만~1.5억원</td><td className="px-3 py-2">35%</td></tr>
                <tr><td className="px-3 py-2">1.5억~3억원</td><td className="px-3 py-2">38%</td></tr>
                <tr><td className="px-3 py-2">3억~5억원</td><td className="px-3 py-2">40%</td></tr>
                <tr><td className="px-3 py-2">5억원 초과</td><td className="px-3 py-2">45%</td></tr>
              </tbody>
            </table>
            <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500">* 2024년 귀속 기준 (소득세법 제55조)</div>
          </div>
        )}
      </section>

      {/* 4. 나는 신고해야 할까요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">4</span>
          <h2 className="text-lg font-semibold text-gray-900">나는 신고해야 할까요?</h2>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex flex-col items-center">
            <div className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-semibold text-gray-900 text-center">
              부업 수입이 있었나요?
            </div>

            <div className="w-px h-4 bg-gray-200" />

            <div className="w-full max-w-[560px] grid grid-cols-2 gap-6">
              {/* YES branch */}
              <div className="flex flex-col items-center">
                <div className="text-xs font-semibold text-gray-500">YES</div>
                <div className="w-px h-3 bg-gray-200" />

                <div className="border border-gray-200 bg-white rounded-xl px-4 py-2 text-sm font-semibold text-gray-900 text-center w-full">
                  부업 수입이 750만원을 넘나요?
                  <div className="text-xs font-normal text-gray-500 mt-1">
                    * 필요경비 60% 공제 후 기타소득금액 300만원 초과 기준
                  </div>
                </div>

                <div className="w-px h-4 bg-gray-200" />

                <div className="w-full grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-semibold text-gray-500">YES</div>
                    <div className="w-px h-3 bg-gray-200" />
                    <div className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-center w-full">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                        신고 필수
                      </span>
                      <div className="mt-2 text-xs text-gray-600">합산 의무</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="text-xs font-semibold text-gray-500">NO</div>
                    <div className="w-px h-3 bg-gray-200" />
                    <div className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-center w-full">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#3182F6]">
                        선택 가능
                      </span>
                      <div className="mt-2 text-xs text-gray-600">합산 or 분리과세</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NO branch */}
              <div className="flex flex-col items-center">
                <div className="text-xs font-semibold text-gray-500">NO</div>
                <div className="w-px h-3 bg-gray-200" />
                <div className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-center w-full">
                  <div className="mb-2 text-xs text-gray-600">연말정산으로 끝</div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    신고 불필요
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-1. 분리과세란? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">4-1</span>
          <h2 className="text-lg font-semibold text-gray-900">분리과세란?</h2>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-lg font-semibold text-gray-900">
            부업 수입과 월급을 합쳐서 세율을 계산하지 않고 따로 계산하는 것. 합산과 분리과세 중 어떤 게 유리할지 본인이 선택!!
          </p>
        </div>

        <div className="border border-gray-200 rounded-2xl p-5 bg-white max-w-[85%] mx-auto">
          <p className="text-base font-semibold text-gray-900 mb-4">
            🤔 뭐가 유리한지 어떻게 알아?!
          </p>

          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mb-4 max-w-[88%] mx-auto">
            <div className="bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
              예시 1 — 연봉 5,000만원 + 부업 수입 1,000만원, 소득공제 1,500만원
            </div>
            <table className="w-full">
              <thead className="bg-[#e3eefc]">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2 w-[34%]">항목</th>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">합산 신고</th>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">분리과세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">과세표준</td>
                  <td className="px-3 py-2">4,500만원 (5,000+1,000-1,500)</td>
                  <td className="px-3 py-2">3,500만원 (월급만 기준)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">연봉 세율</td>
                  <td className="px-3 py-2">15%</td>
                  <td className="px-3 py-2">15%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">부업 세율</td>
                  <td className="px-3 py-2">15% (합산)</td>
                  <td className="px-3 py-2">8.8% (고정)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">부업 세금</td>
                  <td className="px-3 py-2">150만원</td>
                  <td className="px-3 py-2">88만원</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">결론</td>
                  <td className="px-3 py-2 text-gray-500/70">-</td>
                  <td className="px-3 py-2 bg-emerald-50 text-emerald-700 font-semibold">분리과세 유리 ✓</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mb-4 max-w-[88%] mx-auto">
            <div className="bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
              예시 2 — 연봉 1,500만원 + 부업 수입 200만원, 소득공제 1,200만원
            </div>
            <table className="w-full">
              <thead className="bg-[#e3eefc]">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2 w-[34%]">항목</th>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">합산 신고</th>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">분리과세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">과세표준</td>
                  <td className="px-3 py-2">500만원 (1,500+200-1,200)</td>
                  <td className="px-3 py-2">300만원 (월급만 기준)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">연봉 세율</td>
                  <td className="px-3 py-2">6%</td>
                  <td className="px-3 py-2">6%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">부업 세율</td>
                  <td className="px-3 py-2">6% (합산)</td>
                  <td className="px-3 py-2">8.8% (고정)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">부업 세금</td>
                  <td className="px-3 py-2">12만원</td>
                  <td className="px-3 py-2">17.6만원</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-gray-900">결론</td>
                  <td className="px-3 py-2 bg-emerald-50 text-emerald-700 font-semibold">합산 신고 유리 ✓</td>
                  <td className="px-3 py-2 text-gray-500/70">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 max-w-[80%] mx-auto whitespace-normal break-words">
            <p className="text-sm text-amber-700 leading-relaxed">
              예시는 이해를 돕기 위해 단순 계산한 것이에요. 실제로는 부업 유형에 따라 수입 전체가 아닌 일부만 과세표준에 합산돼요.
            </p>
          </div>
        </div>

      </section>

      {/* 4-2. 부업소득도 세금을 떼고 받은 금액인가요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">4-2</span>
          <h2 className="text-lg font-semibold text-gray-900">부업소득도 세금을 떼고 받은 금액인가요?</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-gray-200 rounded-xl bg-white p-3">
            <p className="font-semibold text-gray-900 mb-2 text-sm">미리 떼는 유형 (원천징수)</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>프리랜서 용역 (3.3%)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>강의료·원고료·자문료 (8.8%)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>일부 국내 플랫폼</span>
              </li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-xl bg-white p-3">
            <p className="font-semibold text-gray-900 mb-2 text-sm">직접 신고해야 하는 유형</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>유튜브 애드센스 등 해외 플랫폼</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>원천징수 미적용 국내 플랫폼</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-600 leading-relaxed">
          <p>미리 뗐다면 이미 세금을 일부 낸 거예요. 5월 신고 때 이 금액을 빼고 정산해요.</p>
          <p>플랫폼마다 다를 수 있으니 지급명세서를 꼭 확인하세요.</p>
        </div>
      </section>

      {/* 5. 신고하려면 어떻게 해야 하나요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">5</span>
          <h2 className="text-lg font-semibold text-gray-900">신고하려면 어떻게 해야 하나요?</h2>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <p className="text-sm text-gray-700 leading-relaxed font-medium">
            홈택스에 접속하면 자동으로 해줌! 확인하고 제출만 하면 되는 경우가 대부분!
          </p>
        </div>

        <div className="relative pl-10">
          <div className="absolute left-4 top-1 bottom-1 border-l-2 border-gray-200" />

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#3182F6]">1</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">홈택스 접속 (5월 1일~31일)</p>
                <p className="text-sm text-gray-600 mt-1">세금신고 → 종합소득세 신고 → 모두채움 신고 선택</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#3182F6]">2</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">내용 확인 및 부업 수입 추가</p>
                <p className="text-sm text-gray-600 mt-1">근로소득은 자동으로 불러와져요. 부업 수입만 추가 입력하면 돼요.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#3182F6]">3</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">제출 및 납부/환급</p>
                <p className="text-sm text-gray-600 mt-1">납부할 세금이 있으면 카드·계좌이체로 바로 가능해요.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 뭐가 필요한가요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">6</span>
          <h2 className="text-lg font-semibold text-gray-900">뭐가 필요한가요?</h2>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          홈택스에서 대부분 자동으로 불러와줌! 로그인 후 조회해보고 빠진 항목만 준비해도 늦지 않다!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="border border-gray-200 rounded-xl bg-white p-3">
            <p className="font-semibold text-gray-900 mb-2 text-sm">자동으로 채워지는 것</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>근로소득</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>건강보험료·연금보험료</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>기부금</span>
              </li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-xl bg-white p-3">
            <p className="font-semibold text-gray-900 mb-2 text-sm">직접 확인이 필요할 수 있는 것</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>부업 수입 내역 (지급명세서)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>월세 계약서 + 이체 내역</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>의료비 영수증 (일부)</span>
              </li>
            </ul>
          </div>
        </div>

      </section>

      {/* 7. 단어들이 너무 어려운데요 (용어 사전) */}
      <section className="py-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">7</span>
          <h2 className="text-lg font-semibold text-gray-900">단어들이 너무 어려운데요 (용어 사전)</h2>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-[#e3eefc]">
              <tr>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2 w-[28%]">용어</th>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">과세표준 · 누진세</td>
                <td className="px-3 py-2">
                  소득이 높을수록 세율이 올라가는 구조를 누진세라고 해요. 과세표준은 어느 세율 구간인지 판단하는 기준 금액으로, 소득에서 각종 공제를
                  뺀 값이에요.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">결정세액</td>
                <td className="px-3 py-2">최종적으로 내야 할 세금이에요. 산출세액에서 각종 세액공제를 뺀 금액이에요.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">기납부세액</td>
                <td className="px-3 py-2">
                  이미 낸 세금 전부를 말해요. 회사가 월급에서 매달 뗀 세금(근로소득 원천징수) + 부업 수입에서 뗀 3.3% 또는 8.8%가 모두 포함돼요.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">원천징수</td>
                <td className="px-3 py-2">
                  수입을 받을 때 미리 떼는 세금이에요. 근로소득은 매달 월급에서, 부업은 받을 때 3.3%(프리랜서) 또는 8.8%(강의·원고료)가 자동으로
                  공제돼요.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">분리과세</td>
                <td className="px-3 py-2">부업 수입을 월급과 합산하지 않고 따로 8.8%만 내고 끝내는 방식이에요.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">필요경비</td>
                <td className="px-3 py-2">
                  부업을 위해 쓴 비용이에요. 소득공제에 포함되는 항목으로, 수입에서 먼저 빼고 나머지에만 세금을 매겨요. 기타소득은 60%가 자동 인정돼요.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )

  const calculatorContent = (
    <>
      {showResult && calculatedResult ? (
        <div className="p-5">
          {/* 다시 계산하기 */}
          <button onClick={handleBackToInput} className="flex items-center gap-2 mb-4 text-[#3182F6] font-medium">
            <ArrowLeft className="w-5 h-5" />
            다시 계산하기
          </button>

          {/* 상단: 최종 납부/환급액 */}
          <div className={`rounded-2xl p-6 mb-6 ${calculatedResult.final.isRefund ? "bg-blue-50" : "bg-red-50"}`}>
            <p
              className={`text-3xl font-bold mb-3 ${
                calculatedResult.final.isRefund ? "text-[#3182F6]" : "text-red-500"
              }`}
            >
              {calculatedResult.final.isRefund ? "돌려받을 금액" : "추가로 낼 세금"}{" "}
              {calculatedResult.final.amount.toLocaleString("ko-KR")}원
            </p>

            {calculatedResult.isSeparatelyTaxed && (
              <div className="mb-2 text-sm text-gray-600">
                부업 수입 750만원 이하로 분리과세 기준으로 계산되었습니다
              </div>
            )}

            <div className="space-y-1 text-sm text-gray-500">
              <p>
                연말정산을 하셨다면{" "}
                <span className={calculatedResult.withYearEnd.isRefund ? "text-blue-500" : "text-red-400"}>
                  {calculatedResult.withYearEnd.amount.toLocaleString("ko-KR")}원{" "}
                  {calculatedResult.withYearEnd.isRefund ? "환급" : "납부"}
                </span>
              </p>
              <p>
                연말정산을 안 하셨다면{" "}
                <span className={calculatedResult.withoutYearEnd.isRefund ? "text-blue-500" : "text-red-400"}>
                  {calculatedResult.withoutYearEnd.amount.toLocaleString("ko-KR")}원{" "}
                  {calculatedResult.withoutYearEnd.isRefund ? "환급" : "납부"}
                </span>
              </p>
            </div>
          </div>

          {/* 중단: 탭 4개 */}
          <div className="mb-4">
            <div className="flex border-b border-gray-200">
              {(["summary", "incomeDeduction", "taxCredit", "prepaidTax"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleResultTabChange(tab)}
                  className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                    resultTab === tab ? "text-[#3182F6] border-b-2 border-[#3182F6]" : "text-gray-500"
                  }`}
                >
                  {tab === "summary" && "요약"}
                  {tab === "incomeDeduction" && "소득공제"}
                  {tab === "taxCredit" && "세액공제"}
                  {tab === "prepaidTax" && "기납부세액"}
                </button>
              ))}
            </div>
          </div>

          {/* 탭 컨텐츠 */}
          {resultTab === "summary" && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">계산 흐름</h2>
                <button
                  onClick={() => setShowFormulaPopup(true)}
                  className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 active:bg-blue-200"
                  aria-label="계산 과정 보기"
                >
                  <Info className="w-3 h-3 text-[#3182F6]" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <FlowSummaryRowWithInfo
                  label="종합소득금액"
                  value={calculatedResult.flow.totalIncome}
                  infoKey="summary.totalIncome"
                  onInfoClick={handleInfoClick}
                />
                <FlowSummaryRowWithInfo
                  label="소득공제"
                  value={calculatedResult.flow.totalIncomeDeduction}
                  minus
                  infoKey="summary.incomeDeduction"
                  onInfoClick={handleInfoClick}
                />
                <FlowSummaryRowWithInfo
                  label="과세표준"
                  value={calculatedResult.flow.taxableIncome}
                  infoKey="summary.taxableIncome"
                  onInfoClick={handleInfoClick}
                />
                <FlowSummaryRowWithInfo
                  label="산출세액"
                  value={calculatedResult.flow.calculatedTax}
                  infoKey="summary.calculatedTax"
                  onInfoClick={handleInfoClick}
                />
                <FlowSummaryRowWithInfo
                  label="세액공제"
                  value={calculatedResult.flow.totalTaxCredit}
                  minus
                  infoKey="summary.taxCredit"
                  onInfoClick={handleInfoClick}
                />
                <FlowSummaryRowWithInfo
                  label="결정세액"
                  value={calculatedResult.flow.finalTax}
                  bold
                  infoKey="summary.finalTax"
                  onInfoClick={handleInfoClick}
                />
                <FlowSummaryRowWithInfo
                  label="기납부세액"
                  value={calculatedResult.flow.prepaidTax}
                  minus
                  infoKey="summary.prepaidTax"
                  onInfoClick={handleInfoClick}
                />
                <div className="border-t border-gray-200 pt-3">
                  <FlowSummaryRowWithInfo
                    label={calculatedResult.final.isRefund ? "환급액" : "납부액"}
                    value={calculatedResult.final.amount}
                    bold
                    highlight={calculatedResult.final.isRefund ? "blue" : "red"}
                    infoKey="summary.finalAmount"
                    onInfoClick={handleInfoClick}
                  />
                </div>
              </div>
            </div>
          )}

          {resultTab === "incomeDeduction" && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">소득공제 내역</h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">항목명</th>
                      <th className="text-right text-sm font-medium text-gray-600 px-4 py-3">공제 금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <DeductionRow
                      label="근로소득공제"
                      value={calculatedResult.incomeDeductions.earnedIncomeDeduction}
                      infoKey="incomeDeduction.earnedIncomeDeduction"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="인적공제"
                      value={calculatedResult.incomeDeductions.personalDeduction}
                      infoKey="incomeDeduction.personalDeduction"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="국민연금 공제"
                      value={calculatedResult.incomeDeductions.nationalPensionDeduction}
                      infoKey="incomeDeduction.nationalPensionDeduction"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="건강보험료 공제"
                      value={calculatedResult.incomeDeductions.healthInsuranceDeduction}
                      infoKey="incomeDeduction.healthInsuranceDeduction"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="신용카드 공제"
                      value={calculatedResult.incomeDeductions.cardDeduction}
                      infoKey="incomeDeduction.cardDeduction"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="주택청약저축 공제"
                      value={calculatedResult.incomeDeductions.housingSubscriptionDeduction}
                      infoKey="incomeDeduction.housingSubscriptionDeduction"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="장기주택저당차입금 이자상환액"
                      value={calculatedResult.incomeDeductions.mortgageInterestDeduction}
                      infoKey="incomeDeduction.mortgageInterestDeduction"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="노란우산공제"
                      value={calculatedResult.incomeDeductions.yellowUmbrellaDeduction}
                      infoKey="incomeDeduction.yellowUmbrellaDeduction"
                      onInfoClick={handleInfoClick}
                    />
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">합계</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {calculatedResult.flow.totalIncomeDeduction.toLocaleString("ko-KR")}원
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {resultTab === "taxCredit" && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">세액공제 내역</h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">항목명</th>
                      <th className="text-right text-sm font-medium text-gray-600 px-4 py-3">공제 금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <DeductionRow
                      label="근로소득 세액공제"
                      value={calculatedResult.taxCredits.earnedIncomeTaxCredit}
                      infoKey="taxCredit.earnedIncomeTaxCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="자녀 세액공제"
                      value={calculatedResult.taxCredits.childTaxCredit}
                      infoKey="taxCredit.childTaxCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="연금저축·IRP 세액공제"
                      value={calculatedResult.taxCredits.pensionSavingsCredit}
                      infoKey="taxCredit.pensionSavingsCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="보장성 보험료 세액공제"
                      value={calculatedResult.taxCredits.insuranceTaxCredit}
                      infoKey="taxCredit.insuranceTaxCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="의료비 세액공제"
                      value={calculatedResult.taxCredits.medicalCredit}
                      infoKey="taxCredit.medicalCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="교육비 세액공제"
                      value={calculatedResult.taxCredits.educationCredit}
                      infoKey="taxCredit.educationCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="기부금 세액공제"
                      value={calculatedResult.taxCredits.donationCredit}
                      infoKey="taxCredit.donationCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="월세 세액공제"
                      value={calculatedResult.taxCredits.rentCredit}
                      infoKey="taxCredit.rentCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="결혼 세액공제"
                      value={calculatedResult.taxCredits.marriageCredit}
                      infoKey="taxCredit.marriageCredit"
                      onInfoClick={handleInfoClick}
                    />
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">합계</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {calculatedResult.flow.totalTaxCredit.toLocaleString("ko-KR")}원
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {resultTab === "prepaidTax" && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">기납부세액 내역</h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">항목명</th>
                      <th className="text-right text-sm font-medium text-gray-600 px-4 py-3">금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <DeductionRow
                      label="근로소득 원천징수세액"
                      value={
                        calculatedResult.flow.prepaidTax - (sideIncomeTax ? parseNumber(sideIncomeTax) : estimatedSideIncomeTax())
                      }
                      infoKey="prepaidTax.withholding"
                      onInfoClick={handleInfoClick}
                    />
                    <DeductionRow
                      label="부업 원천징수세액"
                      value={sideIncomeTax ? parseNumber(sideIncomeTax) : estimatedSideIncomeTax()}
                      infoKey="prepaidTax.side"
                      onInfoClick={handleInfoClick}
                    />
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">합계</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {calculatedResult.flow.prepaidTax.toLocaleString("ko-KR")}원
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-sm text-amber-700 text-center leading-relaxed">
              이 결과는 참고용이에요. 실제 세액과 다를 수 있으니 홈택스에서 최종 확인하세요.
            </p>
          </div>
        </div>
      ) : (
        // 입력 화면은 기존 JSX를 그대로 사용 (아래 모바일/데스크탑에서 공용)
        null
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader scrollProgress={scrollProgress} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {/* 768px 이상: 좌측 메인(정보 항상 표시) */}
      <div className="hidden md:block pr-[440px]">
        <div ref={infoRef} className="max-w-[1100px] mx-auto px-8 py-8">
          {infoSection}
        </div>
      </div>

      {/* 우측 고정 계산기 패널(모바일에선 기존 중앙 레이아웃) */}
      <div
        ref={calculatorPanelRef}
        className="mx-auto max-w-[480px] bg-white min-h-screen md:fixed md:right-0 md:top-0 md:h-screen md:w-[440px] md:max-w-none md:shadow-xl md:border-l md:border-gray-200 md:overflow-y-auto"
      >
        {/* 데스크톱 패널 헤더 */}
        <div className="hidden md:flex h-14 px-4 items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1.5 rounded-full bg-gray-200" />
            <span className="text-sm font-semibold text-gray-900">종합소득세 계산기</span>
          </div>
        </div>

        {/* 탭 헤더 (모바일/태블릿 세로만 노출) */}
        <div className="md:hidden sticky top-0 z-20 flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === "calculator"
                ? "text-[#3182F6] border-b-2 border-[#3182F6]"
                : "text-gray-500"
            }`}
          >
            종합소득세 계산기
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === "info"
                ? "text-[#3182F6] border-b-2 border-[#3182F6]"
                : "text-gray-500"
            }`}
          >
            종합소득세 설명
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === "calculator" ? (
          showResult && calculatedResult ? (
            <div className="p-5">
              {/* 다시 계산하기 */}
              <button
                onClick={handleBackToInput}
                className="flex items-center gap-2 mb-4 text-[#3182F6] font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                다시 계산하기
              </button>

              {/* 상단: 최종 납부/환급액 */}
              <div
                className={`rounded-2xl p-6 mb-6 ${calculatedResult.final.isRefund ? "bg-blue-50" : "bg-red-50"}`}
              >
                <p
                  className={`text-3xl font-bold mb-3 ${
                    calculatedResult.final.isRefund ? "text-[#3182F6]" : "text-red-500"
                  }`}
                >
                  {calculatedResult.final.isRefund ? "돌려받을 금액" : "추가로 낼 세금"}{" "}
                  {calculatedResult.final.amount.toLocaleString("ko-KR")}원
                </p>

                <div className="space-y-1 text-sm text-gray-500">
                  <p>
                    연말정산을 하셨다면{" "}
                    <span className={calculatedResult.withYearEnd.isRefund ? "text-blue-500" : "text-red-400"}>
                      {calculatedResult.withYearEnd.amount.toLocaleString("ko-KR")}원{" "}
                      {calculatedResult.withYearEnd.isRefund ? "환급" : "납부"}
                    </span>
                  </p>
                  <p>
                    연말정산을 안 하셨다면{" "}
                    <span className={calculatedResult.withoutYearEnd.isRefund ? "text-blue-500" : "text-red-400"}>
                      {calculatedResult.withoutYearEnd.amount.toLocaleString("ko-KR")}원{" "}
                      {calculatedResult.withoutYearEnd.isRefund ? "환급" : "납부"}
                    </span>
                  </p>
                </div>
              </div>

              {/* 중단: 탭 4개 */}
              <div className="mb-4">
                <div className="flex border-b border-gray-200">
                  {(["summary", "incomeDeduction", "taxCredit", "prepaidTax"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleResultTabChange(tab)}
                      className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                        resultTab === tab ? "text-[#3182F6] border-b-2 border-[#3182F6]" : "text-gray-500"
                      }`}
                    >
                      {tab === "summary" && "요약"}
                      {tab === "incomeDeduction" && "소득공제"}
                      {tab === "taxCredit" && "세액공제"}
                      {tab === "prepaidTax" && "기납부세액"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 탭 컨텐츠 */}
              {resultTab === "summary" && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">계산 흐름</h2>
                    <button
                      onClick={() => setShowFormulaPopup(true)}
                      className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 active:bg-blue-200"
                      aria-label="계산 과정 보기"
                    >
                      <Info className="w-3 h-3 text-[#3182F6]" />
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <FlowSummaryRowWithInfo
                      label="종합소득금액"
                      value={calculatedResult.flow.totalIncome}
                      infoKey="summary.totalIncome"
                      onInfoClick={handleInfoClick}
                    />
                    <FlowSummaryRowWithInfo
                      label="소득공제"
                      value={calculatedResult.flow.totalIncomeDeduction}
                      minus
                      infoKey="summary.incomeDeduction"
                      onInfoClick={handleInfoClick}
                    />
                    <FlowSummaryRowWithInfo
                      label="과세표준"
                      value={calculatedResult.flow.taxableIncome}
                      infoKey="summary.taxableIncome"
                      onInfoClick={handleInfoClick}
                    />
                    <FlowSummaryRowWithInfo
                      label="산출세액"
                      value={calculatedResult.flow.calculatedTax}
                      infoKey="summary.calculatedTax"
                      onInfoClick={handleInfoClick}
                    />
                    <FlowSummaryRowWithInfo
                      label="세액공제"
                      value={calculatedResult.flow.totalTaxCredit}
                      minus
                      infoKey="summary.taxCredit"
                      onInfoClick={handleInfoClick}
                    />
                    <FlowSummaryRowWithInfo
                      label="결정세액"
                      value={calculatedResult.flow.finalTax}
                      bold
                      infoKey="summary.finalTax"
                      onInfoClick={handleInfoClick}
                    />
                    <FlowSummaryRowWithInfo
                      label="기납부세액"
                      value={calculatedResult.flow.prepaidTax}
                      minus
                      infoKey="summary.prepaidTax"
                      onInfoClick={handleInfoClick}
                    />
                    <div className="border-t border-gray-200 pt-3">
                      <FlowSummaryRowWithInfo
                        label={calculatedResult.final.isRefund ? "환급액" : "납부액"}
                        value={calculatedResult.final.amount}
                        bold
                        highlight={calculatedResult.final.isRefund ? "blue" : "red"}
                        infoKey="summary.finalAmount"
                        onInfoClick={handleInfoClick}
                      />
                    </div>
                  </div>
                </div>
              )}

              {resultTab === "incomeDeduction" && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">소득공제 내역</h2>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">항목명</th>
                          <th className="text-right text-sm font-medium text-gray-600 px-4 py-3">공제 금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <DeductionRow
                          label="근로소득공제"
                          value={calculatedResult.incomeDeductions.earnedIncomeDeduction}
                          infoKey="incomeDeduction.earnedIncomeDeduction"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="인적공제"
                          value={calculatedResult.incomeDeductions.personalDeduction}
                          infoKey="incomeDeduction.personalDeduction"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="국민연금 공제"
                          value={calculatedResult.incomeDeductions.nationalPensionDeduction}
                          infoKey="incomeDeduction.nationalPensionDeduction"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="건강보험료 공제"
                          value={calculatedResult.incomeDeductions.healthInsuranceDeduction}
                          infoKey="incomeDeduction.healthInsuranceDeduction"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="신용카드 공제"
                          value={calculatedResult.incomeDeductions.cardDeduction}
                          infoKey="incomeDeduction.cardDeduction"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="주택청약저축 공제"
                          value={calculatedResult.incomeDeductions.housingSubscriptionDeduction}
                          infoKey="incomeDeduction.housingSubscriptionDeduction"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="장기주택저당차입금 이자상환액"
                          value={calculatedResult.incomeDeductions.mortgageInterestDeduction}
                          infoKey="incomeDeduction.mortgageInterestDeduction"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="노란우산공제"
                          value={calculatedResult.incomeDeductions.yellowUmbrellaDeduction}
                          infoKey="incomeDeduction.yellowUmbrellaDeduction"
                          onInfoClick={handleInfoClick}
                        />
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">합계</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            {calculatedResult.flow.totalIncomeDeduction.toLocaleString("ko-KR")}원
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {resultTab === "taxCredit" && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">세액공제 내역</h2>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">항목명</th>
                          <th className="text-right text-sm font-medium text-gray-600 px-4 py-3">공제 금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <DeductionRow
                          label="근로소득 세액공제"
                          value={calculatedResult.taxCredits.earnedIncomeTaxCredit}
                          infoKey="taxCredit.earnedIncomeTaxCredit"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="자녀 세액공제"
                          value={calculatedResult.taxCredits.childTaxCredit}
                          infoKey="taxCredit.childTaxCredit"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="연금저축·IRP 세액공제"
                          value={calculatedResult.taxCredits.pensionSavingsCredit}
                          infoKey="taxCredit.pensionSavingsCredit"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="보장성 보험료 세액공제"
                          value={calculatedResult.taxCredits.insuranceTaxCredit}
                          infoKey="taxCredit.insuranceTaxCredit"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="의료비 세액공제"
                          value={calculatedResult.taxCredits.medicalCredit}
                          infoKey="taxCredit.medicalCredit"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="교육비 세액공제"
                          value={calculatedResult.taxCredits.educationCredit}
                          infoKey="taxCredit.educationCredit"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="기부금 세액공제"
                          value={calculatedResult.taxCredits.donationCredit}
                          infoKey="taxCredit.donationCredit"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="월세 세액공제"
                          value={calculatedResult.taxCredits.rentCredit}
                          infoKey="taxCredit.rentCredit"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="결혼 세액공제"
                          value={calculatedResult.taxCredits.marriageCredit}
                          infoKey="taxCredit.marriageCredit"
                          onInfoClick={handleInfoClick}
                        />
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">합계</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            {calculatedResult.flow.totalTaxCredit.toLocaleString("ko-KR")}원
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {resultTab === "prepaidTax" && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">기납부세액 내역</h2>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-sm font-medium text-gray-600 px-4 py-3">항목명</th>
                          <th className="text-right text-sm font-medium text-gray-600 px-4 py-3">금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <DeductionRow
                          label="근로소득 원천징수세액"
                          value={
                            calculatedResult.flow.prepaidTax -
                            (sideIncomeTax ? parseNumber(sideIncomeTax) : estimatedSideIncomeTax())
                          }
                          infoKey="prepaidTax.withholding"
                          onInfoClick={handleInfoClick}
                        />
                        <DeductionRow
                          label="부업 원천징수세액"
                          value={sideIncomeTax ? parseNumber(sideIncomeTax) : estimatedSideIncomeTax()}
                          infoKey="prepaidTax.side"
                          onInfoClick={handleInfoClick}
                        />
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">합계</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            {calculatedResult.flow.prepaidTax.toLocaleString("ko-KR")}원
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-sm text-amber-700 text-center leading-relaxed">
              이 결과는 참고용이에요. 실제 세액과 다를 수 있으니{" "}
              <a
                href="https://www.hometax.go.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline text-[#3182F6] hover:opacity-80 transition-opacity"
              >
                홈택스
                <ExternalLink size={14} />
              </a>
              에서 최종 확인하세요.
            </p>
          </div>
            </div>
          ) : (
            <div className="p-5">
            {/* 제목 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              내 종합소득세 계산하기
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              직장 다니면서 부업 소득이 있다면, 5월에 세금을 추가로 내야 할 수 있어요.
            </p>

            {/* 연말정산 여부 선택 카드 */}
            <div className="border border-gray-200 rounded-2xl p-5 mb-4 bg-white">
              <h2 className="font-semibold text-gray-900 mb-1">연말정산 결과를 알고 계신가요?</h2>
              <p className="text-xs text-gray-500 mb-4">결과를 알고 계시면 더 빠르고 정확하게 계산할 수 있어요!</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setKnowsYearEndResult(true)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    knowsYearEndResult === true
                      ? "border-[#3182F6] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{"✅"}</span>
                  <span className={`font-medium ${knowsYearEndResult === true ? "text-[#3182F6]" : "text-gray-900"}`}>
                    네, 결과를 알고 있어요
                  </span>
                </button>
                <button
                  onClick={() => setKnowsYearEndResult(false)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    knowsYearEndResult === false
                      ? "border-[#3182F6] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{"📝"}</span>
                  <span className={`font-medium ${knowsYearEndResult === false ? "text-[#3182F6]" : "text-gray-900"}`}>
                    아니요 / 잘 모르겠어요
                  </span>
                </button>
              </div>

              {/* 연말정산 결과 알고 있을 때 하위 필드 */}
              {knowsYearEndResult === true && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    연말정산 결정세액이 얼마인가요?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    원천징수영수증 73번 항목을 확인해주세요
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={yearEndFinalTax}
                      onChange={(e) => setYearEndFinalTax(formatNumber(e.target.value))}
                      placeholder="예: 1,500,000"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      원
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 아코디언 카테고리들 */}
            <div className="space-y-4">
              {/* 카테고리 1: 소득 정보 */}
              <AccordionCard
                title="내 소득 알려주세요"
                isOpen={openSections.has("income")}
                isComplete={isIncomeComplete}
                onToggle={() => toggleSection("income")}
              >
                <div className="space-y-6">
                  {/* 연봉 입력 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      작년 세전 연봉이 얼마였나요?
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={salary}
                        onChange={(e) => setSalary(formatNumber(e.target.value))}
                        placeholder="예: 40,000,000"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>

                  {/* 부업 소득 입력 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      부업으로 번 돈이 얼마인가요?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      세금 떼기 전 금액을 입력해주세요
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={sideIncome}
                        onChange={(e) => setSideIncome(formatNumber(e.target.value))}
                        placeholder="예: 5,000,000"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>

                  {/* 부업 종류 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      이 부업, 어떤 편인가요?
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      소득 종류에 따라 세금 계산 방식이 달라져요
                    </p>
                    <div className="space-y-3">
                      <IncomeTypeButton
                        emoji="🗓"
                        title="가끔 하는 일"
                        description="강연, 원고, 번역, 일회성 프로젝트"
                        isSelected={incomeType === "occasional"}
                        onClick={() => setIncomeType("occasional")}
                      />
                      <IncomeTypeButton
                        emoji="💼"
                        title="꾸준히 하는 일"
                        description="프리랜서, 유튜버, 스마트스토어"
                        isSelected={incomeType === "regular"}
                        onClick={() => setIncomeType("regular")}
                      />
                    </div>
                  </div>
                </div>
              </AccordionCard>

              {/* 카테고리 2: 가족 구성 */}
              <AccordionCard
                title="가족 구성을 알려주세요"
                isOpen={openSections.has("family")}
                isComplete={isFamilyComplete}
                onToggle={() => toggleSection("family")}
              >
                <div className="space-y-6">
                  {/* 배우자 유무 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      배우자가 있으신가요?
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      배우자의 연간 소득이 100만원 이하인 경우만 해당돼요
                    </p>
                    <ToggleButtons
                      options={[
                        { value: true, label: "있어요" },
                        { value: false, label: "없어요" },
                      ]}
                      selected={hasSpouse}
                      onChange={(v) => setHasSpouse(v)}
                    />
                  </div>

                  {/* 자녀 수 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      부양하는 자녀가 몇 명인가요?
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      만 20세 이하 자녀 기준이에요
                    </p>
                    <Stepper
                      value={childrenCount}
                      min={0}
                      max={5}
                      onChange={setChildrenCount}
                    />
                  </div>

                  {/* 부양가족 수 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      부모님 등 부양가족이 더 있나요?
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      만 60세 이상, 연간 소득 100만원 이하인 경우만 해당돼요
                    </p>
                    <Stepper
                      value={dependentsCount}
                      min={0}
                      max={5}
                      onChange={setDependentsCount}
                    />
                  </div>

                  {/* 혼인신고 여부 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      2024~2026년 사이에 혼인신고를 하셨나요?
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      해당되면 50만원 세액공제를 받을 수 있어요
                    </p>
                    <ToggleButtons
                      options={[
                        { value: true, label: "했어요" },
                        { value: false, label: "안 했어요" },
                      ]}
                      selected={isNewlyMarried}
                      onChange={(v) => setIsNewlyMarried(v)}
                    />
                  </div>
                </div>
              </AccordionCard>

              {/* 카테고리 3: 노후 준비 - 연말정산 결과 모를 때만 노출 */}
              {knowsYearEndResult !== true && (
              <AccordionCard
                title="노후 준비 하고 계신가요?"
                isOpen={openSections.has("retirement")}
                isComplete={isRetirementComplete}
                onToggle={() => toggleSection("retirement")}
              >
                <div className="space-y-6">
                  {/* 연금저축 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      연금저축에 작년 한 해 얼마 넣었나요?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      연금저축보험, 연금저축펀드 등
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={pensionSavings}
                        onChange={(e) => setPensionSavings(formatNumber(e.target.value))}
                        placeholder="없으면 0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>

                  {/* IRP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      IRP에 작년 한 해 얼마 넣었나요?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      개인형 퇴직연금 계좌
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={irp}
                        onChange={(e) => setIrp(formatNumber(e.target.value))}
                        placeholder="없으면 0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>

                  {/* 노란우산공제 - 꾸준히 하는 일 선택 시에만 노출 */}
                  {incomeType === "regular" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        노란우산공제에 작년 한 해 얼마 넣었나요?
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        소상공인 절세 상품이에요
                      </p>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={yellowUmbrella}
                          onChange={(e) => setYellowUmbrella(formatNumber(e.target.value))}
                          placeholder="없으면 0"
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                          원
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionCard>
              )}

              {/* 카테고리 4: 주거 관련 - 연말정산 결과 모를 때만 노출 */}
              {knowsYearEndResult !== true && (
              <AccordionCard
                title="주거 관련해서 알려주세요"
                isOpen={openSections.has("housing")}
                isComplete={isHousingComplete}
                onToggle={() => toggleSection("housing")}
              >
                <div className="space-y-6">
                  {/* 무주택 세대주 여부 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">무주택 세대주인가요?</label>
                    <p className="text-xs text-gray-500 mb-3">주택청약저축 소득공제와 월세 세액공제에 필요해요</p>
                    <ToggleButtons
                      options={[
                        { value: true, label: "네" },
                        { value: false, label: "아니요" },
                      ]}
                      selected={isHousingOwner}
                      onChange={(v) => setIsHousingOwner(v)}
                    />
                  </div>

                  {/* 월세 여부 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      현재 월세로 살고 계신가요?
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      무주택자이고 총급여 8천만원 이하인 경우 세액공제를 받을 수 있어요
                    </p>
                    <ToggleButtons
                      options={[
                        { value: true, label: "네, 월세예요" },
                        { value: false, label: "아니요" },
                      ]}
                      selected={isRenting}
                      onChange={(v) => setIsRenting(v)}
                    />
                  </div>

                  {/* 연간 월세 총액 - 월세 선택 시에만 노출 */}
                  {isRenting === true && (
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        작년 한 해 낸 월세 총액이 얼마인가요?
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={annualRent}
                          onChange={(e) => setAnnualRent(formatNumber(e.target.value))}
                          placeholder="예: 12,000,000"
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                          원
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 주택청약저축 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      주택청약저축에 작년 한 해 얼마 넣었나요?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      무주택자만 소득공제를 받을 수 있어요
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={housingSubscription}
                        onChange={(e) => setHousingSubscription(formatNumber(e.target.value))}
                        placeholder="없으면 0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionCard>
              )}

              {/* 카테고리 5: 지출 내역 - 연말정산 결과 모를 때만 노출 */}
              {knowsYearEndResult !== true && (
              <AccordionCard
                title="지출 내역을 알려주세요"
                isOpen={openSections.has("expense")}
                isComplete={isExpenseComplete}
                onToggle={() => toggleSection("expense")}
              >
                <div className="space-y-6">
                  {/* 병원비 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      병원비로 쓴 돈이 얼마인가요?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      본인과 가족 합산, 실손보험으로 돌려받은 금액은 빼주세요
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={medicalExpense}
                        onChange={(e) => setMedicalExpense(formatNumber(e.target.value))}
                        placeholder="없으면 0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>

                  {/* 자녀 교육비 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      자녀 교육비로 쓴 돈이 얼마인가요?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      {"학원비는 해당 안 되고, 학교·유치원·어린이집 비용만 해당돼요"}
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={educationExpense}
                        onChange={(e) => setEducationExpense(formatNumber(e.target.value))}
                        placeholder="없으면 0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>

                  {/* 기부금 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      작년에 기부한 금액이 있나요?
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={donation}
                        onChange={(e) => setDonation(formatNumber(e.target.value))}
                        placeholder="없으면 0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>

                  {/* 보장성 보험료 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      실손보험, 암보험 등 보장성 보험료를 작년에 얼마 내셨나요?
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={insurancePremium}
                        onChange={(e) => setInsurancePremium(formatNumber(e.target.value))}
                        placeholder="없으면 0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>

                  {/* 신용카드/체크카드 사용액 */}
                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      카드와 현금으로 쓴 금액을 알려주세요
                    </label>
                    <p className="text-xs text-gray-500 mb-4">
                      {"연봉의 25%를 넘게 쓴 금액부터 공제가 시작돼요"}
                    </p>

                    {!dontKnowCardAmount ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            신용카드 사용액
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={creditCardExpense}
                              onChange={(e) => setCreditCardExpense(formatNumber(e.target.value))}
                              placeholder="없으면 0"
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                              원
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            {"체크카드 · 현금영수증 사용액"}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={debitCardExpense}
                              onChange={(e) => setDebitCardExpense(formatNumber(e.target.value))}
                              placeholder="없으면 0"
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                              원
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {"카드 · 현금 총 사용액"}
                          </label>
                          <p className="text-xs text-gray-500 mb-2">
                            정확할수록 결과가 더 정확해져요
                          </p>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={totalCardExpense}
                              onChange={(e) => setTotalCardExpense(formatNumber(e.target.value))}
                              placeholder="예: 30,000,000"
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                              원
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            신용카드 : 체크카드 비율
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(["5:5", "6:4", "7:3", "8:2", "9:1"] as const).map((ratio) => (
                              <button
                                key={ratio}
                                onClick={() => setCardRatio(ratio)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  cardRatio === ratio
                                    ? "bg-[#3182F6] text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {ratio === "5:5" && "신용 5 : 체크 5"}
                                {ratio === "6:4" && "신용 6 : 체크 4"}
                                {ratio === "7:3" && "신용 7 : 체크 3"}
                                {ratio === "8:2" && "신용 8 : 체크 2"}
                                {ratio === "9:1" && "신용 9 : 체크 1"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dontKnowCardAmount}
                        onChange={(e) => setDontKnowCardAmount(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#3182F6] focus:ring-[#3182F6]"
                      />
                      <span className="text-sm text-gray-600">정확한 금액을 모르겠어요</span>
                    </label>
                  </div>

                  {/* 주택담보대출 이자 */}
                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      주택담보대출 이자로 낸 금액이 있나요?
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      작년 한 해 동안 낸 대출 이자 총액이에요. 연 최대 2,000만원까지 공제돼요
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={mortgageInterest}
                        onChange={(e) => setMortgageInterest(formatNumber(e.target.value))}
                        placeholder="없으면 0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionCard>
              )}

              {/* 카테고리 6: 기납부 세금 */}
              <AccordionCard
                title="이미 낸 세금을 알려주세요"
                isOpen={openSections.has("taxpaid")}
                isComplete={isTaxPaidComplete}
                onToggle={() => toggleSection("taxpaid")}
              >
                <div className="space-y-6">
                  {/* 원천징수 세금 - 연말정산 결과 모를 때만 노출 */}
                  {knowsYearEndResult !== true && (
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      회사에서 원천징수된 세금
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      연봉을 기준으로 대략 자동계산했어요. 정확한 금액은 원천징수영수증 61번 항목에서 확인할 수 있어요.
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={withholdingTax || formatNumber(String(estimatedWithholding()))}
                        onChange={(e) => setWithholdingTax(formatNumber(e.target.value))}
                        placeholder="0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-amber-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>이 금액은 추정값이에요. 실제와 다를 수 있어요.</span>
                    </div>
                  </div>
                  )}

                  {/* 부업 원천징수 세금 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      부업 수입에서 떼인 세금
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      일반적으로 3.3%를 원천징수해요
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={sideIncomeTax || formatNumber(String(estimatedSideIncomeTax()))}
                        onChange={(e) => setSideIncomeTax(formatNumber(e.target.value))}
                        placeholder="0"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                    {/* 4.4% 토글 */}
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={use44Percent}
                        onChange={(e) => {
                          setUse44Percent(e.target.checked)
                          setSideIncomeTax("") // 토글 시 재계산
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#3182F6] focus:ring-[#3182F6]"
                      />
                      <span className="text-sm text-gray-600">4.4% 적용하기</span>
                    </label>
                  </div>
                </div>
              </AccordionCard>
            </div>

            {/* 하단 여백 (CTA 버튼 공간 확보) */}
            <div className="h-24" />
          </div>
          )
        ) : (
          infoSection
        )}

        {/* CTA 버튼 (sticky) - 계산기 탭에서만 표시 */}
        {activeTab === "calculator" && !showResult && (
          <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-gray-100">
            <button
              onClick={handleCalculate}
              disabled={!canCalculate}
              className={`w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
                canCalculate
                  ? "bg-[#3182F6] text-white hover:bg-blue-600 active:bg-blue-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              세금 계산하기
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* 항목 설명 툴팁 카드 */}
      {tooltipInfo && tooltipAnchorEl && (
        <FloatingTooltipCard
          title={tooltipInfo.title}
          body={tooltipInfo.body}
          anchorEl={tooltipAnchorEl}
          onClose={() => {
            setActiveTooltipKey(null)
            setTooltipAnchorEl(null)
          }}
        />
      )}

      {/* 수식 팝업 (모달 유지) */}
      {showFormulaPopup && (
        <OverlayPopup title="계산 과정" onClose={() => setShowFormulaPopup(false)}>
          <div className="bg-gray-50 rounded-2xl p-4">
            <FormulaSvg />
          </div>
        </OverlayPopup>
      )}
    </div>
  )
}

// 아코디언 카드 컴포넌트
function AccordionCard({
  title,
  isOpen,
  isComplete,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  isComplete: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {isComplete && (
            <div className="w-6 h-6 rounded-full bg-[#3182F6] flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 pt-0 border-t border-gray-100">{children}</div>
      </div>
    </div>
  )
}

// 부업 종류 선택 버튼 컴포넌트
function IncomeTypeButton({
  emoji,
  title,
  description,
  isSelected,
  onClick,
}: {
  emoji: string
  title: string
  description: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
        isSelected
          ? "border-[#3182F6] bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className={`font-medium ${isSelected ? "text-[#3182F6]" : "text-gray-900"}`}>
            {title}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  )
}

// 토글 버튼 컴포넌트
function ToggleButtons<T>({
  options,
  selected,
  onChange,
}: {
  options: { value: T; label: string }[]
  selected: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="flex gap-3">
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            selected === option.value
              ? "bg-[#3182F6] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// 스테퍼 컴포넌트
function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          value <= min
            ? "bg-gray-100 text-gray-300 cursor-not-allowed"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        <Minus className="w-5 h-5" />
      </button>
      <span className="text-2xl font-semibold text-gray-900 w-8 text-center">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          value >= max
            ? "bg-gray-100 text-gray-300 cursor-not-allowed"
            : "bg-[#3182F6] text-white hover:bg-blue-600"
        }`}
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  )
}

// 공제 항목 행 컴포넌트
function DeductionRow({
  label,
  value,
  infoKey,
  onInfoClick,
}: {
  label: string
  value: number
  infoKey?: string
  onInfoClick?: (key: string, el: HTMLElement) => void
}) {
  return (
    <tr className={value === 0 ? "text-gray-400" : ""}>
      <td className="px-4 py-3 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {infoKey && onInfoClick && (
            <button
              type="button"
              onClick={(e) => onInfoClick(infoKey, e.currentTarget)}
              className="w-5 h-5 rounded-full bg-blue-50 hover:bg-blue-100 active:bg-blue-200 flex items-center justify-center flex-shrink-0"
              aria-label={`${label} 설명`}
            >
              <Info className="w-3 h-3 text-[#3182F6]" />
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-right font-medium">
        {value > 0 ? `${value.toLocaleString("ko-KR")}원` : "-"}
      </td>
    </tr>
  )
}

// 계산 흐름 요약 행 컴포넌트 (info 아이콘 포함)
function FlowSummaryRowWithInfo({
  label,
  value,
  minus,
  bold,
  highlight,
  infoKey,
  onInfoClick,
}: {
  label: string
  value: number
  minus?: boolean
  bold?: boolean
  highlight?: "blue" | "red"
  infoKey?: string
  onInfoClick?: (key: string, el: HTMLElement) => void
}) {
  const textColorClass = highlight === "blue" 
    ? "text-[#3182F6]" 
    : highlight === "red" 
    ? "text-red-500" 
    : "text-gray-800"

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-1.5">
        <span className={`text-sm ${bold ? "font-medium" : ""} text-gray-600`}>{label}</span>
        {infoKey && onInfoClick && (
          <button
            type="button"
            onClick={(e) => onInfoClick(infoKey, e.currentTarget)}
            className="w-5 h-5 rounded-full bg-blue-50 hover:bg-blue-100 active:bg-blue-200 flex items-center justify-center"
            aria-label={`${label} 설명`}
          >
            <Info className="w-3 h-3 text-[#3182F6]" />
          </button>
        )}
      </div>
      <span className={`text-sm ${bold ? "font-semibold" : ""} ${textColorClass}`}>
        {minus && "-"}
        {value.toLocaleString("ko-KR")}원
      </span>
    </div>
  )
}

function OverlayPopup({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FloatingTooltipCard({
  title,
  body,
  anchorEl,
  onClose,
}: {
  title: string
  body: string
  anchorEl: HTMLElement
  onClose: () => void
}) {
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  const [maxHeight, setMaxHeight] = useState<number>(240)

  useEffect(() => {
    const update = () => {
      const rect = anchorEl.getBoundingClientRect()
      const preferredWidth = 320
      const minWidth = 240
      const padding = 12
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight

      const width = Math.max(minWidth, Math.min(preferredWidth, viewportW - padding * 2))

      const left = Math.min(viewportW - padding - width, Math.max(padding, rect.left))
      const top = Math.min(viewportH - padding - 140, rect.bottom + 8)
      setPos({ left, top, width })

      const availableH = Math.max(140, viewportH - top - padding)
      setMaxHeight(availableH)
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [anchorEl])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (anchorEl.contains(target)) return
      const el = document.getElementById("floating-tooltip-card")
      if (el && el.contains(target)) return
      onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onPointerDown, true)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [anchorEl, onClose])

  if (!pos) return null

  return (
    <div
      id="floating-tooltip-card"
      className="fixed z-[60]"
      style={{ left: pos.left, top: pos.top, width: pos.width }}
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-gray-700 leading-relaxed overflow-auto pr-1" style={{ maxHeight }}>
          {body}
        </div>
      </div>
    </div>
  )
}

function FormulaSvg() {
  return (
    <img
      src="/decision-tax-formula.svg"
      alt="결정세액 공식"
      className="w-1/2 mx-auto h-auto select-none"
      draggable={false}
    />
  )
}

// 계산 흐름 요약 행 컴포넌트
function FlowSummaryRow({
  label,
  value,
  minus,
  bold,
  highlight,
}: {
  label: string
  value: number
  minus?: boolean
  bold?: boolean
  highlight?: "blue" | "red"
}) {
  const textColorClass = highlight === "blue" 
    ? "text-[#3182F6]" 
    : highlight === "red" 
    ? "text-red-500" 
    : "text-gray-800"

  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? "font-medium" : ""} text-gray-600`}>{label}</span>
      <span className={`text-sm ${bold ? "font-semibold" : ""} ${textColorClass}`}>
        {minus && "-"}
        {value.toLocaleString("ko-KR")}원
      </span>
    </div>
  )
}

// 흐름도 단계 컴포넌트
function FlowStep({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <div
      className={`px-4 py-2.5 rounded-xl text-sm font-medium text-center w-full ${
        highlight
          ? "bg-[#3182F6] text-white"
          : "bg-white border border-gray-200 text-gray-700"
      }`}
    >
      {text}
    </div>
  )
}

// 흐름도 화살표 컴포넌트
function FlowArrow() {
  return (
    <div className="text-gray-400">
      <ChevronDown className="w-5 h-5" />
    </div>
  )
}

// FAQ 항목 컴포넌트
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="font-medium text-gray-900 text-sm pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{answer}</div>
      </div>
    </div>
  )
}
