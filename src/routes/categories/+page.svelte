<script>
  import { goto, beforeNavigate, replaceState } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { currentUser } from '$lib/stores.js';
  import GroupingsEditor from '$lib/components/GroupingsEditor.svelte';
  import CategoryChangesEditor from '$lib/components/CategoryChangesEditor.svelte';

  $: if ($currentUser === null) goto(`${base}/login`);

  const TABS = [
    { value: 'groupings', label: 'Groupings' },
    { value: 'changes', label: 'Changes' },
  ];

  // ?tab= picks the starting tab; ?version= only applies to that starting tab
  const params = $page.url.searchParams;
  let tab = params.get('tab') === 'changes' ? 'changes' : 'groupings';
  let startVersion = params.get('version');

  let dirty = false;

  function switchTab(t) {
    if (t === tab) return;
    if (dirty && !window.confirm('You have unsaved changes on this tab. Discard them?')) return;
    dirty = false;
    startVersion = null;
    tab = t;
    // Keep the URL in sync without a navigation (which would trigger the unsaved guard)
    const url = new URL($page.url);
    url.searchParams.set('tab', t);
    url.searchParams.delete('version');
    replaceState(url, {});
  }

  // ── Unsaved-changes guard ───────────────────────────────────────────────────
  beforeNavigate(({ cancel }) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave anyway?')) cancel();
  });

  function onBeforeUnload(e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  }

  // ── Fit the page to the viewport so only the table scrolls ─────────────────
  let pageEl;
  let pageTop = 0;
  function measureTop() {
    if (pageEl) pageTop = pageEl.getBoundingClientRect().top + window.scrollY;
  }
  onMount(measureTop);
</script>

<svelte:window on:beforeunload={onBeforeUnload} on:resize={measureTop} />

<div class="page categories" bind:this={pageEl} style="--page-top: {pageTop}px">
  <div class="tabs" role="tablist">
    {#each TABS as t}
      <button
        role="tab"
        aria-selected={tab === t.value}
        class:active={tab === t.value}
        on:click={() => switchTab(t.value)}
      >{t.label}</button>
    {/each}
  </div>

  {#if tab === 'groupings'}
    <GroupingsEditor initialVersion={startVersion} bind:dirty />
  {:else}
    <CategoryChangesEditor initialVersion={startVersion} bind:dirty />
  {/if}
</div>

<style>
  .categories {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - var(--page-top));
  }

  .tabs {
    flex: none;
    display: inline-flex;
    align-self: flex-start;
    margin-bottom: 12px;
  }

  .tabs button {
    border-radius: 0;
  }

  .tabs button:first-child {
    border-radius: var(--radius) 0 0 var(--radius);
  }

  .tabs button:last-child {
    border-radius: 0 var(--radius) var(--radius) 0;
    border-left: none;
  }

  .tabs button.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
</style>
