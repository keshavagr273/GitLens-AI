import { parseSymbols, calculateComplexity } from './symbol-parser';
import { extractImports, resolveImportPath } from './import-resolver';
import { extractCallEdges, extractHeritageEdges } from './call-graph';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('🧪 Starting Phase 2 Parser-Core Quality Test Suite...\n');

// 1. Symbol Extraction Tests (CP-2.1)
console.log('--- CP-2.1: AST Symbol Extraction & Metrics ---');

const sampleCode = `
export class OrderService extends BaseService implements IOrderProcessor {
  private repository: OrderRepository;

  constructor() {
    super();
    this.repository = new OrderRepository();
  }

  async create(items: any[], paymentMethod: string): Promise<Order> {
    if (!items || items.length === 0) {
      throw new Error("Empty items");
    }
    for (const item of items) {
      if (item.qty <= 0) {
        throw new Error("Invalid quantity");
      }
    }
    const order = await this.repository.save(items);
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    return this.repository.find(id);
  }
}

export function helperFunction(a: number, b: string): boolean {
  return a > 0 ? true : false;
}

export interface IOrderProcessor {
  process(id: string): void;
}
`;

const result = parseSymbols('file-order-service', sampleCode, 'typescript');
assert(result.symbols.length >= 4, `Extracted ${result.symbols.length} symbols (>= 4 expected)`);

const classSym = result.symbols.find((s) => s.name === 'OrderService' && s.kind === 'class');
assert(!!classSym, 'Class symbol OrderService extracted');

const methodCreate = result.symbols.find((s) => s.name === 'create' && s.kind === 'method');
assert(!!methodCreate, 'Method create extracted');
assert(methodCreate?.parentId === classSym?.id, 'Method parentId links correctly to class symbol');
assert(methodCreate?.metrics.cyclomaticComplexity! >= 3, `Cyclomatic complexity >= 3 (actual: ${methodCreate?.metrics.cyclomaticComplexity})`);
assert(methodCreate?.metrics.parameterCount === 2, `Parameter count is 2 (actual: ${methodCreate?.metrics.parameterCount})`);

const ifaceSym = result.symbols.find((s) => s.name === 'IOrderProcessor' && s.kind === 'interface');
assert(!!ifaceSym, 'Interface symbol IOrderProcessor extracted');

// 2. Import & Path Resolution Tests (CP-2.2)
console.log('\n--- CP-2.2: Import & Path Resolution ---');

const importCode = `
import Fastify, { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';
import { verifyJwt } from '@/middleware/jwt.middleware';
import * as db from './db';
`;

const knownFiles = [
  'src/controllers/auth.controller.ts',
  'src/middleware/jwt.middleware.ts',
  'src/routes/db/index.ts',
];

const imports = extractImports('src/routes/auth.routes.ts', importCode, knownFiles);
assert(imports.length === 4, `Extracted ${imports.length} imports (4 expected)`);

const extFastify = imports.find((i) => i.targetSpecifier === 'fastify');
assert(!!extFastify && extFastify.isExternal, 'External package fastify flagged as external');

const relativeAuth = imports.find((i) => i.targetSpecifier === '../controllers/auth.controller');
assert(!!relativeAuth && !relativeAuth.isExternal, 'Relative import resolved internally');

// 3. Call Graph & Heritage Tests
console.log('\n--- CP-2.2: Call Graph & Class Heritage Extraction ---');

const callCode = `
const order = await this.repository.save(items);
const payment = await paymentClient.charge(amount);
`;

const calls = extractCallEdges(callCode, ['this.repository.save']);
assert(calls.length >= 2, `Extracted ${calls.length} calls (>= 2 expected)`);

const heritage = extractHeritageEdges(sampleCode);
const extendsClause = heritage.find((h) => h.childSymbol === 'OrderService' && h.type === 'EXTENDS');
assert(extendsClause?.parentSymbol === 'BaseService', 'Extracted EXTENDS BaseService');

const implementsClause = heritage.find((h) => h.childSymbol === 'OrderService' && h.type === 'IMPLEMENTS');
assert(implementsClause?.parentSymbol === 'IOrderProcessor', 'Extracted IMPLEMENTS IOrderProcessor');

// 4. Parser Fault Isolation Test (CP-2.3)
console.log('\n--- CP-2.3: Parser Fault Boundary ---');

const brokenCode = `function invalidSyntax( { let x = ;`;
const faultResult = parseSymbols('file-corrupted', brokenCode);
assert(Array.isArray(faultResult.symbols), 'Fault boundary handled corrupted syntax without unhandled exception');

console.log('\n🎉 ALL PHASE 2 PARSER-CORE TESTS PASSED CLEANLY!\n');
