import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: '유저 정보가 없어요' }, { status: 400 })
  }

  const { data, error } = await supabase.storage
    .from('files')
    .list(userId, { sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ files: data })
}

export async function DELETE(request: NextRequest) {
  const { path } = await request.json()

  const { error } = await supabase.storage
    .from('files')
    .remove([path])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}