<script lang="ts">
    export let images: string[] = [];
</script>
  
  <style>
    .masonry-grid {
      display: grid;
      grid-template-rows: masonry;
      grid-auto-flow: row;
      gap: 10px;
      width: 100%;
    }
  
    .masonry-item {
      width: 100%;
      object-fit: cover;
      border-radius: 10px;
    }
  </style>
  
  <div class="masonry-grid">
    {#each images as img}
      <img class="masonry-item" src={img} alt="Masonry Image" />
    {/each}
  </div>
  