const STORAGE_KEY = 'hz_tracker_profile';

export const profileStorage = {
    getProfile(userId) {
        try {
            const p = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
            if (p) return JSON.parse(p);
            return { displayName: '', avatarUrl: '' };
        } catch {
            return { displayName: '', avatarUrl: '' };
        }
    },

    saveProfile(userId, profile) {
        try {
            localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(profile));
            // Dispatch a custom event so the Layout can update dynamically
            window.dispatchEvent(new Event('profileUpdated'));
            return { error: null };
        } catch (err) {
            return { error: { message: err.message } };
        }
    }
};
