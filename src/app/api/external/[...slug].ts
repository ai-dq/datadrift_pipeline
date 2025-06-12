import { NextRequest, NextResponse } from 'next/server';

const CORE_API_PORT = process.env.CORE_API_PORT || '9030';

async function handler(req: NextRequest, { params }: { params: { slug: string[] } }) {
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
        ...(req.headers.get('Content-Type') && { 'Content-Type': req.headers.get('Content-Type')! }),
        ...(req.headers.get('Authorization') && { 'Authorization': req.headers.get('Authorization')! }),
        // 필요한 경우 여기에 다른 헤더들을 추가합니다.
      },
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? req.body : undefined,
      // @ts-ignore
      duplex: 'half', // 스트리밍 요청/응답을 위해 필요할 수 있습니다.
    });

    const responseBody = await response.text();
    const responseHeaders = new Headers(response.headers);
    // 특정 헤더(예: content-encoding)는 문제를 일으킬 수 있으므로 제거하는 것이 좋습니다.
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding'); // 청크 인코딩 관련 헤더도 제거

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(`[API Proxy Error] ${req.method} ${urlWithParams}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Proxy request failed', details: errorMessage },
      { status: 502 } // Bad Gateway
    );
  }
}

export { handler as DELETE, handler as GET, handler as HEAD, handler as OPTIONS, handler as PATCH, handler as POST, handler as PUT };

