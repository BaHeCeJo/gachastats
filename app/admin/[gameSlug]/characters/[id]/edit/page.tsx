import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type Props = {
  params: Promise<{ gameSlug: string; id: string }>
}

export default async function EditCharacterPage({ params }: Props) {
  const { gameSlug, id } = await params
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!character) redirect(`/admin/${gameSlug}/characters`)

  const { data: images } = await supabase
    .from('image_assets')
    .select('*')
    .eq('owner_type', 'character')
    .eq('owner_id', id)

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">{character.name}</h1>

      <section>
        <h2 className="font-semibold">Images</h2>
        <Link
          href={`/admin/${gameSlug}/characters/${id}/images`}
          className="text-blue-600"
        >
          Manage images
        </Link>
      </section>

      <form
        action={`/admin/${gameSlug}/characters/${id}/delete`}
        method="post"
      >
        <button className="text-red-600">Delete character</button>
      </form>
    </main>
  )
}
