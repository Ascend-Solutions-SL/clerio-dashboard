"use client"

import { ReactNode } from "react"
import { Sidebar } from "@/components/Sidebar"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 transition-[margin] duration-300">
        {children}
      </main>
    </div>
  )
}
