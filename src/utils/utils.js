import dayjs from "dayjs";

export const sortedUniqueArray = ({ array, reverse = false }) => {
  let arr = Array.from(new Set(array)).sort();
  if (reverse) {
    return arr.reverse();
  }
  return arr;
};

export const allTimesBetween = ({
  minTime,
  maxTime,
  timeFrame,
  reverse = false,
}) => {
  let allTimes = [];
  let time = minTime;
  while (time <= maxTime) {
    const t = time;
    allTimes.push(t);
    time = dayjs(t + (timeFrame === "month" ? "-01" : "-01-01"))
      .add(1, timeFrame)
      .format(timeFrame === "month" ? "YYYY-MM" : "YYYY");
  }
  if (reverse){
    allTimes.reverse()
  }
  return allTimes;
};
