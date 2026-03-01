<script lang="ts">
  import { getContext } from 'svelte';

  // ── Types ──────────────────────────────────────────────────────────────────
  interface Category {
    id: number;
    name: string;
    color: string;
    icon: string;
    subcategories: Subcategory[];
  }

  interface Subcategory {
    id: number;
    name: string;
    categoryId: number;
    createdAt: string;
  }

  interface Purchase {
    id: number;
    itemId: number;
    store: string;
    pricePerUnit: string;
    quantityBought: string;
    purchasedAt: string;
    notes: string | null;
  }

  interface Item {
    id: number;
    name: string;
    categoryId: number;
    subcategoryId: number | null;
    unit: string;
    quantity: string;
    threshold: string;
    notes: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    category: Omit<Category, 'subcategories'> | null;
    subcategory: Subcategory | null;
    purchases: Purchase[];
  }

  interface PageData {
    items: Item[];
    categories: Category[];
  }

  interface NewItemForm {
    name: string;
    categoryId: number | '';
    subcategoryId: number | '';
    unit: string;
    quantity: number;
    threshold: number;
    notes: string;
  }

  interface PurchaseForm {
    store: string;
    pricePerUnit: string;
    quantityBought: string;
    notes: string;
    purchasedAt: string;
  }

  interface SubGroups {
    [subKey: string]: Item[];
  }

  interface CategoryGroup {
    category: Omit<Category, 'subcategories'> | null;
    subs: SubGroups;
  }

  interface GroupedItems {
    [catKey: string]: CategoryGroup;
  }

  interface LayoutContext {
    readonly filterCategory: string;
    setFilterCategory(id: string): void;
  }

  // ── Props & Context ────────────────────────────────────────────────────────
  let { data }: { data: PageData } = $props();

  const layout = getContext<LayoutContext>('layout');

  // ── State ──────────────────────────────────────────────────────────────────
  let items = $state<Item[]>(data.items ?? []);
  let categories = $state<Category[]>(data.categories ?? []);

  let searchQuery = $state<string>('');
  let filterStatus = $state<'all' | 'low' | 'ok'>('all');
  let viewMode = $state<'grid' | 'list'>('grid');

  // Modal / panel state
  let showAddItem = $state<boolean>(false);
  let showPurchaseModal = $state<boolean>(false);
  let showItemDetail = $state<boolean>(false);
  let editingItem = $state<Item | null>(null);
  let selectedItem = $state<Item | null>(null);

  // Form state
  let newItem = $state<NewItemForm>({
    name: '',
    categoryId: '',
    subcategoryId: '',
    unit: 'units',
    quantity: 0,
    threshold: 1,
    notes: ''
  });
  let purchaseForm = $state<PurchaseForm>({
    store: '',
    pricePerUnit: '',
    quantityBought: '',
    notes: '',
    purchasedAt: ''
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  let filteredItems = $derived.by<Item[]>(() => {
    let result = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.category?.name.toLowerCase().includes(q) ||
        i.subcategory?.name.toLowerCase().includes(q)
      );
    }
    if (layout.filterCategory !== 'all') {
      result = result.filter((i) => i.categoryId === parseInt(layout.filterCategory));
    }
    if (filterStatus === 'low') {
      result = result.filter((i) => parseFloat(i.quantity) <= parseFloat(i.threshold));
    } else if (filterStatus === 'ok') {
      result = result.filter((i) => parseFloat(i.quantity) > parseFloat(i.threshold));
    }
    return result;
  });

  let groupedItems = $derived.by<GroupedItems>(() => {
    const groups: GroupedItems = {};
    for (const item of filteredItems) {
      const catKey = item.category?.name ?? 'Uncategorized';
      const subKey = item.subcategory?.name ?? 'General';
      if (!groups[catKey]) groups[catKey] = { category: item.category, subs: {} };
      if (!groups[catKey].subs[subKey]) groups[catKey].subs[subKey] = [];
      groups[catKey].subs[subKey].push(item);
    }
    return groups;
  });

  let subcategoriesForSelected = $derived.by<Subcategory[]>(() => {
    if (!newItem.categoryId) return [];
    const cat = categories.find((c) => c.id === parseInt(String(newItem.categoryId)));
    return cat?.subcategories ?? [];
  });

  let currentCategoryName = $derived.by<string>(() => {
    if (layout.filterCategory === 'all') return 'All Items';
    return categories.find((c) => String(c.id) === layout.filterCategory)?.name ?? 'Items';
  });

  let editingSubcategories: Subcategory[] = $derived.by(() => {
    if (!editingItem?.categoryId) return [];
    const cat = categories.find((c) => c.id === editingItem!.categoryId);
    return cat?.subcategories ?? [];
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function isLow(item: Item): boolean {
    return parseFloat(item.quantity) <= parseFloat(item.threshold);
  }

  function stockPercent(item: Item): number {
    const qty = parseFloat(item.quantity);
    const thr = parseFloat(item.threshold);
    if (thr === 0) return qty > 0 ? 100 : 0;
    return Math.min(100, Math.round((qty / (thr * 3)) * 100));
  }

  function lastPurchase(item: Item): Purchase | null {
    return item.purchases?.[0] ?? null;
  }

  function formatDate(d: string | null | undefined): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Svelte 5 replacement for onclick|stopPropagation
  function stopProp(e: MouseEvent): void {
    e.stopPropagation();
  }

  // ── API Calls ──────────────────────────────────────────────────────────────
  async function addItem(): Promise<void> {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      const item: Item = await res.json();
      items = [...items, item];
      showAddItem = false;
      newItem = { name: '', categoryId: '', subcategoryId: '', unit: 'units', quantity: 0, threshold: 1, notes: '' };
    }
  }

  async function updateItem(): Promise<void> {
    if (!editingItem) return;
    const res = await fetch(`/api/items/${editingItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem)
    });
    if (res.ok) {
      const updated: Item = await res.json();
      items = items.map((i) => (i.id === updated.id ? updated : i));
      if (selectedItem?.id === updated.id) selectedItem = updated;
      editingItem = null;
    }
  }

  async function deleteItem(id: number): Promise<void> {
    if (!confirm('Archive this item?')) return;
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    items = items.filter((i) => i.id !== id);
    if (selectedItem?.id === id) {
      selectedItem = null;
      showItemDetail = false;
    }
  }

  async function recordPurchase(): Promise<void> {
    if (!selectedItem) return;
    const res = await fetch(`/api/items/${selectedItem.id}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchaseForm)
    });
    if (res.ok) {
      const updated: Item = await fetch(`/api/items/${selectedItem.id}`).then((r) => r.json());
      items = items.map((i) => (i.id === updated.id ? updated : i));
      selectedItem = updated;
      showPurchaseModal = false;
      purchaseForm = { store: '', pricePerUnit: '', quantityBought: '', notes: '', purchasedAt: '' };
    }
  }

  async function quickUpdateQuantity(item: Item, delta: number): Promise<void> {
    const newQty = Math.max(0, parseFloat(item.quantity) + delta);
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty })
    });
    if (res.ok) {
      const updated: Item = await res.json();
      items = items.map((i) => (i.id === updated.id ? updated : i));
      if (selectedItem?.id === updated.id) selectedItem = updated;
    }
  }

  function openDetail(item: Item): void {
    selectedItem = item;
    showItemDetail = true;
  }

  function startEdit(item: Item): void {
    editingItem = { ...item };
  }

  function closeDetail(): void {
    showItemDetail = false;
    editingItem = null;
  }
