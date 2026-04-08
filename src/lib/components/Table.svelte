<script>
  import { onDestroy } from 'svelte';
  import { currencyFormat } from '$lib/utils/plotUtils.js';
  import { deleteTransaction, updateTransaction } from '$lib/dataService.js';
  import EditTransactionModal from '$lib/components/EditTransactionModal.svelte';

  export let transactions = [];
  export let tableFilters = {};

  // Column definitions
  const columns = [
    { field: 'date',         label: 'Date' },
    { field: 'amount',       label: 'Amount',        currency: true },
    { field: 'category',     label: 'Category' },
    { field: 'metaCategory', label: 'Meta Category' },
    { field: 'account',      label: 'Account' },
    { field: 'tags',         label: 'Tags',          isArray: true },
    { field: 'description',  label: 'Description' },
    { field: 'comments',     label: 'Comments' },
  ];

  // ── Column widths ──────────────────────────────────────────────────────────
  let colWidths = { date: 125, amount: 90, category: 130, metaCategory: 130,
                    account: 130, tags: 110, description: 200, comments: 180 };

  let resizing = null; // { field, startX, startWidth }

  function onResizeStart(e, field) {
    e.preventDefault();
    e.stopPropagation();
    resizing = { field, startX: e.clientX, startWidth: colWidths[field] };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
  }
  function onResizeMove(e) {
    if (!resizing) return;
    colWidths = { ...colWidths, [resizing.field]: Math.max(40, resizing.startWidth + e.clientX - resizing.startX) };
  }
  function onResizeEnd() {
    resizing = null;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
  }
  onDestroy(() => {
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
  });

  // ── Column filters ─────────────────────────────────────────────────────────
  // User-controlled inputs
  let colFilters = {};
  let dateMin = '';
  let dateMax = '';
  let amountMin = '';
  let amountMax = '';

  // Plot-click seeds (separate from user inputs so they don't conflict)
  let seedDateMin = '';
  let seedDateMax = '';
  let prevTableFiltersDate = undefined;

  $: {
    const newFilters = {};
    let newSeedMin = '';
    let newSeedMax = '';
    const incomingDateFilter = tableFilters?.date;
    for (const [k, v] of Object.entries(tableFilters || {})) {
      if (k === 'date') {
        // YYYY-MM from plot click → expand to full month range
        if (/^\d{4}-\d{2}$/.test(v)) { newSeedMin = v + '-01'; newSeedMax = v + '-31'; }
        else { newSeedMin = v; newSeedMax = v; }
      } else {
        newFilters[k] = v;
      }
    }
    colFilters = newFilters;
    seedDateMin = newSeedMin;
    seedDateMax = newSeedMax;
    // Reset user date inputs when the plot seed changes
    if (incomingDateFilter !== prevTableFiltersDate) {
      dateMin = newSeedMin;
      dateMax = newSeedMax;
      prevTableFiltersDate = incomingDateFilter;
    }
  }

  let colRegex = {}; // { [field]: boolean }

  // ── Autocomplete ───────────────────────────────────────────────────────────
  const acFields = new Set(['category', 'metaCategory', 'account', 'tags']);

  $: allValues = (() => {
    const map = {};
    for (const field of acFields) {
      const vals = new Set();
      for (const tx of transactions) {
        if (field === 'tags') {
          for (const t of tx.tags || []) vals.add(t);
        } else if (tx[field]) {
          vals.add(tx[field]);
        }
      }
      map[field] = [...vals].sort((a, b) => a.localeCompare(b));
    }
    return map;
  })();

  let acField = null;
  let acIdx = -1;
  let sortRowHeight = 0;

  function getSuggestions(field, value) {
    const all = allValues[field] || [];
    if (!value) return all;
    const lower = value.toLowerCase();
    return all.filter((v) => v.toLowerCase().includes(lower));
  }

  function openAc(field) { acField = field; acIdx = -1; }
  function closeAc() { acField = null; acIdx = -1; }

  function selectSuggestion(field, value) {
    colFilters = { ...colFilters, [field]: value };
    closeAc();
  }

  function handleAcKeydown(e, field) {
    if (acField !== field) { openAc(field); return; }
    const sugg = getSuggestions(field, colFilters[field] || '');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      acIdx = Math.min(acIdx + 1, sugg.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      acIdx = Math.max(acIdx - 1, -1);
    } else if (e.key === 'Enter' && acIdx >= 0) {
      e.preventDefault();
      selectSuggestion(field, sugg[acIdx]);
    } else if (e.key === 'Escape') {
      closeAc();
    }
  }

  function makeFilter(pattern, useRegex) {
    if (!pattern) return null;
    if (useRegex) {
      try { return new RegExp(pattern, 'i'); } catch { return null; }
    }
    return pattern.toLowerCase();
  }

  function matchesFilter(value, filter) {
    if (filter === null) return true;
    if (filter instanceof RegExp) return filter.test(String(value));
    return String(value).toLowerCase().includes(filter);
  }

  function isInvalidRegex(field) {
    if (!colRegex[field] || !colFilters[field]) return false;
    try { new RegExp(colFilters[field]); return false; } catch { return true; }
  }

  // ── Sorting ────────────────────────────────────────────────────────────────
  let sortField = 'date';
  let sortDir = -1;

  function toggleSort(field) {
    if (sortField === field) sortDir = -sortDir;
    else { sortField = field; sortDir = field === 'date' || field === 'amount' ? -1 : 1; }
  }

  function cellValue(tx, col) {
    if (col.isArray) return (tx[col.field] || []).join(', ');
    return tx[col.field] ?? '';
  }

  let displayed = [];
  $: {
    const _dateMin = dateMin;
    const _dateMax = dateMax;
    const _amountMin = amountMin;
    const _amountMax = amountMax;
    const _colFilters = colFilters;
    const _colRegex = colRegex;
    const _sortField = sortField;
    const _sortDir = sortDir;
    let rows = transactions.filter((tx) => {
      if (_dateMin && tx.date < _dateMin) return false;
      if (_dateMax && tx.date > _dateMax) return false;
      const amt = tx.amount || 0;
      if (_amountMin !== '' && !isNaN(parseFloat(_amountMin)) && amt < parseFloat(_amountMin)) return false;
      if (_amountMax !== '' && !isNaN(parseFloat(_amountMax)) && amt > parseFloat(_amountMax)) return false;
      return columns
        .filter(col => col.field !== 'date' && col.field !== 'amount')
        .every((col) => {
          const filter = makeFilter(_colFilters[col.field] || '', _colRegex[col.field]);
          return matchesFilter(cellValue(tx, col), filter);
        });
    });
    rows.sort((a, b) => {
      let av = a[_sortField] ?? '';
      let bv = b[_sortField] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * _sortDir;
      return String(av).localeCompare(String(bv)) * _sortDir;
    });
    displayed = rows;
  }

  $: total = displayed.reduce((s, tx) => s + (tx.amount || 0), 0);

  let editingTx = null; // tx open in edit modal
  let deleting = null;  // tx being confirmed

  async function handleSave({ detail: { tx, updates } }) {
    try {
      await updateTransaction(tx, updates);
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      editingTx = null;
    }
  }

  async function confirmDelete(tx) {
    if (!window.confirm(`Delete this transaction?\n\n${tx.date}  ${currencyFormat(tx.amount)}  ${tx.description || ''}`)) return;
    deleting = tx;
    try {
      await deleteTransaction(tx);
    } catch (e) {
      alert('Delete failed: ' + e.message);
    } finally {
      deleting = null;
    }
  }

  function formatCell(tx, col) {
    if (col.currency) return currencyFormat(tx[col.field] || 0);
    return cellValue(tx, col);
  }
