import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import * as React from "react"
import { Badge } from "./badge"

export interface Option {
  value: string
  label: string
  group?: string
}

interface MultiSelectComboboxProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  emptyMessage?: string
  allowCustom?: boolean
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  allowCustom = true,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const handleSelect = (value: string) => {
    setInputValue("")
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Backspace" && inputValue === "" && selected.length > 0) {
      handleUnselect(selected[selected.length - 1])
    }
  }

  // Group options if they have a group property
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group || "Other"
    if (!acc[group]) acc[group] = []
    acc[group].push(option)
    return acc
  }, {} as Record<string, Option[]>)

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-9 w-fit min-w-[140px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer hover:bg-accent/50 transition-colors",
              !selected.length && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {selected.length > 0 ? (
                <div className="flex gap-1">
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal h-5">
                    {selected.length} selected
                  </Badge>
                </div>
              ) : (
                placeholder
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command onKeyDown={handleKeyDown}>
            <CommandInput
              placeholder="Search..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandGroup>
                {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                  <CommandGroup key={group} heading={group}>
                    {groupOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={() => handleSelect(option.value)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selected.includes(option.value)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <svg
                            className={cn("h-3 w-3")}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandGroup>
              {allowCustom && inputValue && !options.some(o => o.label.toLowerCase() === inputValue.toLowerCase()) && (
                <CommandGroup heading="Add Custom">
                  <CommandItem
                    onSelect={() => {
                      handleSelect(inputValue)
                      setInputValue("")
                    }}
                    className="cursor-pointer"
                  >
                    Add "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
