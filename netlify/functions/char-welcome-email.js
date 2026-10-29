// netlify/functions/char-welcome-email.js
// Sends Beauty Trinity results email via Resend after onboarding completes

var RESEND_KEY  = process.env.RESEND_KEY;
var KIT_API_KEY = process.env.KIT_API_KEY;

// Full archetype descriptions for each Beauty Trinity option
var ARCHETYPE_DESCRIPTIONS = {
  'The Statement Maker': {
    tagline: 'Bold. Expressive. Intentional.',
    description: "Your beauty identity doesn't whisper — it announces. You're the one who commits to the lip, finishes the look, and doesn't dial it back for anyone else's comfort. The Statement Maker is about presence — not loudness for its own sake, but the confidence of someone who decided exactly what they wanted and showed up that way. Your best looks are the ones people remember.",
    signature: 'Espresso liner. Black cherry lip. Graphic detail that holds.',
    coreProducts: 'MatteTrance Lipstick (Pat McGrath) · Perma Precision Liquid Eyeliner (Pat McGrath) · Studio Fix Foundation (MAC)'
  },
  'The Soft Power': {
    tagline: 'Romantic. Radiant. Rooted.',
    description: "There's something effortless about the way you do beauty — but it's not actually effortless. Soft Power is warmth with intention behind it. You draw people in rather than commanding the room, and your beauty choices reflect that: luminous skin, lived-in color, a warmth that feels like Sunday morning even when you're at a Friday night event. People always ask what you're wearing.",
    signature: 'Fig and plum tones. Tinted stain. Satin skin.',
    coreProducts: 'Almost Lipstick in Black Honey (Clinique) · Soft Pinch Liquid Blush (Rare Beauty) · Lip Glow Oil (Dior)'
  },
  'The High Gloss': {
    tagline: 'Hydrated. Lit. Effortless.',
    description: "Your skin looks good. Always. Because you made a commitment to keeping it that way. High Gloss isn't about being done up — it's about being undeniably healthy, luminous, and polished in a way that looks like you woke up like this. The best makeup is no-makeup that clearly has a system behind it. Your secret is the skin. Everything else is just punctuation.",
    signature: 'Barrier skin. Intentional highlight. Base that disappears.',
    coreProducts: 'Yummy Skin Blurring Balm Powder (Danessa Myricks) · Glowscreen SPF 40 (Supergoop!) · Gloss Bomb (Fenty Beauty)'
  },
  'The Wild Card': {
    tagline: 'Unexpected. Color-Forward. Electric.',
    description: "You don't follow trends — you create moments. The Wild Card is someone who knows the rules well enough to break them beautifully. A single unexpected detail — lavender liner, a brow that breaks the expected color, chrome against warm skin — and suddenly the whole look lands. Char's job isn't to dial you back. It's to help you go there more intentionally.",
    signature: 'One rich or unusual detail. Everything else stripped clean.',
    coreProducts: 'Eye Pods Eye Shadow (Westman Atelier) · Infinite Chrome Flakes (Danessa Myricks) · Vision Flush Blush (Danessa Myricks)'
  },
  'The Eternal Classic': {
    tagline: 'Crisp. Refined. Iconic.',
    description: "Your look never expires. The Eternal Classic is rooted in precision — clean edges, intentional color, the kind of polish that reads as timeless rather than dated. You probably have a signature. Maybe it's a lip, a cat eye, a contour that's been yours for years. Classics don't need to reinvent — they just need to be done right. And you do it right.",
    signature: 'Same crisp structure. Richer color story. Burgundy. Deep red.',
    coreProducts: 'MatteTrance Lipstick (Pat McGrath) · Long-Wear Gel Eyeliner (Bobbi Brown) · Luminous Silk Foundation (Armani)'
  },
  'The Clean Slate': {
    tagline: 'Fresh. Clarified. Starting from good skin.',
    description: "You're starting from the foundation: real skin, clear skin, healthy skin. The Clean Slate path is about simplifying without sacrificing results — a routine that actually makes sense, with products that do what they say. No 12-step overwhelm. Just the right three things, done consistently, that make your skin look like you've got it together.",
    signature: 'Cleanser. Barrier. SPF. In that order. Every day.',
    coreProducts: 'Ultra Facial Cream (Kiehl\'s) · Glowscreen SPF 40 (Supergoop!) · Clearly Corrective Serum (Kiehl\'s)'
  },
  'The Glow Ritual': {
    tagline: 'Intentional. Luminous. Skincare as a lifestyle.',
    description: "Skincare isn't a task for you — it's a practice. The Glow Ritual is about depth: you're not just moisturizing, you're layering actives, reading labels, investing in your skin like it's a long-term relationship. Because it is. Your routine is your ritual, and Char is here to help you deepen it with the products and ingredients that actually move the needle.",
    signature: 'Midnight actives. Morning glow. One ritual that\'s fully yours.',
    coreProducts: 'Midnight Recovery Concentrate (Kiehl\'s) · Banana Bright Vitamin C Serum (Ole Henriksen) · The Dewy Skin Cream (Tatcha)'
  },
  'The Sharp Detail': {
    tagline: 'Groomed. Precise. Intentionally put together.',
    description: "You care about how you present, and you want the details to match that care. Sharp Detail is about precision — a grooming routine that's consistent, brows that are placed, skin that's maintained rather than treated. The goal isn't glamour. It's that you look like someone who has things together. Because you do.",
    signature: 'Precise brow. Clean skin finish. One intentional detail.',
    coreProducts: 'Air Brow Lifting Treatment Gel (Kosas) · Radiant Creamy Concealer (NARS) · Veil Hydrating Skin Tint (Hourglass)'
  },
  'The Grounded': {
    tagline: 'Authentic. Protective. Real-life proof.',
    description: "You need your products to work in real life — not just in product photography. The Grounded path is efficacy over aesthetics: barrier-building formulas, reliable SPF, treatments that actually address what's happening with your skin, not what's trending. No fluff. Just results. And Char is very good at cutting through the noise.",
    signature: 'Barrier repair. Non-negotiable SPF. Products that earn their place.',
    coreProducts: 'Cloud Cushion Moisturizer (EADEM) · Make It Matte Sunscreen SPF 45 (Black Girl Sunscreen) · Milk Marvel Dark Spot Serum (EADEM)'
  }
};

