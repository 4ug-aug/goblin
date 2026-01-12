import type { ChartConfig } from "@/components/ui/chart"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

type LineStepDataPoint = {
  hour: string
  count: number
}

interface LineStepProps {
  title?: string
  data: LineStepDataPoint[]
}

export function LineStep({ title = "", data }: LineStepProps) {
  const chartConfig: ChartConfig = {
    count: { label: "Runs", color: "var(--primary)" },
  }

  return (
    <div>
      {title && <h3 className="mb-3 text-base font-semibold tracking-tight">{title}</h3>}
      <ChartContainer config={chartConfig} className="w-full h-[200px]">
        <LineChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line dataKey="count" type="step" stroke="var(--color-count)" strokeWidth={2} dot={false} />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
