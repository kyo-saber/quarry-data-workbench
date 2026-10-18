import { useState } from 'react'
import { BarChart3, ChartNoAxesCombined, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line as LineSeries,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { inferChart } from '../lib/chart'
import { formatMetric } from '../lib/format'
import type { QueryResult } from '../types'
import type { LucideIcon } from 'lucide-react'

interface InsightChartProps {
  result: QueryResult | null
}

type ChartMode = 'line' | 'bar' | 'area'

const chartModes: { id: ChartMode; label: string; icon: LucideIcon }[] = [
  { id: 'line', label: 'Line chart', icon: ChartNoAxesCombined },
  { id: 'bar', label: 'Bar chart', icon: BarChart3 },
  { id: 'area', label: 'Area chart', icon: TrendingUp },
]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <span>{label}</span>
      <strong>{formatMetric(Number(payload[0]?.value ?? 0))}</strong>
    </div>
  )
}

export function InsightChart({ result }: InsightChartProps) {
  const config = result ? inferChart(result) : null
  const [mode, setMode] = useState<ChartMode>(config?.kind ?? 'line')

  if (!config) {
    return (
      <div className="chart-empty">
        <BarChart3 size={20} strokeWidth={1.8} />
        <strong>No visual signal yet</strong>
        <span>Return at least one text or date column and one number column.</span>
      </div>
    )
  }

  const chartData = config.points.slice(-60)
  const tickInterval = Math.max(0, Math.floor(chartData.length / 6) - 1)
  const sharedAxis = {
    dataKey: 'label',
    axisLine: false,
    tickLine: false,
    tick: { fill: '#718078', fontSize: 11 },
    interval: tickInterval,
  }

  return (
    <div className="insight-panel">
      <div className="insight-heading">
        <div>
          <span className="eyebrow">Visual pulse</span>
          <strong>{config.yColumn.name.replaceAll('_', ' ')}</strong>
        </div>
        <div className="chart-mode-switch" aria-label="Chart type">
          {chartModes.map(({ id, label, icon: Icon }) => (
            <button
              aria-label={label}
              aria-pressed={mode === id}
              className={mode === id ? 'active' : undefined}
              key={id}
              onClick={() => setMode(id)}
              title={label}
              type="button"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="chart-canvas">
        <ResponsiveContainer height="100%" width="100%">
          {mode === 'bar' ? (
            <BarChart data={chartData} margin={{ bottom: 0, left: -22, right: 4, top: 10 }}>
              <CartesianGrid stroke="#e5e9e1" strokeDasharray="2 4" vertical={false} />
              <XAxis {...sharedAxis} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#718078', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#edf2ec' }} />
              <Bar dataKey="value" fill="#1c7a50" maxBarSize={26} radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : mode === 'area' ? (
            <AreaChart data={chartData} margin={{ bottom: 0, left: -22, right: 4, top: 10 }}>
              <defs>
                <linearGradient id="quarryArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1c7a50" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#1c7a50" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e9e1" strokeDasharray="2 4" vertical={false} />
              <XAxis {...sharedAxis} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#718078', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                dataKey="value"
                fill="url(#quarryArea)"
                stroke="#1c7a50"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ bottom: 0, left: -22, right: 4, top: 10 }}>
              <CartesianGrid stroke="#e5e9e1" strokeDasharray="2 4" vertical={false} />
              <XAxis {...sharedAxis} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#718078', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <LineSeries
                activeDot={{ fill: '#f5f7f2', r: 5, stroke: '#1c7a50', strokeWidth: 3 }}
                dataKey="value"
                dot={false}
                stroke="#1c7a50"
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="metric-strip">
        <div>
          <span>Total</span>
          <strong>{formatMetric(config.stats.total)}</strong>
        </div>
        <div>
          <span>Average</span>
          <strong>{formatMetric(config.stats.average)}</strong>
        </div>
        <div>
          <span>Peak</span>
          <strong>{formatMetric(config.stats.peak)}</strong>
        </div>
      </div>
    </div>
  )
}
