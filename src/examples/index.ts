import type { MessageKey } from '../i18n/messages'

export interface Example {
  id: string
  labelKey: MessageKey
  yaml: string
}

const insecure = `# Typical "it works on my machine" deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      hostNetwork: true
      containers:
        - name: app
          image: nginx:latest
          ports:
            - containerPort: 8080
          env:
            - name: DB_PASSWORD
              value: hunter2
          securityContext:
            privileged: true
        - name: metrics
          image: prom/node-exporter:v1.8.1
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
`

const almost = `# Mostly hardened - a few gaps left
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: payments
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      serviceAccountName: api
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/acme/api:2.4.1
          ports:
            - containerPort: 8080
          resources:
            requests: { cpu: 200m, memory: 256Mi }
            limits: { cpu: 500m, memory: 512Mi }
          readinessProbe:
            httpGet: { path: /ready, port: 8080 }
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: [NET_RAW]
`

export const EXAMPLES: Example[] = [
  { id: 'insecure', labelKey: 'ex.insecure', yaml: insecure },
  { id: 'almost', labelKey: 'ex.almost', yaml: almost },
]
