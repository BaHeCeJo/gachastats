import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImageInput from '@/app/components/ImageInput'
import { deleteSectionAction } from '@/app/admin/games/actions'
import ConfirmButton from '@/app/components/ConfirmButton'
import EntityGridManager from '@/app/components/EntityGridManager'

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}
/* ===========================
   Server Action — Update Section
=========================== */
export async function updateSectionAction(
  gameSlug: string,
  sectionId: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()

  const key = (formData.get('key') as string)?.trim()
  const color = (formData.get('color') as string) || '#ffffff'
  const order_index = Number(formData.get('order_index') || 0)
  const icon = formData.get('icon') as File | null

  if (!key) {
    throw new Error('Key is required')
  }

  let iconPath: string | undefined

  if (icon && icon.size > 0) {
    const ext = icon.name.split('.').pop()
    iconPath = `${gameSlug}/sections/${key}/icon.${ext}`

    await supabase.storage
      .from('games')
      .upload(iconPath, icon, {
        upsert: true,
        contentType: icon.type
      })
  }

  const { error } = await supabase
    .from('game_sections')
    .update({
      key,
      color,
      order_index,
      ...(iconPath ? { icon_path: iconPath } : {})
    })
    .eq('id', sectionId)

  if (error) throw new Error(error.message)

  redirect(`/admin/games/${gameSlug}/sections`)
}

/* ===========================
   Server Action — Update Display Settings
=========================== */
export async function updateDisplaySettingsAction(
  gameSlug: string,
  sectionId: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()

  const max_columns = Number(formData.get('max_columns') || 6)
  const bg_color_field_id = (formData.get('bg_color_field_id') as string) || null
  const top_left_icon_field_id = (formData.get('top_left_icon_field_id') as string) || null
  const top_right_icon_field_id = (formData.get('top_right_icon_field_id') as string) || null
  const overlay_icon_field_id = (formData.get('overlay_icon_field_id') as string) || null
  const filter_field_ids = formData.getAll('filter_field_ids') as string[]

  const { error } = await supabase
    .from('section_display_settings')
    .upsert({
      section_id: sectionId,
      max_columns,
      bg_color_field_id,
      top_left_icon_field_id,
      top_right_icon_field_id,
      overlay_icon_field_id,
      filter_field_ids
    }, { onConflict: 'section_id' })

  if (error) throw new Error(error.message)

  redirect(`/admin/games/${gameSlug}/sections/${sectionId}`)
}

