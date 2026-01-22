import { safeStorage } from 'electron';
import Store from 'electron-store';

const StoreClass = (Store as any).default || Store;
const store = new StoreClass();

const ENCRYPTION_KEY = 'encrypted_api_keys';
const FALLBACK_KEY = 'api_keys_base64';

/**
 * Securely stores an API key using Electron's safeStorage (system keychain)
 * Falls back to base64 encoding with a warning if safeStorage is unavailable
 */
export function setAPIKey(provider: string, key: string): void {
    try {
        if (safeStorage.isEncryptionAvailable()) {
            // Use system keychain encryption (preferred)
            // Store as base64 string since electron-store doesn't handle Buffer well
            const encrypted = safeStorage.encryptString(key);
            const encryptedBase64 = encrypted.toString('base64');
            const keys = store.get(ENCRYPTION_KEY, {}) as Record<string, string>;
            keys[provider] = encryptedBase64;
            store.set(ENCRYPTION_KEY, keys);

            console.log(`[Security] API key for ${provider} encrypted using system keychain`);
        } else {
            // Fallback: Base64 encoding (NOT secure, but better than plaintext)
            console.warn(`[Security] safeStorage unavailable. Using base64 fallback for ${provider}. This is NOT secure!`);
            const encoded = Buffer.from(key).toString('base64');
            const keys = store.get(FALLBACK_KEY, {}) as Record<string, string>;
            keys[provider] = encoded;
            store.set(FALLBACK_KEY, keys);
        }
    } catch (error) {
        console.error(`[Security] Failed to store API key for ${provider}:`, error);
        throw new Error('Failed to securely store API key');
    }
}

/**
 * Retrieves a securely stored API key
 */
export function getAPIKey(provider: string): string | null {
    try {
        if (safeStorage.isEncryptionAvailable()) {
            const keys = store.get(ENCRYPTION_KEY, {}) as Record<string, string>;
            const encryptedBase64 = keys[provider];
            if (!encryptedBase64) return null;

            // Convert back from base64 to Buffer for decryption
            const encrypted = Buffer.from(encryptedBase64, 'base64');
            return safeStorage.decryptString(encrypted);
        } else {
            // Fallback: Base64 decoding
            const keys = store.get(FALLBACK_KEY, {}) as Record<string, string>;
            const encoded = keys[provider];
            if (!encoded) return null;

            return Buffer.from(encoded, 'base64').toString('utf8');
        }
    } catch (error) {
        console.error(`[Security] Failed to retrieve API key for ${provider}:`, error);
        return null;
    }
}

/**
 * Deletes a stored API key
 */
export function deleteAPIKey(provider: string): void {
    try {
        if (safeStorage.isEncryptionAvailable()) {
            const keys = store.get(ENCRYPTION_KEY, {}) as Record<string, string>;
            delete keys[provider];
            store.set(ENCRYPTION_KEY, keys);
        } else {
            const keys = store.get(FALLBACK_KEY, {}) as Record<string, string>;
            delete keys[provider];
            store.set(FALLBACK_KEY, keys);
        }
        console.log(`[Security] API key for ${provider} deleted`);
    } catch (error) {
        console.error(`[Security] Failed to delete API key for ${provider}:`, error);
    }
}

/**
 * Checks if an API key exists for a provider
 */
export function hasAPIKey(provider: string): boolean {
    if (safeStorage.isEncryptionAvailable()) {
        const keys = store.get(ENCRYPTION_KEY, {}) as Record<string, string>;
        return !!keys[provider];
    } else {
        const keys = store.get(FALLBACK_KEY, {}) as Record<string, string>;
        return !!keys[provider];
    }
}

/**
 * Returns the encryption method being used
 */
export function getEncryptionMethod(): 'keychain' | 'base64' {
    return safeStorage.isEncryptionAvailable() ? 'keychain' : 'base64';
}

// ============================================================================
// General Settings Storage (non-sensitive data)
// ============================================================================

const SETTINGS_KEY = 'app_settings';

export interface AppSettings {
    openrouterModel?: string;
    onboarding_complete?: boolean;
}

/**
 * Gets a setting value
 */
export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] | undefined {
    const settings = store.get(SETTINGS_KEY, {}) as AppSettings;
    return settings[key];
}

/**
 * Sets a setting value
 */
export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const settings = store.get(SETTINGS_KEY, {}) as AppSettings;
    settings[key] = value;
    store.set(SETTINGS_KEY, settings);
}
