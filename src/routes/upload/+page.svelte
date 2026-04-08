<script>
  import { goto, beforeNavigate } from '$app/navigation';
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { currentUser, txData } from '$lib/stores.js';
  import { savePendingUploads, loadPendingUploads, clearPendingUploads, saveTransactions } from '$lib/dataService.js';

  $: knownCategories = [...new Set(
    Object.values($txData).flat().map(tx => tx.category).filter(Boolean)
  )].sort();

  $: if ($currentUser === null) goto('/login');

  // ── Unsaved-changes guard ──────────────────────────────────────────────────
  const UNSAVED_MSG = 'You have unsaved transactions. Leave anyway?';

  let savedAsPending = false; // true when rows match what's in the pending Firestore save

  beforeNavigate(({ cancel }) => {
    if (rows.length > 0 && !savedAsPending && !window.confirm(UNSAVED_MSG)) cancel();
  });

  function onBeforeUnload(e) {
    if (rows.length > 0 && !savedAsPending) { e.preventDefault(); e.returnValue = ''; }
  }

  // ── CSV parsing ────────────────────────────────────────────────────────────
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let i = 0;
    const len = text.length;
    while (i < len) {
      if (text[i] === '\r') { i++; continue; }
      if (text[i] === '"') {
        i++;
        let field = '';
        while (i < len) {
          if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
          else if (text[i] === '"') { i++; break; }
          else { field += text[i++]; }
        }
        row.push(field);
        if (text[i] === ',') i++;
        else if (text[i] === '\n') { i++; rows.push(row); row = []; }
        else if (text[i] === '\r') { i++; if (text[i] === '\n') i++; rows.push(row); row = []; }
      } else if (text[i] === '\n') {
        row.push(''); rows.push(row); row = []; i++;
      } else {
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') field += text[i++];
        row.push(field);
        if (text[i] === ',') i++;
        else if (text[i] === '\n') { i++; rows.push(row); row = []; }
        else if (text[i] === '\r') { i++; if (text[i] === '\n') i++; rows.push(row); row = []; }
      }
    }
    if (row.length > 0) rows.push(row);
    return rows;
  }

  // Normalize dates to YYYY-MM-DD (handles MM/DD/YYYY from Empower CSV)
  function normalizeDate(s) {
    if (!s) return '';
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    return s;
  }

  function csvToRows(text) {
    const all = parseCSV(text).filter(r => r.some(c => c.trim() !== ''));
    if (all.length < 2) return [];
    const headers = all[0].map(h => h.trim().toLowerCase());
    const idx = (name) => headers.indexOf(name);
    return all.slice(1).map((r, i) => ({
      _id: i,
      _transferGroup: null,   // null | number
      date:        normalizeDate(r[idx('date')] ?? ''),
      account:     r[idx('account')]      ?? '',
      description: r[idx('description')]  ?? '',
      category:    r[idx('category')]     ?? '',
      tags:        r[idx('tags')]         ?? '',
      amount:      r[idx('amount')]       ?? '',
      comments:    '',
      questions:   '',
    }));
  }

  // ── Transfer detection ─────────────────────────────────────────────────────
  function findTransfers() {
    let nextGroup = 1;
    const assignments = new Map(); // _id -> group number

    // Pass 1: same-account, same-day groups that sum to zero
    // Key: "date|account" -> _id[]
    const byDateAccount = new Map();
    for (const row of rows) {
      const amt = parseFloat(row.amount);
      if (isNaN(amt)) continue;
      const key = `${row.date}|${row.account}`;
      if (!byDateAccount.has(key)) byDateAccount.set(key, []);
      byDateAccount.get(key).push(row._id);
    }
    const claimedByPass1 = new Set();
    for (const ids of byDateAccount.values()) {
      if (ids.length < 2) continue;
      const sum = ids.reduce((s, id) => s + (parseFloat(rows.find(r => r._id === id).amount) || 0), 0);
      if (Math.round(sum * 100) === 0) {
        for (const id of ids) { assignments.set(id, nextGroup); claimedByPass1.add(id); }
        nextGroup++;
      }
    }

    // Pass 2: greedy pos/neg amount pairing for rows not already claimed
    const unclaimed = rows.filter(r => !claimedByPass1.has(r._id));
    const byAmount = new Map(); // cents -> { pos: _id[], neg: _id[] }
    for (const row of unclaimed) {
      const amt = parseFloat(row.amount);
      if (!amt || isNaN(amt)) continue;
      const cents = Math.round(Math.abs(amt) * 100);
      if (!byAmount.has(cents)) byAmount.set(cents, { pos: [], neg: [] });
      (amt > 0 ? byAmount.get(cents).pos : byAmount.get(cents).neg).push(row._id);
    }
    for (const { pos, neg } of byAmount.values()) {
      const pairs = Math.min(pos.length, neg.length);
      for (let i = 0; i < pairs; i++) {
        assignments.set(pos[i], nextGroup);
        assignments.set(neg[i], nextGroup);
        nextGroup++;
      }
    }

    rows = rows.map(r => ({ ...r, _transferGroup: assignments.get(r._id) ?? null }));
  }

  function deletePair(group) {
    saveUndo();
    rows.filter(r => r._transferGroup === group).forEach(r => selectedIds.delete(r._id));
    selectedIds = selectedIds;
    rows = rows.filter(r => r._transferGroup !== group);
  }

  function unmarkPair(group) {
    rows = rows.map(r => r._transferGroup === group ? { ...r, _transferGroup: null } : r);
  }

  function deleteAllTransferPairs() {
    saveUndo();
    rows.filter(r => r._transferGroup !== null).forEach(r => selectedIds.delete(r._id));
    selectedIds = selectedIds;
    rows = rows.filter(r => r._transferGroup === null);
  }

  // ── File loading ───────────────────────────────────────────────────────────
  let rows = [];
  let fileName = '';
  let dragOver = false;

  function loadFile(file) {
    if (!file || !file.name.endsWith('.csv')) return;
    fileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => { rows = csvToRows(e.target.result); selectedIds = new Set(); savedAsPending = false; };
    reader.readAsText(file);
  }

  function onFileInput(e) { loadFile(e.target.files[0]); }
  function onDrop(e) { e.preventDefault(); dragOver = false; loadFile(e.dataTransfer.files[0]); }

  // ── Undo ───────────────────────────────────────────────────────────────────
  let undoSnapshot = null;
  let undoTimer = null;

  function saveUndo() {
    if (undoTimer) clearTimeout(undoTimer);
    undoSnapshot = rows.slice();
    undoTimer = setTimeout(() => { undoSnapshot = null; }, 10000);
    savedAsPending = false;
  }

  function undo() {
    if (!undoSnapshot) return;
    rows = undoSnapshot;
    undoSnapshot = null;
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
  }

  function deleteRow(id) {
    saveUndo();
    selectedIds.delete(id); selectedIds = selectedIds;
    rows = rows.filter(r => r._id !== id);
  }

  function clearAll() {
    if (!window.confirm(`Clear all ${rows.length} rows? This will delete any pending upload data.`)) return;
    rows = []; fileName = ''; selectedIds = new Set(); pendingStatus = ''; undoSnapshot = null;
  }

  // ── Pending saves ──────────────────────────────────────────────────────────
  let pendingStatus = '';   // '' | 'saving' | 'saved' | 'loading' | 'error'
  let hasPending = false;   // whether a non-empty pending save exists

  async function checkForPending() {
    const saved = await loadPendingUploads().catch(() => null);
    hasPending = Array.isArray(saved) && saved.length > 0;
  }

  // Check on mount (after auth resolves)
  $: if ($currentUser) checkForPending();

  async function saveAsPending() {
    pendingStatus = 'saving';
    try {
      await savePendingUploads(rows);
      hasPending = rows.length > 0;
      pendingStatus = 'saved';
      savedAsPending = true;
      setTimeout(() => { if (pendingStatus === 'saved') pendingStatus = ''; }, 2500);
    } catch (e) {
      console.error(e);
      pendingStatus = 'error';
    }
  }

  async function resumePending() {
    pendingStatus = 'loading';
    try {
      const saved = await loadPendingUploads();
      if (saved && saved.length > 0) {
        // Re-assign sequential _id values to avoid collisions
        rows = saved.map((r, i) => ({ ...r, _id: i }));
        selectedIds = new Set();
        fileName = '(resumed from pending)';
        savedAsPending = true;
      }
      pendingStatus = '';
    } catch (e) {
      console.error(e);
      pendingStatus = 'error';
    }
  }

  // ── Save to Firestore ──────────────────────────────────────────────────────
  let saveStatus = '';   // '' | 'saving' | 'error'
  let toast = null;      // null | { lines: string[] }
  let toastTimer = null;

  function showToast(summary) {
    if (toastTimer) clearTimeout(toastTimer);
    const lines = Object.entries(summary)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => `${month}: ${count} transaction${count === 1 ? '' : 's'}`);
    toast = { lines };
    toastTimer = setTimeout(() => { toast = null; }, 6000);
  }

  async function saveToFirestore() {
    if (!window.confirm(`Save ${rows.length} transaction${rows.length === 1 ? '' : 's'} to Firestore?`)) return;
    saveStatus = 'saving';
    try {
      const summary = await saveTransactions(rows);
      await clearPendingUploads();
      hasPending = false;
      rows = [];
      fileName = '';
      selectedIds = new Set();
      saveStatus = '';
      showToast(summary);
    } catch (e) {
      console.error(e);
      saveStatus = 'error';
    }
  }

  function addRow() {
    savedAsPending = false;
    const newId = rows.reduce((max, r) => Math.max(max, r._id), -1) + 1;
    rows = [...rows, {
      _id: newId, _transferGroup: null,
      date: '', account: '', description: '', category: '',
      tags: '', amount: '', comments: '', questions: '',
    }];
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  let selectedIds = new Set();
  let anchorIndex = null; // index in displayRows of the last non-shift click

  // Track whether shift was held on click so on:change can read it.
  // We never call preventDefault — the browser toggles the clicked box naturally,
  // and on:change uses e.target.checked to know which direction to apply to the range.
  let shiftOnLastClick = false;
  function onRowCheckboxClick(e) { shiftOnLastClick = e.shiftKey; }

  function onRowCheckboxChange(e, id, displayIndex) {
    if (shiftOnLastClick && anchorIndex !== null) {
      const shouldSelect = e.target.checked; // direction driven by what the browser just did
      const lo = Math.min(anchorIndex, displayIndex);
      const hi = Math.max(anchorIndex, displayIndex);
      displayRows.slice(lo, hi + 1).forEach(r => {
        if (shouldSelect) selectedIds.add(r._id); else selectedIds.delete(r._id);
      });
      selectedIds = selectedIds;
      // anchor stays put on shift-clicks
    } else {
      if (e.target.checked) selectedIds.add(id); else selectedIds.delete(id);
      selectedIds = selectedIds;
      anchorIndex = displayIndex;
    }
  }

  function toggleSelectAll() {
    if (allDisplaySelected) displayRows.forEach(r => selectedIds.delete(r._id));
    else displayRows.forEach(r => selectedIds.add(r._id));
    selectedIds = selectedIds;
    anchorIndex = null;
  }

  function deleteSelected() {
    saveUndo();
    rows = rows.filter(r => !selectedIds.has(r._id));
    selectedIds = new Set();
    anchorIndex = null;
  }

  function setIndeterminate(node, value) {
    node.indeterminate = value;
    return { update(v) { node.indeterminate = v; } };
  }

  $: allDisplaySelected = displayRows.length > 0 && displayRows.every(r => selectedIds.has(r._id));
  $: someDisplaySelected = displayRows.some(r => selectedIds.has(r._id)) && !allDisplaySelected;
  $: selectedCount = selectedIds.size;
  $: selectedSum   = rows.filter(r => selectedIds.has(r._id))
                         .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  // ── Derived state ──────────────────────────────────────────────────────────
  $: openQuestions   = rows.filter(r => r.questions.trim() !== '').length;
  $: transferGroups     = new Set(rows.map(r => r._transferGroup).filter(g => g !== null));
  $: transferGroupCount = transferGroups.size;
  $: transferGroupSizes = rows.reduce((m, r) => {
    if (r._transferGroup !== null) m.set(r._transferGroup, (m.get(r._transferGroup) ?? 0) + 1);
    return m;
  }, new Map());

  let highlightedGroup = null;
  function toggleHighlight(group) {
    highlightedGroup = highlightedGroup === group ? null : group;
  }

  // ── Combine modal ──────────────────────────────────────────────────────────
  const COMBINE_COLS = ['date','account','description','category','tags','comments','questions'];

  let combineRows = null;   // array of rows being combined, or null when closed
  let combineChoices = {};  // { [colKey]: chosen value }

  $: combineAmount = combineRows
    ? Math.round(combineRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) * 100) / 100
    : 0;

  // Per-column distinct values from the selected rows
  $: combineOptions = combineRows
    ? COMBINE_COLS.map(key => {
        const vals = [...new Set(combineRows.map(r => r[key] ?? ''))];
        return { key, allSame: vals.length === 1, values: vals };
      })
    : [];

  function openCombineModal() {
    combineRows = rows.filter(r => selectedIds.has(r._id));
    combineChoices = Object.fromEntries(
      COMBINE_COLS.map(key => {
        const vals = [...new Set(combineRows.map(r => r[key] ?? ''))];
        return [key, vals[0] ?? ''];
      })
    );
  }

  function closeCombineModal() { combineRows = null; }

  function confirmCombine() {
    saveUndo();
    const newId = rows.reduce((max, r) => Math.max(max, r._id), 0) + 1;
    const combined = { _id: newId, _transferGroup: null, amount: String(combineAmount), ...combineChoices };
    // Replace the first selected row with the combined row, remove the rest
    const ids = new Set(combineRows.map(r => r._id));
    let inserted = false;
    rows = rows.flatMap(r => {
      if (!ids.has(r._id)) return [r];
      if (!inserted) { inserted = true; return [combined]; }
      return [];
    });
    selectedIds = new Set();
    closeCombineModal();
  }

  // ── Split modal ────────────────────────────────────────────────────────────
  let splitRow = null;
  let splitAmounts = [''];  // editable amounts for splits 1..n-1; nth is auto-calculated

  $: splitOriginal  = splitRow ? parseFloat(splitRow.amount) || 0 : 0;
  $: splitSum       = splitAmounts.reduce((s, a) => s + (parseFloat(a) || 0), 0);
  $: splitRemainder = Math.round((splitOriginal - splitSum) * 100) / 100;
  // Overflow means the remainder flipped sign vs. the original (went past zero)
  $: splitOverflow  = splitOriginal !== 0 && Math.sign(splitRemainder) !== Math.sign(splitOriginal) && splitRemainder !== 0;
  $: splitValid     = splitAmounts.every(a => a.trim() !== '' && !isNaN(parseFloat(a))) && !splitOverflow;

  // ── Nav mode ───────────────────────────────────────────────────────────────
  // Tracks the input currently in "navigation" mode (focused but not editing).
  // Navigating via arrow keys keeps nav mode; typing or clicking enters edit mode.
  let navInput = null;

  function moveToCell(input) {
    if (!input) return;
    if (navInput) navInput.removeAttribute('data-nav');
    navInput = input;
    input.setAttribute('data-nav', '');
    input.focus({ preventScroll: true });

    // Scroll the table container the minimum amount to keep the row fully visible,
    // accounting for the sticky thead at the top.
    if (tableWrapEl) {
      const tr         = input.closest('tr');
      const theadH     = tableWrapEl.querySelector('thead')?.offsetHeight ?? 0;
      const wrapRect   = tableWrapEl.getBoundingClientRect();
      const trRect     = tr?.getBoundingClientRect();
      if (trRect) {
        if (trRect.bottom > wrapRect.bottom)
          tableWrapEl.scrollTop += trRect.bottom - wrapRect.bottom;
        else if (trRect.top < wrapRect.top + theadH)
          tableWrapEl.scrollTop -= (wrapRect.top + theadH) - trRect.top;
      }
    }
  }

  function enterEditMode(input) {
    if (navInput) navInput.removeAttribute('data-nav');
    navInput = null;
    if (input) input.focus();
  }

  function onCellMousedown() {
    if (navInput) { navInput.removeAttribute('data-nav'); navInput = null; }
  }

  function onCellKeydown(e) {
    const td    = e.target.closest('td');
    const tr    = td.closest('tr');
    const isNav = e.target === navInput;

    if (e.key === 'd' && e.ctrlKey) {
      e.preventDefault();
      const rowId = displayRows[Array.from(tr.closest('tbody').querySelectorAll('tr')).indexOf(tr)]?._id;
      if (rowId !== undefined) deleteRow(rowId);
      return;
    }

    if (e.key === 'Escape' && !isNav) {
      e.preventDefault();
      moveToCell(e.target);
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const tbody  = tr.closest('tbody');
      const colIdx = Array.from(tr.querySelectorAll('td')).indexOf(td);
      const trs    = Array.from(tbody.querySelectorAll('tr'));
      const next   = trs[trs.indexOf(tr) + (e.key === 'ArrowDown' ? 1 : -1)];
      const input  = next?.querySelectorAll('td')[colIdx]?.querySelector('input[type="text"],input[type="date"]');
      if (input) moveToCell(input);
      return;
    }

    if (e.key === 'Tab' && e.target.list) {
      const input   = e.target;
      const options = Array.from(input.list.options).map(o => o.value);
      const current = input.value;
      const lower   = current.toLowerCase();
      const matches = [
        ...options.filter(o => o.toLowerCase().startsWith(lower)),
        ...options.filter(o => !o.toLowerCase().startsWith(lower) && o.toLowerCase().includes(lower)),
      ];
      if (matches.length >= 2 || (matches.length === 1 && matches[0] !== current)) {
        e.preventDefault();
        const idx  = matches.indexOf(current);
        const next = e.shiftKey
          ? matches[(idx - 1 + matches.length) % matches.length]
          : matches[(idx + 1) % matches.length];
        input.value = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.setSelectionRange(next.length, next.length);
      }
      return;
    }

    if (e.key === 'Enter') {
      if (isNav) {
        e.preventDefault();
        enterEditMode(e.target);
        e.target.select();
        return;
      }
      if (e.target.list) {
        const input   = e.target;
        const typed   = input.value;
        const options = Array.from(input.list.options).map(o => o.value);
        const lower   = typed.toLowerCase();
        const match   = options.find(o => o.toLowerCase().startsWith(lower))
                     ?? options.find(o => o.toLowerCase().includes(lower));
        if (match && match !== typed) {
          e.preventDefault();
          input.value = match;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.setSelectionRange(match.length, match.length);
          return;
        }
      }
      e.preventDefault();
      const tbody  = tr.closest('tbody');
      const colIdx = Array.from(tr.querySelectorAll('td')).indexOf(td);
      const trs    = Array.from(tbody.querySelectorAll('tr'));
      const next   = trs[trs.indexOf(tr) + 1];
      const input  = next?.querySelectorAll('td')[colIdx]?.querySelector('input[type="text"],input[type="date"]');
      if (input) moveToCell(input);
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const goingLeft = e.key === 'ArrowLeft';
      if (isNav) {
        e.preventDefault();
        const tds      = Array.from(tr.querySelectorAll('td'));
        const next     = tds[tds.indexOf(td) + (goingLeft ? -1 : 1)];
        const nextInput = next?.querySelector('input[type="text"],input[type="date"]');
        if (nextInput) moveToCell(nextInput);
        return;
      }
      // Edit mode: date inputs own left/right for segment navigation — don't intercept
      if (e.target.type === 'date') return;
      // Text inputs: only navigate when cursor is at the edge
      const input  = e.target;
      const atEdge = goingLeft
        ? input.selectionStart === 0 && input.selectionEnd === 0
        : input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
      if (!atEdge) return;
      e.preventDefault();
      const tds      = Array.from(tr.querySelectorAll('td'));
      const next     = tds[tds.indexOf(td) + (goingLeft ? -1 : 1)];
      const nextInput = next?.querySelector('input[type="text"],input[type="date"]');
      if (nextInput) {
        enterEditMode(nextInput);
        const pos = goingLeft ? nextInput.value.length : 0;
        nextInput.setSelectionRange(pos, pos);
      }
      return;
    }

    // Any printable key while in nav mode → enter edit mode (let the keystroke through)
    if (isNav && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      enterEditMode(e.target);
    }
  }

  function openSplitModal(row) { splitRow = row; splitAmounts = ['']; }
  function closeSplitModal()   { splitRow = null; }
  function addSplit()          { splitAmounts = [...splitAmounts, '']; }
  function removeSplit(i)      { splitAmounts = splitAmounts.filter((_, j) => j !== i); }

  function confirmSplit() {
    savedAsPending = false;
    const amts = [...splitAmounts.map(a => parseFloat(a)), splitRemainder];
    let nextId = rows.reduce((max, r) => Math.max(max, r._id), 0) + 1;
    const newRows = amts.map((amt, i) => ({
      ...splitRow,
      _id:           i === 0 ? splitRow._id : nextId++,
      _transferGroup: null,
      amount:        String(amt),
    }));
    rows = rows.flatMap(r => r._id === splitRow._id ? newRows : [r]);
    closeSplitModal();
  }

  // ── Column definitions ─────────────────────────────────────────────────────
  const columns = [
    { key: 'date',        label: 'Date',        numeric: false },
    { key: 'account',     label: 'Account',     numeric: false },
    { key: 'description', label: 'Description', numeric: false },
    { key: 'category',    label: 'Category',    numeric: false },
    { key: 'tags',        label: 'Tags',        numeric: false },
    { key: 'amount',      label: 'Amount',      numeric: true  },
    { key: 'comments',    label: 'Comments',    numeric: false },
    { key: 'questions',   label: 'Questions',   numeric: false, question: true },
  ];

  // ── Column widths (px) ─────────────────────────────────────────────────────
  let colWidths = { date: 140, account: 200, description: 220, category: 160,
                    tags: 120, amount: 90, comments: 180, questions: 200 };
  const ACTION_COL_W = 84;
  const CHECK_COL_W  = 32;
  $: tableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0) + ACTION_COL_W + CHECK_COL_W;

  let resizing = null; // { key, startX, startWidth }

  function onResizeStart(e, key) {
    e.preventDefault();
    resizing = { key, startX: e.clientX, startWidth: colWidths[key] };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
  }
  function onResizeMove(e) {
    if (!resizing) return;
    colWidths = { ...colWidths, [resizing.key]: Math.max(40, resizing.startWidth + e.clientX - resizing.startX) };
  }
  function onResizeEnd() {
    resizing = null;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
  }
  onDestroy(() => {
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
    window.removeEventListener('resize', updateTableTop);
    window.removeEventListener('keydown', onWindowKeydown);
    window.removeEventListener('beforeunload', onBeforeUnload);
  });

  // ── Table height ───────────────────────────────────────────────────────────
  let tableWrapEl;
  let tableTop = 0;

  function updateTableTop() {
    if (tableWrapEl) tableTop = tableWrapEl.getBoundingClientRect().top;
  }

  function onWindowKeydown(e) {
    if (e.key === 'z' && e.ctrlKey && !e.shiftKey) undo();
  }

  onMount(() => {
    window.addEventListener('resize', updateTableTop);
    window.addEventListener('keydown', onWindowKeydown);
    window.addEventListener('beforeunload', onBeforeUnload);
  });

  afterUpdate(updateTableTop);

  // ── Sorting ────────────────────────────────────────────────────────────────
  let sortKey = 'date';
  let sortDir = 1; // 1 = asc, -1 = desc

  function toggleSort(key) {
    if (sortKey === key) sortDir = -sortDir;
    else { sortKey = key; sortDir = key === 'amount' ? -1 : 1; }
  }

  $: displayRows = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    if (sortKey === 'amount') return (parseFloat(av) - parseFloat(bv)) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });
