// localStorage-based trade storage (keyed per user)
// Works instantly - no database setup required

const STORAGE_KEY = 'hz_tracker_trades';

function getAll(userId) {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAll(userId, trades) {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(trades));
}

function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

export const tradeStorage = {
    async fetchTrades(userId) {
        const trades = getAll(userId);
        // Sort by date ascending
        trades.sort((a, b) => a.date.localeCompare(b.date));
        return { data: trades, error: null };
    },

    async fetchTradesDesc(userId) {
        const trades = getAll(userId);
        trades.sort((a, b) => b.date.localeCompare(a.date));
        return { data: trades, error: null };
    },

    async insertTrade(userId, trade) {
        try {
            const trades = getAll(userId);
            const newTrade = {
                id: generateId(),
                user_id: userId,
                date: trade.date,
                asset: trade.asset,
                trade_type: trade.trade_type,
                amount: Number(trade.amount),
                notes: trade.notes || null,
                created_at: new Date().toISOString(),
            };
            trades.push(newTrade);
            saveAll(userId, trades);
            return { data: newTrade, error: null };
        } catch (err) {
            return { data: null, error: { message: err.message } };
        }
    },

    async updateTrade(tradeId, userId, updates) {
        try {
            const trades = getAll(userId);
            const idx = trades.findIndex((t) => t.id === tradeId);
            if (idx === -1) return { error: { message: 'Trade not found' } };
            trades[idx] = { ...trades[idx], ...updates, amount: Number(updates.amount) };
            saveAll(userId, trades);
            return { data: trades[idx], error: null };
        } catch (err) {
            return { data: null, error: { message: err.message } };
        }
    },

    async deleteTrade(tradeId, userId) {
        try {
            const trades = getAll(userId);
            const filtered = trades.filter((t) => t.id !== tradeId);
            saveAll(userId, filtered);
            return { error: null };
        } catch (err) {
            return { error: { message: err.message } };
        }
    },
};
