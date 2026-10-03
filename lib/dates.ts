export function formatDate(value: string) {
  const [date, time] = value.split("T");
  const parts = date?.split("-");
  if (parts?.length !== 3) return value || "";
  return `${parts[1]}/${parts[2]}/${parts[0]}${time ? ` · ${time.slice(0, 5)}` : ""}`;
}
export function parseDate(value: string) {
  if (!value) return "";
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return "";
  const [, month, day, year, hour, minute] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T12:00:00Z`);
  if (
    !Number(year) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== iso ||
    (hour && (+hour > 23 || +minute > 59))
  )
    return "";
  return iso + (hour ? `T${hour}:${minute}` : "");
}
