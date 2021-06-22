import Plot from "react-plotly.js";
import {
  getGroupedData,
  dateFormat,
  dateFormatInv,
  currencyFormat,
  incrementTime,
  addColors,
} from "./utils";

const TrendPlot = ({
  plotTx,
  txType,
  metaCategory,
  timeFrame,
  minTime,
  maxTime,
  includeAverages,
  setTableFilters,
}) => {
  const groupOn = metaCategory === "_all" ? "metaCategory" : "category";
  const groupedData = getGroupedData({
    allTx: plotTx,
    groupOn: [groupOn, timeFrame],
    includeAll: [true, false],
  });
  const plotData = getPlotData({
    groupedData: groupedData,
    groupOn: groupOn,
    timeFrame: timeFrame,
    minTime: minTime,
    maxTime: maxTime,
    includeAverages: includeAverages,
  });
  const plotLayout = getPlotLayout({
    timeFrame: timeFrame,
    minTime: minTime,
    maxTime: maxTime,
    txType: txType,
  });
  return (
    <Plot
      layout={plotLayout}
      data={plotData}
      useResizeHandler={true}
      style={{ width: "100%", height: "100%" }}
      onClick={(e) => {
        const data = e.points[0].data;
        if (data._isAvg) {
          return;
        }
        let filters = {
          date: dateFormatInv({ d: e.points[0].x, timeFrame: timeFrame }),
        };
        if (data._cat !== "_all") {
          filters[data._groupOn] = data._cat;
        }
        setTableFilters(filters);
      }}
    />
  );
};

const getPlotLayout = ({ timeFrame, minTime, maxTime, txType }) => {
  const title = `${timeFrame === "month" ? "Month" : "Year"}ly Trends - ${
    txType === "expense" ? "Expenses" : "Income"
  }`;
  const subTitle = `${dateFormat({
    d: minTime,
    timeFrame: timeFrame,
  })} - ${dateFormat({ d: maxTime, timeFrame: timeFrame })}`;
  return {
    title: `${title}<br><sub>${subTitle}</sub>`,
    autosize: true,
    hovermode: "closest",
  };
};

const getPlotData = ({
  groupedData,
  groupOn,
  timeFrame,
  minTime,
  maxTime,
  includeAverages,
}) => {
  let plotData = [];
  for (const [cat, catData] of Object.entries(groupedData)) {
    let time = minTime;
    let x = [];
    let y = [];
    let text = [];
    const catName = cat === "_all" ? "Total" : cat;
    while (time <= maxTime) {
      x.push(dateFormat({ d: time, timeFrame: timeFrame }));
      let yVal = 0;
      for (const tx of catData[time] || []) {
        yVal += tx.amount;
      }
      y.push(yVal);
      text.push(
        `${catName}<br>${dateFormat({
          d: time,
          timeFrame: timeFrame,
        })}<br>${currencyFormat(yVal)}`
      );
      time = incrementTime({ timeFrame: timeFrame, time: time });
    }
    const totalY = y.reduce((a, b) => a + b, 0);
    const newData = {
      _cat: cat,
      _groupOn: groupOn,
      name: `${catName} - ${currencyFormat(totalY)}`,
      legendgroup: cat,
      type: "scatter",
      hoverinfo: "text",
      text: text,
      x: x,
      y: y,
    };
    plotData.push(newData);
    if (includeAverages) {
      const avgY = totalY / newData.y.length
      const avgData = {
        ...newData,
        ...{
          _cat: newData._cat + "_avg",
          _isAvg: true,
          showlegend: false,
          text: `Avg. ${catName}<br>${currencyFormat(avgY)}`,
          y: newData.y.map((y) => avgY),
        },
      };
      plotData.push(avgData);
    }
  }
  plotData = plotData.sort((a, b) => {
    [a, b] = [a, b].map((x) => x._cat.replace("_", "A".repeat(10)));
    return a < b ? -1 : 1;
  });
  plotData = addColors(plotData);
  return plotData;
};

export default TrendPlot;
