<script lang="ts">
  import { theme } from '../../theme/theme.js';
  import { Footer } from "$lib/components/ui";
  import { Navbar } from "$lib/components/ui";
</script>

<div class="about-container" style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};">
  <Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />
  <div class="about-content">
    <img src="/images/Profile_Pic.jpg" alt="Profile" class="profile-photo" />
    <div class="text-content">
      <h1>About Me</h1>
      <p>
        Alain is a photographer with a love for visual storytelling. 
        Originally from New Jersey and now based in Seattle, he brings four years of photographic experience to his work, 
        including three years immersed in the art of film. 
        Whether in vivid color or classic black and white, he seeks to capture a collection of awe inspiring images.
      </p>
      <p>
        I try best to capture feelings and essence through the images I take, to invoke some sort of emotion in the viewer. 
        It's because of this, that I have a hard time categorizing my work, it's more a collection of such. 
        I find joy in being able to see the changes in what caught my eye, and also bring back memories of what exactly it was that excited me. 
        Hopefully, through this, you'll be excited to see what I've been up to.
      </p>
    </div>
  </div>
  <Footer />
</div>

<style>
  .about-container {
    min-height: 100vh;
    width: 100%;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
  }

  .about-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 4rem 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .profile-photo {
    width: 250px;
    height: 250px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .text-content {
    width: 100%;
  }

  h1 {
    font-size: 3rem;
    font-weight: 300;
    margin: 0 0 2rem 0;
  }

  p {
    font-size: 1.2rem;
    line-height: 1.6;
    margin: 1rem 0;
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    .about-content {
      padding: 2rem 1rem;
    }

    .profile-photo {
      width: 200px;
      height: 200px;
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 1.5rem;
    }

    p {
      font-size: 1rem;
      line-height: 1.5;
    }
  }

  @media (max-width: 480px) {
    .profile-photo {
      width: 150px;
      height: 150px;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 1.75rem;
      margin-bottom: 1rem;
    }
  }
</style> 