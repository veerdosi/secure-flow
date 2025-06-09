import axios from 'axios';
import { User } from '../models';
import logger from '../utils/logger';

interface GitLabFile {
  id: string;
  name: string;
  type: 'blob' | 'tree';
  path: string;
  mode: string;
}

interface GitLabProject {
  id: number;
  name: string;
  path: string;
  description: string;
  web_url: string;
  default_branch: string;
}

class GitLabService {
  private async getGitLabConfig(userId: string) {
    const user = await User.findById(userId);
    if (!user?.gitlabSettings?.apiToken) {
      throw new Error('GitLab API token not configured');
    }
    return user.gitlabSettings;
  }

  private createGitLabClient(baseUrl: string, apiToken: string) {
    return axios.create({
      baseURL: `${baseUrl}/api/v4`,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async validateProjectAccess(projectId: string, userId: string): Promise<boolean> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.get(`/projects/${projectId}`);
      return response.status === 200;
    } catch (error: any) {
      logger.error('GitLab project validation failed:', error);
      if (error.response?.status === 404) {
        throw new Error('Project not found or access denied');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid GitLab API token');
      }
      throw new Error(`Failed to validate GitLab project: ${error.message}`);
    }
  }

  async getProject(projectId: string, userId: string): Promise<GitLabProject> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.get(`/projects/${projectId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get GitLab project:', error);
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  async getProjectFiles(projectId: string, userId: string, ref: string = 'main'): Promise<GitLabFile[]> {
    logger.info(`📁 Starting GitLab file retrieval`, {
      projectId,
      userId,
      ref
    });

    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      logger.info(`🔗 Making GitLab API request for project tree`, {
        projectId,
        ref,
        baseUrl: config.baseUrl
      });

      // Get repository tree
      const response = await client.get(`/projects/${projectId}/repository/tree`, {
        params: {
          ref,
          recursive: true,
          per_page: 100
        }
      });

      logger.info(`📦 GitLab API response received`, {
        projectId,
        totalItems: response.data.length,
        statusCode: response.status
      });

      // Filter for files only and common source code extensions
      const codeExtensions = [
        '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php',
        '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml',
        '.sh', '.bash', '.ps1', '.sql', '.html', '.css', '.scss', '.less',
        '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'
      ];

      const filteredFiles = response.data
        .filter((item: GitLabFile) => {
          if (item.type !== 'blob') return false;
          return codeExtensions.some(ext => item.name.toLowerCase().endsWith(ext));
        })
        .map((item: GitLabFile) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          path: item.path,
          mode: item.mode
        }));

      logger.info(`✅ GitLab files filtered and processed`, {
        projectId,
        totalFiles: response.data.length,
        codeFiles: filteredFiles.length,
        fileTypes: filteredFiles.reduce((acc: Record<string, number>, f: GitLabFile) => {
          const ext = f.name.split('.').pop() || 'unknown';
          acc[ext] = (acc[ext] || 0) + 1;
          return acc;
        }, {})
      });

      return filteredFiles;
    } catch (error: any) {
      logger.error(`❌ Failed to get GitLab project files`, {
        projectId,
        userId,
        ref,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        gitlabError: error.response?.data,
        url: error.config?.url
      });

      if (error.response?.status === 404) {
        throw new Error(`GitLab project ${projectId} not found or branch '${ref}' doesn't exist. Check project ID and branch name.`);
      }
      if (error.response?.status === 401) {
        throw new Error('GitLab API token is invalid or expired');
      }
      if (error.response?.status === 403) {
        throw new Error('Access denied to GitLab project. Check token permissions.');
      }

      throw new Error(`Failed to get project files: ${error.message}`);
    }
  }

  async getFileContent(projectId: string, userId: string, filePath: string, ref: string = 'main'): Promise<string> {
    logger.info(`📄 Fetching file content from GitLab`, {
      projectId,
      filePath,
      ref,
      userId
    });

    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const encodedPath = encodeURIComponent(filePath);
      
      logger.info(`🌐 Making GitLab API request for file content`, {
        projectId,
        encodedPath,
        ref
      });

      const response = await client.get(`/projects/${projectId}/repository/files/${encodedPath}/raw`, {
        params: { ref }
      });

      logger.info(`✅ File content retrieved successfully`, {
        projectId,
        filePath,
        contentLength: response.data.length,
        statusCode: response.status
      });

      return response.data;
    } catch (error: any) {
      logger.error(`❌ Failed to get GitLab file content`, {
        projectId,
        filePath,
        ref,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw new Error(`Failed to get file content: ${error.message}`);
    }
  }

  async getBranches(projectId: string, userId: string): Promise<string[]> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.get(`/projects/${projectId}/repository/branches`);
      return response.data.map((branch: { name: string }) => branch.name);
    } catch (error: any) {
      logger.error('Failed to get GitLab branches:', error);
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }

  async getCommits(projectId: string, userId: string, ref: string = 'main', limit: number = 10): Promise<any[]> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.get(`/projects/${projectId}/repository/commits`, {
        params: {
          ref_name: ref,
          per_page: limit
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get GitLab commits:', error);
      throw new Error(`Failed to get commits: ${error.message}`);
    }
  }

  async createWebhook(projectId: string, userId: string, url: string, secretToken: string): Promise<string> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const webhookData = {
        url,
        push_events: true,
        merge_requests_events: true,
        tag_push_events: true,
        token: secretToken,
        enable_ssl_verification: true,
        push_events_branch_filter: '', // All branches
      };

      const response = await client.post(`/projects/${projectId}/hooks`, webhookData);
      
      logger.info(`GitLab webhook created for project ${projectId}: ${response.data.id}`);
      return response.data.id.toString();
    } catch (error: any) {
      logger.error('Failed to create GitLab webhook:', error);
      
      if (error.response?.status === 422) {
        // Webhook might already exist
        const existingHooks = await this.getWebhooks(projectId, userId);
        const existingHook = existingHooks.find((hook: { url: string; id: number }) => hook.url === url);
        if (existingHook) {
          logger.info(`Using existing GitLab webhook for project ${projectId}: ${existingHook.id}`);
          return existingHook.id.toString();
        }
      }
      
      throw new Error(`Failed to create webhook: ${error.message}`);
    }
  }

  async updateWebhook(projectId: string, userId: string, webhookId: string, url: string, secretToken: string): Promise<void> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const webhookData = {
        url,
        push_events: true,
        merge_requests_events: true,
        tag_push_events: true,
        token: secretToken,
        enable_ssl_verification: true,
        push_events_branch_filter: '',
      };

      await client.put(`/projects/${projectId}/hooks/${webhookId}`, webhookData);
      
      logger.info(`GitLab webhook updated for project ${projectId}: ${webhookId}`);
    } catch (error: any) {
      logger.error('Failed to update GitLab webhook:', error);
      throw new Error(`Failed to update webhook: ${error.message}`);
    }
  }

  async deleteWebhook(projectId: string, userId: string, webhookId: string): Promise<void> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      await client.delete(`/projects/${projectId}/hooks/${webhookId}`);
      
      logger.info(`GitLab webhook deleted for project ${projectId}: ${webhookId}`);
    } catch (error: any) {
      logger.error('Failed to delete GitLab webhook:', error);
      throw new Error(`Failed to delete webhook: ${error.message}`);
    }
  }

  async getWebhooks(projectId: string, userId: string): Promise<any[]> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.get(`/projects/${projectId}/hooks`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get GitLab webhooks:', error);
      throw new Error(`Failed to get webhooks: ${error.message}`);
    }
  }

  async testConnection(apiToken: string, baseUrl: string): Promise<any> {
    try {
      const client = this.createGitLabClient(baseUrl, apiToken);
      const response = await client.get('/user');
      
      return {
        success: true,
        user: {
          id: response.data.id,
          username: response.data.username,
          name: response.data.name,
          email: response.data.email,
          avatar_url: response.data.avatar_url,
        }
      };
    } catch (error: any) {
      logger.error('GitLab connection test failed:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid GitLab API token');
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Cannot connect to GitLab server. Please check the URL.');
      }
      
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  async getUserProjects(userId: string, page: number = 1, perPage: number = 20): Promise<any[]> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.get('/projects', {
        params: {
          membership: true,
          page,
          per_page: perPage,
          order_by: 'updated_at',
          sort: 'desc'
        }
      });

      return response.data.map((project: {
        id: number;
        name: string;
        path: string;
        description: string;
        web_url: string;
        default_branch: string;
        last_activity_at: string;
        visibility: string;
        namespace: any;
      }) => ({
        id: project.id,
        name: project.name,
        path: project.path,
        description: project.description,
        web_url: project.web_url,
        default_branch: project.default_branch,
        last_activity_at: project.last_activity_at,
        visibility: project.visibility,
        namespace: project.namespace
      }));
    } catch (error: any) {
      logger.error('Failed to get GitLab user projects:', error);
      throw new Error(`Failed to get user projects: ${error.message}`);
    }
  }

  async validateWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const crypto = require('crypto');
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      
      // GitLab sends signature without 'sha256=' prefix
      const receivedSignature = signature.startsWith('sha256=') 
        ? signature.slice(7) 
        : signature;
      
      return crypto.timingSafeEqual(
        Buffer.from(computedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error: any) {
      logger.error('Webhook signature validation failed:', error);
      return false;
    }
  }

  async processWebhookEvent(projectId: string, eventType: string, payload: any): Promise<void> {
    try {
      logger.info(`Processing GitLab webhook event: ${eventType} for project ${projectId}`);

      // This method is now mainly for logging and validation
      // The actual analysis triggering is handled in the webhook routes
      // to avoid circular dependencies and better error handling
      
      let commitInfo = null;
      
      switch (eventType) {
        case 'push':
        case 'Push Hook':
          if (payload.commits && payload.commits.length > 0) {
            const latestCommit = payload.commits[payload.commits.length - 1];
            commitInfo = {
              hash: latestCommit.id,
              message: latestCommit.message,
              author: latestCommit.author,
              branch: payload.ref?.replace('refs/heads/', ''),
              changedFiles: [...new Set([
                ...(latestCommit.added || []),
                ...(latestCommit.modified || []),
                ...(latestCommit.removed || [])
              ])]
            };
          }
          break;
          
        case 'merge_request':
        case 'Merge Request Hook':
          if (payload.object_attributes) {
            const mr = payload.object_attributes;
            commitInfo = {
              hash: mr.last_commit?.id || mr.merge_commit_sha,
              message: `Merge request: ${mr.title}`,
              author: payload.user,
              branch: mr.target_branch,
              isMergeRequest: true,
              mergeRequestIid: mr.iid
            };
          }
          break;
          
        case 'tag_push':
        case 'Tag Push Hook':
          if (payload.commits && payload.commits.length > 0) {
            const latestCommit = payload.commits[payload.commits.length - 1];
            commitInfo = {
              hash: latestCommit.id,
              message: `Tag: ${payload.ref?.replace('refs/tags/', '')}`,
              author: latestCommit.author,
              isTag: true,
              tagName: payload.ref?.replace('refs/tags/', '')
            };
          }
          break;
      }

      if (commitInfo) {
        logger.info(`Webhook event processed for project ${projectId}:`, {
          commit: commitInfo.hash,
          branch: commitInfo.branch,
          message: commitInfo.message,
          author: commitInfo.author?.name
        });
      } else {
        logger.warn(`No commit information found in webhook payload for project ${projectId}`);
      }
    } catch (error: any) {
      logger.error('Failed to process GitLab webhook event:', error);
      throw new Error(`Failed to process webhook event: ${error.message}`);
    }
  }

  /**
   * Create a new branch from a base branch
   */
  async createBranch(projectId: string, userId: string, branchName: string, baseBranch: string = 'main'): Promise<any> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.post(`/projects/${projectId}/repository/branches`, {
        branch: branchName,
        ref: baseBranch
      });

      logger.info(`✅ Branch created: ${branchName} from ${baseBranch}`, {
        projectId,
        branchName,
        baseBranch
      });

      return response.data;
    } catch (error: any) {
      logger.error(`❌ Failed to create branch ${branchName}`, {
        projectId,
        branchName,
        baseBranch,
        error: error.message
      });
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Commit file changes to a branch
   */
  async commitFileChange(
    projectId: string, 
    userId: string, 
    filePath: string, 
    content: string, 
    commitMessage: string, 
    branch: string
  ): Promise<any> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.post(`/projects/${projectId}/repository/commits`, {
        branch,
        commit_message: commitMessage,
        actions: [
          {
            action: 'update',
            file_path: filePath,
            content: content
          }
        ]
      });

      logger.info(`✅ File committed: ${filePath}`, {
        projectId,
        filePath,
        branch,
        commitId: response.data.id
      });

      return response.data;
    } catch (error: any) {
      logger.error(`❌ Failed to commit file ${filePath}`, {
        projectId,
        filePath,
        branch,
        error: error.message
      });
      throw new Error(`Failed to commit file: ${error.message}`);
    }
  }

  /**
   * Create a merge request
   */
  async createMergeRequest(
    projectId: string,
    userId: string,
    sourceBranch: string,
    targetBranch: string,
    title: string,
    description: string
  ): Promise<any> {
    try {
      const config = await this.getGitLabConfig(userId);
      const client = this.createGitLabClient(config.baseUrl, config.apiToken);

      const response = await client.post(`/projects/${projectId}/merge_requests`, {
        source_branch: sourceBranch,
        target_branch: targetBranch,
        title,
        description,
        remove_source_branch: true
      });

      logger.info(`✅ Merge request created: ${title}`, {
        projectId,
        sourceBranch,
        targetBranch,
        mergeRequestId: response.data.iid
      });

      return response.data;
    } catch (error: any) {
      logger.error(`❌ Failed to create merge request`, {
        projectId,
        sourceBranch,
        targetBranch,
        title,
        error: error.message
      });
      throw new Error(`Failed to create merge request: ${error.message}`);
    }
  }
}

export default new GitLabService();