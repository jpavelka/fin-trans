<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { getGroupedData, currencyFormat, dateFormat } from '$lib/utils/plotUtils.js';
  import { sortedUniqueArray } from '$lib/utils/utils.js';

  export let plotTx;
  export let txType;
  export let metaCategory;
  export let timeFrame;
  export let time;

  const dispatch = createEventDispatcher();

  let el;
  let Plotly;
  let mounted = false;

  onMount(async () => {
    ({ default: Plotly } = await import('plotly.js-dist-min'));
    mounted = true;
    renderPlot();
    return () => Plotly?.purge(el);
  });

  $: plotTx, txType, metaCategory, timeFrame, time, mounted && renderPlot();

  function buildData() {
    const groupOn = metaCategory === '_all' ? 'metaCategory' : 'category';
    const groupedData = getGroupedData({ allTx: plotTx, groupOn: [groupOn], includeAll: [false] });

    const x = [], y = [], text = [];
    for (const cat of sortedUniqueArray({ array: Object.keys(groupedData) })) {
      const total = groupedData[cat].reduce((s, tx) => s + tx.amount, 0);
      x.push(cat);
      y.push(total);
      text.push(`${cat}<br>${currencyFormat(total)}`);
    }
    return [{ type: 'bar', hoverinfo: 'text', x, y, text }];
  }

  function buildLayout() {
    const title = `${metaCategory === '_all' ? 'All' : metaCategory} ${txType === 'expense' ? 'Expenses' : 'Income'} - ${dateFormat({ d: time, timeFrame })}`;
    return { title, autosize: true, hovermode: 'closest', margin: { l: 50, r: 10, t: 80, b: 100 } };
  }

  function renderPlot() {
    if (!Plotly || !el) return;
    Plotly.react(el, buildData(), buildLayout(), { responsive: true });
    el.removeAllListeners?.('plotly_click');
    el.on('plotly_click', (event) => {
      const groupOn = metaCategory === '_all' ? 'metaCategory' : 'category';
      dispatch('filterChange', { [groupOn]: event.points[0].x });
    });
  }
</script>

<div bind:this={el} class="plot-el" />

<style>
  .plot-el {
    width: 100%;
    height: 100%;
  }
</style>
