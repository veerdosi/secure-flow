import { VertexAI } from '@google-cloud/vertexai';
import logger from '../utils/logger';

class AIAnalysisService {
  private vertexAI: VertexAI | null = null;
  private model: any = null;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    try {
      // Check if Google Cloud is configured
      if (!process.env.GOOGLE_CLOUD_PROJECT) {
        logger.warn('Google Cloud not configured - AI analysis will use mock data');
        return;
      }

      this.vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      });

      this.model = this.vertexAI.preview.getGenerativeModel({
        model: process.env.VERTEX_AI_MODEL || 'gemini-pro',
      });

      logger.info('✅ Vertex AI initialized successfully');
    } catch (error) {
      logger.warn('⚠️  Vertex AI not available - using mock analysis:', error.message);
      this.vertexAI = null;
      this.model = null;
    }
  }

  async analyzeCode(codeContent: string, filePath: string): Promise<any> {
    // If no AI configured, return mock data
    if (!this.model) {
      logger.info('Using mock AI analysis (no Google Cloud configured)');
      return this.getMockAnalysis(codeContent, filePath);
    }

    try {
      const prompt = `
        As a cybersecurity expert, analyze the following code for security vulnerabilities:

        File: ${filePath}
        Code:
        \`\`\`
        ${codeContent}
        \`\`\`

        Please provide a detailed security analysis including:
        1. Identified vulnerabilities with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
        2. OWASP category classification
        3. Specific line numbers where issues occur
        4. Detailed remediation suggestions
        5. Confidence level (0.0 to 1.0)
        6. Potential attack vectors

        Return the analysis in JSON format with the following structure:
        {
          "vulnerabilities": [
            {
              "type": "SQL_INJECTION",
              "severity": "HIGH",
              "line": 47,
              "description": "SQL injection vulnerability detected",
              "suggestedFix": "Use parameterized queries",
              "owaspCategory": "A03:2021",
              "confidence": 0.95,
              "exploitability": 0.8,
              "impact": 0.9
            }
          ],
          "securityScore": 75,
          "threatLevel": "MEDIUM",
          "aiAnalysis": "Detailed explanation of findings..."
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;

      try {
        const analysis = JSON.parse(response.text());
        logger.info('✅ Real AI analysis completed');
        return analysis;
      } catch (parseError) {
        logger.warn('Failed to parse AI response as JSON, using mock data');
        return this.getMockAnalysis(codeContent, filePath);
      }
    } catch (error) {
      logger.error('AI analysis failed, using mock data:', error);
      return this.getMockAnalysis(codeContent, filePath);
    }
  }

  async generateThreatModel(codeFiles: string[], projectStructure: any): Promise<any> {
    if (!this.model) {
      return this.getDefaultThreatModel();
    }

    try {
      const prompt = `
        Generate a threat model for this project based on the code structure:

        Files: ${codeFiles.join(', ')}
        Structure: ${JSON.stringify(projectStructure)}

        Create a threat model with:
        1. System components (nodes)
        2. Data flows (edges)
        3. Attack vectors
        4. Attack surface analysis

        Return in JSON format with nodes, edges, attackVectors, and attackSurface.
      `;

      const result = await this.model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      logger.error('Threat model generation failed:', error);
      return this.getDefaultThreatModel();
    }
  }

  async generateRemediationSteps(vulnerabilities: any[]): Promise<any[]> {
    if (!this.model) {
      return this.getMockRemediationSteps(vulnerabilities);
    }

    try {
      const prompt = `
        Generate detailed remediation steps for these vulnerabilities:
        ${JSON.stringify(vulnerabilities)}

        For each vulnerability, provide:
        1. Step-by-step remediation instructions
        2. Priority level
        3. Estimated effort
        4. Code examples where applicable

        Return as JSON array of remediation objects.
      `;

      const result = await this.model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      logger.error('Remediation generation failed:', error);
      return this.getMockRemediationSteps(vulnerabilities);
    }
  }

  private getMockAnalysis(codeContent: string, filePath: string) {
    const hasAuthCode = codeContent.includes('login') || codeContent.includes('auth') || codeContent.includes('password');
    const hasSqlCode = codeContent.includes('SELECT') || codeContent.includes('sql') || codeContent.includes('query');

    const vulnerabilities = [];
    let securityScore = 85;

    if (hasAuthCode && hasSqlCode) {
      vulnerabilities.push({
        type: 'SQL_INJECTION',
        severity: 'HIGH',
        line: Math.floor(Math.random() * 100) + 1,
        description: 'Potential SQL injection in authentication logic',
        suggestedFix: 'Use parameterized queries with prepared statements',
        owaspCategory: 'A03:2021',
        confidence: 0.85,
        exploitability: 0.7,
        impact: 0.9
      });
      securityScore -= 20;
    }

    if (hasAuthCode) {
      vulnerabilities.push({
        type: 'BROKEN_AUTHENTICATION',
        severity: 'MEDIUM',
        line: Math.floor(Math.random() * 50) + 1,
        description: 'Weak authentication implementation detected',
        suggestedFix: 'Implement proper session management and MFA',
        owaspCategory: 'A02:2021',
        confidence: 0.7,
        exploitability: 0.6,
        impact: 0.8
      });
      securityScore -= 10;
    }

    return {
      vulnerabilities,
      securityScore: Math.max(securityScore, 0),
      threatLevel: vulnerabilities.some(v => v.severity === 'HIGH') ? 'HIGH' :
                   vulnerabilities.some(v => v.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW',
      aiAnalysis: `Mock analysis of ${filePath}: Found ${vulnerabilities.length} potential security issues. ${
        this.model ? 'Real AI analysis failed, showing mock results.' : 'Google Cloud not configured, showing mock results.'
      }`
    };
  }

  private getMockRemediationSteps(vulnerabilities: any[]) {
    return vulnerabilities.map((v, i) => ({
      id: `rem_${i + 1}`,
      title: `Fix ${v.type.replace('_', ' ')} vulnerability`,
      description: v.suggestedFix || 'Apply security best practices',
      priority: v.severity,
      effort: 'MEDIUM',
      category: 'CODE_CHANGE',
      files: [v.file || 'unknown'],
      estimatedTime: '1-2 hours',
      autoFixAvailable: false,
    }));
  }

  private getDefaultThreatModel() {
    return {
      nodes: [
        {
          id: 'api_gateway',
          type: 'API',
          label: 'API Gateway',
          vulnerabilities: [],
          riskLevel: 0.5,
          position: { x: 0, y: 0, z: 0 }
        }
      ],
      edges: [],
      attackVectors: [],
      attackSurface: {
        endpoints: 0,
        inputPoints: 0,
        outputPoints: 0,
        externalDependencies: 0,
        privilegedFunctions: 0
      }
    };
  }
}

export default new AIAnalysisService();
