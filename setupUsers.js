import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qimhjsxbnsgitxrmwjss.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbWhqc3hibnNnaXR4cm13anNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzE0NDIsImV4cCI6MjEwMDMwNzQ0Mn0.eX1VV_buMumMp39zNiHIskq0tPeLwB5nxdIaGoiWX6M'
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Creating users...')

    // 2. Howell Chisom
    const { data: user2, error: err2 } = await supabase.auth.signUp({
        email: 'howellchisom@gmail.com', // standard domain
        password: 'Sweetest2005@',
        options: {
            data: {
                full_name: 'Chisom Howell',
                fca_id: 'FCA-ETERNAL',
                status: 'APPROVED',
                is_admin: 'true',
                department: 'Software Engineering',
                faculty: 'SICT',
                lichess_username: 'strengthofLSB',
                avatar_url: '/chisom-howell.jpg',
                reg_number: 'HONORARY'
            }
        }
    })
    console.log('User 2 (Howell):', err2, user2)
}
main()
