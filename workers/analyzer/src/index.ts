import { db } from '@gitlens/database';
import { sleep } from '@gitlens/utils';

export async function startWorker() {
  console.log('👷 GitLens Analysis Worker daemon started.');
  console.log('Listening for repository ingestion jobs...');
}

if (require.main === module) {
  startWorker().catch((err) => {
    console.error('Worker failed to start:', err);
    process.exit(1);
  });
}
