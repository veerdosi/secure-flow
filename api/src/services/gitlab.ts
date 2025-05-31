import axios from 'axios';
import logger from '../utils/logger';

interface GitLabFile {
  name: string;
  path: string;
  content?: string;
  type: 'blob' | 'tree';
}

class GitLabService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = 'https://gitlab.com/api/v4';
    this.token = process.env.GITLAB_API_TOKEN || '';
  }

  async getProjectFiles(projectId: string, ref: string = 'main'): Promise<GitLabFile[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/projects/${projectId}/repository/tree`,
        {
          headers: {
            'Private-Token': this.token,
          },
          params: {
            ref,
            recursive: true,
            per_page: 100,
          },
        }
      );

      return response.data.filter((file: GitLabFile) =>
        file.type === 'blob' && this.isCodeFile(file.name)
      );
    } catch (error) {
      logger.error('Failed to fetch GitLab project files:', error);
      throw new Error('Failed to fetch project files from GitLab');
    }
  }

  async getFileContent(projectId: string, filePath: string, ref: string = 'main'): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw`,
        {
          headers: {
            'Private-Token': this.token,
          },
          params: {
            ref,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch file content for ${filePath}:`, error);
      throw new Error(`Failed to fetch file content: ${filePath}`);
    }
  }

  async getCommitInfo(projectId: string, commitSha: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/projects/${projectId}/repository/commits/${commitSha}`,
        {
          headers: {
            'Private-Token': this.token,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch commit info for ${commitSha}:`, error);
      throw new Error(`Failed to fetch commit info: ${commitSha}`);
    }
  }

  async getChangedFiles(projectId: string, commitSha: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/projects/${projectId}/repository/commits/${commitSha}/diff`,
        {
          headers: {
            'Private-Token': this.token,
          },
        }
      );

      return response.data
        .map((diff: any) => diff.new_path)
        .filter((path: string) => path && this.isCodeFile(path));
    } catch (error) {
      logger.error(`Failed to fetch changed files for ${commitSha}:`, error);
      return [];
    }
  }

  async createWebhook(projectId: string, webhookUrl: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/projects/${projectId}/hooks`,
        {
          url: webhookUrl,
          push_events: true,
          merge_requests_events: true,
          token: process.env.GITLAB_WEBHOOK_SECRET,
          enable_ssl_verification: true,
        },
        {
          headers: {
            'Private-Token': this.token,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to create GitLab webhook:', error);
      throw new Error('Failed to create webhook');
    }
  }

  async deleteWebhook(projectId: string, webhookId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/projects/${projectId}/hooks/${webhookId}`,
        {
          headers: {
            'Private-Token': this.token,
          },
        }
      );
    } catch (error) {
      logger.error('Failed to delete GitLab webhook:', error);
      throw new Error('Failed to delete webhook');
    }
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sql',
      '.html', '.css', '.scss', '.less', '.vue', '.svelte', '.yaml', '.yml',
      '.json', '.xml', '.sh', '.bash', '.dockerfile', '.tf'
    ];

    const lowerName = filename.toLowerCase();
    return codeExtensions.some(ext => lowerName.endsWith(ext)) ||
           ['dockerfile', 'makefile', 'jenkinsfile'].includes(lowerName);
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const secret = process.env.GITLAB_WEBHOOK_SECRET || '';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

export default new GitLabService();
