/** Balance the extra space of one open family across the directory's columns. */
export function familyGrid(
  count: number,
  columns: number,
  openIndex = -1,
  openRows = 1,
) {
  const width = Math.max(1, Math.floor(columns));
  const open = openIndex >= 0 && openIndex < count;
  const span = open ? Math.max(1, Math.ceil(openRows)) : 1;
  const openColumn = open ? openIndex % width : -1;
  const loads = Array<number>(width).fill(0);
  if (open) loads[openColumn] = span;
  const quotas = Array<number>(width).fill(0);
  const order = Array.from(
    { length: width },
    (_, index) => (index + (open ? openColumn : 0)) % width,
  );
  for (let i = 0; i < count - Number(open); i++) {
    const shortest = order.reduce((best, column) =>
      loads[column] < loads[best] ? column : best,
    );
    quotas[shortest]++;
    loads[shortest]++;
  }
  const groups = Array.from({ length: width }, () => [] as number[]);
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    if (open && i === openIndex) continue;
    while (groups[cursor % width].length >= quotas[cursor % width]) cursor++;
    groups[cursor % width].push(i);
    cursor++;
  }
  if (open)
    groups[openColumn].splice(
      Math.min(Math.floor(openIndex / width), groups[openColumn].length),
      0,
      openIndex,
    );
  const positions = Array<{ column: number; row: number; span: number }>(count);
  groups.forEach((items, column) => {
    let row = 1;
    items.forEach((index) => {
      const rows = open && index === openIndex ? span : 1;
      positions[index] = { column: column + 1, row, span: rows };
      row += rows;
    });
  });
  return positions;
}
