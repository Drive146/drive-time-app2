
import { format } from 'date-fns';

interface CalendarLinkDetails {
  title: string;
  start: Date;
  end: Date;
  description: string;
  location?: string;
}

function formatGoogleCalendarDate(date: Date): string {
    // Format the date into 'YYYYMMDDTHHMMSSZ' format for Google Calendar, ensuring it's in UTC.
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
}

export function generateGoogleCalendarLink({ title, start, end, description, location }: CalendarLinkDetails): string {
  const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
  
  const params = new URLSearchParams({
    text: title,
    dates: `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(end)}`,
    details: description,
  });

  if (location) {
    params.append('location', location);
  }

  return `${baseUrl}&${params.toString()}`;
}
