// Pure helpers for the hand-built SVG charts (replacing Plotly).

// "Nice numbers" axis algorithm. Returns evenly spaced, rounded tick values
// spanning [0, max] (amounts are always positive via Math.abs at read time).
export function niceTicks(max, targetCount = 5) {
  if (!(max > 0)) return { ticks: [0, 1], max: 1 };
  const rawStep = max / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let step;
  if (norm <= 1) step = 1;
  else if (norm <= 2) step = 2;
  else if (norm <= 2.5) step = 2.5;
  else if (norm <= 5) step = 5;
  else step = 10;
  step *= mag;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= niceMax + step / 2; v += step) ticks.push(v);
  return { ticks, max: niceMax };
}

// Compact currency label for axes, e.g. $0, $1.2k, $3.4M. Full precision is
// kept in tooltips via currencyFormat from plotUtils.
export function currencyAxisFormat(x) {
  const sign = x < 0 ? '-' : '';
  const abs = Math.abs(x);
  if (abs >= 1e6) return `${sign}$${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}$${trim(abs / 1e3)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function trim(n) {
  // Up to one decimal place, no trailing ".0".
  return (Math.round(n * 10) / 10).toString();
}

// Pick indices of labels to show so at most `maxLabels` are rendered, always
// keeping the first and last. Returns a Set of indices.
export function thinLabelIndices(count, maxLabels) {
  const keep = new Set();
  if (count <= 0) return keep;
  if (count <= maxLabels || maxLabels < 2) {
    for (let i = 0; i < count; i++) keep.add(i);
    return keep;
  }
  const stride = Math.ceil((count - 1) / (maxLabels - 1));
  for (let i = 0; i < count; i += stride) keep.add(i);
  keep.add(count - 1);
  return keep;
}
