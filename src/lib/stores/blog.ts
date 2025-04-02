import { writable } from 'svelte/store';
import type { BlogPost } from '../types/blog.js';

// In a real app, this would come from a database or API
export const posts = writable<BlogPost[]>([
  {
    id: 'first-film-roll',
    title: 'My First Roll of Film',
    summary: 'Exploring the world of analog photography with my first roll of film on a Canon AE-1.',
    content: `# My First Roll of Film: A Journey into Analog Photography

After years of shooting digital, I finally took the plunge into film photography. Armed with my newly acquired Canon AE-1 and a roll of Kodak Portra 400, I set out to explore this classic medium. Here's what I learned from my first roll of film.

## The Camera: Canon AE-1

The Canon AE-1 is a legendary 35mm SLR camera from the late 1970s. Despite its age, it feels incredibly solid and well-built. The mechanical shutter sound is satisfying in a way that no digital camera can match. Key features I appreciated:

- Aperture-priority automatic exposure
- Clear viewfinder with split-prism focusing
- Simple, intuitive controls
- Reliable light meter

## The Film: Kodak Portra 400

I chose Kodak Portra 400 for my first roll because of its:
- Forgiving exposure latitude
- Beautiful, natural color rendition
- Excellent skin tones
- Versatility in different lighting conditions

## The Learning Experience

### Slowing Down
The biggest difference from digital was the pace of shooting. With only 36 exposures and no instant feedback, I found myself:

1. **Taking more time** to compose each shot
2. **Thinking carefully** about exposure settings
3. **Being more selective** about what I photographed
4. **Focusing on the moment** rather than checking the LCD screen

### Technical Challenges

Film photography presented several new challenges:
- **Manual focusing**: Takes practice but becomes intuitive
- **No instant feedback**: Had to trust the light meter and my instincts
- **Limited exposures**: Each frame feels precious
- **Film loading**: Took a few tries to get it right

## The Results

Getting the developed film back was exciting! Some observations:

### What Worked Well
- Colors are rich and natural
- Highlights have beautiful rolloff
- Grain adds character to the images
- Skin tones are gorgeous

### Room for Improvement
- A few shots were slightly underexposed
- Some focus wasn't as sharp as intended
- Film loading marks on the first few frames
- One double exposure (unintentional)

## Lessons Learned

1. **Check the film door**: Always make sure it's properly closed
2. **Meter carefully**: Especially in tricky lighting conditions
3. **Wind gently**: Rough film advance can cause scratches
4. **Keep notes**: Document camera settings for learning

## The Cost Factor

Film photography isn't cheap:
- Film: $15 per roll
- Development: $12
- Scanning: $8
- Total: $35 for 36 exposures

But the experience and results make it worthwhile.

## Moving Forward

This first roll has completely hooked me on film photography. Future plans include:

- Trying different film stocks
- Experimenting with black and white
- Learning to develop my own film
- Building a proper archival system

## Conclusion

While digital remains practical for many situations, film offers a unique shooting experience that encourages mindfulness and creativity. The limitations become advantages, forcing you to slow down and think more carefully about each frame.

I'm excited to continue this journey into analog photography. There's something special about creating physical negatives that can last for generations, each frame a tangible piece of captured time.`,
    author: 'Alex Kou',
    published: '2024-03-20',
    label: 'Film Photography',
    image: '/src/content/blog/images/first-roll.jpg'
  },
  {
    id: 'seattle-street',
    title: 'Seattle Street Photography',
    summary: 'A rainy day wandering through Pike Place Market capturing candid moments.',
    label: 'Street',
    author: 'AOK',
    published: '2024-03-28',
    image: '/src/content/blog/images/seattle-street.jpg',
    content: `# Seattle Street Photography: A Rainy Day at Pike Place

There's something magical about Seattle on a rainy day. The glistening streets, the umbrellas bobbing through crowds, and the soft, diffused light create the perfect conditions for street photography. Today, I spent several hours wandering through Pike Place Market, capturing candid moments of daily life in one of Seattle's most iconic locations.

## The Market Atmosphere

Pike Place Market has a unique energy that's amplified by the rain. Vendors calling out their catches of the day, the aroma of fresh flowers mixing with coffee, and tourists dodging raindrops while trying to catch the perfect shot of the famous fish toss. These elements combine to create a rich tapestry of human experience that's perfect for street photography.

## Technical Approach

For this shoot, I used my trusty Canon AE-1 loaded with Kodak Tri-X 400. The film's high contrast and beautiful grain structure perfectly complement the moody Seattle weather. I kept my aperture around f/8 for decent depth of field and shot mostly at 1/125s to freeze motion while maintaining some environmental blur.

## Capturing Candid Moments

The key to successful street photography is becoming invisible. I spent time in each location, letting people get used to my presence before starting to shoot. This approach yielded some beautiful candid moments:

- A flower vendor arranging her bouquets in the early morning light
- Steam rising from fresh coffee cups as customers huddled under awnings
- The synchronized movement of the fish market crew preparing for their famous toss
- Children pressing their faces against bakery windows

## Lessons Learned

1. **Patience is key**: The best shots often come after waiting in one spot for the right moment
2. **Weather is your friend**: Rain creates interesting reflections and forces people to interact with their environment in unique ways
3. **Keep it simple**: Sometimes the most powerful images are the simplest ones
4. **Respect your subjects**: Always be mindful of people's privacy and personal space

## Looking Forward

This rainy day shoot has inspired me to start a series on Seattle's various neighborhoods and their unique characters. Each area of the city has its own story to tell, and I'm excited to capture these narratives through my lens.

Stay tuned for more street photography adventures, and don't let a little rain keep you from getting out there and shooting!`
  },
  {
    id: 'night-photography',
    title: 'After Dark: City Lights',
    summary: 'Exploring night photography techniques in downtown Seattle.',
    label: 'Night',
    author: 'AOK',
    published: '2024-03-25',
    image: '/src/content/blog/images/night-photography.jpg',
    content: `# After Dark: Exploring Seattle's City Lights

Night photography has always fascinated me. There's something magical about how artificial light transforms familiar scenes into something entirely new. Last night, I ventured into downtown Seattle to explore the city after dark and experiment with some night photography techniques.

## Planning the Shoot

Timing is crucial for night photography. I started shooting during the blue hour (just after sunset) when there's still some ambient light in the sky. This creates a beautiful balance between natural and artificial light. I continued shooting well into the night to capture the city at its most vibrant.

## Equipment and Settings

For this shoot, I used:
- Canon AE-1 with 50mm f/1.8 lens
- Tripod (essential for long exposures)
- Cable release to minimize camera shake
- Kodak Portra 800 film (pushed to 1600)

Key settings:
- Aperture: f/8 to f/16 for maximum depth of field
- Shutter speed: 1-30 seconds depending on the scene
- Manual focus (autofocus can struggle in low light)

## Favorite Locations

### Pike Place Market Sign
The iconic neon sign was my first stop. The challenge was finding the right angle to capture both the sign and the street activity below. I ended up shooting from across the street, using passing car lights to add dynamic light trails to the composition.

### Seattle Great Wheel
The Ferris wheel's changing LED patterns created interesting opportunities for long exposures. I experimented with different shutter speeds to capture various patterns and reflections in the water.

### Downtown Intersections
The grid of city streets provided perfect leading lines, while traffic lights and car trails added dynamic elements to the compositions.

## Technical Challenges

Night photography presents unique challenges:
1. **Metering**: Film cameras can struggle with extreme contrast in night scenes
2. **Reciprocity failure**: Long exposures require additional compensation with film
3. **Mixed lighting**: Different light sources create varying color temperatures
4. **Focus**: Manual focusing in low light requires practice and patience

## Tips for Night Photography

1. **Scout locations during daylight**: This helps you plan compositions and identify potential safety concerns
2. **Bring backup batteries**: Cold weather and long exposures drain batteries quickly
3. **Use reciprocity failure charts**: Different films require different exposure compensations
4. **Watch your highlights**: It's easy to blow out bright neon signs
5. **Embrace grain**: Higher ISO films add character to night shots

## Post-Processing Considerations

While I prefer to get things right in camera, night photography often requires some darkroom work:
- Dodging to recover shadow detail
- Burning to control bright highlights
- Split-filter printing for better contrast control

## Future Projects

This shoot has inspired several ideas for future night photography projects:
- A series on Seattle's historic neon signs
- Long exposure studies of public transportation
- Architectural studies focusing on lit windows and patterns
- Light painting experiments in urban environments

Night photography opens up a whole new world of creative possibilities. The city becomes a different place after dark, and capturing that transformation on film is both challenging and rewarding. I'm looking forward to more nocturnal adventures with my camera!`
  }
]); 