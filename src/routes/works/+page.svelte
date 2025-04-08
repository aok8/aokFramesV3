<script lang="ts">
  import { theme } from '../../theme/theme.js'; // Adjusted path relative to src/routes/works/
  import { Footer } from "$lib/components/ui";
  import { Navbar } from "$lib/components/ui";
  import { Settings } from "lucide-svelte"; // Changed icon to Settings
</script>

<div class="page-container" style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};">
  <Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />
  <div class="content-area">
    <Settings size={64} strokeWidth={1.5} />
    <h1>Under Construction</h1>
    <p>This page is currently being built. Please check back later!</p>
  </div>
  <Footer />
</div>

<style>
  .page-container {
    min-height: 100vh;
    width: 100%;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
  }

  .content-area {
    flex: 1; /* Takes up remaining space */
    display: flex;
    flex-direction: column;
    justify-content: center; /* Center vertically */
    align-items: center; /* Center horizontally */
    text-align: center;
    padding: 2rem;
    gap: 1rem; /* Add some space between elements */
  }

  h1 {
    font-size: 2.5rem; /* Adjust size as needed */
    font-weight: 300;
    margin: 0;
  }

  p {
    font-size: 1.2rem; /* Adjust size as needed */
    margin-top: 0.5rem;
  }

  /* Optional: Style the icon */
  .content-area :global(svg) {
    color: color-mix(in srgb, var(--text-color) 70%, black); /* Example color */
    margin-bottom: 1rem;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 1.8rem;
    }
    p {
      font-size: 1rem;
    }
    .content-area :global(svg) {
      width: 48px;
      height: 48px;
    }
  }
</style> 