</script>

{#if editingTx}
  <EditTransactionModal
    tx={editingTx}
    {allValues}
    on:save={handleSave}
    on:cancel={() => (editingTx = null)}
  />
{/if}

<div class="table-header-row">
  <span class="summary">{currencyFormat(total)} &nbsp;·&nbsp; {displayed.length} transactions</span>
</div>

<div class="table-wrap">
  <table style="table-layout: fixed; width: {Object.values(colWidths).reduce((a,b)=>a+b,0) + 58}px">
    <colgroup>
      <col style="width: 58px" />
      {#each columns as col}
        <col style="width: {colWidths[col.field]}px" />
      {/each}
    </colgroup>
    <thead>
      <tr class="sort-row" bind:clientHeight={sortRowHeight}>
        <th class="action-th"></th>
        {#each columns as col}
          <th style="width:{colWidths[col.field]}px" class:active={sortField === col.field}
              on:click={() => toggleSort(col.field)}>
            <div class="th-inner">
              <span class="th-label">{col.label}</span>
              {#if sortField === col.field}
                <span class="sort-arrow">{sortDir === 1 ? '▲' : '▼'}</span>
              {/if}
              <div class="resize-handle" on:mousedown={(e) => onResizeStart(e, col.field)}></div>
            </div>
          </th>
        {/each}
      </tr>
      <tr class="filter-row" style="top: {sortRowHeight}px">
        <th class="action-th"></th>
        {#each columns as col}
          <th class:invalid-regex={isInvalidRegex(col.field)}>
            {#if col.field === 'date'}
              <div class="range-inputs">
                <div class="input-with-clear">
                  <input type="date" bind:value={dateMin} />
                  {#if dateMin}<button class="clear-btn" on:click={() => (dateMin = '')}>×</button>{/if}
                </div>
                <div class="input-with-clear">
                  <input type="date" bind:value={dateMax} />
                  {#if dateMax}<button class="clear-btn" on:click={() => (dateMax = '')}>×</button>{/if}
                </div>
              </div>
            {:else if col.field === 'amount'}
              <div class="range-inputs">
                <div class="input-with-clear">
                  <input type="number" step="any" placeholder="min" bind:value={amountMin} />
                  {#if amountMin !== ''}<button class="clear-btn" on:click={() => (amountMin = '')}>×</button>{/if}
                </div>
                <div class="input-with-clear">
                  <input type="number" step="any" placeholder="max" bind:value={amountMax} />
                  {#if amountMax !== ''}<button class="clear-btn" on:click={() => (amountMax = '')}>×</button>{/if}
                </div>
              </div>
            {:else if acFields.has(col.field)}
              <div class="text-filter ac-wrap">
                <div class="regex-toggle" class:active={colRegex[col.field]} title="Toggle regex"
                  on:click={() => { colRegex = { ...colRegex, [col.field]: !colRegex[col.field] }; closeAc(); }}>
                  .*
                  <div class="track"><div class="thumb"></div></div>
                </div>
                <div class="input-with-clear">
                  <input
                    type="text"
                    placeholder={colRegex[col.field] ? 'regex…' : 'filter…'}
                    value={colFilters[col.field] || ''}
                    on:input={(e) => {
                      colFilters = { ...colFilters, [col.field]: e.target.value };
                      if (!colRegex[col.field]) { acField = col.field; acIdx = -1; }
                    }}
                    on:focus={() => { if (!colRegex[col.field]) openAc(col.field); }}
                    on:blur={() => setTimeout(closeAc, 150)}
                    on:keydown={(e) => { if (!colRegex[col.field]) handleAcKeydown(e, col.field); }}
                  />
                  {#if colFilters[col.field]}
                    <button class="clear-btn" on:mousedown|preventDefault={() => {
                      colFilters = { ...colFilters, [col.field]: '' };
                      closeAc();
                    }}>×</button>
                  {/if}
                </div>
                {#if acField === col.field && !colRegex[col.field]}
                  {@const sugg = getSuggestions(col.field, colFilters[col.field] || '')}
                  {#if sugg.length}
                    <ul class="ac-dropdown">
                      {#each sugg as s, i}
                        <li
                          class:highlighted={i === acIdx}
                          on:mousedown|preventDefault={() => selectSuggestion(col.field, s)}
                        >{s}</li>
                      {/each}
                    </ul>
                  {/if}
                {/if}
              </div>
            {:else}
              <div class="text-filter">
                <div class="regex-toggle" class:active={colRegex[col.field]} title="Toggle regex"
                  on:click={() => { colRegex = { ...colRegex, [col.field]: !colRegex[col.field] }; }}>
                  .*
                  <div class="track"><div class="thumb"></div></div>
                </div>
                <div class="input-with-clear">
                  <input
                    type="text"
                    placeholder={colRegex[col.field] ? 'regex…' : 'filter…'}
                    value={colFilters[col.field] || ''}
                    on:input={(e) => { colFilters = { ...colFilters, [col.field]: e.target.value }; }}
                  />
                  {#if colFilters[col.field]}
                    <button class="clear-btn" on:click={() => { colFilters = { ...colFilters, [col.field]: '' }; }}>×</button>
                  {/if}
                </div>
              </div>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each displayed as tx, i (i)}
        <tr class:deleting={deleting === tx}>
          <td class="action-td">
            <button class="action-btn edit-btn" title="Edit transaction"
              on:click={() => (editingTx = tx)} disabled={deleting !== null}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
              </svg>
            </button>
            <button class="action-btn delete-btn" title="Delete transaction"
              on:click={() => confirmDelete(tx)} disabled={deleting !== null}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.5 1h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1zM2 3h12v1H2V3zm2 1.5A.5.5 0 0 1 4.5 4h7a.5.5 0 0 1 .5.5V13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4.5zm1 .5v8a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V5H5zm2 1.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v4a.5.5 0 0 0 1 0V7z"/>
              </svg>
            </button>
          </td>
          {#each columns as col}
            <td class:right={col.currency}>{formatCell(tx, col)}</td>
          {/each}
        </tr>
      {:else}
        <tr><td colspan={columns.length + 1} class="empty">No transactions match the current filters.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-header-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .summary {
    font-size: 13px;
  }

  .table-wrap {
    overflow-x: auto;
    overflow-y: auto;
    max-height: 50vh;
  }

  table {
    border-collapse: collapse;
    font-size: 13px;
    min-width: 100%;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f0f0f0;
    padding: 4px 8px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid var(--color-border);
    overflow: hidden;
  }

  .sort-row th {
    cursor: pointer;
    user-select: none;
    font-weight: 600;
  }

  .sort-row th:hover { background: #e4e4e4; }
  .sort-row th.active { background: #dce9f8; }

  .th-inner {
    position: relative;
    display: flex;
    align-items: center;
  }

  .th-label { pointer-events: none; }

  .sort-arrow {
    font-size: 10px;
    margin-left: 3px;
  }

  .resize-handle {
    position: absolute;
    right: -8px;
    top: -4px;
    bottom: -4px;
    width: 5px;
    cursor: col-resize;
    user-select: none;
  }

  .resize-handle:hover { background: var(--color-primary); opacity: 0.4; }

  .sort-row th {
    position: sticky;
    top: 0;
  }

  .filter-row th {
    padding: 3px 4px;
    font-weight: normal;
    position: sticky;
    overflow: visible;
  }

  .filter-row th.invalid-regex {
    background: #fef2f2;
  }

  .filter-row input {
    font-size: 12px;
    padding: 2px 6px;
    width: 100%;
    min-width: 40px;
    box-sizing: border-box;
  }

  .range-inputs {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .range-inputs input {
    width: 100%;
    min-width: 0;
  }

  .input-with-clear {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .input-with-clear input {
    width: 100%;
    padding-right: 18px;
  }

  .clear-btn {
    position: absolute;
    right: 2px;
    background: none;
    border: none;
    cursor: pointer;
    color: #aaa;
    font-size: 14px;
    line-height: 1;
    padding: 0 1px;
  }

  .clear-btn:hover { color: #333; }

  .text-filter {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .regex-toggle {
    display: flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    user-select: none;
    font-size: 10px;
    color: var(--color-text-muted);
    font-family: monospace;
  }

  .regex-toggle .track {
    position: relative;
    width: 32px;
    height: 16px;
    border-radius: 8px;
    background: #ccc;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .regex-toggle.active .track {
    background: var(--color-primary, #3b82f6);
  }

  .regex-toggle .thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.15s;
  }

  .regex-toggle.active .thumb {
    left: 18px;
  }

  .ac-wrap {
    position: relative;
  }

  .ac-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 100%;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 3px;
    list-style: none;
    margin: 1px 0 0;
    padding: 0;
    z-index: 200;
    max-height: 180px;
    overflow-y: auto;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }

  .ac-dropdown li {
    padding: 3px 8px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ac-dropdown li:hover,
  .ac-dropdown li.highlighted {
    background: #eef4fb;
  }

  .action-th {
    cursor: default;
    width: 58px;
    padding: 0;
  }

  .action-td {
    padding: 2px 4px;
    text-align: center;
    width: 58px;
    white-space: nowrap;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 3px 4px;
    border-radius: 3px;
    color: #aaa;
    line-height: 1;
    visibility: hidden;
  }

  .edit-btn:hover   { color: #3b82f6; background: #eff6ff; }
  .delete-btn:hover { color: #e53e3e; background: #fff0f0; }

  .action-btn { visibility: visible; }

  tr.deleting { opacity: 0.4; pointer-events: none; }

  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr:hover { background: #eef4fb; }

  td {
    padding: 4px 8px;
    border-bottom: 1px solid #eee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  td.right { text-align: right; }

  td.empty {
    text-align: center;
    color: var(--color-text-muted);
    padding: 20px;
  }
</style>
