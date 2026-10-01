# leul.dev

Personal portfolio for **Leul Teferi Tadesse**, fullstack software engineer. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, GSAP + ScrollTrigger, Lenis and three.js. It includes an interactive terminal, a command palette, an interactive 3D system diagram and **Production Defense**, a canvas arcade shooter written without a game engine.

## Setup

Requires Node.js 18.18 or newer (developed on Node 22).

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

| Command             | What it does                      |
| ------------------- | --------------------------------- |
| `npm run build`     | Production build                  |
| `npm start`         | Serve the production build        |
| `npm run lint`      | ESLint                            |
| `npm run typecheck` | TypeScript, no emit               |

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to your domain. Metadata, the sitemap and Open Graph URLs all use it.

## Editing content

All copy lives in **`content/site.ts`**. You shouldn't need to touch components to update the site. Anything in `[brackets]` is a placeholder to replace.

| Export                    | Controls                                                              |
| ------------------------- | --------------------------------------------------------------------- |
| `site`                    | Name, email, location, CV path, availability pill                     |
| `socials`                 | GitHub, LinkedIn and Upwork links (contact section + JSON-LD)         |
| `hero`                    | Name lines, tagline, CTA labels, sticker messages                     |
| `stack`                   | Marquee items and the terminal `stack` command                        |
| `projects`                | The six project cards and their case studies                          |
| `about`                   | The two "what I do" cards, bio, counters, experience timeline         |
| `system`                  | Text for the 3D "under the hood" diagram: node labels, details, steps |
| `contact`                 | Contact heading and blurb                                             |
| `terminal`                | Welcome text, quick-command chips, output for `help`, `whoami`, etc.  |
| `accents`                 | The switchable accent colors                                          |

**Projects:** each project has a `category` (`"Web" | "FlutterFlow" | "Backend"`, which drives the filter pills), a thumbnail `color`, tags, optional `liveUrl` / `codeUrl`, and a `caseStudy`. To add screenshots, put images in `public/projects/` and set `src` on the screenshot entries, e.g. `{ src: "/projects/my-app-1.png", alt: "Dashboard" }`. Entries without `src` render as labelled placeholders.

**CV:** `public/cv.pdf` is served by every "Download CV" button and saved as `site.cvFileName`. Replace the file to update it.

**Still placeholders:** the two FlutterFlow projects, the LinkedIn and Upwork links, the architecture notes in the Shega Insights and Nexus Replay case studies, the FlutterFlow card copy in `about.cards`, and any `liveUrl` / `codeUrl` you want to show. A card only shows "Live demo" / "Code" buttons when those URLs are set.

## Contact form

The form posts to `app/api/contact/route.ts`, which validates input and has a honeypot field. Email delivery is optional:

- **No API key (default):** the route answers "not configured" and the form opens the visitor's mail app with the message pre-filled to `site.email`. Nothing is silently dropped.
- **With [Resend](https://resend.com):** set `RESEND_API_KEY` and `CONTACT_TO_EMAIL` in `.env.local` and in Vercel. Messages are sent through Resend's REST API (no SDK) with `reply_to` set to the visitor. Without a verified domain, Resend's `onboarding@resend.dev` sender only delivers to the email on your Resend account; set `CONTACT_FROM_EMAIL` once you verify a domain.

## Deploying to Vercel

1. Push the repo to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New > Project** and import the repo. The Next.js preset needs no build settings.
3. Add environment variables: `NEXT_PUBLIC_SITE_URL` (your production URL), plus the Resend variables if you want direct email delivery.
4. Deploy, then add your domain under **Settings > Domains**.

Or from the CLI: `npx vercel` for a preview, `npx vercel --prod` for production.

Generated at build time: `/opengraph-image` and `/twitter-image` (1200x630 social cards from `app/opengraph-image.tsx`), `/sitemap.xml`, `/robots.txt` and the favicon (`app/icon.svg`).

## Project structure

```
app/                 layout (fonts, metadata, boot script), page, OG image, sitemap, robots, api/contact
content/site.ts      all editable content
lib/                 store (accent, sound, palette state + event bus), smooth scroll helpers, actions, hooks
components/
  layout/            AppShell, Lenis + ScrollTrigger sync, preloader, cursor, nav, progress bar,
                     theme picker, command palette, toast, scroll effects (tint + parallax)
  ui/                SectionLabel, RevealHeading, Magnetic, useStaggerReveal
  hero/              Hero, Sticker, Spotlight
  terminal/          Terminal UI + command definitions
  marquee/           Velocity-reactive tech strip
  projects/          Pinned horizontal showcase, tilt cards, case study modal
  about/             Cards, scroll-scrubbed bio, 3D stack globe (CSS 3D), counters, timeline
  three/             "Under the hood" section: three.js system diagram (SystemScene), node layout
  game/              Production Defense (see below)
  contact/           Contact section, form, footer
```

### Production Defense

| File            | Responsibility                                                                 |
| --------------- | ------------------------------------------------------------------------------ |
| `engine.ts`     | Game loop, waves and difficulty, boss phases, collisions, power-ups, combo     |
| `entities.ts`   | Enemy, boss, projectile, power-up and particle definitions and factories       |
| `renderer.ts`   | All canvas drawing: starfield, sprites, effects, HUD                           |
| `input.ts`      | Keyboard (only while the game has focus), mouse follow, touch drag             |
| `audio.ts`      | Web Audio synthesized sound effects, muted by default                          |
| `highscores.ts` | Top 5 table in localStorage                                                    |
| `GameCanvas.tsx`| React wrapper: DPR-aware sizing, auto-pause, start, pause and game-over screens |

Tuning knobs worth knowing: wave composition and spawn rate are in `Game.buildQueue` / `beginWave`, boss health in `createBoss`, and enemy speeds and scores in `ENEMY_DEFS`.

### 3D

- **System diagram** (`components/three/`): a vanilla three.js scene owned by the `SystemScene` class, wrapped by `SystemSection`. three.js is code-split and only downloads when the section is within 600px of the viewport, renders only while visible, and falls back to the text flow if WebGL is unavailable. Node positions, shapes and colors live in `layout.ts`; text lives in `system` in `content/site.ts`. Orbit drag is mouse-only so touch users can still scroll; taps select nodes.
- **Stack globe** (`components/about/StackGlobe.tsx`): your `stack` list on a Fibonacci sphere, projected in JS onto plain HTML, so labels stay crisp and accessible. Depth uses color rather than opacity to keep AA contrast.

## Notes

- **Accessibility:** semantic sections and headings, skip link, visible focus rings, keyboard-operable terminal, palette, modal (focus trap, Escape) and game. All motion respects `prefers-reduced-motion`: it disables Lenis, the pinned scroll, parallax and the intro animations, and leaves all content visible. The custom cursor and card tilt only run on fine-pointer devices.
- **Performance:** the game engine, case study modal and command palette dialog load lazily. Below-the-fold scroll animations initialize when the browser is idle.
# portfolio-site
