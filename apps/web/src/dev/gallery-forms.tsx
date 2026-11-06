import { useState } from 'react'
import { ArrowUpIcon, HeartIcon, SkullIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Item, ItemActions, ItemContent, ItemMedia } from '@/components/ui/item'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Row, Section } from './gallery-parts'

export function FormSections() {
  const [vol, setVol] = useState([40])
  return (
    <>
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

      <Section title="Meters (Progress variants)">
        <div className="grid gap-5 md:grid-cols-2">
          <Progress variant="blocks" tone="good" value={30} label="Stress: 30 %" state="Calm" />
          <Progress variant="blocks" tone="warn" value={62} label="Stress: 62 %" state="Stressed" />
          <Progress variant="blocks" tone="bad" value={88} label="Stress: 88 %" state="Breaking" />
          <Progress
            variant="blocks"
            tone="good"
            value={100}
            overflow={12}
            label="Morale: 112"
            state="Great"
          />
          <Progress variant="xp" value={81} valueLabel="14145 / 17545" />
          <Progress variant="task" value={55} label="Research: Advanced Cooking" state="55 %" />
          <Progress
            variant="task"
            value={30}
            dormant={25}
            marker={42}
            label="Steam Vent"
            state="active, 2.4 cycles left"
          />
          <Progress
            variant="gauge"
            tone="good"
            value={78}
            label="Calories: 3,100 kcal / 4,000 kcal"
            state="Fed"
          />
          <Progress variant="gauge" tone="warn" value={38} label="Stamina: 38 %" state="Tired" />
          <Progress variant="gauge" tone="bad" value={12} label="Bionic oil: 12 %" state="Low" />
          <Progress
            variant="gauge"
            tone="good"
            value={100}
            overflow={480}
            label="Storage: 20,480 kg / 20,000 kg"
            state="Full"
          />
        </div>
      </Section>

      <Section title="Vitals rows and colony stats">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="well flex flex-col">
            <Item variant="need">
              <ItemMedia variant="icon">
                <HeartIcon />
              </ItemMedia>
              <ItemContent className="flex-row justify-between">
                <span>Health</span>
                <span className="text-sm text-white tabular-nums">100 %</span>
              </ItemContent>
              <ItemActions>
                <ArrowUpIcon />
              </ItemActions>
            </Item>
            <Item variant="need">
              <ItemMedia variant="icon">
                <HeartIcon />
              </ItemMedia>
              <ItemContent className="flex-row justify-between">
                <span>Stress</span>
                <span className="text-sm text-warn tabular-nums">62 %</span>
              </ItemContent>
              <ItemActions>
                <ArrowUpIcon />
              </ItemActions>
            </Item>
            <Item variant="need">
              <ItemMedia variant="icon">
                <HeartIcon />
              </ItemMedia>
              <ItemContent className="flex-row justify-between">
                <span>Calories</span>
                <span className="text-sm text-bad-text tabular-nums">210 kcal</span>
              </ItemContent>
              <ItemActions>
                <ArrowUpIcon />
              </ItemActions>
            </Item>
          </div>
          <Row>
            <Badge variant="bare">
              <HeartIcon />9 duplicants
            </Badge>
            <Badge variant="bare">
              <SkullIcon />
              88 cycles
            </Badge>
          </Row>
        </div>
      </Section>
    </>
  )
}
