// netlify/functions/kit-subscribe.js
// Adds new quiz subscribers to Kit using v3 API with API Secret

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
    var data       = JSON.parse(event.body);
    var email      = data.email      || '';
    var firstName  = data.firstName  || '';
    var glamType   = data.glamType   || '';
    var moon       = data.moon       || '';
    var rising     = data.rising     || '';
    var source     = data.source     || '';

    if (!email) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email required' }) };
    }

    var API_SECRET = process.env.KIT_API_KEY;
    var BASE       = 'https://api.convertkit.com/v3';

    // ── Build tag name list ────────────────────────────────────────────────
    var tagNames = ['SGT Subscriber'];
    if (glamType) tagNames.push('Core: ' + glamType);
    if (moon)     tagNames.push('Moon: ' + moon);
    if (rising)   tagNames.push('Rising: ' + rising);
    if (source)   tagNames.push('Source: ' + source);

    // ── Create each tag (idempotent), collect IDs ──────────────────────────
    var tagIds = [];
    for (var i = 0; i < tagNames.length; i++) {
      try {
        var tagRes  = await fetch(BASE + '/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_secret: API_SECRET, tag: { name: tagNames[i] } })
        });
        var tagData = await tagRes.json();
        if (tagData.id) tagIds.push(tagData.id);
      } catch (e) {
        console.log('Tag create error:', tagNames[i], e.message);
      }
    }

    // ── Subscribe via first tag (creates subscriber + applies tag) ─────────
    if (tagIds.length === 0) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'No tags created' }) };
    }

    var subRes = await fetch(BASE + '/tags/' + tagIds[0] + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_secret: API_SECRET,
        email:      email,
        first_name: firstName
      })
    });
    var subData = await subRes.json();

    if (!subRes.ok) {
      return { statusCode: subRes.status, headers: CORS, body: JSON.stringify({ error: subData }) };
    }

    // ── Apply remaining tags ───────────────────────────────────────────────
    for (var j = 1; j < tagIds.length; j++) {
      try {
        await fetch(BASE + '/tags/' + tagIds[j] + '/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_secret: API_SECRET, email: email })
        });
      } catch (e) {
        console.log('Tag apply error:', tagIds[j], e.message);
      }
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
