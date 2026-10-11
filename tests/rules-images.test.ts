import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'
import { parseImage } from '../src/core/rules/helpers'

const pod = (image: string, extra = '') => `kind: Pod
metadata:
  name: p
spec:
  containers:
    - name: app
      image: ${image}
${extra}`

const ids = (yaml: string) => lint(yaml).findings.map((f) => f.ruleId)

describe('parseImage', () => {
  it.each([
    ['nginx', undefined, undefined, true],
    ['nginx:latest', 'latest', undefined, true],
    ['nginx:1.27', '1.27', undefined, false],
    ['localhost:5000/team/app', undefined, undefined, true],
    ['localhost:5000/team/app:2.1', '2.1', undefined, false],
    ['nginx@sha256:abc', undefined, 'sha256:abc', false],
    ['nginx:latest@sha256:abc', 'latest', 'sha256:abc', false],
  ])('%s', (image, tag, digest, mutable) => {
    expect(parseImage(image)).toEqual({ tag, digest, mutable })
  })
})

describe('KSA-005 image tag', () => {
  it('flags :latest', () => expect(ids(pod('nginx:latest'))).toContain('KSA-005'))
  it('flags untagged images and mentions the default', () => {
    const f = lint(pod('nginx')).findings.find((x) => x.ruleId === 'KSA-005')
    expect(f?.message).toContain('without a tag')
  })
  it('does not mistake a registry port for a tag', () =>
    expect(ids(pod('localhost:5000/app'))).toContain('KSA-005'))
  it('passes for a fixed tag or a digest', () => {
    expect(ids(pod('nginx:1.27'))).not.toContain('KSA-005')
    expect(ids(pod('nginx@sha256:abc'))).not.toContain('KSA-005')
  })
  it('reports the line of the image', () =>
    expect(lint(pod('nginx:latest')).findings.find((x) => x.ruleId === 'KSA-005')?.line).toBe(7))
})

describe('KSA-006 image digest', () => {
  it('flags tag-only images', () => expect(ids(pod('nginx:1.27'))).toContain('KSA-006'))
  it('does not double-report mutable images', () => expect(ids(pod('nginx:latest'))).not.toContain('KSA-006'))
  it('passes for digest-pinned images', () => expect(ids(pod('nginx:1.27@sha256:abc'))).not.toContain('KSA-006'))
})

describe('KSA-007 imagePullPolicy', () => {
  it('flags IfNotPresent with :latest', () =>
    expect(ids(pod('nginx:latest', '      imagePullPolicy: IfNotPresent'))).toContain('KSA-007'))
  it('passes with Always or when omitted', () => {
    expect(ids(pod('nginx:latest', '      imagePullPolicy: Always'))).not.toContain('KSA-007')
    expect(ids(pod('nginx:latest'))).not.toContain('KSA-007')
  })
  it('ignores pinned images', () =>
    expect(ids(pod('nginx:1.27', '      imagePullPolicy: IfNotPresent'))).not.toContain('KSA-007'))
})
