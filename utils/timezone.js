const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Returns YYYY-MM-DD and HH:mm in the salon's configured timezone.
 */
export function getZonedParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }
  }
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    timeStr: `${hour}:${parts.minute}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(hour),
    minute: Number(parts.minute)
  };
}

/**
 * Converts a date string (YYYY-MM-DD) and time string (HH:mm) in the salon timezone
 * into a UTC Date object.
 */
export function zonedDateTimeToUtc(dateStr, timeStr, timeZone = DEFAULT_TIMEZONE) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Start with a UTC guess
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  // Measure offset between UTC guess and target timezone representation
  const zoned = getZonedParts(utcGuess, timeZone);
  const zonedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    0,
    0
  );
  const diffMs = zonedAsUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - diffMs);
}

/**
 * Returns the weekday integer (0 = Sunday .. 6 = Saturday) for a YYYY-MM-DD date string.
 */
export function getWeekdayForDateStr(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.getUTCDay();
}

export function timeStringToMinutes(timeStr) {
  const [h, m] = String(timeStr || "00:00").split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTimeString(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
