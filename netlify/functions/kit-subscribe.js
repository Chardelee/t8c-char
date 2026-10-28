// netlify/functions/kit-subscribe.js
// Adds new quiz subscribers to Kit with Beauty Trinity tags

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
    var data = JSON.parse(event.body);
    var email    = data.email    || '';
    var firstName = data.firstName || '';
    var glamType  = data.glamType  || '';
    var moon      = data.moon      || '';
    var rising    = data.rising    || '';
    var skinType  = data.skinType  || '';
    var source    = data.source    || '';

    if (!email) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email required' }) };
    }

    var API_KEY = process.env.KIT_API_KEY;
    var BASE    = 'https://api.kit.com/v4';
    var headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY
    };

    // ── 1. Create / update subscriber ──────────────────────────────────
    var subRes  = await fetch(BASE + '/subscribers', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ email_address: email, first_name: firstName })
    });
    var subData = await subRes.json();

    if (!subRes.ok) {
      return { statusCode: subRes.status, headers: CORS, body: JSON.stringify({ error: subData }) };
    }

    var subscriberId = subData.subscriber.id;

    // ── 2. Build tag list ───────────────────────────────────────────────
    var tagNames = ['SGT Subscriber'];
    if (glamType) tagNames.push('Core: ' + glamType);
    if (moon)     tagNames.push('Moon: ' + moon);
    if (rising)   tagNames.push('Rising: ' + rising);
    if (source)   tagNames.push('Source: ' + source);

    // ── 3. Create each tag (idempotent) then apply to subscriber ────────
    for (var i = 0; i < tagNames.length; i++) {
      try {
        var tagRes  = await fetch(BASE + '/tags', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ name: tagNames[i] })
        });
        var tagData = await tagRes.json();
        var tagId   = tagData.tag && tagData.tag.id;

        if (tagId) {
          await fetch(BASE + '/subscribers/' + subscriberId + '/tags', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ tag_id: tagId })
          });
        }
      } catch (tagErr) {
        // one bad tag shouldn't kill the whole submission
        console.log('Tag error for "' + tagNames[i] + '":', tagErr.message);
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
