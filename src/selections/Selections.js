import React, { useContext, useState } from "react";
import Select from "react-select";
import { AuthContext } from "../auth/Auth";
import CategoryModal from "./CategoryModal";
import TagModal from "./TagModal";
import { getDropdownArgs, sanitize } from "./utils";

const Selections = ({
  selectionValues,
  setSelectionValues,
  allMetaCats,
  allTimes,
  metaCategories,
  allTags,
}) => {
  const { settings, minLoadMonth, setMinLoadMonth } = useContext(AuthContext);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  allMetaCats = [{ value: "_all", label: "All" }].concat(allMetaCats);
  const dropdownArgs = getDropdownArgs({
    settings: settings,
    allMetaCats: allMetaCats,
    selectionValues: selectionValues,
    allTimes: allTimes,
  });
  const content = dropdownArgs.map((selGroup) => {
    const selGroupContent = selGroup.map((sel) => {
      return (
        <DropdownFromList
          key={sel.selectionKey}
          selectionValues={selectionValues}
          setSelectionValues={setSelectionValues}
          minLoadMonth={minLoadMonth}
          setMinLoadMonth={setMinLoadMonth}
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
  const extraContent = (
    <div style={{ margin: "10pt" }}>
      <button
        onClick={() => setShowCategoryModal(true)}
        style={{ marginRight: "5pt" }}
      >
        Category Detail
      </button>
      <button onClick={() => setShowTagModal(true)}>Tag Detail</button>
      <span style={{marginLeft: '0.5rem'}}>
        <input
          type="checkbox"
          id={"selectAmortizeCheckbox"}
          defaultChecked={selectionValues.amortize}
          onChange={() => {
            changeSelectionValue({
              key: "amortize",
              val: !selectionValues.amortize,
              setValueFunc: setSelectionValues,
            });
          }}
        />
        <label for={"selectAmortizeCheckbox"}>&nbsp;&nbsp;Use Amortization</label>
      </span>
      <CategoryModal
        show={showCategoryModal}
        setShow={setShowCategoryModal}
        selectionValues={selectionValues}
        setSelectionValues={setSelectionValues}
        metaCategories={metaCategories}
      />
      <TagModal
        show={showTagModal}
        setShow={setShowTagModal}
        selectionValues={selectionValues}
        setSelectionValues={setSelectionValues}
        allTags={allTags}
      />
    </div>
  )
  return (
    <>
      {content}
      {extraContent}
      <hr/>
    </>
  );
};

const DropdownFromList = ({
  label,
  options,
  selectionKey,
  selectionValues,
  setSelectionValues,
  minLoadMonth,
  setMinLoadMonth,
}) => {
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
    const value = e.originalValue;
    changeSelectionValue({
      key: selectionKey,
      val: value,
      setValueFunc: setSelectionValues,
    });
    if (selectionKey === "plotTypeFull") {
      if (value === "monthTrend") {
        changeSelectionValue({key: "plotType", val: "trend", setValueFunc: setSelectionValues});
        changeSelectionValue({key: "timeFrame", val: "month", setValueFunc: setSelectionValues});
      } else if (value === "singleMonth") {
        changeSelectionValue({key: "plotType", val: "singlePeriod", setValueFunc: setSelectionValues});
        changeSelectionValue({key: "timeFrame", val: "month", setValueFunc: setSelectionValues});
      } else if (value === "yearTrend") {
        changeSelectionValue({key: "plotType", val: "trend", setValueFunc: setSelectionValues});
        changeSelectionValue({key: "timeFrame", val: "year", setValueFunc: setSelectionValues});
      } else if (value === "singleYear") {
        changeSelectionValue({key: "plotType", val: "singlePeriod", setValueFunc: setSelectionValues});
        changeSelectionValue({key: "timeFrame", val: "year", setValueFunc: setSelectionValues});
      }
    }
    if (selectionKey === "timeFrame") {
      if (selectionValues.plotType === "trend") {
        if (value === "year") {
          const newMinTime = selectionValues.minTime.slice(0, 4);
          changeSelectionValue({
            key: "minTime",
            val: newMinTime,
            setValueFunc: setSelectionValues,
          });
          changeSelectionValue({
            key: "maxTime",
            val: selectionValues.maxTime.slice(0, 4),
            setValueFunc: setSelectionValues,
          });
          if (newMinTime + "-01" < minLoadMonth) {
            setMinLoadMonth(newMinTime + "-01");
          }
        } else {
          changeSelectionValue({
            key: "minTime",
            val: selectionValues.minTime + "-01",
            setValueFunc: setSelectionValues,
          });
          changeSelectionValue({
            key: "maxTime",
            val: selectionValues.maxTime + "-12",
            setValueFunc: setSelectionValues,
          });
        }
      } else {
        if (value === "year") {
          const newTime = selectionValues.maxTime.slice(0, 4);
          changeSelectionValue({
            key: "maxTime",
            val: newTime,
            setValueFunc: setSelectionValues,
          });
          if (newTime + "-01" < minLoadMonth) {
            setMinLoadMonth(newTime + "-01");
          }
        } else {
          changeSelectionValue({
            key: "maxTime",
            val: selectionValues.maxTime + "-01",
            setValueFunc: setSelectionValues,
          });
        }
      }
    }
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
