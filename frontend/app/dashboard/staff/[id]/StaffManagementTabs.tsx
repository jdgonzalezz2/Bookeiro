'use client'

import { useState } from 'react'
import { User, Clock } from 'lucide-react'
import EditStaffProfileClient from './EditStaffProfileClient'
import HorariosClient from './HorariosClient'

interface StaffManagementTabsProps {
  staff: any
  initialHours: any[]
}

export default function StaffManagementTabs({ staff, initialHours }: StaffManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'hours'>('hours') // Default to hours as before

  const tabStyle = (id: string) => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '0.875rem',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    zIndex: 2,
    color: activeTab === id ? 'var(--color-bg-base)' : 'var(--color-text-secondary)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
      {/* Tab Switcher - Premium Design */}
      <div style={{ 
        background: 'var(--color-bg-surface)', 
        padding: '0.4rem', 
        borderRadius: '16px', 
        display: 'flex', 
        position: 'relative',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        maxWidth: '500px'
      }}>
        {/* Sliding background */}
        <div style={{
          position: 'absolute',
          top: '0.4rem',
          bottom: '0.4rem',
          left: activeTab === 'hours' ? '0.4rem' : 'calc(50% + 0px)',
          width: 'calc(50% - 0.4rem)',
          background: 'var(--color-primary)',
          borderRadius: '12px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 12px rgba(201,168,76,0.3)',
          zIndex: 1
        }} />

        <div onClick={() => setActiveTab('hours')} style={tabStyle('hours')}>
          <Clock size={18} /> 
          <span>Horarios</span>
        </div>
        <div onClick={() => setActiveTab('profile')} style={tabStyle('profile')}>
          <User size={18} /> 
          <span>Perfil Profesional</span>
        </div>
      </div>

      {/* Content Area with smooth entrance */}
      <div key={activeTab} style={{ 
        animation: 'slideUp 0.4s ease-out both',
        width: '100%'
      }}>
        {activeTab === 'hours' ? (
          <HorariosClient staffId={staff.id} initialHours={initialHours} />
        ) : (
          <EditStaffProfileClient staff={staff} />
        )}
      </div>
    </div>
  )
}
