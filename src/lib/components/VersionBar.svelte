<script>
  import { tick } from 'svelte';

  export let label;
  export let versions;
  export let defaultVersion;
  export let version;
  export let dirty = false;
  export let busy = false;
  export let onSelect;
  export let onMakeDefault;
  export let onDelete;

  const id = `version-select-${Math.random().toString(36).slice(2)}`;

  async function onChange(e) {
    onSelect(e.target.value);
    // If the parent declined the switch (unsaved changes), snap the select back
    await tick();
    e.target.value = version;
  }
</script>

<div class="top-bar">
  <div class="version-select">
    <label for={id}>{label}</label>
    <select {id} value={version} on:change={onChange}>
      {#each versions as v}
        <option value={v}>{v}{v === defaultVersion ? ' (default)' : ''}</option>
      {/each}
    </select>
  </div>
  {#if version === defaultVersion}
    <span class="badge">Default</span>
  {:else}
    <button on:click={onMakeDefault} disabled={busy}>Make default</button>
    <button class="danger" on:click={onDelete} disabled={busy}>Delete version</button>
  {/if}
  {#if dirty}<span class="dirty">Unsaved changes</span>{/if}
</div>

<style>
  .top-bar {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .version-select {
    min-width: 200px;
  }

  .badge {
    padding: 5px 10px;
    border-radius: var(--radius);
    background: #e3f2fd;
    color: var(--color-primary-dark);
    font-size: 12px;
    font-weight: 500;
  }

  .dirty {
    color: #b26a00;
    font-size: 13px;
    padding: 5px 0;
  }

  button.danger {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
