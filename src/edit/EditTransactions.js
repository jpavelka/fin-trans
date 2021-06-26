import MaterialTable from "material-table";
import React, { useContext, useState } from "react";
import { Prompt } from "react-router";
import { AuthContext } from "../auth/Auth";
import { monthsRef, newMonthFunc } from "../loadData/LoadData";
import tableIcons from "../table/tableIcons";
import { sortedUniqueArray } from "../utils/utils";

const EditTransactions = () => {
  const { currentUser, txData } = useContext(AuthContext);
  const [modifiedMonths, setModifiedMonths] = useState([]);
  const getTableDataFromTxData = () => {
    const tData = [];
    for (const dArray of Object.values(txData || {})) {
      for (const d of dArray) {
        if (!!d.tags) {
          d.tags = typeof d.tags === "string" ? d.tags : d.tags.join(",");
        }
        tData.push(d);
      }
    }
    return tData;
  };
  const [tableData, setTableData] = useState(getTableDataFromTxData());
  if (!currentUser) {
    return <div>Loading...</div>;
  }
  const saveChanges = () => {
    for (const m of sortedUniqueArray({ array: modifiedMonths })) {
      const monthData = tableData.filter((d) => d.date.slice(0, 7) === m);
      monthsRef
        .doc(m)
        .set({ transactions: monthData }, { merge: true })
        .then(() => {
          window.alert("Transactions uploaded successfully for month " + m);
        })
        .catch((e) => {
          window.alert("There was an issue uploading the transactions: ", e);
        });
      if (!Object.keys(txData).includes(m)) {
        newMonthFunc(m);
      }
    }
    setModifiedMonths([]);
  };
  const columns = [
    { title: "Date", field: "date", defaultSort: "desc" },
    { title: "Description", field: "description" },
    { title: "Amount", field: "amount" },
    { title: "Category", field: "category" },
    { title: "Comments", field: "comments" },
    { title: "Tags", field: "tags" },
    { title: "Account", field: "account" },
    { title: "Amortization (Months)", field: "amortize" },
  ];
  return (
    <div>
      <button
        onClick={() => {
          setTableData(getTableDataFromTxData());
          setModifiedMonths([]);
        }}
      >
        Undo All
      </button>
      <button onClick={saveChanges}>Save All</button>
      <Prompt
        when={modifiedMonths.length > 0}
        message={
          "You have unsaved changes. Please either save or undo changes."
        }
      />
      <MaterialTable
        title={"Raw Transaction Data"}
        data={tableData}
        columns={columns}
        icons={tableIcons}
        options={{ filtering: true }}
        editable={{
          onRowAdd: (newData) =>
            new Promise((resolve, reject) => {
              setTimeout(() => {
                setTableData([...tableData, newData]);
                setModifiedMonths([
                  ...modifiedMonths,
                  newData.date.slice(0, 7),
                ]);
                resolve();
              }, 1000);
            }),
          onRowUpdate: (newData, oldData) =>
            new Promise((resolve, reject) => {
              setTimeout(() => {
                const dataUpdate = [...tableData];
                const index = oldData.tableData.id;
                dataUpdate[index] = newData;
                setTableData([...dataUpdate]);
                setModifiedMonths([
                  ...modifiedMonths,
                  newData.date.slice(0, 7),
                  oldData.date.slice(0, 7),
                ]);
                resolve();
              }, 1000);
            }),
          onRowDelete: (oldData) =>
            new Promise((resolve, reject) => {
              setTimeout(() => {
                const dataDelete = [...tableData];
                const index = oldData.tableData.id;
                dataDelete.splice(index, 1);
                setTableData([...dataDelete]);
                setModifiedMonths([
                  ...modifiedMonths,
                  oldData.date.slice(0, 7),
                ]);
                resolve();
              }, 1000);
            }),
        }}
      />
    </div>
  );
};

export default EditTransactions;
