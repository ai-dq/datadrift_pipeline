import { NextRequest, NextResponse } from 'next/server';

const CORE_API_PORT = process.env.CORE_API_PORT || '9030';

// 전달하지 않을 헤더 목록
const EXCLUDED_REQUEST_HEADERS = [
  'host',
  'connection',
  'keep-alive',
  'upgrade',
  'te',
  'trailer',
  'transfer-encoding',
];

const EXCLUDED_RESPONSE_HEADERS = [
  'content-encoding',
  'transfer-encoding',
  'connection',
];

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  console.info(`🚀 PROXY REQUEST RECEIVED: ${request.method} ${request.url}`);
  console.info(`🔍 Environment CORE_API_PORT:`, CORE_API_PORT);

  // Extract params
  const path = params.slug.join('/');
  console.info(`🔍 Route params:`, params);
  console.info(`🔍 Constructed path: "${path}"`);

  // Build target URL
  const targetUrl = `http://api:${CORE_API_PORT}/v1/${path}`;
  const searchParams = request.nextUrl.search;
  const urlWithParams = `${targetUrl}${searchParams}`;
  console.info(`🎯 Final target URL: ${urlWithParams}`);

  try {
    const response = await fetch(urlWithParams, {
      method: request.method,
      headers: request.headers,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error(
      `[API Proxy Error] ${request.method} ${urlWithParams}:`,
      error,
    );
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = params.slug.join('/');
  const targetUrl = `http://api:${CORE_API_PORT}/v1/${path}`;
  const urlWithParams = `${targetUrl}${request.nextUrl.search}`;

  try {
    const response = await fetch(urlWithParams, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error(`[API Proxy Error] POST ${urlWithParams}:`, error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = params.slug.join('/');
  const targetUrl = `http://api:${CORE_API_PORT}/v1/${path}`;
  const urlWithParams = `${targetUrl}${request.nextUrl.search}`;

  try {
    const response = await fetch(urlWithParams, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error(`[API Proxy Error] PUT ${urlWithParams}:`, error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = params.slug.join('/');
  const targetUrl = `http://api:${CORE_API_PORT}/v1/${path}`;
  const urlWithParams = `${targetUrl}${request.nextUrl.search}`;

  try {
    const response = await fetch(urlWithParams, {
      method: request.method,
      headers: request.headers,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error(`[API Proxy Error] DELETE ${urlWithParams}:`, error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = params.slug.join('/');
  const targetUrl = `http://api:${CORE_API_PORT}/v1/${path}`;
  const urlWithParams = `${targetUrl}${request.nextUrl.search}`;

  try {
    const response = await fetch(urlWithParams, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error(`[API Proxy Error] PATCH ${urlWithParams}:`, error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 },
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = params.slug.join('/');
  const targetUrl = `http://api:${CORE_API_PORT}/v1/${path}`;
  const urlWithParams = `${targetUrl}${request.nextUrl.search}`;

  try {
    const response = await fetch(urlWithParams, {
      method: request.method,
      headers: request.headers,
    });

    return new NextResponse(null, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error(`[API Proxy Error] HEAD ${urlWithParams}:`, error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 },
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = new Headers();

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    );
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Max-Age', '86400');
  }

  return new NextResponse(null, { status: 204, headers });
}