</script>

<div class="page">
  <div class="toolbar">
    <div class="toolbar-row">
      <h2 style="margin:0">Upload Transactions</h2>

      {#if rows.length}
        <span class="row-count">{rows.length} rows</span>
        {#if selectedCount > 0}
          <span class="selection-summary">
            {selectedCount} selected &nbsp;·&nbsp; {selectedSum.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        {/if}

        {#if openQuestions > 0}
          <span class="questions-badge">
            {openQuestions} open {openQuestions === 1 ? 'question' : 'questions'}
          </span>
        {/if}

        <button
          class="primary"
          disabled={openQuestions > 0 || saveStatus === 'saving'}
          title={openQuestions > 0 ? 'Resolve all questions before saving' : ''}
          on:click={saveToFirestore}
        >
          {saveStatus === 'saving' ? 'Saving…' : 'Save to Firestore'}
        </button>

        {#if saveStatus === 'error'}
          <span class="pending-error">Save failed</span>
        {/if}

        <button on:click={saveAsPending} disabled={pendingStatus === 'saving'}>
          {pendingStatus === 'saving' ? 'Saving…' : pendingStatus === 'saved' ? 'Saved ✓' : 'Save as pending'}
        </button>

        {#if pendingStatus === 'error'}
          <span class="pending-error">Save failed</span>
        {/if}

        <button on:click={clearAll}>Clear</button>
      {/if}
    </div>

    {#if rows.length}
      <div class="toolbar-row toolbar-row-secondary">
        <button on:click={findTransfers}>Find Transfers</button>
        {#if transferGroupCount > 0}
          <span class="transfer-badge">
            {transferGroupCount} transfer {transferGroupCount === 1 ? 'group' : 'groups'}
          </span>
          <button on:click={deleteAllTransferPairs}>Delete all transfer groups</button>
        {/if}
        <button on:click={addRow}>+ Add row</button>
        {#if selectedCount > 0}
          <button class="danger" on:click={deleteSelected}>Delete selected</button>
        {/if}
        {#if selectedCount >= 2}
          <button on:click={openCombineModal}>Combine</button>
        {/if}
        {#if undoSnapshot}
          <button class="undo-btn" on:click={undo}>↩ Undo delete</button>
        {/if}
      </div>
    {/if}
  </div>

  {#if !rows.length}
    <label
      class="drop-zone"
      class:drag-over={dragOver}
      on:dragover|preventDefault={() => (dragOver = true)}
      on:dragleave={() => (dragOver = false)}
      on:drop={onDrop}
    >
      <input type="file" accept=".csv" on:change={onFileInput} style="display:none" />
      <span class="drop-icon">📂</span>
      <span>Drop a CSV file here, or <u>click to browse</u></span>
      <span class="drop-hint">Expects Empower CSV format: Date, Account, Description, Category, Tags, Amount</span>
    </label>
    <div class="manual-entry-bar">
      <span>or</span>
      <button on:click={addRow}>+ Enter transactions by hand</button>
    </div>

    {#if hasPending}
      <div class="pending-resume-bar">
        <span>You have a pending upload saved.</span>
        <button class="primary" on:click={resumePending} disabled={pendingStatus === 'loading'}>
          {pendingStatus === 'loading' ? 'Loading…' : 'Resume pending upload'}
        </button>
      </div>
    {/if}
  {:else}
    <p class="file-name">📄 {fileName}</p>
    <div class="table-wrap" bind:this={tableWrapEl} style="max-height: calc(100vh - {tableTop}px - 52px)">
      <table style="width:{tableWidth}px; table-layout:fixed">
        <thead>
          <tr>
            <th class="col-check">
              <input type="checkbox"
                checked={allDisplaySelected}
                use:setIndeterminate={someDisplaySelected}
                on:change={toggleSelectAll}
              />
            </th>
            <th class="col-action"></th>
            {#each columns as col}
              <th
                style="width:{colWidths[col.key]}px"
                class:col-question={col.question}
                class:sort-active={sortKey === col.key}
                on:click={() => toggleSort(col.key)}
              >
                <span class="th-label">{col.label}</span>
                {#if sortKey === col.key}
                  <span class="sort-arrow">{sortDir === 1 ? '▲' : '▼'}</span>
                {/if}
                <div class="resize-handle" on:mousedown|stopPropagation={(e) => onResizeStart(e, col.key)}></div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each displayRows as row, i (row._id)}
            <tr
              class:is-transfer={row._transferGroup !== null}
              class:is-highlighted={row._transferGroup !== null && row._transferGroup === highlightedGroup}
              class:has-question={row.questions.trim() !== ''}
              class:is-selected={selectedIds.has(row._id)}
            >
              <td class="col-check">
                <input type="checkbox"
                  checked={selectedIds.has(row._id)}
                  on:click={onRowCheckboxClick}
                  on:change={(e) => onRowCheckboxChange(e, row._id, i)}
                />
              </td>
              <td class="col-action">
                {#if row._transferGroup !== null}
                  <div class="transfer-cell">
                    <span
                      class="transfer-label"
                      class:transfer-label-active={highlightedGroup === row._transferGroup}
                      title="Click to highlight both rows in this pair"
                      role="button"
                      tabindex="0"
                      on:click={() => toggleHighlight(row._transferGroup)}
                      on:keydown={(e) => e.key === 'Enter' && toggleHighlight(row._transferGroup)}
                    >↕{row._transferGroup} <span class="transfer-label-size">({transferGroupSizes.get(row._transferGroup)})</span></span>
                    <button class="icon-btn delete-pair-btn" title="Delete both rows in this pair"
                      on:click={() => deletePair(row._transferGroup)}>🗑</button>
                    <button class="icon-btn unmark-btn" title="Unmark as transfer"
                      on:click={() => unmarkPair(row._transferGroup)}>↩</button>
                    <button class="icon-btn split-btn" title="Split row"
                      on:click={() => openSplitModal(row)}>÷</button>
                  </div>
                {:else}
                  <button class="del-btn" title="Delete row" on:click={() => deleteRow(row._id)}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6.5 1h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1zM2 3h12v1H2V3zm2 1.5A.5.5 0 0 1 4.5 4h7a.5.5 0 0 1 .5.5V13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4.5zm1 .5v8a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V5H5zm2 1.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v4a.5.5 0 0 0 1 0V7z"/>
                    </svg>
                  </button>
                  <button class="icon-btn split-btn" title="Split row"
                    on:click={() => openSplitModal(row)}>÷</button>
                {/if}
              </td>

              {#each columns as col}
                <td class:col-question={col.question}>
                  {#if col.key === 'date'}
                    <input
                      type="date"
                      bind:value={row[col.key]}
                      on:keydown={onCellKeydown}
                      on:mousedown={onCellMousedown}
                      on:change={() => savedAsPending = false}
                    />
                  {:else}
                    <input
                      type="text"
                      class:numeric={col.numeric}
                      class:question-input={col.question && row[col.key].trim() !== ''}
                      bind:value={row[col.key]}
                      list={col.key === 'category' ? 'category-options' : undefined}
                      on:keydown={onCellKeydown}
                      on:mousedown={onCellMousedown}
                      on:input={() => savedAsPending = false}
                    />
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <button class="add-row-btn" on:click={addRow}>+ Add row</button>
  {/if}
</div>

<datalist id="category-options">
  {#each knownCategories as cat}
    <option value={cat} />
  {/each}
</datalist>

{#if splitRow}
  <div class="modal-overlay" role="dialog" on:click|self={closeSplitModal}>
    <div class="modal split-modal">
      <div class="modal-header">Split Row</div>
      <div class="modal-body">

        <div class="split-info">
          <span class="split-info-label">Description</span>
          <span>{splitRow.description}</span>
          <span class="split-info-label">Original amount</span>
          <strong class:negative-amt={splitOriginal < 0}>{splitOriginal}</strong>
        </div>

        <div class="split-list">
          {#each splitAmounts as _, i}
            <div class="split-row">
              <span class="split-row-n">Split {i + 1}</span>
              <input
                type="number"
                step="0.01"
                value={splitAmounts[i]}
                placeholder={splitOriginal < 0 ? 'e.g. -40.00' : 'e.g. 40.00'}
                class:invalid={splitAmounts[i].trim() !== '' && isNaN(parseFloat(splitAmounts[i]))}
                autofocus={i === 0}
                on:input={(e) => { splitAmounts[i] = e.target.value; splitAmounts = splitAmounts; }}
              />
              {#if splitAmounts.length > 1}
                <button class="icon-btn remove-split-btn" title="Remove" on:click={() => removeSplit(i)}>✕</button>
              {:else}
                <span class="icon-btn-placeholder"></span>
              {/if}
            </div>
          {/each}

          <!-- Auto-calculated remainder row -->
          <div class="split-row remainder-row">
            <span class="split-row-n">Split {splitAmounts.length + 1} <em>(remainder)</em></span>
            <input type="number" value={splitRemainder} disabled class:negative-remainder={splitOverflow} />
            <span class="icon-btn-placeholder"></span>
          </div>
        </div>

        <button class="add-split-btn" on:click={addSplit}>+ Add split</button>

        {#if splitOverflow}
          <p class="split-error">Amounts exceed the original — reduce the values above.</p>
        {/if}
      </div>
      <div class="modal-footer">
        <button class="primary" disabled={!splitValid} on:click={confirmSplit}>Confirm</button>
        <button on:click={closeSplitModal}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

{#if combineRows}
  <div class="modal-overlay" role="dialog" on:click|self={closeCombineModal}>
    <div class="modal combine-modal">
      <div class="modal-header">Combine {combineRows.length} Transactions</div>
      <div class="modal-body">
        <table class="combine-table">
          <tbody>
            {#each combineOptions as opt}
              <tr>
                <th>{opt.key.charAt(0).toUpperCase() + opt.key.slice(1)}</th>
                <td>
                  {#if opt.allSame}
                    <span class="combine-fixed">{opt.values[0] || '(empty)'}</span>
                  {:else}
                    <div class="combine-choices">
                      {#each opt.values as val}
                        <button
                          class="combine-choice"
                          class:combine-choice-active={combineChoices[opt.key] === val}
                          on:click={() => combineChoices[opt.key] = val}
                        >{val || '(empty)'}</button>
                      {/each}
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
            <tr>
              <th>Amount</th>
              <td><span class="combine-fixed" class:negative-amt={combineAmount < 0}>{combineAmount}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="primary" on:click={confirmCombine}>Combine</button>
        <button on:click={closeCombineModal}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

{#if toast}
  <div class="toast">
    <strong>Saved to Firestore</strong>
    {#each toast.lines as line}
      <div>{line}</div>
    {/each}
  </div>
{/if}

<style>
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .toolbar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .toolbar-row-secondary {
    gap: 8px;
  }

  .undo-btn {
    color: #92400e;
    background: #fffbeb;
    border-color: #fcd34d;
  }
  .undo-btn:hover {
    background: #fef3c7;
  }

  .row-count { color: var(--color-text-muted); font-size: 13px; }

  button.danger {
    background: #fef2f2;
    border-color: #fca5a5;
    color: var(--color-danger);
  }
  button.danger:hover {
    background: #fee2e2;
    border-color: var(--color-danger);
  }

  .selection-summary {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-primary);
    background: #e8f0fe;
    border: 1px solid #b3cdf9;
    border-radius: 12px;
    padding: 2px 12px;
  }

  .transfer-badge {
    font-size: 13px;
    color: #5b21b6;
    background: #ede9fe;
    border: 1px solid #c4b5fd;
    border-radius: 12px;
    padding: 2px 10px;
  }

  .questions-badge {
    font-size: 13px;
    color: #b45309;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 12px;
    padding: 2px 10px;
  }

  /* Drop zone */
  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 2px dashed var(--color-border);
    border-radius: 8px;
    padding: 60px 40px;
    cursor: pointer;
    color: var(--color-text-muted);
    background: var(--color-surface);
    transition: border-color 0.15s, background 0.15s;
    text-align: center;
  }
  .drop-zone:hover, .drop-zone.drag-over {
    border-color: var(--color-primary);
    background: #f0f6ff;
    color: var(--color-text);
  }
  .drop-icon { font-size: 40px; }
  .drop-hint { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }

  .manual-entry-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  .file-name { font-size: 13px; color: var(--color-text-muted); margin: 0 0 8px; }

  /* Table */
  .table-wrap {
    overflow-x: auto;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface);
  }

  table {
    border-collapse: collapse;
    font-size: 13px;
    width: max-content;
    min-width: 100%;
  }

  thead th {
    position: sticky;
    top: 0;
    background: #f0f0f0;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid var(--color-border);
    white-space: nowrap;
    z-index: 1;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
  }
  thead th:hover        { background: #e4e4e4; }
  thead th.sort-active  { background: #dce9f8; }
  thead th.col-action   { cursor: default; }

  .th-label   { pointer-events: none; }
  .sort-arrow { font-size: 10px; margin-left: 3px; pointer-events: none; }

  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 5px;
    cursor: col-resize;
  }
  .resize-handle:hover { background: var(--color-primary); opacity: 0.4; }

  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr:hover           { background: #eef4fb; }

  /* Transfer rows: purple tint; questions: amber tint. Questions win if both. */
  tbody tr.is-transfer              { background: #f5f3ff; }
  tbody tr.is-transfer:hover        { background: #ede9fe; }
  tbody tr.has-question             { background: #fffbeb; }
  tbody tr.has-question:hover       { background: #fef3c7; }
  tbody tr.is-transfer.has-question { background: #fef9c3; }
  tbody tr.is-highlighted           { background: #7c3aed !important; color: white; }
  tbody tr.is-highlighted td input[type="text"] { color: white; }
  tbody tr.is-highlighted td input[type="text"]:hover,
  tbody tr.is-highlighted td input[type="text"]:focus { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.4); color: white; }

  td {
    padding: 2px 4px;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
  }

  .col-check { width: 32px; text-align: center; padding: 2px; }
  thead th.col-check { cursor: default; }

  tbody tr.is-selected                    { background: #eff6ff; }
  tbody tr.is-selected:hover              { background: #dbeafe; }
  tbody tr.is-selected.is-transfer        { background: #ede9fe; }
  tbody tr.is-selected.has-question       { background: #fef3c7; }

  /* Action column: fixed width, holds delete OR transfer controls */
  .col-action { width: 80px; white-space: nowrap; text-align: center; padding: 2px 4px; }

  .transfer-cell {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .transfer-label {
    font-size: 11px;
    font-weight: 600;
    color: #6d28d9;
    background: #ddd6fe;
    border-radius: 3px;
    padding: 1px 4px;
    cursor: pointer;
    user-select: none;
  }
  .transfer-label:hover        { background: #c4b5fd; }
  .transfer-label-active       { background: #7c3aed; color: white; }
  .transfer-label-size         { font-weight: 400; opacity: 0.75; }

  .icon-btn {
    background: none;
    border: none;
    padding: 2px 3px;
    font-size: 12px;
    cursor: pointer;
    border-radius: 3px;
    line-height: 1;
  }

  .delete-pair-btn:hover { background: #fee2e2; }
  .unmark-btn:hover      { background: #e0e7ff; }

  .del-btn {
    background: none;
    border: none;
    color: #aaa;
    padding: 3px 4px;
    cursor: pointer;
    border-radius: 3px;
    line-height: 1;
  }
  .del-btn:hover { background: #fff0f0; color: #e53e3e; }

  .split-btn       { font-size: 14px; color: #666; }
  .split-btn:hover { background: #e0f2fe; color: var(--color-primary); }

  /* ── Split modal ── */
  .split-modal { min-width: 400px; max-width: 520px; }

  .split-info {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    align-items: baseline;
    background: #f8f8f8;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-bottom: 16px;
    font-size: 13px;
  }
  .split-info-label { color: var(--color-text-muted); font-size: 12px; }
  .negative-amt     { color: var(--color-danger); }

  .split-list   { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }

  .split-row {
    display: grid;
    grid-template-columns: 110px 1fr 24px;
    align-items: center;
    gap: 8px;
  }

  .split-row-n {
    font-size: 13px;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .split-row input[type="number"] {
    font: inherit;
    font-size: 13px;
    padding: 4px 8px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    width: 100%;
    text-align: right;
  }
  .split-row input[type="number"]:focus { outline: 2px solid var(--color-primary); outline-offset: -1px; }
  .split-row input.invalid              { border-color: var(--color-danger); }

  .remainder-row input[type="number"]   { background: #f0f0f0; color: var(--color-text-muted); }
  .remainder-row input.negative-remainder {
    background: #fef2f2;
    border-color: #fca5a5;
    color: var(--color-danger);
  }
  .remainder-row .split-row-n em { font-style: italic; font-size: 11px; }

  .icon-btn-placeholder { width: 24px; display: inline-block; }
  .remove-split-btn { color: #aaa; font-size: 11px; }
  .remove-split-btn:hover { background: #fee; color: var(--color-danger); }

  .add-row-btn {
    margin-top: 6px;
    font-size: 13px;
    color: var(--color-primary);
    background: none;
    border: 1px dashed var(--color-primary);
    border-radius: var(--radius);
    padding: 4px 16px;
    cursor: pointer;
    width: 100%;
  }
  .add-row-btn:hover { background: #f0f6ff; }

  .add-split-btn {
    font-size: 13px;
    color: var(--color-primary);
    background: none;
    border: 1px dashed var(--color-primary);
    border-radius: var(--radius);
    padding: 4px 12px;
    cursor: pointer;
    width: 100%;
    margin-top: 2px;
  }
  .add-split-btn:hover { background: #f0f6ff; }

  .split-error {
    color: var(--color-danger);
    font-size: 13px;
    margin: 8px 0 0;
  }

  .pending-resume-bar {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: var(--radius);
    font-size: 13px;
    color: #92400e;
  }

  .pending-error {
    font-size: 13px;
    color: var(--color-danger);
  }

  /* Editable inputs look like plain text */
  td input[type="text"] {
    border: 1px solid transparent;
    background: transparent;
    padding: 3px 4px;
    font: inherit;
    width: 100%;
    min-width: 60px;
    border-radius: 3px;
  }
  td input[type="text"]:hover { border-color: var(--color-border); background: white; }
  td input[type="text"]:focus { border-color: var(--color-primary); background: white; outline: none; }
  td input[type="text"][data-nav] { border-color: var(--color-primary); background: #eef3fd; outline: none; caret-color: transparent; }
  td input[type="text"].numeric { text-align: right; }

  /* Questions column */
  th.col-question, td.col-question { background: #fffbeb; }
  td input[type="text"].question-input { background: #fef3c7; border-color: #fcd34d; }

  /* Combine modal */
  .combine-modal { min-width: 480px; }

  .combine-table { width: 100%; border-collapse: collapse; }
  .combine-table th {
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 8px 12px 8px 0;
    width: 100px;
    vertical-align: top;
  }
  .combine-table td { padding: 6px 0; vertical-align: top; }
  .combine-table tr + tr td,
  .combine-table tr + tr th { border-top: 1px solid var(--color-border); }

  .combine-fixed { font-size: 13px; color: var(--color-text); }

  .combine-choices { display: flex; flex-wrap: wrap; gap: 6px; }
  .combine-choice {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    cursor: pointer;
    color: var(--color-text);
  }
  .combine-choice:hover { border-color: var(--color-primary); color: var(--color-primary); }
  .combine-choice-active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
  .combine-choice-active:hover { color: white; }

  /* Toast */
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1e293b;
    color: #f8fafc;
    border-radius: 8px;
    padding: 14px 20px;
    font-size: 13px;
    line-height: 1.6;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    z-index: 1000;
    min-width: 220px;
  }
  .toast strong {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
  }
</style>
