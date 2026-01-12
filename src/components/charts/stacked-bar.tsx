import type { ChartConfig } from "@/components/ui/chart"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface StackedBarProps {
  title?: string
  data: any[]
  config?: ChartConfig
  height?: number
  yAxisFormatter?: (value: any) => string
  domain?: [number | string, number | string]
  ticks?: number[]
  todayDate?: string
  filters?: FilterConfig[]
}

export function StackedBar({
  title = "",
  data,
  config = {},
  height = 220,
  yAxisFormatter,
  domain,
  ticks,
  todayDate,
  filters,
}: StackedBarProps) {
  return (
    <div className="w-full">
      {(title || (filters && filters.length > 0)) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          )}
          {filters && filters.length > 0 && (
            <div className="flex items-center gap-2">
              {filters.map((filter) => (
                <Select
                  key={filter.label}
                  value={filter.value}
                  onValueChange={filter.onChange}
                >
                  <SelectTrigger size="sm" className="h-8 min-w-[100px]">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
        </div>
      )}
      <ChartContainer config={config} className={`w-full h-[${height}px]`}>
        <BarChart
          accessibilityLayer
          data={data}
          barCategoryGap={2}
          margin={{ top: 20, right: 0, left: 0, bottom: 20 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" verticalFill={[]} stroke="var(--border)" />
          <YAxis
            ticks={ticks}
            domain={domain}
            tickFormatter={yAxisFormatter}
            axisLine={false}
            tickLine={false}
            fontSize={12}
            className="fill-muted-foreground"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            angle={-45}
            textAnchor="end"
            height={60}
            fontSize={12}
            className="fill-muted-foreground"
            tickFormatter={(value) => {
              const date = new Date(value)
              return date.toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
              })
            }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => {
                  return new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {todayDate && (
            <ReferenceLine
              x={todayDate}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              label={({ viewBox }) => {
                const { x, y } = viewBox
                return (
                  <g>
                    <rect
                      x={x - 20}
                      y={y - 25}
                      width={40}
                      height={20}
                      rx={5}
                      fill="var(--muted)"
                      className="fill-muted"
                    />
                    <text
                      x={x}
                      y={y - 11}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px] font-medium"
                      style={{ fontSize: "10px" }}
                    >
                      Today
                    </text>
                  </g>
                )
              }}
            />
          )}
          {Object.keys(config).map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={config[key]?.color || `var(--color-${key})`}
              radius={
                index === Object.keys(config).length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  )
}
