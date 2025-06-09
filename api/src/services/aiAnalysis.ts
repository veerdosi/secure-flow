import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import logger from '../utils/logger';
import { IAnalysis } from '../models';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface FileAnalysisContext {
  projectType?: string;
  framework?: string;
  language: string;
  dependencies?: string[];
  previousVulnerabilities?: any[];
  projectHistory?: any[];
}

interface AnalysisCache {
  [key: string]: {
    result: any;
    timestamp: number;
    ttl: number;
  };
}

interface CodeFixRequest {
  file: string;
  code: string;
  vulnerabilityType: string;
  severity: string;
  context?: any;
}

interface CodeFixResponse {
  fixedCode: string;
  description: string;
  confidence: number;
  explanation: string;
  testSuggestions?: string[];
}

class AIAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private analysisCache: AnalysisCache = {};
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required for AI analysis');
    }

    try {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1, // Lower temperature for more consistent security analysis
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 8192,
        },
      });

      logger.info('✅ Gemini AI initialized successfully with enhanced configuration');
    } catch (error) {
      logger.error('❌ Failed to initialize Gemini AI:', error);
      throw new Error(`Gemini AI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced code analysis with context awareness and specialized vulnerability detection
   */
  async analyzeCode(codeContent: string, filePath: string, context?: FileAnalysisContext): Promise<any> {
    logger.info(`🔍 Starting AI analysis for ${filePath}`, {
      fileSize: typeof codeContent === 'string' ? codeContent.length : 'non-string',
      contentType: typeof codeContent,
      language: this.detectLanguage(filePath),
      hasContext: !!context
    });

    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
    }

    // Ensure codeContent is a string
    if (typeof codeContent !== 'string') {
      logger.warn(`⚠️ Non-string content received for ${filePath}, converting to string`);
      codeContent = String(codeContent);
    }

    // Skip analysis for very large files
    if (codeContent.length > 100000) {
      logger.warn(`⚠️ File ${filePath} is too large (${codeContent.length} chars), skipping analysis`);
      return {
        vulnerabilities: [],
        securityScore: 50,
        threatLevel: 'UNKNOWN',
        aiAnalysis: 'File too large for analysis',
        analyzedFile: filePath,
        analysisTimestamp: new Date().toISOString(),
        skipped: true
      };
    }

    const cacheKey = this.generateCacheKey('analyze', codeContent, filePath);
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      logger.info(`📋 Using cached analysis for ${filePath}`);
      return cached;
    }

    try {
      const language = this.detectLanguage(filePath);
      const projectType = context?.projectType || this.detectProjectType(filePath);
      const framework = context?.framework || this.detectFramework(codeContent, language);

      logger.info(`📝 Analysis context for ${filePath}:`, {
        language,
        projectType,
        framework,
        codeLines: codeContent.split('\n').length
      });

      const prompt = this.buildEnhancedAnalysisPrompt(codeContent, filePath, {
        language,
        projectType,
        framework,
        ...context
      });

      logger.info(`🤖 Sending prompt to Gemini API`, {
        promptLength: prompt.length,
        model: process.env.GEMINI_MODEL || 'gemini-pro',
        file: filePath
      });

      const result = await this.executeWithRetry(async () => {
        const response = await this.model.generateContent(prompt);
        const text = response.response.text();
        logger.info(`✅ Gemini API response received`, {
          responseLength: text.length,
          file: filePath
        });
        return text;
      });

      logger.info(`🔧 Parsing AI response for ${filePath}`, {
        rawResponseLength: result.length
      });

      const analysis = this.parseAndValidateAnalysis(result, filePath);
      
      logger.info(`📊 Analysis results for ${filePath}:`, {
        vulnerabilities: analysis.vulnerabilities?.length || 0,
        securityScore: analysis.securityScore,
        threatLevel: analysis.threatLevel,
        parseError: analysis.parseError || false
      });
      
      // Enhance analysis with context-specific checks
      const enhancedAnalysis = await this.enhanceAnalysisWithContext(analysis, {
        language,
        projectType,
        framework,
        filePath,
        ...context
      });

      this.setCachedResult(cacheKey, enhancedAnalysis);
      logger.info(`✅ Enhanced AI analysis completed for ${filePath} (${language}/${framework})`);
      
      return enhancedAnalysis;
    } catch (error) {
      logger.error(`❌ AI analysis failed for ${filePath}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        filePath
      });
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate automated code fixes for vulnerabilities (called by remediationService)
   */
  async generateCodeFix(file: string, code: string, vulnerabilityType: string, severity: string, context?: any): Promise<CodeFixResponse> {
    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
    }

    const cacheKey = this.generateCacheKey('codefix', code, vulnerabilityType);
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      logger.info(`📋 Using cached code fix for ${vulnerabilityType} in ${file}`);
      return cached;
    }

    try {
      const language = this.detectLanguage(file);
      const fixPrompt = this.buildCodeFixPrompt({
        file,
        code,
        vulnerabilityType,
        severity,
        context: { language, ...context }
      });

      const result = await this.executeWithRetry(async () => {
        const response = await this.model.generateContent(fixPrompt);
        return response.response.text();
      });

      const codeFix = this.parseCodeFixResponse(result);
      this.setCachedResult(cacheKey, codeFix);
      
      logger.info(`✅ Code fix generated for ${vulnerabilityType} in ${file} (confidence: ${codeFix.confidence}%)`);
      return codeFix;
    } catch (error) {
      logger.error(`❌ Code fix generation failed for ${vulnerabilityType} in ${file}:`, error);
      throw new Error(`Code fix generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced threat modeling with architectural analysis
   */
  async generateThreatModel(codeFiles: string[], projectStructure: any, analysisHistory?: IAnalysis[]): Promise<any> {
    logger.info(`🧠 Starting threat model generation`, {
      codeFilesCount: codeFiles.length,
      projectStructure: Object.keys(projectStructure),
      hasAnalysisHistory: !!analysisHistory?.length
    });

    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
    }

    try {
      const projectType = this.analyzeProjectArchitecture(codeFiles);
      const securityPatterns = this.identifySecurityPatterns(codeFiles);
      const dataFlows = this.analyzeDataFlows(codeFiles, projectStructure);

      logger.info(`📊 Threat model analysis context`, {
        projectType,
        securityPatterns,
        dataFlowsCount: Object.keys(dataFlows).length
      });

      const prompt = this.buildThreatModelPrompt(codeFiles, projectStructure, {
        projectType,
        securityPatterns,
        dataFlows,
        analysisHistory
      });

      logger.info(`🤖 Sending threat model prompt to Gemini`, {
        promptLength: prompt.length
      });

      const result = await this.executeWithRetry(async () => {
        const response = await this.model.generateContent(prompt);
        const text = response.response.text();
        logger.info(`✅ Threat model response received`, {
          responseLength: text.length
        });
        return text;
      });

      let threatModel;
      try {
        // Clean up markdown formatting
        const cleanResult = this.cleanJsonResponse(result);
        threatModel = JSON.parse(cleanResult);
      } catch (parseError) {
        logger.error('Threat model parsing failed, raw response:', result.substring(0, 500));
        throw new Error(`Threat model generation failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON response'}`);
      }
      
      // Enhance with 3D visualization data for the frontend
      threatModel.visualization = this.generateVisualizationData(threatModel);
      
      logger.info(`✅ Enhanced threat model generated`, {
        components: threatModel.components?.length || 0,
        threats: threatModel.threats?.length || 0,
        hasVisualization: !!threatModel.visualization
      });
      
      return threatModel;
    } catch (error) {
      logger.error(`❌ Threat model generation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Threat model generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Advanced dependency analysis for supply chain security
   */
  async analyzeDependencies(packageFiles: string[], lockFiles: string[]): Promise<any> {
    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
    }

    try {
      logger.info('🔍 Starting dependency security analysis...');
      
      const dependencies = await this.extractDependencyInfo(packageFiles, lockFiles);
      const prompt = this.buildDependencyAnalysisPrompt(dependencies);

      const result = await this.executeWithRetry(async () => {
        const response = await this.model.generateContent(prompt);
        return response.response.text();
      });

      let analysis;
      try {
        const cleanResult = this.cleanJsonResponse(result);
        analysis = JSON.parse(cleanResult);
      } catch (parseError) {
        logger.error('Dependency analysis parsing failed:', parseError);
        logger.error('Raw response:', result.substring(0, 500));
        throw new Error(`Dependency analysis parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON response'}`);
      }
      
      // Enhance with supply chain risk assessment
      analysis.supplyChainRisk = this.assessSupplyChainRisk(dependencies);
      analysis.licensingIssues = this.checkLicenseCompliance(dependencies);
      
      logger.info(`✅ Dependency analysis completed: ${analysis.vulnerabilities?.length || 0} issues found`);
      return analysis;
    } catch (error) {
      logger.error('❌ Dependency analysis failed:', error);
      throw new Error(`Dependency analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced remediation with priority scoring and automated PR generation
   */
  async generateRemediationSteps(vulnerabilities: any[], projectContext?: any): Promise<any[]> {
    logger.info(`🔧 Starting remediation generation`, {
      vulnerabilityCount: vulnerabilities.length,
      hasProjectContext: !!projectContext,
      severityCounts: vulnerabilities.reduce((acc: any, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {})
    });

    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
    }

    try {
      const prioritizedVulns = this.prioritizeVulnerabilities(vulnerabilities);
      
      logger.info(`📋 Vulnerabilities prioritized`, {
        originalCount: vulnerabilities.length,
        prioritizedCount: prioritizedVulns.length
      });

      const prompt = this.buildRemediationPrompt(prioritizedVulns, projectContext);

      logger.info(`🤖 Sending remediation prompt to Gemini`, {
        promptLength: prompt.length,
        vulnerabilities: prioritizedVulns.length
      });

      const result = await this.executeWithRetry(async () => {
        const response = await this.model.generateContent(prompt);
        const text = response.response.text();
        logger.info(`✅ Remediation response received`, {
          responseLength: text.length
        });
        return text;
      });

      let remediationSteps;
      try {
        const cleanResult = this.cleanJsonResponse(result);
        remediationSteps = JSON.parse(cleanResult);
      } catch (parseError) {
        logger.error('Remediation parsing failed:', parseError);
        logger.error('Raw response:', result.substring(0, 500));
        throw new Error(`Remediation parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON response'}`);
      }
      
      // Enhance with automation capabilities
      const enhancedSteps = remediationSteps.map((step: any) => ({
        ...step,
        automationPossible: this.canAutomate(step),
        estimatedEffort: this.estimateEffort(step),
        riskLevel: this.assessRemediationRisk(step),
        prerequisites: this.identifyPrerequisites(step),
      }));
      
      logger.info(`✅ Generated prioritized remediation steps`, {
        totalSteps: enhancedSteps.length,
        automatable: enhancedSteps.filter((s: any) => s.automationPossible).length,
        effortBreakdown: enhancedSteps.reduce((acc: any, s: any) => {
          acc[s.estimatedEffort] = (acc[s.estimatedEffort] || 0) + 1;
          return acc;
        }, {})
      });
      
      return enhancedSteps;
    } catch (error) {
      logger.error(`❌ Remediation generation failed`, {
        vulnerabilityCount: vulnerabilities.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Remediation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ====== PRIVATE UTILITY METHODS ======

  private cleanJsonResponse(result: string): string {
    return result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^#+\s+.*$/gm, '') // Remove markdown headers
      .replace(/^\s*[\r\n]/gm, '')
      .trim();
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          logger.info(`🔄 Retry attempt ${attempt}/${this.MAX_RETRIES}`, {
            delay: this.RATE_LIMIT_DELAY * attempt
          });
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY * attempt));
        }
        
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;
        
        logger.info(`✅ AI operation completed successfully`, {
          attempt,
          duration,
          retryNeeded: attempt > 1
        });
        
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`⚠️ AI operation attempt ${attempt} failed`, {
          attempt,
          maxRetries: this.MAX_RETRIES,
          error: error instanceof Error ? error.message : 'Unknown error',
          willRetry: attempt < this.MAX_RETRIES
        });
        
        if (attempt === this.MAX_RETRIES) {
          logger.error(`💥 All retry attempts exhausted`, {
            totalAttempts: this.MAX_RETRIES,
            finalError: lastError.message,
            stack: lastError.stack
          });
          break;
        }
      }
    }
    
    throw lastError!;
  }

  private parseAndValidateAnalysis(result: string, filePath: string): any {
    try {
      // Clean up common AI response formatting issues
      const cleanResult = this.cleanJsonResponse(result);
      
      const analysis = JSON.parse(cleanResult);
      
      // Validate required fields
      if (!analysis.vulnerabilities) analysis.vulnerabilities = [];
      if (!analysis.securityScore) analysis.securityScore = 50;
      if (!analysis.threatLevel) analysis.threatLevel = 'LOW';
      if (!analysis.aiAnalysis) analysis.aiAnalysis = 'Analysis completed successfully';
      
      // Add metadata
      analysis.analyzedFile = filePath;
      analysis.analysisTimestamp = new Date().toISOString();
      
      return analysis;
    } catch (parseError) {
      logger.error('Failed to parse AI response:', parseError);
      logger.error('Raw response:', result.substring(0, 500));
      
      // Return fallback analysis
      return {
        vulnerabilities: [],
        securityScore: 50,
        threatLevel: 'UNKNOWN',
        aiAnalysis: `Analysis parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON response'}`,
        analyzedFile: filePath,
        analysisTimestamp: new Date().toISOString(),
        parseError: true
      };
    }
  }

  private parseCodeFixResponse(result: string): CodeFixResponse {
    try {
      const cleanResult = this.cleanJsonResponse(result);
      
      const fix = JSON.parse(cleanResult);
      
      return {
        fixedCode: fix.fixedCode || '',
        description: fix.description || 'Code fix generated',
        confidence: Math.min(95, Math.max(50, fix.confidence || 70)),
        explanation: fix.explanation || 'Security vulnerability addressed',
        testSuggestions: fix.testSuggestions || []
      };
    } catch (parseError) {
      logger.error('Failed to parse code fix response:', parseError);
      logger.error('Raw response:', result.substring(0, 500));
      throw new Error(`Code fix parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON response'}`);
    }
  }

  private generateCacheKey(...parts: string[]): string {
    const content = parts.join('|');
    return Buffer.from(content).toString('base64').substring(0, 32);
  }

  private getCachedResult(key: string): any | null {
    const cached = this.analysisCache[key];
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }
    if (cached) {
      delete this.analysisCache[key];
    }
    return null;
  }

  private setCachedResult(key: string, result: any, ttl: number = this.CACHE_TTL): void {
    this.analysisCache[key] = {
      result,
      timestamp: Date.now(),
      ttl
    };
  }

  private detectLanguage(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala'
    };
    return languageMap[extension] || 'unknown';
  }

  private detectProjectType(filePath: string): string {
    if (filePath.includes('package.json')) return 'nodejs';
    if (filePath.includes('requirements.txt') || filePath.includes('setup.py')) return 'python';
    if (filePath.includes('pom.xml') || filePath.includes('build.gradle')) return 'java';
    if (filePath.includes('Gemfile')) return 'ruby';
    if (filePath.includes('go.mod')) return 'go';
    if (filePath.includes('Cargo.toml')) return 'rust';
    return 'unknown';
  }

  private detectFramework(code: string, language: string): string | null {
    const frameworkPatterns: { [key: string]: { [key: string]: RegExp } } = {
      javascript: {
        'express': /require\(['"]express['"]\)|import.*express/,
        'react': /import.*react|from ['"]react['"]/,
        'vue': /import.*vue|from ['"]vue['"]/,
        'angular': /@angular|import.*angular/,
        'nestjs': /@nestjs|import.*nestjs/
      },
      python: {
        'django': /from django|import django/,
        'flask': /from flask|import flask/,
        'fastapi': /from fastapi|import fastapi/,
        'tornado': /import tornado/
      },
      java: {
        'spring': /@SpringBootApplication|@RestController|org\.springframework/,
        'struts': /org\.apache\.struts/,
        'jersey': /javax\.ws\.rs/
      }
    };

    const patterns = frameworkPatterns[language];
    if (!patterns) return null;

    for (const [framework, pattern] of Object.entries(patterns)) {
      if (pattern.test(code)) {
        return framework;
      }
    }
    return null;
  }

  private buildEnhancedAnalysisPrompt(code: string, filePath: string, context: any): string {
    const examples = this.getVulnerabilityExamples(context.language);
    const securityPatterns = this.getSecurityPatterns(context.framework);
    
    return `You are a world-class cybersecurity expert specializing in ${context.language} security analysis. 

ANALYSIS CONTEXT:
- File: ${filePath}
- Language: ${context.language}
- Framework: ${context.framework || 'Unknown'}
- Project Type: ${context.projectType || 'Unknown'}

SECURITY ANALYSIS REQUIREMENTS:
Perform a comprehensive security analysis focusing on:

1. **Code Injection Vulnerabilities**: SQL injection, NoSQL injection, command injection, LDAP injection
2. **Cross-Site Scripting (XSS)**: Reflected, stored, DOM-based XSS
3. **Authentication & Authorization**: Broken authentication, privilege escalation, session management
4. **Data Exposure**: Sensitive data in logs, hardcoded secrets, information disclosure
5. **Input Validation**: Improper input validation, deserialization vulnerabilities
6. **Cryptographic Issues**: Weak encryption, poor key management, insecure random generation
7. **Business Logic Flaws**: Race conditions, workflow bypasses, access control issues
8. **${context.framework} Specific**: Framework-specific security anti-patterns

VULNERABILITY EXAMPLES FOR ${context.language.toUpperCase()}:
${examples}

SECURITY PATTERNS TO CHECK:
${securityPatterns}

CODE TO ANALYZE:
\`\`\`${context.language}
${code}
\`\`\`

RESPOND WITH VALID JSON ONLY. NO MARKDOWN FORMATTING.

Required JSON format:
{
  "vulnerabilities": [
    {
      "id": "unique_vuln_id",
      "type": "VULNERABILITY_TYPE",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "line": 47,
      "column": 12,
      "description": "Detailed technical description of the vulnerability",
      "suggestedFix": "Specific remediation instructions",
      "owaspCategory": "A03:2021 - Injection",
      "cweId": "CWE-89",
      "confidence": 0.95,
      "exploitability": 0.8,
      "impact": 0.9,
      "attackVector": "Detailed attack scenario",
      "codeSnippet": "Vulnerable code snippet",
      "fixExample": "Example of secure code",
      "references": ["https://owasp.org/..."]
    }
  ],
  "securityScore": 75,
  "threatLevel": "MEDIUM",
  "aiAnalysis": "Comprehensive analysis summary with key findings and recommendations",
  "securityMetrics": {
    "codeComplexity": "LOW|MEDIUM|HIGH",
    "attackSurface": "LOW|MEDIUM|HIGH",
    "dataFlowRisk": "LOW|MEDIUM|HIGH"
  },
  "recommendations": [
    "Specific security improvement recommendations"
  ]
}

ANALYSIS GUIDELINES:
- Be precise about line numbers and code locations
- Provide concrete examples of fixes, not generic advice
- Consider the specific framework and language ecosystem
- Focus on exploitable vulnerabilities, not theoretical issues
- Include confidence levels based on static analysis limitations
- Prioritize findings that have immediate security impact`;
  }

  private buildCodeFixPrompt(request: CodeFixRequest): string {
    const language = this.detectLanguage(request.file);
    const securePatterns = this.getSecurePatterns(language, request.vulnerabilityType);
    
    return `You are an expert security engineer specializing in automated vulnerability remediation.

VULNERABILITY DETAILS:
- File: ${request.file}
- Type: ${request.vulnerabilityType}
- Severity: ${request.severity}
- Language: ${language}

VULNERABLE CODE:
\`\`\`${language}
${request.code}
\`\`\`

SECURE CODING PATTERNS FOR ${request.vulnerabilityType}:
${securePatterns}

REQUIREMENTS:
1. Generate a secure version of the code that eliminates the vulnerability
2. Maintain all existing functionality
3. Follow language-specific best practices
4. Ensure the fix is minimal and targeted
5. Provide clear explanation of changes
6. Include test suggestions to verify the fix

RESPOND WITH VALID JSON ONLY. NO MARKDOWN FORMATTING.

Required JSON format:
{
  "fixedCode": "Complete corrected code with proper escaping",
  "description": "Brief description of what was fixed",
  "confidence": 85,
  "explanation": "Detailed explanation of the security fix and why it works",
  "testSuggestions": [
    "Unit test to verify the fix works",
    "Security test to confirm vulnerability is eliminated"
  ],
  "additionalRecommendations": [
    "Related security improvements to consider"
  ]
}

IMPORTANT:
- Confidence should be 70-95% (higher for simple fixes, lower for complex ones)
- Fixed code must be syntactically correct and functional
- Include proper error handling where applicable
- Consider edge cases and input validation`;
  }

  private buildThreatModelPrompt(files: string[], structure: any, context: any): string {
    return `You are a cybersecurity architect specializing in threat modeling.

CONTEXT:
- Project files: ${files.slice(0, 20).join(', ')}
- Project type: ${context.projectType}
- Security patterns: ${context.securityPatterns.join(', ')}
- Data flows: ${JSON.stringify(context.dataFlows, null, 2)}

Generate a comprehensive threat model that identifies security risks, attack vectors, and potential vulnerabilities based on the project architecture.

RESPOND WITH VALID JSON ONLY. NO MARKDOWN FORMATTING.

Required JSON format:
{
  "threats": [
    {
      "id": "T001",
      "title": "SQL Injection Attack",
      "description": "Detailed threat description",
      "severity": "HIGH",
      "likelihood": "MEDIUM",
      "impact": "HIGH",
      "category": "Injection",
      "attackVector": "Web application inputs",
      "affectedComponents": ["database", "web-api"],
      "mitigations": ["Input validation", "Parameterized queries"]
    }
  ],
  "components": [
    {
      "id": "comp1",
      "name": "Web API",
      "type": "service",
      "trustLevel": "internal",
      "dataClassification": "sensitive"
    }
  ],
  "dataFlows": [
    {
      "from": "client",
      "to": "api", 
      "data": "user credentials",
      "protocol": "HTTPS",
      "risks": ["Man-in-the-middle"]
    }
  ],
  "riskAssessment": {
    "overallRisk": "MEDIUM",
    "criticalThreats": 2,
    "recommendations": ["Implement WAF", "Regular security testing"]
  }
}`;
  }

  private buildDependencyAnalysisPrompt(dependencies: any): string {
    return `You are a cybersecurity expert specializing in dependency and supply chain security.

DEPENDENCIES TO ANALYZE:
${JSON.stringify(dependencies, null, 2)}

Analyze these dependencies for security vulnerabilities, license issues, and supply chain risks.

RESPOND WITH VALID JSON ONLY. NO MARKDOWN FORMATTING.

Required JSON format:
{
  "vulnerabilities": [
    {
      "package": "package-name",
      "version": "1.0.0", 
      "severity": "HIGH",
      "cve": "CVE-2023-1234",
      "description": "Vulnerability description",
      "fixedIn": "1.0.1",
      "exploitable": true
    }
  ],
  "supplyChainRisks": [
    {
      "package": "suspicious-package",
      "risk": "TYPOSQUATTING",
      "severity": "MEDIUM",
      "description": "Package name similar to popular library"
    }
  ],
  "licenseIssues": [
    {
      "package": "restrictive-lib",
      "license": "GPL-3.0",
      "issue": "Copyleft license incompatible with commercial use"
    }
  ],
  "recommendations": [
    "Update vulnerable packages",
    "Review license compatibility"
  ],
  "riskScore": 65
}`;
  }

  private buildRemediationPrompt(vulnerabilities: any[], context: any): string {
    return `You are a security remediation expert specializing in automated vulnerability fixes.

VULNERABILITIES TO REMEDIATE:
${JSON.stringify(vulnerabilities.slice(0, 10), null, 2)}${vulnerabilities.length > 10 ? '\n... (showing first 10 of ' + vulnerabilities.length + ')' : ''}

PROJECT CONTEXT:
${JSON.stringify(context, null, 2)}

Generate prioritized remediation steps for these security vulnerabilities.

RESPOND WITH VALID JSON ONLY. NO MARKDOWN FORMATTING.

REMEDIATION REQUIREMENTS:
1. **Prioritization**: Critical/High impact issues first
2. **Automation**: Identify automatable fixes
3. **Dependencies**: Consider fix dependencies and order
4. **Risk Assessment**: Evaluate risk of each remediation
5. **Testing Strategy**: Include verification steps

Required JSON array format:
[
  {
    "id": "remediation_1",
    "title": "Fix SQL Injection in User Authentication",
    "description": "Replace string concatenation with parameterized queries",
    "vulnerabilityIds": ["vuln_123", "vuln_124"],
    "priority": "CRITICAL",
    "category": "CODE_FIX",
    "effort": "LOW",
    "files": ["auth.js", "db.js"],
    "steps": [
      "Update database query functions",
      "Replace string concatenation with prepared statements",
      "Add input validation"
    ],
    "codeChanges": [
      {
        "file": "auth.js",
        "action": "REPLACE",
        "oldCode": "SELECT * FROM users WHERE email = '" + email + "'",
        "newCode": "SELECT * FROM users WHERE email = ?",
        "explanation": "Use parameterized query to prevent SQL injection"
      }
    ],
    "testingStrategy": [
      "Unit tests for all modified functions",
      "Security tests with malicious input",
      "Integration tests for authentication flow"
    ],
    "automationPossible": true,
    "riskLevel": "LOW",
    "prerequisites": [],
    "estimatedTime": "2-4 hours"
  }
]`;
  }

  private buildIacAnalysisPrompt(iacAnalysis: any): string {
    return `You are a cloud security expert specializing in Infrastructure as Code (IaC) security analysis.

INFRASTRUCTURE ANALYSIS:
${JSON.stringify(iacAnalysis, null, 2)}

Analyze the Infrastructure as Code configurations for security misconfigurations, compliance issues, and best practice violations.

RESPOND WITH VALID JSON ONLY. NO MARKDOWN FORMATTING.

Required JSON format:
{
  "misconfigurations": [
    {
      "file": "terraform/main.tf",
      "resource": "aws_s3_bucket.example",
      "issue": "Public read access enabled",
      "severity": "HIGH",
      "line": 25,
      "recommendation": "Remove public-read ACL and use bucket policies",
      "cis_benchmark": "CIS AWS 2.1.1"
    }
  ],
  "complianceIssues": [
    {
      "standard": "SOC2",
      "requirement": "Access Control",
      "violation": "IAM role has excessive permissions",
      "resources": ["aws_iam_role.app_role"]
    }
  ],
  "bestPractices": [
    "Enable encryption at rest for all storage resources",
    "Implement least privilege access policies",
    "Use infrastructure secrets management"
  ],
  "riskScore": 75,
  "criticalIssues": 3
}`;
  }

  private getVulnerabilityExamples(language: string): string {
    const examples: { [key: string]: string } = {
      javascript: `
SQL Injection: query = "SELECT * FROM users WHERE id = " + userId;
XSS: innerHTML = userInput;
Command Injection: exec(userCommand);
Insecure Randomness: Math.random();`,
      python: `
SQL Injection: cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
Path Traversal: open(user_filename)
Command Injection: os.system(user_command)
Insecure Deserialization: pickle.loads(user_data)`,
      java: `
SQL Injection: Statement.executeQuery("SELECT * FROM users WHERE id = " + userId)
XXE: DocumentBuilderFactory.newInstance()
Insecure Randomness: new Random()
Path Traversal: new File(userPath)`
    };
    return examples[language] || 'Language-specific examples not available';
  }

  private getSecurityPatterns(framework: string | null): string {
    if (!framework) return 'No framework-specific patterns to check';
    
    const patterns: { [key: string]: string } = {
      express: 'CSRF protection, helmet middleware, input validation, SQL injection in routes',
      react: 'XSS through dangerouslySetInnerHTML, client-side routing security, state management',
      django: 'CSRF tokens, SQL injection in ORM, template injection, middleware security',
      spring: 'Spring Security configuration, CSRF protection, method-level security',
      flask: 'CSRF protection, Jinja2 template injection, session management'
    };
    return patterns[framework] || 'Framework-specific security patterns';
  }

  private getSecurePatterns(language: string, vulnerabilityType: string): string {
    const patterns: { [key: string]: { [key: string]: string } } = {
      javascript: {
        'SQL_INJECTION': 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId])',
        'XSS': 'Use textContent instead of innerHTML, escape user input, Content Security Policy',
        'COMMAND_INJECTION': 'Use child_process.spawn with array arguments, validate input'
      },
      python: {
        'SQL_INJECTION': 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))',
        'PATH_TRAVERSAL': 'Use os.path.join and validate paths, check for ".." sequences',
        'COMMAND_INJECTION': 'Use subprocess.run with shell=False and list arguments'
      }
    };
    return patterns[language]?.[vulnerabilityType] || 'Use secure coding practices for this vulnerability type';
  }

  private async enhanceAnalysisWithContext(analysis: any, context: any): Promise<any> {
    // Add framework-specific analysis
    if (context.framework) {
      analysis.frameworkSpecific = await this.analyzeFrameworkSecurity(context.framework, analysis);
    }

    // Add historical context if available
    if (context.previousVulnerabilities?.length > 0) {
      analysis.trendAnalysis = this.compareToPreviousAnalysis(analysis, context.previousVulnerabilities);
    }

    return analysis;
  }

  private async analyzeFrameworkSecurity(framework: string, analysis: any): Promise<any> {
    const frameworkChecks: { [key: string]: string[] } = {
      express: ['CORS configuration', 'Helmet middleware', 'Rate limiting', 'Session security'],
      react: ['Component security', 'State management', 'Router security'],
      django: ['CSRF protection', 'SQL injection prevention', 'Template security'],
      spring: ['Spring Security', 'Method security', 'CSRF protection']
    };

    return {
      framework,
      securityChecks: frameworkChecks[framework] || [],
      recommendations: [`Ensure ${framework}-specific security best practices are followed`]
    };
  }

  private prioritizeVulnerabilities(vulnerabilities: any[]): any[] {
    return vulnerabilities.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
             (severityOrder[a.severity as keyof typeof severityOrder] || 0);
    });
  }

  private canAutomate(step: any): boolean {
    return step.category === 'CODE_FIX' && step.effort === 'LOW';
  }

  private estimateEffort(step: any): string {
    // Simple heuristic based on number of files and complexity
    const fileCount = step.files?.length || 1;
    if (fileCount === 1 && step.steps?.length <= 3) return 'LOW';
    if (fileCount <= 3 && step.steps?.length <= 5) return 'MEDIUM';
    return 'HIGH';
  }

  private assessRemediationRisk(step: any): string {
    if (step.category === 'DEPENDENCY_UPDATE') return 'MEDIUM';
    if (step.category === 'CONFIG_CHANGE') return 'HIGH';
    return 'LOW';
  }

  private identifyPrerequisites(step: any): string[] {
    const prerequisites: string[] = [];
    if (step.category === 'DEPENDENCY_UPDATE') {
      prerequisites.push('Run comprehensive tests before deployment');
    }
    if (step.category === 'CONFIG_CHANGE') {
      prerequisites.push('Backup current configuration');
      prerequisites.push('Coordinate with operations team');
    }
    return prerequisites;
  }

  // Additional methods for advanced analysis services
  private async extractDependencyInfo(packageFiles: string[], lockFiles: string[]): Promise<any> {
    return { packages: [], devDependencies: [], lockFileHashes: [] };
  }

  private assessSupplyChainRisk(dependencies: any): any {
    return { riskScore: 50, highRiskPackages: [], recommendations: [] };
  }

  private checkLicenseCompliance(dependencies: any): any[] {
    return [];
  }

  private async performIacAnalysis(files: string[]): Promise<any> {
    return {
      terraformFiles: files.filter((f: string) => f.endsWith('.tf')),
      cloudFormationFiles: files.filter((f: string) => f.includes('cloudformation')),
      kubernetesFiles: files.filter((f: string) => f.includes('k8s') || f.endsWith('.yaml'))
    };
  }

  private generateCloudSecurityRecommendations(analysis: any): string[] {
    return ['Enable CloudTrail logging', 'Implement least privilege access'];
  }

  private analyzeProjectArchitecture(files: string[]): string {
    if (files.some(f => f.includes('docker') || f.includes('k8s'))) return 'microservices';
    if (files.some(f => f.includes('api') && f.includes('client'))) return 'spa_api';
    if (files.some(f => f.includes('server') || f.includes('routes'))) return 'web_application';
    return 'unknown';
  }

  private identifySecurityPatterns(files: string[]): string[] {
    const patterns: string[] = [];
    if (files.some(f => f.includes('auth'))) patterns.push('Authentication');
    if (files.some(f => f.includes('middleware'))) patterns.push('Middleware');
    if (files.some(f => f.includes('validation'))) patterns.push('Input Validation');
    return patterns;
  }

  private analyzeDataFlows(files: string[], structure: any): any {
    return {
      databaseConnections: files.filter((f: string) => f.includes('db') || f.includes('model')).length,
      apiEndpoints: files.filter((f: string) => f.includes('route') || f.includes('controller')).length,
      externalServices: files.filter((f: string) => f.includes('service') || f.includes('client')).length
    };
  }

  private generateVisualizationData(threatModel: any): any {
    return {
      nodes: threatModel.components || [],
      edges: threatModel.dataFlows || [],
      layout: 'force-directed',
      interactive: true
    };
  }

  private compareToPreviousAnalysis(current: any, previous: any[]): any {
    return {
      newVulnerabilities: current.vulnerabilities.length - (previous.length || 0),
      riskTrend: 'IMPROVING',
      recurringIssues: []
    };
  }
}

export default new AIAnalysisService();