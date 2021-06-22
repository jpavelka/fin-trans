import dayjs from "dayjs";

const transformTransactions = ({
  transactions,
  metaCategories,
  categoryChanges,
}) => {
  const categoriesToChange = Object.keys(categoryChanges);
  let metaCatInverse = {};
  for (const mc of Object.keys(metaCategories)) {
    for (const c of metaCategories[mc]) {
      metaCatInverse[c] = mc;
    }
  }
  for (let tx of transactions) {
    if (categoriesToChange.includes(tx.category)) {
      tx.category = categoryChanges[tx.category];
    }
    tx.metaCategory = metaCatInverse[tx.category] || "Misc";
    tx.type = tx.amount < 0 ? "expense" : "income";
    tx.tags = tx.tags || [];
    tx.tags = tx.tags.filter((t) => t.trim() !== "");
    tx.month = dayjs(tx.date).format("YYYY-MM");
    tx.year = dayjs(tx.date).format("YYYY");
  }
  return transactions
    .filter((tx) => tx.metaCategory !== "Ignore")
    .map((tx) => {
      return { ...tx, ...{ amount: Math.abs(tx.amount) } };
    });
};

export default transformTransactions;
