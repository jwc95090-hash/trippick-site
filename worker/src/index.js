const SYSTEM_PROMPT = `당신은 한국 캠핑 예약 서비스 TRIPPICK의 친절한 AI 캠핑 도우미입니다.
한국어로 짧고 실용적으로 답하세요. 캠핑장, 글램핑, 카라반, 차박, 준비물, 반려동물 동반, 예약 전 확인사항을 안내합니다.
실시간 재고, 실제 가격, 예약 확정 여부를 알고 있다고 주장하지 마세요. 해당 정보는 사이트 상세 페이지에서 확인하도록 안내하세요.
응급·안전 상황에는 119 또는 관계 기관에 문의하도록 안내하세요. 개인정보나 결제정보를 요청하지 마세요.`;

const requestLog = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;

const json = (body, status, origin) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  }
});

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://jwc95090-hash.github.io';
    const origin = request.headers.get('Origin') || '';
    const corsOrigin = origin === allowedOrigin ? allowedOrigin : allowedOrigin;

    if (request.method === 'OPTIONS') {
      if (origin !== allowedOrigin) return json({ error: '허용되지 않은 출처입니다.' }, 403, corsOrigin);
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    if (request.method !== 'POST') return json({ error: 'POST 요청만 지원합니다.' }, 405, corsOrigin);
    if (origin !== allowedOrigin) return json({ error: '허용되지 않은 출처입니다.' }, 403, corsOrigin);
    if (!env.GROQ_API_KEY) return json({ error: '서버에 GROQ_API_KEY가 설정되지 않았습니다.' }, 500, corsOrigin);

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > 20_000) return json({ error: '요청 내용이 너무 깁니다.' }, 413, corsOrigin);

    const clientId = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = Date.now();
    const recent = (requestLog.get(clientId) || []).filter(time => now - time < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) return json({ error: '요청이 너무 많습니다. 1분 후 다시 시도해 주세요.' }, 429, corsOrigin);
    recent.push(now);
    requestLog.set(clientId, recent);

    let body;
    try { body = await request.json(); }
    catch (_) { return json({ error: '올바른 JSON 요청이 아닙니다.' }, 400, corsOrigin); }

    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const messages = incoming.slice(-10).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: String(item.content || '').trim().slice(0, 500)
    })).filter(item => item.content);

    if (!messages.length) return json({ error: '질문을 입력해 주세요.' }, 400, corsOrigin);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.6,
        max_completion_tokens: 500
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = response.status === 429 ? '무료 사용량 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.' : 'AI 응답을 가져오지 못했습니다.';
      return json({ error: message }, response.status === 429 ? 429 : 502, corsOrigin);
    }

    const answer = result?.choices?.[0]?.message?.content?.trim();
    return json({ answer: answer || '답변을 만들지 못했어요. 다시 질문해 주세요.' }, 200, corsOrigin);
  }
};
