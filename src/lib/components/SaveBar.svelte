<script>
  import { validateVersionName } from '$lib/dataService.js';

  export let versions;
  export let status = null; // { kind: 'ok' | 'error', text }
  export let dirty = false;
  export let busy = false;
  export let onSave;
  export let onSaveAs; // async (name) => true on success
  export let onDiscard;

  let showSaveAs = false;
  let saveAsName = '';

  $: saveAsError = !saveAsName
    ? null
    : validateVersionName(saveAsName) ?? (versions.includes(saveAsName) ? 'A version with that name already exists' : null);

  function closeSaveAs() {
    showSaveAs = false;
    saveAsName = '';
  }

  async function submitSaveAs() {
    if (!saveAsName || saveAsError) return;
    if (await onSaveAs(saveAsName)) closeSaveAs();
  }
</script>

<div class="footer">
  {#if status}
    <span class="status" class:error={status.kind === 'error'}>{status.text}</span>
  {/if}
  {#if showSaveAs}
    <form class="save-as" on:submit|preventDefault={submitSaveAs}>
      <input type="text" placeholder="New version name" bind:value={saveAsName} />
      <button class="primary" type="submit" disabled={busy || !saveAsName || !!saveAsError}>Save</button>
      <button type="button" on:click={closeSaveAs}>Cancel</button>
      {#if saveAsError}<span class="status error">{saveAsError}</span>{/if}
    </form>
  {:else}
    <button on:click={onDiscard} disabled={!dirty || busy}>Discard changes</button>
    <button on:click={() => (showSaveAs = true)} disabled={busy}>Save as new…</button>
    <button class="primary" on:click={onSave} disabled={!dirty || busy}>Save</button>
  {/if}
</div>

<style>
  .footer {
    flex: none;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
  }

  .save-as {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .save-as input {
    width: 200px;
  }

  .status {
    font-size: 13px;
    color: #2e7d32;
    margin-right: auto;
  }

  .status.error {
    color: var(--color-danger);
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
