import { NextRequest, NextResponse } from 'next/server';
// Avoid Node-only JWT verification in middleware (Edge). Decode payload only.

/**
 * HTTPS Middleware for Next.js
 * 
 * This middleware provides:
 * - HTTP to HTTPS redirection
 * - Security headers
 * - HSTS configuration
 * - Environment-based enforcement
 */

interface SecurityConfig {
  forceHttps: boolean;
  hstsMaxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
}

// Get security configuration from environment
function getSecurityConfig(): SecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceHttps = process.env.FORCE_HTTPS === 'true' || isProduction;
  
  return {
    forceHttps,
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10), // 1 year
    includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
    preload: process.env.HSTS_PRELOAD !== 'false',
  };
}

// Check if request is secure
function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedSsl = request.headers.get('x-forwarded-ssl');
  
  return (
    forwardedProto === 'https' ||
    forwardedSsl === 'on' ||
    request.nextUrl.protocol === 'https:'
  );
}

// Create HTTPS redirect URL
function createHttpsUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost';
  const url = request.nextUrl.clone();
  
  url.protocol = 'https:';
  url.host = host;
  
  return url.toString();
}

// Add security headers
function addSecurityHeaders(response: NextResponse, config: SecurityConfig): NextResponse {
  // HTTP Strict Transport Security
  if (config.forceHttps) {
    let hstsValue = `max-age=${config.hstsMaxAge}`;
    
    if (config.includeSubDomains) {
      hstsValue += '; includeSubDomains';
    }
    
    if (config.preload) {
      hstsValue += '; preload';
    }
    
    response.headers.set('Strict-Transport-Security', hstsValue);
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // X-Frame-Options (prevent clickjacking)
  response.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options (prevent MIME sniffing)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove X-Powered-By header
  response.headers.delete('X-Powered-By');
  
  // Permissions Policy
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
  ].join(', ');
  
  response.headers.set('Permissions-Policy', permissionsPolicy);
  
  return response;
}

// Main middleware function
export function middleware(request: NextRequest) {
  const config = getSecurityConfig();
  // Role-based route protection
  const adminOnlyPaths = ['/reports', '/banks', '/users', '/user-management', '/admin'];
  const urlPath = request.nextUrl.pathname;
  const needsAdmin = adminOnlyPaths.some(p => urlPath.startsWith(p));

  if (needsAdmin) {
    const tokenCookie = request.cookies.get('auth-token')?.value;
    if (!tokenCookie) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    try {
      const payload = tokenCookie.split('.')[1];
      const json = payload ? JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) : null;
      if (json?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  // Skip HTTPS redirection for development or if disabled
  if (!config.forceHttps) {
    return NextResponse.next();
  }
  
  // Skip HTTPS redirection for localhost in development
  if (request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1') {
    return NextResponse.next();
  }
  
  // Check if request is already secure
  if (isSecureRequest(request)) {
    // Request is already HTTPS, add security headers
    const response = NextResponse.next();
    return addSecurityHeaders(response, config);
  }
  
  // Redirect HTTP to HTTPS
  const httpsUrl = createHttpsUrl(request);
  
  console.log(`🔒 Redirecting HTTP to HTTPS: ${request.url} → ${httpsUrl}`);
  
  const response = NextResponse.redirect(httpsUrl, 301);
  
  // Add security headers to redirect response
  return addSecurityHeaders(response, config);
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - health (health check endpoint)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|health).*)',
  ],
};