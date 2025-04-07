import MaterialTable from "material-table";
import React, { useRef, useState } from "react";
import tableIcons from "./tableIcons";

const Table = ({ transactions, filterValues = {} }) => {
  const tableRef = useRef(null);
  const columns = [
    { title: "Date", field: "date", defaultSort: "desc" },
    { title: "Amount", field: "amount", type: "currency" },
    { title: "Category", field: "category" },
    { title: "Meta Category", field: "metaCategory" },
    { title: "Account", field: "account" },
    { title: "Tags", field: "tags" },
    { title: "Description", field: "description" },
    { title: "Comments", field: "comments" },
  ];
  for (let col of columns) {
    if (Object.keys(filterValues).includes(col.field)) {
      col.defaultFilter = filterValues[col.field];
    }
  }
  const [amtSum, setAmtSum] = useState(transactions.map(t => t.amount).reduce((a,b) => a + b));
  const [numTrx, setNumTrx] = useState(transactions.length);
  const filterChange = () => {
    let filterAmtSum = 0;
    let filterNumTrx = 0;
    for (const d of tableRef.current.state.data) {
      filterAmtSum += d.amount;
    }
    filterNumTrx = tableRef.current.state.data.length;
    setAmtSum(filterAmtSum);
    setNumTrx(filterNumTrx);
  }
  return (
    <div>
      <MaterialTable
        title={`$${(Math.round(100 * amtSum, 2) / 100).toLocaleString()} (${numTrx} transactions)`}
        tableRef={tableRef}
        data={transactions}
        columns={columns}
        icons={tableIcons}
        options={{ filtering: true }}
        onFilterChange={filterChange}
        onSearchChange={filterChange}
      />
    </div>
  );
};

export default Table;
