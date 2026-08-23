import { ApiRoute } from '@gitlens/shared-types';
import { generateUuid } from '@gitlens/utils';

export interface ExtractedRouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handlerName?: string;
  startLine: number;
  middleware: string[];
}

export interface RouterMountInfo {
  prefix: string;
  routerName: string;
  sourceFile: string;
}

export function detectRoutes(
  fileId: string,
  filePath: string,
  content: string,
  mountPrefixes: RouterMountInfo[] = []
): ApiRoute[] {
  const routes: ApiRoute[] = [];
  if (!content) return routes;

  const lines = content.split('\n');

  // 1. Check for Next.js App Router route handlers (app/api/**/route.ts)
  if (filePath.includes('app/api/') && (filePath.endsWith('route.ts') || filePath.endsWith('route.js'))) {
    const nextRoutePath = filePath
      .replace(/^.*app\/api\//, '/api/')
      .replace(/\/route\.(ts|js)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1'); // convert Next.js [id] to :id

    const nextMethods: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'> = [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const method of nextMethods) {
        const regex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`);
        if (regex.test(line)) {
          routes.push({
            id: `route-next-${generateUuid().slice(0, 6)}`,
            analysisId: 'analysis-current',
            method,
            path: nextRoutePath === '/api' ? '/' : nextRoutePath,
            fileId,
            filePath,
            handlerName: method,
            startLine: i + 1,
            middleware: [],
          });
        }
      }
    }
    if (routes.length > 0) return routes;
  }

  // 2. Check for NestJS Controller (@Controller('orders'))
  const nestControllerMatch = content.match(/@Controller\s*\(\s*['"]?([^'")]*)['"]?\s*\)/);
  if (nestControllerMatch) {
    const classPrefix = nestControllerMatch[1] ? `/${nestControllerMatch[1].replace(/^\//, '')}` : '';
    const nestMethodRegex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"]?([^'")]*)['"]?\s*\)\s*\n\s*(?:async\s+)?([A-Za-z0-9_$]+)\s*\(/g;

    let match: RegExpExecArray | null;
    while ((match = nestMethodRegex.exec(content)) !== null) {
      const httpMethod = match[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      const subPath = match[2] ? `/${match[2].replace(/^\//, '')}` : '';
      const handlerName = match[3];
      const lineNum = content.slice(0, match.index).split('\n').length;

      const fullPath = `${classPrefix}${subPath}` || '/';

      routes.push({
        id: `route-nest-${generateUuid().slice(0, 6)}`,
        analysisId: 'analysis-current',
        method: httpMethod,
        path: fullPath.replace(/\/\//g, '/'),
        fileId,
        filePath,
        handlerName,
        startLine: lineNum,
        middleware: [],
      });
    }
    if (routes.length > 0) return routes;
  }

  // 3. Fastify & Express standard router invocations
  // Matches: (fastify|app|router|server).(get|post|put|delete|patch)('/path', [middleware], handler)
  const routeRegex = /(?:fastify|app|router|server)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:\{[^}]*schema:[^}]*\}\s*,\s*)?(?:(\[[^\]]+\])\s*,\s*)?(?:async\s*)?(?:(?:\(([^)]*)\))|([A-Za-z0-9_$.]+))/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    routeRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = routeRegex.exec(line)) !== null) {
      const httpMethod = match[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      let rawPath = match[2];
      const middlewareStr = match[3];
      const handlerParam = match[4];
      const handlerSymbol = match[5];

      // Resolve mount prefixes if router is mounted with app.use('/api', router)
      const mount = mountPrefixes.find((m) => filePath.includes(m.sourceFile));
      if (mount) {
        rawPath = `${mount.prefix}/${rawPath.replace(/^\//, '')}`;
      }

      // Extract middleware names
      const middleware: string[] = [];
      if (middlewareStr) {
        const names = middlewareStr
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        middleware.push(...names);
      }

      const handlerName = handlerSymbol || (handlerParam ? 'inlineHandler' : undefined);

      routes.push({
        id: `route-${httpMethod.toLowerCase()}-${rawPath.replace(/[^a-zA-Z0-9]/g, '_')}-${generateUuid().slice(0, 4)}`,
        analysisId: 'analysis-current',
        method: httpMethod,
        path: rawPath.startsWith('/') ? rawPath : `/${rawPath}`,
        fileId,
        filePath,
        handlerName,
        startLine: lineNum,
        middleware,
      });
    }

    // 4. Fastify fastify.route({ method: 'GET', url: '/path', handler: ... })
    const fastifyRouteBlock = /fastify\.route\s*\(\s*\{([^}]+)\}/g;
    fastifyRouteBlock.lastIndex = 0;
    let fMatch: RegExpExecArray | null;
    while ((fMatch = fastifyRouteBlock.exec(line)) !== null) {
      const block = fMatch[1];
      const methodM = block.match(/method\s*:\s*['"]([^'"]+)['"]/);
      const urlM = block.match(/url\s*:\s*['"]([^'"]+)['"]/);
      const handlerM = block.match(/handler\s*:\s*([A-Za-z0-9_$.]+)/);

      if (methodM && urlM) {
        const method = methodM[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        routes.push({
          id: `route-fastify-${method.toLowerCase()}-${generateUuid().slice(0, 4)}`,
          analysisId: 'analysis-current',
          method,
          path: urlM[1].startsWith('/') ? urlM[1] : `/${urlM[1]}`,
          fileId,
          filePath,
          handlerName: handlerM ? handlerM[1] : 'inlineHandler',
          startLine: lineNum,
          middleware: [],
        });
      }
    }
  }

  return routes;
}

export function extractMountPrefixes(content: string, filePath: string): RouterMountInfo[] {
  const mounts: RouterMountInfo[] = [];
  if (!content) return mounts;

  // app.use('/api/v1', apiRouter) or fastify.register(plugin, { prefix: '/api/v1' })
  const expressUseRegex = /(?:app|router)\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z0-9_$]+)/g;
  let match: RegExpExecArray | null;
  while ((match = expressUseRegex.exec(content)) !== null) {
    mounts.push({
      prefix: match[1].replace(/\/$/, ''),
      routerName: match[2],
      sourceFile: filePath,
    });
  }

  const fastifyRegisterRegex = /fastify\.register\s*\(\s*([A-Za-z0-9_$]+)\s*,\s*\{\s*prefix\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = fastifyRegisterRegex.exec(content)) !== null) {
    mounts.push({
      prefix: match[2].replace(/\/$/, ''),
      routerName: match[1],
      sourceFile: filePath,
    });
  }

  return mounts;
}
