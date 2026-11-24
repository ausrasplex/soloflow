// A first guess at a transaction's category from its description. Milestone 2 replaces this with
// the business's own categories and rules.
export function categorize(desc: string, credit: number) {
  const d = desc.toLowerCase();
  if (credit > 0) return /interest/.test(d) ? 'Interest' : 'Sales';
  const rules: [RegExp, string][] = [
    [/shell|bp |caltex|ampol|7-eleven|fuel|petrol|united petroleum/, 'Fuel'],
    [/bunnings|mitre 10|reece|middys|haymans|rexel|tradelink|hardware/, 'Materials'],
    [/telstra|optus|vodafone|internet|nbn|aussie broadband/, 'Phone and internet'],
    [/insurance|nrma|racv|allianz|aami|cgu|qbe/, 'Insurance'],
    [/officeworks|stationery|xero|myob|quickbooks/, 'Office'],
    [/rego|registration|vicroads|service nsw|tyre|mechanic|toll|linkt|parking/, 'Vehicle'],
    [/licen[cs]e|council|permit/, 'Licences and fees'],
    [/fee|charge/, 'Bank fees'],
    [/\bato\b|tax office/, 'Tax payments'],
    [/transfer|tfr/, 'Transfers']
  ];
  for (const [re, c] of rules) if (re.test(d)) return c;
  return 'Other';
}
