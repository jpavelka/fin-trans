import { useContext, useState, useEffect } from "react";
import { AuthContext, signOutFunc } from "./auth/Auth";
import Table from "./table/Table";
import Plot from "./plot/Plot";
import transformTransactions from "./transactionUtils/transform";

const Home = ({ history }) => {
  const { currentUser, setCurrentUser, txData, settings } =
    useContext(AuthContext);
  const [metaCatVersion, setMetaCatVersion] = useState(
    (settings.metaCategories || {})._default
  );
  const [categoryChangeVersion, setCategoryChangeVersion] = useState(
    (settings.categoryChanges || {})._default
  );
  const [txType, setTxType] = useState("expense");
  const [inactiveCategories, setInactiveCategories] = useState([]);
  const [inactiveMetaCategories, setInactiveMetaCategories] = useState([]);
  const [plotType, setPlotType] = useState("trend");
  const [metaCategory, setMetaCategory] = useState("_all");
  const [timeFrame, setTimeFrame] = useState("month");
  useEffect(() => {
    if (!!settings) {
      setMetaCatVersion((v) => {
        return !!v ? v : (settings.metaCategories || {})._default;
      });
      setCategoryChangeVersion((v) => {
        return !!v ? v : (settings.categoryChanges || {})._default;
      });
    }
  }, [settings]);
  const [minTime, setMinTime] = useState("2021-01");
  const [maxTime, setMaxTime] = useState("2021-05");
  const [tableFilters, setTableFilters] = useState({});
  if (!!!currentUser) {
    history.push("/login");
  }
  if (!!!settings || !!!metaCatVersion || !!!categoryChangeVersion) {
    return <div>Loading...</div>;
  }
  let allTx = [];
  if (!!txData) {
    for (const k of Object.keys(txData)) {
      allTx = allTx.concat(
        transformTransactions({
          transactions: txData[k],
          metaCategories: settings.metaCategories[metaCatVersion],
          categoryChanges: settings.categoryChanges[categoryChangeVersion],
        })
      );
    }
  }
  allTx = allTx.filter((tx) => {
    return tx.type === txType &&
      tx[timeFrame] >= minTime &&
      tx[timeFrame] <= maxTime &&
      !inactiveCategories.includes(tx.category) &&
      !inactiveMetaCategories.includes(tx.metaCategory) &&
      metaCategory === "_all"
      ? true
      : tx.metaCategory === metaCategory;
  });
  return (
    <>
      <button
        onClick={() => {
          signOutFunc();
          setCurrentUser();
          history.push("/login");
        }}
      >
        Sign Out
      </button>
        <Plot
          plotType={plotType}
          plotTx={allTx}
          txType={txType}
          metaCategory={metaCategory}
          timeFrame={timeFrame}
          minTime={minTime}
          maxTime={maxTime}
          setTableFilters={setTableFilters}
        />
      <Table transactions={allTx} filterValues={tableFilters}/>
    </>
  );
};

export default Home;
