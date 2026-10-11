import type { AppliedFix } from '../core/fixer'
import type { Finding } from '../core/types'

interface Ctx {
  container: string
  resource: { kind: string; name: string }
  p: Record<string, string>
}

interface RuleBg {
  title: string
  message: (c: Ctx) => string
  how: string
}

const q = (s: string) => `„${s}“`

const resourceList = (missing: string) =>
  missing
    .split(',')
    .map((r) => (r === 'cpu' ? 'CPU' : 'памет'))
    .join(' и ')

const hostWhat: Record<string, string> = {
  hostNetwork: 'мрежовия namespace на възела (може да подслушва трафика и да достига услуги, които слушат само на възела)',
  hostPID: 'PID namespace на възела (вижда и може да сигнализира процеси на хоста)',
  hostIPC: 'IPC namespace на възела (има достъп до споделената памет на хоста)',
}

export const rulesBg: Record<string, RuleBg> = {
  'KSA-001': {
    title: 'Липсват заявки (requests) за CPU/памет',
    message: (c) => `Контейнер ${q(c.container)} няма заявка за ${resourceList(c.p.missing)}.`,
    how: 'Задай resources.requests, за да може планировчикът да разположи правилно пода и да се планира капацитетът.',
  },
  'KSA-002': {
    title: 'Липсват лимити за CPU/памет',
    message: (c) => `Контейнер ${q(c.container)} няма лимит за ${resourceList(c.p.missing)}.`,
    how: 'Задай resources.limits, за да не може един контейнер да изчерпи ресурсите на възела (шумен съсед или DoS).',
  },
  'KSA-003': {
    title: 'Липсва readinessProbe',
    message: (c) => `Контейнер ${q(c.container)} няма readinessProbe.`,
    how: 'Добави readinessProbe, за да получават трафик само подове, които могат да го обслужват (избягва грешки при rollout).',
  },
  'KSA-004': {
    title: 'Липсва livenessProbe',
    message: (c) => `Контейнер ${q(c.container)} няма livenessProbe.`,
    how: 'Добави livenessProbe, за да рестартира Kubernetes контейнера, ако се забие или заключи.',
  },
  'KSA-005': {
    title: 'Образ с :latest или без таг',
    message: (c) =>
      c.p.untagged === 'true'
        ? `Контейнер ${q(c.container)} използва образ ${q(c.p.image)} без таг (по подразбиране :latest).`
        : `Контейнер ${q(c.container)} използва образ ${q(c.p.image)} с променливия таг :latest.`,
    how: 'Фиксирай конкретна версия (най-добре заедно с digest), за да са внедряванията възпроизводими и да е възможен rollback.',
  },
  'KSA-006': {
    title: 'Образът не е фиксиран с digest',
    message: (c) => `Образът ${q(c.p.image)} е фиксиран само с таг, а тагът може да бъде презаписан с друго съдържание.`,
    how: 'Посочи образа с digest (image@sha256:...) за неизменяеми и проверими внедрявания.',
  },
  'KSA-007': {
    title: 'imagePullPolicy не изтегля наново променлив образ',
    message: (c) =>
      `Контейнер ${q(c.container)} използва променлив образ с imagePullPolicy ${q(c.p.policy)}, затова възлите могат да пускат остарели или различни копия.`,
    how: 'Фиксирай версия, а ако трябва да останеш на :latest, махни imagePullPolicy или го задай на Always.',
  },
  'KSA-008': {
    title: 'Контейнерът работи в привилегирован режим',
    message: (c) =>
      `Контейнер ${q(c.container)} работи привилегировано: има почти всички права на хоста и може да поеме контрол над възела.`,
    how: 'Премахни privileged: true. Дай само нужните capabilities през capabilities.add.',
  },
  'KSA-009': {
    title: 'Контейнерът може да работи като root',
    message: (c) =>
      c.p.explicit === 'true'
        ? `Контейнер ${q(c.container)} е изрично настроен да работи като root.`
        : `Контейнер ${q(c.container)} не налага runAsNonRoot и работи като root, ако образът стартира с UID 0.`,
    how: 'Задай securityContext.runAsNonRoot: true (и runAsUser, различен от 0) на ниво контейнер или под.',
  },
  'KSA-010': {
    title: 'Повишаването на привилегиите не е забранено',
    message: (c) => `Контейнер ${q(c.container)} не задава allowPrivilegeEscalation: false (по подразбиране е true).`,
    how: 'Задай securityContext.allowPrivilegeEscalation: false, за да не могат процесите да получават повече привилегии от родителя си.',
  },
  'KSA-011': {
    title: 'Linux capabilities не са премахнати',
    message: (c) => `Контейнер ${q(c.container)} не премахва всички (ALL) Linux capabilities.`,
    how: 'Задай capabilities.drop: ["ALL"] и добави обратно само необходимото (напр. NET_BIND_SERVICE).',
  },
  'KSA-012': {
    title: 'Коренната файлова система е за запис',
    message: (c) =>
      `Контейнер ${q(c.container)} има записваема коренна файлова система, която позволява на нападател да добавя програми или да променя конфигурация.`,
    how: 'Задай readOnlyRootFilesystem: true и монтирай emptyDir томове за пътищата, в които приложението трябва да пише (напр. /tmp).',
  },
  'KSA-013': {
    title: 'Няма наложен seccomp профил',
    message: (c) =>
      c.p.unconfined === 'true'
        ? `Контейнер ${q(c.container)} работи с Unconfined seccomp профил (разрешени са всички системни извиквания).`
        : `Контейнер ${q(c.container)} няма seccomp профил, затова системните извиквания не се филтрират.`,
    how: 'Задай securityContext.seccompProfile.type: RuntimeDefault на ниво под или контейнер.',
  },
  'KSA-014': {
    title: 'Няма дефиниран securityContext',
    message: (c) =>
      `Контейнер ${q(c.container)} няма securityContext нито на ниво контейнер, нито на ниво под, така че всички настройки за защита са с небезопасните стойности по подразбиране.`,
    how: 'Добави securityContext (runAsNonRoot, allowPrivilegeEscalation: false, премахване на всички capabilities, seccomp RuntimeDefault).',
  },
  'KSA-015': {
    title: 'Подът споделя пространства на хоста',
    message: (c) => `Подът задава ${c.p.field}: true и споделя ${hostWhat[c.p.field] ?? 'пространство на хоста'}.`,
    how: 'Премахни настройката, освен ако това не е агент на ниво възел, който наистина я изисква.',
  },
  'KSA-016': {
    title: 'Монтиран е hostPath том',
    message: (c) => `Томът ${q(c.p.volume)} монтира път от файловата система на възела.`,
    how: 'Използвай PersistentVolumeClaim, emptyDir, configMap или secret том вместо hostPath.',
  },
  'KSA-017': {
    title: 'Ресурсът изрично ползва default namespace',
    message: (c) => `${c.resource.kind} ${q(c.resource.name)} е в default namespace.`,
    how: 'Ползвай отделен namespace за приложение или екип, за да можеш да ограничаваш RBAC, квоти и мрежови политики.',
  },
  'KSA-018': {
    title: 'Ползва се default ServiceAccount',
    message: () => 'Подът работи с default ServiceAccount, който се споделя от всичко в namespace-а.',
    how: 'Създай отделен ServiceAccount с минимални RBAC права и го задай в serviceAccountName.',
  },
  'KSA-019': {
    title: 'Токенът на ServiceAccount се монтира автоматично',
    message: () => 'Токенът на ServiceAccount е монтиран в пода и компрометиран контейнер може да го използва срещу API сървъра.',
    how: 'Задай automountServiceAccountToken: false, освен ако приложението не работи с Kubernetes API.',
  },
  'KSA-020': {
    title: 'Чувствителна стойност в env променлива в явен текст',
    message: (c) =>
      `Променливата ${q(c.p.env)} в контейнер ${q(c.container)} съдържа твърдо зададена стойност, която прилича на тайна.`,
    how: 'Съхрани я в Secret (или външен мениджър на тайни) и я реферирай с valueFrom.secretKeyRef.',
  },
  'KSA-021': {
    title: 'Конфигурирана е само една реплика',
    message: (c) => `${c.resource.kind} ${q(c.resource.name)} работи с една реплика: всеки рестарт или отказ на възел води до прекъсване.`,
    how: 'Пусни поне 2 реплики (с PodDisruptionBudget) за всичко, което трябва да е непрекъснато достъпно.',
  },
  'KSA-022': {
    title: 'Service е достъпен извън клъстера',
    message: (c) => `Service ${q(c.resource.name)} е от тип ${c.p.type} и е достъпен извън клъстера.`,
    how: 'Предпочети ClusterIP зад Ingress/Gateway с TLS; ако достъпът отвън е нужен, ограничи източниците (loadBalancerSourceRanges, NetworkPolicy).',
  },
}

