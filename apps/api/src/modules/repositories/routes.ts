import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { validateAndParseGitHubUrl } from '@gitlens/utils';
import { db } from '@gitlens/database';

const createRepoSchema = z.object({
  url: z.string().min(1, 'Repository URL is required'),
});

export const repositoryRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. List all repositories
  fastify.get('/api/repositories', async () => {
    const repos = await db.getAllRepositories();
    return { repositories: repos };
  });

  // 2. Ingest repository by URL
  fastify.post('/api/repositories', async (request, reply) => {
    const parseResult = createRepoSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const { owner, repo, normalizedUrl } = validateAndParseGitHubUrl(parseResult.data.url);

      const repository = await db.createRepository({
        owner,
        name: repo,
        githubUrl: normalizedUrl,
        defaultBranch: 'main',
        description: `Imported GitHub repository ${owner}/${repo}`,
        primaryLanguage: 'TypeScript',
      });

      // Ensure an initial analysis record exists
      let analysis = await db.getLatestAnalysisForRepo(repository.id);
      if (!analysis) {
        analysis = await db.createAnalysis(repository.id, 'HEAD');
      }

      return reply.status(201).send({
        repository,
        analysisId: analysis.id,
      });
    } catch (err: any) {
      return reply.status(400).send({
        error: err.message || 'Failed to ingest repository',
      });
    }
  });

  // 3. Get repository by ID
  fastify.get('/api/repositories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const repo = await db.getRepositoryById(id);
    if (!repo) {
      return reply.status(404).send({ error: 'Repository not found' });
    }

    const latestAnalysis = await db.getLatestAnalysisForRepo(repo.id);

    return {
      repository: repo,
      latestAnalysis,
    };
  });

  // 4. Get file tree
  fastify.get('/api/repositories/:id/files', async (request, reply) => {
    const { id } = request.params as { id: string };
    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const files = await db.getFilesForAnalysis(analysis.id);
    return { files };
  });

  // 5. Get file content
  fastify.get('/api/repositories/:id/files/:fileId', async (request, reply) => {
    const { id, fileId } = request.params as { id: string; fileId: string };
    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const file = await db.getFileById(analysis.id, fileId);
    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    return { file };
  });

  // 6. Get technologies
  fastify.get('/api/repositories/:id/technologies', async (request, reply) => {
    const { id } = request.params as { id: string };
    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const technologies = await db.getTechnologiesForAnalysis(analysis.id);
    return { technologies };
  });
};
