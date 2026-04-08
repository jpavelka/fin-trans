<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { getGroupedData, currencyFormat, dateFormat, dateFormatInv, incrementTime, addColors } from '$lib/utils/plotUtils.js';

  export let plotTx;
  export let txType;
  export let metaCategory;
  export let timeFrame;
  export let minTime;
  export let maxTime;

  const dispatch = createEventDispatcher();

  let el;
  let Plotly;
  let includeAverages = true;
  let mounted = false;
  let narrow = false;

  onMount(async () => {
    ({ default: Plotly } = await import('plotly.js-dist-min'));
    mounted = true;
    const ro = new ResizeObserver(([entry]) => {
      narrow = entry.contentRect.width < 500;
      renderPlot();
    });
    ro.observe(el);
    renderPlot();
    return () => { Plotly?.purge(el); ro.disconnect(); };
  });

  $: if (mounted) renderPlot();
  // Re-render when these change
  $: plotTx, txType, metaCategory, timeFrame, minTime, maxTime, includeAverages, narrow, mounted && renderPlot();

  function buildData() {
    const groupOn = metaCategory === '_all' ? 'metaCategory' : 'category';
    const groupedData = getGroupedData({ allTx: plotTx, groupOn: [groupOn, timeFrame], includeAll: [true, false] });

    let traces = [];
    for (const [cat, catData] of Object.entries(groupedData)) {
      const catName = cat === '_all' ? 'Total' : cat;
      const x = [], y = [], text = [];
      let time = minTime;
      while (time <= maxTime) {
        x.push(dateFormat({ d: time, timeFrame }));
        const yVal = (catData[time] || []).reduce((s, tx) => s + tx.amount, 0);
        y.push(yVal);
        text.push(`${catName}<br>${dateFormat({ d: time, timeFrame })}<br>${currencyFormat(yVal)}`);
        time = incrementTime({ timeFrame, time });
      }
      const total = y.reduce((a, b) => a + b, 0);
      const trace = {
        _cat: cat,
        _groupOn: groupOn,
        name: `${catName} - ${currencyFormat(total)}`,
        legendgroup: cat,
        type: 'scatter',
        hoverinfo: 'text',
        text,
        x,
        y,
      };
      traces.push(trace);
      if (includeAverages) {
        const avg = total / y.length;
        traces.push({
          ...trace,
          _cat: cat + '_avg',
          _isAvg: true,
          line: { dash: 'dash' },
          showlegend: false,
          text: `Avg. ${catName}<br>${currencyFormat(avg)}`,
          y: y.map(() => avg),
        });
      }
    }

    traces.sort((a, b) => {
      const ka = a._cat.replace('_', 'A'.repeat(10));
      const kb = b._cat.replace('_', 'A'.repeat(10));
      return ka < kb ? -1 : 1;
    });
    return addColors(traces);
  }

  function buildLayout() {
    const title = `${timeFrame === 'month' ? 'Month' : 'Year'}ly Trends - ${txType === 'expense' ? 'Expenses' : 'Income'}${metaCategory === '_all' ? '' : ' - ' + metaCategory}`;
    const sub = `${dateFormat({ d: minTime, timeFrame })} - ${dateFormat({ d: maxTime, timeFrame })}`;
    const legend = narrow
      ? { orientation: 'h', yanchor: 'top', y: -0.15, xanchor: 'center', x: 0.5, entrywidth: 100 }
      : { orientation: 'v' };
    const width  = el?.clientWidth  ?? 400;
    const height = el?.clientHeight ?? 450;
    const margin = narrow
      ? { l: 30, r: 10, t: 90, b: 130 }
      : { l: 50, r: 10, t: 80, b: 60 };
    return { title: `${title}<br><sub>${sub}</sub>`, width, height, autosize: false, hovermode: 'closest', legend, margin };
  }

  function renderPlot() {
    if (!Plotly || !el || !minTime || !maxTime) return;
    const layout = buildLayout();
    Plotly.react(el, buildData(), layout);
    el.removeAllListeners?.('plotly_click');
    el.on('plotly_click', (event) => {
      const pt = event.points[0];
      if (pt.data._isAvg) return;
      const filters = { date: dateFormatInv({ d: pt.x, timeFrame }) };
      if (pt.data._cat !== '_all') filters[pt.data._groupOn] = pt.data._cat;
      dispatch('filterChange', filters);
    });
  }
</script>

<div class="controls">
  <label class="checkbox-label">
    <input type="checkbox" bind:checked={includeAverages} />
    Include Avg.
  </label>
</div>
<div bind:this={el} class="plot-el" />

<style>
  .controls {
    padding: 4px 8px;
  }

  .checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
  }

  .checkbox-label input {
    width: auto;
  }

  .plot-el {
    width: 100%;
    flex: 1;
    min-height: 0;
    height: calc(100% - 32px);
  }
</style>
