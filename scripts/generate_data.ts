
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Load env vars
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Config
const TOTAL_ENTRIES = 2000; // Enough for statistical significance
const SCENARIOS = ['static-grid', 'smooth-track', 'adaptive-track'];

// Simulation Parameters
const RESOLUTIONS = [
    { w: 1920, h: 1080, label: '1080p' },
    { w: 2560, h: 1440, label: '1440p' },
    { w: 3840, h: 2160, label: '4K' },
    { w: 1366, h: 768, label: 'Laptop' }
];
// DPI buckets commonly used by gamers
const DPIS = [400, 800, 1600, 3200];
const SENSITIVITIES = [20, 30, 40, 50]; // cm/360 approx equivalent

// Helper: Box-Muller transform for normal distribution
function randomNormal(mean: number, stdDev: number) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
}

async function generateData() {
    console.log(`🚀 Starting REALISTIC data generation: ${TOTAL_ENTRIES} entries...`);

    // Simulate a pool of players with varying skill levels
    // 10% Pro (0.85-0.95), 40% Average (0.4-0.6), 50% Beginner (0.2-0.4)
    const players = Array.from({ length: 50 }, (_, i) => ({
        id: `user_${i}`,
        nickname: i < 5 ? `Pro_Player_${i}` : `Player_${i}`,
        baseSkill: i < 5 ? randomNormal(0.9, 0.05) : randomNormal(0.5, 0.15)
    }));

    let processed = 0;
    const batchSize = 50;

    while (processed < TOTAL_ENTRIES) {
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
            // Pick a player
            const player = players[Math.floor(Math.random() * players.length)];
            const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

            // Randomize hardware setup for this session
            const res = RESOLUTIONS[Math.floor(Math.random() * RESOLUTIONS.length)];
            const dpi = DPIS[Math.floor(Math.random() * DPIS.length)];

            // Model: Angular Precision Error (Pixel Skipping)
            // Lower DPI = larger angular steps per count. 
            // We model error as proportional to (1/DPI).
            // A 400 DPI mouse has 4x the "step size" of 1600 DPI.
            const angularError = (1600 / dpi) * 0.005; // Arbitrary scaler for impact

            // Model: Pixel Density Error (Aliasing)
            // Lower Resolution = larger pixels. Harder to place cursor EXACTLY on edge.
            // We model error as proportional to (1/Height).
            const pixelDensityError = (1080 / res.h) * 0.003;

            // Combined Hardware Penalty (subtract from skill)
            // However, very high DPI handles micro-jitters worse without smoothing.
            // Let's model a slight "jitter penalty" for 3200+ DPI.
            const jitterPenalty = dpi >= 3200 ? 0.01 : 0;

            const totalHardwarePenalty = angularError + pixelDensityError + jitterPenalty;

            // Final Performance = Skill - Penalty + Variance
            // Clamp between 0.05 and 1.0
            let performance = player.baseSkill - totalHardwarePenalty + (Math.random() * 0.05 - 0.025);
            performance = Math.max(0.05, Math.min(0.99, performance));

            // Convert Performance to Score per Scenario
            let score = 0;
            if (scenario === 'static-grid') {
                // TPS: Pro ~ 7, Avg ~ 4
                score = +(performance * 7.5).toFixed(2);
            } else if (scenario === 'smooth-track') {
                // Percentage
                score = +(performance * 100).toFixed(1);
            } else if (scenario === 'adaptive-track') {
                // Score can be high
                score = Math.floor(performance * performance * 25000);
            }

            batch.push({
                scenario_id: scenario,
                nickname: player.nickname,
                score: score,
                mouse_dpi: dpi,
                viewport_w: res.w,
                viewport_h: res.h,
                device_pixel_ratio: 1,
                view_scale: 1, // Simplifying view scale to 1 for this analysis
                created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Past week
                replay_data: { simulated: true, hardware_penalty: totalHardwarePenalty.toFixed(4) }
            });
        }

        const { error } = await supabase.from('scores').insert(batch);
        if (error) {
            console.error("Error:", error.message);
        } else {
            processed += batch.length;
            process.stdout.write(`\rSimulated ${processed}/${TOTAL_ENTRIES} matches...`);
        }
    }
    console.log("\n✅ Database populated with realistic analytics data.");
}

generateData();
