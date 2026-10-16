function cell(value) {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function sendCsv(response, filename, header, rows) {
  const lines = [header.join(','), ...rows.map((row) => row.map(cell).join(','))];
  response.attachment(filename).type('text/csv').send(lines.join('\n'));
}
