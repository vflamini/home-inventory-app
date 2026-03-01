<script lang="ts">
  import { enhance } from '$app/forms';

  interface ActionData {
    error?: string;
    username?: string;
  }

  let { form }: { form: ActionData | null } = $props();

  let loading = $state(false);
</script>

<svelte:head>
  <title>Register — Pantry</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="page">
  <div class="card">
    <div class="brand">
      <span class="brand-icon">🏠</span>
      <span class="brand-name">Pantry</span>
    </div>

    <h1 class="heading">Create account</h1>
    <p class="subheading">Set up your pantry</p>

    {#if form?.error}
      <div class="error-banner">{form.error}</div>
    {/if}

    <form method="POST" use:enhance={() => {
      loading = true;
      return async ({ update }) => {
        loading = false;
        await update();
      };
    }}>
      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          class="input"
          placeholder="at least 3 characters"
          value={form?.username ?? ''}
          autocomplete="username"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          class="input"
          placeholder="at least 8 characters"
          autocomplete="new-password"
          required
        />
      </div>

      <div class="form-group">
        <label for="confirm">Confirm Password</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          class="input"
          placeholder="repeat your password"
          autocomplete="new-password"
          required
        />
      </div>

      <button class="btn-submit" type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>

    <p class="footer-link">
      Already have an account? <a href="/login">Sign in</a>
    </p>
  </div>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    font-family: 'DM Sans', sans-serif;
    background: #0f1117;
    color: #e8e8e8;
    height: 100vh;
  }

  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .card {
    background: #161820;
    border: 1px solid #232530;
    border-radius: 16px;
    padding: 40px;
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .brand-icon { font-size: 24px; }
  .brand-name { font-family: 'DM Serif Display', serif; font-size: 22px; color: #f0ece0; }

  .heading { font-family: 'DM Serif Display', serif; font-size: 26px; color: #f0ece0; line-height: 1.2; margin-bottom: -8px; }
  .subheading { font-size: 14px; color: #6b6f8a; }

  .error-banner {
    background: #2a0e0e;
    border: 1px solid #5c1a1a;
    color: #e87b7b;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
  }

  form { display: flex; flex-direction: column; gap: 16px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  label { font-size: 12px; font-weight: 600; color: #8b8fa8; text-transform: uppercase; letter-spacing: 0.5px; }

  .input {
    background: #1a1d2a;
    border: 1px solid #2d3045;
    border-radius: 8px;
    color: #e8e8e8;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
  }
  .input:focus { border-color: #6366f1; }
  .input::placeholder { color: #3d4060; }

  .btn-submit {
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 11px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    margin-top: 4px;
  }
  .btn-submit:hover:not(:disabled) { background: #4f52d8; }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .footer-link { font-size: 13px; color: #6b6f8a; text-align: center; }
  .footer-link a { color: #6366f1; text-decoration: none; }
  .footer-link a:hover { text-decoration: underline; }
</style>