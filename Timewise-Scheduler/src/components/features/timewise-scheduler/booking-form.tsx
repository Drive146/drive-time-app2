
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { storeUserDetails } from "@/ai/flows/store-user-details";
import { sendConfirmationEmail } from "@/ai/flows/send-confirmation-email-flow";
import { Loader2, User, Phone, Mail, MessageSquare } from "lucide-react";
import { format, parse } from "date-fns";

const bookingFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." }).regex(/^\+?[0-9\s-()]+$/, { message: "Invalid phone number format."}),
  email: z.string().email({ message: "Invalid email address." }),
  whatsappNumber: z.string().min(10, { message: "WhatsApp number must be at least 10 digits." }).regex(/^\+?[0-9\s-()]+$/, { message: "Invalid WhatsApp number format."}),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  selectedDate: Date;
  selectedTime: string;
  onBookingComplete: (success: boolean, details?: { formattedDate: string; name: string; emailSent: boolean; hangoutLink?: string; googleCalendarLink?: string; }) => void;
}

export function BookingForm({ selectedDate, selectedTime, onBookingComplete }: BookingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      email: "",
      whatsappNumber: "",
    },
  });

  async function onSubmit(data: BookingFormValues) {
    setIsSubmitting(true);
    
    try {
      const bookingDate = format(selectedDate, "yyyy-MM-dd");

      const storeResult = await storeUserDetails({
        name: data.name,
        phoneNumber: data.phoneNumber,
        email: data.email,
        whatsappNumber: data.whatsappNumber,
        bookingDate: bookingDate,
        bookingTime: selectedTime,
      });

      if (!storeResult.success) {
        const description = storeResult.message.startsWith('Configuration Error:') 
            ? `Booking service is not configured. Please contact the administrator. (${storeResult.message})`
            : storeResult.message;
            
        toast({
          variant: "destructive",
          title: "Booking Failed",
          description: description,
          duration: 9000,
        });
        onBookingComplete(false);
        return;
      }
      
      const parsedTime = parse(selectedTime, 'HH:mm', selectedDate);
      const formattedDate = format(parsedTime, "dd/MM/yyyy 'at' h:mm a");

      const emailResult = await sendConfirmationEmail({
        name: data.name,
        email: data.email,
        bookingDate,
        bookingTime: selectedTime,
        formattedDate,
      });
      
      if (!emailResult.success) {
        console.warn("Confirmation email could not be sent:", emailResult.message);
        const description = emailResult.message.startsWith('Configuration Error:')
            ? "Your booking is confirmed, but we couldn't send an email. Please contact the administrator to set up email sending."
            : `Your booking was successful, but we could not send a confirmation email. Error: ${emailResult.message}`;
        toast({
            variant: "destructive",
            title: "Booking Confirmed, But Email Failed",
            description: description,
            duration: 9000,
        });
      }
      
      onBookingComplete(true, { 
        formattedDate, 
        name: data.name, 
        emailSent: emailResult.success, 
        hangoutLink: emailResult.hangoutLink,
        googleCalendarLink: emailResult.googleCalendarLink,
      });

    } catch (error: any) {
      console.error("Booking submission failed:", error);
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "An unexpected error occurred. Please try again.",
      });
      onBookingComplete(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <div className="relative flex items-center">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="e.g. John Doe" {...field} className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" placeholder="e.g. john.doe@example.com" {...field} className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input type="tel" placeholder="e.g. +1 123 456 7890" {...field} className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="whatsappNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp Number</FormLabel>
              <FormControl>
                <div className="relative flex items-center">
                 <MessageSquare className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input type="tel" placeholder="e.g. +1 123 456 7890 (if different)" {...field} className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Booking...
            </>
          ) : (
            "Confirm Booking"
          )}
        </Button>
      </form>
    </Form>
  );
}
