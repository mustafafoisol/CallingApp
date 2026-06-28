# Design assets

Source: Claude Design export — `Chat UI.html`

Extracted template: `chat-ui-template.html` (run `node scripts/extract-design.mjs` to regenerate)

## Layout options in the design

| Option | Layout | Used in app |
|--------|--------|-------------|
| **A · Classic** | Sidebar + chat panel | `/home` + `/chat/[id]` (split at `lg:`) |
| **B · Focused** | Single-column chat | Mobile `/chat/[id]` only (back to sidebar) |
| **C · Soft two-tone** | Dark rail + coral header | Future / desktop |
| **Add friend dialog** | Modal from sidebar `+` | `/home`, `/chat/[id]` (`?addFriend=1`) |

## Design tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--chat-bg` | `#FAF7F4` | Chat background |
| `--chat-surface` | `#FFFFFF` | Header, bubbles (received) |
| `--chat-sidebar` | `#FBF8F5` | Home / sidebar |
| `--chat-text` | `#2A2420` | Primary text |
| `--chat-muted` | `#8A7F76` | Secondary text |
| `--chat-coral` | `#F26B52` | Sent bubbles, accents |
| `--chat-border` | `#EFE8E2` | Dividers |
| `--chat-online` | `#34B27B` | Active status |

**Font:** Plus Jakarta Sans (Google Fonts)

## Reference

Open `Chat UI.html` in a browser to preview all three options side by side.