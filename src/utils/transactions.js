import dayjs from "dayjs";

const transformTransactions = ({
  transactions,
  metaCategories,
  categoryChanges,
}) => {
  const categoriesToChange = Object.keys(categoryChanges || {});
  let metaCatInverse = {};
  for (const mc of Object.keys(metaCategories || {})) {
    for (const c of metaCategories[mc]) {
      metaCatInverse[c] = mc;
    }
  }
  let amortizeTx = [];
  for (let tx of transactions) {
    if (categoriesToChange.includes(tx.category)) {
      tx.category = categoryChanges[tx.category];
    }
    tx.metaCategory = metaCatInverse[tx.category] || "Misc";
    tx.type = tx.amount < 0 ? "expense" : "income";
    tx.tags = tx.tags || [];
    if (typeof tx.tags === "string") {
      tx.tags = tx.tags.split(",");
    }
    tx.tags = tx.tags.filter((t) => t.trim() !== "");
    tx.month = dayjs(tx.date).format("YYYY-MM");
    tx.year = dayjs(tx.date).format("YYYY");
    if (!!tx.amortize) {
      tx.amortize = parseInt(tx.amortize);
      tx.skipIfAmortize = true
      for (let i=0; i<tx.amortize; i++){
        const newVals = {
          date: dayjs(tx.date).add(i, 'month').format("YYYY-MM-DD"),
          amount: tx.amount / tx.amortize,
          skipIfAmortize: false,
          skipIfNoAmortize: true
        }
        newVals.month = dayjs(newVals.date).format("YYYY-MM");
        newVals.year = dayjs(newVals.date).format("YYYY");
        amortizeTx.push({...tx, ...newVals})
      }
    }
  }
  return transactions.concat(amortizeTx)
    .filter((tx) => tx.metaCategory !== "Ignore")
    .map((tx) => {
      return { ...tx, ...{ amount: Math.abs(tx.amount) } };
    });
};

export default transformTransactions;
