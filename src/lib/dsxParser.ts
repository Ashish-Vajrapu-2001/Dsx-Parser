import JSZip from 'jszip';
import { DSXJobInfo, DSXColumn, TokenUsage, ProcessingResult, ProcessingProgress } from './types/dsxTypes';

// Add a custom error class for DSX parsing errors
export class DSXParsingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DSXParsingError';
  }
}

// Add token estimation function from Python implementation
export const estimateTokenUsage = (data: DSXJobInfo): TokenUsage => {
  // Serialize to JSON for token counting
  const jsonStr = JSON.stringify(data);
  
  // Estimate token count (approx 4 chars per token as used in Python)
  const totalTokens = Math.ceil(jsonStr.length / 4);
  
  // Calculate breakdown by section
  const breakdown: Record<string, number> = {};
  
  for (const section of Object.keys(data)) {
    if (Array.isArray(data[section as keyof DSXJobInfo])) {
      const sectionData = data[section as keyof DSXJobInfo];
      const sectionJson = JSON.stringify(sectionData);
      breakdown[section] = Math.ceil(sectionJson.length / 4);
    }
  }
  
  // Add metadata and basic info
  const basicInfo = {
    name: data.name,
    description: data.description,
    type: data.type,
    metadata: data.metadata
  };
  breakdown.basic = Math.ceil(JSON.stringify(basicInfo).length / 4);
  
  return {
    total: totalTokens,
    breakdown
  };
};

