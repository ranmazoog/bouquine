import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../components/shared/SettingsModal';
import { mockElectronAPI } from './mocks';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('SettingsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.hasAPIKey.mockResolvedValue(false);
        mockElectronAPI.getEncryptionMethod.mockResolvedValue('keychain');
        mockElectronAPI.getSetting.mockResolvedValue(null);
    });

    it('should not render when isOpen is false', () => {
        render(<SettingsModal isOpen={false} onClose={() => { }} />);
        expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', async () => {
        render(<SettingsModal isOpen={true} onClose={() => { }} />);
        await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument());
        expect(screen.getByText('Secure Storage')).toBeInTheDocument();
    });

    it('should show success if hasKey is true', async () => {
        mockElectronAPI.hasAPIKey.mockResolvedValue(true);
        render(<SettingsModal isOpen={true} onClose={() => { }} />);
        await waitFor(() => expect(screen.getByText('API key is configured')).toBeInTheDocument());
    });

    it('should call setAPIKey when saving', async () => {
        render(<SettingsModal isOpen={true} onClose={() => { }} />);

        await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument());

        const input = screen.getByPlaceholderText('sk-...');
        fireEvent.change(input, { target: { value: 'sk-test-key' } });

        const saveBtn = screen.getByText('Save API Key');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(mockElectronAPI.setAPIKey).toHaveBeenCalledWith('openai', 'sk-test-key');
        });
    });
});
