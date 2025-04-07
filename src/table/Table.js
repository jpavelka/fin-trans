import MaterialTable from "material-table";
import React, { useRef, useState, useEffect } from "react";
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
  const [amtSum, setAmtSum] = useState(0);
  const [numTrx, setNumTrx] = useState(0);
  useEffect(() => {
    setTimeout(() => {
      setAmtSum((!!tableRef.current ? tableRef.current.state.data : transactions).map(t => t.amount).reduce((a,b) => a + b));
      setNumTrx((!!tableRef.current ? tableRef.current.state.data : transactions).length);
    }, 100)
  }, [transactions, filterValues])

  const filterChange = () => {
    setAmtSum(tableRef.current.state.data.map(t => t.amount).reduce((a,b) => a + b, 0));
    setNumTrx(tableRef.current.state.data.length);
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