function getArchetypeBlock(label, icon, archetypeName) {
  if (!archetypeName) return '';
  var a = ARCHETYPE_DESCRIPTIONS[archetypeName];
  if (!a) return '';
  return `
    <tr>
      <td style="padding: 0 0 32px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background: #FAF8F5; border-left: 3px solid #C9A96E; padding: 24px 28px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #C9A96E;">${icon} ${label}</p>
              <p style="margin: 0 0 6px 0; font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #1A1A1A;">${archetypeName}</p>
              <p style="margin: 0 0 14px 0; font-family: Georgia, serif; font-size: 13px; font-style: italic; color: #8A7B6A;">${a.tagline}</p>
              <p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #3D3D3D;">${a.description}</p>
              <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #C9A96E;">YOUR SIGNATURE</p>
              <p style="margin: 0 0 12px 0; font-family: Arial, sans-serif; font-size: 14px; color: #3D3D3D; font-style: italic;">${a.signature}</p>
              <p style="margin: 0 0 4px 0; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #C9A96E;">START HERE</p>
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 13px; color: #5A5A5A; line-height: 1.6;">${a.coreProducts}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function buildEmailHtml(name, core, moon, rising) {
  var firstName = name || 'Beauty Bestie';
  var coreBlock    = getArchetypeBlock('Your Core — Sun', '☀', core);
  var moonBlock    = moon   ? getArchetypeBlock('Your Moon', '☽', moon)   : '';
  var risingBlock  = rising ? getArchetypeBlock('Your Rising', '↑', rising) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Beauty Trinity Results</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F2EE; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F2EE;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: #1A1A1A; padding: 36px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #C9A96E;">Triple Eight Creative</p>
              <p style="margin: 0 0 6px 0; font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #FFFFFF;">Your Beauty Trinity</p>
              <p style="margin: 0; font-family: Georgia, serif; font-size: 14px; color: #9A8A7A; font-style: italic;">The full results — yours to keep.</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 36px 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 16px; color: #1A1A1A; line-height: 1.6;">Hey ${firstName}! 💄</p>
              <p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Here are your full Beauty Trinity results. This is your roadmap — your Core is who you already are, your Moon is what you secretly love but don't fully claim yet, and your Rising is where you're headed.</p>
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Use this every time you're shopping, updating your look, or getting ready for something that matters. Char was built around this — come back anytime.</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <hr style="border: none; border-top: 1px solid #E8E3DC; margin: 0;">
            </td>
          </tr>

          <!-- Archetype blocks -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${coreBlock}
                ${moonBlock}
                ${risingBlock}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 8px 40px 40px 40px; text-align: center;">
              <p style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 14px; color: #5A5A5A; line-height: 1.6;">Want to go deeper? Chat with Char — your Beauty Trinity is already loaded in. Char's here for product recs, routine builds, event prep, and everything in between.</p>
              <a href="https://www.tripleeightcreative.com/char" style="display: inline-block; background: #1A1A1A; color: #FFFFFF; text-decoration: none; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; letter-spacing: 1px; padding: 14px 32px; border-radius: 4px;">Chat with Char →</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #FAF8F5; padding: 28px 40px; text-align: center; border-top: 1px solid #E8E3DC;">
              <p style="margin: 0 0 6px 0; font-family: Georgia, serif; font-size: 13px; color: #8A7B6A; font-style: italic;">Luv, Char</p>
              <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 11px; color: #A09080;">Powered by Triple Eight Creative · AI-supported beauty guidance</p>
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #B8AFA6;">
                <a href="https://www.tripleeightcreative.com" style="color: #C9A96E; text-decoration: none;">tripleeightcreative.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

exports.handler = async function(event) {
  var CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };

  if (!RESEND_KEY) {
    console.error('RESEND_KEY not set');
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: false, error: 'Email not configured' }) };
  }

  try {
    var data   = JSON.parse(event.body);
    var email  = (data.email  || '').trim();
    var name   = (data.name   || '').trim();
    var core   = data.core   || '';
    var moon   = data.moon   || '';
    var rising = data.rising || '';

    if (!email || !email.includes('@')) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, error: 'Valid email required' }) };
    }
    if (!core) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, error: 'Core archetype required' }) };
    }

    var html    = buildEmailHtml(name, core, moon, rising);
    var subject = name
      ? name + ', here are your full Beauty Trinity results ✦'
      : 'Your full Beauty Trinity results ✦';

    // ── ADD TO KIT (ConvertKit) — fire and don't let failure block the email ──
    if (KIT_API_KEY) {
      try {
        var kitRes = await fetch('https://api.kit.com/v4/subscribers', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + KIT_API_KEY
          },
          body: JSON.stringify({
            email_address: email,
            first_name:    name || undefined,
            fields: {
              beauty_trinity_core:   core   || undefined,
              beauty_trinity_moon:   moon   || undefined,
              beauty_trinity_rising: rising || undefined
            }
          })
        });
        var kitBody = await kitRes.json();
        console.log('Kit status:', kitRes.status, JSON.stringify(kitBody).slice(0, 200));
      } catch (kitErr) {
        // Kit failure never blocks the results email
        console.error('Kit error (non-fatal):', kitErr.message);
      }
    } else {
      console.warn('KIT_API_KEY not set — skipping Kit subscriber creation');
    }

    var resendRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + RESEND_KEY
      },
      body: JSON.stringify({
        from:    'Char · T8C <char@tripleeightcreative.com>',
        to:      [email],
        subject: subject,
        html:    html
      })
    });

    var resendBody = await resendRes.json();
    console.log('Resend status:', resendRes.status, JSON.stringify(resendBody).slice(0, 200));

    if (!resendRes.ok) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: false, error: resendBody.message || 'Send failed' }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, id: resendBody.id }) };

  } catch (err) {
    console.error('char-welcome-email error:', err.message);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
