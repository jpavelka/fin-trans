import MaterialTable from "material-table";
import React from "react";

const Table = ({ transactions }) => {
  try {
    console.log(Object.keys(transactions[0]));
  } catch {}
  const columns = [
    { title: "Date", field: "date" },
    { title: "Amount", field: "amount", type: "numeric" },
    { title: "Category", field: "category" },
    { title: "Account", field: "account" },
    { title: "Tags", field: "tags" },
    { title: "Description", field: "description" },
  ];
  return (
    <div>
      <MaterialTable
        title={"Transactions"}
        data={transactions}
        columns={columns}
      />
    </div>
  );
};

export default Table;
