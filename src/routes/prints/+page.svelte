<script lang="ts">
  import { theme } from '../../theme/theme.js'; // Relative path to theme
  import { Footer } from "$lib/components/ui"; // Assuming $lib alias works
  import { Navbar } from "$lib/components/ui"; // Assuming $lib alias works
</script>

<div class="page-container" style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};">
  <Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />
  <div class="content-area">
    <img 
      src="/directr2/constants/Prints.jpg" 
      alt="Selection of photographic prints" 
      class="prints-image"
    />
    <div class="section">
      <p>
        I have a selection of prints available <a href="https://aokframes.darkroom.com" target="_blank" rel="noopener noreferrer">here</a>.
      </p>
    </div>
    <div class="section">
      <p>
        For professional inquiries, collaborations, or to commission a unique custom print, please feel free to contact me at <a href="mailto:aokframes@gmail.com">aokframes@gmail.com</a>. I look forward to hearing from you!
      </p>
    </div>
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
    gap: 1.5rem; /* Adjusted gap between sections */
  }
  
  .section {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 600px; /* Limit width for readability */
  }

  p {
    font-size: 1.2rem; /* Adjust size as needed */
    line-height: 1.6;
    margin: 0;
  }

  a {
    color: color-mix(in srgb, var(--text-color) 85%, black); /* Link color */
    text-decoration: underline;
  }

  a:hover {
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    p {
      font-size: 1rem;
    }
  }

  /* Added styles for the image */
  .prints-image {
    display: block; /* Needed for margin auto horizontal centering */
    max-width: 100%; /* Prevent overflow */
    width: 600px; /* Max size on larger screens, matches text section */
    height: auto; /* Maintain aspect ratio */
    margin: 0 auto 2rem auto; /* Center horizontally, add bottom margin */
    border-radius: 8px; /* Optional: Add slight rounded corners */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Optional: Add subtle shadow */
  }
</style> 