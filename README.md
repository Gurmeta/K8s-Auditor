# K8s Auditor

A Kubernetes manifest linter that runs entirely in the browser. Paste a Deployment, StatefulSet, Pod, Job or Service and get a 0 to 100 security score, a list of findings that each say how to fix them, and an Auto-Fix that returns a corrected YAML with a diff to review first.

Live: `https://gurmeta.github.io/K8s-Auditor/`

The interface is available in English and Bulgarian, with a light and a dark theme (light by default).

Nothing you paste leaves your machine. There is no backend, no analytics and no network request at runtime, and the production build ships a Content Security Policy that blocks fetch requests and any scripts, images or fonts from other origins (`connect-src 'none'`).

## What it checks

22 rules, grouped by what they protect. Severity drives the score: critical costs 15 points, warning 5, info 1. Repeats of the same rule cost less each time, and any critical finding caps the score at 60.

| Area | Rules | Auto-Fix |
| --- | --- | --- |
| Resources | missing CPU/memory requests and limits | placeholders, marked for review |
| Health | missing readiness and liveness probes | TCP probe, only if a `containerPort` exists |
| Images | `:latest` or no tag, no digest, `imagePullPolicy` on a mutable tag | never (needs a human decision) |
| Privileges | `privileged`, root user, privilege escalation, capabilities, read-only root filesystem, seccomp, missing `securityContext` | yes |
| Host access | `hostNetwork`, `hostPID`, `hostIPC`, `hostPath` | namespaces yes, `hostPath` no |
| Hygiene | default namespace, default ServiceAccount, token automount, plaintext secrets in `env`, single replica, NodePort/LoadBalancer | token automount only |

Where a standard applies, the finding links the rule to the Pod Security Standards, the CIS Kubernetes Benchmark or the NSA/CISA hardening guide.

### How Auto-Fix behaves

- Each finding is annotated under its line in the editor. Open one to see the suggested change as a diff and apply it on its own, or use Auto-Fix to review every fix together.
- It edits the parsed YAML document, so comments and key order survive.
- Fixes are either **safe** or **review**. Review fixes add a `# TODO(k8s-auditor): review` comment next to the change.
- It does not guess values it cannot know. A `:latest` image stays `:latest`, and resource values are labelled placeholders.
- A limit is never set below an existing request, and a request is never set above an existing limit.
- The serializer normalizes indentation, so a diff can include whitespace changes beyond the fixes themselves.

## Limits

This is a static check of the manifest you paste. It does not see the cluster, admission controllers, NetworkPolicies, RBAC or anything defined in another file. YAML anchors, aliases and merge keys (`&a`, `*a`, `<<`) are expanded before the rules run, so a value that comes from an alias is checked, and its finding points at the anchor line. Auto-Fix works on the original text and leaves your anchors in place, so it skips spots that only exist through an alias. Input over 300 KB is not checked, and a file whose aliases expand to an unreasonable size is rejected. For CI use on a real repository, reach for [kube-linter](https://github.com/stackrox/kube-linter), [Kubescape](https://github.com/kubescape/kubescape) or [Polaris](https://github.com/FairwindsOps/polaris). Their check lists were a reference when choosing which rules to include.

## Run it locally

Requires Node 20.19 or newer.

```sh
npm ci
npm run dev        # http://localhost:5173/K8s-Auditor/
npm test
npm run lint
npm run build && npm run preview   # production build, http://localhost:4173/K8s-Auditor/
```

## Project layout

```text
src/core/      pure logic, no React
  parser/      multi-document YAML with line and column errors
  podSpec/     pod spec and container lookup per workload kind
  rules/       one file per rule, registered in rules/index.ts
  scoring/     weighted score and grade
  fixer/       comment-preserving patches on the YAML document
src/i18n/      English and Bulgarian texts, plus Bulgarian wording for each rule and fix
src/ui/        React components
tests/         Vitest, at least one test per rule and for the fixer
```

The core has no dependency on React or the DOM, so it can be reused from a CLI later.

### Adding a rule

1. Create `src/core/rules/<name>.ts` exporting a `Rule` with an `id`, `severity`, the kinds it `appliesTo`, and a `check` that returns findings (`makeFinding` or `makeResourceFinding` fill in the path and line). Pass the dynamic values (container, image, port) as the last `params` argument so the message can be phrased in other languages.
2. Register it in `src/core/rules/index.ts` and add it to a group in `src/ui/ruleGroups.ts`.
3. Add its Bulgarian wording in `src/i18n/rules-bg.ts`. The i18n test fails until every rule has one.
4. Add tests in `tests/`.
5. Optionally add a fix in `src/core/fixer/fixes.ts`, keyed by the rule id (and its Bulgarian description in `rules-bg.ts`). Return `null` when the fix needs a human.

## Deployment

The site is a static build served from GitHub Pages. `.github/workflows/deploy.yml` runs lint, tests and the build, then publishes `dist/`. It only runs when started manually from the Actions tab, and every action is pinned to a commit SHA.

## Credits

Rule selection draws on the Kubernetes Pod Security Standards, the CIS Kubernetes Benchmark, the NSA/CISA Kubernetes Hardening Guide and the check lists of kube-linter, Polaris and Kubescape.
