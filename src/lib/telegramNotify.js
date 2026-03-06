export async function sendTelegramNotification(trade) {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) return;

    const emoji = trade.amount >= 0 ? '📈' : '📉';
    const sign = trade.amount >= 0 ? '+' : '';
    const message = `${emoji} *H-Tracker — New Trade*\n\n` +
        `🪙 Asset: *${trade.asset}*\n` +
        `📊 Type: *${trade.trade_type}*\n` +
        `💰 P&L: *${sign}$${Number(trade.amount).toFixed(2)}*\n` +
        `📅 Date: *${trade.date}*\n` +
        (trade.notes ? `📝 Notes: _${trade.notes}_` : '');

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });
    } catch (err) {
        console.warn('Telegram notification failed:', err);
    }
}
