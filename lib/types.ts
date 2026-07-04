export type AgentResponse = {
  agentUsed: 'finance' | 'hiring' | 'legal';
  draft: string;
  requiresApproval: boolean;
  summary: string;
};
