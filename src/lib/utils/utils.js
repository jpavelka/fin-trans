import dayjs from 'dayjs';

export function sortedUniqueArray({ array, reverse = false }) {
  const arr = Array.from(new Set(array)).sort();
  if (reverse) arr.reverse();
  return arr;
}

export function allTimesBetween({ minTime, maxTime, timeFrame, reverse = false }) {
  const allTimes = [];
  // Bounds may arrive as YYYY-MM even for a year timeframe; trim to YYYY first
  // so the loop compares and increments like values.
  let time = timeFrame === 'month' ? minTime : minTime.slice(0, 4);
  const end = timeFrame === 'month' ? maxTime : maxTime.slice(0, 4);
  while (time <= end) {
    allTimes.push(time);
    time = dayjs(time + (timeFrame === 'month' ? '-01' : '-01-01'))
      .add(1, timeFrame)
      .format(timeFrame === 'month' ? 'YYYY-MM' : 'YYYY');
  }
  if (reverse) allTimes.reverse();
  return allTimes;
}
