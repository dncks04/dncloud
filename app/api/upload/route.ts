import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

function sanitizeFileName(name: string): string {
  const ext = name.split('.').pop() ?? ''
  const base = name
    .replace(`.${ext}`, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
  return `${Date.now()}_${base}.${ext}`
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: '파일이 없어요' }, { status: 400 })
  }

  const fileName = sanitizeFileName(file.name)
  const { data, error } = await supabase.storage
    .from('files')
    .upload(fileName, file)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ path: data.path })
}