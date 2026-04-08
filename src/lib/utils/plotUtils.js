import dayjs from 'dayjs';
import { sortedUniqueArray } from './utils.js';

export function getGroupedData({ allTx, groupOn, includeAll }) {
  const [thisGroupOn, nextGroupOn] = Array.isArray(groupOn)
    ? [groupOn[0], groupOn.slice(1)]
    : [groupOn, []];
  const [thisIncludeAll, nextIncludeAll] = Array.isArray(includeAll)
    ? [includeAll[0], includeAll.slice(1)]
    : [includeAll, []];

  const groupedData = {};
  for (const group of sortedUniqueArray({ array: allTx.map((x) => x[thisGroupOn]) })) {
    groupedData[group] = [];
  }
  for (const tx of allTx) {
    groupedData[tx[thisGroupOn]].push(tx);
  }
  if (thisIncludeAll) groupedData['_all'] = allTx;

  if (nextGroupOn.length > 0) {
    for (const group of Object.keys(groupedData)) {
      groupedData[group] = getGroupedData({
        allTx: groupedData[group],
        groupOn: nextGroupOn,
        includeAll: nextIncludeAll,
      });
    }
  }
  return groupedData;
}

export function incrementTime({ timeFrame, time }) {
  return timeFrame === 'month'
    ? dayjs(time + '-01').add(1, 'month').format('YYYY-MM')
    : dayjs(time + '-01-01').add(1, 'year').format('YYYY');
}

export function currencyFormat(x) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(x);
}

export function dateFormat({ d, timeFrame }) {
  return timeFrame === 'month' ? dayjs(d + '-01').format('MMM YYYY') : d;
}

export function dateFormatInv({ d, timeFrame }) {
  return timeFrame === 'month' ? dayjs('1 ' + d).format('YYYY-MM') : d;
}

const PLOT_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function addColors(traces) {
  let i = 0;
  for (const trace of traces) {
    trace.line = trace.line || {};
    const isAvg = !!trace._isAvg;
    if (isAvg) i -= 1;
    trace.line.color = hexToRgba(PLOT_COLORS[i % PLOT_COLORS.length], isAvg ? 0.5 : 1);
    i += 1;
  }
  return traces;
}
