import dayjs from "dayjs";

export const sortedUniqueArray = ({ array, reverse = false }) => {
  let arr = Array.from(new Set(array)).sort();
  if (reverse) {
    return arr.reverse();
  }
  return arr;
};

export const getGroupedData = ({ allTx, groupOn, includeAll }) => {
  const [thisGroupOn, nextGroupOn] = Array.isArray(groupOn)
    ? [groupOn[0], groupOn.slice(1)]
    : [groupOn, []];
  const [thisIncludeAll, nextIncludeAll] = Array.isArray(includeAll)
    ? [includeAll[0], includeAll.slice(1)]
    : [includeAll, []];
  const allGroups = sortedUniqueArray({
    array: allTx.map((x) => x[thisGroupOn]),
  });
  let groupedData = {};
  for (const group of allGroups) {
    groupedData[group] = [];
  }
  for (const tx of allTx) {
    groupedData[tx[thisGroupOn]].push(tx);
  }
  if (thisIncludeAll) {
    groupedData["_all"] = allTx;
  }
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
};

export const incrementTime = ({ timeFrame, time }) => {
  return timeFrame === "month"
    ? dayjs(time + "-01")
        .add(1, "month")
        .format("YYYY-MM")
    : dayjs(time + "-01-01")
        .add(1, "year")
        .format("YYYY");
};

export const currencyFormat = (x) => {
  var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  return formatter.format(x);
}

export const dateFormat = ({d, timeFrame}) => {
  return timeFrame === 'month' ? (
    dayjs(d + '-01').format('MMM YYYY')
  ) : d
}

export const dateFormatInv = ({d, timeFrame}) => {
  return timeFrame === 'month' ? (
    dayjs('1 ' + d).format('YYYY-MM')
  ) : d
}