</script>

<!-- ── Topbar ────────────────────────────────────────────────────────────── -->
<header class="topbar">
  <div class="topbar-left">
    <h1 class="page-title">{currentCategoryName}</h1>
    <span class="item-count">{filteredItems.length} items</span>
  </div>

  <div class="topbar-right">
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input
        class="search"
        type="text"
        placeholder="Search items..."
        bind:value={searchQuery}
      />
    </div>

    <div class="filter-pills">
      <button class="pill {filterStatus === 'all' ? 'active' : ''}" onclick={() => filterStatus = 'all'}>All</button>
      <button class="pill {filterStatus === 'low' ? 'active warn' : ''}" onclick={() => filterStatus = 'low'}>⚠ Low Stock</button>
      <button class="pill {filterStatus === 'ok' ? 'active' : ''}" onclick={() => filterStatus = 'ok'}>✓ In Stock</button>
    </div>

    <div class="view-toggle">
      <button class="view-btn {viewMode === 'grid' ? 'active' : ''}" onclick={() => viewMode = 'grid'}>⊞</button>
      <button class="view-btn {viewMode === 'list' ? 'active' : ''}" onclick={() => viewMode = 'list'}>☰</button>
    </div>

    <button class="btn-primary" onclick={() => showAddItem = true}>+ Add Item</button>
  </div>
</header>

