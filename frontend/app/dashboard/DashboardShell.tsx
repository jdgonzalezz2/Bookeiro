'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { Scissors, Menu, X } from 'lucide-react'

interface DashboardShellProps {
  children: React.ReactNode
  profile: any
  tenant: any
}

export default function DashboardShell({ children, profile, tenant }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="dashboard-root">
      {/* Mobile Header Bar */}
      <div className="mobile-header">
        <div className="dashboard-sidebar-logo" style={{ padding: 0, border: 'none' }}>
          <div className="dashboard-sidebar-logo-icon">
            <Scissors strokeWidth={2.5} size={18} />
          </div>
          <span className="dashboard-sidebar-logo-name">Bookeiro</span>
        </div>
        <button onClick={toggleSidebar} className="mobile-menu-toggle" aria-label="Abrir menú">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay for mobile — outside wrapper so it covers full screen */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      {/* Sidebar with state class */}
      <div className={`dashboard-sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar profile={profile} tenant={tenant} onClose={closeSidebar} />
      </div>

      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
