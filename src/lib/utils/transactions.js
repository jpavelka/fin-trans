import dayjs from 'dayjs';

export function transformTransactions({ transactions, metaCategories, categoryChanges }) {
  const categoriesToChange = Object.keys(categoryChanges || {});
  const metaCatInverse = {};
  for (const mc of Object.keys(metaCategories || {})) {
    for (const c of metaCategories[mc]) {
      metaCatInverse[c] = mc;
    }
  }

  const amortizeTx = [];
  for (const tx of transactions) {
    if (categoriesToChange.includes(tx.category)) {
      tx.category = categoryChanges[tx.category];
    }
    tx.metaCategory = metaCatInverse[tx.category] || 'Misc';
    tx.type = tx.amount < 0 ? 'expense' : 'income';
    tx.tags = tx.tags || [];
    if (typeof tx.tags === 'string') {
      tx.tags = tx.tags.split(',').map((x) => x.toLowerCase().trim());
    }
    tx.tags = tx.tags.filter((t) => t.trim() !== '');
    tx.month = dayjs(tx.date).format('YYYY-MM');
    tx.year = dayjs(tx.date).format('YYYY');

    if (tx.amortize) {
      tx.amortize = parseInt(tx.amortize);
      tx.skipIfAmortize = true;
      for (let i = 0; i < tx.amortize; i++) {
        const date = dayjs(tx.date).add(i, 'month').format('YYYY-MM-DD');
        amortizeTx.push({
          ...tx,
          date,
          amount: tx.amount / tx.amortize,
          month: dayjs(date).format('YYYY-MM'),
          year: dayjs(date).format('YYYY'),
          skipIfAmortize: false,
          skipIfNoAmortize: true,
        });
      }
    }
  }

  return transactions
    .concat(amortizeTx)
    .filter((tx) => tx.metaCategory !== 'Ignore')
    .map((tx) => ({ ...tx, amount: Math.abs(tx.amount) }));
}
