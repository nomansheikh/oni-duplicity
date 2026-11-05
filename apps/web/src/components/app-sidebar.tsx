import type { ComponentProps, ReactNode } from 'react'
import {
  EllipsisVertical,
  Droplets,
  FlaskConical,
  Gauge,
  FolderOpen,
  LayoutDashboard,
  Map as MapIcon,
  Orbit,
  Package,
  Rabbit,
  Rocket,
  Save,
  Users,
  Braces,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export type Page =
  | 'overview'
  | 'map'
  | 'duplicants'
  | 'critters'
  | 'geysers'
  | 'materials'
  | 'research'
  | 'space'
  | 'settings'
  | 'raw'

const PAGES: { id: Page; title: string; icon: ReactNode }[] = [
  { id: 'overview', title: 'Overview', icon: <LayoutDashboard /> },
  { id: 'map', title: 'World map', icon: <MapIcon /> },
  { id: 'duplicants', title: 'Duplicants', icon: <Users /> },
  { id: 'critters', title: 'Critters', icon: <Rabbit /> },
  { id: 'geysers', title: 'Geysers', icon: <Droplets /> },
  { id: 'materials', title: 'Materials', icon: <Package /> },
  { id: 'research', title: 'Research', icon: <FlaskConical /> },
  { id: 'space', title: 'Space', icon: <Rocket /> },
  { id: 'settings', title: 'Game settings', icon: <Gauge /> },
]

const ADVANCED: { id: Page; title: string; icon: ReactNode }[] = [
  { id: 'raw', title: 'Raw data', icon: <Braces /> },
]

export interface OpenFile {
  name: string
  version: string
}

export function AppSidebar({
  page,
  onNavigate,
  counts,
  file,
  onOpen,
  onClose,
  ...props
}: ComponentProps<typeof Sidebar> & {
  page: Page
  onNavigate: (page: Page) => void
  counts: Partial<Record<Page, number>>
  file: OpenFile | null
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Orbit className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-heading text-base font-semibold">Duplicity</span>
                <span className="truncate text-xs text-muted-foreground">ONI save editor</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Colony" items={PAGES} {...{ page, onNavigate, counts, file }} />
        <NavGroup label="Advanced" items={ADVANCED} {...{ page, onNavigate, counts, file }} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {file ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent">
                      <Save className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        Save version {file.version}
                      </span>
                    </div>
                    <EllipsisVertical className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="min-w-56">
                  <DropdownMenuLabel className="truncate">{file.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onOpen}>
                    <FolderOpen /> Open another save
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={onClose}>
                    <X /> Close save
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg" onClick={onOpen}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent">
                  <FolderOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="font-medium">Open a save</span>
                  <span className="text-xs text-muted-foreground">.sav from your ONI folder</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function NavGroup({
  label,
  items,
  page,
  onNavigate,
  counts,
  file,
}: {
  label: string
  items: { id: Page; title: string; icon: ReactNode }[]
  page: Page
  onNavigate: (page: Page) => void
  counts: Partial<Record<Page, number>>
  file: OpenFile | null
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={file !== null && page === item.id}
                disabled={file === null}
                onClick={() => onNavigate(item.id)}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
              {counts[item.id] !== undefined && (
                <SidebarMenuBadge>{counts[item.id]}</SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
