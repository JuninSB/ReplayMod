// Search only metadata already shown in or associated with the library.
const normalize = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

export function filterCaptures(rows, mode, query) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter(row => {
    const fields = mode === 'rep'
      ? [row.replayName, row.replayId, row.serverId, row.placeId, row.timestamp]
      : [row.snapshotName, row.serverName, row.serverId, row.placeId, row.timestamp];
    const text = normalize(fields.filter(value => value != null).join(' '));
    return terms.every(term => text.includes(term));
  });
}
