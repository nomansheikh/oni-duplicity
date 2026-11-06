import { SearchIcon, SkullIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { EmptyState } from '@/components/empty-state'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Row, Section } from './gallery-parts'

export function OverlaySections() {
  return (
    <>
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
          <EmptyState
            icon={SearchIcon}
            title="No geysers"
            description="No geysers on this asteroid. Nothing is about to erupt here."
            action={{ label: 'Show all asteroids', onClick: () => {} }}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={SearchIcon}
            title="Default size"
            description="Big hex badge, caps title and a line in the colony's voice."
            action={{ label: 'Clear search', onClick: () => {} }}
          />
          <EmptyState
            size="compact"
            icon={SearchIcon}
            title="Compact size"
            description="For small panels, table rows and pickers."
          />
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
    </>
  )
}
