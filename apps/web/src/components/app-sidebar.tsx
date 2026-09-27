import type { ComponentProps, ReactNode } from 'react'
import {
  EllipsisVertical,
  Droplets,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  Orbit,
  Package,
  Rabbit,
  Rocket,
  Save,
  Users,
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

export type Page = 'overview' | 'duplicants' | 'geysers'

const PAGES: { id: Page; title: string; icon: ReactNode }[] = [
  { id: 'overview', title: 'Overview', icon: <LayoutDashboard /> },
  { id: 'duplicants', title: 'Duplicants', icon: <Users /> },
  { id: 'geysers', title: 'Geysers', icon: <Droplets /> },
]

const SOON: { title: string; icon: ReactNode }[] = [
  { title: 'Critters', icon: <Rabbit /> },
  { title: 'Materials', icon: <Package /> },
  { title: 'Research', icon: <FlaskConical /> },
  { title: 'Space', icon: <Rocket /> },
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
        <SidebarGroup>
          <SidebarGroupLabel>Colony</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PAGES.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>Coming soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SOON.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton disabled tooltip={`${item.title} (coming soon)`}>
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
