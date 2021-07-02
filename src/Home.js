import { useContext, useState, useEffect } from "react";
import { AuthContext, signOutFunc } from "./auth/Auth";
import { Accordion } from "react-bootstrap";
import Table from "./table/Table";
import Plot from "./plot/Plot";
import Selections from "./selections/Selections";
import transformTransactions from "./utils/transactions";
import { sortedUniqueArray, allTimesBetween } from "./utils/utils";
import "bootstrap/dist/css/bootstrap.min.css";

const Home = ({ history }) => {
  const {
    currentUser,
    setCurrentUser,
    txData,
    settings,
    minLoadMonth,
    maxLoadMonth,
    setMinLoadMonth,
    loadingData,
  } = useContext(AuthContext);
  const [selectionValues, setSelectionValues] = useState({
    metaCatVersion: undefined,
    categoryChangeVersion: undefined,
    txType: "expense",
    inactiveCategories: [],
    inactiveMetaCategories: [],
    requiredTags: [],
    forbiddenTags: [],
    plotType: "trend",
    metaCategory: "_all",
    timeFrame: "month",
    minTime: undefined,
    maxTime: undefined,
    amortize: false,
  });
  const [tableFilters, setTableFilters] = useState({});
  const [waitForLoad, setWaitForLoad] = useState(loadingData);
  useEffect(() => {
    setWaitForLoad(loadingData);
  }, [loadingData]);
  useEffect(() => {
    if (!!selectionValues.minTime) {
      setMinLoadMonth((m) => {
        const newTime =
          selectionValues.minTime.length === 4
            ? selectionValues.minTime + "-01"
            : selectionValues.minTime;
        return newTime < m ? newTime : m;
      });
    }
  }, [selectionValues.minTime, setMinLoadMonth]);
  useEffect(() => {
    if (!!settings && !!minLoadMonth && !!maxLoadMonth) {
      setSelectionValues((v) => {
        let newObj = {};
        if (!!!v.metaCatVersion) {
          newObj.metaCatVersion = (settings.metaCategories || {})._default;
        }
        if (!!!v.categoryChanges) {
          newObj.categoryChangeVersion = (
            settings.categoryChanges || {}
          )._default;
        }
        if (!!!v.minTime) {
          newObj.minTime = minLoadMonth;
        }
        if (!!!v.maxTime) {
          newObj.maxTime = maxLoadMonth;
        }
        return { ...v, ...newObj };
      });
    }
  }, [settings, minLoadMonth, maxLoadMonth]);
  let allTx = [];
  for (const k of Object.keys(txData || {})) {
    allTx = allTx.concat(
      transformTransactions({
        transactions: txData[k],
        metaCategories: settings.metaCategories[selectionValues.metaCatVersion],
        categoryChanges:
          settings.categoryChanges[selectionValues.categoryChangeVersion],
      })
    );
  }
  if (!!!currentUser) {
    history.push("/fin-trans/login");
  }
  if (
    !!!settings ||
    !!!selectionValues.metaCatVersion ||
    !!!selectionValues.categoryChangeVersion
  ) {
    return <div>Loading...</div>;
  }
  let allTags = [];
  for (const tx of allTx) {
    allTags = allTags.concat(tx.tags || []);
  }
  allTags = sortedUniqueArray({ array: allTags });
  allTx = allTx.filter((tx) => {
    return (
      tx[selectionValues.timeFrame] >= selectionValues.minTime &&
      tx[selectionValues.timeFrame] <= selectionValues.maxTime &&
      tx.type === selectionValues.txType &&
      !selectionValues.inactiveCategories.includes(tx.category) &&
      !selectionValues.inactiveMetaCategories.includes(tx.metaCategory) &&
      (tx.tags || [])
        .map((tag) => {
          return selectionValues.requiredTags.includes(tag) ? 1 : 0;
        })
        .reduce((a, b) => a + b, 0) === selectionValues.requiredTags.length &&
      (tx.tags || [])
        .map((tag) => {
          return selectionValues.forbiddenTags.includes(tag) ? 1 : 0;
        })
        .reduce((a, b) => a + b, 0) === 0 &&
      (selectionValues.amortize ? !tx.skipIfAmortize : !tx.skipIfNoAmortize)
    );
  });
  allTx = allTx.filter((tx) => {
    return selectionValues.plotType === "trend"
      ? tx[selectionValues.timeFrame] >= selectionValues.minTime &&
          tx[selectionValues.timeFrame] <= selectionValues.maxTime
      : tx[selectionValues.timeFrame] === selectionValues.maxTime;
  });
  const allMetaCats = sortedUniqueArray({
    array: allTx.map((tx) => tx.metaCategory),
  });
  allTx = allTx.filter((tx) => {
    return selectionValues.metaCategory === "_all"
      ? true
      : tx.metaCategory === selectionValues.metaCategory;
  });
  const allTimes = allTimesBetween({
    minTime: settings.general.minMonth,
    maxTime: settings.general.maxMonth,
    timeFrame: selectionValues.timeFrame,
    reverse: true,
  });
  return (
    <>
      <button
        onClick={() => {
          signOutFunc();
          setCurrentUser();
          history.push("/fin-trans/login");
        }}
      >
        Sign Out
      </button>
      <Selections
        selectionValues={selectionValues}
        setSelectionValues={setSelectionValues}
        allMetaCats={allMetaCats}
        allTimes={allTimes}
        metaCategories={settings.metaCategories[selectionValues.metaCatVersion]}
        allTags={allTags}
      />
      {waitForLoad ? (
        <h3 style={{ textAlign: "center" }}>Waiting for data to load...</h3>
      ) : (
        <>
          <Accordion defaultActiveKey="0">
            <Accordion.Toggle eventKey="0">Toggle Plot</Accordion.Toggle>
            <Accordion.Collapse eventKey="0">
              <Plot
                plotTx={allTx}
                selectionValues={selectionValues}
                setTableFilters={setTableFilters}
              />
            </Accordion.Collapse>
          </Accordion>
          <hr />
          <Accordion defaultActiveKey="0">
            <Accordion.Toggle eventKey="0">Toggle Table</Accordion.Toggle>
            <Accordion.Collapse eventKey="0">
              <Table transactions={allTx} filterValues={tableFilters} />
            </Accordion.Collapse>
          </Accordion>
        </>
      )}
    </>
  );
};

export default Home;
