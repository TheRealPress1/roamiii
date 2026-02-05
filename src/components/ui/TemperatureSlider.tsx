import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Snowflake, Flame } from "lucide-react";
import { cn, getDisplayName } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TripVote } from "@/lib/tripchat-types";

interface TemperatureSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function TemperatureSlider({
  value,
  onChange,
  disabled = false,
  size = "md",
  className,
}: TemperatureSliderProps) {
  // Calculate the gradient position for the thumb color
  const getThumbColor = (val: number) => {
    if (val <= 30) return "bg-temp-cold";
    if (val <= 60) return "bg-temp-warm";
    return "bg-temp-hot";
  };

  const getScoreColor = (val: number) => {
    if (val <= 30) return "text-temp-cold";
    if (val <= 60) return "text-temp-warm";
    return "text-temp-hot";
  };

  const handleValueChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
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

      {/* Numeric score display */}
      <p className={cn(
        "text-center font-medium transition-colors",
        size === "sm" ? "text-xs" : "text-sm",
        getScoreColor(value)
      )}>
        {Math.round(value)}°
      </p>
    </div>
  );
}

// Voter avatars bar with average score
interface VoterAvatarsBarProps {
  votes: TripVote[];
  averageScore: number | null;
  size?: "sm" | "md";
  className?: string;
}

export function VoterAvatarsBar({
  votes,
  averageScore,
  size = "md",
  className,
}: VoterAvatarsBarProps) {
  if (votes.length === 0) {
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

  const getScoreColor = (score: number) => {
    if (score <= 30) return "text-temp-cold";
    if (score <= 60) return "text-temp-warm";
    return "text-temp-hot";
  };

  const roundedAvg = averageScore !== null ? Math.round(averageScore) : null;
  const avatarSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg",
      className
    )}>
      {/* Stacked avatars */}
      <div className="flex items-center -space-x-2">
        {votes.slice(0, 5).map((vote, index) => {
          const voterName = getDisplayName(vote.voter, 'U');
          const initials = voterName.slice(0, 2).toUpperCase();
          return (
            <Avatar
              key={vote.id}
              className={cn(
                avatarSize,
                "border-2 border-background",
                "ring-1 ring-muted"
              )}
              style={{ zIndex: votes.length - index }}
            >
              <AvatarImage src={vote.voter?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          );
        })}
        {votes.length > 5 && (
          <div className={cn(
            avatarSize,
            "flex items-center justify-center rounded-full bg-muted border-2 border-background text-[10px] font-medium text-muted-foreground"
          )}>
            +{votes.length - 5}
          </div>
        )}
      </div>

      {/* Average score */}
      {roundedAvg !== null && (
        <span className={cn(
          "font-medium",
          textSize,
          getScoreColor(roundedAvg)
        )}>
          Avg: {roundedAvg}°
        </span>
      )}
    </div>
  );
}
