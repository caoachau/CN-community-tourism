# Admin implementation requirements

- When implementing the admin interface, integrate `gsap` and `@gsap/react`. This is an explicit user requirement.
- Use `useGSAP()` with component-scoped animations and cleanup.
- Keep motion subtle and purposeful for the admin workflow; respect `prefers-reduced-motion`.
- Simple hover and color transitions can remain in CSS.
- Install the dependencies when implementing the admin interface; this note does not mean GSAP is already installed.
