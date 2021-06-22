import React, { useContext } from "react";
import Select from "react-select";
import { AuthContext } from "../auth/Auth";

const Selections = ({
  selectionValues,
  setSelectionValues,
  allMetaCats,
  allTimes,
}) => {
  const { settings } = useContext(AuthContext);
  allMetaCats = [{ value: "_all", label: "All" }].concat(allMetaCats);
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
  const content = dropdownArgs.map((selGroup) => {
    const selGroupContent = selGroup.map((sel) => {
      return (
        <DropdownFromList
          key={sel.selectionKey}
          selectionValues={selectionValues}
          setSelectionValues={setSelectionValues}
          {...sel}
        />
      );
    });
    return (
      <div
        style={{ display: "flex", marginTop: "5pt" }}
        key={selGroup[0].selectionKey}
      >
        {selGroupContent}
      </div>
    );
  });
  if (selectionValues.plotType === "trend"){
    content.push((
      <div style={{margin: '5pt 10pt'}}>
        {`Include Avg. `}
        <input
          type="checkbox"
          checked={selectionValues.includeAverages}
          onChange={(e) =>
            changeSelectionValue({
              key: "includeAverages",
              val: e.target.checked,
              setValueFunc: setSelectionValues,
            })
          }
        />
      </div>
    ))
    content.push(<hr />)
  }
  return (
    <>
      {content}
    </>
  );
};

const DropdownFromList = ({
  label,
  options,
  selectionKey,
  selectionValues,
  setSelectionValues,
}) => {
  const sanitize = (s) => {
    return s.replace("-", "").replace("/", "");
  };
  options = options
    .map((opt) => {
      return typeof opt === "string" ? (opt = { value: opt, label: opt }) : opt;
    })
    .map((opt) => {
      return {
        originalValue: opt.value,
        value: sanitize(opt.value),
        label: opt.label,
      };
    });
  let defaultValue = options.filter(
    (opt) => opt.originalValue === selectionValues[selectionKey]
  );
  const onChange = (e) => {
    changeSelectionValue({
      key: selectionKey,
      val: e.originalValue,
      setValueFunc: setSelectionValues,
    });
  };
  return (
    <div style={{ width: "100pt", marginLeft: "10pt" }}>
      {label}
      <Select options={options} value={defaultValue} onChange={onChange} />
    </div>
  );
};

const changeSelectionValue = ({ key, val, setValueFunc }) => {
  setValueFunc((v) => {
    let newValue = {};
    newValue[key] = val;
    return { ...v, ...newValue };
  });
};

export default Selections;
