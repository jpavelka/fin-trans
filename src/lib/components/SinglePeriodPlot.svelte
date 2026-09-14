<script>
  import { createEventDispatcher } from 'svelte';
  import { getGroupedData, currencyFormat, dateFormat, formatMonthList, PLOT_COLORS } from '$lib/utils/plotUtils.js';
  import { sortedUniqueArray } from '$lib/utils/utils.js';
  import { niceTicks, currencyAxisFormat } from '$lib/utils/chartUtils.js';

  export let plotTx;
  export let txType;
  export let metaCategory;
  export let timeFrame;
  export let time;
  // Months of `time` with no data at all; empty when the period is complete.
  export let missing = [];

  const dispatch = createEventDispatcher();

  let cw = 0;
  let ch = 0;
  let tooltip = null; // { x, y, lines }

  function buildData() {
    const groupOn = metaCategory === '_all' ? 'metaCategory' : 'category';
    const groupedData = getGroupedData({ allTx: plotTx, groupOn: [groupOn], includeAll: [false] });

    const bars = [];
    for (const cat of sortedUniqueArray({ array: Object.keys(groupedData) })) {
      const total = groupedData[cat].reduce((s, tx) => s + tx.amount, 0);
      bars.push({ cat, total, text: `${cat}<br>${currencyFormat(total)}` });
    }
    return bars;
  }

  // Explicit deps so Svelte re-runs when any input changes (they are only read
  // inside buildData/computeChart, which Svelte can't track on its own).
  $: deps = [plotTx, txType, metaCategory, timeFrame, time, missing, cw, ch];
  $: chart = (deps && plotTx && cw > 0) ? computeChart(buildData()) : null;

  function computeChart(bars) {
    const W = cw;
    const H = Math.max(ch, 240);
    const marginL = 60, marginR = 10, marginT = 60, marginB = 100;
    const plotLeft = marginL, plotRight = W - marginR;
    const plotTop = marginT, plotBottom = H - marginB;
    const plotW = Math.max(1, plotRight - plotLeft);
    const plotAreaH = Math.max(1, plotBottom - plotTop);

    let dataMax = 0;
    for (const b of bars) if (b.total > dataMax) dataMax = b.total;
    const { ticks: yTicks, max: yMax } = niceTicks(dataMax, 5);

    const n = bars.length;
    const slot = plotW / Math.max(1, n);
    const barW = Math.min(60, slot * 0.7);

    const yPos = (v) => plotBottom - (yMax ? (v / yMax) * plotAreaH : 0);

    const rects = bars.map((b, i) => {
      const cx = plotLeft + slot * (i + 0.5);
      const y = yPos(b.total);
      return { ...b, cx, x: cx - barW / 2, y, w: barW, h: plotBottom - y };
    });

    const title = `${metaCategory === '_all' ? 'All' : metaCategory} ${txType === 'expense' ? 'Expenses' : 'Income'} - ${dateFormat({ d: time, timeFrame })}`;

    const sub = missing.length
      ? `Incomplete — no data for ${formatMonthList(missing)}`
      : '';

    return {
      W, H, plotLeft, plotRight, plotTop, plotBottom, plotAreaH,
      yMax, yTicks, yPos, rects, title, sub, centerX: plotLeft + plotW / 2,
    };
  }

  function onBarClick(cat) {
    const groupOn = metaCategory === '_all' ? 'metaCategory' : 'category';
    dispatch('filterChange', { [groupOn]: cat });
  }

  function showTip(b) {
    tooltip = { x: b.cx, y: b.y, lines: b.text.split('<br>') };
  }
</script>

<div class="plot-el" bind:clientWidth={cw} bind:clientHeight={ch}>
  {#if chart}
    <svg width={chart.W} height={chart.H} role="img">
      <text x={chart.centerX} y="26" text-anchor="middle" class="title">{chart.title}</text>
      {#if chart.sub}
        <text x={chart.centerX} y="44" text-anchor="middle" class="incomplete-note">{chart.sub}</text>
      {/if}

      <!-- Gridlines + Y axis labels -->
      {#each chart.yTicks as t}
        <line x1={chart.plotLeft} y1={chart.yPos(t)} x2={chart.plotRight} y2={chart.yPos(t)} class="grid" />
        <text x={chart.plotLeft - 8} y={chart.yPos(t) + 4} text-anchor="end" class="tick">{currencyAxisFormat(t)}</text>
      {/each}

      <!-- Axes -->
      <line x1={chart.plotLeft} y1={chart.plotTop} x2={chart.plotLeft} y2={chart.plotBottom} class="axis" />
      <line x1={chart.plotLeft} y1={chart.plotBottom} x2={chart.plotRight} y2={chart.plotBottom} class="axis" />

      <!-- Bars + x labels -->
      {#each chart.rects as b (b.cat)}
        <rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill={PLOT_COLORS[0]}
          class="bar"
          role="button"
          tabindex="-1"
          on:mouseenter={() => showTip(b)}
          on:mouseleave={() => (tooltip = null)}
          on:click={() => onBarClick(b.cat)}
        />
        <text
          x={b.cx}
          y={chart.plotBottom + 14}
          text-anchor="end"
          transform={`rotate(-45 ${b.cx} ${chart.plotBottom + 14})`}
          class="tick"
        >{b.cat}</text>
      {/each}
    </svg>

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
    height: 100%;
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

  .incomplete-note {
    font-size: 12px;
    fill: #b9770e;
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

  .bar {
    cursor: pointer;
  }

  .bar:hover {
    fill-opacity: 0.8;
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
