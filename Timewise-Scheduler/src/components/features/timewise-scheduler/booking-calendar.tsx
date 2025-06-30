"use client";

import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, getDay, isBefore, startOfDay } from "date-fns";
import { type SchedulerSettings } from "@/ai/flows/get-scheduler-settings-flow";

interface BookingCalendarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  className?: string;
  month: Date;
  onMonthChange: (date: Date) => void;
  slots: Record<string, number>;
  isLoading: boolean;
  settings: SchedulerSettings;
  programStartDate: Date;
}

export function BookingCalendar({ selectedDate, onDateSelect, className, month, onMonthChange, slots, isLoading, settings, programStartDate }: BookingCalendarProps) {
  
  const disabledDaysCallback = React.useCallback((date: Date): boolean => {
    if (isBefore(startOfDay(date), programStartDate)) return true; // Disable past dates

    const dateStr = format(date, 'yyyy-MM-dd');
    const remainingSlots = slots[dateStr];
    
    const dayIsGenerallyAvailable = settings.availableWeekdays.includes(getDay(date)) && !settings.disabledDates.includes(dateStr);
    if (!dayIsGenerallyAvailable) {
        return true;
    }

    if (!isLoading && remainingSlots === undefined) {
        return true;
    }
    
    if (!isLoading && remainingSlots !== undefined && remainingSlots <= 0) {
        return true;
    }
    
    return false;
  }, [slots, isLoading, settings.availableWeekdays, settings.disabledDates, programStartDate]);
  
  const modifiers = {
    available: (date: Date) => !disabledDaysCallback(date),
  };

  const modifiersClassNames = {
    available: "bg-primary/10 hover:bg-primary/20",
    today: "border-0",
  };

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onDateSelect}
      month={month}
      onMonthChange={onMonthChange}
      initialFocus
      disabled={disabledDaysCallback}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      className={cn("rounded-lg border-none shadow-none bg-popover text-popover-foreground p-0", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between items-center px-2 pt-1 relative text-popover-foreground",
        caption_label: "text-lg font-bold tracking-wide",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 bg-transparent p-0 hover:bg-muted"
        ),
        table: "w-full border-collapse space-y-1 mt-4",
        head_row: "flex w-full",
        head_cell: "flex-1 text-muted-foreground rounded-md w-10 font-medium text-sm text-center",
        row: "flex w-full mt-1",
        cell: cn("flex-1 relative p-0 text-center text-sm focus-within:relative focus-within:z-20 h-10"),
        day: cn(
            buttonVariants({ variant: "ghost" }), 
            "h-10 w-10 p-0 font-normal rounded-full focus:z-10"
        ),
        day_selected: "!bg-primary !text-primary-foreground rounded-full !font-semibold",
        day_today: "border-0",
        day_outside: "text-popover-foreground/40",
        day_disabled: "text-popover-foreground/40 cursor-not-allowed",
        day_hidden: "invisible",
      }}
    />
  );
}
