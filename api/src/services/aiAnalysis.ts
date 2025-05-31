import { VertexAI } from '@google-cloud/vertexai';
import logger from '../utils/logger';

class AIAnalysisService {
  private vertexAI: VertexAI;
  private model: any;

  constructor() {
    this.vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    });

    this.model = this.vertexAI.preview.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL || 'gemini-pro',
    });
  }

  async analyzeCode(codeContent: string, filePath: string): Promise<any> {
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
        return JSON.parse(response.text());
      } catch (parseError) {
        logger.warn('Failed to parse AI response as JSON, returning raw text');
        return {
          vulnerabilities: [],
          securityScore: 50,
          threatLevel: 'MEDIUM',
          aiAnalysis: response.text()
        };
      }
    } catch (error) {
      logger.error('AI analysis failed:', error);
      throw new Error('Failed to analyze code with AI');
    }
  }

  async generateThreatModel(codeFiles: string[], projectStructure: any): Promise<any> {
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

        Return in JSON format:
        {
          "nodes": [
            {
              "id": "api_gateway",
              "type": "API",
              "label": "API Gateway",
              "vulnerabilities": ["sql_injection"],
              "riskLevel": 0.8,
              "position": {"x": 0, "y": 0, "z": 0}
            }
          ],
          "edges": [
            {
              "source": "api_gateway",
              "target": "database",
              "dataFlow": "user_data",
              "encrypted": false,
              "authenticated": true,
              "riskLevel": 0.7
            }
          ],
          "attackVectors": [
            {
              "id": "sql_injection_attack",
              "name": "SQL Injection",
              "likelihood": 0.8,
              "impact": 0.9,
              "path": ["api_gateway", "database"]
            }
          ]
        }
      `;

      const result = await this.model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      logger.error('Threat model generation failed:', error);
      return this.getDefaultThreatModel();
    }
  }

  async generateRemediationSteps(vulnerabilities: any[]): Promise<any[]> {
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
      return [];
    }
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