export const extractDSXFilesFromZip = async (file: File): Promise<File[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const zip = await JSZip.loadAsync(event.target?.result as ArrayBuffer);
        const dsxFiles: File[] = [];

        // Use Promise.all to wait for all async blob operations
        const promises = Object.keys(zip.files)
          .filter(fileName => fileName.endsWith('.dsx'))
          .map(async (fileName) => {
            const zipEntry = zip.files[fileName];
            const blob = await zipEntry.async('blob');
            return new File([blob], zipEntry.name);
          });

        const files = await Promise.all(promises);
        resolve(files);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the zip file.'));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Extract DataStage job information from DSX format
export const extractDSXJobInfo = (dsx_content: string, includeTokenCount: boolean = false): DSXJobInfo => {
  // Initialize result dictionary with enhanced structure
  const result: DSXJobInfo = {
    name: "",
    description: "",
    type: "",
    parameters: [],
    sources: [],
    targets: [],
    transforms: [],
    sql_scripts: [],
    lookups: [],
    filters: [],
    specialized_stages: [],
    flow: [],
    metadata: {
      extractedAt: new Date().toISOString(),
      version: "1.2.0" // Updated version to reflect enhanced extraction
    }
  };

  // Extract job name
  const jobNameMatch = dsx_content.match(/Identifier "([^"]+)"/);
  if (jobNameMatch) {
    result.name = jobNameMatch[1];
  }

  // Extract job description
  const descMatch = dsx_content.match(/FullDescription =\+=\+=\+=([\s\S]*?)=\+=\+=\+=/);
  if (descMatch) {
    const fullDesc = descMatch[1].trim();
    // Extract first paragraph or use full description
    const firstPara = fullDesc.split('\r\n\r\n')[0] || fullDesc;
    result.description = firstPara.replace(/\r?\n/g, ' ').trim();
  }

  // Extract job type
  const jobTypeMatch = dsx_content.match(/JobType "([^"]+)"/);
  if (jobTypeMatch) {
    const jobTypeCode = jobTypeMatch[1];
    const jobTypeMap: Record<string, string> = {
      "0": "Server Job",
      "1": "Parallel Job",
      "2": "Sequence Job",
      "3": "Server Routine"
    };
    result.type = jobTypeMap[jobTypeCode] || `Unknown (${jobTypeCode})`;
  }

  // Extract parameters
  const paramRegex = /BEGIN DSSUBRECORD\s+Name "([^"]+)"\s+Prompt "([^"]*)"\s+Default "([^"]*)"\s+(?:HelpTxt "([^"]*)"\s+)?ParamType "([^"]+)"/g;
  let paramMatch;
  while ((paramMatch = paramRegex.exec(dsx_content)) !== null) {
    const paramName = paramMatch[1];
    const paramPrompt = paramMatch[2];
    const paramDefault = paramMatch[3];
    const paramHelp = paramMatch[4] || "";
    const paramType = paramMatch[5];

    // Map parameter type codes to readable names
    const paramTypeMap: Record<string, string> = {
      "1": "String",
      "2": "Integer",
      "3": "Float",
      "4": "Pathname",
      "5": "List",
      "6": "Date",
      "7": "Time",
      "8": "Timestamp",
      "13": "EnvironmentVar"
    };

    result.parameters.push({
      name: paramName,
      prompt: paramPrompt,
      default: paramDefault,
      help: paramHelp,
      type: paramTypeMap[paramType] || `Unknown (${paramType})`
    });
  }

  // Extract stages from stage list
  const stageListMatch = dsx_content.match(/StageList "(.*?)"/);
  const stageNamesMatch = dsx_content.match(/StageNames "(.*?)"/);

  if (stageListMatch && stageNamesMatch) {
    const stageIds = stageListMatch[1].split('|');
    const stageNames = stageNamesMatch[1].split('|').map(s => s.trim());
    
    const stageMap: Record<string, string> = {};
    
    for (let i = 0; i < stageIds.length; i++) {
      if (i < stageNames.length && stageNames[i] !== " ") {
        stageMap[stageIds[i]] = stageNames[i];
      }
    }
    
    // Extract stage types
    const stageTypeRegex = /BEGIN DSRECORD[\s\S]*?Name "([^"]+)"[\s\S]*?StageType "([^"]+)"[\s\S]*?END DSRECORD/g;
    let stageMatch;
    const stageTypeMap: Record<string, string> = {};
    
    while ((stageMatch = stageTypeRegex.exec(dsx_content)) !== null) {
      const stageName = stageMatch[1];
      const stageType = stageMatch[2];
      if (stageName && stageName !== " " && stageType) {
        stageTypeMap[stageName] = stageType;
      }
    }
    
    // Extract source and target information
    const xmlPropsRegex = /XMLProperties[\s\S]*?Value =\+=\+=\+=([\s\S]*?)=\+=\+=\+=/g;
    let xmlMatch;
    
    while ((xmlMatch = xmlPropsRegex.exec(dsx_content)) !== null) {
      const xmlContent = xmlMatch[1];
      const contextMatch = xmlContent.match(/<Context[^>]*>(\d+)<\/Context>/);
      
      // Extract stage name from preceding record
      const recordContent = dsx_content.substring(0, xmlMatch.index).split("BEGIN DSRECORD").pop() || "";
      const stageNameMatch = recordContent.match(/Name "([^"]+)"/);
      
      if (!stageNameMatch) continue;
      
      const stageName = stageNameMatch[1];
      
      // Process based on context
      if (contextMatch) {
        const context = parseInt(contextMatch[1], 10);
        
        if (context === 1) { // Source context
          const source: any = {
            name: stageName,
            type: stageTypeMap[stageName] || "source",
            columns: [] // Add columns array
          };
          
          // Extract SQL query
          const selectMatch = xmlContent.match(/<SelectStatement[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/s);
          if (selectMatch) {
            // Simplify SQL by removing excess whitespace
            let sql = selectMatch[1].trim();
            sql = sql.replace(/\s+/g, ' ');  // Normalize whitespace
            sql = sql.replace(/\/\*.*?\*\//g, '');  // Remove comments
            
            source.sql = sql;
            
            // Extract WHERE clauses from SQL to capture constraints
            const whereClauses = extractWhereClauses(sql);
            if (whereClauses.length > 0) {
              source.where_clauses = whereClauses;
            }
          }
          
          // Extract table name if no SQL
          if (!source.sql) {
            const tableMatch = xmlContent.match(/<TableName[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/);
            if (tableMatch) {
              source.table = tableMatch[1];
            }
          }
          
          // Extract connection info
          const serverMatch = xmlContent.match(/<Server[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/);
          if (serverMatch) {
            source.connection = serverMatch[1].replace(/#[^#]+#/g, '[PARAM]');
          }
          
          // Extract database name if present
          const databaseMatch = xmlContent.match(/<Database[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/);
          if (databaseMatch) {
            source.database = databaseMatch[1];
          }
          
          // Only add source if we have meaningful information
          if (source.sql || source.table || source.columns.length > 0) {
            result.sources.push(source);
          }
        } else if (context === 2) { // Target context
          const target: any = {
            name: stageName,
            type: stageTypeMap[stageName] || "target",
            columns: [] // Add columns array
          };
          
          // Extract table name
          const tableMatch = xmlContent.match(/<TableName[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/);
          if (tableMatch) {
            target.table = tableMatch[1];
          }
          
          // Extract write mode
          const writeModeMatch = xmlContent.match(/<WriteMode[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/);
          if (writeModeMatch) {
            const modes = ["Append", "Create", "Truncate", "Replace"];
            const modeIndex = parseInt(writeModeMatch[1], 10);
            if (modeIndex >= 0 && modeIndex < modes.length) {
              target.mode = modes[modeIndex];
            }
          }
          
          // Extract connection info
          const serverMatch = xmlContent.match(/<Server[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/);
          if (serverMatch) {
            target.connection = serverMatch[1].replace(/#[^#]+#/g, '[PARAM]');
          }
          
          // Extract database name if present
          const databaseMatch = xmlContent.match(/<Database[^>]*>\s*<!\[CDATA\[(.*?)\]\]>/);
          if (databaseMatch) {
            target.database = databaseMatch[1];
          }
          
          // Only add target if we have meaningful information
          if (target.table || target.dataset || target.columns.length > 0) {
            result.targets.push(target);
          }
        }
        
        // Extract ALL SQL scripts (not just SELECT statements) - from Python implementation
        for (const sqlType of ["BeforeSQL", "AfterSQL", "SelectStatement"]) {
          const sqlMatch = xmlContent.match(new RegExp(`<${sqlType}[^>]*>\\s*<!\\[CDATA\\[(.*?)\\]\\]>`, 's'));
          if (sqlMatch) {
            const sql = sqlMatch[1].trim();
            // Check if SQL contains meaningful content
            if (/SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER/i.test(sql)) {
              // Simplify SQL by removing excess whitespace but preserve line structure
              const normalizedSql = sql
                .replace(/ +/g, ' ')  // Normalize multiple spaces
                .replace(/\r?\n\s*/g, '\n');  // Normalize line indentation
              
              result.sql_scripts.push({
                stage: stageName,
                type: sqlType,
                sql: normalizedSql
              });
            }
          }
        }
      }
    }
    
    // Extract lookup configurations
    const lookupRegex = /StageType "PxLookup"[\s\S]*?Name "([^"]+)"[\s\S]*?(?:END DSRECORD)/g;
    let lookupMatch;
    
    while ((lookupMatch = lookupRegex.exec(dsx_content)) !== null) {
      const lookupSection = lookupMatch[0];
      const lookupName = lookupMatch[1];
      
      const lookupConfig: any = {
        name: lookupName,
        type: "Lookup",
        inputs: [],
        output: "",
        key_columns: [],
        fail_mode: ""
      };
      
      // Extract lookup input links
      const inputRegex = /Identifier "([^"]+P\d+)"[\s\S]*?Name "([^"]+)"[\s\S]*?Partner "([^|]*)"/g;
      let inputMatch;
      
      while ((inputMatch = inputRegex.exec(lookupSection)) !== null) {
        const inputId = inputMatch[1];
        const inputName = inputMatch[2];
        
        // Check if this is a lookup input
        const conditionMatch = lookupSection.match(/LookupFail "([^"]+)"/);
        if (conditionMatch) {
          lookupConfig.inputs.push(inputName);
          lookupConfig.fail_mode = conditionMatch[1]; // continue or fail
        }
      }
      
      // Extract key columns
      const keyRegex = /KeyPosition "([^0])"[\s\S]*?Name "([^"]+)"/g;
      let keyMatch;
      
      while ((keyMatch = keyRegex.exec(lookupSection)) !== null) {
        lookupConfig.key_columns.push(keyMatch[2]);
      }
      
      // Extract lookup type/method
      const lookupTypeMatch = lookupSection.match(/LookupType "([^"]+)"/);
      if (lookupTypeMatch) {
        const lookupTypeMap: Record<string, string> = {
          "0": "Normal",
          "1": "Sparse",
          "2": "Range"
        };
        lookupConfig.lookup_type = lookupTypeMap[lookupTypeMatch[1]] || lookupTypeMatch[1];
      }
      
      // Extract residual handling
      const residualMatch = lookupSection.match(/ResidualHandler "([^"]+)"/);
      if (residualMatch) {
        lookupConfig.residual_handling = residualMatch[1];
      }
      
      // Only add lookup if we have meaningful information
      if (lookupConfig.inputs.length > 0 || lookupConfig.key_columns.length > 0) {
        result.lookups.push(lookupConfig);
      }
    }
    
    // Extract dataset targets
    const datasetRegex = /Name "dataset"[\s\S]*?Value "([^"]+)"/g;
    let datasetMatch;
    
    while ((datasetMatch = datasetRegex.exec(dsx_content)) !== null) {
      const datasetPath = datasetMatch[1];
      const datasetName = datasetPath.split('/').pop() || datasetPath;
      
      // Look for stage name in surrounding context
      const surroundingStart = Math.max(0, datasetMatch.index - 500);
      const surrounding = dsx_content.substring(surroundingStart, datasetMatch.index);
      const stageNameMatch = surrounding.match(/Name "([^"]+)"/);
      
      const target: any = {
        type: "dataset",
        dataset: datasetName
      };
      
      if (stageNameMatch) {
        target.name = stageNameMatch[1];
      }
      
      // Add dataset mode if available
      const contextRange = dsx_content.substring(
        Math.max(0, datasetMatch.index - 200),
        Math.min(dsx_content.length, datasetMatch.index + 200)
      );
      
      const datasetModeMatch = contextRange.match(/Name "datasetmode"[\s\S]*?Value "([^"]+)"/);
      if (datasetModeMatch) {
        target.mode = datasetModeMatch[1];
      }
      
      result.targets.push(target);
    }
    
    // Extract transformation logic
    const trxRegex = /Name "TrxGenCode"[\s\S]*?Value =\+=\+=\+=([\s\S]*?)=\+=\+=\+=/g;
    let trxMatch;
    
    while ((trxMatch = trxRegex.exec(dsx_content)) !== null) {
      const transformCode = trxMatch[1].trim();
      
      // Extract stage name from preceding record
      const recordContent = dsx_content.substring(0, trxMatch.index).split("BEGIN DSRECORD").pop() || "";
      const stageNameMatch = recordContent.match(/Name "([^"]+)"/);
      const stageName = stageNameMatch ? stageNameMatch[1] : "unknown";
      
      // Extract transformation rules
      const rules: string[] = [];
      const lines = transformCode.split('\n');
      
      for (const line of lines) {
        // Look for assignment operations, exclude boilerplate
        if (line.includes('=') && 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('int') &&
            !line.includes('RowRejected') && 
            !line.includes('NullSet') && 
            !line.includes('inputname') && 
            !line.includes('outputname') && 
            !line.includes('initialize') && 
            !line.includes('mainloop') && 
            !line.includes('finish') && 
            !line.includes('writerecord')) {
          const cleanLine = line.trim();
          if (cleanLine) {
            rules.push(cleanLine.replace(/\s+/g, ' '));
          }
        }
      }
      
      // Create transform object
      const transform: any = {
        name: stageName,
        rules: rules
      };
      
      // Extract input/output names - from Python implementation
      const inputMatch = transformCode.match(/inputname\s+\d+\s+([^;]+);/);
      const outputMatch = transformCode.match(/outputname\s+\d+\s+([^;]+);/);
      
      if (inputMatch) {
        transform.input = inputMatch[1];
      }
      
      if (outputMatch) {
        transform.output = outputMatch[1];
      }
      
      // Extract rejection conditions - from Python implementation
      const rejectMatches = transformCode.match(/if\s*\((.*?)\)\s*\{\s*reject\s+\d+\s*;/g);
      if (rejectMatches) {
        transform.reject_conditions = rejectMatches.map(match => {
          const condition = match.match(/if\s*\((.*?)\)/);
          return condition ? condition[1].trim() : "";
        }).filter(Boolean);
      }
      
      // Only add transform if we have rules
      if (rules.length > 0) {
        result.transforms.push(transform);
      }
    }
    
    // Extract column info for data flow - from Python implementation
    const columnInfoMap: Record<string, DSXColumn[]> = {};
    
    // Find column definitions in output pins
    const outputRegex = /Identifier "V.*?P\d+"[\s\S]*?Name "([^"]+)"[\s\S]*?Columns "COutputColumn"([\s\S]*?)(?:MetaBag|END DSRECORD)/g;
    let outputMatch;
    
    while ((outputMatch = outputRegex.exec(dsx_content)) !== null) {
      const linkName = outputMatch[1];
      const columnsContent = outputMatch[2];
      const columns: DSXColumn[] = [];
      
      // Extract column definitions
      const colRegex = /Name "([^"]+)"[\s\S]*?SqlType "([^"]+)"[\s\S]*?Precision "([^"]+)"[\s\S]*?Scale "([^"]+)"[\s\S]*?Nullable "([^"]+)"/g;
      let colMatch;
      
      while ((colMatch = colRegex.exec(columnsContent)) !== null) {
        const colName = colMatch[1];
        const sqlType = colMatch[2];
        const precision = colMatch[3];
        const scale = colMatch[4];
        const nullable = colMatch[5] === "1";
        
        // Skip system columns
        if (colName.startsWith("APT_") || colName.startsWith("DSLink")) {
          continue;
        }
        
        // Add column info
        columns.push({
          name: colName,
          type: mapSqlType(sqlType, precision, scale),
          nullable: nullable
        });
      }
      
      // Extract derivations
      const derivRegex = /Name "([^"]+)"[\s\S]*?Derivation "([^"]+)"/g;
      let derivMatch;
      
      while ((derivMatch = derivRegex.exec(columnsContent)) !== null) {
        const colName = derivMatch[1];
        const derivation = derivMatch[2].trim();
        
        // Find column and add derivation
        const column = columns.find(c => c.name === colName);
        if (column) {
          column.derivation = derivation.replace(/\s+/g, ' ');
        }
      }
      
      if (columns.length > 0) {
        columnInfoMap[linkName] = columns;
      }
    }
    
    // Extract data flow connections - from Python implementation
    const linkNamesMatch = dsx_content.match(/LinkNames "(.*?)"/);
    if (linkNamesMatch) {
      const linkNames = linkNamesMatch[1].split('|').filter(s => s.trim());
      
      // Get SourcePinIDs and TargetStageIDs
      const sourcePinsMatch = dsx_content.match(/LinkSourcePinIDs "(.*?)"/);
      const targetStagesMatch = dsx_content.match(/TargetStageIDs "(.*?)"/);
      
      if (sourcePinsMatch && targetStagesMatch) {
        const sourcePins = sourcePinsMatch[1].split('|');
        const targetStages = targetStagesMatch[1].split('|');
        
        // Build flow entries
        for (let i = 0; i < linkNames.length; i++) {
          const linkName = linkNames[i];
          
          let sourceId = null;
          if (i < sourcePins.length && sourcePins[i]) {
            const sourceParts = sourcePins[i].split('P');
            if (sourceParts && sourceParts[0]) {
              sourceId = sourceParts[0];
            }
          }
          
          let targetId = null;
          if (i < targetStages.length && targetStages[i]) {
            targetId = targetStages[i];
          }
          
          if (sourceId && targetId) {
            const fromStage = stageMap[sourceId] || "Unknown";
            const toStage = stageMap[targetId] || "Unknown";
            
            // Only add if both from and to are known
            if (fromStage !== "Unknown" && toStage !== "Unknown" && fromStage !== " " && toStage !== " ") {
              const flowEntry: any = {
                link: linkName,
                from: fromStage,
                to: toStage
              };
              
              // Add column info if available
              if (linkName in columnInfoMap) {
                flowEntry.columns = columnInfoMap[linkName];
              }
              
              result.flow.push(flowEntry);
            }
          }
        }
      }
    } else {
      // Use the older approach if LinkNames isn't found
      const linkRegex = /BEGIN DSRECORD[\s\S]*?StageType "Link"[\s\S]*?FromStageID "([^"]+)"[\s\S]*?ToStageID "([^"]+)"[\s\S]*?END DSRECORD/g;
      let linkMatch;
      
      while ((linkMatch = linkRegex.exec(dsx_content)) !== null) {
        const fromStageId = linkMatch[1];
        const toStageId = linkMatch[2];
        
        // Find stage names from IDs
        const fromStageName = stageMap[fromStageId] || fromStageId;
        const toStageName = stageMap[toStageId] || toStageId;
        
        result.flow.push({
          link: `${fromStageName}_to_${toStageName}`,
          from: fromStageName,
          to: toStageName
        });
      }
    }
  }

  // Add token count if requested
  if (includeTokenCount) {
    const tokenUsage = estimateTokenUsage(result);
    result.metadata.tokenCount = tokenUsage.total;
  }

  // Add validation before returning
  const validation = validateExtractedData(result);
  if (!validation.valid) {
    console.warn('DSX Parsing Validation Issues:', validation.issues);
  }

  return result;
};

