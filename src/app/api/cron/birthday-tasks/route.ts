import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Используем service role для cron (admin права)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function GET(request: NextRequest) {
  // Auth check for cron endpoint
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[CRON] Birthday tasks - starting')

    // 1. Найти все организации с включённым модулем birthday
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, features')

    if (orgError) throw orgError

    const orgsWithBirthday = (organizations || []).filter((org: any) => {
      return org.features?.modules?.birthday === true
    })

    console.log(`[CRON] Found ${orgsWithBirthday.length} orgs with birthday module`)

    const today = new Date()
    const currentMonth = today.getMonth() + 1 // JavaScript months are 0-indexed
    const currentDay = today.getDate()
    const todayDate = today.toISOString().split('T')[0]

    let totalTasksCreated = 0

    // Обработка каждой организации
    for (const org of orgsWithBirthday) {
      console.log(`[CRON] Processing org ${org.id} (${org.name})`)

      // 2. Найти клиентов с днём рождения сегодня
      const { data: clients, error: clientsError } = await supabaseAdmin
        .from('clients')
        .select('id, name, phone, email, birthday')
        .eq('org_id', org.id)
        .not('birthday', 'is', null)

      if (clientsError) {
        console.error(`[CRON] Error fetching clients for org ${org.id}:`, clientsError)
        continue
      }

      // Фильтруем клиентов с днём рождения сегодня
      const birthdayClients = (clients || []).filter((client: any) => {
        if (!client.birthday) return false
        const birthday = new Date(client.birthday)
        return birthday.getMonth() + 1 === currentMonth && birthday.getDate() === currentDay
      })

      console.log(`[CRON] Found ${birthdayClients.length} birthday clients in org ${org.id}`)

      // Получить owner организации для created_by
      const { data: orgUsers } = await supabaseAdmin
        .from('org_users')
        .select('user_id')
        .eq('org_id', org.id)
        .eq('role', 'owner')
        .limit(1)
        .single()

      const createdBy = orgUsers?.user_id || null

      if (!createdBy) {
        console.log(`[CRON] No owner found for org ${org.id}, skipping`)
        continue
      }

      // Получаем всех пользователей организации для уведомлений
      const { data: allOrgUsers } = await supabaseAdmin
        .from('org_users')
        .select('user_id')
        .eq('org_id', org.id)

      const userIds = (allOrgUsers || []).map((u: any) => u.user_id)

      // Определяем язык организации (по умолчанию иврит)
      const language = org.features?.language || 'he'

      // Создаём задачи для каждого клиента с ДР
      for (const client of birthdayClients) {
        // 3. Проверить что задача на сегодня ещё не создана
        const { data: existingTask } = await supabaseAdmin
          .from('tasks')
          .select('id')
          .eq('org_id', org.id)
          .eq('client_id', client.id)
          .eq('auto_type', 'birthday')
          .gte('due_date', `${todayDate}T00:00:00Z`)
          .lte('due_date', `${todayDate}T23:59:59Z`)
          .limit(1)
          .single()

        if (existingTask) {
          console.log(`[CRON] Task already exists for client ${client.id}`)
          continue
        }

        // 4. Создать задачу
        const title = language === 'he' 
          ? `🎂 יום הולדת: ${client.name}`
          : `🎂 День рождения: ${client.name}`

        const description = language === 'he'
          ? `יום הולדת היום! אל תשכח לברך את הלקוח.`
          : `День рождения сегодня! Не забудьте поздравить клиента.`

        const { data: newTask, error: taskError } = await supabaseAdmin
          .from('tasks')
          .insert({
            org_id: org.id,
            created_by: createdBy,
            title,
            description,
            status: 'open',
            priority: 'normal',
            due_date: new Date().toISOString(),
            client_id: client.id,
            contact_phone: client.phone || null,
            contact_email: client.email || null,
            is_auto: true,
            auto_type: 'birthday',
          })
          .select()
          .single()

        if (taskError) {
          console.error(`[CRON] Error creating task for client ${client.id}:`, taskError)
          continue
        }

        console.log(`[CRON] Created birthday task ${newTask.id} for client ${client.name}`)
        totalTasksCreated++

        // 5. Создать уведомления для всех пользователей организации
        const notificationTitle = `🎂 ${client.name}`
        const notificationBody = language === 'he' 
          ? 'יום הולדת היום!'
          : 'День рождения сегодня!'

        const notifications = userIds.map((userId: string) => ({
          org_id: org.id,
          user_id: userId,
          type: 'birthday',
          title: notificationTitle,
          body: notificationBody,
          link: '/diary',
          reference_id: newTask.id,
        }))

        if (notifications.length > 0) {
          await supabaseAdmin.from('notifications').insert(notifications)
          console.log(`[CRON] Created ${notifications.length} notifications for task ${newTask.id}`)
        }
      }
    }

    console.log(`[CRON] Birthday tasks completed. Total tasks created: ${totalTasksCreated}`)

    return NextResponse.json({
      success: true,
      tasksCreated: totalTasksCreated,
      orgsProcessed: orgsWithBirthday.length,
    })
  } catch (error: any) {
    console.error('[CRON] Birthday tasks error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
