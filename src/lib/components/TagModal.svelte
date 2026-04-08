<script>
  import { createEventDispatcher } from 'svelte';

  export let allTags;
  export let requiredTags;
  export let forbiddenTags;

  const dispatch = createEventDispatcher();

  // Local copy: 'must' | 'can' | 'cannot'
  let statuses = {};
  for (const tag of allTags) {
    statuses[tag] = requiredTags.includes(tag) ? 'must' : forbiddenTags.includes(tag) ? 'cannot' : 'can';
  }

  function save() {
    dispatch('save', {
      requiredTags: Object.keys(statuses).filter((t) => statuses[t] === 'must'),
      forbiddenTags: Object.keys(statuses).filter((t) => statuses[t] === 'cannot'),
    });
  }
</script>

<div class="modal-overlay" on:click|self={() => dispatch('cancel')}>
  <div class="modal">
    <div class="modal-header">Tag Detail</div>
    <div class="modal-body">
      {#if allTags.length === 0}
        <p style="color: var(--color-text-muted)">No tags found in current transactions.</p>
      {:else}
        <table class="tag-table">
          <thead>
            <tr>
              <th></th>
              <th>Can Have</th>
              <th>Must Have</th>
              <th>Can't Have</th>
            </tr>
          </thead>
          <tbody>
            {#each allTags as tag}
              <tr>
                <td class="tag-name">{tag}</td>
                {#each ['can', 'must', 'cannot'] as v}
                  <td class="radio-cell">
                    <input
                      type="radio"
                      name={tag}
                      value={v}
                      checked={statuses[tag] === v}
                      on:change={() => { statuses = { ...statuses, [tag]: v }; }}
                    />
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
    <div class="modal-footer">
      <button class="primary" on:click={save}>Save</button>
      <button on:click={() => dispatch('cancel')}>Cancel</button>
    </div>
  </div>
</div>

<style>
  .tag-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .tag-table th {
    text-align: center;
    padding: 4px 8px;
    font-weight: 600;
    border-bottom: 1px solid var(--color-border);
  }

  .tag-table th:first-child {
    text-align: left;
  }

  .tag-name {
    padding: 4px 8px 4px 0;
  }

  .radio-cell {
    text-align: center;
    padding: 4px;
  }
</style>
