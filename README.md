# t8c-char
T8C Char — AI beauty advisor and Signature Glam + Skin Quiz for Triple Eight Creative. Powered by Anthropic API via Netlify serverless functions.
# T8C Char

AI beauty advisor for Triple Eight Creative. Guides Inner Circle members through personalized glam and skincare recommendations using the Signature Glam + Skin Trinity system.

## Stack
- Anthropic API (claude-sonnet-4-6)
- Netlify serverless functions
- Squarespace Code Block embed
- Mailchimp (quiz submissions via JSONP)
- Netlify Blobs (usage tracking)

## Files
- `char-widget.html` — Char AI advisor widget
- `t8c-summer-quiz.html` — Signature Glam + Skin Quiz
- `netlify/functions/chat.js` — serverless function
- `netlify.toml` — Netlify config

## Environment Variables
- `ANTHROPIC_KEY` — Anthropic API key
- `RESEND_KEY` — not used in this repo
- © Triple Eight Creative. All rights reserved. Private repository.
