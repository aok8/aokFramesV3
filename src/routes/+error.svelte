<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="error-content">
  <p> Sorry, this page doesn't exist. There may be a typo in the URL or the page may have been moved.</p>
  <p>You can return home by clicking <a href="/">here</a>.</p>
</div>

<style>
  .error-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 2rem;
    min-height: 80vh;
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
    font-weight: bold;
    text-decoration: underline;
  }

  a:hover {
    opacity: 0.8;
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