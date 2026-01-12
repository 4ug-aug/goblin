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
  valueFormatter?: (value: number) => string;
}

export function Donut({ title = "", total, subtitle = "Controls", data, className, valueFormatter }: DonutProps) {
    // data: [{ key, label, value, colorVar }]
    const hasData = Array.isArray(data) && data.some((d: { value: number }) => Number(d?.value) > 0)

    if (!hasData || Number(total) <= 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[220px] rounded-md border border-dashed text-sm text-muted-foreground w-full">
          {title && <h3 className="mb-3 text-base font-semibold tracking-tight">{title}</h3>}
          <div className="text-center px-4">No chart data available</div>
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

    const formatValue = (val: number) => valueFormatter ? valueFormatter(val) : val.toString();

    return (
      <div className="w-full">
        {title && <h3 className="mb-3 text-base font-semibold tracking-tight text-center">{title}</h3>}
        <div className="flex flex-col items-center gap-6">
          {/* Donut */}
          <ChartContainer config={chartConfig} className={cn("mx-auto h-[200px] w-[200px] sm:h-[200px] sm:w-[200px]", className)}>
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={70} strokeWidth={10}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl sm:text-2xl font-bold">
                            {formatValue(total)}
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
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 w-full max-w-[400px]">
            {data.map((d: { key: string; label: string; value: number; colorVar: string }) => (
              <li key={d.key} className="flex items-center justify-between gap-2 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: d.colorVar }} />
                  <span className="text-xs text-muted-foreground truncate">{d.label}</span>
                </div>
                <span className="text-xs tabular-nums font-medium shrink-0">{formatValue(d.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }
