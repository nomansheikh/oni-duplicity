import { X } from 'lucide-react'
import { NumberField, SearchPicker } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { fmt, fmtMass } from '@/lib/format'
import { KIND_LABEL, type RanchControls } from './ranching-controls'
import { InfoTip, Nothing } from './ranching-parts'

/** The foods the herd eats, each with a share, plus a searchable list of everything it can eat. */
export function FeedEditor({ species, plan, feed, setFeed }: RanchControls) {
  const chosen = new Set(feed.map((f) => f.id))
  const lineById = new Map(plan.feed.map((l) => [l.food.id, l]))
  const setShare = (id: string, share: number) =>
    setFeed(feed.map((f) => (f.id === id ? { ...f, share } : f)))
  return (
    <>
      {feed.length === 0 && <Nothing title="Nothing to eat">Add a food to see the feed.</Nothing>}
      {feed.map((choice) => {
        const food = species.diet.find((d) => d.id === choice.id)
        if (!food) return null
        const line = lineById.get(choice.id)
        return (
          <Item
            key={choice.id}
            variant="outline"
            size="xs"
            data-testid="ranch-feed"
            className="flex-wrap"
          >
            <ItemContent className="min-w-40">
              <ItemTitle>
                {food.name}
                <InfoTip
                  label={`About ${food.name}`}
                  text={`${KIND_LABEL[food.kind]}. ${fmt(food.calories / 1000, 0)} kcal per ${food.kind === 'plant' ? 'cycle of growth' : 'kg'}.`}
                />
              </ItemTitle>
              <div className="type-h3 tabular-nums">
                {plan.critters > 0 && line
                  ? line.unit === 'kg'
                    ? `${fmtMass(line.amountPerCycle)} / cycle`
                    : `${fmt(line.amountPerCycle, 2)} growth cycles / cycle`
                  : `${fmt((line?.fraction ?? 0) * 100, 0)} % of calories`}
              </div>
              {feed.length > 1 && line && (
                <ItemDescription>{fmt(line.fraction * 100, 0)} % of its calories</ItemDescription>
              )}
            </ItemContent>
            <ItemActions className="w-full justify-end">
              <NumberField
                label={`Share of ${food.name}`}
                value={choice.share}
                min={1}
                onCommit={(share) => setShare(choice.id, share)}
                className="w-28"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={`Remove ${food.name}`}
                disabled={feed.length <= 1}
                onClick={() => setFeed(feed.filter((f) => f.id !== choice.id))}
              >
                <X />
              </Button>
            </ItemActions>
          </Item>
        )
      })}
      <SearchPicker
        label="Add food"
        heading="Foods"
        items={species.diet.map((d) => ({
          id: d.id,
          name: d.name,
          desc: `${KIND_LABEL[d.kind]}, ${fmt(d.calories / 1000, 0)} kcal`,
        }))}
        exclude={[...chosen]}
        onSelect={(id) => setFeed([...feed, { id, share: 100 }])}
      />
    </>
  )
}
