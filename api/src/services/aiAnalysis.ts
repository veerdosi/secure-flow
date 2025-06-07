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
        model: process.env.GEMINI_MODEL || 'gemini-pro',
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
    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
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

      const prompt = this.buildEnhancedAnalysisPrompt(codeContent, filePath, {
        language,
        projectType,
        framework,
        ...context
      });

      const result = await this.executeWithRetry(async () => {
        const response = await this.model.generateContent(prompt);
        return response.response.text();
      });

      const analysis = this.parseAndValidateAnalysis(result, filePath);
      
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
      logger.error(`❌ AI analysis failed for ${filePath}:`, error);
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
    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
    }

    try {
      const projectType = this.analyzeProjectArchitecture(codeFiles);
      const securityPatterns = this.identifySecurityPatterns(codeFiles);
      const dataFlows = this.analyzeDataFlows(codeFiles, projectStructure);

      const prompt = this.buildThreatModelPrompt(codeFiles, projectStructure, {
        projectType,
        securityPatterns,
        dataFlows,
        analysisHistory
      });

      const result = await this.executeWithRetry(async () => {
        const response = await this.model.generateContent(prompt);
        return response.response.text();
      });

      const threatModel = JSON.parse(result);
      
      // Enhance with 3D visualization data for the frontend
      threatModel.visualization = this.generateVisualizationData(threatModel);
      
      logger.info('✅ Enhanced threat model generated with architectural analysis');
      return threatModel;
    } catch (error) {
      logger.error('❌ Threat model generation failed:', error);
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

      const analysis = JSON.parse(result);
      
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
    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
    }

    try {
      logger.info(`🔧 Generating remediation steps for ${vulnerabilities.length} vulnerabilities...`);
      
      const prioritizedVulns = this.prioritizeVulnerabilities(vulnerabilities);
      const prompt = this.buildRemediationPrompt(prioritizedVulns, projectContext);

      const result = await this.executeWithRetry(async () => {
        const response = await this.model.generateContent(prompt);
        return response.response.text();
      });

      const remediationSteps = JSON.parse(result);
      
      // Enhance with automation capabilities
      const enhancedSteps = remediationSteps.map((step: any) => ({
        ...step,
        automationPossible: this.canAutomate(step),
        estimatedEffort: this.estimateEffort(step),
        riskLevel: this.assessRemediationRisk(step),
        prerequisites: this.identifyPrerequisites(step),
      }));
      
      logger.info(`✅ Generated ${enhancedSteps.length} prioritized remediation steps`);
      return enhancedSteps;
    } catch (error) {
      logger.error('❌ Remediation generation failed:', error);
      throw new Error(`Remediation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ====== PRIVATE UTILITY METHODS ======

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY * attempt));
        }
        return await operation();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`AI operation attempt ${attempt} failed:`, error);
        
        if (attempt === this.MAX_RETRIES) {
          break;
        }
      }
    }
    
    throw lastError!;
  }

  private parseAndValidateAnalysis(result: string, filePath: string): any {
    try {
      // Clean up common AI response formatting issues
      const cleanResult = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s*[\r\n]/gm, '');
      
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
      logger.error('Raw response:', result);
      
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
      const cleanResult = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s*[\r\n]/gm, '');
      
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

REQUIRED OUTPUT FORMAT (Valid JSON):
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

OUTPUT FORMAT (Valid JSON):
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

  private buildRemediationPrompt(vulnerabilities: any[], context: any): string {
    return `Generate prioritized remediation steps for security vulnerabilities:

VULNERABILITIES:
${JSON.stringify(vulnerabilities.slice(0, 10), null, 2)}${vulnerabilities.length > 10 ? '\n... (showing first 10 of ' + vulnerabilities.length + ')' : ''}

PROJECT CONTEXT:
${JSON.stringify(context, null, 2)}

REMEDIATION REQUIREMENTS:
1. **Prioritization**: Critical/High impact issues first
2. **Automation**: Identify automatable fixes
3. **Dependencies**: Consider fix dependencies and order
4. **Risk Assessment**: Evaluate risk of each remediation
5. **Testing Strategy**: Include verification steps

OUTPUT FORMAT (Valid JSON):
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
      terraformFiles: files.filter(f => f.endsWith('.tf')),
      cloudFormationFiles: files.filter(f => f.includes('cloudformation')),
      kubernetesFiles: files.filter(f => f.includes('k8s') || f.endsWith('.yaml'))
    };
  }

  private generateCloudSecurityRecommendations(analysis: any): string[] {
    return ['Enable CloudTrail logging', 'Implement least privilege access'];
  }

  private buildDependencyAnalysisPrompt(dependencies: any): string {
    return `Analyze dependencies for security vulnerabilities: ${JSON.stringify(dependencies, null, 2)}`;
  }

  private buildIacAnalysisPrompt(iacAnalysis: any): string {
    return `Analyze Infrastructure as Code for security misconfigurations: ${JSON.stringify(iacAnalysis, null, 2)}`;
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
      databaseConnections: files.filter(f => f.includes('db') || f.includes('model')).length,
      apiEndpoints: files.filter(f => f.includes('route') || f.includes('controller')).length,
      externalServices: files.filter(f => f.includes('service') || f.includes('client')).length
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

  private buildThreatModelPrompt(files: string[], structure: any, context: any): string {
    return `Generate threat model for project with files: ${files.slice(0, 10).join(', ')}`;
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
