import { useState, useEffect } from 'preact/hooks';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    fpsLimit: number;
    setFpsLimit: (v: number) => void;
    mouseDpi: number;
    setMouseDpi: (v: number) => void;
    nickname: string;
    setNickname: (v: string) => void;
}

export default function SettingsModal({
    isOpen,
    onClose,
    fpsLimit,
    setFpsLimit,
    mouseDpi,
    setMouseDpi,
    nickname,
    setNickname,
}: SettingsModalProps) {
    const [localFps, setLocalFps] = useState(fpsLimit);
    const [localDpi, setLocalDpi] = useState(mouseDpi);
    const [localNickname, setLocalNickname] = useState(nickname);

    // Sync local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalFps(fpsLimit);
            setLocalDpi(mouseDpi);
            setLocalNickname(nickname);
        }
    }, [isOpen, fpsLimit, mouseDpi, nickname]);

    if (!isOpen) return null;

    const handleSave = () => {
        setFpsLimit(localFps);
        setMouseDpi(localDpi);
        setNickname(localNickname);
        localStorage.setItem('tspaim_fps_limit', String(localFps));
        localStorage.setItem('tspaim_mouse_dpi', String(localDpi));
        localStorage.setItem('tspaim_nickname', localNickname);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                <h2 className="modal-title">Settings</h2>

                <div className="settings-section">
                    <h3>Display</h3>
                    <div className="setting-row">
                        <label>Max FPS</label>
                        <select
                            value={localFps}
                            onChange={(e) => setLocalFps(Number(e.currentTarget.value))}
                        >
                            <option value={0}>Unlimited</option>
                            <option value={60}>60</option>
                            <option value={120}>120</option>
                            <option value={144}>144</option>
                            <option value={165}>165</option>
                            <option value={200}>200</option>
                            <option value={240}>240</option>
                            <option value={360}>360</option>
                        </select>
                    </div>
                </div>

                <div className="settings-section">
                    <h3>Input</h3>
                    <div className="setting-row">
                        <label>Mouse DPI</label>
                        <input
                            type="number"
                            value={localDpi}
                            onInput={(e) => setLocalDpi(parseInt(e.currentTarget.value) || 0)}
                            min={100}
                            max={32000}
                        />
                    </div>
                    <p className="setting-hint">
                        Used for leaderboard analytics only
                    </p>
                </div>

                <div className="settings-section">
                    <h3>Profile</h3>
                    <div className="setting-row">
                        <label>Nickname</label>
                        <input
                            type="text"
                            value={localNickname}
                            onInput={(e) => setLocalNickname(e.currentTarget.value.slice(0, 15))}
                            placeholder="Enter nickname"
                            maxLength={15}
                        />
                    </div>
                </div>

                <div className="settings-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>
    );
}
