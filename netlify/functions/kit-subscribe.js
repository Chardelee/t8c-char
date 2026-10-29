// netlify/functions/kit-subscribe.js
// Adds SGT quiz subscribers to Kit using v4 API (Bearer token)

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

    var API_KEY = process.env.KIT_API_KEY;
    if (!API_KEY) {
      console.error('KIT_API_KEY env var is not set');
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: 'Server config error' })
      };
    }

    // ── Create / update subscriber (single API call — critical path) ───────
    var payload = {
      email_address: email
    };
    if (firstName) payload.first_name = firstName;

    // Custom fields — these must exist in Kit dashboard first
    // (Kit > Subscribers > Custom Fields)
    var fields = {};
    if (glamType) fields.beauty_trinity_core   = glamType;
    if (moon)     fields.beauty_trinity_moon    = moon;
    if (rising)   fields.beauty_trinity_rising  = rising;
    if (source)   fields.sgt_source             = source;
    if (Object.keys(fields).length) payload.fields = fields;

    var subRes = await fetch('https://api.kit.com/v4/subscribers', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      body: JSON.stringify(payload)
    });

    var subBody = await subRes.json();
    console.log('Kit v4 subscriber response:', subRes.status, JSON.stringify(subBody).slice(0, 300));

    if (!subRes.ok) {
      // Kit returns 422 for validation errors, 401 for bad key, etc.
      console.error('Kit subscriber creation failed:', subRes.status, JSON.stringify(subBody));
      return {
        statusCode: subRes.status,
        headers: CORS,
        body: JSON.stringify({ success: false, error: subBody })
      };
    }

    // ── Subscriber created — return success ────────────────────────────────
    // Tag assignment is non-blocking; we do NOT gate success on it.
    // Tags are nice-to-have for segmentation but the subscriber is what matters.
    tagSubscriberAsync(API_KEY, email, glamType, moon, rising, source);

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

// ── Fire-and-forget tag assignment ──────────────────────────────────────────
// Runs after we've already returned success to the client.
// If this fails it does NOT affect whether the subscriber was captured.
function tagSubscriberAsync(apiKey, email, glamType, moon, rising, source) {
  var tagNames = ['Signature Glam Test'];
  if (source) tagNames.push(source);

  // Best-effort: create tags and apply them; log errors but don't throw.
  (async function() {
    try {
      var BASE = 'https://api.kit.com/v4';
      for (var i = 0; i < tagNames.length; i++) {
        try {
          // Create tag (idempotent in Kit v4)
          var tagRes = await fetch(BASE + '/tags', {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({ name: tagNames[i] })
          });
          var tagBody = await tagRes.json();
          var tagId   = tagBody.tag && tagBody.tag.id;
          if (!tagId) { console.log('No tag id for:', tagNames[i]); continue; }

          // Apply tag to subscriber
          await fetch(BASE + '/tags/' + tagId + '/subscribers', {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({ email_address: email })
          });
        } catch (e) {
          console.log('Tag error (non-fatal):', tagNames[i], e.message);
        }
      }
    } catch (e) {
      console.log('tagSubscriberAsync error (non-fatal):', e.message);
    }
  })();
}
