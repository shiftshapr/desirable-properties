import fs from 'fs';
import path from 'path';

export function readSupportKnowledgeBundle() {
  const dataDir = path.join(process.cwd(), 'data');
  const runbooksPath = path.join(dataDir, 'support-runbooks.json');
  const agentPath = path.join(dataDir, 'support-hermes-agent.md');
  let runbooks: Record<string, unknown> = { runbooks: [], faq: {}, escalationRules: [] };
  let agentPrompt = '';
  try {
    runbooks = JSON.parse(fs.readFileSync(runbooksPath, 'utf8'));
  } catch {
    /* defaults */
  }
  try {
    agentPrompt = fs.readFileSync(agentPath, 'utf8');
  } catch {
    /* empty */
  }
  return { runbooks, agentPrompt };
}
