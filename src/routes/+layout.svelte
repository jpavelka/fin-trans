<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { currentUser } from '$lib/stores.js';
  import { initAuth, signOutUser } from '$lib/dataService.js';
  import '../app.css';

  onMount(() => initAuth(() => goto('/login')));

  // Redirect signed-out users away from protected pages
  $: if ($currentUser === null && $page.url.pathname !== `${base}/login`) {
    goto('/login');
  }
</script>

{#if $page.url.pathname !== `${base}/login`}
  <nav>
    <span class="app-title">Finance Tracker</span>
    {#if $currentUser}
      <div class="nav-links">
        <a href="{base}/dashboard">Dashboard</a>
        <a href="{base}/upload">Upload</a>
      </div>
      <button on:click={signOutUser}>Sign Out</button>
    {/if}
  </nav>
{/if}

<slot />
