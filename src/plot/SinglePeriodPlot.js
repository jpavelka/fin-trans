import Plot from "react-plotly.js";
import { sortedUniqueArray } from "../utils/utils.js";
import { currencyFormat, dateFormat, getGroupedData } from "./utils.js";

export const SinglePeriodPlot = ({
  plotTx,
  metaCategory,
  timeFrame,
  time,
  txType,
  setTableFilters
}) => {
  const groupOn = metaCategory === "_all" ? "metaCategory" : "category";
  const groupedData = getGroupedData({
    allTx: plotTx,
    groupOn: [groupOn],
    includeAll: [false],
  });
  const plotData = getPlotData({ groupedData: groupedData });
  const plotLayout = getPlotLayout({
    timeFrame: timeFrame,
    time: time,
    txType: txType,
    metaCategory: metaCategory,
  });
  return (
    <Plot
      layout={plotLayout}
      data={plotData}
      useResizeHandler={true}
      style={{ width: "100%", height: "100%" }}
      onClick={(e) => {
        let filters = {}
        filters[groupOn] = e.points[0].x;
        setTableFilters(filters);
      }}
    />
  );
};

const getPlotData = ({ groupedData }) => {
  let plotData = {
    type: "bar",
    hoverinfo: "text",
    x: [],
    y: [],
    text: [],
  };
  for (const cat of sortedUniqueArray({ array: Object.keys(groupedData) })) {
    const data = groupedData[cat];
    const y = data.map((d) => d.amount).reduce((a, b) => a + b, 0);
    plotData.x.push(cat);
    plotData.y.push(y);
    plotData.text.push(`${cat}<br>${currencyFormat(y)}`);
  }
  return [plotData];
};

const getPlotLayout = ({ timeFrame, time, txType, metaCategory }) => {
  const title = `${metaCategory === '_all' ? 'All' : metaCategory} ${
    txType === "expense" ? "Expenses" : "Income"
  } - ${dateFormat({ d: time, timeFrame: timeFrame })}`;
  return {
    title: title,
    autosize: true,
    hovermode: "closest",
  };
};

export default SinglePeriodPlot;
