export type AgentResponse = {
  agentUsed: 'finance' | 'hiring' | 'legal' | 'gtm';
  draft: string;
  requiresApproval: boolean;
  summary: string;
};
