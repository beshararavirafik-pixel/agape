/** Contiguous rows keep family names in the same alphabetical reading order. */
export function familyRows<T>(families: T[], columns: number): T[][] {
  const width = Math.max(1, Math.floor(columns));
  return Array.from(
    { length: Math.ceil(families.length / width) },
    (_, index) => families.slice(index * width, (index + 1) * width),
  );
}
