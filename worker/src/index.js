const SYSTEM_PROMPT = `당신은 한국 캠핑 예약 서비스 TRIPPICK의 친절한 AI 캠핑 도우미입니다.
한국어로 짧고 실용적으로 답하세요. 캠핑장, 글램핑, 카라반, 차박, 준비물, 반려동물 동반, 예약 전 확인사항을 안내합니다.
실시간 재고, 실제 가격, 예약 확정 여부를 알고 있다고 주장하지 마세요. 해당 정보는 사이트 상세 페이지에서 확인하도록 안내하세요.
응급·안전 상황에는 119 또는 관계 기관에 문의하도록 안내하세요. 개인정보나 결제정보를 요청하지 마세요.`;

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
const GOCAMPING_URL = 'https://apis.data.go.kr/B551011/GoCamping/basedList';
const ORDER_ID_PATTERN = /^TRIPPICK_[A-Za-z0-9_-]{6,55}$/;

// 허용할 origin 목록 (배포 주소 + 로컬 개발 주소)
const DEFAULT_ALLOWED_ORIGINS = [
  'https://jwc95090-hash.github.io',
  'http://127.0.0.1:5501',
  'http://localhost:5501',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];

const getAllowedOrigins = (env) => {
  if (env.ALLOWED_ORIGIN) {
    // 환경변수에 콤마로 여러 개 넣으면 그것도 지원
    return env.ALLOWED_ORIGIN.split(',').map(o => o.trim());
  }
  return DEFAULT_ALLOWED_ORIGINS;
};

const json = (body, status, origin) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  }
});

const readJson = async (request, maxBytes) => {
  if (!request.body) throw new Error('EMPTY_BODY');
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('BODY_TOO_LARGE');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
};

