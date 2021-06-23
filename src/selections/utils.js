export const getDropdownArgs = ({
  settings,
  allMetaCats,
  selectionValues,
  allTimes,
}) => {
  const dropdownArgs = [
    [
      {
        label: "Category Grouping",
        options: Object.keys(settings.metaCategories).filter(
          (mc) => mc !== "_default"
        ),
        selectionKey: "metaCatVersion",
      },
      {
        label: "Category Changes",
        options: Object.keys(settings.categoryChanges).filter(
          (mc) => mc !== "_default"
        ),
        selectionKey: "categoryChangeVersion",
      },
    ],
    [
      {
        label: "Transaction Type",
        options: [{ value: "expense", label: "Expense" }],
        selectionKey: "txType",
      },
      {
        label: "Plot Type",
        options: [
          { value: "trend", label: "Trend" },
          { value: "singlePeriod", label: "Single Period" },
        ],
        selectionKey: "plotType",
      },
      {
        label: "Meta Category",
        options: allMetaCats,
        selectionKey: "metaCategory",
      },
    ],
    [
      {
        label: "Time Frame",
        options: [
          { value: "month", label: "Month" },
          { value: "year", label: "Year" },
        ],
        selectionKey: "timeFrame",
      },
    ],
  ];
  const lastInd = dropdownArgs.length - 1;
  if (selectionValues.plotType === "trend") {
    dropdownArgs[lastInd] = dropdownArgs[lastInd].concat([
      {
        label: `Start ${
          selectionValues.timeFrame === "month" ? "Month" : "Year"
        }`,
        options: allTimes,
        selectionKey: "minTime",
      },
      {
        label: `End ${
          selectionValues.timeFrame === "month" ? "Month" : "Year"
        }`,
        options: allTimes,
        selectionKey: "maxTime",
      },
    ]);
  } else {
    dropdownArgs[lastInd] = dropdownArgs[lastInd].concat([
      {
        label: selectionValues.timeFrame === "month" ? "Month" : "Year",
        options: allTimes,
        selectionKey: "maxTime",
      },
    ]);
  }
  return dropdownArgs;
};

export const sanitize = (s) => {
  return s.replace("-", "").replace("/", "").replace(" ", "");
};
