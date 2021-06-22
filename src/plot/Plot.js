import React from "react";
import SinglePeriodPlot from "./SinglePeriodPlot";
import TrendPlot from "./TrendPlot";

const Plot = ({
  plotTx,
  selectionValues,
  setTableFilters
}) => {
  return (
    <div style={{height: '550px'}}>
      {selectionValues.plotType === "trend" ? (
        <TrendPlot
          plotTx={plotTx}
          txType={selectionValues.txType}
          metaCategory={selectionValues.metaCategory}
          timeFrame={selectionValues.timeFrame}
          minTime={selectionValues.minTime}
          maxTime={selectionValues.maxTime}
          includeAverages={selectionValues.includeAverages}
          setTableFilters={setTableFilters}
        />
      ) : (
        <SinglePeriodPlot plotTx={plotTx} />
      )}
    </div>
  );
};

export default Plot;
