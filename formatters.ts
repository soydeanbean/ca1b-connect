/**
 * Formats underscores to spaces and capitalizes words (e.g., "beadle_officer" -> "Beadle Officer")
 */
export function formatText(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Formats a YYYY-MM-DD string into a readable Philippine date
 */
export function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}