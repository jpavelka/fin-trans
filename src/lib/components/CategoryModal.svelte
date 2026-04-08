<script>
  import { createEventDispatcher } from 'svelte';
  import { sortedUniqueArray } from '$lib/utils/utils.js';

  export let metaCategories;
  export let inactiveCategories;
  export let inactiveMetaCategories;

  const dispatch = createEventDispatcher();

  // Work on local copies so cancel truly cancels
  let localInactiveCats = [...inactiveCategories];
  let localInactiveMetaCats = [...inactiveMetaCategories];

  const sortedMetaCats = sortedUniqueArray({ array: Object.keys(metaCategories) });
  let selectedMetaCat = sortedMetaCats[0] ?? '';

  function toggleMetaCat(mc) {
    if (localInactiveMetaCats.includes(mc)) {
      localInactiveMetaCats = localInactiveMetaCats.filter((x) => x !== mc);
    } else {
      localInactiveMetaCats = [...localInactiveMetaCats, mc];
    }
  }

  function toggleCat(c) {
    if (localInactiveCats.includes(c)) {
      localInactiveCats = localInactiveCats.filter((x) => x !== c);
    } else {
      localInactiveCats = [...localInactiveCats, c];
    }
  }

  function save() {
    dispatch('save', { inactiveCategories: localInactiveCats, inactiveMetaCategories: localInactiveMetaCats });
  }
</script>

<div class="modal-overlay" on:click|self={() => dispatch('cancel')}>
  <div class="modal" style="min-width: 360px;">
    <div class="modal-header">Category Detail</div>
    <div class="modal-body">
      <label>Meta Category</label>
      <select bind:value={selectedMetaCat} style="margin-bottom: 12px;">
        {#each sortedMetaCats as mc}
          <option value={mc}>{mc}</option>
        {/each}
      </select>

      {#each sortedMetaCats as mc}
        {#if mc === selectedMetaCat}
          <div class="mc-block">
            <label class="check-label">
              <input
                type="checkbox"
                checked={!localInactiveMetaCats.includes(mc)}
                on:change={() => toggleMetaCat(mc)}
              />
              <strong>{mc}</strong>
            </label>
            <div class="cat-list">
              {#each (metaCategories[mc] || []) as cat}
                <label class="check-label" class:dimmed={localInactiveMetaCats.includes(mc)}>
                  <input
                    type="checkbox"
                    checked={!localInactiveCats.includes(cat)}
                    disabled={localInactiveMetaCats.includes(mc)}
                    on:change={() => toggleCat(cat)}
                  />
                  {cat}
                </label>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
    <div class="modal-footer">
      <button class="primary" on:click={save}>Save</button>
      <button on:click={() => dispatch('cancel')}>Cancel</button>
    </div>
  </div>
</div>

<style>
  .mc-block {
    margin-top: 8px;
  }

  .check-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
    padding: 2px 0;
    color: var(--color-text);
    margin-bottom: 0;
  }

  .check-label input {
    width: auto;
    cursor: pointer;
  }

  .cat-list {
    margin-left: 20px;
    margin-top: 4px;
  }

  .dimmed {
    color: var(--color-text-muted);
  }
</style>
