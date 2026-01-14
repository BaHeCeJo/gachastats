import { createClient } from '@/lib/supabase/server'
import { updateGameAction } from './actions'
import { redirect } from 'next/navigation'
import ImageInput from '../components/ImageInput'

export default async function AdminGamePage({
    params,
}: {
    params: Promise<{ gameSlug: string }>
}) {
    const supabase = await createClient()
    const { gameSlug } = await params

    const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('slug', gameSlug)
        .single()

    if (!game) {
        redirect('/admin')
    }

    const imageUrl = game.cover_image
        ? supabase.storage
            .from('games')
            .getPublicUrl(game.cover_image).data.publicUrl
        : null

    return (
        <main className="p-8 max-w-xl">
            <h1 className="text-2xl font-bold mb-4">
                Edit {game.name}
            </h1>

            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={`${game.name} cover`}
                    className="mb-4 rounded"
                />
            )}

            <form
                action={updateGameAction.bind(null, game.id, game.slug)}
                className="flex flex-col gap-2"
            >
                <input
                    name="name"
                    defaultValue={game.name}
                    className="border p-2"
                />

                <textarea
                    name="description"
                    defaultValue={game.description ?? ''}
                    className="border p-2"
                />

                <ImageInput
                    name="cover"
                    initialUrl={imageUrl}
                />


                <button className="bg-blue-600 text-white p-2">
                    Save changes
                </button>
            </form>
        </main>
    )
}
