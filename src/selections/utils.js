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
        label: "Plot Type",
        options: [
          { value: "monthTrend", label: "Month Trend" },
          { value: "singleMonth", label: "Single Month" },
          { value: "yearTrend", label: "Year Trend" },
          { value: "singleYear", label: "Month Year" },
        ],
        selectionKey: "plotTypeFull",
      }
    ]
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
  dropdownArgs.push(
    [{
      label: "Meta Category",
      options: allMetaCats,
      selectionKey: "metaCategory"
    }]
  )
  return dropdownArgs;
};

export const sanitize = (s) => {
  return s.replace("-", "").replace("/", "").replace(" ", "");
};