export const fixesBg: Record<string, (p: Record<string, string>) => string> = {
  'KSA-001': () => 'Добавени примерни заявки за ресурси',
  'KSA-002': () => 'Добавени примерни лимити за ресурси',
  'KSA-003': (p) => `Добавена TCP readinessProbe на порт ${p.port}`,
  'KSA-004': (p) => `Добавена TCP livenessProbe на порт ${p.port}`,
  'KSA-008': () => 'Зададено privileged: false',
  'KSA-009': () => 'Зададено runAsNonRoot: true (и runAsUser, различен от root)',
  'KSA-010': () => 'Зададено allowPrivilegeEscalation: false',
  'KSA-011': () => 'Зададено capabilities.drop: [ALL]',
  'KSA-012': () => 'Зададено readOnlyRootFilesystem: true',
  'KSA-013': () => 'Зададен seccompProfile: RuntimeDefault',
  'KSA-015': (p) => `Зададено ${p.field}: false`,
  'KSA-019': () => 'Зададено automountServiceAccountToken: false',
}

export const findingBg = (f: Finding) => {
  const rule = rulesBg[f.ruleId]
  if (!rule) return null
  const ctx: Ctx = { container: f.container ?? '', resource: f.resource, p: f.params ?? {} }
  return { message: rule.message(ctx), how: rule.how }
}

export const fixBg = (fix: AppliedFix) => fixesBg[fix.ruleId]?.(fix.params ?? {}) ?? null
