<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setContext } from 'svelte';

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

  interface Location {
    id: number;
    name: string;
    icon: string;
    createdAt: string;
  }

  interface Item {
    id: number;
    name: string;
    categoryId: number;
    locationId: number | null;
    quantity: string;
    threshold: string;
    isActive: boolean;
  }

  interface LayoutData {
    items: Item[];
    categories: Category[];
    locations: Location[];
    user?: { userId: number; username: string };
  }

  let { data = { items: [], categories: [], locations: [] }, children }: { data: LayoutData; children: Snippet } = $props();

	let mobileMenuOpen = $state(false);

  let filterCategory = $state<string>('all');
  let filterLocation = $state<string>('all');

  let lowStockCount = $derived(
    (data.items ?? []).filter((i) => parseFloat(i.quantity) <= parseFloat(i.threshold)).length
  );

  setContext('layout', {
    get filterCategory() { return filterCategory; },
    setFilterCategory(id: string) { filterCategory = id; },
    get filterLocation() { return filterLocation; },
    setFilterLocation(id: string) { filterLocation = id; },
  });

  const CATEGORY_COLORS: string[] = [
    '#e67e22', '#27ae60', '#2980b9', '#8e44ad', '#e74c3c',
    '#1abc9c', '#f39c12', '#d35400', '#c0392b', '#16a085'
  ];
  const CATEGORY_ICONS: string[] = [
    '📦', '🥑', '🥩', '🥛', '🧈', '🥦', '🍞', '🧂',
    '🫙', '🧴', '🧹', '🐾', '💊', '🍷', '☕', '🌿', '🧊', '🍳'
  ];

  const LOCATION_ICONS: string[] = [
    '📍', '🧊', '❄️', '📦', '🗄️', '🧺', '🛒', '🍽️', '🧴', '🚪', '🧯', '💊'
  ];

  // Add category modal
  let showAddCategory = $state(false);
  let newCategory = $state({ name: '', color: '#e67e22', icon: '📦' });

  async function addCategory(): Promise<void> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory)
    });
    if (res.ok) {
      const cat: Category = await res.json();
      data.categories = [...data.categories, { ...cat, subcategories: [] }];
      data = data;
      showAddCategory = false;
      newCategory = { name: '', color: '#e67e22', icon: '📦' };
    }
  }

  // Manage category modal
  let managingCategory = $state<Category | null>(null);
  let newSubcategoryName = $state<string>('');
  let subcategoryError = $state<string>('');

  function openManage(cat: Category, e: MouseEvent): void {
    e.stopPropagation();
    managingCategory = { ...cat, subcategories: [...cat.subcategories] };
    newSubcategoryName = '';
    subcategoryError = '';
  }

  function closeManage(): void {
    managingCategory = null;
    newSubcategoryName = '';
    subcategoryError = '';
  }

  async function addSubcategory(): Promise<void> {
    if (!managingCategory || !newSubcategoryName.trim()) return;
    subcategoryError = '';
    const res = await fetch(`/api/categories/${managingCategory.id}/subcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubcategoryName.trim() })
    });
    if (res.ok) {
      const sub: Subcategory = await res.json();
      managingCategory.subcategories = [...managingCategory.subcategories, sub];
      data.categories = data.categories.map((c) =>
        c.id === managingCategory!.id
          ? { ...c, subcategories: [...c.subcategories, sub] }
          : c
      );
      newSubcategoryName = '';
    } else {
      subcategoryError = 'Failed to add subcategory.';
    }
  }

  async function deleteSubcategory(subId: number): Promise<void> {
    if (!managingCategory) return;
    const res = await fetch(`/api/subcategories/${subId}`, { method: 'DELETE' });
    if (res.ok) {
      managingCategory.subcategories = managingCategory.subcategories.filter((s) => s.id !== subId);
      data.categories = data.categories.map((c) =>
        c.id === managingCategory!.id
          ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) }
          : c
      );
    }
  }

  async function deleteCategory(catId: number): Promise<void> {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });
    if (res.ok) {
      data.categories = data.categories.filter((c) => c.id !== catId);
      if (filterCategory === String(catId)) filterCategory = 'all';
      closeManage();
    }
  }

  function handleSubcategoryKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') addSubcategory();
  }

  // Add location modal
  let showAddLocation = $state(false);
  let newLocation = $state({ name: '', icon: '📍' });

  async function addLocation(): Promise<void> {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLocation)
    });
    if (res.ok) {
      const loc: Location = await res.json();
      data.locations = [...data.locations, loc];
      data = data;
      showAddLocation = false;
      newLocation = { name: '', icon: '📍' };
    }
  }

  // Manage location modal
  let managingLocation = $state<Location | null>(null);

  function openManageLocation(loc: Location, e: MouseEvent): void {
    e.stopPropagation();
    managingLocation = { ...loc };
  }

  function closeManageLocation(): void {
    managingLocation = null;
  }

  async function updateLocation(): Promise<void> {
    if (!managingLocation) return;
    const res = await fetch(`/api/locations/${managingLocation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: managingLocation.name, icon: managingLocation.icon })
    });
    if (res.ok) {
      const updated: Location = await res.json();
      data.locations = data.locations.map((l) => (l.id === updated.id ? updated : l));
      closeManageLocation();
    }
  }

  async function deleteLocation(locId: number): Promise<void> {
    if (!confirm('Delete this location? Items in it will keep their other details.')) return;
    const res = await fetch(`/api/locations/${locId}`, { method: 'DELETE' });
    if (res.ok) {
      data.locations = data.locations.filter((l) => l.id !== locId);
      if (filterLocation === String(locId)) filterLocation = 'all';
      closeManageLocation();
    }
  }
