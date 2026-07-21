function stripOuterComments(sql) {
  return sql
    .replace(/^\uFEFF/u, "")
    .replace(/^(?:(?:\s+)|(?:--[^\r\n]*(?:\r?\n|$))|(?:\/\*[\s\S]*?\*\/))*/u, "")
    .replace(/(?:(?:\s+)|(?:--[^\r\n]*(?:\r?\n|$))|(?:\/\*[\s\S]*?\*\/))*$/u, "");
}

export function migrationBody(sql, filename) {
  const normalized = stripOuterComments(sql);
  const transaction = normalized.match(/^begin;\s+([\s\S]+?)\s+commit;$/iu);
  if (!transaction) {
    throw new Error(`${filename} is not transaction wrapped`);
  }
  return transaction[1].trim();
}
