<script>
  import App from './App.svelte';
  import AppAB from './AppAB.svelte';
  import AppC from './AppC.svelte';
  import AppD from './AppD.svelte';
  import AppAll from './AppAll.svelte';

  let route = $state(getRoute());

  function getRoute() {
    const hash = window.location.hash.replace('#', '') || '/';
    return hash;
  }

  $effect(() => {
    function onHashChange() {
      route = getRoute();
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });
</script>

{#if route === '/ab'}
  <AppAB />
{:else if route === '/c'}
  <AppC />
{:else if route === '/d'}
  <AppD />
{:else if route === '/abcd'}
  <AppAll />
{:else}
  <App />
{/if}
