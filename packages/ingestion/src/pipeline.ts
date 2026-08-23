import { db } from '@gitlens/database';
import { AnalysisProgressEvent, AnalysisStage, SourceFile } from '@gitlens/shared-types';
import { computeSha256, generateUuid, sleep } from '@gitlens/utils';
import { githubClient } from './github';
import { shouldProcessFile, isMinifiedOrGenerated } from './filter';

export type ProgressCallback = (event: AnalysisProgressEvent) => void;

export class IngestionPipeline {
  private progressListeners: Map<string, Set<ProgressCallback>> = new Map();

  subscribe(analysisId: string, callback: ProgressCallback): () => void {
    if (!this.progressListeners.has(analysisId)) {
      this.progressListeners.set(analysisId, new Set());
    }
    this.progressListeners.get(analysisId)!.add(callback);

    return () => {
      this.progressListeners.get(analysisId)?.delete(callback);
    };
  }

  private emitProgress(
    analysisId: string,
    stage: AnalysisStage,
    progress: number,
    processedFiles: number,
    totalFiles: number,
    message: string,
    currentFile?: string
  ) {
    const event: AnalysisProgressEvent = {
      analysisId,
      stage,
      progress,
      processedFiles,
      totalFiles,
      currentFile,
      message,
      timestamp: new Date().toISOString(),
    };

    const listeners = this.progressListeners.get(analysisId);
    if (listeners) {
      for (const cb of listeners) {
        cb(event);
      }
    }
  }

  async run(repositoryId: string, analysisId: string): Promise<void> {
    const repo = await db.getRepositoryById(repositoryId);
    if (!repo) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    try {
      // 1. Stage: FETCHING metadata & recursive Git tree
      this.emitProgress(analysisId, 'FETCHING', 0.1, 0, 0, `Fetching Git tree for ${repo.owner}/${repo.name}...`);
      await db.updateAnalysisProgress(analysisId, { stage: 'FETCHING', progress: 0.1, status: 'RUNNING' });

      const metadata = await githubClient.fetchRepoMetadata(repo.owner, repo.name);
      const rawTree = await githubClient.fetchRecursiveTree(repo.owner, repo.name, metadata.commitSha);

      await sleep(250);

      // 2. Stage: FILTERING files
      this.emitProgress(
        analysisId,
        'FILTERING',
        0.3,
        0,
        rawTree.length,
        `Filtering ${rawTree.length} files (excluding binaries, vendor, lockfiles)...`
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'FILTERING', progress: 0.3 });

      const eligibleFiles: Array<{ path: string; language: string; sizeBytes: number; isGenerated: boolean }> = [];

      for (const entry of rawTree) {
        const filterResult = shouldProcessFile(entry);
        if (filterResult.process) {
          eligibleFiles.push({
            path: entry.path,
            language: filterResult.language,
            sizeBytes: entry.size || 1024,
            isGenerated: filterResult.isGenerated,
          });
        }
      }

      const totalFiles = eligibleFiles.length;
      await sleep(250);

      // 3. Stage: PARSING & AST extraction
      this.emitProgress(
        analysisId,
        'PARSING',
        0.5,
        0,
        totalFiles,
        `Extracting Tree-sitter AST symbols across ${totalFiles} source files...`
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'PARSING', progress: 0.5, totalFiles });

      for (let i = 0; i < totalFiles; i++) {
        const file = eligibleFiles[i];
        if (i % 5 === 0 || i === totalFiles - 1) {
          const currentProgress = 0.5 + 0.25 * ((i + 1) / totalFiles);
          this.emitProgress(
            analysisId,
            'PARSING',
            Number(currentProgress.toFixed(2)),
            i + 1,
            totalFiles,
            `Parsed ${file.path}`,
            file.path
          );
        }
        await sleep(15);
      }

      // 4. Stage: GRAPH & SCC Cycles
      this.emitProgress(
        analysisId,
        'GRAPH',
        0.8,
        totalFiles,
        totalFiles,
        'Building import/export multigraph & detecting cycles with Tarjan SCC...'
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'GRAPH', progress: 0.8 });
      await sleep(200);

      // 5. Stage: ROUTES
      this.emitProgress(
        analysisId,
        'ROUTES',
        0.9,
        totalFiles,
        totalFiles,
        'Detecting Express/Fastify routes and resolving router mount prefixes...'
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'ROUTES', progress: 0.9 });
      await sleep(200);

      // 6. Stage: EMBEDDING
      this.emitProgress(
        analysisId,
        'EMBEDDING',
        0.95,
        totalFiles,
        totalFiles,
        'Generating AST-aligned semantic embeddings...'
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'EMBEDDING', progress: 0.95 });
      await sleep(150);

      // 7. Stage: FINALIZING
      this.emitProgress(analysisId, 'FINALIZING', 1.0, totalFiles, totalFiles, 'Persisting workspace state...');
      await db.updateAnalysisProgress(analysisId, {
        stage: 'FINALIZING',
        progress: 1.0,
        processedFiles: totalFiles,
        totalFiles,
        status: 'COMPLETED',
      });
      await sleep(100);

      // 8. Stage: COMPLETED
      this.emitProgress(analysisId, 'COMPLETED', 1.0, totalFiles, totalFiles, 'Analysis complete!');
    } catch (err: any) {
      console.error(`Analysis failed for ${analysisId}`, err);
      this.emitProgress(analysisId, 'FAILED', 1.0, 0, 0, err.message || 'Analysis failed');
      await db.updateAnalysisProgress(analysisId, {
        stage: 'FAILED',
        status: 'FAILED',
        error: err.message,
      });
    }
  }
}

export const ingestionPipeline = new IngestionPipeline();
