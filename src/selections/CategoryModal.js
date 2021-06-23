import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import Select from "react-select";
import { sanitize } from "./utils";
import { sortedUniqueArray } from "../utils/utils";

const CategoryModal = ({
  show,
  setShow,
  metaCategories,
  selectionValues,
  setSelectionValues,
}) => {
  const options = getOptions(metaCategories);
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const [disabledMetaCategories, setDisabledMetaCategories] = useState([]);
  const [checkChanged, setCheckChanged] = useState({
    metaCats: {},
    cats: {},
  });
  const selS = selectedOption.originalValue;
  const handleClose = () => {
    setCheckChanged({ metaCats: {}, cats: {} });
    setShow(false);
  };
  return (
    <div>
      <Modal show={show}>
        <Modal.Header>
          <h3>Category Detail</h3>
        </Modal.Header>
        <Modal.Body>
          Select a meta-category
          <Select
            options={options}
            defaultValue={selectedOption}
            onChange={(opt) => setSelectedOption(opt)}
          ></Select>
          {Object.keys(metaCategories).map((mc) => {
            return (
              <MetaCatCheckBoxes
                metaCat={mc}
                metaCategories={metaCategories}
                checkChanged={checkChanged}
                setCheckChanged={setCheckChanged}
                selectionValues={selectionValues}
                disabledMetaCategories={disabledMetaCategories}
                setDisabledMetaCategories={setDisabledMetaCategories}
                show={mc === selS}
              />
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => {
              setSelectionValues((v) => {
                let imc = v.inactiveMetaCategories;
                for (const mc of Object.keys(checkChanged.metaCats)) {
                  if (checkChanged.metaCats[mc]) {
                    if (imc.includes(mc)) {
                      imc = imc.filter((x) => x !== mc);
                    } else {
                      imc.push(mc);
                    }
                  }
                }
                let ic = v.inactiveCategories;
                for (const c of Object.keys(checkChanged.cats)) {
                  if (checkChanged.cats[c]) {
                    if (ic.includes(c)) {
                      ic = ic.filter((x) => x !== c);
                    } else {
                      ic.push(c);
                    }
                  }
                }
                return {
                  ...v,
                  ...{ inactiveMetaCategories: imc, inactiveCategories: ic },
                };
              });
              handleClose();
            }}
          >
            Save
          </button>
          <button onClick={() => handleClose()}>Cancel</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

const MetaCatCheckBoxes = ({
  show,
  metaCat,
  metaCategories,
  checkChanged,
  setCheckChanged,
  selectionValues,
  disabledMetaCategories,
  setDisabledMetaCategories,
}) => {
  return (
    <div
      style={{ ...{ marginTop: "5pt" }, ...(show ? {} : { display: "none" }) }}
    >
      <input
        type="checkbox"
        id={getMetaCatId(metaCat)}
        defaultChecked={
          !selectionValues.inactiveMetaCategories.includes(metaCat)
        }
        onChange={(e) => {
          changeCheckChanged({
            catOrMetaCat: "metaCats",
            key: metaCat,
            setCheckChanged: setCheckChanged,
          });
        }}
      />
      <label for={getMetaCatId(metaCat)}>&nbsp;&nbsp;{metaCat}</label>
      <div style={{ marginLeft: "5pt" }}>
        {metaCategories[metaCat].map((x) => {
          return (
            <div>
              <input
                id={getCatId(x)}
                type="checkbox"
                defaultChecked={!selectionValues.inactiveCategories.includes(x)}
                disabled={
                  (selectionValues.inactiveMetaCategories.includes(metaCat) &&
                    !checkChanged.metaCats[metaCat]) ||
                  (!selectionValues.inactiveMetaCategories.includes(metaCat) &&
                    !!checkChanged.metaCats[metaCat])
                }
                onChange={() =>
                  changeCheckChanged({
                    catOrMetaCat: "cats",
                    key: x,
                    setCheckChanged: setCheckChanged,
                  })
                }
              />
              <label for={getCatId(x)}>&nbsp;&nbsp;{x}</label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const changeCheckChanged = ({ catOrMetaCat, key, setCheckChanged }) => {
  const other = catOrMetaCat === "cats" ? "metaCats" : "cats";
  setCheckChanged((v) => {
    let thisObj = v[catOrMetaCat];
    const otherObj = v[other];
    thisObj[key] = !thisObj[key];
    let obj = {};
    obj[catOrMetaCat] = thisObj;
    obj[other] = otherObj;
    return obj;
  });
};

const getOptions = (metaCategories) => {
  return sortedUniqueArray({ array: Object.keys(metaCategories) }).map((c) => {
    return {
      originalValue: c,
      value: sanitize(c),
      label: c,
    };
  });
};

const getMetaCatId = (mc) => {
  return `${sanitize(mc)}MetaCatSel`;
};

const getCatId = (c) => {
  return `${sanitize(c)}CatSel`;
};

export default CategoryModal;
