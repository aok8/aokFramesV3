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
      padding: 20px;
    }

    .full-size-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover; /* Maintains aspect ratio while filling container */
        z-index: 0; /* Increased z-index to appear above after-cover */
        filter: drop-shadow(0 0 10px white);
    }

    .after-cover {
        position: relative; /* Add this to establish a new stacking context */
        width: 100%;
        height: 100%;
        background-color: #36454F;
        z-index: -1; /* Ensure this stays below the image */
    }
  </style>
  
