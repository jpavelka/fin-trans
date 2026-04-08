<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { currentUser } from '$lib/stores.js';

  $: if ($currentUser === null) goto(`${base}/login`);
  $: if ($currentUser) goto(`${base}/dashboard`);
</script>

<p style="text-align:center; margin-top: 40px;">Loading...</p>
