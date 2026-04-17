"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, Check, Minus, Plus, AlertTriangle, ArrowRight, ArrowLeft, Info, X } from "lucide-react"
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
      const preferredWidth = 300
      const minWidth = 220
      const padding = 12
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight
      const width = Math.max(minWidth, Math.min(preferredWidth, viewportW - padding * 2))
      const left = Math.min(viewportW - padding - width, Math.max(padding, rect.left))
      const top = Math.min(viewportH - padding - 120, rect.bottom + 8)
      setPos({ left, top, width })
      setMaxHeight(Math.max(100, viewportH - top - padding))
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
      const el = document.getElementById("ye-floating-tooltip")
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
      id="ye-floating-tooltip"
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
        <div
          className="text-sm text-gray-700 leading-relaxed overflow-auto pr-1"
          style={{ maxHeight }}
        >
          {body}
        </div>
      </div>
    </div>
  )
}

// 결과 화면 행 컴포넌트
function InfoRow({
  label,
  value,
  minus,
  bold,
  highlight,
  dimmed,
  infoKey,
  onInfoClick,
  tag,
}: {
  label: string
  value: number
  minus?: boolean
  bold?: boolean
  highlight?: "blue" | "red"
  dimmed?: boolean
  infoKey?: string
  onInfoClick?: (key: string, el: HTMLElement) => void
  tag?: React.ReactNode
}) {
  const textColor =
    highlight === "blue"
      ? "text-[#3182F6]"
      : highlight === "red"
      ? "text-red-500"
      : dimmed
      ? "text-gray-300"
      : "text-gray-800"

  return (
    <div className={`flex justify-between items-center ${dimmed ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className={`text-sm ${bold ? "font-medium" : ""} text-gray-600 truncate`}>
          {label}
        </span>
        {tag}
        {infoKey && onInfoClick && (
          <button
            type="button"
            onClick={(e) => onInfoClick(infoKey, e.currentTarget)}
            className="w-5 h-5 rounded-full bg-blue-50 hover:bg-blue-100 active:bg-blue-200 flex items-center justify-center shrink-0"
            aria-label={`${label} 설명`}
          >
            <Info className="w-3 h-3 text-[#3182F6]" />
          </button>
        )}
      </div>
      <span className={`text-sm ml-2 shrink-0 ${bold ? "font-semibold" : ""} ${textColor}`}>
        {minus && value > 0 && "-"}
        {value.toLocaleString("ko-KR")}원
      </span>
    </div>
  )
}

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
  const [resultTab, setResultTab] = useState<"summary" | "incomeDeduction" | "taxCredit" | "prepaidTax">("summary")
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null)
  const [tooltipAnchorEl, setTooltipAnchorEl] = useState<HTMLElement | null>(null)
  const [isWithholdingEstimated, setIsWithholdingEstimated] = useState(false)
  const [showTaxRateTable, setShowTaxRateTable] = useState(false)

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

    // 원천징수 추정은 월 급여 원천징수 성격에 맞춰 근로소득 세액공제만 반영한다.
    const totalTaxCredit = earnedIncomeTaxCredit

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
    setIsWithholdingEstimated(!withholdingTax)
    setResultTab("summary")
    setActiveTooltipKey(null)
    setTooltipAnchorEl(null)
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

  // ── 탭 전환 핸들러 ──────────────────────────────────────────
  const handleResultTabChange = (tab: typeof resultTab) => {
    setResultTab(tab)
    setActiveTooltipKey(null)
    setTooltipAnchorEl(null)
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

  // ── 툴팁 핸들러 ─────────────────────────────────────────────
  const handleInfoClick = (key: string, el: HTMLElement) => {
    setActiveTooltipKey((prev) => (prev === key ? null : key))
    setTooltipAnchorEl(el)
  }

  const tooltipData: Record<string, { title: string; body: string }> = {
    // 요약 탭
    "sum.salary":     { title: "총급여", body: "세전 연봉이에요." },
    "sum.incDed":     { title: "소득공제", body: "소득에서 미리 빼주는 금액이에요. 많을수록 세금 기준이 낮아져요." },
    "sum.taxBase":    { title: "과세표준", body: "실제로 세금을 매기는 기준 금액이에요." },
    "sum.calcTax":    { title: "산출세액", body: "과세표준에 세율을 곱한 기본 세금이에요." },
    "sum.taxCredit":  { title: "세액공제", body: "기본 세금에서 직접 빼주는 금액이에요." },
    "sum.finalTax":   { title: "결정세액", body: "최종적으로 내야 할 세금이에요." },
    "sum.prepaid":    { title: "기납부세액", body: "회사가 매달 월급에서 미리 뗀 세금이에요." },
    "sum.final":      { title: "최종 납부/환급", body: "결정세액과 기납부세액의 차액이에요." },
    // 소득공제 탭
    "inc.earned":     { title: "근로소득공제", body: "직장인이라면 누구나 자동으로 받아요. 연봉 구간에 따라 금액이 달라져요." },
    "inc.personal":   { title: "인적공제", body: "본인+부양가족 1인당 150만원씩 빼줘요." },
    "inc.pension":    { title: "국민연금", body: "납입한 국민연금 보험료 전액을 빼줘요. 연봉의 4.5%예요." },
    "inc.health":     { title: "건강보험료", body: "납입한 건강·장기요양·고용보험료 전액을 빼줘요." },
    "inc.housing":    { title: "주택청약저축", body: "무주택 세대주가 납입한 금액의 40%. 연 300만원 한도예요. 최대 120만원까지 공제 가능해요." },
    "inc.lease":      { title: "전세자금대출", body: "전세대출 원금+이자 상환액의 40%. 연 400만원 한도예요. 최대 400만원까지 공제 가능해요." },
    "inc.mortgage":   { title: "주담대 이자", body: "주택담보대출 이자 상환액. 연 최대 2,000만원까지 공제돼요. 최대 800만~2,000만원까지 공제 가능해요." },
    "inc.card":       { title: "신용카드 등", body: "연봉의 25% 초과 사용액부터 공제. 신용카드 15%, 체크카드 30%예요. 최대 300만원까지 공제 가능해요." },
    // 세액공제 탭
    "tax.earned":     { title: "근로소득 세액공제", body: "직장인이라면 자동으로 받아요. 산출세액의 일정 비율을 빼줘요." },
    "tax.child":      { title: "자녀 세액공제", body: "만 7세 이상 자녀 1명 15만, 2명 35만, 3명 이상 65만원이에요." },
    "tax.pension":    { title: "연금저축·IRP", body: "납입액의 12~15%를 세금에서 빼줘요. 합산 연 900만원 한도예요. 최대 148만5천원까지 공제 가능해요. (납입액 900만×15% 기준)" },
    "tax.insurance":  { title: "보장성 보험료", body: "실손·암보험 등 납입액의 12%. 연 100만원 한도예요. 최대 12만원까지 공제 가능해요." },
    "tax.medical":    { title: "의료비", body: "연봉의 3% 초과 병원비의 15%를 빼줘요. 본인·65세이상·장애인은 한도 없이 공제돼요. 그 외 최대 700만원." },
    "tax.education":  { title: "교육비", body: "자녀 학교·유치원 비용의 15%를 빼줘요. 자녀 1인당 초중고 300만원, 대학 900만원 한도예요." },
    "tax.donation":   { title: "기부금", body: "기부액의 15~30%를 빼줘요. 1,000만원 초과분은 30% 공제율이 적용돼요." },
    "tax.rent":       { title: "월세", body: "월세액의 15~17%를 빼줘요. 연 1,000만원 한도예요. 최대 170만원까지 공제 가능해요. (납입액 1,000만×17% 기준)" },
    "tax.marriage":   { title: "혼인", body: "2024~2026년 혼인신고 시 1회 50만원 공제예요. 생애 1회, 50만원 공제예요." },
    // 기납부세액 탭
    "pre.withholding": { title: "근로소득 원천징수세액", body: "회사가 매달 월급에서 미리 뗀 세금이에요." },
  }

  // ── 계산기 컨텐츠 ────────────────────────────────────────────
  const calculatorContent = showResult && calculatedResult ? (
    // ── 결과 화면 ──────────────────────────────────────────────
    <div>
      {/* 상단 고정 영역 */}
      <div className="p-5 pb-0 space-y-4">
        {/* 다시 계산하기 */}
        <button
          onClick={() => {
            setShowResult(false)
            setActiveTooltipKey(null)
            setTooltipAnchorEl(null)
          }}
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
              calculatedResult.finalAmountAbs === 0
                ? "text-gray-700"
                : calculatedResult.isRefund
                ? "text-[#3182F6]"
                : "text-red-500"
            }`}
          >
            {calculatedResult.finalAmountAbs === 0
              ? ""
              : calculatedResult.isRefund
              ? "+"
              : "-"}
            {calculatedResult.finalAmountAbs.toLocaleString("ko-KR")}원
          </p>
          <p
            className={`text-base font-semibold ${
              calculatedResult.finalAmountAbs === 0
                ? "text-gray-700"
                : calculatedResult.isRefund
                ? "text-[#3182F6]"
                : "text-red-500"
            }`}
          >
            {calculatedResult.finalAmountAbs === 0
              ? "딱 맞게 냈어요"
              : calculatedResult.isRefund
              ? "환급 예상 💰"
              : "추가납부 예상"}
          </p>
          <p className="text-xs text-gray-400 pt-1">
            실제 금액은 회사 처리 결과에 따라 다를 수 있어요
          </p>
        </div>
      </div>

      {/* 4탭 헤더 */}
      <div className="flex border-b border-gray-200 bg-white mt-4 overflow-x-auto">
        {(
          [
            { key: "summary",         label: "요약" },
            { key: "incomeDeduction", label: "소득공제" },
            { key: "taxCredit",       label: "세액공제" },
            { key: "prepaidTax",      label: "기납부세액" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleResultTabChange(key)}
            className={`flex-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              resultTab === key
                ? "text-[#3182F6] border-b-2 border-[#3182F6]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-5 space-y-3">
        {/* ── 탭 1: 요약 ── */}
        {resultTab === "summary" && (
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <InfoRow
              label="총급여"
              value={calculatedResult.flow.salary}
              infoKey="sum.salary"
              onInfoClick={handleInfoClick}
            />
            <InfoRow
              label="- 소득공제"
              value={calculatedResult.flow.totalIncomeDeduction}
              minus
              infoKey="sum.incDed"
              onInfoClick={handleInfoClick}
            />
            <div className="border-t border-gray-200 pt-3">
              <InfoRow
                label="= 과세표준"
                value={calculatedResult.flow.taxableIncome}
                bold
                infoKey="sum.taxBase"
                onInfoClick={handleInfoClick}
              />
            </div>
            <InfoRow
              label="산출세액"
              value={calculatedResult.flow.calculatedTax}
              infoKey="sum.calcTax"
              onInfoClick={handleInfoClick}
            />
            <InfoRow
              label="- 세액공제"
              value={calculatedResult.flow.totalTaxCredit}
              minus
              infoKey="sum.taxCredit"
              onInfoClick={handleInfoClick}
            />
            <div className="border-t border-gray-200 pt-3">
              <InfoRow
                label="= 결정세액"
                value={calculatedResult.flow.finalTax}
                bold
                infoKey="sum.finalTax"
                onInfoClick={handleInfoClick}
              />
            </div>
            <InfoRow
              label="- 기납부세액"
              value={calculatedResult.flow.prepaidTax}
              minus
              infoKey="sum.prepaid"
              onInfoClick={handleInfoClick}
            />
            <div className="border-t border-gray-200 pt-3">
              <InfoRow
                label={calculatedResult.isRefund ? "= 환급액" : "= 추가납부액"}
                value={calculatedResult.finalAmountAbs}
                bold
                highlight={
                  calculatedResult.finalAmountAbs === 0
                    ? undefined
                    : calculatedResult.isRefund
                    ? "blue"
                    : "red"
                }
                infoKey="sum.final"
                onInfoClick={handleInfoClick}
              />
            </div>
          </div>
        )}

        {/* ── 탭 2: 소득공제 ── */}
        {resultTab === "incomeDeduction" && (() => {
          const d = calculatedResult.incomeDeductions
          const total =
            d.earnedIncomeDeduction +
            d.personalDeduction +
            d.nationalPensionDeduction +
            d.healthInsuranceDeduction +
            d.housingSubscriptionDeduction +
            d.leaseLoanDeduction +
            d.mortgageInterestDeduction +
            d.cardDeduction
          const items: { label: string; value: number; key: string }[] = [
            { label: "근로소득공제",      value: d.earnedIncomeDeduction,      key: "inc.earned" },
            { label: "인적공제",          value: d.personalDeduction,          key: "inc.personal" },
            { label: "국민연금",          value: d.nationalPensionDeduction,   key: "inc.pension" },
            { label: "건강보험료",        value: d.healthInsuranceDeduction,   key: "inc.health" },
            { label: "주택청약저축",      value: d.housingSubscriptionDeduction, key: "inc.housing" },
            { label: "전세자금대출 원리금", value: d.leaseLoanDeduction,       key: "inc.lease" },
            { label: "장기주택저당차입금", value: d.mortgageInterestDeduction,  key: "inc.mortgage" },
            { label: "신용카드 등",       value: d.cardDeduction,              key: "inc.card" },
          ]
          return (
            <div className="space-y-0">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                {items.map((item) => (
                  <InfoRow
                    key={item.key}
                    label={item.label}
                    value={item.value}
                    dimmed={item.value === 0}
                    infoKey={item.key}
                    onInfoClick={handleInfoClick}
                  />
                ))}
                <div className="border-t border-gray-200 pt-3">
                  <InfoRow
                    label="소득공제 합계"
                    value={total}
                    bold
                  />
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── 탭 3: 세액공제 ── */}
        {resultTab === "taxCredit" && (() => {
          const c = calculatedResult.taxCredits
          const total =
            c.earnedIncomeTaxCredit +
            c.childTaxCredit +
            c.pensionSavingsCredit +
            c.insuranceTaxCredit +
            c.medicalCredit +
            c.educationCredit +
            c.donationCredit +
            c.rentCredit +
            c.marriageCredit
          const items: { label: string; value: number; key: string }[] = [
            { label: "근로소득 세액공제", value: c.earnedIncomeTaxCredit, key: "tax.earned" },
            { label: "자녀 세액공제",     value: c.childTaxCredit,        key: "tax.child" },
            { label: "연금저축·IRP",      value: c.pensionSavingsCredit,  key: "tax.pension" },
            { label: "보장성 보험료",     value: c.insuranceTaxCredit,    key: "tax.insurance" },
            { label: "의료비",            value: c.medicalCredit,         key: "tax.medical" },
            { label: "교육비",            value: c.educationCredit,       key: "tax.education" },
            { label: "기부금",            value: c.donationCredit,        key: "tax.donation" },
            { label: "월세",              value: c.rentCredit,            key: "tax.rent" },
            { label: "혼인",              value: c.marriageCredit,        key: "tax.marriage" },
          ]
          return (
            <div className="space-y-0">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                {items.map((item) => (
                  <InfoRow
                    key={item.key}
                    label={item.label}
                    value={item.value}
                    dimmed={item.value === 0}
                    infoKey={item.key}
                    onInfoClick={handleInfoClick}
                  />
                ))}
                <div className="border-t border-gray-200 pt-3">
                  <InfoRow
                    label="세액공제 합계"
                    value={total}
                    bold
                  />
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── 탭 4: 기납부세액 ── */}
        {resultTab === "prepaidTax" && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-2xl p-4">
              <InfoRow
                label="근로소득 원천징수세액"
                value={calculatedResult.flow.prepaidTax}
                infoKey="pre.withholding"
                onInfoClick={handleInfoClick}
                tag={
                  isWithholdingEstimated ? (
                    <span className="text-xs text-amber-600 font-medium shrink-0">(추정)</span>
                  ) : undefined
                }
              />
            </div>

            {isWithholdingEstimated && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800 leading-relaxed">
                    원천징수세액을 입력하지 않아 연봉 기준으로 자동 추정했어요.
                    정확한 금액은 원천징수영수증에서 확인하세요.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  ) : (
    // ── 입력 폼 ────────────────────────────────────────────────
    <div className="p-5 space-y-4">
      {/* 제목 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">내 연말정산 간편계산기</h2>
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
          종합소득세 계산하기 →
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
              <label className="block text-sm font-medium text-gray-800 mb-3">
                만 7세 이상 자녀가 몇 명인가요?
              </label>
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
                2024년 1월 이후 혼인신고를 했나요?
              </label>
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
              <p className="text-xs text-gray-500 mb-2">연금저축보험, 연금저축펀드 등이 해당돼요</p>
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
                연금저축과 별개로 가입하는 퇴직연금 계좌예요.
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
              <label className="block text-sm font-medium text-gray-800 mb-3">
                현재 월세 살고 있나요?
              </label>
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
              <label className="block text-sm font-medium text-gray-800 mb-3">
                무주택 세대주인가요?
              </label>
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
                    전세대출을 받고 있다면 올해 갚은 원금+이자 합계 금액을 알려주세요
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
                주택담보대출을 받았다면 이자로 낸 금액을 알려주세요
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
              <label className="block text-sm font-medium text-gray-800 mb-4">
                신용카드·체크카드 사용액
              </label>

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
              <label className="block text-sm font-medium text-gray-800 mb-2">
                의료비 (총 지출액)
              </label>
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
                초·중·고·대학교 교육비만 해당돼요. 학원비는 제외예요
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
                실손보험, 암보험, 종신보험 등 보장 목적의 보험이에요.<br />
                저축성 보험은 해당 안 돼요
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
                  <span>이 금액은 입력하신 연봉으로부터 추정한 값이에요. 실제와 다를 수 있어요.</span>
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

  // ── 정보 섹션 ────────────────────────────────────────────────
  const infoSection = (
    <div className="p-5 pt-12 space-y-0">
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-2">
        <h1 className="text-[1.65rem] font-bold text-gray-900">회사원을 위한 떠먹여주는 연말정산 설명!! 💰</h1>
      </div>

      {/* 1. 연말정산이란? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">1</span>
          <h2 className="text-lg font-semibold text-gray-900">연말정산이란?</h2>
        </div>
        <p className="text-lg font-bold text-gray-900 mb-2">내가 진짜 내야 할 세금을 계산하는 것.</p>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">
          매달 월급에서 세금을 미리 뗐는데, 연말에 실제로 내야 할 세금과 비교해서<br />
          더 냈으면 돌려주고, 덜 냈으면 더 내는 과정이에요.
        </p>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            매년 1~2월, 회사가 대신 처리해줘요.<br />
            근로소득(월급)만 대상이에요.
          </p>
        </div>
      </section>

      {/* 2. 13월의 월급, 항상 받을 수 있나요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">2</span>
          <h2 className="text-lg font-semibold text-gray-900">13월의 월급, 항상 받을 수 있나요?</h2>
        </div>
        <p className="text-lg font-bold text-gray-900 mb-2">아니에요. 환급이 보장된 건 아니에요.</p>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">
          연말정산 결과는 이미 낸 세금(원천징수)과 실제 세금(결정세액)의<br />
          차이예요. 공제 항목이 많으면 환급, 적으면 추가납부가 돼요.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-700 mb-2">💰 환급 받는 경우</p>
            <p className="text-sm text-blue-700 leading-relaxed">실제 세금 &lt; 이미 낸 세금<br />→ 차액 돌려받음</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4">
            <p className="text-sm font-semibold text-red-600 mb-2">😬 추가납부 하는 경우</p>
            <p className="text-sm text-red-600 leading-relaxed">실제 세금 &gt; 이미 낸 세금<br />→ 차액 더 냄</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-700 text-sm leading-relaxed">
          공제 항목을 꼼꼼히 챙길수록 환급 가능성이 높아져요.<br />
          이 계산기로 미리 확인해보세요!
        </div>
      </section>

      {/* 3. 종합소득세랑 다른 건가요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">3</span>
          <h2 className="text-lg font-semibold text-gray-900">종합소득세랑 다른 건가요?</h2>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white mb-3">
          <table className="w-full">
            <thead className="bg-[#e3eefc]">
              <tr>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2 w-[28%]">항목</th>
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
        <p className="text-sm text-gray-500 leading-relaxed mb-3">
          부업·프리랜서 수입이 있다면 연말정산으로 끝나지 않아요.<br />
          5월에 종합소득세 신고를 따로 해야 해요.
        </p>
        <Link
          href="/"
          className="inline-block bg-gray-100 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          → 종합소득세 계산기 보러가기
        </Link>
      </section>

      {/* 4. 세금이 어떻게 계산되나요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">4</span>
          <h2 className="text-lg font-semibold text-gray-900">세금이 어떻게 계산되나요?</h2>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/decision-tax-formula.svg" className="w-1/2 mx-auto" alt="세금 계산 공식" />
        </div>

        <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white mb-4">
          <table className="w-full">
            <thead className="bg-[#e3eefc]">
              <tr>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2 w-[34%]">단계</th>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">근로소득금액 계산</td>
                <td className="px-3 py-2">연봉에서 근로소득공제를 자동으로 빼요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">소득 공제하기</td>
                <td className="px-3 py-2">인적공제, 연금, 카드 사용액 등을 빼요. 이 결과가 과세표준이에요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">세율 적용하기</td>
                <td className="px-3 py-2">과세표준에 세율을 곱한 게 기본 세금이에요. 구간에 따라 세율이 달라져요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">세액 공제하기</td>
                <td className="px-3 py-2">기본 세금에서 자녀, 월세, 의료비 등을 직접 빼요. 이게 결정세액이에요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">기납부세액과 비교</td>
                <td className="px-3 py-2">결정세액과 이미 낸 세금(원천징수)을 비교해요</td>
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
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-900"
          aria-expanded={showTaxRateTable}
        >
          <span>적용 세율 구간 보기</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTaxRateTable ? "rotate-180" : ""}`} />
        </button>

        {showTaxRateTable && (
          <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white mt-2 max-w-xs shadow-md">
            <table className="w-full">
              <thead className="bg-[#e3eefc]">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">과세표준</th>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">세율</th>
                  <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">누진공제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                <tr><td className="px-3 py-2">1,400만원 이하</td><td className="px-3 py-2">6%</td><td className="px-3 py-2">-</td></tr>
                <tr><td className="px-3 py-2">1,400만~5,000만원</td><td className="px-3 py-2">15%</td><td className="px-3 py-2">126만원</td></tr>
                <tr><td className="px-3 py-2">5,000만~8,800만원</td><td className="px-3 py-2">24%</td><td className="px-3 py-2">576만원</td></tr>
                <tr><td className="px-3 py-2">8,800만~1.5억원</td><td className="px-3 py-2">35%</td><td className="px-3 py-2">1,544만원</td></tr>
                <tr><td className="px-3 py-2">1.5억~3억원</td><td className="px-3 py-2">38%</td><td className="px-3 py-2">1,994만원</td></tr>
                <tr><td className="px-3 py-2">3억~5억원</td><td className="px-3 py-2">40%</td><td className="px-3 py-2">2,594만원</td></tr>
                <tr><td className="px-3 py-2">5억~10억원</td><td className="px-3 py-2">42%</td><td className="px-3 py-2">3,594만원</td></tr>
                <tr><td className="px-3 py-2">10억원 초과</td><td className="px-3 py-2">45%</td><td className="px-3 py-2">6,594만원</td></tr>
              </tbody>
            </table>
            <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500">* 2024년 귀속 기준 (소득세법 제55조)</div>
          </div>
        )}
      </section>

      {/* 5. 뭐가 필요한가요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">5</span>
          <h2 className="text-lg font-semibold text-gray-900">뭐가 필요한가요?</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          홈택스에서 대부분 자동으로 불러와줘요!<br />
          로그인 후 조회해보고 빠진 항목만 준비하면 돼요.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-gray-200 rounded-xl bg-white p-3">
            <p className="font-semibold text-gray-900 mb-2 text-sm">홈택스에서 자동으로</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>근로소득 원천징수영수증</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>건강보험·국민연금 납부내역</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>신용카드·현금영수증 사용액</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>기부금 내역</span>
              </li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-xl bg-white p-3">
            <p className="font-semibold text-gray-900 mb-2 text-sm">직접 챙겨야 할 수도 있는 것</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>월세 계약서 + 이체 내역</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>전세자금대출 상환 확인서</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>의료비 영수증 (일부)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>교육비 납입 영수증 (일부)</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. 단어들이 너무 어려운데요 (용어 사전) */}
      <section className="py-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">6</span>
          <h2 className="text-lg font-semibold text-gray-900">단어들이 너무 어려운데요 (용어 사전)</h2>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white">
          <table className="w-full">
            <thead className="bg-[#e3eefc]">
              <tr>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2 w-[28%]">용어</th>
                <th className="text-left text-sm font-medium text-gray-900 px-3 py-2">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">근로소득공제</td>
                <td className="px-3 py-2">직장인이라면 자동으로 받는 공제. 연봉 구간에 따라 자동 계산돼요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">과세표준</td>
                <td className="px-3 py-2">실제로 세금을 매기는 기준 금액. 소득에서 각종 공제를 뺀 값이에요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">산출세액</td>
                <td className="px-3 py-2">과세표준에 세율을 곱한 기본 세금이에요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">결정세액</td>
                <td className="px-3 py-2">최종적으로 내야 할 세금. 산출세액에서 세액공제를 뺀 금액이에요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">원천징수</td>
                <td className="px-3 py-2">회사가 월급에서 세금을 미리 떼는 것이에요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">기납부세액</td>
                <td className="px-3 py-2">이미 낸 세금 전부. 원천징수로 뗀 금액이에요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">소득공제</td>
                <td className="px-3 py-2">소득에서 미리 빼주는 금액. 많을수록 과세표준이 낮아져요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">세액공제</td>
                <td className="px-3 py-2">계산된 세금에서 직접 빼주는 금액이에요</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-900">연말정산 환급</td>
                <td className="px-3 py-2">결정세액보다 기납부세액이 많을 때 돌려받는 금액이에요</td>
              </tr>
            </tbody>
          </table>
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

      {/* 툴팁 카드 */}
      {activeTooltipKey && tooltipAnchorEl && tooltipData[activeTooltipKey] && (
        <FloatingTooltipCard
          title={tooltipData[activeTooltipKey].title}
          body={tooltipData[activeTooltipKey].body}
          anchorEl={tooltipAnchorEl}
          onClose={() => {
            setActiveTooltipKey(null)
            setTooltipAnchorEl(null)
          }}
        />
      )}
    </div>
  )
}
