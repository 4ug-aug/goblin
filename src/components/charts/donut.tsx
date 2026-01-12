import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import React from "react";
import { Label, Pie, PieChart } from "recharts";

type DonutProps = {
  title?: string;
  total: number;
  subtitle: string;
  data: { key: string; label: string; value: number; colorVar: string }[];
  className?: string;
}

export function Donut({ title = "", total, subtitle = "Controls", data, className }: DonutProps) {
    // data: [{ key, label, value, colorVar }]
    const hasData = Array.isArray(data) && data.some((d: { value: number }) => Number(d?.value) > 0)

    if (!hasData || Number(total) <= 0) {
      return (
        <div className="flex items-center justify-center h-[220px] rounded-md border border-dashed text-sm text-muted-foreground w-full">
          {title && <h3 className="mb-3 text-base font-semibold tracking-tight">{title}</h3>}
          No chart data available
        </div>
      )
    }

    const chartData = data.map((d: { key: string; value: number; colorVar: string }) => ({ name: d.key, value: d.value, fill: d.colorVar }))

    const chartConfig = React.useMemo(() => {
      const cfg = { value: { label: subtitle } } as unknown as Record<string, { label: string; color: string }>
      data.forEach((d: { key: string; label: string; colorVar: string }) => {
        cfg[d.key] = { label: d.label, color: d.colorVar }
      })
      return cfg
    }, [data, subtitle])

    return (
      <div>
        {title && <h3 className="mb-3 text-base font-semibold tracking-tight">{title}</h3>}
        <div className="flex flex-col items-center gap-4">
          {/* Donut */}
          <ChartContainer config={chartConfig} className={cn("mx-auto h-[180px] w-[180px] sm:h-[200px] sm:w-[200px]", className)}>
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={5}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl sm:text-3xl font-bold">
                            {total}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs sm:text-sm">
                            {subtitle}
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Legend */}
          <ul className="flex flex-wrap items-center justify-center gap-4 w-full">
            {data.map((d: { key: string; label: string; value: number; colorVar: string }) => (
              <li key={d.key} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: d.colorVar }} />
                <span className="text-sm text-muted-foreground">{d.label}</span>
                <span className="text-sm tabular-nums font-medium">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }
