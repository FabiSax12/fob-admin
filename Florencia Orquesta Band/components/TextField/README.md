A labelled text input or textarea in the contact form's style: uppercase muted label, `color-fob-900` field, 2px corners, amber focus. Hand-written from the `.form-label` and `.form-input` styles in `src/components/ContactForm.astro`.

**Use it** for every form field on the site. Stack fields 20px apart; put two short ones (correo, teléfono) side by side from 640px up.

**Props**
- `id` (required, ties the label to the control) and `label`.
- `type` (default `"text"`), `placeholder`, `required`, `autoComplete`, `value`/`onChange`, and any other input attribute.
- `multiline` + `rows` (default 5): renders a non-resizable textarea.
- `prefix`: a fixed leading segment, like `"+506"` on the phone field.

**Note**: the label is `color-fob-muted` (2.5:1) and the placeholder is `oklch(0.32 0.006 55)`, both kept exact from the source and both under body-text contrast. Labels stay short and are always present; don't rely on the placeholder to say what a field is for.
