<script lang="ts">
  import { theme } from '../../../theme/theme.js';
  export let class_name = '';
</script>

<footer class="footer {class_name}"
    style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};"
>
  <div class="footer-content">
      <h3>AOKFrames</h3>
      <a href="mailto:aokframes@gmail.com" class="email">aokframes@gmail.com</a>
      <a href="https://instagram.com/aokframes" target="_blank" rel="noopener noreferrer" class="instagram">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
          </svg>
      </a>
  </div>
</footer>

<style>
    .footer {
        padding: 2rem;
        background-color: color-mix(in srgb, var(--bg-color) 80%, black);
    }

    .footer-content {
        max-width: 1200px;
        margin: 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .footer-content h3 {
        font-size: 1.5rem;
        font-weight: 300;
    }

    .email {
        color: inherit;
        text-decoration: none;
        transition: color 0.2s;
    }

    .email:hover {
        opacity: 0.8;
    }

    .instagram {
        color: inherit;
        transition: color 0.2s;
    }

    .instagram:hover {
        opacity: 0.8;
    }

    @media (max-width: 768px) {
        .about-content {
            flex-direction: column;
            text-align: center;
        }

        .profile-photo {
            width: 150px;
            height: 150px;
        }
    }
</style> 