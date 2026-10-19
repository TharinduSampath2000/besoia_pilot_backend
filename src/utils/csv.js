function cell(value) {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(header, rows) {
  return [header.join(','), ...rows.map((row) => row.map(cell).join(','))].join('\n');
}
