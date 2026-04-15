"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, Check, Minus, Plus, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react"
import AppHeader from "../components/AppHeader"
import {
  calculateYearEndTax,
  calculateEarnedIncomeDeduction,
  calculateProgressiveTax,
  calculateEarnedIncomeCredit,
  type YearEndTaxResult,
} from "../../lib/yearend/calculate"

// ────────────────────────────────────────────────────────────────
// 유틸리티
// ────────────────────────────────────────────────────────────────

function formatNumber(value: string): string {
  const num = value.replace(/[^0-9]/g, "")
  if (!num) return ""
  return Number(num).toLocaleString("ko-KR")
}

function parseNumber(value: string): number {
  return Number(value.replace(/[^0-9]/g, "")) || 0
}

// ────────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────────────────────────

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
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 pt-0 border-t border-gray-100">{children}</div>
      </div>
    </div>
  )
}

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
      <span className="text-2xl font-semibold text-gray-900 w-8 text-center">{value}</span>
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

// ────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────

export default function YearEndCalculator() {
  const [activeTab, setActiveTab] = useState<"calculator" | "info">("calculator")
  const lastMobileTabRef = useRef<"calculator" | "info">("calculator")
  const calculatorPanelRef = useRef<HTMLDivElement | null>(null)
  const infoRef = useRef<HTMLDivElement | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  // 모바일/데스크탑 탭 동기화
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)")
    const sync = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        lastMobileTabRef.current = activeTab
        setActiveTab("calculator")
      } else {
        setActiveTab(lastMobileTabRef.current)
      }
    }
    sync(mql)
    if (mql.addEventListener) {
      mql.addEventListener("change", sync)
      return () => mql.removeEventListener("change", sync)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mql as any).addListener(sync)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return () => (mql as any).removeListener(sync)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 스크롤 진행 바
  useEffect(() => {
    const handleScroll = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches
      const el = isDesktop ? calculatorPanelRef.current : document.documentElement
      if (!el) return
      const scrollTop = isDesktop ? el.scrollTop : window.scrollY
      const scrollHeight = isDesktop
        ? el.scrollHeight - el.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0)
    }

    const isDesktop = window.matchMedia("(min-width: 768px)").matches
    const target: EventTarget =
      isDesktop && calculatorPanelRef.current ? calculatorPanelRef.current : window
    target.addEventListener("scroll", handleScroll, { passive: true })
    return () => target.removeEventListener("scroll", handleScroll)
  }, [])

  // ── 아코디언 상태 ────────────────────────────────────────────
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["income"]))

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

  // ── Section 1: 소득 ──────────────────────────────────────────
  const [salary, setSalary] = useState("")

  // ── Section 2: 가족 ──────────────────────────────────────────
  const [hasSpouse, setHasSpouse] = useState<boolean | null>(null)
  const [childrenCount, setChildrenCount] = useState(0)
  const [dependentsCount, setDependentsCount] = useState(0)
  const [isNewlyMarried, setIsNewlyMarried] = useState<boolean | null>(null)

  // ── Section 3: 노후 ──────────────────────────────────────────
  const [pensionSavings, setPensionSavings] = useState("")
  const [irp, setIrp] = useState("")

  // ── Section 4: 주거 ──────────────────────────────────────────
  const [isRenting, setIsRenting] = useState<boolean | null>(null)
  const [annualRent, setAnnualRent] = useState("")
  const [isHousingOwner, setIsHousingOwner] = useState<boolean | null>(null)
  const [housingSubscription, setHousingSubscription] = useState("")
  const [leaseLoanRepayment, setLeaseLoanRepayment] = useState("")
  const [mortgageInterest, setMortgageInterest] = useState("")

  // ── Section 5: 지출 ──────────────────────────────────────────
  const [creditCardExpense, setCreditCardExpense] = useState("")
  const [debitCardExpense, setDebitCardExpense] = useState("")
  const [dontKnowCardAmount, setDontKnowCardAmount] = useState(false)
  const [totalCardExpense, setTotalCardExpense] = useState("")
  const [cardRatio, setCardRatio] = useState<"5:5" | "6:4" | "7:3" | "8:2" | "9:1">("7:3")
  const [medicalExpense, setMedicalExpense] = useState("")
  const [educationExpense, setEducationExpense] = useState("")
  const [donation, setDonation] = useState("")
  const [insurancePremium, setInsurancePremium] = useState("")

  // ── Section 6: 기납부 세금 ───────────────────────────────────
  const [withholdingTax, setWithholdingTax] = useState("")

  // ── 결과 ────────────────────────────────────────────────────
  const [showResult, setShowResult] = useState(false)
  const [calculatedResult, setCalculatedResult] = useState<YearEndTaxResult | null>(null)

  // ── 완료 체크 ────────────────────────────────────────────────
  const isIncomeComplete = !!salary
  const isFamilyComplete = hasSpouse !== null && isNewlyMarried !== null
  const isRetirementComplete = pensionSavings !== "" && irp !== ""
  const isHousingComplete =
    isRenting !== null &&
    isHousingOwner !== null &&
    (isRenting === false || annualRent !== "")
  const isExpenseComplete =
    medicalExpense !== "" &&
    educationExpense !== "" &&
    donation !== "" &&
    insurancePremium !== ""
  const isTaxPaidComplete = withholdingTax !== "" || salary !== ""

  const canCalculate = isIncomeComplete

  // ── 원천징수 추정액 ──────────────────────────────────────────
  // 근로소득만으로 계산한 결정세액 기준 (withholdingTax 미입력 시 자동 추정)
  const estimatedWithholding = (): number => {
    const salaryNum = parseNumber(salary)
    if (salaryNum <= 0) return 0

    // 카드 금액 분리
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

    // 소득금액
    const earnedIncomeDeduction = calculateEarnedIncomeDeduction(salaryNum)
    const totalIncome = Math.max(0, Math.round(salaryNum - earnedIncomeDeduction))

    // 소득공제
    let personalDeduction = 1500000
    if (hasSpouse === true) personalDeduction += 1500000
    personalDeduction += childrenCount * 1500000
    personalDeduction += dependentsCount * 1500000

    const nationalPensionDeduction = Math.max(0, Math.round(salaryNum * 0.045))
    const healthInsuranceDeduction = Math.max(0, Math.round(salaryNum * 0.03991))

    const housingSubscriptionDeduction =
      isHousingOwner === true && salaryNum <= 70000000
        ? Math.max(0, Math.round(Math.min(parseNumber(housingSubscription), 3000000) * 0.4))
        : 0

    const leaseLoanDeduction =
      isHousingOwner === true
        ? Math.max(
            0,
            Math.round(
              Math.min(Math.min(parseNumber(leaseLoanRepayment), 40000000) * 0.4, 4000000)
            )
          )
        : 0

    const mortgageInterestDeduction = Math.max(
      0,
      Math.round(Math.min(parseNumber(mortgageInterest), 20000000))
    )

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

    const taxableIncome = Math.max(0, Math.round(totalIncome - totalIncomeDeduction))
    const calculatedTax = calculateProgressiveTax(taxableIncome)

    // 세액공제
    const earnedIncomeTaxCredit = calculateEarnedIncomeCredit(calculatedTax, salaryNum)

    let childTaxCredit = 0
    if (childrenCount === 1) childTaxCredit = 150000
    else if (childrenCount === 2) childTaxCredit = 350000
    else if (childrenCount >= 3) childTaxCredit = 350000 + (childrenCount - 2) * 300000

    const pensionEligible = Math.min(
      Math.min(parseNumber(pensionSavings), 6000000) + parseNumber(irp),
      9000000
    )
    const pensionRate = salaryNum <= 55000000 ? 0.15 : 0.12
    const pensionSavingsCredit = Math.max(0, Math.round(pensionEligible * pensionRate))

    const insuranceTaxCredit = Math.max(
      0,
      Math.round(Math.min(parseNumber(insurancePremium), 1000000) * 0.12)
    )

    const medicalBase = Math.max(0, parseNumber(medicalExpense) - salaryNum * 0.03)
    const medicalCredit = Math.max(0, Math.round(Math.min(medicalBase, 7000000) * 0.15))

    const educationCredit = Math.max(0, Math.round(parseNumber(educationExpense) * 0.15))

    const donationNum = parseNumber(donation)
    const donationCredit = Math.max(
      0,
      Math.round(Math.min(donationNum, 10000000) * 0.15 + Math.max(donationNum - 10000000, 0) * 0.3)
    )

    let rentCredit = 0
    if (isRenting === true && isHousingOwner === true) {
      const rentBase = Math.min(parseNumber(annualRent), 10000000)
      if (salaryNum <= 55000000) rentCredit = Math.round(rentBase * 0.17)
      else if (salaryNum <= 80000000) rentCredit = Math.round(rentBase * 0.15)
    }

    const marriageCredit = isNewlyMarried === true ? 500000 : 0

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

    return Math.max(0, Math.round(calculatedTax - totalTaxCredit))
  }

  // ── 계산하기 ─────────────────────────────────────────────────
  const handleCalculate = () => {
    const salaryNum = parseNumber(salary)

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

    const withholdingNum = withholdingTax
      ? parseNumber(withholdingTax)
      : estimatedWithholding()

    const result = calculateYearEndTax({
      salary: salaryNum,
      hasSpouse: hasSpouse === true,
      childrenCount,
      dependentsCount,
      isHousingOwner: isHousingOwner === true,
      housingSubscription: parseNumber(housingSubscription),
      leaseLoanRepayment: parseNumber(leaseLoanRepayment),
      mortgageInterest: parseNumber(mortgageInterest),
      creditCard: creditCardNum,
      debitCard: debitCardNum,
      pensionSavings: parseNumber(pensionSavings),
      irp: parseNumber(irp),
      insurancePremium: parseNumber(insurancePremium),
      medicalExpense: parseNumber(medicalExpense),
      educationExpense: parseNumber(educationExpense),
      donation: parseNumber(donation),
      isRenting: isRenting === true,
      annualRent: parseNumber(annualRent),
      isNewlyMarried: isNewlyMarried === true,
      withholdingTax: withholdingNum,
    })

    setCalculatedResult(result)
    setShowResult(true)

    // 스크롤 상단으로
    requestAnimationFrame(() => {
      const isDesktop =
        typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
      if (isDesktop) {
        calculatorPanelRef.current?.scrollTo({ top: 0, behavior: "auto" })
      } else {
        window.scrollTo({ top: 0, behavior: "auto" })
      }
    })
  }

  // ── 계산기 컨텐츠 ────────────────────────────────────────────
  const calculatorContent = showResult && calculatedResult ? (
    // ── 결과 화면 ──────────────────────────────────────────────
    <div className="p-5 space-y-4">
      {/* 다시 계산하기 */}
      <button
        onClick={() => setShowResult(false)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        다시 계산하기
      </button>

      {/* 메인 결과 카드 */}
      <div className="border border-gray-200 rounded-2xl bg-white p-6 text-center space-y-2">
        <p className="text-sm text-gray-500">2024년 귀속 연말정산 예상 결과</p>
        <p
          className={`text-4xl font-bold ${
            calculatedResult.isRefund ? "text-[#3182F6]" : "text-red-500"
          }`}
        >
          {calculatedResult.isRefund ? "+" : "-"}
          {calculatedResult.finalAmountAbs.toLocaleString("ko-KR")}원
        </p>
        <p
          className={`text-base font-semibold ${
            calculatedResult.isRefund ? "text-[#3182F6]" : "text-red-500"
          }`}
        >
          {calculatedResult.isRefund ? "환급 예상" : "추가납부 예상"}
        </p>
        <p className="text-xs text-gray-400 pt-1">
          실제 금액은 회사 처리 결과에 따라 다를 수 있어요
        </p>
      </div>

      {/* 계산 흐름 요약 */}
      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">계산 과정</p>
        </div>
        <table className="w-full">
          <tbody className="divide-y divide-gray-50 text-sm">
            <tr>
              <td className="px-4 py-3 text-gray-600">총급여</td>
              <td className="px-4 py-3 text-right font-medium">
                {calculatedResult.flow.salary.toLocaleString("ko-KR")}원
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-600">- 소득공제</td>
              <td className="px-4 py-3 text-right font-medium text-red-500">
                -{calculatedResult.flow.totalIncomeDeduction.toLocaleString("ko-KR")}원
              </td>
            </tr>
            <tr className="bg-blue-50/50">
              <td className="px-4 py-3 text-gray-800 font-medium">= 과세표준</td>
              <td className="px-4 py-3 text-right font-semibold">
                {calculatedResult.flow.taxableIncome.toLocaleString("ko-KR")}원
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-600">산출세액</td>
              <td className="px-4 py-3 text-right font-medium">
                {calculatedResult.flow.calculatedTax.toLocaleString("ko-KR")}원
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-600">- 세액공제</td>
              <td className="px-4 py-3 text-right font-medium text-red-500">
                -{calculatedResult.flow.totalTaxCredit.toLocaleString("ko-KR")}원
              </td>
            </tr>
            <tr className="bg-blue-50/50">
              <td className="px-4 py-3 text-gray-800 font-medium">= 결정세액</td>
              <td className="px-4 py-3 text-right font-semibold">
                {calculatedResult.flow.finalTax.toLocaleString("ko-KR")}원
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-600">- 기납부세액</td>
              <td className="px-4 py-3 text-right font-medium text-red-500">
                -{calculatedResult.flow.prepaidTax.toLocaleString("ko-KR")}원
              </td>
            </tr>
            <tr
              className={`font-semibold ${
                calculatedResult.isRefund ? "bg-blue-50" : "bg-red-50"
              }`}
            >
              <td className="px-4 py-3 text-gray-900">최종</td>
              <td
                className={`px-4 py-3 text-right text-base ${
                  calculatedResult.isRefund ? "text-[#3182F6]" : "text-red-500"
                }`}
              >
                {calculatedResult.isRefund ? "+" : "-"}
                {calculatedResult.finalAmountAbs.toLocaleString("ko-KR")}원
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Step 4에서 상세 내역 추가 예정 */}
      {/* TODO: 소득공제 항목별, 세액공제 항목별 상세 탭 (Step 4) */}

      <div className="h-6" />
    </div>
  ) : (
    // ── 입력 폼 ────────────────────────────────────────────────
    <div className="p-5 space-y-4">
      {/* 제목 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">내 연말정산 계산하기</h2>
        <p className="text-sm text-gray-500 mt-1">작년 한 해 얼마나 돌려받을 수 있는지 확인해보세요</p>
      </div>

      {/* 부업 안내 배너 */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between gap-3">
        <p className="text-sm text-amber-800 leading-relaxed">
          프리랜서·사업소득이 있다면 연말정산이 아닌 종합소득세 신고 대상이에요
        </p>
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap"
        >
          종합소득세 계산기 →
        </Link>
      </div>

      {/* 아코디언 */}
      <div className="space-y-3">

        {/* ── 섹션 1: 소득 ── */}
        <AccordionCard
          title="내 소득 알려주세요"
          isOpen={openSections.has("income")}
          isComplete={isIncomeComplete}
          onToggle={() => toggleSection("income")}
        >
          <div className="space-y-6 pt-4">
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
            </div>
          </div>
        </AccordionCard>

        {/* ── 섹션 2: 가족 ── */}
        <AccordionCard
          title="가족 구성을 알려주세요"
          isOpen={openSections.has("family")}
          isComplete={isFamilyComplete}
          onToggle={() => toggleSection("family")}
        >
          <div className="space-y-6 pt-4">
            {/* 배우자 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                배우자가 있나요?
              </label>
              <p className="text-xs text-gray-500 mb-3">
                연간 소득 100만원 이하 배우자만 해당돼요
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
                만 7세 이상 자녀가 몇 명인가요?
              </label>
              <p className="text-xs text-gray-500 mb-3">
                자녀 세액공제 대상 기준이에요
              </p>
              <Stepper
                value={childrenCount}
                min={0}
                max={10}
                onChange={setChildrenCount}
              />
            </div>

            {/* 부양가족 수 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                부양가족이 몇 명인가요?
              </label>
              <p className="text-xs text-gray-500 mb-3">
                부모님(만 60세 이상), 형제자매(만 20세 이하 또는 만 60세 이상), 연 소득 100만원 이하
              </p>
              <Stepper
                value={dependentsCount}
                min={0}
                max={10}
                onChange={setDependentsCount}
              />
            </div>

            {/* 혼인신고 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                올해 혼인신고를 했나요?
              </label>
              <p className="text-xs text-gray-500 mb-3">
                2024~2026년 혼인신고 시 50만원 세액공제를 받을 수 있어요
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

        {/* ── 섹션 3: 노후 ── */}
        <AccordionCard
          title="노후 준비 하고 계신가요?"
          isOpen={openSections.has("retirement")}
          isComplete={isRetirementComplete}
          onToggle={() => toggleSection("retirement")}
        >
          <div className="space-y-6 pt-4">
            {/* 연금저축 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                연금저축 납입액
              </label>
              <p className="text-xs text-gray-500 mb-2">연 600만원 한도 (연금저축보험·펀드 등)</p>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pensionSavings}
                  onChange={(e) => setPensionSavings(formatNumber(e.target.value))}
                  placeholder="없으면 0"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
            </div>

            {/* IRP */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                IRP 납입액
              </label>
              <p className="text-xs text-gray-500 mb-2">
                연금저축 + IRP 합산 연 900만원 한도 (개인형 퇴직연금)
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
            </div>
          </div>
        </AccordionCard>

        {/* ── 섹션 4: 주거 ── */}
        <AccordionCard
          title="주거 관련해서 알려주세요"
          isOpen={openSections.has("housing")}
          isComplete={isHousingComplete}
          onToggle={() => toggleSection("housing")}
        >
          <div className="space-y-6 pt-4">
            {/* 월세 여부 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                현재 월세 살고 있나요?
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

            {/* 연간 월세 총액 — 월세일 때만 */}
            {isRenting === true && (
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  작년 한 해 낸 월세 총액
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
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                </div>
              </div>
            )}

            {/* 무주택 세대주 여부 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                무주택 세대주인가요?
              </label>
              <p className="text-xs text-gray-500 mb-3">
                주택청약저축 공제, 전세대출 공제에 필요해요
              </p>
              <ToggleButtons
                options={[
                  { value: true, label: "네" },
                  { value: false, label: "아니요" },
                ]}
                selected={isHousingOwner}
                onChange={(v) => setIsHousingOwner(v)}
              />
            </div>

            {/* 무주택 세대주일 때만: 청약·전세 */}
            {isHousingOwner === true && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    주택청약저축 납입액
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    연 300만원 한도, 납입액의 40% 소득공제
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
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    전세자금대출 원리금 상환액
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    전세대출 원금+이자 합계. 연 400만원까지 공제 (소득세법 제52조 제5항)
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={leaseLoanRepayment}
                      onChange={(e) => setLeaseLoanRepayment(formatNumber(e.target.value))}
                      placeholder="없으면 0"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                  </div>
                </div>
              </>
            )}

            {/* 주담대 이자 — 항상 표시 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                주택담보대출 이자 상환액
              </label>
              <p className="text-xs text-gray-500 mb-2">
                연 최대 800만~2,000만원 공제 (상환방식에 따라 다름)
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
            </div>
          </div>
        </AccordionCard>

        {/* ── 섹션 5: 지출 ── */}
        <AccordionCard
          title="지출 내역을 알려주세요"
          isOpen={openSections.has("expense")}
          isComplete={isExpenseComplete}
          onToggle={() => toggleSection("expense")}
        >
          <div className="space-y-6 pt-4">
            {/* 신용카드·체크카드 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                신용카드·체크카드 사용액
              </label>
              <p className="text-xs text-gray-500 mb-4">
                연봉의 25%를 넘게 쓴 금액부터 공제가 시작돼요
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
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      체크카드 · 현금영수증 사용액
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
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      카드 · 현금 총 사용액
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={totalCardExpense}
                        onChange={(e) => setTotalCardExpense(formatNumber(e.target.value))}
                        placeholder="예: 30,000,000"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
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

            {/* 의료비 */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                의료비 (총 지출액)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                연봉의 3% 초과분부터 공제, 한도 700만원
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
            </div>

            {/* 교육비 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                교육비
              </label>
              <p className="text-xs text-gray-500 mb-2">
                자녀 학원비 제외, 학교·유치원·어린이집만 해당
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
            </div>

            {/* 기부금 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                기부금
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
            </div>

            {/* 보장성 보험료 */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                보장성 보험료
              </label>
              <p className="text-xs text-gray-500 mb-2">
                실손·암보험 등, 연 100만원 한도
              </p>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={insurancePremium}
                  onChange={(e) => setInsurancePremium(formatNumber(e.target.value))}
                  placeholder="없으면 0"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
            </div>
          </div>
        </AccordionCard>

        {/* ── 섹션 6: 기납부 세금 ── */}
        <AccordionCard
          title="이미 낸 세금을 알려주세요"
          isOpen={openSections.has("taxpaid")}
          isComplete={isTaxPaidComplete}
          onToggle={() => toggleSection("taxpaid")}
        >
          <div className="space-y-6 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                근로소득 원천징수세액
              </label>
              <p className="text-xs text-gray-500 mb-1">
                원천징수영수증의 &apos;결정세액&apos; 또는 회사에서 받은 연말정산 결과지를 확인해주세요
              </p>
              <p className="text-xs text-gray-400 mb-2">
                모르면 0으로 두세요 — 연봉 기준으로 자동 추정해드려요
              </p>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={withholdingTax || (salary ? formatNumber(String(estimatedWithholding())) : "")}
                  onChange={(e) => setWithholdingTax(formatNumber(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent text-right"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
              </div>
              {!withholdingTax && salary && (
                <div className="flex items-center gap-2 mt-2 text-xs text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>이 금액은 추정값이에요. 실제와 다를 수 있어요.</span>
                </div>
              )}
            </div>
          </div>
        </AccordionCard>
      </div>

      {/* 하단 여백 (CTA 버튼 공간 확보) */}
      <div className="h-24" />
    </div>
  )

  // ── 정보 섹션 (기존 유지) ────────────────────────────────────
  const infoSection = (
    <div className="p-5 pt-12 space-y-0">
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-2">
        <h1 className="text-[1.65rem] font-bold text-gray-900">연말정산이 뭔데??!!! 💰</h1>
      </div>

      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">1</span>
          <h2 className="text-lg font-semibold text-gray-900">연말정산이란?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">2</span>
          <h2 className="text-lg font-semibold text-gray-900">종합소득세랑 다른 건가요?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">3</span>
          <h2 className="text-lg font-semibold text-gray-900">세금이 어떻게 계산되나요?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">4</span>
          <h2 className="text-lg font-semibold text-gray-900">13월의 월급, 항상 받을 수 있나요?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">5</span>
          <h2 className="text-lg font-semibold text-gray-900">뭐가 필요한가요?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      <section className="py-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">6</span>
          <h2 className="text-lg font-semibold text-gray-900">단어들이 너무 어려운데요 (용어 사전)</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>
    </div>
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

      {/* 우측 고정 계산기 패널 */}
      <div
        ref={calculatorPanelRef}
        className="mx-auto max-w-[480px] bg-white min-h-screen md:fixed md:right-0 md:top-0 md:h-screen md:w-[440px] md:max-w-none md:shadow-xl md:border-l md:border-gray-200 md:overflow-y-auto"
      >
        {/* 데스크탑 패널 헤더 */}
        <div className="hidden md:flex h-14 px-4 items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1.5 rounded-full bg-gray-200" />
            <span className="text-sm font-semibold text-gray-900">연말정산 계산기</span>
          </div>
        </div>

        {/* 탭 헤더 (모바일만) */}
        <div className="md:hidden sticky top-0 z-20 flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === "calculator"
                ? "text-[#3182F6] border-b-2 border-[#3182F6]"
                : "text-gray-500"
            }`}
          >
            연말정산 계산기
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === "info"
                ? "text-[#3182F6] border-b-2 border-[#3182F6]"
                : "text-gray-500"
            }`}
          >
            연말정산 설명
          </button>
        </div>

        {/* 모바일: 탭에 따라 전환 */}
        <div className="md:hidden">
          {activeTab === "calculator" ? calculatorContent : infoSection}
        </div>

        {/* 데스크탑: 항상 계산기 컨텐츠 */}
        <div className="hidden md:block">{calculatorContent}</div>

        {/* CTA 버튼 — 입력 폼 + (데스크탑 OR 모바일 calculator 탭)일 때만 표시 */}
        {!showResult && (activeTab === "calculator") && (
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
    </div>
  )
}
