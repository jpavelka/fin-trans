import MaterialTable, { MTableBody } from "material-table";
import { TableCell, TableFooter, TableRow } from "@material-ui/core";
import React from "react";
import tableIcons from "./tableIcons";

const Table = ({ transactions, filterValues = {} }) => {
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
  return (
    <div>
      <MaterialTable
        title={"Transactions"}
        data={transactions}
        columns={columns}
        icons={tableIcons}
        options={{ filtering: true, pageSize: transactions.length }}
        components={{
          Body: (props) => {
            let amtSum = 0;
            props.renderData.forEach((rowData) => {
              amtSum += rowData.amount;
            });
            return (
              <>
                  <TableRow>
                    <TableCell colSpan={1}/>
                    <TableCell colSpan={1}>Total: ${(Math.round(100 * amtSum, 2) / 100).toLocaleString()}</TableCell>
                  </TableRow>                
                <MTableBody {...props}/>
              </>
            )
          }
        }}
      />
    </div>
  );
};

export default Table;
