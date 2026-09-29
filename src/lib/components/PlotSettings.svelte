<script>
  export let plotType;
  export let timeFrame;
  export let includeAverages;
  export let avgMode; // 'overall' | 'moving'
  export let avgWindow;
  export let onlyAverages;
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
    {#if includeAverages}
      <label class="plot-toggle">
        <input type="checkbox" bind:checked={onlyAverages} />
        Only Avg.
      </label>
      <label class="plot-toggle">
        <select bind:value={avgMode}>
          <option value="overall">Overall</option>
          <option value="moving">Moving</option>
        </select>
      </label>
      {#if avgMode === 'moving'}
        <label class="plot-toggle">
          Last
          <input
            type="number"
            class="window-input"
            min="2"
            step="1"
            value={avgWindow}
            on:change={(e) => {
              const n = Math.round(Number(e.currentTarget.value));
              avgWindow = Number.isFinite(n) && n >= 2 ? n : avgWindow;
              e.currentTarget.value = avgWindow;
            }}
          />
          {timeFrame === 'year' ? 'years' : 'months'}
        </label>
      {/if}
    {/if}
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

  .plot-toggle input.window-input {
    width: 3.5em;
    cursor: text;
  }
</style>