<!-- ── Content ────────────────────────────────────────────────────────────── -->
<div class="content">
  {#if filteredItems.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🛒</div>
      <h2>No items found</h2>
      <p>Add your first pantry item to get started</p>
      <button class="btn-primary" onclick={() => showAddItem = true}>Add Item</button>
    </div>

  {:else if viewMode === 'grid'}
    <div class="items-grid">
      {#each filteredItems as item (item.id)}
        <div
          class="item-card {isLow(item) ? 'low' : ''}"
          onclick={() => openDetail(item)}
          style="--cat-color: {item.category?.color ?? '#999'}"
        >
          <div class="card-top">
            <div class="card-cat-dot" title="{item.category?.name ?? ''}">
              {item.category?.icon ?? '📦'}
            </div>
            <div class="card-badges">
              {#if item.subcategory}
                <span class="sub-badge">{item.subcategory.name}</span>
              {/if}
              {#if isLow(item)}
                <span class="low-badge">Low</span>
              {/if}
            </div>
          </div>

          <div class="card-name">{item.name}</div>

          <div class="card-qty">
            <span class="qty-num">{parseFloat(item.quantity)}</span>
            <span class="qty-unit">{item.unit}</span>
          </div>

          <div class="stock-bar-wrap">
            <div class="stock-bar">
              <div class="stock-fill {isLow(item) ? 'low' : 'ok'}" style="width: {stockPercent(item)}%"></div>
            </div>
            <span class="threshold-label">min: {parseFloat(item.threshold)} {item.unit}</span>
          </div>

          {#if lastPurchase(item)}
            <div class="card-last-buy">
              Last: {lastPurchase(item)!.store} · ${parseFloat(lastPurchase(item)!.pricePerUnit).toFixed(2)}/{item.unit}
            </div>
          {/if}

          <!-- stopPropagation via wrapper fn — onclick|stopPropagation is not valid Svelte 5 -->
          <div class="card-actions" onclick={stopProp}>
            <button class="qty-btn" onclick={() => quickUpdateQuantity(item, -1)}>−</button>
            <button class="qty-btn" onclick={() => quickUpdateQuantity(item, 1)}>+</button>
          </div>
        </div>
      {/each}
    </div>

  {:else}
    <!-- List mode: grouped by category > subcategory -->
    {#each Object.entries(groupedItems) as [catName, catGroup]}
      <section class="cat-section">
        <div class="cat-section-header" style="--cat-color: {catGroup.category?.color ?? '#999'}">
          <span class="cat-section-icon">{catGroup.category?.icon ?? '📦'}</span>
          <h2 class="cat-section-name">{catName}</h2>
        </div>

        {#each Object.entries(catGroup.subs) as [subName, subItems]}
          <div class="sub-section">
            {#if subName !== 'General'}
              <h3 class="sub-section-name">{subName}</h3>
            {/if}

            <div class="list-items">
              {#each subItems as item (item.id)}
                <div
                  class="list-item {isLow(item) ? 'low' : ''}"
                  onclick={() => openDetail(item)}
                >
                  <div class="li-name">
                    {item.name}
                    {#if isLow(item)}<span class="low-badge">⚠ Low</span>{/if}
                  </div>

                  <div class="li-stock">
                    <div class="stock-bar mini">
                      <div class="stock-fill {isLow(item) ? 'low' : 'ok'}" style="width: {stockPercent(item)}%"></div>
                    </div>
                  </div>

                  <div class="li-qty">
                    <strong>{parseFloat(item.quantity)}</strong>
                    <span>{item.unit}</span>
                  </div>

                  <div class="li-threshold">min {parseFloat(item.threshold)}</div>

                  {#if lastPurchase(item)}
                    <div class="li-store">{lastPurchase(item)!.store}</div>
                    <div class="li-price">${parseFloat(lastPurchase(item)!.pricePerUnit).toFixed(2)}/{item.unit}</div>
                  {:else}
                    <div class="li-store text-muted">—</div>
                    <div class="li-price text-muted">—</div>
                  {/if}

                  <div class="li-actions" onclick={stopProp}>
                    <button class="qty-btn sm" onclick={() => quickUpdateQuantity(item, -1)}>−</button>
                    <button class="qty-btn sm" onclick={() => quickUpdateQuantity(item, 1)}>+</button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </section>
    {/each}
  {/if}
</div>

<!-- ── Item Detail Panel ─────────────────────────────────────────────────── -->
{#if showItemDetail && selectedItem}
  <div class="detail-overlay" onclick={closeDetail}></div>
  <aside class="detail-panel">
    <div class="detail-header" style="--cat-color: {selectedItem.category?.color ?? '#999'}">
      <span class="detail-cat-icon">{selectedItem.category?.icon ?? '📦'}</span>
      <div class="detail-title">
        <h2>{selectedItem.name}</h2>
        <span>
          {selectedItem.category?.name ?? ''}
          {selectedItem.subcategory ? ' › ' + selectedItem.subcategory.name : ''}
        </span>
      </div>
      <button class="close-btn" onclick={closeDetail}>✕</button>
    </div>

    {#if editingItem && editingItem.id === selectedItem.id}
      <div class="detail-body">
        <div class="form-group">
          <label>Name</label>
          <input bind:value={editingItem.name} class="input" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select
              class="input"
              value={editingItem.categoryId}
              onchange={(e) => {
                editingItem!.categoryId = parseInt((e.target as HTMLSelectElement).value);
                editingItem!.subcategoryId = null; // reset subcategory when category changes
              }}
            >
              {#each categories as cat}
                <option value={cat.id}>{cat.icon} {cat.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label>Subcategory</label>
            <select class="input" bind:value={editingItem.subcategoryId}>
              <option value={null}>None</option>
              {#each editingSubcategories as sub}
                <option value={sub.id}>{sub.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Quantity</label>
            <input type="number" min="0" step="0.1" bind:value={editingItem.quantity} class="input" />
          </div>
          <div class="form-group">
            <label>Unit</label>
            <input bind:value={editingItem.unit} class="input" />
          </div>
        </div>
        <div class="form-group">
          <label>Low Stock Threshold</label>
          <input type="number" min="0" step="0.1" bind:value={editingItem.threshold} class="input" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea bind:value={editingItem.notes} class="input" rows="2"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn-ghost" onclick={() => editingItem = null}>Cancel</button>
          <button class="btn-primary" onclick={updateItem}>Save Changes</button>
        </div>
      </div>
    {:else}
      <div class="detail-body">
        <div class="detail-stock-card {isLow(selectedItem) ? 'low' : ''}">
          <div class="detail-stock-numbers">
            <div>
              <div class="big-qty">{parseFloat(selectedItem.quantity)}</div>
              <div class="big-unit">{selectedItem.unit} on hand</div>
            </div>
            <div class="detail-threshold-block">
              <span class="threshold-val">⚠ {parseFloat(selectedItem.threshold)}</span>
              <span class="threshold-label">threshold</span>
            </div>
          </div>
          <div class="stock-bar large">
            <div class="stock-fill {isLow(selectedItem) ? 'low' : 'ok'}" style="width: {stockPercent(selectedItem)}%"></div>
          </div>
          {#if isLow(selectedItem)}
            <div class="low-warning">⚠ Running low — consider restocking</div>
          {/if}
        </div>

        <div class="quick-adjust">
          <span class="qa-label">Quick adjust quantity</span>
          <div class="qa-controls">
            <button class="qty-btn" onclick={() => quickUpdateQuantity(selectedItem!, -1)}>−1</button>
            <button class="qty-btn" onclick={() => quickUpdateQuantity(selectedItem!, -0.5)}>−½</button>
            <button class="qty-btn" onclick={() => quickUpdateQuantity(selectedItem!, 0.5)}>+½</button>
            <button class="qty-btn" onclick={() => quickUpdateQuantity(selectedItem!, 1)}>+1</button>
          </div>
        </div>

        {#if selectedItem.notes}
          <p class="detail-notes">{selectedItem.notes}</p>
        {/if}

        <div class="section-header">
          <span>Purchase History</span>
          <button class="btn-small-primary" onclick={() => showPurchaseModal = true}>+ Record Purchase</button>
        </div>

        {#if selectedItem.purchases?.length > 0}
          <div class="purchase-list">
            {#each selectedItem.purchases as p}
              <div class="purchase-row">
                <div class="purchase-store">{p.store}</div>
                <div class="purchase-detail">
                  <span class="purchase-qty">{parseFloat(p.quantityBought)} {selectedItem.unit}</span>
                  <span class="purchase-price">${parseFloat(p.pricePerUnit).toFixed(2)}/{selectedItem.unit}</span>
                  <span class="purchase-total">= ${(parseFloat(p.quantityBought) * parseFloat(p.pricePerUnit)).toFixed(2)}</span>
                </div>
                <div class="purchase-date">{formatDate(p.purchasedAt)}</div>
                {#if p.notes}<div class="purchase-notes">{p.notes}</div>{/if}
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-muted">No purchases recorded yet.</p>
        {/if}

        <div class="detail-actions">
          <button class="btn-ghost" onclick={() => startEdit(selectedItem!)}>✎ Edit</button>
          <button class="btn-danger" onclick={() => deleteItem(selectedItem!.id)}>Archive</button>
        </div>
      </div>
    {/if}
  </aside>
{/if}

<!-- ── Add Item Modal ─────────────────────────────────────────────────────── -->
{#if showAddItem}
  <div class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <h2>Add Pantry Item</h2>
        <button class="close-btn" onclick={() => showAddItem = false}>✕</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Item Name *</label>
          <input class="input" placeholder="e.g. Olive Oil" bind:value={newItem.name} />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Category *</label>
            <select class="input" bind:value={newItem.categoryId}>
              <option value="">Select category…</option>
              {#each categories as cat}
                <option value={cat.id}>{cat.icon} {cat.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label>Subcategory</label>
            <select class="input" bind:value={newItem.subcategoryId} disabled={!newItem.categoryId}>
              <option value="">None</option>
              {#each subcategoriesForSelected as sub}
                <option value={sub.id}>{sub.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Unit</label>
            <input class="input" placeholder="oz, lbs, count…" bind:value={newItem.unit} />
          </div>
          <div class="form-group">
            <label>Starting Quantity</label>
            <input type="number" min="0" step="0.1" class="input" bind:value={newItem.quantity} />
          </div>
          <div class="form-group">
            <label>Low Stock Threshold</label>
            <input type="number" min="0" step="0.1" class="input" bind:value={newItem.threshold} />
          </div>
        </div>

        <div class="form-group">
          <label>Notes</label>
          <textarea class="input" rows="2" placeholder="Optional notes…" bind:value={newItem.notes}></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost" onclick={() => showAddItem = false}>Cancel</button>
        <button class="btn-primary" onclick={addItem} disabled={!newItem.name || !newItem.categoryId}>Add Item</button>
      </div>
    </div>
  </div>
{/if}

<!-- ── Record Purchase Modal ──────────────────────────────────────────────── -->
{#if showPurchaseModal && selectedItem}
  <div class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <h2>Record Purchase — {selectedItem.name}</h2>
        <button class="close-btn" onclick={() => showPurchaseModal = false}>✕</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Store *</label>
          <input class="input" placeholder="e.g. Whole Foods, Costco…" bind:value={purchaseForm.store} />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Quantity Bought *</label>
            <input type="number" min="0" step="0.1" class="input" placeholder="0" bind:value={purchaseForm.quantityBought} />
          </div>
          <div class="form-group">
            <label>Price per {selectedItem.unit} *</label>
            <input type="number" min="0" step="0.01" class="input" placeholder="0.00" bind:value={purchaseForm.pricePerUnit} />
          </div>
        </div>

        {#if purchaseForm.quantityBought && purchaseForm.pricePerUnit}
          <div class="purchase-total-preview">
            Total: <strong>${(parseFloat(purchaseForm.quantityBought) * parseFloat(purchaseForm.pricePerUnit)).toFixed(2)}</strong>
          </div>
        {/if}

        <div class="form-row">
          <div class="form-group">
            <label>Date</label>
            <input type="date" class="input" bind:value={purchaseForm.purchasedAt} />
          </div>
        </div>

        <div class="form-group">
          <label>Notes</label>
          <input class="input" placeholder="Sale, brand, etc." bind:value={purchaseForm.notes} />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost" onclick={() => showPurchaseModal = false}>Cancel</button>
        <button
          class="btn-primary"
          onclick={recordPurchase}
          disabled={!purchaseForm.store || !purchaseForm.pricePerUnit || !purchaseForm.quantityBought}
        >Record Purchase</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Topbar ──────────────────────────────────────────────────────────────── */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; background: #161820; border-bottom: 1px solid #232530;
    gap: 16px; flex-wrap: wrap; flex-shrink: 0;
  }
  .topbar-left { display: flex; align-items: baseline; gap: 10px; }
  .page-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: #f0ece0; }
  .item-count { font-size: 12px; color: #555870; }
  .topbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  .search-wrap { position: relative; display: flex; align-items: center; }
  .search-icon { position: absolute; left: 10px; font-size: 13px; pointer-events: none; }
  .search {
    background: #1e2030; border: 1px solid #2d3045; border-radius: 8px;
    color: #e8e8e8; font-family: 'DM Sans', sans-serif; font-size: 13px;
    padding: 7px 12px 7px 32px; width: 200px; outline: none; transition: border-color 0.15s;
  }
  .search:focus { border-color: #6366f1; }
  .search::placeholder { color: #555870; }

  .filter-pills { display: flex; gap: 4px; }
  .pill {
    padding: 5px 12px; border-radius: 20px; border: 1px solid #232530;
    background: none; color: #8b8fa8; font-family: 'DM Sans', sans-serif;
    font-size: 12px; cursor: pointer; transition: all 0.15s;
  }
  .pill:hover { border-color: #4a4d6a; color: #e8e8e8; }
  .pill.active { background: #232530; color: #e8e8e8; border-color: #4a4d6a; }
  .pill.active.warn { background: #2a1a0e; color: #e8a97b; border-color: #5c3310; }

  .view-toggle { display: flex; gap: 2px; }
  .view-btn {
    padding: 6px 10px; border-radius: 6px; border: 1px solid #232530;
    background: none; color: #555870; cursor: pointer; transition: all 0.15s; font-size: 14px;
  }
  .view-btn:hover { color: #e8e8e8; }
  .view-btn.active { background: #232530; color: #e8e8e8; border-color: #4a4d6a; }

  /* ── Content ─────────────────────────────────────────────────────────────── */
  .content { flex: 1; overflow-y: auto; padding: 24px; }

  /* ── Grid View ───────────────────────────────────────────────────────────── */
  .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }

  .item-card {
    background: #161820; border: 1px solid #232530; border-radius: 12px;
    padding: 16px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
  }
  .item-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 3px; background: var(--cat-color, #6366f1); opacity: 0.6;
  }
  .item-card:hover { border-color: #3d4060; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
  .item-card.low::before { background: #e67e22; opacity: 1; }
  .item-card.low { border-color: #3d2510; }

  .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .card-cat-dot { font-size: 18px; }
  .card-badges { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }

  .sub-badge { font-size: 10px; background: #1e2030; color: #8b8fa8; padding: 2px 7px; border-radius: 4px; border: 1px solid #2d3045; }
  .low-badge { font-size: 10px; background: #2a1a0e; color: #e8a97b; padding: 2px 7px; border-radius: 4px; border: 1px solid #5c3310; font-weight: 700; }

  .card-name { font-size: 14px; font-weight: 600; color: #e8e8e8; margin-bottom: 6px; line-height: 1.3; }
  .card-qty { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
  .qty-num { font-size: 22px; font-weight: 700; color: #f0ece0; line-height: 1; }
  .qty-unit { font-size: 12px; color: #8b8fa8; }

  .stock-bar-wrap { margin-bottom: 6px; }
  .stock-bar { height: 4px; background: #232530; border-radius: 2px; overflow: hidden; }
  .stock-bar.mini { height: 3px; }
  .stock-bar.large { height: 6px; border-radius: 3px; }
  .stock-fill { height: 100%; border-radius: inherit; transition: width 0.3s ease; }
  .stock-fill.ok { background: #27ae60; }
  .stock-fill.low { background: #e67e22; }
  .threshold-label { font-size: 10px; color: #555870; margin-top: 3px; display: block; }

  .card-last-buy { font-size: 11px; color: #6b6f8a; margin: 4px 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-actions { display: flex; gap: 6px; margin-top: 8px; }

  .qty-btn {
    flex: 1; padding: 5px; background: #1e2030; border: 1px solid #2d3045;
    border-radius: 6px; color: #e8e8e8; font-size: 16px; cursor: pointer;
    transition: all 0.15s; font-family: monospace; line-height: 1;
  }
  .qty-btn:hover { background: #2d3045; }
  .qty-btn.sm { padding: 3px 8px; font-size: 14px; }

  /* ── List View ───────────────────────────────────────────────────────────── */
  .cat-section { margin-bottom: 28px; }
  .cat-section-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 2px solid var(--cat-color, #6366f1);
  }
  .cat-section-icon { font-size: 20px; }
  .cat-section-name { font-family: 'DM Serif Display', serif; font-size: 18px; color: #f0ece0; }

  .sub-section { margin-bottom: 16px; }
  .sub-section-name {
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #555870; padding: 0 0 6px 8px; margin-bottom: 6px;
  }

  .list-items { display: flex; flex-direction: column; gap: 4px; }
  .list-item {
    display: grid; grid-template-columns: 1fr 100px 80px 70px 100px 80px 90px;
    align-items: center; gap: 12px; padding: 10px 14px; background: #161820;
    border: 1px solid #232530; border-radius: 8px; cursor: pointer;
    transition: all 0.15s; font-size: 13px;
  }
  .list-item:hover { border-color: #3d4060; background: #1a1d2a; }
  .list-item.low { border-color: #3d2510; }

  .li-name { font-weight: 500; color: #e8e8e8; display: flex; align-items: center; gap: 8px; }
  .li-qty { font-weight: 600; color: #f0ece0; }
  .li-qty span { font-size: 11px; font-weight: 400; color: #8b8fa8; margin-left: 3px; }
  .li-threshold { font-size: 11px; color: #555870; }
  .li-store { color: #8b8fa8; font-size: 12px; }
  .li-price { color: #8b8fa8; font-size: 12px; }
  .li-stock { padding: 0 4px; }
  .li-actions { display: flex; gap: 4px; justify-content: flex-end; }
  .text-muted { color: #3d4060 !important; }

  /* ── Empty State ─────────────────────────────────────────────────────────── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 80px 20px; color: #555870; text-align: center;
  }
  .empty-icon { font-size: 48px; }
  .empty-state h2 { font-family: 'DM Serif Display', serif; font-size: 22px; color: #8b8fa8; }
  .empty-state p { font-size: 14px; }

  /* ── Detail Panel ────────────────────────────────────────────────────────── */
  .detail-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
  .detail-panel {
    position: fixed; right: 0; top: 0; bottom: 0; width: 380px;
    background: #161820; border-left: 1px solid #232530; z-index: 50;
    display: flex; flex-direction: column; overflow: hidden; animation: slideIn 0.2s ease;
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .detail-header {
    padding: 20px; display: flex; align-items: flex-start; gap: 12px;
    background: #1a1d2a; border-bottom: 2px solid var(--cat-color, #6366f1);
  }
  .detail-cat-icon { font-size: 28px; flex-shrink: 0; margin-top: 2px; }
  .detail-title { flex: 1; min-width: 0; }
  .detail-title h2 { font-family: 'DM Serif Display', serif; font-size: 20px; color: #f0ece0; line-height: 1.2; }
  .detail-title span { font-size: 12px; color: #8b8fa8; }

  .close-btn {
    background: none; border: none; color: #555870; font-size: 16px;
    cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.15s;
  }
  .close-btn:hover { color: #e8e8e8; background: #232530; }

  .detail-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }

  .detail-stock-card { background: #1a1d2a; border: 1px solid #2d3045; border-radius: 10px; padding: 16px; }
  .detail-stock-card.low { border-color: #5c3310; }
  .detail-stock-numbers { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
  .big-qty { font-size: 40px; font-weight: 800; color: #f0ece0; line-height: 1; }
  .big-unit { font-size: 13px; color: #8b8fa8; }
  .detail-threshold-block { text-align: right; }
  .threshold-val { display: block; font-size: 16px; font-weight: 600; color: #e8a97b; }
  .threshold-label { font-size: 11px; color: #8b8fa8; }
  .low-warning { font-size: 12px; color: #e8a97b; margin-top: 8px; font-weight: 600; }

  .quick-adjust { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .qa-label { font-size: 12px; color: #8b8fa8; white-space: nowrap; }
  .qa-controls { display: flex; gap: 4px; }

  .detail-notes {
    font-size: 13px; color: #8b8fa8; background: #1a1d2a;
    padding: 10px 12px; border-radius: 8px; border-left: 3px solid #2d3045;
  }

  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11px; font-weight: 700; color: #555870; text-transform: uppercase;
    letter-spacing: 1px; padding: 0 4px;
  }

  .purchase-list { display: flex; flex-direction: column; gap: 8px; }
  .purchase-row { background: #1a1d2a; border: 1px solid #2d3045; border-radius: 8px; padding: 10px 12px; }
  .purchase-store { font-size: 13px; font-weight: 600; color: #e8e8e8; margin-bottom: 4px; }
  .purchase-detail { display: flex; gap: 10px; font-size: 12px; color: #8b8fa8; flex-wrap: wrap; }
  .purchase-qty { color: #e8e8e8; }
  .purchase-price { color: #27ae60; font-weight: 600; }
  .purchase-total { color: #f0ece0; font-weight: 700; }
  .purchase-date { font-size: 11px; color: #555870; margin-top: 4px; }
  .purchase-notes { font-size: 11px; color: #6b6f8a; margin-top: 2px; }
  .detail-actions { display: flex; gap: 8px; padding-top: 4px; }

  /* ── Modals ──────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: #161820; border: 1px solid #2d3045; border-radius: 14px;
    width: 100%; max-width: 520px; max-height: 85vh; overflow: hidden;
    display: flex; flex-direction: column; animation: modalIn 0.2s ease;
  }
  @keyframes modalIn {
    from { transform: scale(0.96) translateY(8px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid #232530;
  }
  .modal-header h2 { font-family: 'DM Serif Display', serif; font-size: 18px; color: #f0ece0; }
  .modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid #232530; display: flex; justify-content: flex-end; gap: 8px; }

  /* ── Forms ───────────────────────────────────────────────────────────────── */
  .form-group { display: flex; flex-direction: column; gap: 5px; }
  .form-row { display: flex; gap: 12px; }
  .form-row .form-group { flex: 1; }
  label { font-size: 12px; font-weight: 600; color: #8b8fa8; text-transform: uppercase; letter-spacing: 0.5px; }

  .input {
    background: #1a1d2a; border: 1px solid #2d3045; border-radius: 8px;
    color: #e8e8e8; font-family: 'DM Sans', sans-serif; font-size: 13px;
    padding: 9px 12px; outline: none; transition: border-color 0.15s; width: 100%;
  }
  .input:focus { border-color: #6366f1; }
  .input::placeholder { color: #3d4060; }
  textarea.input { resize: vertical; min-height: 60px; }
  select.input { cursor: pointer; }
  select.input:disabled { opacity: 0.5; cursor: not-allowed; }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */
  .btn-primary {
    background: #6366f1; color: #fff; border: none; border-radius: 8px;
    padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px;
    font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .btn-primary:hover { background: #4f52d8; }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

  .btn-ghost {
    background: none; border: 1px solid #2d3045; color: #8b8fa8; border-radius: 8px;
    padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px;
    cursor: pointer; transition: all 0.15s;
  }
  .btn-ghost:hover { border-color: #4a4d6a; color: #e8e8e8; }

  .btn-danger {
    background: none; border: 1px solid #5c1a1a; color: #e87b7b; border-radius: 8px;
    padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px;
    cursor: pointer; transition: all 0.15s; margin-left: auto;
  }
  .btn-danger:hover { background: #2a0e0e; }

  .btn-small-primary {
    background: #6366f1; color: #fff; border: none; border-radius: 6px;
    padding: 4px 10px; font-family: 'DM Sans', sans-serif; font-size: 11px;
    font-weight: 600; cursor: pointer; transition: all 0.15s;
  }
  .btn-small-primary:hover { background: #4f52d8; }

  .purchase-total-preview {
    font-size: 13px; color: #27ae60; padding: 8px 12px;
    background: #0f2a1a; border: 1px solid #1a4a2a; border-radius: 8px;
  }

  /* ─────────────────────────────────────────────
   MOBILE RESPONSIVENESS
   Breakpoints:
   tablet <= 900px
   phone  <= 640px
───────────────────────────────────────────── */

  /* ---------- Tablet ---------- */
  @media (max-width: 900px) {

    .content {
      padding: 16px;
    }

    /* stack header nicely */
    .topbar {
      align-items: stretch;
    }

    .topbar-left {
      width: 100%;
      justify-content: space-between;
    }

    .topbar-right {
      width: 100%;
      justify-content: space-between;
      gap: 8px;
    }

    .search {
      width: 160px;
    }

    /* tighter grid */
    .items-grid {
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    }

    /* list layout compress */
    .list-item {
      grid-template-columns:
        1fr
        80px
        70px
        60px
        80px
        70px;
      font-size: 12px;
    }

    .li-actions {
      justify-content: flex-end;
    }

    /* detail panel slightly smaller */
    .detail-panel {
      width: 320px;
    }
  }


  /* ---------- Phone ---------- */
  @media (max-width: 640px) {

    /* ===== HEADER ===== */

    .topbar {
      flex-direction: column;
      align-items: stretch;
      padding: 14px;
      gap: 12px;
    }

    .topbar-left {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .page-title {
      font-size: 20px;
    }

    .topbar-right {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .search-wrap {
      width: 100%;
    }

    .search {
      width: 100%;
    }

    .filter-pills {
      flex-wrap: wrap;
      justify-content: space-between;
    }

    .view-toggle {
      width: 100%;
    }

    .view-btn {
      flex: 1;
    }

    .btn-primary {
      width: 100%;
    }

    /* ===== GRID ===== */

    .items-grid {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .item-card {
      padding: 12px;
    }

    .qty-num {
      font-size: 20px;
    }

    /* ===== LIST MODE → CARD STYLE ===== */

    .list-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
    }

    .li-stock,
    .li-threshold,
    .li-store,
    .li-price {
      width: 100%;
    }

    .li-actions {
      width: 100%;
      justify-content: space-between;
    }

    /* ===== DETAIL PANEL ===== */

    .detail-panel {
      width: 100%;
    }

    .detail-header {
      padding: 16px;
    }

    .detail-body {
      padding: 16px;
    }

    .big-qty {
      font-size: 32px;
    }

    .quick-adjust {
      flex-direction: column;
      align-items: stretch;
    }

    .qa-controls {
      justify-content: space-between;
    }

    /* ===== MODAL ===== */

    .modal {
      max-width: none;
      border-radius: 12px;
    }

    .modal-backdrop {
      padding: 12px;
      align-items: flex-end;
    }
  }
</style>