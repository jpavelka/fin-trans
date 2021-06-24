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
  const { settings } = useContext(AuthContext);
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
  content.push(
    <div style={{margin: '10pt'}}>
      <button onClick={() => setShowCategoryModal(true)} style={{marginRight: '5pt'}}>
        Category Detail
      </button>
      <button onClick={() => setShowTagModal(true)}>Tag Detail</button>
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
  );
  content.push(<hr />);
  return <>{content}</>;
};

const DropdownFromList = ({
  label,
  options,
  selectionKey,
  selectionValues,
  setSelectionValues,
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
