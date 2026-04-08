import dayjs from 'dayjs';

export function sortedUniqueArray({ array, reverse = false }) {
  const arr = Array.from(new Set(array)).sort();
  if (reverse) arr.reverse();
  return arr;
}

export function allTimesBetween({ minTime, maxTime, timeFrame, reverse = false }) {
  const allTimes = [];
  let time = minTime;
  while (time <= maxTime) {
    allTimes.push(time);
    time = dayjs(time + (timeFrame === 'month' ? '-01' : '-01-01'))
      .add(1, timeFrame)
      .format(timeFrame === 'month' ? 'YYYY-MM' : 'YYYY');
  }
  if (reverse) allTimes.reverse();
  return allTimes;
}
