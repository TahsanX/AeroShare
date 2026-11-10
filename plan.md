# Frontend Redesign Plan

**Project:** `/elayadesign-frontend`  
**Product:** Single page file sharing website  
**Reference:** Elaya Design landing page system (`SKILL.md`)

---

## 1. Goal

Redesign the existing file sharing website so it feels like a polished, modern SaaS product while keeping the current file sharing functionality intact.

The website is a **single page application with no authentication**. Visitors should be able to understand the product, upload a file, generate or use a share link, and access the existing download flow without signing in.

The redesign should improve visual quality, clarity, usability, responsiveness, and trust. It must not turn the product into a multi page marketing website or introduce features that the backend does not support.

### Primary conversion

**Upload and share a file.**

Every major section should support this one action. The main CTA should take the visitor to the upload area on the same page.

### Non goals

- No login, signup, authentication, or user accounts.
- No dashboard or account settings.
- No additional routes or separate marketing pages.
- No backend rewrite or API contract changes.
- No Redux or TypeScript.
- No fake integrations, partnerships, certifications, or verified customer claims.
- No new product functionality presented as real unless it already exists.

---

## 2. First Step: Inspect the Existing Project

Before changing code:

1. Inspect the project structure, package scripts, dependencies, and current page components.
2. Identify the existing upload component, file validation, API requests, upload progress, share link generation, copy action, and download flow.
3. Record existing file size limits, supported file types, link expiry rules, and error responses. Do not guess these values.
4. Identify current styling conventions and reusable components.
5. Run the existing project and capture its current state as a baseline.

Preserve existing business logic and API integrations. Refactor only where required to support the new UI.

---

## 3. One Page Structure

Use a **classic hero plus sections** layout. Keep all content on the existing page and use anchor navigation for section links.

Recommended section order:

1. Floating navigation
2. Hero with the real upload interface
3. Lightweight technology brand strip
4. Animated demo statistics
5. Benefits and features
6. How file sharing works
7. Product experience showcase, only where it adds value beyond the hero uploader
8. Tagline reveal section
9. Sample testimonials
10. FAQ
11. Final upload CTA
12. Footer

The page should not feel like a long generic template. Keep sections concise and make the upload experience the visual and functional centre of the site.

---

## 4. Section Requirements

### 4.1 Floating navigation

- Add a compact floating navigation bar with a translucent surface and backdrop blur.
- Keep the brand mark or product name on the left.
- Use same page anchor links such as Features, How it works, and FAQ.
- Add one prominent **Upload a file** CTA that scrolls to the uploader.
- Do not add Login, Sign up, Dashboard, or Account links.
- On mobile, use a compact menu panel with accessible open and close controls.
- Clearly indicate focus and active states.

### 4.2 Hero and real upload interface

This is the most important section. The upload action must be visible immediately, without requiring users to scroll through marketing content.

Content:
- A direct headline focused on quick and simple file sharing.
- A short subtitle explaining the actual sharing process.
- A primary upload area with drag and drop support if already supported.
- A visible file picker button as an alternative to drag and drop.
- A small line of supporting information based only on verified product limits or capabilities.

Upload component states:
- Empty: clear drop area, upload icon, short instruction, and file picker action.
- Drag over: visible border or surface change.
- Selecting: show the selected file name, type, and size where available.
- Uploading: show real progress when the API provides it; otherwise use an honest indeterminate state.
- Success: show the generated share link and a clear copy action if link generation exists.
- Copy success: show a brief inline confirmation.
- Error: show a specific, readable message and a retry path where appropriate.
- Disabled: explain why the action is unavailable.

Do not simulate a successful upload, link generation, or download. The UI must reflect actual backend responses.

### 4.3 Technology brand strip

Add a restrained strip using familiar technology brand marks such as Google, Meta, IBM, NVIDIA, Microsoft, or Amazon only as illustrative visual references.

- Do not label this section **Trusted by** unless there is evidence of real customers.
- Do not imply partnerships, sponsorships, integrations, or endorsements.
- Use a neutral label such as **Designed for the way modern teams work**.
- Add a discreet note that the displayed marks are illustrative and do not indicate affiliation.
- Do not link to brand websites unless those links have a real purpose.

