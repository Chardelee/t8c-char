// netlify/functions/char-logger.js
// Logs Char conversation PATTERNS (not transcripts) to Google Sheets via Apps Script

var APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

var TOPICS = {
  skincare:  ['skin', 'moisturizer', 'serum', 'cleanser', 'toner', 'spf', 'sunscreen',
               'retinol', 'vitamin c', 'hyaluronic', 'exfoliat', 'pore', 'acne', 'breakout',
               'hyperpigmentation', 'dark spot', 'aging', 'wrinkle', 'fine line', 'glow',
               'radiant', 'dry skin', 'oily skin', 'combination', 'sensitive skin'],
  makeup:    ['foundation', 'concealer', 'contour', 'blush', 'bronzer', 'highlight',
               'eyeshadow', 'eyeliner', 'mascara', 'lipstick', 'lip gloss', 'setting spray',
               'primer', 'full glam', 'no makeup', 'natural look', 'bold lip', 'smoky eye'],
  hair:      ['hair', 'curl', 'straight', 'blowout', 'braid', 'updo', 'balayage',
               'treatment', 'damage', 'frizz', 'color', 'lowlight'],
  nails:     ['nail', 'manicure', 'pedicure', 'gel', 'acrylic', 'press-on', 'nail art'],
  lashes:    ['lash', 'brow', 'eyebrow', 'extension', 'lift', 'tint', 'microblading'],
  events:    ['wedding', 'prom', 'event', 'occasion', 'birthday', 'photoshoot', 'headshot',
               'date night', 'holiday', 'festival', 'red carpet', 'photoshoot'],
  products:  ['recommend', 'product', 'brand', 'buy', 'purchase', 'affordable', 'luxury',
               'drugstore', 'sephora', 'ulta', 'dupes', 'dupe']
};

function extractTopics(text) {
  var lower = text.toLowerCase();
  var found = [];
  Object.keys(TOPICS).forEach(function(topic) {
    if (TOPICS[topic].some(function(kw) { return lower.includes(kw); })) {
      found.push(topic);
    }
  });
  return found.join(', ');
}

function extractKeywords(text) {
  var lower = text.toLowerCase();
  var found = [];
  Object.keys(TOPICS).forEach(function(topic) {
    TOPICS[topic].forEach(function(kw) {
      if (lower.includes(kw) && !found.includes(kw)) found.push(kw);
    });
  });
  return found.slice(0, 12).join(', ');
}

exports.handler = async function(event) {
  var CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };

  try {
    var data     = JSON.parse(event.body);
    var messages = data.messages  || [];
    var glamType = data.glamType  || '';
    var moon     = data.moon      || '';
    var rising   = data.rising    || '';
    var sessionId = data.sessionId || '';

    // Only extract from USER messages — never log Char's responses
    var userText = messages
      .filter(function(m) { return m.role === 'user'; })
      .map(function(m) { return (typeof m.content === 'string') ? m.content : ''; })
      .join(' ');

    var topics    = extractTopics(userText);
    var keywords  = extractKeywords(userText);
    var turnCount = messages.filter(function(m) { return m.role === 'user'; }).length;

    if (!APPS_SCRIPT_URL) {
      console.error('APPS_SCRIPT_URL not set');
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, note: 'logging disabled' }) };
    }

    await fetch(APPS_SCRIPT_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' },
      body:     JSON.stringify({ topics, keywords, glamType, moon, rising, sessionId, turnCount }),
      redirect: 'follow'
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };

  } catch (err) {
    // Logger errors are silent — never break the chat experience
    console.error('char-logger error:', err.message);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
  }
};
