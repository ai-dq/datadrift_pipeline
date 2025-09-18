import { NextRequest } from 'next/server';

import { proxyExternalRequest } from '@/lib/server/external-proxy';

type RouteHandler = (request: NextRequest) => Promise<Response>;

const handle: RouteHandler = (request) => proxyExternalRequest(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
export const HEAD = handle;
