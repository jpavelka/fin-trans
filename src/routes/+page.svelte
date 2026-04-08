<script>
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/stores.js';

  $: if ($currentUser === null) goto('/login');
  $: if ($currentUser) goto('/dashboard');
</script>

<p style="text-align:center; margin-top: 40px;">Loading...</p>
