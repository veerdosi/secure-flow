import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import logger from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

class AIAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

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
        model: process.env.GEMINI_MODEL || 'gemini-pro'
      });

      logger.info('✅ Gemini AI initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Gemini AI:', error);
      throw new Error(`Gemini AI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeCode(codeContent: string, filePath: string): Promise<any> {
    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
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
      const response = await result.response;

      try {
        const analysis = JSON.parse(response.text());
        logger.info('✅ Real AI analysis completed with Gemini');
        return analysis;
      } catch (parseError) {
        logger.error('Failed to parse AI response as JSON:', parseError);
        throw new Error(`AI response parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON response'}`);
      }
    } catch (error) {
      logger.error('AI analysis failed:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateThreatModel(codeFiles: string[], projectStructure: any): Promise<any> {
    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
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
      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      logger.error('Threat model generation failed:', error);
      throw new Error(`Threat model generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateRemediationSteps(vulnerabilities: any[]): Promise<any[]> {
    if (!this.model) {
      throw new Error('Gemini AI model not initialized. Check GEMINI_API_KEY configuration.');
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
      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      logger.error('Remediation generation failed:', error);
      throw new Error(`Remediation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}

export default new AIAnalysisService();
