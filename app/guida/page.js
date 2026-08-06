import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import GuidaContent from './_components/GuidaContent'
import GuidaGate from './_components/GuidaGate'
import PersistAccessToken from './_components/PersistAccessToken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ACCESS_COOKIE = 'guida_access_token'

async function isValidToken(token) {
  if (!token) return false
  const { data, error } = await supabase
    .from('guida_access')
    .select('email')
    .eq('token', token)
    .maybeSingle()
  if (error) {
    console.error('Errore verifica token guida:', error)
    return false
  }
  return !!data
}

export default async function GuidaPage({ searchParams }) {
  const params = await searchParams
  const queryToken = params?.t || null

  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(ACCESS_COOKIE)?.value || null

  const token = queryToken || cookieToken
  const granted = await isValidToken(token)

  if (!granted) {
    return <GuidaGate />
  }

  return (
    <>
      {queryToken && queryToken !== cookieToken && <PersistAccessToken token={queryToken} />}
      <GuidaContent />
    </>
  )
}
