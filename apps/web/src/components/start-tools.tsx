import { Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { toolPages, type Page } from '@/lib/nav'

/**
 * The Tools tab on the start screen, read from `nav.ts` so a new tool shows up here. Tools that
 * work without a save open on click; the rest say they need one.
 */
export function StartTools({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Tools</CardTitle>
      </CardHeader>
      <CardContent>
        <ItemGroup className="grid gap-2 sm:grid-cols-2">
          {toolPages().map(({ id, title, purpose, icon: Icon = Wrench, saveless }) => {
            const body = (
              <>
                <ItemMedia
                  variant="icon"
                  className="size-9 border border-ink bg-well text-(--cat-metal) [&_svg:not([class*='size-'])]:size-5"
                >
                  <Icon />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="flex-wrap type-h3 uppercase">
                    {title}
                    {!saveless && <Badge variant="secondary">Needs a save</Badge>}
                  </ItemTitle>
                  {purpose && (
                    <ItemDescription className="line-clamp-none">{purpose}</ItemDescription>
                  )}
                </ItemContent>
              </>
            )
            return saveless ? (
              <Item key={id} variant="outline" size="sm" className="bg-inset" asChild>
                <button
                  type="button"
                  className="cursor-pointer text-left hover:border-gold hover:bg-well"
                  onClick={() => onNavigate(id)}
                >
                  {body}
                </button>
              </Item>
            ) : (
              <Item key={id} variant="outline" size="sm" className="bg-inset opacity-70">
                {body}
              </Item>
            )
          })}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
