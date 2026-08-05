<script>
  import { createEventDispatcher } from 'svelte';
  import { getGroupedData, currencyFormat, dateFormat, dateFormatInv, incrementTime, addColors } from '$lib/utils/plotUtils.js';
  import { niceTicks, currencyAxisFormat, thinLabelIndices } from '$lib/utils/chartUtils.js';

  export let plotTx;
  export let txType;
  export let metaCategory;
  export let timeFrame;
  export let minTime;
  export let maxTime;

  const dispatch = createEventDispatcher();

  export let includeAverages = true;
  export let legendAmount = 'total'; // 'total' | 'average'
  let cw = 0;
  let ch = 0;
  let hiddenSeries = new Set();
  let tooltip = null; // { x, y, lines }

  $: narrow = cw > 0 && cw < 500;

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
      const avg = y.length ? total / y.length : 0;
      const legendVal = legendAmount === 'average' ? avg : total;
      const trace = {
        _cat: cat,
        _groupOn: groupOn,
        name: `${catName} - ${currencyFormat(legendVal)}`,
        type: 'scatter',
        text,
        x,
        y,
      };
      traces.push(trace);
      if (includeAverages) {
        traces.push({
          ...trace,
          _cat: cat + '_avg',
          _isAvg: true,
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

  const baseCat = (t) => t._cat.replace(/_avg$/, '');

  // Recompute everything reactively from inputs + layout state. The explicit
  // deps array ensures Svelte re-runs when any of these change (they are only
  // read inside buildData/computeChart, which Svelte can't see on its own).
  $: deps = [plotTx, txType, metaCategory, timeFrame, minTime, maxTime, includeAverages, legendAmount, hiddenSeries, cw, ch, narrow];
  $: chart = (deps && plotTx && minTime && maxTime && cw > 0)
    ? computeChart(buildData())
    : null;

  function computeChart(traces) {
    const W = cw;
    const xLabels = traces.length ? traces[0].x : [];
    const n = xLabels.length;

    // Legend entries (one per non-average trace).
    const legend = traces.filter((t) => !t._isAvg).map((t) => ({
      cat: t._cat,
      name: t.name,
      color: t.line.color,
      hidden: hiddenSeries.has(t._cat),
    }));

    // Margins / overall height differ for narrow vs desktop layouts.
    let marginL, marginR, marginT, marginB, legendWidth, H, plotAreaH;
    if (narrow) {
      // On narrow layouts the legend is rendered as a separate scrollable HTML
      // block below the chart, so the SVG only needs room for the plot itself.
      legendWidth = 0;
      marginL = 40;
      marginR = 10;
      marginT = 70;
      const PLOT_AREA_HEIGHT = 250;
      plotAreaH = PLOT_AREA_HEIGHT;
      marginB = 55;
      H = marginT + PLOT_AREA_HEIGHT + marginB;
    } else {
      const longest = legend.reduce((m, l) => Math.max(m, l.name.length), 0);
      legendWidth = Math.min(260, Math.max(120, longest * 6.2 + 34));
      marginL = 60;
      marginR = 10;
      marginT = 70;
      marginB = 50;
      H = Math.max(ch, 240);
      plotAreaH = H - marginT - marginB;
    }

    const plotLeft = marginL;
    const plotRight = W - marginR - legendWidth;
    const plotTop = marginT;
    const plotBottom = plotTop + plotAreaH;
    const plotW = Math.max(1, plotRight - plotLeft);

    // Y domain from visible traces only (so legend toggles rescale).
    let dataMax = 0;
    for (const t of traces) {
      if (hiddenSeries.has(baseCat(t))) continue;
      for (const v of t.y) if (v > dataMax) dataMax = v;
    }
    const { ticks: yTicks, max: yMax } = niceTicks(dataMax, 5);

    const xPos = (i) => (n <= 1 ? (plotLeft + plotRight) / 2 : plotLeft + (i / (n - 1)) * plotW);
    const yPos = (v) => plotBottom - (yMax ? (v / yMax) * plotAreaH : 0);

    // Build polyline/point geometry for visible traces.
    const series = [];
    for (const t of traces) {
      if (hiddenSeries.has(baseCat(t))) continue;
      const pts = t.y.map((v, i) => ({ cx: xPos(i), cy: yPos(v), i, v }));
      series.push({
        cat: t._cat,
        groupOn: t._groupOn,
        isAvg: !!t._isAvg,
        color: t.line.color,
        polyline: pts.map((p) => `${p.cx},${p.cy}`).join(' '),
        points: pts,
        text: t.text,
        x: t.x,
      });
    }

    const showIdx = thinLabelIndices(n, narrow ? 4 : 12);

    // Legend positions (desktop only; narrow renders an HTML legend instead).
    const legendItems = legend.map((l, idx) => ({
      ...l,
      x: plotRight + 12,
      y: plotTop + 6 + idx * 20,
    }));

    const title = `${timeFrame === 'month' ? 'Month' : 'Year'}ly Trends - ${txType === 'expense' ? 'Expenses' : 'Income'}${metaCategory === '_all' ? '' : ' - ' + metaCategory}`;
    const sub = `${dateFormat({ d: minTime, timeFrame })} - ${dateFormat({ d: maxTime, timeFrame })}`;

    return {
      W, H, plotLeft, plotRight, plotTop, plotBottom, plotAreaH, plotW,
      yMax, yTicks, yPos, xPos, xLabels, showIdx, series, legend, legendItems,
      title, sub, centerX: plotLeft + plotW / 2,
    };
  }

  function toggleSeries(cat) {
    if (hiddenSeries.has(cat)) hiddenSeries.delete(cat);
    else hiddenSeries.add(cat);
    hiddenSeries = hiddenSeries; // trigger reactivity
  }

  // Double-click isolates a series (hide all others); double-clicking the
  // already-isolated series restores all. Matches Plotly's legend behavior.
  function isolateSeries(cat, allCats) {
    const others = allCats.filter((c) => c !== cat);
    const isIsolated = !hiddenSeries.has(cat) && others.every((c) => hiddenSeries.has(c));
    hiddenSeries = isIsolated ? new Set() : new Set(others);
  }

  // Single click toggles; a second click within the window upgrades to isolate.
  // We delay the single-click so it doesn't also fire on a double-click.
  let clickTimer = null;
  function legendClick(cat, allCats) {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      isolateSeries(cat, allCats);
      return;
    }
    clickTimer = setTimeout(() => {
      clickTimer = null;
      toggleSeries(cat);
    }, 250);
  }

  function onPointClick(s, i) {
    if (s.isAvg) return;
    const filters = { date: dateFormatInv({ d: s.x[i], timeFrame }) };
    if (s.cat !== '_all') filters[s.groupOn] = s.cat;
    dispatch('filterChange', filters);
  }

  function showTip(p, text) {
    tooltip = { x: p.cx, y: p.cy, lines: String(text).split('<br>') };
  }
</script>

<div class="plot-el" class:narrow bind:clientWidth={cw} bind:clientHeight={ch}>
  {#if chart}
    <svg width={chart.W} height={chart.H} role="img">
      <!-- Title + subtitle -->
      <text x={chart.centerX} y="26" text-anchor="middle" class="title">{chart.title}</text>
      <text x={chart.centerX} y="46" text-anchor="middle" class="subtitle">{chart.sub}</text>

      <!-- Gridlines + Y axis labels -->
      {#each chart.yTicks as t}
        <line x1={chart.plotLeft} y1={chart.yPos(t)} x2={chart.plotRight} y2={chart.yPos(t)} class="grid" />
        <text x={chart.plotLeft - 8} y={chart.yPos(t) + 4} text-anchor="end" class="tick">{currencyAxisFormat(t)}</text>
      {/each}

      <!-- Axes -->
      <line x1={chart.plotLeft} y1={chart.plotTop} x2={chart.plotLeft} y2={chart.plotBottom} class="axis" />
      <line x1={chart.plotLeft} y1={chart.plotBottom} x2={chart.plotRight} y2={chart.plotBottom} class="axis" />

      <!-- X axis labels -->
      {#each chart.xLabels as lbl, i}
        {#if chart.showIdx.has(i)}
          <text
            x={chart.xPos(i)}
            y={chart.plotBottom + (narrow ? 14 : 18)}
            text-anchor={narrow ? 'end' : 'middle'}
            transform={narrow ? `rotate(-45 ${chart.xPos(i)} ${chart.plotBottom + 14})` : ''}
            class="tick"
          >{lbl}</text>
        {/if}
      {/each}

      <!-- Series -->
      {#each chart.series as s (s.cat)}
        <polyline
          points={s.polyline}
          fill="none"
          stroke={s.color}
          stroke-width="2"
          stroke-dasharray={s.isAvg ? '6 4' : ''}
        />
        {#if !s.isAvg}
          {#each s.points as p}
            <circle
              cx={p.cx}
              cy={p.cy}
              r="4"
              fill={s.color}
              class="point"
              role="button"
              tabindex="-1"
              on:mouseenter={() => showTip(p, s.text[p.i])}
              on:mouseleave={() => (tooltip = null)}
              on:click={() => onPointClick(s, p.i)}
            />
          {/each}
        {/if}
      {/each}

      <!-- Legend (desktop: rendered inside the SVG to the right of the plot) -->
      {#if !narrow}
        {#each chart.legendItems as item (item.cat)}
          <g
            class="legend-item"
            class:hidden={item.hidden}
            on:click={() => legendClick(item.cat, chart.legendItems.map((i) => i.cat))}
            role="button"
            tabindex="-1"
          >
            <rect x={item.x} y={item.y - 9} width="14" height="14" rx="2" fill={item.color} />
            <text x={item.x + 20} y={item.y + 2} class="legend-text">{item.name}</text>
          </g>
        {/each}
      {/if}
    </svg>

    {#if narrow}
      <!-- Narrow: legend is a separate scrollable block so the chart stays fixed -->
      <div class="legend-scroll">
        {#each chart.legend as item (item.cat)}
          <div
            class="legend-row"
            class:hidden={item.hidden}
            on:click={() => legendClick(item.cat, chart.legend.map((i) => i.cat))}
            role="button"
            tabindex="-1"
          >
            <span class="legend-swatch" style="background:{item.color}"></span>
            <span class="legend-name">{item.name}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if tooltip}
      <div class="tooltip" style="left:{tooltip.x}px; top:{tooltip.y}px">
        {#each tooltip.lines as line}<div>{line}</div>{/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .plot-el {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* On narrow layouts only the legend scrolls; the chart stays fixed. */
  .plot-el.narrow {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .plot-el.narrow svg {
    flex: 0 0 auto;
  }

  .legend-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px;
    border-top: 1px solid #eee;
  }

  .legend-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    cursor: pointer;
  }

  .legend-row.hidden {
    opacity: 0.4;
  }

  .legend-swatch {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    flex: 0 0 auto;
  }

  .legend-name {
    font-size: 12px;
    color: #333;
  }

  svg {
    display: block;
    font-family: inherit;
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    fill: #2c3e50;
  }

  .subtitle {
    font-size: 12px;
    fill: #7f8c8d;
  }

  .tick {
    font-size: 11px;
    fill: #555;
  }

  .grid {
    stroke: #eee;
    stroke-width: 1;
  }

  .axis {
    stroke: #bbb;
    stroke-width: 1;
  }

  .point {
    cursor: pointer;
  }

  .point:hover {
    r: 6;
  }

  .legend-item {
    cursor: pointer;
  }

  .legend-item.hidden {
    opacity: 0.4;
  }

  .legend-text {
    font-size: 12px;
    fill: #333;
  }

  .tooltip {
    position: absolute;
    transform: translate(-50%, calc(-100% - 10px));
    background: rgba(255, 255, 255, 0.97);
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }
</style>
