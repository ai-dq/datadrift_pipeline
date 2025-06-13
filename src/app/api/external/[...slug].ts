import { NextRequest, NextResponse } from 'next/server';

const CORE_API_PORT = process.env.CORE_API_PORT || '9030';

async function handler(
  req: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const { slug } = params;
  const path = slug.join('/');

  // 전체 대상 URL 구성
  const targetUrl = `http://api:${CORE_API_PORT}/v1/${path}`;

  // 원본 요청의 검색 파라미터(query string) 전달
  const searchParams = req.nextUrl.search;
  const urlWithParams = `${targetUrl}${searchParams}`;

  try {
    const response = await fetch(urlWithParams, {
      method: req.method,
      headers: {
        ...(req.headers.get('Content-Type') && {
          'Content-Type': req.headers.get('Content-Type')!,
        }),
        ...(req.headers.get('Authorization') && {
          Authorization: req.headers.get('Authorization')!,
        }),
      },
      body:
        req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    const responseBody = await response.text();
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding');

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[API Proxy Error] ${req.method} ${urlWithParams}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Proxy request failed', details: errorMessage },
      { status: 502 }, // Bad Gateway
    );
  }
}

export {
  handler as DELETE,
  handler as GET,
  handler as HEAD,
  handler as OPTIONS,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
