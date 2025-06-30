
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { format, getMonth, getYear, startOfMonth, parse, getDay } from "date-fns";
import { CheckCircle, CalendarDays, Video, Loader2, Clock, Calendar as CalendarIcon } from "lucide-react";

import { BookingCalendar } from "@/components/features/timewise-scheduler/booking-calendar";
import { BookingForm } from "@/components/features/timewise-scheduler/booking-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { getAvailableSlots } from "@/ai/flows/get-available-slots-flow";
import { getBookedSlotsForDay } from "@/ai/flows/get-booked-slots-for-day-flow";
import { getSchedulerSettings, type SchedulerSettings } from "@/ai/flows/get-scheduler-settings-flow";
import { getBookingStartDate, SLOT_CAPACITY } from "@/lib/datetime-utils";


export function BookingView() {
  const { toast } = useToast();

  const [settings, setSettings] = React.useState<SchedulerSettings | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>(undefined);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = React.useState(false);
  const [bookingSuccessInfo, setBookingSuccessInfo] = React.useState<{ formattedDate: string; name: string; emailSent: boolean; hangoutLink?: string; googleCalendarLink?: string; } | null>(null);

  const [slotsPerDay, setSlotsPerDay] = React.useState<Record<string, number>>({});
  const [bookedSlotsForDay, setBookedSlotsForDay] = React.useState<Record<string, number>>({});
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(true);
  const [isLoadingTimes, setIsLoadingTimes] = React.useState(false);

  const relevantStartDate = React.useMemo(() => getBookingStartDate(), []);
  const startOfRelevantMonth = React.useMemo(() => startOfMonth(relevantStartDate), [relevantStartDate]);
  const [month, setMonth] = React.useState<Date>(startOfRelevantMonth);

  React.useEffect(() => {
    const fetchSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const schedulerSettings = await getSchedulerSettings();
        setSettings(schedulerSettings);
      } catch (error) {
        console.error("Failed to fetch settings", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load scheduler settings." });
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [toast]);

  React.useEffect(() => {
    if (!settings) return;

    const fetchCalendarData = async () => {
      setIsLoadingSlots(true);
      try {
        const year = getYear(month);
        const monthIndex = getMonth(month);
        const availableSlots = await getAvailableSlots({ year, month: monthIndex, settings });
        setSlotsPerDay(availableSlots);
      } catch (error) {
        console.error("Failed to fetch calendar data", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load calendar availability." });
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchCalendarData();
  }, [month, toast, settings]);
  
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || !settings) return;
    
    const isDayAvailable = !settings.disabledDates.includes(format(date, 'yyyy-MM-dd')) && settings.availableWeekdays.includes(getDay(date));
    if(!isDayAvailable) return;
    
    const slots = slotsPerDay[format(date, 'yyyy-MM-dd')];
    if (slots !== undefined && slots <= 0) return;


    setSelectedDate(date);
    setSelectedTime(undefined); // Reset time when a new date is selected
    setIsLoadingTimes(true);
    try {
      const booked = await getBookedSlotsForDay(format(date, "yyyy-MM-dd"));
      setBookedSlotsForDay(booked);
    } catch (error) {
      console.error("Failed to fetch time slots", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load time slots for the selected date." });
    } finally {
      setIsLoadingTimes(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setIsBookingDialogOpen(true);
  };
  
  const handleBookingComplete = (success: boolean, details?: { formattedDate: string; name: string; emailSent: boolean; hangoutLink?: string, googleCalendarLink?: string }) => {
    setIsBookingDialogOpen(false);
    if (success && details) {
      setBookingSuccessInfo(details);
      if (settings) {
        const year = getYear(month);
        const monthIndex = getMonth(month);
        getAvailableSlots({ year, month: monthIndex, settings }).then(setSlotsPerDay);
      }
    }
    setSelectedDate(undefined);
    setSelectedTime(undefined);
  };

  const handleDialogClose = () => {
    setIsBookingDialogOpen(false);
  };

  const availableTimes = React.useMemo(() => {
    if (!settings) return [];
    return settings.availableTimeSlots.filter(time => (bookedSlotsForDay[time] || 0) < SLOT_CAPACITY);
  }, [settings, bookedSlotsForDay]);
  
  if (isLoadingSettings) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Scheduler...</p>
      </div>
    );
  }

  if (!settings) {
     return <div className="text-center py-20">Could not load scheduler settings. Please try again later.</div>
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background">
        {bookingSuccessInfo ? (
            <Card className="w-full max-w-2xl shadow-2xl rounded-lg">
                <CardContent className="p-6">
                    <div className="text-center p-8 bg-popover text-popover-foreground rounded-lg w-full max-w-md mx-auto border shadow-lg">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-5">
                            <CheckCircle className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-primary mb-2">Booking Confirmed, {bookingSuccessInfo.name}!</h2>
                        <p className="text-muted-foreground mb-1">Your appointment is set for:</p>
                        <p className="font-semibold text-lg text-primary mb-4">{bookingSuccessInfo.formattedDate}</p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          {bookingSuccessInfo.hangoutLink && (
                              <Button asChild>
                              <a href={bookingSuccessInfo.hangoutLink} target="_blank" rel="noopener noreferrer">
                                  <Video className="mr-2 h-4 w-4" />
                                  Join Google Meet
                              </a>
                              </Button>
                          )}
                           {bookingSuccessInfo.googleCalendarLink && (
                              <Button asChild variant="outline">
                                  <a href={bookingSuccessInfo.googleCalendarLink} target="_blank" rel="noopener noreferrer">
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      Add to Calendar
                                  </a>
                              </Button>
                           )}
                        </div>

                        <p className="text-sm text-muted-foreground mt-4">
                        {bookingSuccessInfo.emailSent 
                            ? "A confirmation email has been sent. Add the event to your calendar to get reminders." 
                            : "We couldn't send a confirmation email, but your booking is confirmed!"
                        }
                        </p>
                        
                        <Button onClick={() => setBookingSuccessInfo(null)} className="mt-6 w-full sm:w-auto">
                        Book Another Slot
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <Card className="w-full max-w-5xl shadow-2xl rounded-lg border-none">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row min-h-[600px]">
                      <div className="w-full md:w-[55%] bg-popover text-popover-foreground p-6 md:p-8 flex flex-col justify-center rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
                          <div className="space-y-2 mb-8">
                            <h2 className="text-2xl font-bold">Drive by Talrop</h2>
                            <p className="text-muted-foreground">Select a date and time for your consultation.</p>
                          </div>
                           <Separator className="mb-8" />
                           <BookingCalendar
                              programStartDate={relevantStartDate}
                              selectedDate={selectedDate}
                              onDateSelect={handleDateSelect}
                              month={month}
                              onMonthChange={setMonth}
                              slots={slotsPerDay}
                              isLoading={isLoadingSlots}
                              settings={settings}
                              />
                      </div>
                      <div className="w-full md:w-[45%] p-6 md:p-8 flex flex-col justify-center">
                          <div className="h-full max-h-[480px]">
                              <h3 className="text-xl font-bold text-center md:text-left mb-2 flex items-center justify-center md:justify-start">
                                  <Clock className="mr-3 h-6 w-6 text-primary"/>
                                  {selectedDate ? `Available Times` : 'Select a Date'}
                              </h3>
                              {selectedDate && <p className="text-center md:text-left text-muted-foreground mb-4 font-medium">{format(selectedDate, 'EEEE, MMMM dd, yyyy')}</p>}
                              
                              <ScrollArea className="h-[400px] -mx-4 px-4">
                                  <div className="pr-2 py-2">
                                  {isLoadingTimes ? (
                                      <div className="flex justify-center items-center h-full pt-10">
                                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                      </div>
                                  ) : selectedDate ? (
                                      availableTimes.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                          {availableTimes.map(time => {
                                              const remainingSpots = SLOT_CAPACITY - (bookedSlotsForDay[time] || 0);
                                              const buttonText = format(parse(time, 'HH:mm', new Date()), 'h:mm a');
                                              
                                              return (
                                                  <Button 
                                                    key={time} 
                                                    variant="outline" 
                                                    size="lg" 
                                                    className="font-semibold flex-col h-auto py-2" 
                                                    onClick={() => handleTimeSelect(time)}
                                                  >
                                                      <span>{buttonText}</span>
                                                      <span className="text-xs font-normal text-muted-foreground">{remainingSpots} spots left</span>
                                                  </Button>
                                              );
                                          })}
                                      </div>
                                      ) : (
                                      <p className="text-muted-foreground text-center pt-16">No available slots for this day.</p>
                                      )
                                  ) : (
                                      <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full pt-16">
                                          <p>Your available time slots will appear here.</p>
                                      </div>
                                  )}
                                  </div>
                              </ScrollArea>
                          </div>
                      </div>
                  </div>
                </CardContent>
            </Card>
        )}

      {selectedDate && selectedTime && (
        <Dialog open={isBookingDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleDialogClose(); else setIsBookingDialogOpen(true);}}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline text-primary">Book Slot</DialogTitle>
              <DialogDescription>
                Confirm your details for <span className="font-semibold text-primary">{format(selectedDate, "dd/MM/yyyy")} at {format(parse(selectedTime, 'HH:mm', new Date()), 'h:mm a')}</span>.
              </DialogDescription>
            </DialogHeader>
            <BookingForm
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onBookingComplete={handleBookingComplete}
            />
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}

    

    