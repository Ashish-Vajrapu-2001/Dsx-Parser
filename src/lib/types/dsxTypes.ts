export interface DSXParameter {
  name: string;
  prompt: string;
  default: string;
  help: string;
  type: string;
}

export interface DSXColumn {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  derivation?: string; // Added for transformation tracking
}

export interface DSXSource {
  name: string;
  type: string;
  sql?: string;
  table?: string;
  connection?: string;
  database?: string;
  where_clauses?: string[];
  columns?: DSXColumn[];
}

export interface DSXTarget {
  name: string;
  type: string;
  table?: string;
  dataset?: string;
  mode?: string;
  connection?: string;
  database?: string;
  columns?: DSXColumn[];
}

export interface DSXTransform {
  name: string;
  rules: string[];
  input?: string;       // Added from Python implementation
  output?: string;      // Added from Python implementation
  reject_conditions?: string[]; // Added from Python implementation
}

export interface DSXLookup {
  name: string;
  type: string;
  inputs: string[];
  output: string;
  key_columns: string[];
  fail_mode: string;
  lookup_type?: string;
  residual_handling?: string;
}

export interface DSXFlowConnection {
  link: string;         // Added from Python implementation
  from: string;
  to: string;
  columns?: DSXColumn[]; // Added from Python implementation
}

export interface DSXJobInfo {
  name: string;
  description: string;
  type: string;
  parameters: DSXParameter[];
  sources: DSXSource[];
  targets: DSXTarget[];
  transforms: DSXTransform[];
  sql_scripts: DSXSqlScript[];
  lookups: DSXLookup[];
  filters: DSXFilter[];
  specialized_stages: any[];
  flow: DSXFlow[];
  metadata: {
    extractedAt: string;
    version: string;
    tokenCount?: number;
  };
}

// Added token estimation types
export interface TokenUsage {
  total: number;
  breakdown: Record<string, number>;
}

export interface ProcessingResult {
  originalFile: string;
  data: DSXJobInfo;
  validation?: {
    valid: boolean;
    issues: string[];
  };
  tokenUsage?: TokenUsage;
}

export interface ProcessingProgress {
  total: number;
  processed: number;
  currentFile: string;
}

export interface DSXSqlScript {
  stage: string;
  type: string;  // e.g. "BeforeSQL", "AfterSQL", "SelectStatement"
  sql: string;
}

export interface DSXFilter {
  name: string;
  condition: string;
  input?: string;
  output?: string;
}

export interface DSXFlow {
  link: string;
  from: string;
  to: string;
  columns?: DSXColumn[];
}