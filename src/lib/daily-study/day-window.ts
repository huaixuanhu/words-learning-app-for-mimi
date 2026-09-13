import { DailyStudyContractError } from "./contract";

type CalendarDate = Readonly<{
  year: number;
  month: number;
  day: number;
}>;

type ZonedParts = CalendarDate &
  Readonly<{
    hour: number;
    minute: number;
    second: number;
  }>;

export type ResolvedPersonDay = Readonly<{
  localDate: string;
  timezone: string;
  dayStartsAt: string;
  dayEndsAt: string;
}>;

export type ResolvedCalendarMonth = Readonly<{
  localMonth: string;
  timezone: string;
  monthStartsAt: string;
  monthEndsAt: string;
}>;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

export const STUDY_DAY_START_HOUR = 6;

function getFormatter(timezone: string) {
  const normalized = timezone.trim();

  if (!normalized) {
    throw new DailyStudyContractError("Timezone must not be blank");
  }

  const cached = formatterCache.get(normalized);

  if (cached) {
    return cached;
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: normalized,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    formatter.format(new Date(0));
    formatterCache.set(normalized, formatter);
    return formatter;
  } catch {
    throw new DailyStudyContractError(`Unsupported timezone: ${normalized}`);
  }
}

function zonedParts(instantMs: number, timezone: string): ZonedParts {
  const parts = getFormatter(timezone).formatToParts(new Date(instantMs));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const result = {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second")),
  };

  if (Object.values(result).some((value) => !Number.isInteger(value))) {
    throw new DailyStudyContractError(`Could not resolve calendar values for ${timezone}`);
  }

  return result;
}

function formatLocalDate(date: CalendarDate) {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function localHourToUtc(date: CalendarDate, timezone: string, hour: number) {
  const targetAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour, 0, 0);
  let candidate = targetAsUtc;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const observed = zonedParts(candidate, timezone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    const correction = targetAsUtc - observedAsUtc;

    candidate += correction;

    if (correction === 0) {
      break;
    }
  }

  const finalParts = zonedParts(candidate, timezone);

  if (
    finalParts.year !== date.year ||
    finalParts.month !== date.month ||
    finalParts.day !== date.day ||
    finalParts.hour !== hour ||
    finalParts.minute !== 0 ||
    finalParts.second !== 0
  ) {
    throw new DailyStudyContractError(
      `Local ${String(hour).padStart(2, "0")}:00 does not resolve safely for ${formatLocalDate(date)} in ${timezone}`,
    );
  }

  return candidate;
}

export function getLocalCalendarDate(now: string | Date, timezone: string): CalendarDate {
  const instant = now instanceof Date ? now : new Date(now);

  if (!Number.isFinite(instant.getTime())) {
    throw new DailyStudyContractError("now must be a valid timestamp");
  }

  const parts = zonedParts(instant.getTime(), timezone);

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function resolvePersonDay(
  now: string | Date,
  timezone: string,
): ResolvedPersonDay {
  return resolvePersonDayOffset(now, timezone, 0);
}

export function resolvePersonDayOffset(
  now: string | Date,
  timezone: string,
  calendarDayOffset: number,
): ResolvedPersonDay {
  if (!Number.isSafeInteger(calendarDayOffset) || Math.abs(calendarDayOffset) > 36_600) {
    throw new DailyStudyContractError("calendarDayOffset must be a bounded whole number");
  }

  const normalizedTimezone = timezone.trim();
  const date = addCalendarDays(
    getLocalCalendarDate(now, normalizedTimezone),
    calendarDayOffset,
  );
  const nextDate = addCalendarDays(date, 1);
  const startsAt = localHourToUtc(date, normalizedTimezone, 0);
  const endsAt = localHourToUtc(nextDate, normalizedTimezone, 0);

  if (endsAt <= startsAt) {
    throw new DailyStudyContractError("Resolved person day must end after it starts");
  }

  return {
    localDate: formatLocalDate(date),
    timezone: normalizedTimezone,
    dayStartsAt: new Date(startsAt).toISOString(),
    dayEndsAt: new Date(endsAt).toISOString(),
  };
}

/** Learning dates use local wall-clock 06:00. Provider budgets retain calendar days. */
export function resolveStudyDay(now: string | Date, timezone: string): ResolvedPersonDay {
  return resolveStudyDayOffset(now, timezone, 0);
}

export function resolveStudyDayOffset(
  now: string | Date,
  timezone: string,
  calendarDayOffset: number,
): ResolvedPersonDay {
  if (!Number.isSafeInteger(calendarDayOffset) || Math.abs(calendarDayOffset) > 36_600) {
    throw new DailyStudyContractError("calendarDayOffset must be a bounded whole number");
  }

  const normalizedTimezone = timezone.trim();
  const calendarDate = getLocalCalendarDate(now, normalizedTimezone);
  const instant = now instanceof Date ? now : new Date(now);
  const parts = zonedParts(instant.getTime(), normalizedTimezone);
  const date = addCalendarDays(
    calendarDate,
    calendarDayOffset + (parts.hour < STUDY_DAY_START_HOUR ? -1 : 0),
  );
  // Resolve each local boundary independently; DST days are not always 24 hours.
  const startsAt = localHourToUtc(date, normalizedTimezone, STUDY_DAY_START_HOUR);
  const endsAt = localHourToUtc(
    addCalendarDays(date, 1),
    normalizedTimezone,
    STUDY_DAY_START_HOUR,
  );

  if (endsAt <= startsAt) {
    throw new DailyStudyContractError("Resolved study day must end after it starts");
  }

  return {
    localDate: formatLocalDate(date),
    timezone: normalizedTimezone,
    dayStartsAt: new Date(startsAt).toISOString(),
    dayEndsAt: new Date(endsAt).toISOString(),
  };
}

export function resolveCalendarMonth(
  now: string | Date,
  timezone: string,
): ResolvedCalendarMonth {
  const normalizedTimezone = timezone.trim();
  const date = getLocalCalendarDate(now, normalizedTimezone);
  const first = { year: date.year, month: date.month, day: 1 };
  const next = date.month === 12
    ? { year: date.year + 1, month: 1, day: 1 }
    : { year: date.year, month: date.month + 1, day: 1 };
  const startsAt = localHourToUtc(first, normalizedTimezone, 0);
  const endsAt = localHourToUtc(next, normalizedTimezone, 0);

  if (endsAt <= startsAt) {
    throw new DailyStudyContractError("Resolved calendar month must end after it starts");
  }

  return {
    localMonth: `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}`,
    timezone: normalizedTimezone,
    monthStartsAt: new Date(startsAt).toISOString(),
    monthEndsAt: new Date(endsAt).toISOString(),
  };
}
