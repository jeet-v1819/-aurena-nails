export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPriceINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "₹0";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount));
}

export function formatDuration(minutes) {
  const mins = Number(minutes || 0);
  if (mins < 60) return `${mins} mins`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} mins` : `${hrs} ${hrs === 1 ? "hr" : "hrs"}`;
}

export function formatDateDisplay(dateInput, timeZone = "Asia/Kolkata") {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? new Date(`${dateInput}T12:00:00+05:30`)
    : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone
  }).format(date);
}

export function formatTimeDisplay(dateInput, timeZone = "Asia/Kolkata") {
  if (!dateInput) return "";
  if (typeof dateInput === "string" && /^\d{2}:\d{2}$/.test(dateInput)) {
    const [h, m] = dateInput.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  }
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone
  }).format(date);
}

export const formatTime12h = formatTimeDisplay;

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
