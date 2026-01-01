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
    const [sensitivity, setSensitivity] = useState(() => {
        const saved = localStorage.getItem('tspaim_sensitivity');
        return saved ? parseFloat(saved) : 1.0;
    });

    // Sync local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalFps(fpsLimit);
            setLocalDpi(mouseDpi);
            setLocalNickname(nickname);
        }
    }, [isOpen, fpsLimit, mouseDpi, nickname]);

    if (!isOpen) return null;

    // cm/360 calculation (approximate based on common game values)
    const calculateCm360 = () => {
        if (localDpi <= 0 || sensitivity <= 0) return '—';
        // Using a common reference: 1.0 sens at 800 DPI ≈ 34.6 cm/360
        const baseCm360 = 34.6;
        const cm360 = (baseCm360 * 800 * 1.0) / (localDpi * sensitivity);
        return cm360.toFixed(1);
    };

    const handleSave = () => {
        setFpsLimit(localFps);
        setMouseDpi(localDpi);
        setNickname(localNickname);
        localStorage.setItem('tspaim_fps_limit', String(localFps));
        localStorage.setItem('tspaim_mouse_dpi', String(localDpi));
        localStorage.setItem('tspaim_nickname', localNickname);
        localStorage.setItem('tspaim_sensitivity', String(sensitivity));
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                <h2 className="modal-title">⚙️ Settings</h2>

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
                    <div className="setting-row">
                        <label>In-Game Sensitivity</label>
                        <input
                            type="number"
                            value={sensitivity}
                            onInput={(e) => setSensitivity(parseFloat(e.currentTarget.value) || 1)}
                            step={0.1}
                            min={0.1}
                            max={10}
                        />
                    </div>
                    <div className="setting-row cm360-display">
                        <label>cm/360°</label>
                        <span className="cm360-value">{calculateCm360()}</span>
                    </div>
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
