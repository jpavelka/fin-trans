<script>
  import { createEventDispatcher } from 'svelte';

  export let tx;
  export let allValues = {};  // { category: [], account: [], tags: [] }

  const dispatch = createEventDispatcher();

  // ── Form state ─────────────────────────────────────────────────────────────
  let date        = tx.date ?? '';
  let txType      = tx.type ?? 'expense';           // 'expense' | 'income'
  let amount      = tx.amount ?? 0;                 // always positive (abs) in table
  let description = tx.description ?? '';
  let category    = tx.category ?? '';
  let account     = tx.account ?? '';
  let tags        = (tx.tags ?? []).join(', ');
  let comments    = tx.comments ?? '';
  let amortize    = tx.amortize ?? '';

  let saving = false;
  let error = '';

  // ── Autocomplete ───────────────────────────────────────────────────────────
  let acField = null;
  let acIdx = -1;

  const acFieldMap = { category: 'category', account: 'account' };

  function acOptions(field, value) {
    const all = allValues[field] || [];
    if (!value) return all;
    const lower = value.toLowerCase();
    return all.filter((v) => v.toLowerCase().includes(lower));
  }

  function openAc(field)  { acField = field; acIdx = -1; }
  function closeAc()      { acField = null;  acIdx = -1; }

  function selectAc(field, value) {
    if (field === 'category') category = value;
    if (field === 'account')  account  = value;
    closeAc();
  }

  function acKeydown(e, field) {
    const opts = acOptions(field, field === 'category' ? category : account);
    if (e.key === 'ArrowDown') { e.preventDefault(); acIdx = Math.min(acIdx + 1, opts.length - 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); acIdx = Math.max(acIdx - 1, -1); }
    else if (e.key === 'Enter' && acIdx >= 0) { e.preventDefault(); selectAc(field, opts[acIdx]); }
    else if (e.key === 'Escape') closeAc();
    else { acField = field; acIdx = -1; }
  }

  // ── Tag autocomplete ───────────────────────────────────────────────────────
  // Suggest tags for the last comma-segment being typed
  let tagAcIdx = -1;
  $: currentTagSegment = tags.split(',').pop()?.trim() ?? '';
  $: tagSuggestions = (() => {
    if (!currentTagSegment) return [];
    const lower = currentTagSegment.toLowerCase();
    const existing = tags.split(',').map(t => t.trim().toLowerCase());
    return (allValues.tags || []).filter(t =>
      t.toLowerCase().includes(lower) && !existing.slice(0, -1).includes(t.toLowerCase())
    );
  })();

  function selectTag(tag) {
    const parts = tags.split(',');
    parts[parts.length - 1] = ' ' + tag;
    tags = parts.join(',').replace(/^,\s*/, '') + ', ';
    tagAcIdx = -1;
    acField = null;
  }

  function tagKeydown(e) {
    if (acField !== 'tags') { acField = 'tags'; tagAcIdx = -1; return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); tagAcIdx = Math.min(tagAcIdx + 1, tagSuggestions.length - 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); tagAcIdx = Math.max(tagAcIdx - 1, -1); }
    else if (e.key === 'Enter' && tagAcIdx >= 0) { e.preventDefault(); selectTag(tagSuggestions[tagAcIdx]); }
    else if (e.key === 'Escape') closeAc();
    else { acField = 'tags'; tagAcIdx = -1; }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function save() {
    error = '';
    if (!date) { error = 'Date is required.'; return; }
    if (isNaN(parseFloat(amount))) { error = 'Amount must be a number.'; return; }

    const storedAmount = txType === 'expense'
      ? -Math.abs(parseFloat(amount))
      :  Math.abs(parseFloat(amount));

    const parsedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    const updates = {
      date,
      amount: storedAmount,
      description,
      category,
      account,
      tags: parsedTags,
      comments,
      ...(amortize !== '' && !isNaN(parseInt(amortize)) ? { amortize: parseInt(amortize) } : { amortize: undefined }),
    };
    // Remove undefined fields
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

    saving = true;
    dispatch('save', { tx, updates });
  }
