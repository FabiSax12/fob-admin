/* @ds-bundle: {"format":4,"namespace":"FOB","components":[{"name":"ThemedButton"},{"name":"Button"},{"name":"TextField"},{"name":"GenreTabs"},{"name":"Card"},{"name":"EventCard"},{"name":"BandMemberCard"},{"name":"SectionTitle"},{"name":"TextGradient"},{"name":"MessageDialog"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(" ");
  }
  function omit(obj, keys) {
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) out[k] = obj[k];
    return out;
  }

  /* ThemedButton: src/components/ui/ThemedButton.astro (+ the hero CTA's trailing arrow) */
  function ArrowRight() {
    return h("svg", { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
      h("path", { d: "M3 8h10M9 4l4 4-4 4", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }));
  }
  function ThemedButton(props) {
    var rest = omit(props, ["href", "type", "className", "arrow", "children"]);
    var cls = cx("fob-themed-button", props.arrow && "fob-themed-button--cta", props.className);
    var kids = props.arrow ? [props.children, h(ArrowRight, { key: "arrow" })] : props.children;
    if (props.href) return h("a", Object.assign({ href: props.href, className: cls }, rest), kids);
    return h("button", Object.assign({ type: props.type || "button", className: cls }, rest), kids);
  }

  /* Button: src/components/ui/button.tsx (shadcn, new-york) */
  var Button = React.forwardRef(function Button(props, ref) {
    var variant = props.variant || "default";
    var size = props.size || "default";
    var rest = omit(props, ["variant", "size", "className", "asChild"]);
    return h("button", Object.assign({ ref: ref, className: cx("fob-btn", "fob-btn--" + variant, "fob-btn--size-" + size, props.className) }, rest));
  });
  Button.displayName = "Button";

  /* TextField: .form-label / .form-input in src/components/ContactForm.astro */
  function TextField(props) {
    var rest = omit(props, ["label", "id", "multiline", "rows", "prefix", "className"]);
    var control = props.multiline
      ? h("textarea", Object.assign({ id: props.id, rows: props.rows || 5, className: "fob-input fob-input--multiline" }, rest))
      : h("input", Object.assign({ id: props.id, type: props.type || "text", className: cx("fob-input", props.prefix && "fob-input--prefixed") }, rest));
    return h("div", { className: cx("fob-field", props.className) },
      props.label ? h("label", { htmlFor: props.id, className: "fob-label" }, props.label) : null,
      props.prefix ? h("div", { className: "fob-input-group" }, h("span", { className: "fob-input-prefix" }, props.prefix), control) : control);
  }

  /* GenreTabs: the genre nav in src/components/RepertoireCaroussel.tsx, styled in RepertoireSection.astro */
  function GenreTabs(props) {
    var genres = props.genres || [];
    var initial = props.value != null ? props.value : (props.defaultValue != null ? props.defaultValue : (genres[0] ? genres[0].id : null));
    var state = React.useState(initial);
    var active = props.value != null ? props.value : state[0];
    return h("nav", { className: cx("fob-genre-nav", props.className), role: "tablist", "aria-label": props["aria-label"] || "Géneros musicales" },
      genres.map(function (g) {
        return h("button", {
          key: g.id, role: "tab", type: "button", "aria-selected": active === g.id, className: "fob-genre-btn",
          onClick: function () { state[1](g.id); if (props.onChange) props.onChange(g.id); }
        }, g.name);
      }));
  }

  /* Card: src/components/ui/card.tsx (shadcn) */
  function part(tag, base, name) {
    var C = React.forwardRef(function (props, ref) {
      return h(tag, Object.assign({}, props, { ref: ref, className: cx(base, props.className) }));
    });
    C.displayName = name;
    return C;
  }
  var Card = part("div", "fob-card", "Card");
  var CardHeader = part("div", "fob-card__header", "CardHeader");
  var CardTitle = part("div", "fob-card__title", "CardTitle");
  var CardDescription = part("div", "fob-card__description", "CardDescription");
  var CardContent = part("div", "fob-card__content", "CardContent");
  var CardFooter = part("div", "fob-card__footer", "CardFooter");

  /* EventCard: src/components/EventCard.tsx */
  function EventCard(props) {
    var parts = String(props.date || "").split("-").map(Number);
    var eventDate = new Date(parts[0], parts[1] - 1, parts[2]);
    var hasEventPassed = props.passed != null ? props.passed : new Date() > eventDate;
    var dayNum = eventDate.toLocaleDateString("es-CR", { day: "numeric" });
    var monthStr = eventDate.toLocaleDateString("es-CR", { month: "long" });
    var yearStr = eventDate.toLocaleDateString("es-CR", { year: "numeric" });
    var location = props.location || {};
    var time = props.time || {};
    var ticket = props.ticket;
    return h("article", { className: cx("fob-event", hasEventPassed && "fob-event--passed", props.className) },
      h("div", { className: "fob-event__row" },
        h("div", { className: "fob-event__date" },
          h("span", { className: "fob-event__day" }, dayNum),
          h("span", { className: "fob-event__month" }, monthStr.slice(0, 3)),
          h("span", { className: "fob-event__year" }, yearStr)),
        h("div", { className: "fob-event__info" },
          h("h3", { className: "fob-event__name" }, props.name),
          h("p", { className: "fob-event__location" }, location.name),
          time.start ? h("p", { className: "fob-event__time" }, time.start) : null,
          ticket ? h("div", { className: "fob-event__tickets" },
            ticket.presale ? h("span", { className: "fob-chip fob-chip--presale" }, "Preventa · " + ticket.presale.price) : null,
            ticket.regular ? h("span", { className: "fob-chip" }, ticket.regular.price) : null) : null),
        hasEventPassed ? h("div", { className: "fob-event__thanks" }, "Gracias") : null));
  }

  /* BandMemberCard: src/components/BandMemberCard.astro */
  function BandMemberCard(props) {
    return h("article", { className: cx("fob-member", props.className) },
      h("div", { className: "fob-member__frame" },
        h("img", { className: "fob-member__photo", src: props.image, alt: props.name, width: 320, height: 420, loading: "lazy" }),
        h("div", { className: "fob-member__veil" })),
      h("div", { className: "fob-member__text" },
        h("h3", { className: "fob-member__name" }, props.name),
        h("p", { className: "fob-member__instrument" }, props.instrument)));
  }

  /* SectionTitle: src/components/ui/SectionTitle.astro */
  function SectionTitle(props) {
    return h("header", { className: cx("fob-section-title", props.className) },
      h("h2", { className: "fob-section-title__text" }, props.children),
      h("div", { className: "fob-section-title__rule" }));
  }

  /* TextGradient: src/components/ui/TextGradient.astro */
  function TextGradient(props) {
    return h("span", { className: cx("fob-text-gold", props.className) }, props.children);
  }

  /* MessageDialog: #success-message / #error-message in src/components/ContactForm.astro */
  function MessageDialog(props) {
    if (props.open === false) return null;
    var tone = props.tone || "success";
    return h("div", { className: cx("fob-dialog", props.className), role: "dialog", "aria-modal": "true" },
      h("div", { className: "fob-dialog__panel" },
        h("p", { className: "fob-dialog__title fob-dialog__title--" + tone }, props.title),
        h("p", { className: "fob-dialog__body" }, props.children),
        h("button", { type: "button", className: "fob-dialog__close", onClick: props.onClose }, props.closeLabel || "Cerrar")));
  }

  window.FOB = Object.assign(window.FOB || {}, {
    ThemedButton: ThemedButton,
    Button: Button,
    TextField: TextField,
    GenreTabs: GenreTabs,
    Card: Card, CardHeader: CardHeader, CardTitle: CardTitle, CardDescription: CardDescription, CardContent: CardContent, CardFooter: CardFooter,
    EventCard: EventCard,
    BandMemberCard: BandMemberCard,
    SectionTitle: SectionTitle,
    TextGradient: TextGradient,
    MessageDialog: MessageDialog
  });
})();
