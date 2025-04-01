<script lang="ts">
  import { theme } from '../theme/theme.js';
  import { Footer } from "$lib/components/ui";
  import { Navbar } from "$lib/components/ui";
</script>

<div class="error-container" style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};">
  <Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />
  <div class="error-content">
    <h1>404</h1>
    <p>Sorry, this page doesn't exist. There may be a typo in the URL or the page may have been moved.</p>
    <p>You can return home by clicking <a href="/">here</a>.</p>
  </div>
</div>

<Footer />

<style>
  .error-container {
    min-height: 100vh;
    width: 100%;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .error-content {
    text-align: center;
  }

  h1 {
    font-size: 6rem;
    font-weight: 300;
    margin: 0;
  }

  p {
    font-size: 1.5rem;
    margin-top: 1rem;
  }
  a {
    color: color-mix(in srgb, var(--text-color) 80%, black);
    
  }
  a:hover{
    opacity: 0.8;
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 3rem;
    }
    p {
      font-size: 1rem;
    }
  }
</style> 