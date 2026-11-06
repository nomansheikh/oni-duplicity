import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { RawPath } from '@/worker/model'

function RootCrumb({
  label,
  current,
  onClick,
}: {
  label: string
  current: boolean
  onClick: () => void
}) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        {current ? (
          <BreadcrumbPage>{label}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <button type="button" onClick={onClick}>
              {label}
            </button>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    </>
  )
}

export function RawBreadcrumb({
  root,
  onJump,
}: {
  root: RawPath
  onJump: (path: RawPath) => void
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="font-mono type-small">
        <BreadcrumbItem>
          {root.length === 0 ? (
            <BreadcrumbPage>save</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <button type="button" onClick={() => onJump([])}>
                save
              </button>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {root.map((part, i) => (
          <RootCrumb
            key={i}
            label={typeof part === 'number' ? `[${part}]` : part}
            current={i === root.length - 1}
            onClick={() => onJump(root.slice(0, i + 1))}
          />
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
