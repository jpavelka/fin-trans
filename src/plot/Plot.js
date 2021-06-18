import React from "react";
import SinglePeriodPlot from "./SinglePeriodPlot";
import TrendPlot from "./TrendPlot";

const Plot = ({
  plotType,
  plotTx,
  txType,
  metaCategory,
  timeFrame,
  minTime,
  maxTime,
  setTableFilters
}) => {
  return (
    <div style={{width: '90vw', height: '500px'}}>
      {plotType === "trend" ? (
        <TrendPlot
          plotTx={plotTx}
          txType={txType}
          metaCategory={metaCategory}
          timeFrame={timeFrame}
          minTime={minTime}
          maxTime={maxTime}
          setTableFilters={setTableFilters}
        />
      ) : (
        <SinglePeriodPlot plotTx={plotTx} />
      )}
      ;
    </div>
  );
};

export default Plot;
