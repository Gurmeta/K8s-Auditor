import type { Rule } from '../types'
import { automountToken } from './automount-token'
import { defaultNamespace } from './default-namespace'
import { defaultServiceAccount } from './default-service-account'
import { dropCapabilities } from './drop-capabilities'
import { exposedService } from './exposed-service'
import { hostNamespaces } from './host-namespaces'
import { hostPath } from './host-path'
import { plaintextSecrets } from './plaintext-secrets'
import { singleReplica } from './single-replica'
import { imageDigest } from './image-digest'
import { imagePullPolicy } from './image-pull-policy'
import { imageTag } from './image-tag'
import { livenessProbe } from './liveness-probe'
import { missingSecurityContext } from './missing-security-context'
import { privileged } from './privileged'
import { privilegeEscalation } from './privilege-escalation'
import { readinessProbe } from './readiness-probe'
import { readOnlyRootFs } from './read-only-root-fs'
import { resourceLimits } from './resource-limits'
import { resourceRequests } from './resource-requests'
import { runAsNonRoot } from './run-as-non-root'
import { seccompProfile } from './seccomp-profile'

export const rules: Rule[] = [
  resourceRequests,
  resourceLimits,
  readinessProbe,
  livenessProbe,
  imageTag,
  imageDigest,
  imagePullPolicy,
  privileged,
  runAsNonRoot,
  privilegeEscalation,
  dropCapabilities,
  readOnlyRootFs,
  seccompProfile,
  missingSecurityContext,
  hostNamespaces,
  hostPath,
  defaultNamespace,
  defaultServiceAccount,
  automountToken,
  plaintextSecrets,
  singleReplica,
  exposedService,
]
