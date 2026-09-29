<script>
  import { txData, settings } from '$lib/stores.js';
  import {
    saveSettingsVersion,
    deleteSettingsVersion,
    setDefaultSettingsVersion,
  } from '$lib/dataService.js';
  import { sortedUniqueArray } from '$lib/utils/utils.js';
  import VersionBar from './VersionBar.svelte';
  import SaveBar from './SaveBar.svelte';

  export let initialVersion = null;
  export let dirty = false;

  const DOC_ID = 'metaCategories';
  const UNSAVED_MSG = 'You have unsaved grouping changes. Discard them?';

  // Meta categories with special meaning in transformTransactions
  const SPECIAL_HINTS = {
    Ignore: 'Transactions in Ignore are dropped from the dashboard entirely',
    Misc: 'Unassigned categories also land in Misc',
  };

  // ── Versions ────────────────────────────────────────────────────────────────
  $: mcSettings = $settings?.[DOC_ID];
  $: versions = Object.keys(mcSettings || {}).filter((k) => k !== '_default').sort();
  $: defaultVersion = mcSettings?._default;

  let version = '';      // version currently loaded into the draft
  let draft = {};        // { [category]: metaCat } — '' means unassigned
  let metaCats = [];     // meta category names in the draft
  let status = null;     // { kind: 'ok' | 'error', text }
  let busy = false;

  // Pick the initial version once settings arrive (initialVersion wins if valid)
  $: if (!version && versions.length) {
    loadVersion(versions.includes(initialVersion) ? initialVersion : (defaultVersion ?? versions[0]));
  }

  function loadVersion(v) {
    const mapping = mcSettings?.[v] || {};
    const d = {};
    for (const mc of Object.keys(mapping)) {
      for (const c of mapping[mc] || []) d[c] = mc;
    }
    version = v;
    draft = d;
    metaCats = sortedUniqueArray({ array: Object.keys(mapping) });
    dirty = false;
    status = null;
  }

  function selectVersion(v) {
    if (v === version || (dirty && !window.confirm(UNSAVED_MSG))) return;
    loadVersion(v);
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  // Stored categories are raw; apply a category-change set so they match the
  // names the grouping will actually see.
  $: changeSettings = $settings?.categoryChanges || {};
  $: changeVersions = Object.keys(changeSettings).filter((k) => k !== '_default').sort();
  let changeVersion = '';
  $: if (!changeVersion && changeSettings._default) changeVersion = changeSettings._default;
  $: categoryChanges = changeSettings[changeVersion] || {};

  $: txCounts = Object.values($txData).flat().reduce((m, tx) => {
    if (!tx.category) return m;
    const c = categoryChanges[tx.category] ?? tx.category;
    m[c] = (m[c] ?? 0) + 1;
    return m;
  }, {});

  $: allCategories = sortedUniqueArray({ array: [...Object.keys(draft), ...Object.keys(txCounts)] });

  let filterText = '';
  let groupByMeta = false;

  $: rows = allCategories
    .map((c) => ({ category: c, metaCat: draft[c] ?? '', count: txCounts[c] ?? 0 }))
    .filter((r) => {
      const f = filterText.trim().toLowerCase();
      return !f || r.category.toLowerCase().includes(f) || r.metaCat.toLowerCase().includes(f);
    })
    .sort((a, b) => {
      // Unassigned always first so new categories are easy to spot
      if (!a.metaCat !== !b.metaCat) return a.metaCat ? 1 : -1;
      if (groupByMeta && a.metaCat !== b.metaCat) return a.metaCat < b.metaCat ? -1 : 1;
      return a.category < b.category ? -1 : 1;
    });

  $: unassignedCount = allCategories.filter((c) => !draft[c]).length;
  $: metaCatSizes = Object.values(draft).reduce((m, mc) => {
    if (mc) m[mc] = (m[mc] ?? 0) + 1;
    return m;
  }, {});

  function assign(category, metaCat) {
    draft = { ...draft, [category]: metaCat };
    dirty = true;
  }

  // ── Meta categories ─────────────────────────────────────────────────────────
  let newMetaCat = '';

  function addMetaCat() {
    const name = newMetaCat.trim();
    if (!name) return;
    if (metaCats.includes(name)) {
      status = { kind: 'error', text: `"${name}" already exists` };
      return;
    }
    metaCats = sortedUniqueArray({ array: [...metaCats, name] });
    newMetaCat = '';
    dirty = true;
  }

  function renameMetaCat(mc) {
    const name = window.prompt(`Rename "${mc}" to:`, mc)?.trim();
    if (!name || name === mc) return;
    if (metaCats.includes(name) && !window.confirm(`"${name}" already exists. Merge "${mc}" into it?`)) return;
    metaCats = sortedUniqueArray({ array: metaCats.map((x) => (x === mc ? name : x)) });
    draft = Object.fromEntries(Object.entries(draft).map(([c, m]) => [c, m === mc ? name : m]));
    dirty = true;
  }

  function deleteMetaCat(mc) {
    const n = metaCatSizes[mc] ?? 0;
    if (n > 0 && !window.confirm(`Delete "${mc}"? Its ${n} ${n === 1 ? 'category' : 'categories'} will become unassigned.`)) return;
    metaCats = metaCats.filter((x) => x !== mc);
    draft = Object.fromEntries(Object.entries(draft).map(([c, m]) => [c, m === mc ? '' : m]));
    dirty = true;
  }

  // ── Saving ──────────────────────────────────────────────────────────────────
  // Back to the stored { metaCat: [categories] } shape; unassigned and empty groups are dropped
  function buildMapping() {
    const mapping = {};
    for (const [c, mc] of Object.entries(draft)) {
      if (!mc) continue;
      (mapping[mc] ??= []).push(c);
    }
    for (const mc of Object.keys(mapping)) mapping[mc] = sortedUniqueArray({ array: mapping[mc] });
    return mapping;
  }

  async function run(fn, okText) {
    busy = true;
    try {
      await fn();
      status = { kind: 'ok', text: okText };
      return true;
    } catch (err) {
      status = { kind: 'error', text: err.message ?? String(err) };
      return false;
    } finally {
      busy = false;
    }
  }

  async function save() {
    if (!window.confirm(`Overwrite grouping "${version}"?`)) return;
    const mapping = buildMapping();
    await run(async () => {
      await saveSettingsVersion(DOC_ID, version, mapping);
      dirty = false;
    }, `Saved "${version}"`);
  }

  function saveAs(name) {
    const mapping = buildMapping();
    return run(async () => {
      await saveSettingsVersion(DOC_ID, name, mapping);
      version = name;
      dirty = false;
    }, `Saved new grouping "${name}"`);
  }

  function discard() {
    if (!window.confirm('Discard all unsaved changes?')) return;
    loadVersion(version);
  }

  function makeDefault() {
    run(() => setDefaultSettingsVersion(DOC_ID, version), `"${version}" is now the default`);
  }

  async function deleteVersion() {
    if (!window.confirm(`Permanently delete grouping "${version}"?`)) return;
    const deleted = version;
    await run(async () => {
      await deleteSettingsVersion(DOC_ID, deleted);
      loadVersion(defaultVersion);
    }, `Deleted "${deleted}"`);
  }
</script>

{#if !mcSettings}
  <p class="cat-muted">Loading…</p>
{:else}
  <div class="cat-editor">
    <div class="card">
      <div class="card-body">
        <VersionBar
          label="Category Grouping"
          {versions} {defaultVersion} {version} {dirty} {busy}
          onSelect={selectVersion}
          onMakeDefault={makeDefault}
          onDelete={deleteVersion}
        />

        <div class="section-label">Meta Categories</div>
        <div class="chips">
          {#each metaCats as mc}
            <span class="chip" title={SPECIAL_HINTS[mc] ?? ''} class:special={SPECIAL_HINTS[mc]}>
              {mc} <span class="chip-count">{metaCatSizes[mc] ?? 0}</span>
              <button class="chip-btn" title="Rename" on:click={() => renameMetaCat(mc)}>✎</button>
              <button class="chip-btn" title="Delete" on:click={() => deleteMetaCat(mc)}>×</button>
            </span>
          {/each}
          <form class="add-meta" on:submit|preventDefault={addMetaCat}>
            <input type="text" placeholder="New meta category" bind:value={newMetaCat} />
            <button type="submit" disabled={!newMetaCat.trim()}>Add</button>
          </form>
        </div>
        <p class="hint">
          Unassigned categories show up as <strong>Misc</strong> on the dashboard.
          Categories in <strong>Ignore</strong> are dropped entirely.
        </p>
      </div>
    </div>

    <div class="card cat-table-card">
      <div class="card-body">
        <div class="cat-controls">
          <input type="text" placeholder="Filter categories…" bind:value={filterText} />
          <label class="cat-check">
            <input type="checkbox" bind:checked={groupByMeta} /> Group by meta category
          </label>
          {#if changeVersions.length}
            <label class="cat-check" title="Category changes applied to transaction categories before grouping">
              Apply changes
              <select class="change-select" bind:value={changeVersion}>
                {#each changeVersions as v}
                  <option value={v}>{v}{v === changeSettings._default ? ' (default)' : ''}</option>
                {/each}
              </select>
            </label>
          {/if}
          {#if unassignedCount > 0}
            <span class="cat-warn">{unassignedCount} unassigned</span>
          {/if}
        </div>

        <div class="cat-table-wrap">
          <table class="cat-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Meta Category</th>
                <th class="num" title="Transactions in the months currently loaded">Tx (loaded)</th>
              </tr>
            </thead>
            <tbody>
              {#each rows as row (row.category)}
                <tr>
                  <td class:unassigned={!row.metaCat}>{row.category}</td>
                  <td>
                    <select value={row.metaCat} on:change={(e) => assign(row.category, e.target.value)}>
                      <option value="">— Unassigned (Misc) —</option>
                      {#each metaCats as mc}
                        <option value={mc}>{mc}</option>
                      {/each}
                    </select>
                  </td>
                  <td class="num">{row.count}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <SaveBar
      {versions} {status} {dirty} {busy}
      onSave={save}
      onSaveAs={saveAs}
      onDiscard={discard}
    />
  </div>
{/if}

<style>
  .section-label {
    font-size: 12px;
    color: var(--color-text-muted);
    margin-bottom: 4px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px 2px 10px;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: #fafafa;
    font-size: 13px;
  }

  .chip.special {
    border-style: dashed;
  }

  .chip-count {
    color: var(--color-text-muted);
    font-size: 11px;
  }

  .chip-btn {
    border: none;
    background: transparent;
    padding: 0 4px;
    color: var(--color-text-muted);
  }

  .chip-btn:hover {
    color: var(--color-text);
    background: #e8e8e8;
  }

  .add-meta {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .add-meta input {
    width: 180px;
  }

  .hint {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .change-select {
    width: auto;
  }

  td.unassigned {
    color: #b26a00;
    font-weight: 500;
  }
</style>
