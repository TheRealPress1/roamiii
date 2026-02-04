import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Snowflake, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreToLabel } from "@/lib/tripchat-types";

interface TemperatureSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function TemperatureSlider({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  size = "md",
  className,
}: TemperatureSliderProps) {
  const label = scoreToLabel(value);

  // Calculate the gradient position for the thumb color
  const getThumbColor = (val: number) => {
    if (val <= 30) return "bg-temp-cold";
    if (val <= 60) return "bg-temp-warm";
    return "bg-temp-hot";
  };

  const handleValueChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className={cn(
        "flex items-center gap-3",
        size === "sm" ? "gap-2" : "gap-3"
      )}>
        {/* Snowflake icon */}
        <Snowflake className={cn(
          "flex-shrink-0 text-temp-cold",
          size === "sm" ? "h-4 w-4" : "h-5 w-5"
        )} />

        {/* Slider */}
        <SliderPrimitive.Root
          value={[value]}
          onValueChange={handleValueChange}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          className={cn(
            "relative flex w-full touch-none select-none items-center",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <SliderPrimitive.Track className={cn(
            "relative w-full grow overflow-hidden rounded-full",
            "bg-gradient-to-r from-temp-cold via-temp-warm to-temp-hot",
            size === "sm" ? "h-2" : "h-3"
          )}>
            <SliderPrimitive.Range className="absolute h-full bg-transparent" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              "block rounded-full border-2 border-white shadow-lg ring-offset-background transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none",
              "hover:scale-110 active:scale-95",
              getThumbColor(value),
              size === "sm" ? "h-5 w-5" : "h-6 w-6"
            )}
          />
        </SliderPrimitive.Root>

        {/* Flame icon */}
        <Flame className={cn(
          "flex-shrink-0 text-temp-hot",
          size === "sm" ? "h-4 w-4" : "h-5 w-5"
        )} />
      </div>

      {/* Label */}
      {showLabel && (
        <p className={cn(
          "text-center font-medium transition-colors",
          size === "sm" ? "text-xs" : "text-sm",
          value <= 30 && "text-temp-cold",
          value > 30 && value <= 60 && "text-temp-warm",
          value > 60 && "text-temp-hot"
        )}>
          {label}
        </p>
      )}
    </div>
  );
}

// Display component for showing average temperature
interface TemperatureDisplayProps {
  averageScore: number | null;
  voteCount: number;
  size?: "sm" | "md";
  className?: string;
}

export function TemperatureDisplay({
  averageScore,
  voteCount,
  size = "md",
  className,
}: TemperatureDisplayProps) {
  if (averageScore === null || voteCount === 0) {
    return (
      <div className={cn(
        "text-center text-muted-foreground",
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}>
        No votes yet
      </div>
    );
  }

  const label = scoreToLabel(averageScore);
  const roundedScore = Math.round(averageScore);

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {/* Temperature bar indicator */}
      <div className={cn(
        "relative w-16 rounded-full overflow-hidden",
        "bg-gradient-to-r from-temp-cold via-temp-warm to-temp-hot",
        size === "sm" ? "h-1.5" : "h-2"
      )}>
        {/* Position indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border border-gray-300 shadow-sm"
          style={{ left: `calc(${averageScore}% - 4px)` }}
        />
      </div>

      {/* Score and count */}
      <span className={cn(
        "font-medium",
        size === "sm" ? "text-xs" : "text-sm",
        averageScore <= 30 && "text-temp-cold",
        averageScore > 30 && averageScore <= 60 && "text-temp-warm",
        averageScore > 60 && "text-temp-hot"
      )}>
        {roundedScore}°
      </span>
      <span className={cn(
        "text-muted-foreground",
        size === "sm" ? "text-xs" : "text-sm"
      )}>
        ({voteCount} {voteCount === 1 ? "vote" : "votes"})
      </span>
    </div>
  );
}
