// ============================================================
// API ROUTE: POST /api/winners/proof
// Authenticated subscriber uploads proof screenshot
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anonClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData  = await req.formData()
  const file      = formData.get('proof') as File | null
  const winner_id = formData.get('winner_id') as string | null

  if (!file || !winner_id) {
    return NextResponse.json({ error: 'proof file and winner_id required' }, { status: 400 })
  }

  // Verify this winner belongs to this user
  const { data: winner } = await supabaseAdmin
    .from('winners')
    .select('user_id, status')
    .eq('id', winner_id)
    .single()

  if (!winner || winner.user_id !== user.id) {
    return NextResponse.json({ error: 'Winner record not found' }, { status: 404 })
  }

  if (winner.status !== 'pending') {
    return NextResponse.json({ error: 'Proof already submitted' }, { status: 400 })
  }

  // Upload to Supabase Storage
  const ext      = file.name.split('.').pop()
  const path     = `proofs/${winner_id}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('winner-proofs')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('winner-proofs')
    .getPublicUrl(path)

  // Update winner record
  await supabaseAdmin
    .from('winners')
    .update({ proof_url: publicUrl })
    .eq('id', winner_id)

  return NextResponse.json({ data: { proof_url: publicUrl } })
}