If this section makes the product feel less credible, remove it rather than overstate social proof.

### 4.4 Animated statistics

Create a visually clear row or grid of three or four counters. Example demo values:

- Files shared: 128,492+
- Downloads: 96,381+
- Sample active users: 12,840+
- Example peak usage: 8:30 PM

These figures are **dummy demonstration data**, not real product analytics.

Requirements:
- Label the block clearly as **Demo statistics** or **Illustrative activity**.
- Do not present sample metrics as actual live usage, customers, or platform performance.
- Animate numeric counters once when the section enters the viewport.
- Use a short, smooth count up animation and respect reduced motion preferences.
- Do not repeatedly restart the animation on every scroll.
- Do not add a live chart or claim to show a real peak time unless real analytics are connected.

### 4.5 Benefits and features

Use four to six feature cards. Prioritise actual capabilities confirmed during project inspection.

Potential content, only where supported by the product:
- Simple file uploads
- Shareable download links
- Clear upload feedback
- Convenient file downloads
- File type or size validation
- Mobile friendly sharing

Each card should contain:
- One consistent icon.
- A short, benefit led title.
- One concise explanatory sentence.

Avoid feature claims such as end to end encryption, unlimited storage, password protection, expiry controls, or large file support unless the existing implementation actually provides them.

### 4.6 How it works

Explain the real user journey in three steps:

1. **Choose a file:** Select a file or drop it into the upload area.
2. **Upload your file:** The website sends the file through the existing upload flow and displays its actual state.
3. **Share the link:** Copy and share the generated link, if this is supported by the current implementation.

Use a simple numbered layout or connected visual steps. The CTA should scroll back to the uploader.

### 4.7 Product experience showcase

Only add this section if it provides useful detail not already visible in the hero uploader.

Possible visual details:
- A polished view of the actual upload component.
- File name and file metadata.
- Upload progress state.
- Link ready state and copy action.

Reuse real components where practical. Do not build a disconnected mock interface that suggests functionality the application does not have.

### 4.8 Mandatory tagline reveal

Add a separate, large typography section communicating the core benefit. This section is mandatory in the Elaya Design system.

Example direction:

> Share files simply. Keep the process moving.

Implementation:
- Use at least two lines of large text.
- Start words in a muted visual state of roughly 25 to 35 percent opacity.
- Reveal words in reading order as the section enters the viewport.
- Use IntersectionObserver or a carefully managed animation approach.
- Respect `prefers-reduced-motion` by showing the complete text immediately.
- Keep the animation subtle and avoid distracting effects.

### 4.9 Sample testimonials

Add up to three concise sample testimonial cards if the page needs a human touch.

- Use fictional names, roles, and quotes only.
- Clearly mark the section as **Sample feedback** or **Illustrative testimonials**.
- Do not use real people's photos or imply that the quotes are verified reviews.
- Use simple initials or generated abstract avatars.
- Keep the cards visually restrained and believable.

If clearly labelling fictional testimonials makes the section feel awkward, replace it with a product benefits or use case section.

### 4.10 FAQ

Create an accessible accordion with around six to eight questions. Use answers grounded in the existing implementation.

Suggested questions:

1. How do I upload a file?
2. How do I share a file?
3. Does someone need an account to download a file?
4. Which file types are supported?
5. Is there a file size limit?
6. How long does a share link work?
7. Can I use the website on my phone?
8. Is file sharing free?

Do not invent answers about account requirements, supported types, file size limits, link expiry, privacy, security, or pricing. Where the codebase does not establish an answer, use a configurable placeholder for the developer to verify before release.

Accordion requirements:
- Keyboard accessible buttons.
- Correct expanded state using `aria-expanded` and panel relationships.
- Clear focus indicator.
- Smooth but restrained open and close transition.

### 4.11 Final CTA

End with a simple, high contrast call to action:
- One short headline.
- One supporting sentence.
- One **Upload a file** button that scrolls to the hero uploader.

Do not add a signup CTA or create a second conversion goal.

### 4.12 Footer

