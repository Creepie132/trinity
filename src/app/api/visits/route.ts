import { NextRequest, NextResponse } from 'next/server'
import { validateBody, createVisitSchema } from '@/lib/validations'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { enforceDemoLimit } from '@/lib/demo-limits'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'
import { bookingConfirmEmail, newBookingNotifyEmail } from '@/lib/email-templates'
import { queuePushNotification } from '@/lib/push-notify'
import { dispatchNotification } from '@/lib/dispatch-notification'
import { scheduleMessage } from '@/lib/wa/scheduler'
import { normalizePhone } from '@/lib/wa/phone'
import { fireWaTrigger } from '@/lib/wa/fire-trigger'
import { createVisitPaymentLink } from '@/lib/wa/create-visit-payment-link'
import { israelLocalToUTC } from '@/lib/tz'

// GET /api/visits - список визитов для текущей организации
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data, error } = await serviceSupabase
      .from('visits')
      .select(`
        *,
        clients(*),
        services(*),
        visit_services(*)
      `)
      .eq('org_id', orgId)
      .gte('scheduled_at', oneWeekAgo.toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Zod validation
    const { data, error: validationError } = validateBody(createVisitSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    // Auth + org_id from JWT
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { user, orgId: org_id, supabase } = auth

    // Check meeting mode
    const { data: orgData } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', org_id)
      .single()
    
    const isMeetingMode = orgData?.features?.meeting_mode === true
    console.log('[API /api/visits POST] Meeting mode:', isMeetingMode)

    // ── Demo limits: server-side enforcement (HTTP 403 + standard payload) ────
    const limitTotal = await enforceDemoLimit(org_id, 'visits_total')
    if (limitTotal) return limitTotal

    const limitActive = await enforceDemoLimit(org_id, 'visits_active')
    if (limitActive) return limitActive
    // ─────────────────────────────────────────────────────────────────────────

    const { clientId, service, serviceId, date, time, scheduledAt: clientScheduledAt, duration, price, quantity, notes, event_type, meeting_link } = data

    if (!clientId) {
      return NextResponse.json({ error: 'חסר מזהה לקוח' }, { status: 400 })
    }
    if (!service && !serviceId) {
      return NextResponse.json({ error: 'חסר סוג שירות' }, { status: 400 })
    }
    if (!clientScheduledAt && (!date || !time)) {
      return NextResponse.json({ error: 'חסר תאריך או שעה' }, { status: 400 })
    }
    if (!isMeetingMode && (price === null || price === undefined || price === '')) {
      return NextResponse.json({ error: 'חסר מחיר' }, { status: 400 })
    }

    // Prefer client-provided ISO timestamp (browser local TZ).
    // Fallback: DST-aware conversion via israelLocalToUTC (Asia/Jerusalem).
    const scheduled_at = clientScheduledAt ?? israelLocalToUTC(date!, time!)

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    let visitPrice = (price !== null && price !== undefined && price !== '') ? parseFloat(price) : 0
    if (!price && serviceId) {
      if (uuidRegex.test(serviceId)) {
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('price, duration_minutes')
          .eq('id', serviceId)
          .eq('org_id', org_id)
          .single()
        if (!serviceError && serviceData) {
          visitPrice = serviceData.price || 0
        }
      }
    }

    const insertData: any = {
      client_id: clientId,
      org_id: org_id,
      scheduled_at: scheduled_at,
      duration_minutes: duration !== null && duration !== undefined 
        ? (typeof duration === 'number' ? duration : parseInt(duration))
        : (isMeetingMode ? null : 60),
      price: visitPrice,
      quantity: Math.max(1, Math.floor(quantity ?? 1)), // backend guard: never < 1
      notes: notes || null,
      status: 'scheduled',
      staff_user_id: user.id,
      event_type: event_type || 'visit',
      meeting_link: meeting_link || null,
    }

    if (serviceId) {
      if (uuidRegex.test(serviceId)) {
        insertData.service_id = serviceId
        insertData.service_type = service || null
      } else {
        insertData.service_id = null
        insertData.service_type = serviceId
      }
    } else if (service) {
      insertData.service_id = null
      insertData.service_type = service
    } else {
      insertData.service_id = null
      insertData.service_type = 'other'
    }

    // Insert visit — select with clients join so CalendarView gets clientName immediately
    const { data: visit, error: insertError } = await supabase
      .from('visits')
      .insert(insertData)
      .select(`*, clients(first_name, last_name, phone, email), services(id, name, name_ru, duration_minutes, price)`)
      .single()

    if (insertError) {
      console.error('[API /api/visits POST] Insert error:', insertError)
      return NextResponse.json(
        { error: `שגיאה ביצירת ביקור: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('[API /api/visits POST] Visit created successfully:', visit.id)

    // ─── WhatsApp reminder (non-critical) ────────────────────────────────────
    try {
      // Проверяем что у org есть активная WA-интеграция
      const { data: waIntegration } = await supabase
        .from('wa_integrations')
        .select('id')
        .eq('org_id', org_id)
        .eq('is_active', true)
        .single()

      if (waIntegration) {
        // Получаем телефон клиента
        const { data: clientData } = await supabase
          .from('clients')
          .select('first_name, last_name, phone')
          .eq('id', clientId)
          .single()

        const phone = normalizePhone(clientData?.phone)

        if (phone) {
          // Время визита в читаемом виде (Израиль)
          const visitDate = new Date(scheduled_at).toLocaleDateString('he-IL', {
            day: 'numeric', month: 'long', year: 'numeric',
            timeZone: 'Asia/Jerusalem',
          })
          const visitTime = new Date(scheduled_at).toLocaleTimeString('he-IL', {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Jerusalem',
          })

          const clientName = [clientData?.first_name, clientData?.last_name]
            .filter(Boolean).join(' ') || 'לקוח יקר'

          const serviceName = insertData.service_type || 'שירות'

          const message = `שלום ${clientName} 👋\nתורך אושר!\n📅 ${visitDate} בשעה ${visitTime}\n💇 ${serviceName}\n\nנתראה בקרוב ✨`

          // Отправить за 24 часа до визита
          const reminderAt = new Date(new Date(scheduled_at).getTime() - 24 * 60 * 60 * 1000)
          // Если визит меньше чем через 24ч — отправляем через 1 минуту
          const scheduledAt = reminderAt > new Date()
            ? reminderAt
            : new Date(Date.now() + 60_000)

          await scheduleMessage(supabase, {
            orgId: org_id,
            clientId: clientId,
            phone,
            messageBody: message,
            scheduledAt,
            idempotencyKey: `visit_reminder_${visit.id}`,
          })

          console.log('[API /api/visits POST] WA reminder scheduled for:', phone, 'at', scheduledAt)
        }
      }
    } catch (waError) {
      // WA-ошибка НЕ фейлит создание визита
      console.error('[API /api/visits POST] WA reminder error (non-critical):', waError)
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Queue push + dispatch Telegram via Edge Function (non-critical, fire-and-forget)
    const visitTimeStr = new Date(scheduled_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    void dispatchNotification({
      event_type: 'new_visit',
      org_id: org_id,
      payload: {
        title: '📅 ביקור נוצר',
        body: `${visitTimeStr} — ${insertData.service_type || 'ביקור'}`,
        url: '/diary',
      },
    })

    // WA триггер visit_created (fire-and-forget, с опциональной ссылкой на оплату)
    {
      const client = visit.clients as any
      const svc    = visit.services as any
      const dt     = new Date(scheduled_at)
      if (client?.phone) {
        const { data: org } = await supabase.from('organizations').select('name').eq('id', org_id).single()

        // Проверяем: включена ли у триггера visit_created опция прикрепить ссылку на оплату
        const { data: triggerCfg } = await supabase
          .from('wa_trigger_settings')
          .select('is_enabled, attach_payment_link')
          .eq('org_id', org_id)
          .eq('trigger_type', 'visit_created')
          .maybeSingle()

        let paymentLink = ''
        if (triggerCfg?.is_enabled && triggerCfg?.attach_payment_link && visitPrice > 0) {
          const serviceName = svc?.name_ru ?? svc?.name ?? insertData.service_type ?? 'שירות'
          const link = await createVisitPaymentLink({
            orgId: org_id,
            visitId: visit.id,
            clientId: clientId,
            amount: visitPrice,
            description: `${serviceName} — ${client.first_name ?? ''}`.trim(),
            origin: request.nextUrl.origin,
          })
          paymentLink = link ?? ''
        }

        void fireWaTrigger({
          orgId: org_id,
          triggerType: 'visit_created',
          clientPhone: client.phone,
          vars: {
            client_name: client.first_name ?? '',
            org_name:    org?.name ?? '',
            date: dt.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }),
            time: dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }),
            service: svc?.name_ru ?? svc?.name ?? insertData.service_type ?? '',
            payment_link: paymentLink,
          },
          entityId: visit.id,
        })
      }
    }
    await queuePushNotification({
      org_id: org_id,
      user_id: user.id,
      type: 'new_visit',
      title: '📅 ביקור נוצר',
      body: `${visitTimeStr} — ${insertData.service_type || 'ביקור'}`,
      link: '/diary',
      reference_id: visit.id,
    })

    // Award loyalty points
    try {
      const { data: loyaltySettings } = await supabase
        .from('loyalty_settings')
        .select('is_enabled, points_per_visit')
        .eq('org_id', org_id)
        .single()

      if (loyaltySettings?.is_enabled && loyaltySettings.points_per_visit > 0) {
        await supabase.from('loyalty_points').insert({
          org_id,
          client_id: clientId,
          points: loyaltySettings.points_per_visit,
          type: 'earn_visit',
          description: 'Визит',
          reference_id: visit.id,
        })
      }
    } catch (error) {
      console.error('[API /api/visits POST] Loyalty points error (non-critical):', error)
    }

    // Send email notifications
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('name, email, phone')
        .eq('id', clientId)
        .single()

      let serviceName = 'Услуга | שירות'
      if (insertData.service_id && uuidRegex.test(insertData.service_id)) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('name')
          .eq('id', insertData.service_id)
          .single()
        if (serviceData) serviceName = serviceData.name
      } else if (insertData.service_type) {
        serviceName = insertData.service_type
      }

      const { data: orgInfo } = await supabase
        .from('organizations')
        .select('name, contact_email')
        .eq('id', org_id)
        .single()

      const businessName = orgInfo?.name || 'Trinity CRM'
      const businessEmail = orgInfo?.contact_email
      const visitDate = new Date(scheduled_at).toLocaleDateString('he-IL')
      const visitTimeLabel = new Date(scheduled_at).toLocaleTimeString('he-IL', {
        hour: '2-digit', minute: '2-digit',
      })

      if (clientData?.email) {
        await resend.emails.send({
          from: 'Trinity CRM <notifications@ambersol.co.il>',
          to: clientData.email,
          subject: `✓ התור שלך אושר | Ваша запись подтверждена - ${businessName}`,
          headers: getEmailHeaders(),
          tags: getEmailTags('transactional'),
          html: bookingConfirmEmail(clientData.name, visitDate, visitTimeLabel, serviceName, businessName),
        })
      }

      if (businessEmail) {
        await resend.emails.send({
          from: 'Trinity CRM <notifications@ambersol.co.il>',
          to: businessEmail,
          subject: `🔔 תור חדש | Новая запись - ${clientData?.name || 'Клиент'}`,
          headers: getEmailHeaders(),
          tags: getEmailTags('transactional'),
          html: newBookingNotifyEmail(
            clientData?.name || 'Клиент | לקוח',
            clientData?.phone || '',
            visitDate,
            visitTimeLabel,
            serviceName
          ),
        })
      }
    } catch (emailError) {
      console.error('[API /api/visits POST] Email error (non-critical):', emailError)
    }

    return NextResponse.json({ visit }, { status: 201 })
  } catch (error: any) {
    console.error('[API /api/visits POST] Exception:', error)
    return NextResponse.json({ error: `שגיאה: ${error.message}` }, { status: 500 })
  }
}
