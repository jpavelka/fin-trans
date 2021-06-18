import MaterialTable from "material-table";
import React from "react";
import tableIcons from "./tableIcons";

const Table = ({ transactions, filterValues = {} }) => {
  const columns = [
    { title: "Date", field: "date" },
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
  return (
    <div>
      <MaterialTable
        title={"Transactions"}
        data={transactions}
        columns={columns}
        icons={tableIcons}
        options={{ filtering: true }}
      />
    </div>
  );
};

export default Table;