Keep the footer compact. Include:
- Product name and a short description.
- Anchor links to sections on the same page.
- Privacy and Terms links only if those pages or valid destinations exist.
- Contact information only if it is provided by the project owner.
- Copyright text.

Do not create dead links or invent contact details.

---

## 5. Visual Design System

Follow the uploaded Elaya Design system consistently rather than inventing unrelated styles for each section.

### Typography

Approved typefaces:
- Geist
- Manrope
- Geist Mono for small technical labels or file metadata, if needed
- Poppins

Use one primary typeface across the website. Do not use Inter, Roboto, Arial, Open Sans, or Helvetica.

Suggested type scale:

| Style | Size | Weight |
|---|---:|---|
| Heading 1 | 60px / 60px | Semibold |
| Heading 2 | 48px / 48px | Semibold |
| Heading 3 | 36px / 40px | Semibold |
| Heading 4 | 30px / 36px | Semibold |
| Heading 5 | 24px / 32px | Semibold |
| Heading 6 | 20px / 28px | Semibold |
| Body | 14px to 16px | Regular or Medium |
| Caption | 12px to 14px | Regular or Medium |

- Avoid ultra bold weights above 700.
- Do not use italics.
- Use balanced heading wrapping and readable paragraph width.
- Avoid awkward single word lines.

### Spacing tokens

Use only these spacing values as the design system basis:

| Token | Value |
|---|---:|
| Spacing 25 | 2px |
| Spacing 50 | 4px |
| Spacing 75 | 8px |
| Spacing 100 | 12px |
| Spacing 200 | 16px |
| Spacing 300 | 24px |
| Spacing 400 | 32px |
| Spacing 500 | 40px |
| Spacing 600 | 48px |
| Spacing 700 | 64px |
| Spacing 800 | 80px |
| Spacing 900 | 96px |

Use consistent section spacing and avoid arbitrary one off values.

### Colour and surfaces

Choose one coherent visual direction and apply it throughout. A premium dark theme is a suitable starting point.

Dark palette reference:
- `#000000`
- `#181818`
- `#1F1F1F`
- `#272727`
- `#313131`
- `#131209`

Rules:
- Prefer flat backgrounds and clear surface contrast.
- Do not use gradient backgrounds.
- A subtle text only gradient may be used for a hero heading: `#FFFFFF` to `#9B9B9B`.
- Keep accent colours limited and consistent.
- Ensure readable contrast for text, icons, borders, and focus states.

### Cards, borders, and corners

- Use consistent Tailwind compatible corner radius values.
- Use complete borders around a component or no border. Avoid borders on only one side of a card.
- Use subtle surface contrast instead of adding borders to every element.
- When nesting rounded components with a gap under 32px, follow the Elaya nested radius rule: inner radius equals outer radius minus the gap, where the result is greater than 2px.

### Icons

Use one coherent icon family. Preferred options from the skill are Phosphor, Solar, and Iconamoon. Do not mix icon styles or use Material Icons or Material Symbols.

---

## 6. Motion and Interaction Rules

Use motion to clarify state and add polish, not to distract.

- Base easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Standard duration: around 500ms for larger reveals.
- Hover colour or opacity transitions: around 300ms and never below 200ms.
- Animate `transform` and `opacity` where possible.
- Use scroll reveals that rise roughly 32px and fade in over 600 to 800ms, once only.
- Use IntersectionObserver rather than an unthrottled scroll listener.
- Navigation items may enter with a subtle stagger, capped around 400ms.
- Respect `prefers-reduced-motion` for every non essential animation.

Interactive states must be designed consistently:
- Hover: subtle surface or opacity change.
- Active: slight press feedback such as scale 0.98.
- Focus: visible keyboard focus ring.
- Loading: use a meaningful progress indicator or skeleton where appropriate, not an unexplained spinner.
- Empty: provide a clear getting started state.
- Error: show a specific inline message, never `window.alert()`.
- Success: provide clear inline confirmation.

---

## 7. Responsive and Accessibility Requirements

Test at a minimum of:
- 390px mobile width
- 768px tablet width
- 1024px laptop width
- 1440px desktop width

