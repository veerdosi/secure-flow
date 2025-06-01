import axios from 'axios';
import { User } from '../models';
import logger from '../utils/logger';

interface GitLabFile {
  name: string;
  path: string;
  content?: string;
  type: 'blob' | 'tree';
}

class GitLabService {

  private async getGitLabConfig(userId: string) {
    const user = await User.findById(userId);
    if (!user?.gitlabSettings?.apiToken) {
      throw new Error('GitLab API token not configured for user');
    }
    return {
      baseUrl: user.gitlabSettings.baseUrl || 'https://gitlab.com',
      token: user.gitlabSettings.apiToken,
    };
  }

  async getProjectFiles(projectId: string, userId: string, ref: string = 'main'): Promise<GitLabFile[]> {
    try {
      const { baseUrl, token } = await this.getGitLabConfig(userId);

      const response = await axios.get(
        `${baseUrl}/api/v4/projects/${projectId}/repository/tree`,
        {
          headers: {
            'Private-Token': token,
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

  async getFileContent(projectId: string, userId: string, filePath: string, ref: string = 'main'): Promise<string> {
    try {
      const { baseUrl, token } = await this.getGitLabConfig(userId);

      const response = await axios.get(
        `${baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw`,
        {
          headers: {
            'Private-Token': token,
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

  async getCommitInfo(projectId: string, userId: string, commitSha: string): Promise<any> {
    try {
      const { baseUrl, token } = await this.getGitLabConfig(userId);

      const response = await axios.get(
        `${baseUrl}/api/v4/projects/${projectId}/repository/commits/${commitSha}`,
        {
          headers: {
            'Private-Token': token,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch commit info for ${commitSha}:`, error);
      throw new Error(`Failed to fetch commit info: ${commitSha}`);
    }
  }

  async getChangedFiles(projectId: string, userId: string, commitSha: string): Promise<string[]> {
    try {
      const { baseUrl, token } = await this.getGitLabConfig(userId);

      const response = await axios.get(
        `${baseUrl}/api/v4/projects/${projectId}/repository/commits/${commitSha}/diff`,
        {
          headers: {
            'Private-Token': token,
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

  async createWebhook(projectId: string, userId: string, webhookUrl: string, webhookSecret: string): Promise<any> {
    try {
      const { baseUrl, token } = await this.getGitLabConfig(userId);

      const response = await axios.post(
        `${baseUrl}/api/v4/projects/${projectId}/hooks`,
        {
          url: webhookUrl,
          push_events: true,
          merge_requests_events: true,
          token: webhookSecret, // Use user's webhook secret
          enable_ssl_verification: true,
        },
        {
          headers: {
            'Private-Token': token,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to create GitLab webhook:', error);
      throw new Error('Failed to create webhook');
    }
  }

  async deleteWebhook(projectId: string, userId: string, webhookId: string): Promise<void> {
    try {
      const { baseUrl, token } = await this.getGitLabConfig(userId);

      await axios.delete(
        `${baseUrl}/api/v4/projects/${projectId}/hooks/${webhookId}`,
        {
          headers: {
            'Private-Token': token,
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

  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
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
