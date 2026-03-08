import { describe, it, expect, vi } from 'vitest'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { upsertGameAction } from '@/lib/actions/admin/game'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

describe('Security Layer - Admin Actions', () => {
  it('rejects unauthorized users from administrative actions', async () => {
    // 1. Mock user as NOT an admin
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'user' } }) // Role is USER, not ADMIN
          })
        })
      })
    };
    (createClient as any).mockResolvedValue(mockSupabase)

    // 2. Try to perform an admin action (upsertGame)
    const formData = new FormData()
    const result = await upsertGameAction(formData)

    // 3. Assert rejection
    expect(result).toEqual({ error: "Unauthorized" })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('allows admins to perform administrative actions', async () => {
    // 1. Mock user as ADMIN
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-123' } } }) },
      from: vi.fn().mockImplementation((table) => {
          if (table === 'profiles') {
              return {
                  select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }) // Role is ADMIN
                    })
                  })
              }
          }
          // For the actual insert/update in upsertGame
          return {
              select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }),
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockResolvedValue({ error: null })
          }
      }),
      storage: { from: vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue({}) }) }
    };
    (createClient as any).mockResolvedValue(mockSupabase)

    // 2. Mock valid form data
    const formData = new FormData()
    formData.set("name", JSON.stringify({ en: "New Game" }))
    formData.set("description", JSON.stringify({ en: "Desc" }))
    formData.set("default_lang", "en")
    formData.set("supported_languages", JSON.stringify(["en"]))

    // 3. Perform action
    await upsertGameAction(formData)

    // 4. Assert success (redirected back to list)
    expect(redirect).toHaveBeenCalledWith("/admin/games")
  })
})