// Helper function to extract WHERE clauses from SQL
const extractWhereClauses = (sql: string): string[] => {
  const clauses: string[] = [];
  const whereRegex = /\bWHERE\b\s+(.*?)(?:\bGROUP BY\b|\bORDER BY\b|\bHAVING\b|$)/gi;
  
  let match;
  while ((match = whereRegex.exec(sql)) !== null) {
    if (match[1] && match[1].trim()) {
      clauses.push(match[1].trim());
    }
  }
  
  return clauses;
};

// Map SQL type codes to readable strings
const mapSqlType = (sqlType: string, precision?: string, scale?: string): string => {
  const typeMap: Record<string, string> = {
    "1": "CHAR",
    "2": "NUMERIC",
    "3": "DECIMAL",
    "4": "INTEGER",
    "5": "SMALLINT",
    "6": "FLOAT",
    "7": "REAL",
    "8": "DOUBLE",
    "9": "DATE",
    "10": "TIME",
    "11": "TIMESTAMP",
    "12": "VARCHAR",
    "-1": "LONGVARCHAR",
    "-2": "BINARY",
    "-3": "VARBINARY",
    "-4": "LONGVARBINARY",
    "-5": "BIGINT",
    "-6": "TINYINT",
    "-7": "BIT",
    "-8": "WCHAR",
    "-9": "WVARCHAR",
    "-10": "WLONGVARCHAR",
    "91": "TYPE_DATE",
    "92": "TYPE_TIME",
    "93": "TYPE_TIMESTAMP"
  };

  const typeName = typeMap[sqlType] || `UNKNOWN(${sqlType})`;

  // Format type with precision/scale where appropriate
  if (["NUMERIC", "DECIMAL", "CHAR", "VARCHAR"].includes(typeName)) {
    if (precision && precision !== "0") {
      if (scale && scale !== "0") {
        return `${typeName}(${precision},${scale})`;
      }
      return `${typeName}(${precision})`;
    }
  }

  return typeName;
};

