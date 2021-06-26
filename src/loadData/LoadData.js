import CSVReader from "react-csv-reader";
import { db } from "../firebase";
import { sortedUniqueArray } from "../utils/utils";

const monthsRef = db.collection("months");

const LoadData = () => {
  const papaparseOptions = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().replace(/\W/g, "_"),
  };
  return (
    <CSVReader
      cssClass="csv-reader-input"
      label="Select CSV to upload"
      parserOptions={papaparseOptions}
      onFileLoaded={uploadData}
      onError={(e) => console.log(e)}
    />
  );
};

const uploadData = async (data) => {
  const allMonths = sortedUniqueArray({
    array: data.map((d) => d.date.slice(0, 7)),
  });
  let oldMonthTx = {};
  let newMonthTx = {};
  for (const m of allMonths) {
    newMonthTx[m] = [];
    oldMonthTx[m] = await getMonthObject(m);
  }
  data.map((d) => {
    return newMonthTx[d.date.slice(0, 7)].push(d);
  });
  for (const m of allMonths) {
    let allTx = oldMonthTx[m].concat(newMonthTx[m]);
    monthsRef
      .doc(m)
      .set({ transactions: allTx }, { merge: true })
      .then(() => {
        window.alert("Transactions uploaded successfully for month " + m);
      })
      .catch((e) => {
        window.alert("There was an issue uploading the transactions: ", e);
      });
  }
};

const getMonthObject = async (m) => {
  let monthObject = await queryForMonthObject(m);
  return monthObject.transactions || [];
};

const queryForMonthObject = (m) => {
  let monthData = monthsRef
    .doc(m)
    .get()
    .then(function (doc) {
      if (doc.exists) {
        return doc.data();
      } else {
        newMonthFunc(m);
        return { transactions: [] };
      }
    })
    .catch(function (error) {
      console.log("Error getting documents: ", error);
      return null;
    });
  return monthData;
};

function newMonthFunc(m) {
  const generalSettingsRef = db.doc("settings/general");
  generalSettingsRef
    .get()
    .then(function (doc) {
      const data = doc.data();
      if (m < data.minMonth) {
        generalSettingsRef.set({ minMonth: m }, { merge: true });
      } else if (m > data.maxMonth) {
        generalSettingsRef.set({ maxMonth: m }, { merge: true });
      }
    })
    .catch(function (error) {
      console.log("Error getting settings: ", error);
      return null;
    });
}

export default LoadData;

export { monthsRef, newMonthFunc };
