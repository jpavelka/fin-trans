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

  function buildLayout(traces) {
    const title = `${timeFrame === 'month' ? 'Month' : 'Year'}ly Trends - ${txType === 'expense' ? 'Expenses' : 'Income'}${metaCategory === '_all' ? '' : ' - ' + metaCategory}`;
    const sub = `${dateFormat({ d: minTime, timeFrame })} - ${dateFormat({ d: maxTime, timeFrame })}`;

    const layout = { 
      title: `${title}<br><sub>${sub}</sub>`, 
      autosize: true, 
      hovermode: 'closest' 
    };

    if (narrow) {
      // Find how many categories are in the legend (ignoring averages)
      const numCategories = traces.filter(t => !t._isAvg).length;
      
      // On narrow screens, long category names usually stack 1 per row. (~22px per row)
      const legendHeight = numCategories * 22; 
      
      // Define a fixed height for the line chart area so it NEVER gets squished
      const PLOT_AREA_HEIGHT = 250; 
      
      const tMargin = 90;
      const bMargin = 80 + legendHeight; // 80px for x-axis dates + space for legend

      // Explicitly set the total canvas height so Plotly draws the full legend
      layout.height = tMargin + PLOT_AREA_HEIGHT + bMargin;
      layout.margin = { l: 30, r: 10, t: tMargin, b: bMargin };

      // legend.y is a fraction of PLOT_AREA_HEIGHT. 
      // We push it down by exactly 80px (to clear the rotated dates)
      const yOffset = -(80 / PLOT_AREA_HEIGHT);
      layout.legend = { orientation: 'h', yanchor: 'top', y: yOffset, xanchor: 'left', x: 0 };

    } else {
      layout.margin = { l: 50, r: 10, t: 80, b: 60 };
      layout.legend = { orientation: 'v' };
      // layout.height is left undefined so it auto-fills the container on desktop
    }

    return layout;
  }

  function renderPlot() {
    if (!Plotly || !el || !minTime || !maxTime) return;
    
    // 1. Build data first so we can measure the legend size
    const data = buildData();
    const layout = buildLayout(data);
    
    Plotly.react(el, data, layout);
    
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
    /* Keep the plot neatly inside the card, but allow scrolling if it gets too tall */
    overflow-y: auto;
    overflow-x: hidden;
  }
</style>