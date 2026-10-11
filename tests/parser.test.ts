import { describe, expect, it } from 'vitest'
import { lineOfPath } from '../src/core/lines'
import { parseManifests } from '../src/core/parser'

const DEPLOYMENT = `# web app
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: prod
spec:
  template:
    spec:
      initContainers:
        - name: init
          image: busybox:1.36
      containers:
        - name: app
          image: nginx:1.27
        - image: sidecar:1
`

describe('parseManifests', () => {
  it('extracts kind, name, namespace and all containers of a Deployment', () => {
    const { resources, errors } = parseManifests(DEPLOYMENT)
    expect(errors).toEqual([])
    expect(resources).toHaveLength(1)
    const r = resources[0]
    expect([r.kind, r.name, r.namespace]).toEqual(['Deployment', 'web', 'prod'])
    expect(r.podSpecPath).toEqual(['spec', 'template', 'spec'])
    expect(r.containers.map((c) => [c.name, c.kind])).toEqual([
      ['app', 'container'],
      ['containers[1]', 'container'],
      ['init', 'initContainer'],
    ])
  })

  it('handles multi-document YAML and skips empty documents', () => {
    const { resources } = parseManifests(
      `---\n# only a comment\n---\nkind: Service\nmetadata:\n  name: svc\n---\nkind: Pod\nmetadata:\n  name: p\nspec:\n  containers:\n    - name: c\n`,
    )
    expect(resources.map((r) => r.kind)).toEqual(['Service', 'Pod'])
    expect(resources[0].podSpecPath).toBeUndefined()
    expect(resources[1].podSpecPath).toEqual(['spec'])
  })

  it('resolves the CronJob pod spec path', () => {
    const { resources } = parseManifests(
      `kind: CronJob\nmetadata:\n  name: j\nspec:\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          containers:\n            - name: c\n`,
    )
    expect(resources[0].containers.map((c) => c.name)).toEqual(['c'])
  })

  it('reports syntax errors with line and column and does not throw', () => {
    const { resources, errors } = parseManifests('kind: Pod\nmetadata: [unclosed\n')
    expect(resources).toEqual([])
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].line).toBeGreaterThanOrEqual(1)
  })

  it('returns nothing for empty input', () => {
    const { resources, errors } = parseManifests('')
    expect([resources, errors]).toEqual([[], []])
  })
})

describe('lineOfPath', () => {
  it('returns the 1-based line of an existing node', () => {
    const [r] = parseManifests(DEPLOYMENT).resources
    expect(lineOfPath(r.doc, r.lineCounter, ['metadata', 'name'])).toBe(5)
  })

  it('falls back to the closest existing parent for a missing path', () => {
    const [r] = parseManifests(DEPLOYMENT).resources
    const container = r.containers.find((c) => c.name === 'app')!
    const line = lineOfPath(r.doc, r.lineCounter, [...container.path, 'securityContext'])
    expect(line).toBe(lineOfPath(r.doc, r.lineCounter, container.path))
  })
})
