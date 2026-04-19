/**
 * One-off seed script. Run:
 *   GITHUB_SEED_TOKEN=ghp_xxx GITHUB_SEED_REPO=featwrap/demo \
 *     pnpm tsx scripts/seed-demo-repo.ts
 *
 * Requires the repo to already exist and be empty, and the token to have
 * `repo` scope. Creates branches, commits a file change on each, and opens+
 * merges three PRs.
 */

const token = process.env.GITHUB_SEED_TOKEN;
const repo = process.env.GITHUB_SEED_REPO;
if (!token || !repo) {
  console.error('Set GITHUB_SEED_TOKEN and GITHUB_SEED_REPO=owner/name');
  process.exit(1);
}
const [owner, name] = repo.split('/');
const base = 'https://api.github.com';
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'content-type': 'application/json' };

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

type Ref = { object: { sha: string } };

async function getDefaultBranch(): Promise<{ ref: string; sha: string }> {
  const repoInfo = await gh<{ default_branch: string }>(`/repos/${owner}/${name}`);
  const ref = await gh<Ref>(`/repos/${owner}/${name}/git/refs/heads/${repoInfo.default_branch}`);
  return { ref: repoInfo.default_branch, sha: ref.object.sha };
}

async function createFileOnBranch(branch: string, path: string, content: string, message: string, baseSha: string) {
  await gh(`/repos/${owner}/${name}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  }).catch(() => null);
  await gh(`/repos/${owner}/${name}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    }),
  });
}

async function openAndMergePR(title: string, body: string, head: string, base: string): Promise<void> {
  const pr = await gh<{ number: number }>(`/repos/${owner}/${name}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, body, head, base }),
  });
  await gh(`/repos/${owner}/${name}/pulls/${pr.number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: 'squash' }),
  });
}

async function main() {
  const def = await getDefaultBranch();
  await gh(`/repos/${owner}/${name}/contents/README.md`, {
    method: 'PUT',
    body: JSON.stringify({ message: 'init', content: Buffer.from('# demo\n').toString('base64'), branch: def.ref }),
  }).catch(() => null);
  const updated = await getDefaultBranch();

  await createFileOnBranch('seed/price-filter', 'docs/price-filter.md',
    '# Price filter\n\nCustomers can now filter search results by price range.\n',
    'feat: add price filter to search', updated.sha);
  await openAndMergePR(
    'Add price filter to search',
    'Customers can now filter search results by price range.\n\nFixes #1',
    'seed/price-filter', def.ref,
  );

  const afterFirst = await getDefaultBranch();
  await createFileOnBranch('seed/cart-hook', 'docs/cart-hook.md',
    '# Cart hook\n\nExtracted shared cart logic into `useCart()`. No user-visible change.\n',
    'refactor: extract useCart hook', afterFirst.sha);
  await openAndMergePR(
    'Extract cart hook into useCart()',
    'Refactor only. Internal cleanup; no user-visible change.',
    'seed/cart-hook', def.ref,
  );

  const afterSecond = await getDefaultBranch();
  await createFileOnBranch('seed/tooltip-typo', 'docs/tooltip.md',
    '# Tooltip\n\nFixes a small typo in the cart tooltip copy.\n',
    'fix: typo in cart tooltip copy', afterSecond.sha);
  await openAndMergePR(
    'Fix typo in cart tooltip copy',
    'Tiny copy fix.',
    'seed/tooltip-typo', def.ref,
  );

  console.log('seeded 3 PRs successfully');
}

main().catch(err => { console.error(err); process.exit(1); });
