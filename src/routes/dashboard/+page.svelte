<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { currentUser, txData, settings, loadingData, minLoadMonth, maxLoadMonth } from '$lib/stores.js';
  import { transformTransactions } from '$lib/utils/transactions.js';
  import { sortedUniqueArray, allTimesBetween } from '$lib/utils/utils.js';
  import Selections from '$lib/components/Selections.svelte';
  import Plot from '$lib/components/Plot.svelte';
  import Table from '$lib/components/Table.svelte';

  $: if ($currentUser === null) goto(`${base}/login`);

  // ── Filter state ────────────────────────────────────────────────────────────
  let sel = {
    metaCatVersion: undefined,
    categoryChangeVersion: undefined,
    txType: 'expense',
    inactiveCategories: [],
    inactiveMetaCategories: [],
    requiredTags: [],
    forbiddenTags: [],
    metaCategory: '_all',
    plotType: 'trend',
    timeFrame: 'month',
    plotTypeFull: 'monthTrend',
    minTime: undefined,
    maxTime: undefined,
    amortize: false,
  };

  let tableFilters = {};
  let showPlot = true;
  let showTable = true;

  // ── Initialise version defaults + time range once settings arrive ────────────
  $: if ($settings?.general && $minLoadMonth && $maxLoadMonth) {
    let changed = false;
    const patch = {};
    if (!sel.metaCatVersion) {
      patch.metaCatVersion = ($settings.metaCategories || {})._default;
      changed = true;
    }
    if (!sel.categoryChangeVersion) {
      patch.categoryChangeVersion = ($settings.categoryChanges || {})._default;
      changed = true;
    }
    if (!sel.minTime) { patch.minTime = $minLoadMonth; changed = true; }
    if (!sel.maxTime) { patch.maxTime = $maxLoadMonth; changed = true; }
    if (changed) sel = { ...sel, ...patch };
  }

  // ── If the user picks an earlier start, expand the Firestore listener ────────
  $: if (sel.minTime) {
    const t = sel.minTime.length === 4 ? sel.minTime + '-01' : sel.minTime;
    if ($minLoadMonth && t < $minLoadMonth) minLoadMonth.set(t);
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  $: allTx = (() => {
    if (!$settings?.metaCategories || !sel.metaCatVersion || !sel.categoryChangeVersion) return [];
    let txs = [];
    for (const k of Object.keys($txData)) {
      txs = txs.concat(
        transformTransactions({
          transactions: $txData[k],
          metaCategories: $settings.metaCategories[sel.metaCatVersion],
          categoryChanges: $settings.categoryChanges[sel.categoryChangeVersion],
        })
      );
    }
    return txs;
  })();

  $: allTags = sortedUniqueArray({ array: allTx.flatMap((tx) => tx.tags || []) });

  // Apply all top-level filters
  $: filteredTx = allTx.filter((tx) => {
    if (tx[sel.timeFrame] < sel.minTime || tx[sel.timeFrame] > sel.maxTime) return false;
    if (tx.type !== sel.txType) return false;
    if (sel.inactiveCategories.includes(tx.category)) return false;
    if (sel.inactiveMetaCategories.includes(tx.metaCategory)) return false;
    const tags = tx.tags || [];
    if (sel.requiredTags.some((t) => !tags.includes(t))) return false;
    if (tags.some((t) => sel.forbiddenTags.includes(t))) return false;
    if (sel.amortize ? tx.skipIfAmortize : tx.skipIfNoAmortize) return false;
    return true;
  });

  // For single-period, restrict to maxTime period only
  $: plotTx =
    sel.plotType === 'trend'
      ? filteredTx
      : filteredTx.filter((tx) => tx[sel.timeFrame] === sel.maxTime);

  // metaCats available in the current view (before metaCategory filter)
  $: allMetaCats = sortedUniqueArray({ array: plotTx.map((tx) => tx.metaCategory) });

  // Final set passed to both Plot and Table
  $: displayTx =
    sel.metaCategory === '_all'
      ? plotTx
      : plotTx.filter((tx) => tx.metaCategory === sel.metaCategory);

  $: allTimes =
    $settings?.general
      ? allTimesBetween({
          minTime: $settings.general.minMonth,
          maxTime: $settings.general.maxMonth,
          timeFrame: sel.timeFrame,
          reverse: true,
        })
      : [];

  $: metaCategories = $settings?.metaCategories?.[sel.metaCatVersion] ?? {};

  $: isReady =
    !!$settings?.metaCategories && !!sel.metaCatVersion && !!sel.categoryChangeVersion;

  function onSelChange(e) {
    sel = { ...sel, ...e.detail };
  }
</script>

{#if $currentUser === undefined}
  <p class="center-msg">Loading...</p>
{:else if !isReady}
  <p class="center-msg">Loading data...</p>
{:else}
  <div class="page">
    <Selections
      {sel}
      {allMetaCats}
      {allTimes}
      {metaCategories}
      {allTags}
      on:change={onSelChange}
    />

    {#if $loadingData}
      <p class="center-msg">Waiting for data to load...</p>
    {:else}
      <!-- Plot section -->
      <div class="card">
        <div class="card-header" on:click={() => (showPlot = !showPlot)} role="button" tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && (showPlot = !showPlot)}>
          <span>Plot</span>
          <span class="toggle-arrow">{showPlot ? '▲' : '▼'}</span>
        </div>
        {#if showPlot}
          <div class="card-body plot-body">
            <Plot
              plotTx={displayTx}
              {sel}
              on:filterChange={(e) => (tableFilters = e.detail)}
            />
          </div>
        {/if}
      </div>

      <!-- Table section -->
      <div class="card">
        <div class="card-header" on:click={() => (showTable = !showTable)} role="button" tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && (showTable = !showTable)}>
          <span>Transactions</span>
          <span class="toggle-arrow">{showTable ? '▲' : '▼'}</span>
        </div>
        {#if showTable}
          <div class="card-body">
            <Table transactions={displayTx} {tableFilters} />
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .center-msg {
    text-align: center;
    margin-top: 40px;
    color: var(--color-text-muted);
  }

  .plot-body {
    height: 520px;
    padding: 8px;
  }

  .toggle-arrow {
    font-size: 11px;
    color: var(--color-text-muted);
  }
</style>
