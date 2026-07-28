# Button Implementation Notes

The widget button is split between behavior and presentation:

- `Button.tsx` resolves props, executes actions, collects form data, renders loading state, and maps icon names to Lucide components.
- `button.css` styles the component through semantic data attributes.
- `iconMapping.ts` maps widget icon tokens to Lucide icon names.
- `useActionExecutor` provides action execution and loading state.

## State Model

The button is disabled when any of these conditions is true:

- `disabled` is set.
- An action is running.
- The button is not a submit button and has no `onClickAction`.

While an action is running, the label and icons are replaced by a spinner. `aria-disabled`, native `disabled`, and `tabIndex` stay synchronized.

## Style Contract

Presentation is selected with data attributes:

```html
<button
  data-w-component="button"
  data-color="primary"
  data-variant="solid"
  data-size="lg"
  data-pill
>
  ...
</button>
```

This keeps widget configuration independent from CSS class composition. New colors or variants should extend the existing token types and CSS selectors rather than add component-specific inline styles.

## Accessibility

- Use a label for commands that are not universally represented by their icon.
- Icon-only buttons need an accessible name from their integration context.
- Disabled buttons are removed from the tab order.
- Decorative icons use `aria-hidden="true"`.
- Loading state keeps the native button disabled to prevent duplicate actions.

## Verification

Exercise normal, hover, focus, active, disabled, and loading states for every affected color and variant. Verify icon-only, pill, uniform, block, submit, and action-backed buttons. Run `pnpm test` and `pnpm build` after behavior changes.
