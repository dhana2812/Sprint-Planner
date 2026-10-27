/**
 * Domain & Concept Analyzer
 * Extracts structural semantics, tech domain, user personas, and architectural requirements
 * from raw product prompts.
 */

const DOMAIN_PROFILES = {
  ai_ml: {
    keywords: ['ai', 'copilot', 'llm', 'gpt', 'model', 'rag', 'agent', 'nlp', 'embedding', 'vector', 'classifier', 'machine learning', 'prompt'],
    category: 'AI / Machine Learning',
    techRecommendations: ['Python / FastAPI or Node.js', 'PostgreSQL with pgvector', 'OpenAI/Anthropic SDK', 'Redis for prompt cache', 'Tailwind/Vanilla CSS UI'],
    nonFunctionalFocus: 'Inference latency <1.5s, token streaming, rate-limit resilience, hallucination guardrails',
    defaultPersonas: [
      { name: 'Dr. Sarah Lin', role: 'Staff Product Manager', pain: 'Manual repetitive analysis consumes 4+ hours daily', goal: 'Autonomous intelligent synthesis and instant action items' },
      { name: 'Marcus Vance', role: 'Lead Architect', pain: 'High token costs and uncontrolled latency in LLM pipelines', goal: 'Predictable caching, streaming responses, and fallbacks' }
    ]
  },
  fintech: {
    keywords: ['payment', 'billing', 'stripe', 'invoice', 'subscription', 'finance', 'wallet', 'crypto', 'ledger', 'tax', 'accounting', 'checkout'],
    category: 'FinTech & Payments',
    techRecommendations: ['Node.js / Express or Go', 'PostgreSQL with strict ACID transactions', 'Stripe API / Webhooks', 'Vault for secrets', 'Audit logging table'],
    nonFunctionalFocus: 'PCI-DSS readiness, idempotent webhooks, zero double-charge guarantee, 99.99% transaction reliability',
    defaultPersonas: [
      { name: 'Elena Rostova', role: 'Head of Finance & Operations', pain: 'Discrepancies in billing cycles and manual invoice chasing', goal: 'Automated reconciliation and real-time subscription lifecycle tracking' },
      { name: 'David Kim', role: 'End-User / Account Admin', pain: 'Confusing invoice breakdowns and friction updating payment methods', goal: 'Self-serve billing portal with transparent receipts and tiered upgrades' }
    ]
  },
  collaboration: {
    keywords: ['collab', 'whiteboard', 'real-time', 'realtime', 'canvas', 'websocket', 'multiplayer', 'shared', 'chat', 'comments', 'presence'],
    category: 'Real-Time Collaboration',
    techRecommendations: ['Node.js + WebSockets / Socket.io', 'Redis Pub/Sub', 'CRDT (Yjs) or Operational Transformation', 'PostgreSQL', 'HTML5 Canvas / SVG'],
    nonFunctionalFocus: '<50ms peer-to-peer sync latency, conflict resolution, offline queueing, graceful reconnection',
    defaultPersonas: [
      { name: 'Maya Patel', role: 'Design Lead', pain: 'Desynchronized edits and lockouts during team brainstorming sessions', goal: 'Sub-50ms multiplayer cursor tracking and lossless simultaneous edits' },
      { name: 'Alex Torres', role: 'Remote Engineering Lead', pain: 'Lost notes and lack of contextual comment threads', goal: 'Live canvas anchoring with revision history rollback' }
    ]
  },
  security_auth: {
    keywords: ['auth', 'biometric', 'sso', 'zero-trust', 'oauth', 'identity', 'mfa', 'jwt', 'security', 'role', 'rbac', 'permission', 'vault'],
    category: 'Identity & Security',
    techRecommendations: ['Node.js / Passport / WebAuthn', 'Redis for token blacklisting & rate-limiting', 'PostgreSQL with encrypted columns', 'Argon2 password hashing'],
    nonFunctionalFocus: 'Zero-trust session validation, brute-force mitigation, audit trail immutability, WebAuthn FIDO2 compliance',
    defaultPersonas: [
      { name: 'Rachel Chen', role: 'Chief Information Security Officer (CISO)', pain: 'Credential stuffing threats and brittle role permission management', goal: 'Hardware-backed MFA, fine-grained RBAC, and instant audit trails' },
      { name: 'Liam O\'Connor', role: 'Enterprise IT Administrator', pain: 'Manual onboarding/offboarding workflows across multiple SaaS tools', goal: 'Automated SCIM provisioning and unified Single Sign-On (SSO)' }
    ]
  },
  ecommerce_saas: {
    keywords: ['catalog', 'cart', 'order', 'store', 'inventory', 'customer', 'crm', 'saas', 'workflow', 'automation', 'portal', 'dashboard'],
    category: 'Enterprise SaaS & Operations',
    techRecommendations: ['Node.js / Express', 'PostgreSQL / SQLite', 'Redis for query caching', 'Modern Responsive Frontend', 'ElasticSearch / MeiliSearch'],
    nonFunctionalFocus: 'Sub-200ms page loads, optimistic UI updates, multi-tenant data isolation, WCAG 2.1 AA accessibility',
    defaultPersonas: [
      { name: 'Jordan Hayes', role: 'Director of Customer Experience', pain: 'Fragmented customer touchpoints and missed follow-up deadlines', goal: 'Unified 360-degree customer activity timeline with automated triggers' },
      { name: 'Samantha Wu', role: 'Operations Specialist', pain: 'Manual spreadsheet updates prone to data entry errors', goal: 'Real-time dashboard with bulk actions and automated alert rules' }
    ]
  }
};

function analyzeFeaturePrompt(prompt, options = {}) {
  const lower = prompt.toLowerCase();

  // 1. Detect matching domain
  let detectedDomainKey = 'ecommerce_saas';
  let highestScore = 0;

  for (const [key, profile] of Object.entries(DOMAIN_PROFILES)) {
    const score = profile.keywords.reduce((acc, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = (lower.match(regex) || []).length;
      return acc + (matches * 2) + (lower.includes(word) ? 1 : 0);
    }, 0);

    if (score > highestScore) {
      highestScore = score;
      detectedDomainKey = key;
    }
  }

  const domain = DOMAIN_PROFILES[detectedDomainKey];

  // 2. Derive Title
  let title = prompt.trim().split(/[\n.]/)[0];
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  // Capitalize title
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // 3. User input overrides
  const targetAudience = options.targetAudience && options.targetAudience.trim() !== ''
    ? options.targetAudience.trim()
    : 'Mid-to-enterprise product teams, operations leads, and technical stakeholders';

  const techStack = options.techStack && options.techStack.trim() !== ''
    ? options.techStack.trim()
    : domain.techRecommendations.join(', ');

  const riskProfile = options.riskProfile || 'Balanced';
  const velocity = parseInt(options.teamVelocity, 10) || 30;

  return {
    rawPrompt: prompt,
    title,
    detectedDomainKey,
    domainCategory: domain.category,
    techStack,
    targetAudience,
    riskProfile,
    velocity,
    nonFunctionalFocus: domain.nonFunctionalFocus,
    personas: domain.defaultPersonas
  };
}

module.exports = {
  analyzeFeaturePrompt,
  DOMAIN_PROFILES
};