// Validation function
export const validateExtractedData = (data: DSXJobInfo): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check required fields
  if (!data.name) {
    issues.push('Missing job name');
  }
  
  if (!data.type) {
    issues.push('Missing job type');
  }
  
  // Check for empty arrays that should have content
  if (data.sources.length === 0 && data.targets.length === 0) {
    issues.push('No sources or targets found - possible parsing issue');
  }
  
  // Check for incomplete flow
  if (data.flow.length > 0) {
    // Create sets of all stages mentioned in flow
    const fromStages = new Set(data.flow.map((f) => f.from));
    const toStages = new Set(data.flow.map((f) => f.to));
    
    // Check for disconnected stages
    const allStages = new Set([
      ...data.sources.map((s) => s.name),
      ...data.targets.map((t) => t.name),
      ...data.transforms.map((t) => t.name),
      ...(data.lookups || []).map((l) => l.name),
      ...(data.specialized_stages || []).map((s: any) => s.name)
    ]);
    
    for (const stage of allStages) {
      if (!fromStages.has(stage) && !toStages.has(stage)) {
        issues.push(`Stage "${stage}" appears disconnected from the flow`);
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};

export const processDSXFiles = async (files: File[]): Promise<ProcessingResult[]> => {
  const results: ProcessingResult[] = [];
  
  for (const file of files) {
    try {
      const content = await file.text();
      const jobInfo = extractDSXJobInfo(content);
      const tokenUsage = estimateTokenUsage(jobInfo);
      
      results.push({
        originalFile: file.name,
        data: jobInfo,
        tokenUsage
      });
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      throw error;
    }
  }
  
  return results;
};

export const createFileTree = (results: ProcessingResult[]) => {
  return results.map(result => ({
    name: result.data.name,
    type: result.data.type,
    description: result.data.description,
    parameters: result.data.parameters.length,
    sources: result.data.sources.length,
    targets: result.data.targets.length
  }));
};

export const saveAsZip = async (results: ProcessingResult[]): Promise<Blob> => {
  const zip = new JSZip();
  
  for (const result of results) {
    zip.file(`${result.data.name}.json`, JSON.stringify(result.data, null, 2));
  }
  
  return await zip.generateAsync({ type: 'blob' });
};