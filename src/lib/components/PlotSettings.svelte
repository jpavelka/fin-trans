<script>
  export let plotType;
  export let timeFrame;
  export let includeAverages;
  export let legendAmount;
  export let applyTableFilters;
  export let vertical = false;
</script>

<div class="plot-toggles" class:vertical>
  {#if plotType === 'trend'}
    <label class="plot-toggle">
      Legend Value:
      <select bind:value={legendAmount}>
        <option value="total">Total</option>
        <option value="average">Average</option>
      </select>
    </label>
    <label class="plot-toggle">
      <input type="checkbox" bind:checked={includeAverages} />
      Include Avg.
    </label>
  {/if}
  <label class="plot-toggle">
    <input type="checkbox" bind:checked={applyTableFilters} />
    Apply table filters
  </label>
</div>

<style>
  .plot-toggles {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .plot-toggles.vertical {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .plot-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
  }

  .plot-toggle input {
    width: auto;
    cursor: pointer;
  }
</style>
