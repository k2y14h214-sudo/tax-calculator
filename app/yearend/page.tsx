"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import AppHeader from "../components/AppHeader"

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
    const target: EventTarget = isDesktop && calculatorPanelRef.current
      ? calculatorPanelRef.current
      : window
    target.addEventListener("scroll", handleScroll, { passive: true })
    return () => target.removeEventListener("scroll", handleScroll)
  }, [])

  const infoSection = (
    <div className="p-5 pt-12 space-y-0">
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-2">
        <h1 className="text-[1.65rem] font-bold text-gray-900">연말정산이 뭔데??!!! 💰</h1>
      </div>

      {/* 1. 연말정산이란? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">1</span>
          <h2 className="text-lg font-semibold text-gray-900">연말정산이란?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      {/* 2. 종합소득세랑 다른 건가요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">2</span>
          <h2 className="text-lg font-semibold text-gray-900">종합소득세랑 다른 건가요?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      {/* 3. 세금이 어떻게 계산되나요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">3</span>
          <h2 className="text-lg font-semibold text-gray-900">세금이 어떻게 계산되나요?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      {/* 4. 13월의 월급, 항상 받을 수 있나요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">4</span>
          <h2 className="text-lg font-semibold text-gray-900">13월의 월급, 항상 받을 수 있나요?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      {/* 5. 뭐가 필요한가요? */}
      <section className="py-8 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-[#3182F6]">5</span>
          <h2 className="text-lg font-semibold text-gray-900">뭐가 필요한가요?</h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-sm text-gray-500">준비 중입니다.</p>
        </div>
      </section>

      {/* 6. 단어들이 너무 어려운데요 */}
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

  const calculatorContent = (
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

      {/* 준비 중 플레이스홀더 */}
      <div className="border border-gray-200 rounded-2xl bg-white p-5 flex flex-col items-center justify-center gap-3 min-h-[200px]">
        <span className="text-4xl">🚧</span>
        <p className="text-base font-semibold text-gray-700">준비 중입니다</p>
        <p className="text-sm text-gray-400 text-center">
          연말정산 계산기를 열심히 만들고 있어요.
          <br />
          조금만 기다려 주세요!
        </p>
      </div>
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

      {/* 우측 고정 계산기 패널(모바일에선 중앙 레이아웃) */}
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

        {/* 탭 헤더 (모바일/태블릿만 노출) */}
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
        <div className="hidden md:block">
          {calculatorContent}
        </div>
      </div>
    </div>
  )
}
