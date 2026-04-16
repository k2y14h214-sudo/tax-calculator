"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

export default function AppHeader({
  scrollProgress,
  menuOpen,
  setMenuOpen,
}: {
  scrollProgress: number
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
}) {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <>
      <header className="h-12 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="h-full px-4 flex items-center gap-3 relative">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center"
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-sm font-medium text-gray-900">내가 쓰려고 만든 페이지</span>

          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-200">
            <div
              className="h-0.5 bg-gray-900 transition-all duration-100"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Overlay */}
      {menuOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Side panel */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white z-50 transition-transform duration-200 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="사이드 메뉴"
      >
        <div className="h-12 px-4 flex items-center justify-between border-b border-gray-100">
          <span className="text-sm font-medium text-gray-900">내가 쓰려고 만든 페이지</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center"
            aria-label="메뉴 닫기"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <nav>
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className={`block px-4 py-3 border-b border-gray-100 text-sm ${
              isHome ? "text-[#3182F6] font-semibold" : "text-gray-700"
            }`}
          >
            종합소득세 계산기
          </Link>

          <Link
            href="/yearend"
            onClick={() => setMenuOpen(false)}
            className={`block px-4 py-3 border-b border-gray-100 text-sm ${
              pathname === "/yearend" ? "text-[#3182F6] font-semibold" : "text-gray-700"
            }`}
          >
            연말정산
          </Link>
        </nav>
      </div>
    </>
  )
}

