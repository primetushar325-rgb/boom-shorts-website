#!/usr/bin/env node
/**
 * Pre-commit / CI guard against committing live credentials.
 *
 * This exists because a real Supabase pooler password was committed in
 * 4a64128 (in drizzle.config.json) and had to be rotated. Deleting it from the
 * working tree does NOT remove it from history, so the only durable fix is to
 * stop new secrets getting in — this script fails the commit if it sees one.
 *
 * Scans staged files by default; `--all` scans the whole working tree.
 * Placeholders in .env.example are explicitly allowed.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const scanAll = process.argv.includes("--all");

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const files = scanAll
  ? sh("git ls-files").split("\n").filter(Boolean)
  : sh("git diff --cached --name-only --diff-filter=ACM").split("\n").filter(Boolean);

const SKIP = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|lock|map)$/i;

/** A password/host that looks real rather than a placeholder. */
const PLACEHOLDER = /^(your[-_]|<|\[|xxxx|changeme|change_me|replace|placeholder|dummy|example|sample|\$\{)/i;

const RULES = [
  {
    name: "Postgres/Supabase connection string with a real password",
    test: (s) => {
      const m = s.match(/postgres(?:ql)?:\/\/([^:/@\s]+):([^@\s]+)@/);
      if (!m) return false;
      const [, user, pass] = m;
      if (PLACEHOLDER.test(pass) || PLACEHOLDER.test(user)) return false;
      // `postgres.<project-ref>` usernames carry the ref in the username.
      if (/^postgres\./i.test(user) && !PLACEHOLDER.test(user.replace(/^postgres\./i, ""))) return true;
      return pass.length >= 8;
    },
  },
  {
    name: "Supabase secret key (service_role / JWT)",
    test: (s) => /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/.test(s),
  },
  {
    name: "Supabase secret key (sb_secret_)",
    test: (s) => {
      const m = s.match(/sb_secret_([A-Za-z0-9_-]+)/);
      return Boolean(m) && !PLACEHOLDER.test(m[1]);
    },
  },
  {
    name: "Vercel access token (vcp_)",
    test: (s) => {
      const m = s.match(/vcp_([A-Za-z0-9]+)/);
      return Boolean(m) && !PLACEHOLDER.test(m[1]);
    },
  },
  { name: "OpenAI-style key", test: (s) => /sk-[A-Za-z0-9]{20,}/.test(s) },
  { name: "AWS access key id", test: (s) => /AKIA[0-9A-Z]{16}/.test(s) },
  {
    name: "Supabase project host (real ref, not a placeholder)",
    test: (s) => {
      const m = s.match(/([a-z0-9]{15,})\.supabase\.co/);
      return Boolean(m) && !PLACEHOLDER.test(m[1]);
    },
  },
];

let problems = 0;
for (const file of files) {
  if (SKIP.test(file) || !existsSync(file)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const rule of RULES) {
    if (rule.test(text)) {
      console.error(`✗ ${file}\n    ${rule.name}`);
      problems++;
    }
  }
}

if (problems) {
  console.error(
    `\nBlocked: ${problems} probable secret(s) found.\n` +
      "Move the value into .env (which is gitignored) and reference it via process.env.\n" +
      "If this is a false positive on a placeholder, make the placeholder start with\n" +
      "`your-`, `<`, `[`, `xxxx` or `changeme` so the scanner recognises it.\n",
  );
  process.exit(1);
}

console.log(`✓ secret scan clean (${files.length} file(s) checked)`);