</script>

<div class="modal-overlay" on:click|self={() => dispatch('cancel')}>
  <div class="modal" style="min-width: 420px;">
    <div class="modal-header">Edit Transaction</div>
    <div class="modal-body">
      {#if error}<p class="form-error">{error}</p>{/if}

      <div class="form-grid">

        <label>Date</label>
        <input type="date" bind:value={date} />

        <label>Type</label>
        <select bind:value={txType}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <label>Amount</label>
        <input type="number" step="any" min="0" bind:value={amount} />

        <label>Description</label>
        <input type="text" bind:value={description} />

        <label>Category</label>
        <div class="ac-wrap">
          <input type="text" bind:value={category}
            on:focus={() => openAc('category')}
            on:blur={() => setTimeout(closeAc, 150)}
            on:keydown={(e) => acKeydown(e, 'category')}
          />
          {#if acField === 'category'}
            {@const opts = acOptions('category', category)}
            {#if opts.length}
              <ul class="ac-dropdown">
                {#each opts as o, i}
                  <li class:highlighted={i === acIdx}
                    on:mousedown|preventDefault={() => selectAc('category', o)}>{o}</li>
                {/each}
              </ul>
            {/if}
          {/if}
        </div>

        <label>Account</label>
        <div class="ac-wrap">
          <input type="text" bind:value={account}
            on:focus={() => openAc('account')}
            on:blur={() => setTimeout(closeAc, 150)}
            on:keydown={(e) => acKeydown(e, 'account')}
          />
          {#if acField === 'account'}
            {@const opts = acOptions('account', account)}
            {#if opts.length}
              <ul class="ac-dropdown">
                {#each opts as o, i}
                  <li class:highlighted={i === acIdx}
                    on:mousedown|preventDefault={() => selectAc('account', o)}>{o}</li>
                {/each}
              </ul>
            {/if}
          {/if}
        </div>

        <label>Tags</label>
        <div class="ac-wrap">
          <input type="text" bind:value={tags} placeholder="comma-separated"
            on:focus={() => { acField = 'tags'; tagAcIdx = -1; }}
            on:blur={() => setTimeout(closeAc, 150)}
            on:keydown={tagKeydown}
          />
          {#if acField === 'tags' && tagSuggestions.length}
            <ul class="ac-dropdown">
              {#each tagSuggestions as o, i}
                <li class:highlighted={i === tagAcIdx}
                  on:mousedown|preventDefault={() => selectTag(o)}>{o}</li>
              {/each}
            </ul>
          {/if}
        </div>

        <label>Comments</label>
        <input type="text" bind:value={comments} />

        <label>Amortize</label>
        <input type="number" min="1" step="1" placeholder="months (optional)" bind:value={amortize} />

      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" on:click={() => dispatch('cancel')} disabled={saving}>Cancel</button>
      <button class="btn btn-primary" on:click={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  </div>
</div>

<style>
  .form-grid {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 8px 12px;
    align-items: center;
  }

  .form-grid label {
    font-size: 13px;
    font-weight: 500;
    text-align: right;
    color: var(--color-text-muted);
  }

  .form-grid input,
  .form-grid select {
    font-size: 13px;
    padding: 4px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    width: 100%;
    box-sizing: border-box;
  }

  .form-error {
    color: #e53e3e;
    font-size: 13px;
    margin: 0 0 10px;
  }

  .ac-wrap {
    position: relative;
  }

  .ac-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 3px;
    list-style: none;
    margin: 2px 0 0;
    padding: 0;
    z-index: 200;
    max-height: 160px;
    overflow-y: auto;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }

  .ac-dropdown li {
    padding: 4px 10px;
    font-size: 13px;
    cursor: pointer;
  }

  .ac-dropdown li:hover,
  .ac-dropdown li.highlighted {
    background: #eef4fb;
  }
</style>
