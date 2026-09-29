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

  const DOC_ID = 'categoryChanges';
  const UNSAVED_MSG = 'You have unsaved category changes. Discard them?';

  // ── Versions ────────────────────────────────────────────────────────────────
  $: ccSettings = $settings?.[DOC_ID];
  $: versions = Object.keys(ccSettings || {}).filter((k) => k !== '_default').sort();
  $: defaultVersion = ccSettings?._default;

  let version = '';      // version currently loaded into the draft
  let draft = {};        // { [rawCategory]: newCategory } — '' means no change
  let status = null;     // { kind: 'ok' | 'error', text }
  let busy = false;

  // Pick the initial version once settings arrive (initialVersion wins if valid)
  $: if (!version && versions.length) {
    loadVersion(versions.includes(initialVersion) ? initialVersion : (defaultVersion ?? versions[0]));
  }

  function loadVersion(v) {
    version = v;
    draft = { ...(ccSettings?.[v] || {}) };
    dirty = false;
    status = null;
  }

  function selectVersion(v) {
    if (v === version || (dirty && !window.confirm(UNSAVED_MSG))) return;
    loadVersion(v);
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  // Raw categories as stored on transactions (no changes applied)
  $: rawCounts = Object.values($txData).flat().reduce((m, tx) => {
    if (tx.category) m[tx.category] = (m[tx.category] ?? 0) + 1;
    return m;
  }, {});

  // Default grouping, to show which meta category a (changed) category lands in
  $: groupingSettings = $settings?.metaCategories || {};
  $: grouping = groupingSettings[groupingSettings._default] || {};
  $: metaCatOf = Object.fromEntries(
    Object.entries(grouping).flatMap(([mc, cats]) => (cats || []).map((c) => [c, mc]))
  );

  $: allRaw = sortedUniqueArray({ array: [...Object.keys(draft), ...Object.keys(rawCounts)] });

  // Autocomplete for "Change to"
  $: knownCategories = sortedUniqueArray({
    array: [...allRaw, ...Object.values(draft), ...Object.keys(metaCatOf)].filter(Boolean),
  });

  let filterText = '';
  let onlyChanged = false;

  $: rows = allRaw
    .map((raw) => {
      const target = (draft[raw] ?? '').trim();
      const result = target || raw;
      return {
        raw,
        target: draft[raw] ?? '',
        metaCat: metaCatOf[result] ?? '',
        count: rawCounts[raw] ?? 0,
        // transformTransactions does a single lookup, so a -> b -> c stops at b
        chained: !!target && target !== raw && !!(draft[target] ?? '').trim(),
      };
    })
    .filter((r) => {
      if (onlyChanged && !r.target.trim()) return false;
      const f = filterText.trim().toLowerCase();
      return !f || r.raw.toLowerCase().includes(f) || r.target.toLowerCase().includes(f);
    });

  $: changedCount = Object.values(draft).filter((t) => t.trim()).length;

  function setTarget(raw, target) {
    draft = { ...draft, [raw]: target };
    dirty = true;
  }

  // Raw categories that aren't in the loaded months can still be given a change
  let newRaw = '';

  function addRaw() {
    const name = newRaw.trim();
    if (!name) return;
    if (!(name in draft)) draft = { ...draft, [name]: '' };
    filterText = name;
    newRaw = '';
  }

  // ── Saving ──────────────────────────────────────────────────────────────────
  // Back to the stored { raw: new } shape; blank and no-op entries are dropped
  function buildMapping() {
    const mapping = {};
    for (const [raw, target] of Object.entries(draft)) {
      const t = target.trim();
      if (t && t !== raw) mapping[raw] = t;
    }
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
    if (!window.confirm(`Overwrite category changes "${version}"?`)) return;
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
    }, `Saved new category changes "${name}"`);
  }

  function discard() {
    if (!window.confirm('Discard all unsaved changes?')) return;
    loadVersion(version);
  }

  function makeDefault() {
    run(() => setDefaultSettingsVersion(DOC_ID, version), `"${version}" is now the default`);
  }

  async function deleteVersion() {
    if (!window.confirm(`Permanently delete category changes "${version}"?`)) return;
    const deleted = version;
    await run(async () => {
      await deleteSettingsVersion(DOC_ID, deleted);
      loadVersion(defaultVersion);
    }, `Deleted "${deleted}"`);
  }
</script>

{#if !ccSettings}
  <p class="cat-muted">Loading…</p>
{:else}
  <div class="cat-editor">
    <div class="card">
      <div class="card-body">
        <VersionBar
          label="Category Changes"
          {versions} {defaultVersion} {version} {dirty} {busy}
          onSelect={selectVersion}
          onMakeDefault={makeDefault}
          onDelete={deleteVersion}
        />
        <p class="hint">
          Renames a transaction's category before it's grouped. Leave "Change to" blank to keep the
          original. Changes aren't chained: if A → B and B → C, A still ends up as B.
          The meta category column uses the default grouping
          {#if groupingSettings._default}(<strong>{groupingSettings._default}</strong>){/if}.
        </p>
      </div>
    </div>

    <div class="card cat-table-card">
      <div class="card-body">
        <div class="cat-controls">
          <input type="text" placeholder="Filter categories…" bind:value={filterText} />
          <label class="cat-check">
            <input type="checkbox" bind:checked={onlyChanged} /> Only show changed
          </label>
          <form class="add-raw" on:submit|preventDefault={addRaw}>
            <input type="text" placeholder="Add raw category" bind:value={newRaw} />
            <button type="submit" disabled={!newRaw.trim()}>Add</button>
          </form>
          <span class="cat-muted">{changedCount} changed</span>
        </div>

        <div class="cat-table-wrap">
          <table class="cat-table">
            <thead>
              <tr>
                <th>Raw Category</th>
                <th>Change To</th>
                <th>Meta Category</th>
                <th class="num" title="Transactions in the months currently loaded">Tx (loaded)</th>
              </tr>
            </thead>
            <tbody>
              {#each rows as row (row.raw)}
                <tr>
                  <td class:changed={row.target.trim()}>{row.raw}</td>
                  <td>
                    <input
                      type="text"
                      list="known-categories"
                      placeholder="(no change)"
                      value={row.target}
                      on:input={(e) => setTarget(row.raw, e.target.value)}
                    />
                    {#if row.chained}
                      <div class="cat-warn small">"{row.target.trim()}" is itself changed; that change won't apply</div>
                    {/if}
                  </td>
                  <td class:cat-warn={!row.metaCat}>{row.metaCat || 'Unassigned (Misc)'}</td>
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

  <datalist id="known-categories">
    {#each knownCategories as c}
      <option value={c}></option>
    {/each}
  </datalist>
{/if}

<style>
  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .add-raw {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .add-raw input {
    width: 180px;
  }

  td.changed {
    font-weight: 500;
  }

  .small {
    font-size: 11px;
    margin-top: 2px;
  }
</style>
