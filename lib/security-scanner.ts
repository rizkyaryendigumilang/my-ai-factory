/**
 * Automated Pre-Flight Security Gate (Based on agent-security-super-skill & OWASP Top 10)
 * Scans generated files for credential leaks, dangerous patterns, CORS/CSP issues,
 * and multi-tenant access control before production sandbox deployment.
 */

export interface SecurityFinding {
  ruleId: string;
  category: 'secrets' | 'injection' | 'xss' | 'auth' | 'headers' | 'dependencies';
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  filePath?: string;
  line?: number;
  description: string;
  recommendation: string;
}

export interface SecurityScanReport {
  passed: boolean;
  score: number; // 0 - 100
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: SecurityFinding[];
  scannedFilesCount: number;
  timestamp: string;
}

const SECRET_PATTERNS: { name: string; regex: RegExp; severity: SecurityFinding['severity'] }[] = [
  {
    name: 'Hardcoded Private Key',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    severity: 'critical',
  },
  {
    name: 'Hardcoded Generic API Key / Secret',
    regex: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|app[_-]?secret)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{16,}['"]/i,
    severity: 'critical',
  },
  {
    name: 'Exposed Raw Database Password in URI',
    regex: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:([^@]+)@/i,
    severity: 'critical',
  },
  {
    name: 'Hardcoded VPS Root Password or SSH Key',
    regex: /(?:ssh_key|vps_password|root_password)\s*[:=]\s*['"][^'"]{6,}['"]/i,
    severity: 'high',
  },
];

const CODE_VULN_PATTERNS: {
  name: string;
  regex: RegExp;
  category: SecurityFinding['category'];
  severity: SecurityFinding['severity'];
  recommendation: string;
}[] = [
  {
    name: 'Unsanitized dangerouslySetInnerHTML',
    regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!sanitize|DOMPurify)[a-zA-Z0-9_.]+/i,
    category: 'xss',
    severity: 'high',
    recommendation: 'Sanitasi HTML menggunakan DOMPurify atau gunakan safe markdown renderer sebelum merender.',
  },
  {
    name: 'Unsafe eval() or Function constructor',
    regex: /\b(?:eval|new Function)\s*\(/i,
    category: 'injection',
    severity: 'critical',
    recommendation: 'Hindari eksekusi kode dinamis via eval/Function constructor. Gunakan parser deterministik.',
  },
  {
    name: 'Wildcard CORS Origin in Production Route',
    regex: /['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/i,
    category: 'headers',
    severity: 'medium',
    recommendation: 'Gunakan whitelist origin spesifik daripada wildcard "*" untuk endpoint autentikasi.',
  },
  {
    name: 'Missing Multi-Tenant Isolation Check',
    regex: /where\s*:\s*\{\s*(?!user_id|tenant_id|org_id)[a-zA-Z0-9_]+\s*:/i,
    category: 'auth',
    severity: 'low',
    recommendation: 'Pastikan kueri database pada endpoint user menyertakan filter user_id atau tenant_id.',
  },
];

/**
 * Scans a project's files against OWASP Top 10 security standards.
 */
export function scanProjectFiles(
  files: { filePath: string; fileContent: string }[]
): SecurityScanReport {
  const findings: SecurityFinding[] = [];
  let scannedCount = 0;

  for (const file of files) {
    // Only inspect source files
    if (
      !file.filePath.match(/\.(ts|tsx|js|jsx|json|mjs|cjs|html|env)$/i) ||
      file.filePath.includes('node_modules')
    ) {
      continue;
    }

    scannedCount++;
    const lines = file.fileContent.split('\n');

    // 1. Scan for hardcoded credentials & secrets
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      for (const secretRule of SECRET_PATTERNS) {
        if (secretRule.regex.test(lineText)) {
          findings.push({
            ruleId: 'SEC-SECRET-LEAK',
            category: 'secrets',
            title: secretRule.name,
            severity: secretRule.severity,
            filePath: file.filePath,
            line: i + 1,
            description: `Ditemukan potensi kredensial sensitif pada baris ${i + 1}: ${lineText.trim().slice(0, 60)}...`,
            recommendation: 'Pindahkan kredensial ke file .env.local atau environment variable server.',
          });
        }
      }

      // 2. Scan for dangerous code patterns
      for (const vulnRule of CODE_VULN_PATTERNS) {
        if (vulnRule.regex.test(lineText)) {
          findings.push({
            ruleId: `SEC-${vulnRule.category.toUpperCase()}`,
            category: vulnRule.category,
            title: vulnRule.name,
            severity: vulnRule.severity,
            filePath: file.filePath,
            line: i + 1,
            description: `Pola rawan celah keamanan terdeteksi: ${vulnRule.name} pada ${file.filePath}:${i + 1}`,
            recommendation: vulnRule.recommendation,
          });
        }
      }
    }

    // 3. Scan package.json for insecure dependencies if present
    if (file.filePath.endsWith('package.json')) {
      try {
        const pkg = JSON.parse(file.fileContent);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (deps['axios'] && deps['axios'].startsWith('^0.')) {
          findings.push({
            ruleId: 'SEC-DEP-OUTDATED',
            category: 'dependencies',
            title: 'Outdated Axios Version',
            severity: 'medium',
            filePath: file.filePath,
            description: 'Axios versi 0.x memiliki kerentanan SSRF yang diketahui.',
            recommendation: 'Upgrade ke axios ^1.7.0 atau gunakan native fetch().',
          });
        }
      } catch {}
    }
  }

  // Calculate score & severity counts
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const f of findings) {
    if (f.severity === 'critical') criticalCount++;
    else if (f.severity === 'high') highCount++;
    else if (f.severity === 'medium') mediumCount++;
    else if (f.severity === 'low') lowCount++;
  }

  // Base score 100, deduction per finding
  const deduction = criticalCount * 25 + highCount * 15 + mediumCount * 5 + lowCount * 2;
  const score = Math.max(0, 100 - deduction);
  const passed = criticalCount === 0 && highCount === 0;

  return {
    passed,
    score,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    findings,
    scannedFilesCount: scannedCount,
    timestamp: new Date().toISOString(),
  };
}
