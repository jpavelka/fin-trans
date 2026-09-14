<script>
  import { createEventDispatcher } from 'svelte';
  import { settings } from '$lib/stores.js';
  import CategoryModal from './CategoryModal.svelte';
  import TagModal from './TagModal.svelte';

  export let sel;
  export let allMetaCats;
  export let allTimes;
  export let metaCategories;
  export let allTags;

  const dispatch = createEventDispatcher();

  let showCategoryModal = false;
  let showTagModal = false;

  function update(patch) {
    dispatch('change', patch);
  }

  const PLOT_TYPES = {
    monthTrend: { plotType: 'trend', timeFrame: 'month' },
    singleMonth: { plotType: 'singlePeriod', timeFrame: 'month' },
    yearTrend: { plotType: 'trend', timeFrame: 'year' },
    singleYear: { plotType: 'singlePeriod', timeFrame: 'year' },
  };

  function clamp(time, lo, hi) {
    if (lo && time < lo) return lo;
    if (hi && time > hi) return hi;
    return time;
  }

  // Rewrite a YYYY-MM ↔ YYYY selection when the timeframe changes, keeping it
  // inside the range we actually have data for so it still matches an option.
  function convertTime(time, timeFrame, isEnd) {
    if (!time) return time;
    const g = $settings?.general || {};
    if (timeFrame === 'year') {
      return clamp(time.slice(0, 4), g.minMonth?.slice(0, 4), g.maxMonth?.slice(0, 4));
    }
    const month = time.length === 4 ? `${time}-${isEnd ? '12' : '01'}` : time;
    return clamp(month, g.minMonth, g.maxMonth);
  }

  function onPlotTypeFull(value) {
    const { plotType, timeFrame } = PLOT_TYPES[value];
    update({
      plotTypeFull: value,
      plotType,
      timeFrame,
      minTime: convertTime(sel.minTime, timeFrame, false),
      maxTime: convertTime(sel.maxTime, timeFrame, true),
    });
  }

  $: metaCatVersions = Object.keys($settings?.metaCategories || {}).filter((k) => k !== '_default');
  $: categoryChangeVersions = Object.keys($settings?.categoryChanges || {}).filter((k) => k !== '_default');
  $: allMetaCatsWithAll = [{ value: '_all', label: 'All' }, ...allMetaCats.map((m) => ({ value: m, label: m }))];

  const plotTypeOptions = [
    { value: 'monthTrend', label: 'Month Trend' },
    { value: 'singleMonth', label: 'Single Month' },
    { value: 'yearTrend', label: 'Year Trend' },
    { value: 'singleYear', label: 'Single Year' },
  ];

  const txTypeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
  ];
</script>

<div class="selections">
  <!-- Row 1: versions + plot type + time range -->
  <div class="sel-row">
    <div class="sel-group">
      <label>Category Grouping</label>
      <select value={sel.metaCatVersion} on:change={(e) => update({ metaCatVersion: e.target.value })}>
        {#each metaCatVersions as v}
          <option value={v}>{v}</option>
        {/each}
      </select>
    </div>

    <div class="sel-group">
      <label>Category Changes</label>
      <select value={sel.categoryChangeVersion} on:change={(e) => update({ categoryChangeVersion: e.target.value })}>
        {#each categoryChangeVersions as v}
          <option value={v}>{v}</option>
        {/each}
      </select>
    </div>

    <div class="sel-group">
      <label>Transaction Type</label>
      <select value={sel.txType} on:change={(e) => update({ txType: e.target.value })}>
        {#each txTypeOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <div class="sel-group">
      <label>Plot Type</label>
      <select value={sel.plotTypeFull} on:change={(e) => onPlotTypeFull(e.target.value)}>
        {#each plotTypeOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    {#if sel.plotType === 'trend'}
      <div class="sel-group">
        <label>Start {sel.timeFrame === 'month' ? 'Month' : 'Year'}</label>
        <select value={sel.minTime} on:change={(e) => update({ minTime: e.target.value })}>
          {#each allTimes as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </div>
      <div class="sel-group">
        <label>End {sel.timeFrame === 'month' ? 'Month' : 'Year'}</label>
        <select value={sel.maxTime} on:change={(e) => update({ maxTime: e.target.value })}>
          {#each allTimes as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </div>
    {:else}
      <div class="sel-group">
        <label>{sel.timeFrame === 'month' ? 'Month' : 'Year'}</label>
        <select value={sel.maxTime} on:change={(e) => update({ maxTime: e.target.value })}>
          {#each allTimes as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="sel-group">
      <label>Meta Category</label>
      <select value={sel.metaCategory} on:change={(e) => update({ metaCategory: e.target.value })}>
        {#each allMetaCatsWithAll as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Row 2: extra controls -->
  <div class="extra-controls">
    <button on:click={() => (showCategoryModal = true)}>Category Detail</button>
    <button on:click={() => (showTagModal = true)}>Tag Detail</button>
    <label class="checkbox-label">
      <input
        type="checkbox"
        checked={sel.amortize}
        on:change={(e) => update({ amortize: e.target.checked })}
      />
      Use Amortization
    </label>
  </div>
</div>

<hr />

{#if showCategoryModal}
  <CategoryModal
    {metaCategories}
    inactiveCategories={sel.inactiveCategories}
    inactiveMetaCategories={sel.inactiveMetaCategories}
    on:save={(e) => {
      update(e.detail);
      showCategoryModal = false;
    }}
    on:cancel={() => (showCategoryModal = false)}
  />
{/if}

{#if showTagModal}
  <TagModal
    {allTags}
    requiredTags={sel.requiredTags}
    forbiddenTags={sel.forbiddenTags}
    on:save={(e) => {
      update(e.detail);
      showTagModal = false;
    }}
    on:cancel={() => (showTagModal = false)}
  />
{/if}

<style>
  .selections {
    margin-bottom: 8px;
  }

  .sel-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 8px;
  }

  .sel-group {
    min-width: 120px;
    max-width: 160px;
    flex: 1;
  }

  .extra-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-text);
    cursor: pointer;
    margin-bottom: 0;
  }

  .checkbox-label input {
    width: auto;
  }
</style>
