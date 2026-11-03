// Calendar invites. A weekly Titled Tuesday invite gives every member a phone reminder
// without us needing push notifications or an email provider.

function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function download(name: string, body: string) {
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function downloadEventIcs(opts: {
  id: string; title: string; start: string; end?: string | null; url: string; description?: string; weekly?: boolean;
}) {
  const start = new Date(opts.start);
  const end = opts.end ? new Date(opts.end) : new Date(start.getTime() + 70 * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FCA Rated//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${opts.id}@fca-rated`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(opts.title)}`,
    `DESCRIPTION:${escapeText(`${opts.description ? `${opts.description}\n\n` : ''}${opts.url}`)}`,
    `URL:${opts.url}`,
    ...(opts.weekly ? ['RRULE:FREQ=WEEKLY;BYDAY=TU'] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:FCA arena starts in 30 minutes',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  download(`${opts.weekly ? 'fca-titled-tuesday' : 'fca-event'}.ics`, lines.join('\r\n'));
}
