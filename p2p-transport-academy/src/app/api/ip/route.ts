// src/app/api/ip/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Cloudflare populates this proxy header automatically for all incoming traffic regardless of runtime choice
  const cloudflareIp = request.headers.get('cf-connecting-ip');
  
  // Alternative fallback headers for standard proxies
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  
  // Fallback to standard loopback address if developing locally
  const realPublicIp = cloudflareIp || forwardedIp || '127.0.0.1';

  return NextResponse.json({ 
    ip: realPublicIp,
    provider: cloudflareIp ? 'Cloudflare Global Edge Proxy' : 'Local Host Development Environment'
  });
}
