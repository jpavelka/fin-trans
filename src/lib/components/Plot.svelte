<script>
  import { createEventDispatcher } from 'svelte';
  import TrendPlot from './TrendPlot.svelte';
  import SinglePeriodPlot from './SinglePeriodPlot.svelte';

  export let plotTx;
  export let sel;
  export let includeAverages = true;
  export let legendAmount = 'total';
  // time value → months with no data, for periods that aren't fully covered
  export let incompleteTimes = {};

  const dispatch = createEventDispatcher();
</script>

<div class="plot-wrap">
  {#if sel.plotType === 'trend'}
    <TrendPlot
      {plotTx}
      txType={sel.txType}
      metaCategory={sel.metaCategory}
      timeFrame={sel.timeFrame}
      minTime={sel.minTime}
      maxTime={sel.maxTime}
      {incompleteTimes}
      bind:includeAverages
      bind:legendAmount
      on:filterChange
    />
  {:else}
    <SinglePeriodPlot
      {plotTx}
      txType={sel.txType}
      metaCategory={sel.metaCategory}
      timeFrame={sel.timeFrame}
      time={sel.maxTime}
      missing={incompleteTimes[sel.maxTime] ?? []}
      on:filterChange
    />
  {/if}
</div>

<style>
  .plot-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