</script>

<svelte:head>
  <title>Pantry — Home Inventory</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="app">
  <aside class="sidebar {mobileMenuOpen ? 'open' : ''}">
    <div class="brand">
      <span class="brand-icon">🏠</span>
      <span class="brand-name">Pantry</span>
			<button class="mobile-menu-btn" onclick={() => mobileMenuOpen = false}>
				☰
			</button>
    </div>

    <nav class="nav">
      <button class="nav-item active">
        <span class="nav-icon">📋</span>
        Inventory
      </button>
      <button class="nav-item disabled" title="Coming soon">
        <span class="nav-icon">🛒</span>
        Grocery List
        <span class="badge soon">Soon</span>
      </button>
      <button class="nav-item disabled" title="Coming soon">
        <span class="nav-icon">🍳</span>
        Recipes
        <span class="badge soon">Soon</span>
      </button>
    </nav>

    <div class="sidebar-categories">
      <div class="section-header">
        <span>Categories</span>
        <button class="icon-btn" onclick={() => showAddCategory = true} title="Add category">+</button>
      </div>

      <button
        class="cat-filter {filterCategory === 'all' ? 'active' : ''}"
        onclick={() => filterCategory = 'all'}
      >
        <span>🗂</span> All Items
        <span class="cat-count">{(data.items ?? []).length}</span>
      </button>

      {#each (data.categories ?? []) as cat}
        <div class="cat-row">
          <button
            class="cat-filter {filterCategory === String(cat.id) ? 'active' : ''}"
            onclick={() => filterCategory = String(cat.id)}
            style="--cat-color: {cat.color}"
          >
            <span>{cat.icon}</span>
            {cat.name}
            <span class="cat-count">{(data.items ?? []).filter((i) => i.categoryId === cat.id).length}</span>
          </button>
          <button
            class="manage-btn"
            onclick={(e) => openManage(cat, e)}
            title="Manage {cat.name}"
          >⚙</button>
        </div>
      {/each}
    </div>

    <div class="sidebar-locations">
      <div class="section-header">
        <span>Locations</span>
        <button class="icon-btn" onclick={() => showAddLocation = true} title="Add location">+</button>
      </div>

      <button
        class="cat-filter {filterLocation === 'all' ? 'active' : ''}"
        onclick={() => filterLocation = 'all'}
      >
        <span>📍</span> All Locations
        <span class="cat-count">{(data.items ?? []).length}</span>
      </button>

      {#each (data.locations ?? []) as loc}
        <div class="cat-row">
          <button
            class="cat-filter {filterLocation === String(loc.id) ? 'active' : ''}"
            onclick={() => filterLocation = String(loc.id)}
          >
            <span>{loc.icon}</span>
            {loc.name}
            <span class="cat-count">{(data.items ?? []).filter((i) => i.locationId === loc.id).length}</span>
          </button>
          <button
            class="manage-btn"
            onclick={(e) => openManageLocation(loc, e)}
            title="Manage {loc.name}"
          >⚙</button>
        </div>
      {/each}
    </div>

    {#if lowStockCount > 0}
      <div class="low-stock-alert">
        <span class="alert-icon">⚠️</span>
        <div>
          <strong>{lowStockCount} item{lowStockCount !== 1 ? 's' : ''} low</strong>
          <p>Running low on supplies</p>
        </div>
      </div>
    {/if}

    {#if data.user}
      <div class="user-footer">
        <div class="user-info">
          <span class="user-avatar">{data.user.username[0].toUpperCase()}</span>
          <span class="user-name">{data.user.username}</span>
        </div>
        <form method="POST" action="/api/logout">
          <button class="logout-btn" type="submit" title="Sign out">↩</button>
        </form>
      </div>
    {/if}
  </aside>

	{#if mobileMenuOpen}
		<div class="sidebar-backdrop" onclick={() => mobileMenuOpen = false}></div>
	{/if}

  <div class="main-wrapper">
	<div class="mobile-header">
		<button
			class="menu-btn"
			onclick={() => mobileMenuOpen = true}
			aria-label="Open menu"
		>
			☰
		</button>

		<div class="mobile-title">
			🏠 Pantry
		</div>
	</div>
    {@render children()}
  </div>
</div>

<!-- Add Category Modal -->
{#if showAddCategory}
  <div class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <h2>Add Category</h2>
        <button class="close-btn" onclick={() => showAddCategory = false}>✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Category Name *</label>
          <input class="input" placeholder="e.g. Food, Cleaning…" bind:value={newCategory.name} />
        </div>
        <div class="form-group">
          <label>Icon</label>
          <div class="icon-picker">
            {#each CATEGORY_ICONS as icon}
              <button
                class="icon-opt {newCategory.icon === icon ? 'selected' : ''}"
                onclick={() => newCategory.icon = icon}
              >{icon}</button>
            {/each}
          </div>
        </div>
        <div class="form-group">
          <label>Color</label>
          <div class="color-picker">
            {#each CATEGORY_COLORS as color}
              <button
                class="color-opt {newCategory.color === color ? 'selected' : ''}"
                style="background: {color}"
                onclick={() => newCategory.color = color}
              ></button>
            {/each}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick={() => showAddCategory = false}>Cancel</button>
        <button class="btn-primary" onclick={addCategory} disabled={!newCategory.name}>Add Category</button>
      </div>
    </div>
  </div>
{/if}

<!-- Manage Category Modal -->
{#if managingCategory}
  <div class="modal-backdrop">
    <div class="modal manage-modal">
      <div class="modal-header" style="--cat-color: {managingCategory.color}">
        <div class="manage-header-title">
          <span class="manage-cat-icon">{managingCategory.icon}</span>
          <h2>{managingCategory.name}</h2>
        </div>
        <button class="close-btn" onclick={closeManage}>✕</button>
      </div>

      <div class="modal-body">
        <!-- Subcategories section -->
        <div class="manage-section">
          <div class="manage-section-label">Subcategories</div>

          {#if managingCategory.subcategories.length > 0}
            <ul class="sub-list">
              {#each managingCategory.subcategories as sub}
                <li class="sub-item">
                  <span class="sub-item-name">{sub.name}</span>
                  <button
                    class="sub-delete-btn"
                    onclick={() => deleteSubcategory(sub.id)}
                    title="Remove subcategory"
                  >✕</button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="empty-subs">No subcategories yet.</p>
          {/if}

          <div class="add-sub-row">
            <input
              class="input"
              placeholder="New subcategory name…"
              bind:value={newSubcategoryName}
              onkeydown={handleSubcategoryKeydown}
            />
            <button
              class="btn-primary"
              onclick={addSubcategory}
              disabled={!newSubcategoryName.trim()}
            >Add</button>
          </div>
          {#if subcategoryError}
            <p class="error-msg">{subcategoryError}</p>
          {/if}
        </div>

        <!-- Danger zone -->
        <div class="manage-section danger-zone">
          <div class="manage-section-label">Danger Zone</div>
          <p class="danger-desc">Deleting a category will remove it permanently. Items in this category will need to be reassigned.</p>
          <button class="btn-danger-full" onclick={() => deleteCategory(managingCategory!.id)}>
            Delete Category
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost" onclick={closeManage}>Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- Add Location Modal -->
{#if showAddLocation}
  <div class="modal-backdrop">
    <div class="modal manage-modal">
      <div class="modal-header">
        <h2>Add Location</h2>
        <button class="close-btn" onclick={() => showAddLocation = false}>✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Location Name *</label>
          <input class="input" placeholder="e.g. Pantry, Upstairs Fridge…" bind:value={newLocation.name} />
        </div>
        <div class="form-group">
          <label>Icon</label>
          <div class="icon-picker">
            {#each LOCATION_ICONS as icon}
              <button
                class="icon-opt {newLocation.icon === icon ? 'selected' : ''}"
                onclick={() => newLocation.icon = icon}
              >{icon}</button>
            {/each}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick={() => showAddLocation = false}>Cancel</button>
        <button class="btn-primary" onclick={addLocation} disabled={!newLocation.name}>Add Location</button>
      </div>
    </div>
  </div>
{/if}

<!-- Manage Location Modal -->
{#if managingLocation}
  <div class="modal-backdrop">
    <div class="modal manage-modal">
      <div class="modal-header">
        <div class="manage-header-title">
          <span class="manage-cat-icon">{managingLocation.icon}</span>
          <h2>Edit Location</h2>
        </div>
        <button class="close-btn" onclick={closeManageLocation}>✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Name</label>
          <input class="input" bind:value={managingLocation.name} />
        </div>
        <div class="form-group">
          <label>Icon</label>
          <div class="icon-picker">
            {#each LOCATION_ICONS as icon}
              <button
                class="icon-opt {managingLocation.icon === icon ? 'selected' : ''}"
                onclick={() => managingLocation!.icon = icon}
              >{icon}</button>
            {/each}
          </div>
        </div>
        <div class="manage-section danger-zone">
          <div class="manage-section-label">Danger Zone</div>
          <p class="danger-desc">Deleting a location will unassign it from any items.</p>
          <button class="btn-danger-full" onclick={() => deleteLocation(managingLocation!.id)}>
            Delete Location
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick={closeManageLocation}>Cancel</button>
        <button class="btn-primary" onclick={updateLocation} disabled={!managingLocation.name.trim()}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    font-family: 'DM Sans', sans-serif;
    background: #0f1117;
    color: #e8e8e8;
    height: 100vh;
    overflow: hidden;
  }

  .app { display: flex; height: 100vh; overflow: hidden; }
  .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

  .sidebar {
    width: 240px; flex-shrink: 0; background: #161820;
    border-right: 1px solid #232530; display: flex; flex-direction: column; overflow-y: auto;
  }

  .brand { display: flex; align-items: center; gap: 10px; padding: 20px 20px 16px; border-bottom: 1px solid #232530; }
  .brand-icon { font-size: 22px; }
  .brand-name { font-family: 'DM Serif Display', serif; font-size: 20px; color: #f0ece0; letter-spacing: 0.5px; }

  .nav { padding: 12px 12px 0; }
  .nav-item {
    display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px;
    border-radius: 8px; border: none; background: none; color: #8b8fa8;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    cursor: pointer; text-align: left; transition: all 0.15s; position: relative;
  }
  .nav-item:hover:not(.disabled) { background: #1e2030; color: #e8e8e8; }
  .nav-item.active { background: #1e2030; color: #f0ece0; }
  .nav-item.disabled { opacity: 0.45; cursor: default; }
  .nav-icon { font-size: 15px; }

  .badge.soon {
    margin-left: auto; font-size: 9px; font-weight: 700; background: #2a2d3e;
    color: #6366f1; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;
  }

  .sidebar-categories { padding: 16px 12px 4px; }
  .sidebar-locations { padding: 4px 12px 16px; }

  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11px; font-weight: 700; color: #555870; text-transform: uppercase;
    letter-spacing: 1px; padding: 0 4px; margin-bottom: 8px;
  }

  .icon-btn {
    background: none; border: none; color: #555870; cursor: pointer;
    font-size: 16px; line-height: 1; padding: 2px 4px; border-radius: 4px; transition: all 0.15s;
  }
  .icon-btn:hover { color: #f0ece0; background: #232530; }

  /* Category row — wraps filter button + manage gear */
  .cat-row {
    display: flex; align-items: center; gap: 2px; margin-bottom: 2px;
  }
  .cat-row .cat-filter { margin-bottom: 0; flex: 1; min-width: 0; }

  .manage-btn {
    flex-shrink: 0; background: none; border: none; color: #3d4060;
    font-size: 13px; cursor: pointer; padding: 5px 6px; border-radius: 6px;
    transition: all 0.15s; line-height: 1; opacity: 0;
  }
  .cat-row:hover .manage-btn { opacity: 1; }
  .manage-btn:hover { color: #8b8fa8; background: #1e2030; }

  .cat-filter {
    display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 10px;
    border-radius: 7px; border: none; background: none; color: #8b8fa8;
    font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer;
    text-align: left; transition: all 0.15s;
  }
  .cat-filter:hover { background: #1e2030; color: #e8e8e8; }
  .cat-filter.active { background: #1e2030; color: var(--cat-color, #f0ece0); font-weight: 600; }
  .cat-count { margin-left: auto; font-size: 11px; font-weight: 700; background: #232530; padding: 1px 6px; border-radius: 10px; color: #555870; }

  .low-stock-alert {
    margin: 12px; padding: 12px; background: #2a1a0e; border: 1px solid #5c3310;
    border-radius: 10px; display: flex; gap: 10px; align-items: flex-start;
  }
  .alert-icon { font-size: 18px; }
  .low-stock-alert strong { font-size: 13px; color: #e8a97b; display: block; }
  .low-stock-alert p { font-size: 11px; color: #8b6548; }

  /* Modals */
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
  .manage-modal { max-width: 440px; }

  @keyframes modalIn {
    from { transform: scale(0.96) translateY(8px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid #232530;
  }
  .modal-header h2 { font-family: 'DM Serif Display', serif; font-size: 18px; color: #f0ece0; }

  .manage-header-title {
    display: flex; align-items: center; gap: 10px;
  }
  .manage-cat-icon { font-size: 22px; }

  .close-btn {
    background: none; border: none; color: #555870; font-size: 16px;
    cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.15s;
  }
  .close-btn:hover { color: #e8e8e8; background: #232530; }

  .modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid #232530; display: flex; justify-content: flex-end; gap: 8px; }

  /* Manage modal sections */
  .manage-section { display: flex; flex-direction: column; gap: 10px; }
  .manage-section-label {
    font-size: 11px; font-weight: 700; color: #555870;
    text-transform: uppercase; letter-spacing: 1px;
  }

  .sub-list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .sub-item {
    display: flex; align-items: center; justify-content: space-between;
    background: #1a1d2a; border: 1px solid #2d3045; border-radius: 8px;
    padding: 8px 12px;
  }
  .sub-item-name { font-size: 13px; color: #e8e8e8; }
  .sub-delete-btn {
    background: none; border: none; color: #555870; font-size: 12px;
    cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: all 0.15s;
    line-height: 1;
  }
  .sub-delete-btn:hover { color: #e87b7b; background: #2a0e0e; }

  .empty-subs { font-size: 13px; color: #555870; font-style: italic; }

  .add-sub-row { display: flex; gap: 8px; align-items: center; }
  .add-sub-row .input { flex: 1; }

  .error-msg { font-size: 12px; color: #e87b7b; }

  .danger-zone { padding-top: 16px; border-top: 1px solid #2d1515; }
  .danger-desc { font-size: 12px; color: #6b6f8a; line-height: 1.5; }
  .btn-danger-full {
    background: none; border: 1px solid #5c1a1a; color: #e87b7b; border-radius: 8px;
    padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px;
    cursor: pointer; transition: all 0.15s; width: 100%; text-align: center;
  }
  .btn-danger-full:hover { background: #2a0e0e; }

  /* Forms */
  .form-group { display: flex; flex-direction: column; gap: 5px; }
  label { font-size: 12px; font-weight: 600; color: #8b8fa8; text-transform: uppercase; letter-spacing: 0.5px; }

  .input {
    background: #1a1d2a; border: 1px solid #2d3045; border-radius: 8px;
    color: #e8e8e8; font-family: 'DM Sans', sans-serif; font-size: 13px;
    padding: 9px 12px; outline: none; transition: border-color 0.15s; width: 100%;
  }
  .input:focus { border-color: #6366f1; }
  .input::placeholder { color: #3d4060; }

  .icon-picker { display: flex; flex-wrap: wrap; gap: 6px; }
  .icon-opt {
    background: #1a1d2a; border: 1px solid #2d3045; border-radius: 6px;
    padding: 6px 8px; font-size: 18px; cursor: pointer; transition: all 0.15s; line-height: 1;
  }
  .icon-opt:hover { border-color: #6366f1; }
  .icon-opt.selected { border-color: #6366f1; background: #1e204a; }

  .color-picker { display: flex; flex-wrap: wrap; gap: 6px; }
  .color-opt {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid transparent; cursor: pointer; transition: all 0.15s;
  }
  .color-opt:hover { transform: scale(1.15); }
  .color-opt.selected { border-color: #fff; transform: scale(1.1); }

  .user-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-top: 1px solid #232530; margin-top: auto; flex-shrink: 0;
  }
  .user-info { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .user-avatar {
    width: 28px; height: 28px; border-radius: 50%; background: #6366f1;
    color: #fff; font-size: 12px; font-weight: 700; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
  }
  .user-name { font-size: 13px; color: #8b8fa8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .logout-btn {
    background: none; border: none; color: #555870; font-size: 16px;
    cursor: pointer; padding: 4px 6px; border-radius: 6px; transition: all 0.15s; line-height: 1;
  }
  .logout-btn:hover { color: #e8e8e8; background: #232530; }

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

	/* =====================================================
   MOBILE RESPONSIVE LAYOUT
  ===================================================== */

	/* Hide menu button on desktop */
	.mobile-menu-btn {
		display: none;
		margin-left: auto;
		background: none;
		border: none;
		color: #8b8fa8;
		font-size: 20px;
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 6px;
	}

	.mobile-menu-btn:hover {
		background: #232530;
		color: #e8e8e8;
	}

	/* Backdrop */
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.5);
		z-index: 40;
		animation: fadeIn 0.15s ease;
	}

	/* ---------- Tablet ---------- */
	@media (max-width: 900px) {

		.sidebar {
			width: 220px;
		}
	}

	/* ---------- Phone ---------- */
	@media (max-width: 640px) {

		:global(body) {
			overflow: auto;
		}

		.app {
			height: 100dvh;
		}

		/* SHOW menu button */
		.mobile-menu-btn {
			display: block;
		}

		/* ===== SIDEBAR → DRAWER ===== */

		.sidebar {
			position: fixed;
			inset: 0 auto 0 0;
			height: 100%;
			z-index: 50;

			transform: translateX(-100%);
			transition: transform 0.25s ease;

			box-shadow: 8px 0 24px rgba(0,0,0,0.45);
		}

		.sidebar.open {
			transform: translateX(0);
		}

		/* ===== MAIN CONTENT ===== */

		.main-wrapper {
			width: 100%;
			min-width: 0;
		}

		/* prevent layout squeeze */
		.brand {
			padding: 16px;
		}

		.sidebar-categories {
			padding-bottom: 80px;
		}

		/* always show manage gear on touch devices */
		.manage-btn {
			opacity: 1;
		}

		/* ===== MODALS → MOBILE SHEETS ===== */

		.modal-backdrop {
			align-items: flex-end;
			padding: 12px;
		}

		.modal {
			max-width: none;
			width: 100%;
			border-radius: 14px 14px 0 0;
			max-height: 90dvh;
			animation: sheetIn 0.25s ease;
		}

		@keyframes sheetIn {
			from {
				transform: translateY(40px);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}

		.modal-header {
			padding: 16px;
		}

		.modal-body {
			padding: 16px;
		}

		.modal-footer {
			padding: 14px 16px;
		}

		/* buttons easier to tap */
		.btn-primary,
		.btn-ghost {
			min-height: 42px;
		}

		/* safer scrolling */
		.sidebar,
		.modal-body {
			-webkit-overflow-scrolling: touch;
		}
	}

	/* =========================
   MOBILE LAYOUT
	========================= */

	.mobile-header {
		display: none;
		align-items: center;
		gap: 12px;
		height: 56px;
		padding: 0 16px;
		background: #161820;
		border-bottom: 1px solid #232530;
		flex-shrink: 0;
	}

	.menu-btn {
		background: none;
		border: none;
		color: #e8e8e8;
		font-size: 22px;
		cursor: pointer;
		padding: 6px 8px;
		border-radius: 6px;
	}

	.menu-btn:hover {
		background: #1e2030;
	}

	.mobile-title {
		font-family: 'DM Serif Display', serif;
		font-size: 18px;
		color: #f0ece0;
	}

	/* overlay */
	.mobile-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.55);
		z-index: 40;
	}

	/* ===== responsive breakpoint ===== */
	@media (max-width: 900px) {

		.mobile-header {
			display: flex;
		}

		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			bottom: 0;
			z-index: 50;
			transform: translateX(-100%);
			transition: transform 0.25s ease;
			box-shadow: 0 0 30px rgba(0,0,0,0.4);
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.main-wrapper {
			width: 100%;
		}
	}

  :global(::-webkit-scrollbar) { width: 5px; height: 5px; }
  :global(::-webkit-scrollbar-track) { background: transparent; }
  :global(::-webkit-scrollbar-thumb) { background: #2d3045; border-radius: 3px; }
  :global(::-webkit-scrollbar-thumb:hover) { background: #4a4d6a; }
</style>