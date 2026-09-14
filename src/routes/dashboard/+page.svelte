<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { currentUser, txData, settings, loadingData, minLoadMonth, maxLoadMonth } from '$lib/stores.js';
  import { transformTransactions } from '$lib/utils/transactions.js';
  import { sortedUniqueArray, allTimesBetween } from '$lib/utils/utils.js';
  import { missingMonths } from '$lib/utils/plotUtils.js';
  import Selections from '$lib/components/Selections.svelte';
  import Plot from '$lib/components/Plot.svelte';
  import Table from '$lib/components/Table.svelte';
  import PlotSettings from '$lib/components/PlotSettings.svelte';

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
  let applyTableFilters = false;
  let includeAverages = true;
  let legendAmount = 'total'; // 'total' | 'average'
  let tableFilteredTx = [];

  // Below this width the plot toggles collapse into a Settings modal.
  const NARROW_TOGGLES = 560;
  let plotBodyWidth = 0;
  let showSettings = false;
  $: narrowToggles = plotBodyWidth > 0 && plotBodyWidth < NARROW_TOGGLES;
  $: if (!narrowToggles) showSettings = false;

  // What the plot draws: the table's filtered rows when the toggle is on,
  // otherwise the full filtered set.
  $: plotInputTx = applyTableFilters ? tableFilteredTx : displayTx;

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

  // ── The time range actually on screen ────────────────────────────────────────
  // Single-period views show only maxTime, so minTime must not narrow them.
  $: rangeStart = sel.plotType === 'singlePeriod' ? sel.maxTime : sel.minTime;
  $: rangeEnd = sel.maxTime;

  // ── If the user picks an earlier start, expand the Firestore listener ────────
  // A year selection covers the whole year, so load from its January.
  $: if (rangeStart) {
    const t = rangeStart.length === 4 ? rangeStart + '-01' : rangeStart;
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
    if (tx[sel.timeFrame] < rangeStart || tx[sel.timeFrame] > rangeEnd) return false;
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

  // ── Data coverage, for flagging partial years on the plot ────────────────────
  // A month doc that is missing or empty counts as "no data". Every month of a
  // selected year is loaded, so absence here means we genuinely have nothing.
  $: monthsWithData = new Set(
    Object.keys($txData).filter((m) => ($txData[m] || []).length > 0)
  );

  // time value → months it is missing, for years that aren't fully covered
  $: incompleteTimes =
    sel.timeFrame === 'year' && rangeStart && rangeEnd
      ? Object.fromEntries(
          allTimesBetween({ minTime: rangeStart, maxTime: rangeEnd, timeFrame: 'year' })
            .map((y) => [y, missingMonths({ year: y, monthsWithData })])
            .filter(([, missing]) => missing.length > 0)
        )
      : {};

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
          <div class="card-body plot-body" bind:clientWidth={plotBodyWidth}>
            <div class="plot-toolbar">
              {#if narrowToggles}
                <button class="settings-btn" on:click={() => (showSettings = true)}>
                  ⚙ Settings
                </button>
              {:else}
                <PlotSettings
                  plotType={sel.plotType}
                  timeFrame={sel.timeFrame}
                  bind:includeAverages
                  bind:legendAmount
                  bind:applyTableFilters
                />
              {/if}
            </div>
            <div class="plot-holder">
              <Plot
                plotTx={plotInputTx}
                {sel}
                {incompleteTimes}
                bind:includeAverages
                bind:legendAmount
                on:filterChange={(e) => (tableFilters = e.detail)}
              />
            </div>
          </div>
        {/if}
      </div>

      {#if showSettings}
        <div class="modal-overlay" on:click|self={() => (showSettings = false)}>
          <div class="modal">
            <div class="modal-header">Plot Settings</div>
            <div class="modal-body">
              <PlotSettings
                plotType={sel.plotType}
                timeFrame={sel.timeFrame}
                vertical
                bind:includeAverages
                bind:legendAmount
                bind:applyTableFilters
              />
            </div>
            <div class="modal-footer">
              <button class="primary" on:click={() => (showSettings = false)}>Done</button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Table section -->
      <div class="card">
        <div class="card-header" on:click={() => (showTable = !showTable)} role="button" tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && (showTable = !showTable)}>
          <span>Transactions</span>
          <span class="toggle-arrow">{showTable ? '▲' : '▼'}</span>
        </div>
        {#if showTable}
          <div class="card-body">
            <Table transactions={displayTx} {tableFilters} bind:filteredTransactions={tableFilteredTx} />
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
    display: flex;
    flex-direction: column;
  }

  .plot-holder {
    flex: 1;
    min-height: 0;
  }

  .plot-toolbar {
    display: flex;
    align-items: center;
    min-height: 24px;
    margin-bottom: 4px;
  }

  .settings-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    padding: 4px 10px;
    cursor: pointer;
  }

  .toggle-arrow {
    font-size: 11px;
    color: var(--color-text-muted);
  }
</style>
