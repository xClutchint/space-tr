const { send, parseBody, requireAuth, sameOrigin, clean, cleanList } = require('../_cms');

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  const authentication = await requireAuth(req, { mutation: true });
  if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
  if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: 'French translation is not connected yet.' });

  const body = parseBody(req), role = clean(body.role, 220), bio = cleanList(body.bio, 5, 3000);
  if (!role || !bio.length) return send(res, 400, { error: 'Add the role and English profile first.' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-5-mini',
        store: false,
        max_output_tokens: 3000,
        instructions: 'Translate the supplied SPACE team role and biography from English into polished, natural French. Preserve meaning, factual detail, tone and paragraph count exactly. Do not add claims, titles or facts.',
        input: JSON.stringify({ role, bio }),
        text: {
          format: {
            type: 'json_schema',
            name: 'space_team_translation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['roleFr', 'bioFr'],
              properties: {
                roleFr: { type: 'string' },
                bioFr: { type: 'array', items: { type: 'string' }, minItems: bio.length, maxItems: bio.length }
              }
            }
          }
        }
      }),
      signal: AbortSignal.timeout(60000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error?.message || 'Translation request failed.');
    const translated = JSON.parse(outputText(result));
    return send(res, 200, { roleFr: clean(translated.roleFr, 220), bioFr: cleanList(translated.bioFr, 5, 3000) });
  } catch (error) {
    return send(res, 502, { error: error.name === 'TimeoutError' ? 'Translation timed out. Try again.' : clean(error.message, 240) || 'Translation unavailable.' });
  }
};
