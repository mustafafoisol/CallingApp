# Plan: Emoji Support

One-on-one chat emoji picker in the compose bar and reliable emoji rendering in message bubbles.

## Phase

**Phase 1** — Small effort, no backend changes. Can ship alongside compose-bar polish (timestamps / optimistic send) or immediately after pagination.

## Problem

Users can paste or type emoji into messages (UTF-8 in `body` already works — see HP-7 in [manual-testing.md](../../feature-tests/chat/manual-testing.md)), but there is no picker in the UI. The compose bar has disabled attachment/image buttons and no emoji affordance, which makes emoji use awkward on desktop and inconsistent with typical chat apps.

## Scope

### In scope

- Emoji picker opened from the compose bar (toggle button)
- Insert selected emoji at the **cursor position** in the message input (not only append)
- Render emoji in sent/received bubbles via existing `body` text (native Unicode)
- Picker UX: open/close, click-outside dismiss, keyboard escape
- Mobile-first layout: picker anchored above compose bar, does not obscure send button
- Accessibility: `aria-label`, `aria-expanded` on picker trigger

### Out of scope

- Custom emoji / stickers / GIFs
- Emoji reactions on messages
- `:shortcode:` autocomplete (e.g. `:smile:` → 😄)
- Skin-tone persistence across sessions
- Server-side emoji validation beyond existing `body` length check (1–4000 chars)
- Changes to `messages.type` or schema
- Group chat (see [group-chat.md](../phase2/group-chat.md) — same picker applies once groups ship)

## Schema changes

**None.** Emoji are stored as UTF-8 in `messages.body` (`text`, `char_length` 1–4000). No migration required.

## Implementation steps

### 1. Add emoji picker dependency

**File:** `apps/web/package.json`

Add a maintained React emoji picker with a small bundle:

- **Recommended:** `emoji-picker-react`
- **Alternative:** `@emoji-mart/react` + `@emoji-mart/data`

Install in `apps/web` only (not `packages/core`).

### 2. Create picker wrapper component

**New file:** `apps/web/src/components/chat/emoji-picker-popover.tsx`

Responsibilities:

- Render picker in a positioned popover above the compose bar
- Props: `open`, `onClose`, `onEmojiSelect(emoji: string)`
- Styling: match chat tokens (`--chat-surface`, `--chat-coral`, border `#EBE3DD`)
- Close on: outside click, Escape; keep open after insert for multiple picks (default)

### 3. Extend compose bar with picker + cursor-aware insert

**File:** `apps/web/src/components/chat/compose-bar.tsx`

Changes:

- Add emoji trigger (`Smile` from `lucide-react`) left of the input
- Convert `<input>` → `<textarea>` (`rows={1}` + auto-grow optional)
- Hold `inputRef` for selection range
- On emoji select: splice emoji at `selectionStart` / `selectionEnd`, restore focus and cursor
- State: `pickerOpen` boolean; wire `EmojiPickerPopover`

### 4. Bubble rendering

**File:** `apps/web/src/components/chat/message-bubble.tsx`

- Keep rendering `{body}` as plain text (React escapes HTML — safe)
- Add `whitespace-pre-wrap break-words` and `leading-relaxed` for emoji readability
- Do **not** use `dangerouslySetInnerHTML`

### 5. Chat view integration

**File:** `apps/web/src/app/(app)/chat/[id]/chat-view.tsx`

- No send-path changes: `body` still trimmed and inserted as `type: "text"`
- Enforce `char_length(body)` ≤ 4000 on send
- Realtime INSERT handler unchanged

### 6. Tests

- Manual: extend [manual-testing.md](../../feature-tests/chat/manual-testing.md) HP-7 with picker steps
- Optional: `compose-bar.test.tsx` — insert at cursor, open/close

## Realtime considerations

**None.** Emoji messages use the existing INSERT subscription in `chat-view.tsx`. No new events or channels.

## RLS policies

**No changes.** Existing `messages_insert_participant` and `messages_select_participant` apply unchanged.

## UI/UX details

| Element | Behavior |
|---------|----------|
| Emoji button | Left side of compose bar; `aria-label="Insert emoji"` |
| Picker | Opens upward; max height ~40vh on mobile |
| Insert | Emoji at cursor; input stays focused |
| Send | Unchanged — disabled when empty or sending |
| Received bubbles | System emoji fonts render natively |
| Mine bubbles | White text on coral — verify contrast for colorful emoji |

**Edge cases:**

- Multi-codepoint emoji (👨‍👩‍👧, flags): insert full grapheme from picker
- Emoji-only message: allowed (min length 1)
- Mobile: position picker with `bottom` offset from compose bar when virtual keyboard resizes viewport

## Acceptance criteria

- [x] User can open emoji picker from compose bar in `/chat/[id]`
- [x] Selecting an emoji inserts at cursor position in the draft message
- [x] Sending a message containing emoji delivers to the other participant via realtime
- [x] Emoji render correctly in both mine and theirs bubbles (no mojibake)
- [x] Picker closes on outside click and Escape
- [x] Messages with emoji persist after refresh (SSR load)
- [x] Body length limit (4000) enforced on send
- [x] `pnpm build` and `pnpm test` pass

## Dependencies

| Dependency | Reason |
|------------|--------|
| Basic chat send/receive (Phase 0) | Shipped |
| [message-pagination.md](./message-pagination.md) | Not required |
| Compose bar component | Exists |

**Blocks:** Nothing  
**Blocked by:** Nothing

## Estimated effort

| Task | Effort |
|------|--------|
| Dependency + picker wrapper | 2h |
| Compose bar cursor insert + toggle UX | 2h |
| Bubble CSS + length guard | 1h |
| Manual test doc + QA | 1h |
| **Total** | **~6h (0.75 day)** |

## Relationship to other docs

| Doc | Relationship |
|-----|--------------|
| [message-enhancements.md](./message-enhancements.md) | Images/typing separate; emoji does not use `type: image` |
| [group-chat.md](../phase2/group-chat.md) | Same picker UX in group threads once shipped |