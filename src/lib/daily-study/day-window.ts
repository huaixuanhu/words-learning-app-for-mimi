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

const formatterCache = new Map<string, Intl.DateTimeFormat>();

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

function localMidnightToUtc(date: CalendarDate, timezone: string) {
  const targetAsUtc = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0);
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
    finalParts.hour !== 0 ||
    finalParts.minute !== 0 ||
    finalParts.second !== 0
  ) {
    throw new DailyStudyContractError(
      `Local midnight does not resolve safely for ${formatLocalDate(date)} in ${timezone}`,
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
  const normalizedTimezone = timezone.trim();
  const date = getLocalCalendarDate(now, normalizedTimezone);
  const nextDate = addCalendarDays(date, 1);
  const startsAt = localMidnightToUtc(date, normalizedTimezone);
  const endsAt = localMidnightToUtc(nextDate, normalizedTimezone);

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
