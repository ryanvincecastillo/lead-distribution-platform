import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next 16 writes AGENTS.md / CLAUDE.md scaffolding into the repo on boot; this project
  // keeps its documentation in README.md only.
  agentRules: false,
};

export default nextConfig;
