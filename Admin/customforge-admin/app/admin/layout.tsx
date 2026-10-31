"use client"

import type React from "react"

import { useState } from "react"
import { Sidebar } from "./components/sidebar"
import { Topbar } from "./components/topbar"
import { ApiProvider } from "./components/api-provider"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ApiProvider>
      <div className="fa-workspace">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />

        {/* Main Content */}
        <div className="fa-workspace-main">
          {/* Topbar */}
          <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          {/* Page Content */}
          <main id="admin-main-content" className="fa-main-content" tabIndex={-1}>
            <div className="fa-content-wrap">{children}</div>
          </main>
        </div>
      </div>
    </ApiProvider>
  )
}
