        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        let globalVolume = 1.0;
        masterGain.gain.setValueAtTime(globalVolume, audioCtx.currentTime);

        let synthBgmInterval = null;
        let lmsSynthInterval = null;
        let lastBgmBeat = 0;

        function setAudioVolume(volumeFraction) {
            globalVolume = volumeFraction;
            masterGain.gain.setValueAtTime(globalVolume, audioCtx.currentTime);
            [lmsTrackEl, soloWinTrackEl, endScreenTrackEl].forEach(t => { if (t) t.volume = globalVolume; });
        }

        function playSound(type) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);

                const simpleTone = (freqStart, freqEnd, wave, dur, vol) => {
                    osc.type = wave;
                    osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), audioCtx.currentTime + dur);
                    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
                    osc.start();
                    osc.stop(audioCtx.currentTime + dur);
                };

                if (type === 'jump') simpleTone(160, 450, 'sine', 0.15, 0.06);
                else if (type === 'boost') simpleTone(320, 950, 'triangle', 0.35, 0.1);
                else if (type === 'hurt') simpleTone(120, 40, 'sawtooth', 0.25, 0.12);
                else if (type === 'laser') simpleTone(750, 280, 'sawtooth', 0.25, 0.08);
                else if (type === 'tracker') simpleTone(580, 780, 'sine', 0.2, 0.05);
                else if (type === 'drone') simpleTone(180, 130, 'square', 0.4, 0.03);
                else if (type === 'down') simpleTone(160, 50, 'sawtooth', 0.5, 0.15);
                else if (type === 'stun') simpleTone(900, 60, 'square', 0.3, 0.09);
                else if (type === 'itemPickup') simpleTone(400, 900, 'triangle', 0.18, 0.07);
                else if (type === 'itemSpawn') simpleTone(200, 700, 'sine', 0.4, 0.05);
                else if (type === 'cheer_golfBall') { simpleTone(300, 900, 'sine', 0.35, 0.09); }
                else if (type === 'cheer_bubble') { simpleTone(500, 1300, 'triangle', 0.3, 0.08); }
                else if (type === 'cheer_coiny') { simpleTone(400, 1500, 'square', 0.25, 0.07); }
                else if (type === 'cheer_mecha') { simpleTone(150, 90, 'sawtooth', 0.4, 0.1); }
            } catch (e) {}
        }

        function startBgmSystem() {
            if (synthBgmInterval) clearInterval(synthBgmInterval);
            const killerCharId = currentRole === 'survivor' ? killer.characterId : player.characterId;
            startChaseTheme(killerCharId);
            synthBgmInterval = setInterval(() => {
                if (!gameActive || isLmsMode) { setChaseThemeIntensity(0); return; }
                let dist = 1200;
                if (currentRole === 'survivor') dist = Math.hypot(player.x - killer.x, player.y - killer.y);
                else dist = 450;

                const limitRadius = 700;
                let factor = 0;
                if (dist < limitRadius) factor = 1 - (dist / limitRadius);
                const usingRealTrack = setChaseThemeIntensity(factor);

                if (usingRealTrack) return; // real Mecha-*ChTh.mp3 track handles the chase feel

                if (dist < limitRadius) {
                    const bpm = 65 + factor * 115;
                    const volume = 0.05 + factor * 0.13;
                    const now = audioCtx.currentTime;
                    if (now - lastBgmBeat > (60 / bpm)) {
                        triggerHeartbeat(factor, volume);
                        lastBgmBeat = now;
                    }
                } else {
                    const now = audioCtx.currentTime;
                    if (now - lastBgmBeat > 1.3) {
                        triggerHeartbeat(0, 0.025);
                        lastBgmBeat = now;
                    }
                }
            }, 40);
        }

        function triggerHeartbeat(intensity, volume) {
            try {
                const now = audioCtx.currentTime;
                const osc1 = audioCtx.createOscillator();
                const gain1 = audioCtx.createGain();
                osc1.connect(gain1); gain1.connect(masterGain);
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(45 + intensity * 20, now);
                osc1.frequency.exponentialRampToValueAtTime(10, now + 0.12);
                gain1.gain.setValueAtTime(volume, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc1.start(); osc1.stop(now + 0.12);

                setTimeout(() => {
                    if (!gameActive || isLmsMode) return;
                    try {
                        const osc2 = audioCtx.createOscillator();
                        const gain2 = audioCtx.createGain();
                        osc2.connect(gain2); gain2.connect(masterGain);
                        osc2.type = 'sine';
                        osc2.frequency.setValueAtTime(40 + intensity * 15, audioCtx.currentTime);
                        osc2.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.12);
                        gain2.gain.setValueAtTime(volume * 0.8, audioCtx.currentTime);
                        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
                        osc2.start(); osc2.stop(audioCtx.currentTime + 0.12);
                    } catch(e){}
                }, 180);
            } catch(e){}
        }

        // ---- Real audio track system (naming convention driven) ----
        const CHAR_AUDIO_NAME = { golfBall: 'Golfball', bubble: 'Bubble', coiny: 'Coiny', mechaGolfBall: 'Golfball' };
        const LMS_NEGATIVE_OFFSET = 100; // matches the negative countdown limit used post-timer (main.js)
        const DEFAULT_LMS_SECONDS = 150;

        let lmsTrackEl = null;
        let chaseTrackEl = null;
        let soloWinTrackEl = null;
        let endScreenTrackEl = null;
        let lmsTimerSeconds = DEFAULT_LMS_SECONDS;

        function loadAudioWithFallback(candidates, onResolved) {
            const list = candidates.slice();
            const el = new Audio();
            el.preload = 'auto';
            el._resolved = false;
            const tryNext = () => {
                if (list.length === 0) { el._resolved = true; el._failed = true; if (onResolved) onResolved(null); return; }
                el.src = list.shift();
                el.load();
            };
            const onError = () => tryNext();
            el.addEventListener('error', onError);
            el.addEventListener('loadedmetadata', function onMeta() {
                el.removeEventListener('loadedmetadata', onMeta);
                el.removeEventListener('error', onError);
                el._resolved = true; el._failed = false;
                if (onResolved) onResolved(el);
            });
            tryNext();
            return el;
        }

        function getLmsTimerSeconds() { return lmsTimerSeconds; }

        function stopAllRealTracks() {
            [lmsTrackEl, chaseTrackEl, soloWinTrackEl, endScreenTrackEl].forEach(t => {
                if (t) { try { t.pause(); t.currentTime = 0; } catch (e) {} }
            });
        }

        // Preload the LMS track (Golf Ball's) purely to compute the dynamic LMS timer duration,
        // independent of which character ends up in LMS mode.
        loadAudioWithFallback(['audio/GolfballLms.mp3'], (el) => {
            if (el && el.duration && isFinite(el.duration)) {
                lmsTimerSeconds = Math.max(30, Math.round(el.duration - LMS_NEGATIVE_OFFSET));
            }
        });

        function startLmsBgm(characterId) {
            if (synthBgmInterval) clearInterval(synthBgmInterval);
            if (lmsSynthInterval) clearInterval(lmsSynthInterval);
            stopAllRealTracks();

            const capName = CHAR_AUDIO_NAME[characterId] || 'Golfball';
            const candidates = [`audio/${capName}Lms.mp3`];
            if (capName !== 'Golfball') candidates.push('audio/GolfballLms.mp3');

            lmsTrackEl = loadAudioWithFallback(candidates, (el) => {
                if (!el) return; // no file worked at all -> silence, per design (no synth fallback for LMS)
                lmsTrackEl = el;
                el.loop = true;
                el.volume = globalVolume;
                el.play().catch(() => {});
            });
            return;
        }

        function startChaseTheme(characterId) {
            const capName = CHAR_AUDIO_NAME[characterId] || 'Golfball';
            chaseTrackEl = loadAudioWithFallback([`audio/Mecha-${capName}ChTh.mp3`], (el) => {
                if (el) { chaseTrackEl = el; el.loop = true; el.volume = 0; }
            });
        }

        function setChaseThemeIntensity(intensity) {
            // intensity: 0 (far) .. 1 (very close). Returns true only once the real track has
            // confirmed it loaded successfully; while unresolved or on failure, callers should
            // keep using the existing synth heartbeat as the fallback.
            if (!chaseTrackEl || !chaseTrackEl._resolved || chaseTrackEl._failed) return false;
            chaseTrackEl.volume = Math.max(0, Math.min(1, intensity)) * globalVolume;
            if (intensity > 0.02) {
                if (chaseTrackEl.paused) chaseTrackEl.play().catch(() => {});
            } else if (!chaseTrackEl.paused) {
                chaseTrackEl.pause();
            }
            return true;
        }

        function playSoloWinTrack() {
            soloWinTrackEl = loadAudioWithFallback(['audio/SoloWin.mp3'], (el) => {
                if (el) { el.volume = globalVolume; el.play().catch(() => {}); }
            });
        }

        function playEndScreenTrack(capSeconds) {
            endScreenTrackEl = loadAudioWithFallback(['audio/EndScreen.mp3'], (el) => {
                if (!el) return;
                el.volume = globalVolume;
                el.play().catch(() => {});
                if (capSeconds) {
                    const stopAt = () => { if (el.currentTime >= capSeconds) { el.pause(); el.removeEventListener('timeupdate', stopAt); } };
                    el.addEventListener('timeupdate', stopAt);
                }
            });
        }

        function stopLmsBgmReal() {
            if (lmsTrackEl) { try { lmsTrackEl.pause(); } catch (e) {} }
            if (chaseTrackEl) { try { chaseTrackEl.pause(); } catch (e) {} }
        }