/* ===========================
   Server Component — Edit Section + Manage Fields + Manage Entities
=========================== */
export default async function EditSectionPage({ params }: PageProps) {
  const { gameSlug, sectionId } = await params
  const supabase = await createClient()

  // Fetch section
  const { data: section } = await supabase
    .from('game_sections')
    .select('*')
    .eq('id', sectionId)
    .single()

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  // Fetch fields with options for filtering
  const { data: fields } = await supabase
    .from('section_fields')
    .select('*, field_options(*)')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true })

  // Group fields by category and sort them
  const groupedFields: Record<string, typeof fields> = {}
  if (fields) {
    fields.forEach(field => {
      const cat = field.category || 'General'
      if (!groupedFields[cat]) groupedFields[cat] = []
      groupedFields[cat]!.push(field)
    })
  }

  // Sort categories by the minimum order_index of their fields
  const sortedCategories = Object.keys(groupedFields).sort((a, b) => {
    const minA = Math.min(...groupedFields[a]!.map(f => f.order_index || 0))
    const minB = Math.min(...groupedFields[b]!.map(f => f.order_index || 0))
    if (minA !== minB) return minA - minB
    return a.localeCompare(b)
  })

  // Fetch display settings
  const { data: displaySettings } = await supabase
    .from('section_display_settings')
    .select('*')
    .eq('section_id', sectionId)
    .single()

  // Fetch entities with their default skin and a single image for the icon, ordered alphabetically
  const { data: entities, error: entitiesError } = await supabase
    .from('section_entities')
    .select(`
      *,
      entity_skins (
        is_default,
        entity_images (
          image_path
        )
      ),
      entity_field_values (
        id,
        field_id,
        value_text,
        option_id,
        field_options (
          color,
          icon_path
        )
      )
    `)
    .eq('section_id', sectionId)
    .eq('entity_skins.is_default', true)
    .order('name', { ascending: true })
    .limit(1, { foreignTable: 'entity_skins.entity_images' })

  // Process entities
  const processedEntities = (entities || []).map(entity => {
    const skin = entity.entity_skins?.[0]
    const iconPath = skin?.entity_images?.[0]?.image_path
    let publicIconUrl = ''
    
    if (iconPath) {
      if (iconPath.startsWith('http')) {
        publicIconUrl = iconPath
      } else {
        publicIconUrl = supabase.storage.from('games').getPublicUrl(iconPath).data.publicUrl
      }
    }

    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {}
    const allValues: Record<string, string[]> = {}

    entity.entity_field_values?.forEach((val: any) => {
      if (!allValues[val.field_id]) allValues[val.field_id] = []
      const value = val.option_id || val.value_text
      if (value) allValues[val.field_id].push(String(value))

      const opt = val.field_options
      if (opt) {
        fieldValuesMap[val.field_id] = {
          color: opt.color,
          iconUrl: opt.icon_path ? supabase.storage.from('games').getPublicUrl(opt.icon_path).data.publicUrl : undefined
        }
      }
    })

    return { ...entity, publicIconUrl, fieldValuesMap, allValues }
  })

  // Prepare filter fields data
  const filterFieldIds = displaySettings?.filter_field_ids || []
  const filterFields = (fields || [])
    .filter(f => filterFieldIds.includes(f.id))
    .map(f => ({
      id: String(f.id),
      key: f.key,
      options: (f.field_options || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map(opt => ({
          id: String(opt.id),
          value_key: opt.value_key,
          iconUrl: opt.icon_path ? supabase.storage.from('games').getPublicUrl(opt.icon_path).data.publicUrl : undefined,
          color: opt.color
        }))
    }))

  const colorFields = fields?.filter(f => f.has_color) || []
  const iconFields = fields?.filter(f => f.has_icon) || []

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Section</h1>
        <form action={deleteSectionAction.bind(null, sectionId, gameSlug)}>
          <ConfirmButton>Delete Section</ConfirmButton>
        </form>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          {/* ================= Section Edit ================= */}
          <section className="space-y-6 border-b pb-10">
            <h2 className="text-xl font-semibold">General Info</h2>
            <form
              action={updateSectionAction.bind(null, gameSlug, sectionId)}
              className="space-y-4"
            >
              <input
                name="key"
                defaultValue={section.key}
                placeholder="Display name (characters, weapons...)"
                className="border p-2 w-full"
                required
              />

              <div className="flex gap-4 items-center">
                <input
                  name="color"
                  type="color"
                  defaultValue={section.color ?? '#ffffff'}
                  className="border w-16 h-10"
                />

                <input
                  name="order_index"
                  type="number"
                  defaultValue={section.order_index ?? 0}
                  className="border p-2 w-24"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Icon</label>
                <ImageInput 
                  name="icon" 
                  initialUrl={section.icon_path ? supabase.storage.from('games').getPublicUrl(section.icon_path).data.publicUrl : null} 
                />
              </div>

              <button className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition">
                Save Section
              </button>
            </form>
          </section>

          {/* ================= Display Settings ================= */}
          <section className="space-y-6 border-b pb-10">
            <h2 className="text-xl font-semibold">Display Settings (Grid)</h2>
            <form
              action={updateDisplaySettingsAction.bind(null, gameSlug, sectionId)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="space-y-2">
                <label className="block text-sm font-medium">Max Columns</label>
                <input
                  name="max_columns"
                  type="number"
                  defaultValue={displaySettings?.max_columns ?? 6}
                  className="border p-2 w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Background Color Field</label>
                <select name="bg_color_field_id" defaultValue={displaySettings?.bg_color_field_id ?? ''} className="border p-2 w-full">
                  <option value="">None</option>
                  {colorFields.map(f => <option key={f.id} value={f.id}>{f.key}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Top-Left Icon Field</label>
                <select name="top_left_icon_field_id" defaultValue={displaySettings?.top_left_icon_field_id ?? ''} className="border p-2 w-full">
                  <option value="">None</option>
                  {iconFields.map(f => <option key={f.id} value={f.id}>{f.key}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Top-Right Icon Field</label>
                <select name="top_right_icon_field_id" defaultValue={displaySettings?.top_right_icon_field_id ?? ''} className="border p-2 w-full">
                  <option value="">None</option>
                  {iconFields.map(f => <option key={f.id} value={f.id}>{f.key}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Overlay Icon Field (Between)</label>
                <select name="overlay_icon_field_id" defaultValue={displaySettings?.overlay_icon_field_id ?? ''} className="border p-2 w-full">
                  <option value="">None</option>
                  {iconFields.map(f => <option key={f.id} value={f.id}>{f.key}</option>)}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium">Fields to Filter by</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {fields?.map(f => (
                    <label key={f.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        name="filter_field_ids" 
                        value={f.id} 
                        defaultChecked={displaySettings?.filter_field_ids?.includes(f.id)}
                      />
                      {f.key}
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <button className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition">
                  Save Display Settings
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* ================= Fields Management ================= */}
        <aside className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Fields</h2>
            <Link
              href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/new`}
              className="bg-[#22c55e] text-black font-bold px-2 py-1 text-sm rounded hover:bg-[#1da34a] transition"
            >
              Add Field
            </Link>
          </div>

          {sortedCategories.map(category => (
            <div key={category} className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800 pb-1">
                {category}
              </h3>
              <div className="space-y-1">
                {groupedFields[category]!.map(field => (
                  <Link
                    key={field.id}
                    href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${field.id}`}
                    className="block border rounded p-2 hover:bg-gray-800 transition text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{field.key}</span>
                      <span className="text-xs text-gray-500">{field.field_type}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>

      {/* ================= Entities Management — Grid & Filters ================= */}
      <EntityGridManager 
        entities={processedEntities as any}
        displaySettings={displaySettings}
        filterFields={filterFields}
        gameSlug={gameSlug}
        sectionId={sectionId}
        sectionName={section.key}
        isAdmin={true}
      />
    </main>
  )
}
