
"use client";

import * as React from "react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, getDay } from "date-fns";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";


import { getSchedulerSettings, type SchedulerSettings } from "@/ai/flows/get-scheduler-settings-flow";
import { updateSchedulerSettings } from "@/ai/flows/update-scheduler-settings-flow";
import { changePassword } from "@/app/settings/actions";
import { ALL_POSSIBLE_TIMES } from "@/lib/datetime-utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar as CalendarIcon, Clock, Eye, Save, Settings as SettingsIcon, Lock } from "lucide-react";

const weekdays = [
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
  { id: 0, label: "Sunday" },
];


function ChangePasswordButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Change Password
        </>
      )}
    </Button>
  );
}

function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);
  
  React.useEffect(() => {
      if (state?.success) {
          formRef.current?.reset();
      }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input id="newPassword" name="newPassword" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
       {state?.success && (
        <Alert variant="default" className="bg-success/10 border-success/50 text-success [&>svg]:text-success">
           <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}
      <ChangePasswordButton />
    </form>
  )
}

export function SettingsView() {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<SchedulerSettings | null>(null);
  const [availableWeekdays, setAvailableWeekdays] = React.useState<number[]>([]);
  const [disabledDates, setDisabledDates] = React.useState<Date[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const currentSettings = await getSchedulerSettings();
        setSettings(currentSettings);
        setAvailableWeekdays(currentSettings.availableWeekdays);
        setDisabledDates(currentSettings.disabledDates.map(d => parseISO(d)));
        setAvailableTimeSlots(currentSettings.availableTimeSlots);
      } catch (error) {
        console.error("Failed to fetch settings", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load scheduler settings.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [toast]);

  const handleWeekdayToggle = (dayId: number) => {
    setAvailableWeekdays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };
  
  const handleTimeSlotToggle = (timeSlot: string) => {
    setAvailableTimeSlots((prev) =>
        prev.includes(timeSlot) ? prev.filter((t) => t !== timeSlot) : [...prev, timeSlot].sort()
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = {
        availableWeekdays,
        disabledDates: disabledDates.map(d => format(d, 'yyyy-MM-dd')),
        availableTimeSlots,
      };
      const result = await updateSchedulerSettings(settingsToSave);
      if (result.success) {
        toast({
          title: "Success",
          description: "Settings saved successfully.",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Could not save settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Settings...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background">
      <Card className="w-full max-w-6xl shadow-2xl rounded-lg">
        <CardHeader className="p-6 border-b flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Scheduler Settings</CardTitle>
            <CardDescription className="text-md text-muted-foreground">
              Configure your availability for bookings.
            </CardDescription>
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
            <div className="space-y-8">
              {/* Available Time Slots */}
              <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center"><Clock className="mr-2 h-5 w-5"/> Available Time Slots</h3>
                  <p className="text-sm text-muted-foreground">Select the time slots you want to make available for booking.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 border rounded-lg">
                      {ALL_POSSIBLE_TIMES.map((time) => (
                      <div key={time} className="flex items-center space-x-2">
                          <Checkbox id={`time-${time}`} checked={availableTimeSlots.includes(time)} onCheckedChange={() => handleTimeSlotToggle(time)} />
                          <Label htmlFor={`time-${time}`}>{format(parseISO(`2000-01-01T${time}:00`), "h:mm a")}</Label>
                      </div>
                      ))}
                  </div>
              </div>
              
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Available Weekdays */}
                  <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center"><CalendarIcon className="mr-2 h-5 w-5"/> Available Weekdays</h3>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border rounded-lg">
                          {weekdays.map((day) => (
                          <div key={day.id} className="flex items-center space-x-2">
                              <Checkbox id={`weekday-${day.id}`} checked={availableWeekdays.includes(day.id)} onCheckedChange={() => handleWeekdayToggle(day.id)} />
                              <Label htmlFor={`weekday-${day.id}`}>{day.label}</Label>
                          </div>
                          ))}
                      </div>
                  </div>
                  
                  {/* Holidays / Disabled Dates */}
                  <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center"><CalendarIcon className="mr-2 h-5 w-5"/> Holidays / Disabled Dates</h3>
                       <p className="text-sm text-muted-foreground">Toggle dates on the calendar. Green means available, red means it's a holiday.</p>
                      <div className="flex justify-center">
                          <Calendar
                            mode="multiple"
                            selected={disabledDates}
                            onSelect={(dates) => setDisabledDates(dates || [])}
                            disabled={(date) => !availableWeekdays.includes(getDay(date))}
                            modifiers={{ available: (date) => !disabledDates.some(d => d.getTime() === date.getTime()) }}
                            modifiersClassNames={{ selected: '!bg-destructive !text-destructive-foreground rounded-md', available: '!bg-success !text-success-foreground rounded-md' }}
                            className="rounded-md border"
                          />
                      </div>
                  </div>
              </div>
              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                    <Lock className="mr-2 h-5 w-5" />
                    Security
                </h3>
                <p className="text-sm text-muted-foreground">
                    Change your admin password here.
                </p>
                <ChangePasswordForm />
              </div>
            </div>

            <Separator className="my-8"/>

            <div className="flex justify-between items-center">
                 <Button asChild variant="outline">
                    <Link href="/booking" target="_blank">
                        <Eye className="mr-2 h-4 w-4"/>
                        Preview Booking Page
                    </Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...
                        </>
                    ) : (
                         <>
                            <Save className="mr-2 h-4 w-4"/> Save Settings
                         </>
                    )}
                </Button>
            </div>
        </CardContent>
      </Card>
    </main>
  );
}