const rateLimitKey = async (request, scope) => {
  const fingerprint = [
    scope,
    request.headers.get('CF-Connecting-IP') || 'unknown',
    request.headers.get('User-Agent') || 'unknown'
  ].join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const isRateLimited = async (request, env, scope) => {
  const binding = scope === 'payment' ? env.PAYMENT_RATE_LIMITER : env.CHAT_RATE_LIMITER;
  if (!binding) return false;
  const { success } = await binding.limit({ key: await rateLimitKey(request, scope) });
  return !success;
};

const confirmTossPayment = async (request, env, corsOrigin) => {
  if (!env.TOSS_SECRET_KEY) {
    return json({ error: '서버에 토스페이먼츠 비밀 키가 설정되지 않았습니다.' }, 500, corsOrigin);
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > 4_000) return json({ error: '요청 내용이 너무 깁니다.' }, 413, corsOrigin);
  if (await isRateLimited(request, env, 'payment')) {
    return json({ error: '결제 승인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429, corsOrigin);
  }

  let body;
  try { body = await readJson(request, 4_000); }
  catch (error) {
    return json({ error: error.message === 'BODY_TOO_LARGE' ? '요청 내용이 너무 깁니다.' : '올바른 JSON 요청이 아닙니다.' }, error.message === 'BODY_TOO_LARGE' ? 413 : 400, corsOrigin);
  }

  const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey.trim() : '';
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const amount = Number(body.amount);
  const expectedAmount = Number(env.TOSS_ORDER_AMOUNT || 71_200);

  if (!paymentKey || paymentKey.length > 200 || !ORDER_ID_PATTERN.test(orderId)) {
    return json({ error: '결제 승인 정보가 올바르지 않습니다.' }, 400, corsOrigin);
  }
  if (!Number.isSafeInteger(amount) || amount !== expectedAmount) {
    return json({ error: '결제 금액이 주문 금액과 일치하지 않습니다.' }, 400, corsOrigin);
  }

  let tossResponse;
  try {
    tossResponse = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${env.TOSS_SECRET_KEY}:`)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentKey, orderId, amount: expectedAmount })
    });
  } catch (_) {
    return json({ error: '토스페이먼츠 서버에 연결하지 못했습니다.' }, 502, corsOrigin);
  }

  const result = await tossResponse.json().catch(() => ({}));
  if (!tossResponse.ok) {
    return json({
      error: typeof result.message === 'string' ? result.message : '결제 승인에 실패했습니다.',
      code: typeof result.code === 'string' ? result.code : 'PAYMENT_CONFIRM_FAILED'
    }, tossResponse.status >= 500 ? 502 : 400, corsOrigin);
  }

  return json({
    ok: true,
    payment: {
      paymentKey: result.paymentKey,
      orderId: result.orderId,
      status: result.status,
      method: result.method,
      totalAmount: result.totalAmount,
      approvedAt: result.approvedAt,
      receiptUrl: result.receipt?.url || null
    }
  }, 200, corsOrigin);
};

const answerChat = async (request, env, corsOrigin) => {
  if (!env.GROQ_API_KEY) {
    return json({ error: '서버에 GROQ_API_KEY가 설정되지 않았습니다.' }, 500, corsOrigin);
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > 20_000) return json({ error: '요청 내용이 너무 깁니다.' }, 413, corsOrigin);
  if (await isRateLimited(request, env, 'chat')) {
    return json({ error: '요청이 너무 많습니다. 1분 후 다시 시도해 주세요.' }, 429, corsOrigin);
  }

  let body;
  try { body = await readJson(request, 20_000); }
  catch (error) {
    return json({ error: error.message === 'BODY_TOO_LARGE' ? '요청 내용이 너무 깁니다.' : '올바른 JSON 요청이 아닙니다.' }, error.message === 'BODY_TOO_LARGE' ? 413 : 400, corsOrigin);
  }

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
};

const serveCamping = async (env, corsOrigin) => {
  if (!env.GOCAMPING_SERVICE_KEY) {
    return json({ error: '서버에 고캠핑 API 키가 설정되지 않았습니다.' }, 500, corsOrigin);
  }
  const upstreamUrl = new URL(GOCAMPING_URL);
  upstreamUrl.search = new URLSearchParams({
    serviceKey: env.GOCAMPING_SERVICE_KEY,
    numOfRows: '300',
    pageNo: '1',
    MobileOS: 'ETC',
    MobileApp: 'Trippick',
    _type: 'json'
  }).toString();

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, { cf: { cacheTtl: 900, cacheEverything: true } });
  } catch (_) {
    return json({ error: '고캠핑 데이터 서버에 연결하지 못했습니다.' }, 502, corsOrigin);
  }
  if (!upstream.ok) return json({ error: '고캠핑 데이터를 불러오지 못했습니다.' }, 502, corsOrigin);
  const contentLength = Number(upstream.headers.get('Content-Length') || 0);
  if (contentLength > 4_000_000) return json({ error: '고캠핑 응답이 허용 크기를 초과했습니다.' }, 502, corsOrigin);

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': corsOrigin,
      'Vary': 'Origin',
      'Cache-Control': 'public, max-age=900'
    }
  });
};

export default {
  async fetch(request, env) {
    const allowedOrigins = getAllowedOrigins(env);
    const origin = request.headers.get('Origin') || '';
    const isAllowed = allowedOrigins.includes(origin);
    const corsOrigin = isAllowed ? origin : allowedOrigins[0];

    if (request.method === 'OPTIONS') {
      if (!isAllowed) return json({ error: '허용되지 않은 출처입니다.' }, 403, corsOrigin);
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    }

    if (!isAllowed) return json({ error: '허용되지 않은 출처입니다.' }, 403, corsOrigin);

    const pathname = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (pathname === '/camping' && request.method === 'GET') return serveCamping(env, corsOrigin);
    if (request.method !== 'POST') return json({ error: '지원하지 않는 요청 방식입니다.' }, 405, corsOrigin);
    if (pathname === '/payments/confirm') return confirmTossPayment(request, env, corsOrigin);
    if (pathname === '/' || pathname === '/chat') return answerChat(request, env, corsOrigin);
    return json({ error: '요청한 API 경로를 찾을 수 없습니다.' }, 404, corsOrigin);
  }
};
