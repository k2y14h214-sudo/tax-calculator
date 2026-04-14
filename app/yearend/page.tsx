"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import AppHeader from "../components/AppHeader"

export default function YearEndPage() {
  const infoRef = useRef<HTMLDivElement | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

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

  return (
    <div ref={infoRef} className="min-h-screen bg-gray-50">
      <AppHeader scrollProgress={scrollProgress} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <div className="min-h-[calc(100vh-3rem)] flex flex-col items-center justify-center px-6">
        <p className="text-xl font-semibold text-gray-900">준비중이에요 🙏</p>
        <p className="text-sm text-gray-500 mt-2">조금만 기다려주세요.</p>
        <Link href="/" className="text-sm text-[#3182F6] mt-6">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}

