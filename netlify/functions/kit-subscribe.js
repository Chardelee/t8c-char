// netlify/functions/kit-subscribe.js
// Adds SGT quiz subscribers to Kit using v3 API (API Secret)

exports.handler = async function(event) {
  var CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  try {
    var data      = JSON.parse(event.body);
    var email     = (data.email     || '').trim();
    var firstName = (data.firstName || '').trim();
    var glamType  = (data.glamType  || '').trim();
    var moon      = (data.moon      || '').trim();
    var rising    = (data.rising    || '').trim();
    var source    = (data.source    || '').trim();

    if (!email) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    var API_SECRET = process.env.KIT_API_KEY;
    if (!API_SECRET) {
      console.error('KIT_API_KEY env var is not set');
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: 'Server config error' })
      };
    }

    var BASE = 'https://api.convertkit.com/v3';

    // ── Step 1: Find "Signature Glam Test" tag by listing existing tags ─────
    // Kit v3 POST /tags now returns 422 when tag name already exists,
    // so we list first and only create if not found.
    var tagId;
    var listRes  = await fetch(BASE + '/tags?api_secret=' + encodeURIComponent(API_SECRET), {
      method: 'GET', headers: { 'Content-Type': 'application/json' }
    });
    var listData = await listRes.json();
    var existing = (listData.tags || []).find(function(t) { return t.name === 'Signature Glam Test'; });

    if (existing) {
      tagId = existing.id;
      console.log('SGT tag found via list, id:', tagId);
    } else {
      // Tag doesn't exist yet — create it
      var createRes  = await fetch(BASE + '/tags', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_secret: API_SECRET, tag: { name: 'Signature Glam Test' } })
      });
      var createData = await createRes.json();
      tagId = createData.id;
      console.log('SGT tag created, id:', tagId, 'status:', createRes.status);
    }

    if (!tagId) {
      console.error('Could not get SGT tag id. List response:', JSON.stringify(listData).slice(0, 200));
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ success: false, error: 'Tag lookup failed' })
      };
    }

    // ── Step 2: Subscribe via tag — this creates or updates the subscriber ──
    var subPayload = {
      api_secret: API_SECRET,
      email:      email
    };
    if (firstName) subPayload.first_name = firstName;

    // Custom fields (must exist in Kit dashboard under Subscribers > Fields)
    var fields = {};
    if (glamType) fields.beauty_trinity_core   = glamType;
    if (moon)     fields.beauty_trinity_moon    = moon;
    if (rising)   fields.beauty_trinity_rising  = rising;
    if (source)   fields.sgt_source             = source;
    if (Object.keys(fields).length) subPayload.fields = fields;

    var subRes  = await fetch(BASE + '/tags/' + tagId + '/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subPayload)
    });
    var subBody = await subRes.json();
    console.log('Subscribe response:', subRes.status, JSON.stringify(subBody).slice(0, 300));

    if (!subRes.ok) {
      console.error('Subscribe failed:', subRes.status, JSON.stringify(subBody));
      return {
        statusCode: subRes.status,
        headers: CORS,
        body: JSON.stringify({ success: false, error: subBody })
      };
    }

    // ── Subscriber captured — fire-and-forget non-blocking tasks ────────────
    if (source) applySourceTagAsync(API_SECRET, BASE, email, source);
    logToSheetAsync(email, firstName, glamType, moon, rising, source);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('kit-subscribe unhandled error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

// ── Fire-and-forget: log SGT result to Google Sheet ─────────────────────────
function logToSheetAsync(email, firstName, glamType, moon, rising, source) {
  var APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) {
    console.log('APPS_SCRIPT_URL not set, skipping sheet log');
    return;
  }

  (async function() {
    try {
      var payload = JSON.stringify({
        type:      'sgt',
        email:     email,
        firstName: firstName,
        glamType:  glamType,
        moon:      moon,
        rising:    rising,
        source:    source,
        timestamp: new Date().toISOString()
      });

      // GAS web apps redirect POST → GET to retrieve the response.
      // Using default redirect:'follow' lets fetch convert to GET automatically.
      // Content-Type text/plain avoids a CORS preflight that can break GAS.
      var res = await fetch(APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    payload
      });

      var body = await res.text();
      console.log('GAS status:', res.status);
      console.log('GAS body:', body.slice(0, 150));
    } catch (e) {
      console.log('Sheet log error (non-fatal):', e.message);
    }
  })();
}

// ── Fire-and-forget: apply event source as a second tag ─────────────────────
function applySourceTagAsync(apiSecret, base, email, source) {
  (async function() {
    try {
      var tagRes  = await fetch(base + '/tags', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_secret: apiSecret, tag: { name: source } })
      });
      var tagData = await tagRes.json();
      var tagId   = tagData.id;
      if (!tagId) return;

      await fetch(base + '/tags/' + tagId + '/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_secret: apiSecret, email: email })
      });
    } catch (e) {
      console.log('Source tag error (non-fatal):', e.message);
    }
  })();
}
