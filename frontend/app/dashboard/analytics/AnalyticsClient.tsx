'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { DollarSign, Calendar as CalendarIcon, TrendingUp, AlertTriangle, Users2, Activity } from 'lucide-react'

const PIE_COLORS = ['#c9a84c', '#e8cc7a', '#3498db', '#9b59b6', '#2ecc71', '#e74c3c'];

export default function AnalyticsClient({ initialData }: { initialData: any[] }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 10000)
    return () => clearInterval(interval)
  }, [router])

  // --- FILTERS ---
  const validApps = useMemo(() => initialData.filter(a => a.status === 'confirmed' || a.status === 'completed'), [initialData])
  const cancelledApps = useMemo(() => initialData.filter(a => a.status === 'cancelled'), [initialData])

  // --- KPIs ---
  const totalRevenue = useMemo(() => validApps.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0), [validApps])
  const totalAppointments = validApps.length
  const avgTicket = totalAppointments > 0 ? (totalRevenue / totalAppointments).toFixed(2) : '0.00'
  
  const cancellationRate = initialData.length > 0 
    ? ((cancelledApps.length / initialData.length) * 100).toFixed(1) 
    : '0.0'

  // --- AGGREGATE: Daily Trend ---
  const dailyData = useMemo(() => {
    const map = new Map<string, number>()
    validApps.forEach(app => {
       const dateStr = new Date(app.start_time).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
       map.set(dateStr, (map.get(dateStr) || 0) + Number(app.total_price || 0))
    })
    return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }))
  }, [validApps])

  // --- AGGREGATE: Staff Performance ---
  const staffData = useMemo(() => {
    const map = new Map<string, number>()
    validApps.forEach(app => {
      const staffName = app.staff?.name?.split(' ')[0] || 'Desconocido'
      map.set(staffName, (map.get(staffName) || 0) + Number(app.total_price || 0))
    })
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5) // Top 5
  }, [validApps])

  // --- AGGREGATE: Popular Services ---
  const servicesData = useMemo(() => {
    const map = new Map<string, number>()
    validApps.forEach(app => {
      const srvName = app.services?.name || 'Otro'
      map.set(srvName, (map.get(srvName) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [validApps])

  // --- AGGREGATE: Busiest Hours ---
  const heatmapData = useMemo(() => {
    const map = new Map<string, number>()
    validApps.forEach(app => {
      const hour = new Date(app.start_time).getHours()
      // e.g. "10:00"
      const label = `${hour.toString().padStart(2, '0')}:00`
      map.set(label, (map.get(label) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
  }, [validApps])

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-glass-border)', padding: '10px 15px', borderRadius: '8px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>{label || payload[0].name}</p>
          <p style={{ margin: 0, fontWeight: 700, color: payload[0].color || 'var(--color-primary)' }}>
            {payload[0].dataKey === 'revenue' || payload[0].dataKey === 'total' 
              ? `$${payload[0].value.toLocaleString()}` 
              : `${payload[0].value} Citas`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      
      {/* 4 KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <KpiCard icon={<DollarSign size={28} color="#2ecc71" />} title="Ingreso Bruto" value={`$${totalRevenue.toLocaleString()}`} bg="rgba(46, 204, 113, 0.1)" />
        <KpiCard icon={<CalendarIcon size={28} color="var(--color-primary)" />} title="Volumen (Citas)" value={totalAppointments} bg="rgba(201, 168, 76, 0.1)" />
        <KpiCard icon={<TrendingUp size={28} color="#3498db" />} title="Ticket Promedio" value={`$${avgTicket}`} bg="rgba(52, 152, 219, 0.1)" />
        <KpiCard 
           icon={<AlertTriangle size={28} color={Number(cancellationRate) > 15 ? "#e74c3c" : "#f1c40f"} />} 
           title="Tasa de Cancelación" 
           value={`${cancellationRate}%`} 
           bg={Number(cancellationRate) > 15 ? "rgba(231, 76, 60, 0.1)" : "rgba(241, 196, 15, 0.1)"} 
           subtitle={`${cancelledApps.length} nulas`}
        />
      </div>

      {/* Primary Chart: Revenue Trend */}
      <div className="dashboard-module-card" style={{ marginBottom: '1.5rem', minHeight: '380px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)' }}>
           <Activity size={20} className="text-primary"/> Tendencia de Ingresos Diarios
        </h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip content={<CustomChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </div>

      {/* Grid for Secondary Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Staff Performance */}
        <div className="dashboard-module-card" style={{ minHeight: '340px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users2 size={18} /> Rendimiento de Barberos
          </h3>
          {staffData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart layout="vertical" data={staffData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#fff', fontSize: 13 }} width={80} />
                <Tooltip content={<CustomChartTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </div>

        {/* Popular Services */}
        <div className="dashboard-module-card" style={{ minHeight: '340px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Servicios Más Solicitados
          </h3>
          {servicesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={servicesData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="count">
                  {servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(255,255,255,0.05)" />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </div>

        {/* Heatmap (Busiest Hours) */}
        <div className="dashboard-module-card" style={{ minHeight: '340px', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Zonas Horarias Calientes (Demanda)
          </h3>
          {heatmapData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={heatmapData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                <Bar dataKey="count" fill="#3498db" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </div>

      </div>
    </div>
  )
}

function KpiCard({ icon, title, value, bg, subtitle }: any) {
  return (
    <div className="dashboard-module-card" style={{ padding: '1.5rem', flexDirection: 'row', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem' }}>{title}</p>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1 }}>
          {value}
        </h2>
        {subtitle && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'block' }}>{subtitle}</span>}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
      No hay suficientes datos.
    </div>
  )
}
