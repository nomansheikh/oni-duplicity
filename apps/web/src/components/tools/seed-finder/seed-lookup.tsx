import { useState } from 'react'
import { openSeed } from '@/components/seed-viewer/seed-viewer-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseCoordinate } from '@/seed/details/coordinate'

/**
 * The seed viewer by coordinate: paste any settings coordinate, such as the one the game shows
 * on its pause screen, and see the seed in full. The viewer says so when the generator cannot
 * make it.
 */
export function SeedLookup() {
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = parseCoordinate(text)
    if (!parsed) {
      setError('That is not a seed coordinate. It looks like SNDST-C-1393183751-0-0-0.')
      return
    }
    setError(undefined)
    openSeed(parsed.coordinate)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>View a seed</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Label htmlFor="seed-coordinate-input">Seed coordinate</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="seed-coordinate-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="SNDST-C-1393183751-0-0-0"
              className="min-w-0 flex-1 font-mono"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error !== undefined}
              aria-describedby={error ? 'seed-coordinate-error' : undefined}
            />
            <Button type="submit" variant="secondary" disabled={text.trim() === ''}>
              View seed
            </Button>
          </div>
          {error && (
            <p id="seed-coordinate-error" role="alert" className="type-small text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
