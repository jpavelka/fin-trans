<script>
  import { createEventDispatcher } from 'svelte';
  import TrendPlot from './TrendPlot.svelte';
  import SinglePeriodPlot from './SinglePeriodPlot.svelte';

  export let plotTx;
  export let sel;

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
      on:filterChange
    />
  {:else}
    <SinglePeriodPlot
      {plotTx}
      txType={sel.txType}
      metaCategory={sel.metaCategory}
      timeFrame={sel.timeFrame}
      time={sel.maxTime}
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
