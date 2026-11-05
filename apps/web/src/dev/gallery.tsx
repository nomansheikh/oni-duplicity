import { useState } from 'react'
import { SearchIcon, SettingsIcon, SkullIcon } from 'lucide-react'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress, type ProgressTone } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type BadgeVariant = NonNullable<Parameters<typeof badgeVariants>[0]>['variant']

const BADGES: Record<string, BadgeVariant[]> = {
  Base: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
  Status: ['good', 'warn', 'bad', 'info'],
  Resources: ['oxygen', 'water', 'food', 'power', 'metal', 'plant', 'critter', 'geyser', 'dlc'],
  Elements: ['gas', 'liquid', 'solid', 'vacuum'],
  Stat: ['stat'],
}

const TONES = [
  'good',
  'warn',
  'bad',
  'xp',
  'geyser',
  'dormant',
  'oxygen',
  'water',
  'food',
  'power',
  'metal',
  'plant',
  'critter',
  'gas',
  'liquid',
  'solid',
] satisfies ProgressTone[]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-ink pb-1 text-2xl font-bold uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {label && <span className="w-24 shrink-0 text-xs text-fg-3 uppercase">{label}</span>}
      {children}
    </div>
  )
}

export default function Gallery() {
  const [vol, setVol] = useState([40])
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      <h1 className="text-4xl font-bold uppercase">Component gallery</h1>

      <Section title="Buttons">
        {(
          ['default', 'secondary', 'outline', 'accent', 'ghost', 'destructive', 'link'] as const
        ).map((v) => (
          <Row key={v} label={v}>
            <Button variant={v}>{v}</Button>
            <Button variant={v} size="sm">
              Small
            </Button>
            <Button variant={v} size="xs">
              Tiny
            </Button>
            <Button variant={v} size="lg">
              Large
            </Button>
            <Button variant={v} size="icon" aria-label="settings">
              <SettingsIcon />
            </Button>
            <Button variant={v} disabled>
              Disabled
            </Button>
          </Row>
        ))}
      </Section>

      <Section title="Card">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Panel with title bar</CardTitle>
              <CardAction>
                <Badge variant="good">3 changes</Badge>
              </CardAction>
              <CardDescription>Optional description under the title</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="well">A well block inside the panel</div>
              <div className="inset-layer p-2">An inset layer</div>
            </CardContent>
          </Card>
          <Card variant="well">
            <CardHeader>
              <CardTitle>Well variant</CardTitle>
            </CardHeader>
            <CardContent>No mauve bar; a darker section block.</CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Overview</TabsTrigger>
            <TabsTrigger value="b">
              Duplicants <span data-slot="tab-count">12</span>
            </TabsTrigger>
            <TabsTrigger value="c">
              Critters <span data-slot="tab-count">5</span>
            </TabsTrigger>
            <TabsTrigger value="d" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="a">
          <TabsList variant="line">
            <TabsTrigger value="a">Traits</TabsTrigger>
            <TabsTrigger value="b">Attributes</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      <Section title="Badges">
        {Object.entries(BADGES).map(([group, list]) => (
          <Row key={group} label={group}>
            {list.map((v) => (
              <Badge key={v} variant={v}>
                {v === 'stat' ? '12.5 kcal' : v}
              </Badge>
            ))}
          </Row>
        ))}
      </Section>

      <Section title="Form controls">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Input placeholder="Text input" />
            <Input type="number" defaultValue={42} />
            <Input defaultValue="Invalid" aria-invalid />
            <Input disabled defaultValue="Disabled" />
            <Select defaultValue="b">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Cool Slush Geyser</SelectItem>
                <SelectItem value="b">Steam Vent</SelectItem>
                <SelectItem value="c">Oil Reservoir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-4">
            <Row>
              <Checkbox defaultChecked aria-label="on" />
              <Checkbox aria-label="off" />
              <Checkbox disabled aria-label="disabled" />
            </Row>
            <Row>
              <Switch defaultChecked aria-label="on" />
              <Switch aria-label="off" />
              <Switch size="sm" defaultChecked aria-label="small" />
            </Row>
            <Slider value={vol} onValueChange={setVol} max={100} aria-label="slider" />
            <Row>
              <Kbd>Esc</Kbd>
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>Z</Kbd>
              </KbdGroup>
            </Row>
            <ToggleGroup type="single" defaultValue="b" variant="outline">
              <ToggleGroupItem value="a">Gas</ToggleGroupItem>
              <ToggleGroupItem value="b">Liquid</ToggleGroupItem>
              <ToggleGroupItem value="c">Solid</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </Section>

      <Section title="Progress (variant API; final meter look pending spec)">
        <div className="grid gap-3 md:grid-cols-2">
          {TONES.map((t, i) => (
            <Progress
              key={t}
              tone={t}
              value={20 + ((i * 17) % 80)}
              label={t}
              valueLabel={`${20 + ((i * 17) % 80)}%`}
            />
          ))}
          <Progress tone="good" segmented value={70} label="Segmented" valueLabel="70%" />
          <Progress
            tone="warn"
            segmented
            size="lg"
            value={45}
            label="Segmented large"
            valueLabel="45%"
          />
          <Progress tone="bad" size="sm" value={15} />
        </div>
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead aria-sort="ascending">▲ Name</TableHead>
              <TableHead>Element</TableHead>
              <TableHead>Output</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Steam Vent</TableCell>
              <TableCell>Steam</TableCell>
              <TableCell>1 200 g/s</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Cool Slush</TableCell>
              <TableCell>Brine</TableCell>
              <TableCell>980 g/s</TableCell>
            </TableRow>
            <TableRow data-state="selected">
              <TableCell>Oil Reservoir</TableCell>
              <TableCell>Crude Oil</TableCell>
              <TableCell>2 000 g/s</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Minor Volcano</TableCell>
              <TableCell>Magma</TableCell>
              <TableCell>400 g/s</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Overlays">
        <Row>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>
                <span className="text-gold">Output</span> of{' '}
                <span className="text-pink">Steam Vent</span>
              </span>
            </TooltipContent>
          </Tooltip>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">Popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <PopoverTitle>Popover</PopoverTitle>
              <PopoverDescription>Body text.</PopoverDescription>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add trait</DialogTitle>
                <DialogDescription>Pick a trait to add.</DialogDescription>
              </DialogHeader>
              <div className="p-3">Dialog body</div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Edit geyser</SheetTitle>
                <SheetDescription>Side sheet</SheetDescription>
              </SheetHeader>
              <div className="p-3">Sheet body</div>
            </SheetContent>
          </Sheet>
        </Row>
      </Section>

      <Section title="Separator, scroll area, empty">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-3">
            <span>Above</span>
            <Separator className="my-2" />
            <span>Below</span>
          </div>
          <ScrollArea className="panel h-32">
            <div className="flex flex-col gap-1 p-2">
              {Array.from({ length: 20 }, (_, i) => (
                <span key={i}>Row {i + 1}</span>
              ))}
            </div>
          </ScrollArea>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>Nothing here</EmptyTitle>
              <EmptyDescription>No geysers match the filter.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
        <Row>
          <SkullIcon className="size-4" />
          <span className="text-fg-2">fg-2</span>
          <span className="text-fg-3">fg-3</span>
          <span className="text-good">good</span>
          <span className="text-good-hi">good-hi</span>
          <span className="text-bad-text">bad</span>
          <span className="text-warn">warn</span>
          <span className="text-gold">gold</span>
        </Row>
      </Section>
    </div>
  )
}
