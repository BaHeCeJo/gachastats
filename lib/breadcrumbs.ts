import { createClient } from '@/lib/supabase/server';

type Params = {
  gameSlug?: string;
  sectionId?: string;
  fieldId?: string;
  entityId?: string;
};

type Crumb = {
  href: string;
  label: string;
};

// This function builds the breadcrumb array by fetching data based on URL params
export async function generateBreadcrumbs(params: Params): Promise<Crumb[]> {
  const supabase = await createClient();
  const crumbs: Crumb[] = [
    { href: '/admin', label: 'Admin' },
    { href: '/admin/games', label: 'Games' }
  ];

  if (!params.gameSlug) return crumbs;

  // 1. Fetch Game
  const { data: game } = await supabase
    .from('games')
    .select('name')
    .eq('slug', params.gameSlug)
    .single();

  if (!game) return crumbs;
  crumbs.push({ href: `/admin/games/${params.gameSlug}`, label: game.name });
  
  if (params.sectionId) {
    crumbs.push({ href: `/admin/games/${params.gameSlug}/sections`, label: 'Sections' });

    // 2. Fetch Section
    const { data: section } = await supabase
      .from('game_sections')
      .select('key')
      .eq('id', params.sectionId)
      .single();

    if (section) {
      crumbs.push({ href: `/admin/games/${params.gameSlug}/sections/${params.sectionId}`, label: section.key });
    }

    if (params.entityId) {
      crumbs.push({ href: `/admin/games/${params.gameSlug}/sections/${params.sectionId}/entities`, label: 'Entities' });

      // 3. Fetch Entity
      const { data: entity } = await supabase
        .from('section_entities')
        .select('id, name')
        .eq('id', params.entityId)
        .single();
      
      if (entity) {
        crumbs.push({ href: `/admin/games/${params.gameSlug}/sections/${params.sectionId}/entities/${entity.id}`, label: entity.name });
      }
    } else if (params.fieldId) {
      crumbs.push({ href: `/admin/games/${params.gameSlug}/sections/${params.sectionId}/fields`, label: 'Fields' });

      // 4. Fetch Field
      const { data: field } = await supabase
        .from('section_fields')
        .select('id, key')
        .eq('id', params.fieldId)
        .single();

      if (field) {
        crumbs.push({ href: `/admin/games/${params.gameSlug}/sections/${params.sectionId}/fields/${field.id}`, label: field.key });
      }
    }
  }

  return crumbs;
}
