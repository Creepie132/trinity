const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function sendTelegramMessage(chatId: string, text: string) {
  console.log('=== TELEGRAM DEBUG ===')
  console.log('1. Bot token exists:', !!TELEGRAM_BOT_TOKEN)
  console.log('2. Bot token starts with:', TELEGRAM_BOT_TOKEN?.substring(0, 5))
  console.log('3. Chat ID:', chatId)
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set in environment variables!')
    return
  }
  
  if (!chatId) {
    console.error('❌ No chat_id provided')
    return
  }

  try {
    console.log('4. Sending Telegram message...')
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    })
    
    const result = await response.json()
    console.log('5. Telegram API response:', JSON.stringify(result))
    
    if (!response.ok) {
      console.error('❌ Telegram API error:', result)
    } else {
      console.log('✅ Telegram message sent successfully')
    }
  } catch (error) {
    console.error("❌ Telegram send failed:", error)
  }
}