Requirements:
- No horizontal overflow.
- Upload area remains easy to use on mobile.
- Buttons and controls have comfortable touch targets.
- Navigation adapts to small screens.
- Cards reflow without cramped text.
- Headings remain readable and balanced.
- Use semantic landmarks and heading order.
- Add a skip to content link.
- Provide labels and accessible names for controls.
- Ensure keyboard operation for navigation, upload controls, accordions, and copy actions.
- Provide useful alt text for meaningful images and empty alt text for decorative images.
- Do not rely on colour alone to communicate upload status.

---

## 8. Technical Implementation Constraints

- Keep the existing React and JavaScript setup.
- Do not introduce TypeScript or Redux.
- Prefer existing dependencies and components.
- Add a new dependency only when there is a clear need.
- Keep the existing upload and download API behaviour intact.
- Do not change backend routes, payload shapes, or authentication behaviour.
- Keep UI state close to the components that own it.
- Avoid unnecessary global state.
- Avoid duplicating upload logic in showcase components.
- Make all navigation and CTA buttons perform their stated action.
- Avoid placeholder links and non functional controls.
- Add page title, meta description, and Open Graph metadata where the current app structure supports them.
- Add a favicon if the project has an appropriate brand asset.
- Ensure a useful not found experience only if the existing app has route handling; do not add routes just for this redesign.

---

## 9. Content and Copy Rules

- Write finished, specific copy. Do not use Lorem ipsum.
- Lead with user benefits rather than a feature list.
- Keep the primary action consistent: **Upload a file**.
- Use sentence case for headings and buttons.
- Avoid inflated claims such as fastest, safest, unlimited, military grade, or enterprise grade unless they are verified.
- Do not invent customer numbers, company relationships, certifications, file limits, security promises, or pricing.
- Clearly identify sample metrics and fictional testimonials as illustrative content.
- Keep all copy aligned with what the existing product actually does.

---

## 10. Implementation Order

Work section by section. Do not rebuild the entire application in one uncontrolled pass.

1. Inspect the codebase and document the current upload and download behaviour.
2. Establish typography, colours, spacing, buttons, cards, and shared layout primitives.
3. Redesign the navigation and hero around the real uploader.
4. Implement upload, success, error, and copy states without changing API behaviour.
5. Add the brand strip and clearly labelled demo statistics.
6. Add benefits, how it works, and any useful product showcase.
7. Add the mandatory tagline reveal.
8. Add clearly labelled sample testimonials only if appropriate.
9. Add the FAQ using verified product information.
10. Add the final CTA and compact footer.
11. Complete responsive, accessibility, and visual polish passes.

---

## 11. Definition of Done

The redesign is complete only when all of the following are true:

### Product behaviour
- [ ] Existing file selection and upload still work.
- [ ] Existing file validation still works.
- [ ] Upload progress or loading state reflects the real process.
- [ ] Successful upload displays the correct result.
- [ ] Share link generation and copy action work if supported by the current app.
- [ ] Existing download flow still works.
- [ ] Error states are understandable and recoverable where possible.
- [ ] No authentication or account flow has been introduced.

### Visual quality
- [ ] The uploader is immediately visible and is the primary focus.
- [ ] Navigation links scroll to the correct sections.
- [ ] All sections follow one consistent design system.
- [ ] Typography, spacing, colour, icons, cards, and corners are consistent.
- [ ] Statistics are labelled as demo data.
- [ ] Fictional testimonials are labelled as illustrative.
- [ ] Brand marks do not imply endorsement or partnership.
- [ ] Tagline reveal works and respects reduced motion.

### Quality assurance
- [ ] Mobile, tablet, and desktop layouts have been checked.
- [ ] No horizontal overflow at 390px.
- [ ] Keyboard navigation and visible focus states work.
- [ ] Accordions and other interactive controls are accessible.
- [ ] No dead links or inert buttons remain.
- [ ] No browser console errors or new runtime warnings.
- [ ] Existing API integrations remain unchanged.
- [ ] Production build completes successfully.

---

## Final Direction

The result should feel like a focused, premium file sharing product: **one page, one clear purpose, one primary action**. The real uploader must remain central. Supporting sections should create confidence and explain the product, while clearly marked demo content adds visual interest without pretending to be real customer or usage data.
