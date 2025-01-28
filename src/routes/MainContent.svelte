<script>
  import { onMount } from 'svelte';
  onMount(() => {
    window.scrollTo(0, 0);
  });
</script>

<div class="content">
    <img src="/images/bg.jpg" alt="AOK Frames Star Pic" class="full-size-image" />
</div>
<div class="after-cover">
</div>

<style>
    .content {
      min-height: 220vh; /* Scroll past cover and be able to scroll further */
      padding: 0; /* Changed from 20px to 0 to remove potential padding */
      margin: 0; /* Ensure no margin */
      position: relative; /* Add this for proper sticky positioning */
    }

    .full-size-image {
        position: sticky;
        top: 0; /* Stick to the top of the viewport */
        left: 0;
        width: 100vw; /* Changed from 100% to 100vw to ensure full viewport width */
        height: 100vh; /* Make it full viewport height */
        object-fit: cover;
        z-index: 0;
        filter: drop-shadow(0 0 10px white);
        transition: top 0.3s ease; /* Smooth transition for sticky effect */
        margin: 0; /* Ensure no margin */
        display: block; /* Ensure proper block-level behavior */
    }

    .after-cover {
        position: relative;
        width: 100%;
        height: 100%;
        background-color: #36454F;
        z-index: -1;
    }
  </style>