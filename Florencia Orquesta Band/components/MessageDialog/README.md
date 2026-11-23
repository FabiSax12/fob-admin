A centered confirmation over a dark veil, used after the contact form submits. Hand-written from the `#success-message` and `#error-message` overlays in `src/components/ContactForm.astro`.

**Use it** to confirm or report the result of one action, with a single way out. Not for forms or long content.

**Props**
- `tone`: `success` (gold title) or `error` (`destructive` title).
- `title`: one short line ("¡Mensaje enviado!", "Error al enviar").
- `children`: one or two sentences ("Muchas gracias. Te respondemos a la brevedad." / "Por favor intentá de nuevo o escribinos directo por WhatsApp.").
- `open` (default true), `onClose`, `closeLabel` (default "Cerrar").

The overlay is fixed and covers the viewport at 85% of the ground. The source's close button is `color-fob-muted` text (2.5:1) that turns gold on hover; that's kept exact, so consider `color-fob-subtle` when you revise it.
