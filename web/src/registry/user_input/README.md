# `user_input` Message Protocol

The `user_input` message type pauses an Agent run and asks the user to provide
structured input, choose an option, or take over a browser or cloud phone.
Its TypeScript representation is `UserInputChunk` in `src/types/index.ts`.

## Base Shape

```json
{
  "id": "msg_xxx",
  "role": "assistant",
  "type": "user_input",
  "content": "Question shown to the user",
  "detail": {
    "options": ["Option A", "Option B"],
    "interrupt_data": {
      "type": "user_input",
      "suggested_user_action": "fill_form",
      "question": "Question supplied by the Agent",
      "form_schema": {
        "type": "object",
        "title": "Form title",
        "description": "Form description",
        "properties": {},
        "required": []
      },
      "intervention_info": {
        "scene": "browser",
        "intervention_url": "https://example.com"
      }
    }
  },
  "isLast": true
}
```

## Render Precedence

`UserInputBriefRenderer` selects the first matching view in this order:

1. `detail.interrupt_data.form_schema`: dynamic form
2. Browser takeover request: browser takeover button
3. Cloud phone takeover request: phone takeover component
4. Non-empty `detail.options`: option buttons
5. Otherwise: plain `content`

## Dynamic Form

```json
{
  "id": "uif_form_001",
  "role": "assistant",
  "type": "user_input",
  "content": "Provide route-planning details.",
  "detail": {
    "interrupt_data": {
      "type": "dynamic_form",
      "suggested_user_action": "fill_form",
      "question": "Enter the start, destination, and departure time.",
      "form_schema": {
        "type": "object",
        "title": "Route planning",
        "properties": {
          "start_point": { "type": "string", "title": "Starting point" },
          "end_point": { "type": "string", "title": "Destination" },
          "time_pref": {
            "type": "string",
            "title": "Departure time",
            "enum": ["Now", "In 30 minutes", "In one hour"]
          }
        },
        "required": ["start_point", "end_point", "time_pref"]
      }
    }
  },
  "isLast": true
}
```

`properties` must contain at least one field. Every name in `required` must also
exist in `properties`.

## Phone Takeover

A message requests phone takeover when either condition is true:

- `detail.interrupt_data.suggested_user_action` is `take_over_phone`.
- A related `message_notify_user` message identifies the `phone` scene.

```json
{
  "id": "uif_phone_001",
  "role": "assistant",
  "type": "user_input",
  "content": "Complete verification on the cloud phone.",
  "detail": {
    "interrupt_data": {
      "type": "user_input",
      "suggested_user_action": "take_over_phone",
      "question": "Take over the phone and finish the operation."
    }
  },
  "isLast": true
}
```

## Browser Takeover

Browser takeover requires both a takeover action and an intervention URL:

- `interrupt_data.type` or `suggested_user_action` is `take_over_browser`.
- `interrupt_data.intervention_info.intervention_url` is present.

```json
{
  "id": "uif_browser_001",
  "role": "assistant",
  "type": "user_input",
  "content": "Continue the login in the browser.",
  "detail": {
    "interrupt_data": {
      "type": "take_over_browser",
      "suggested_user_action": "take_over_browser",
      "question": "Take over the browser and continue.",
      "intervention_info": {
        "scene": "browser",
        "intervention_url": "https://example.com/login-checkpoint"
      }
    }
  },
  "isLast": true
}
```

## Option Buttons

Non-empty `detail.options` renders option buttons when no higher-priority form
or takeover condition matches.

```json
{
  "id": "uif_options_001",
  "role": "assistant",
  "type": "user_input",
  "content": "How should I proceed?",
  "detail": {
    "options": ["Continue", "Show me a plan", "Pause"],
    "interrupt_data": {
      "type": "user_input",
      "question": "Select the next action."
    }
  },
  "isLast": true
}
```

Inputs are interactive only when the message is last (`isLast = true`) and the
session is not archived. `content` is user-facing; `interrupt_data.question`
preserves the Agent or backend question used by the protocol.
