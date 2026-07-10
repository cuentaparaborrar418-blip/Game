        function triggerSystemAlert(message) {
            const container = document.getElementById('system-alert');
            const text = document.getElementById('system-alert-text');
            text.innerText = `[SISTEMA G.B. ACTIVO] > ${message}`;
            container.classList.remove('opacity-0', '-translate-y-2');
            container.classList.add('opacity-100', 'translate-y-0');
            setTimeout(() => {
                container.classList.add('opacity-0', '-translate-y-2');
                container.classList.remove('opacity-100', 'translate-y-0');
            }, 3000);
        }

        function buildAbilityButtons() {
            const panel = document.getElementById('abilities-panel');
            panel.innerHTML = '';
            const radius = 95;
            const numSkills = player.abilities.length;
            player.abilities.forEach((skill, idx) => {
                const angle = -Math.PI / 2 - ((idx + 0.5) * (Math.PI / 2) / numSkills);
                const xPos = Math.cos(angle) * radius;
                const yPos = Math.sin(angle) * radius;
                const wrapper = document.createElement('div');
                wrapper.className = "absolute flex flex-col items-center pointer-events-auto z-10";
                wrapper.style.right = `${12 + -xPos}px`;
                wrapper.style.bottom = `${12 + -yPos}px`;
                wrapper.innerHTML = `
                    <button id="btn-skill-${skill.id}" class="w-16 h-16 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center relative text-2xl shadow-2xl transition-all duration-150 active:scale-90">
                        <span id="icon-${skill.id}">${skill.icon}</span>
                        <span id="cd-text-${skill.id}" class="absolute inset-0 flex items-center justify-center bg-slate-950/90 rounded-full font-mono text-xs text-white opacity-0"></span>
                    </button>
                    <span class="text-[8px] font-bold text-slate-300 bg-slate-950/85 px-1 rounded font-mono text-center max-w-[65px] truncate mt-0.5">${skill.name}</span>
                `;
                const btn = wrapper.querySelector('button');
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerSkill(idx); }, { passive: false });
                btn.addEventListener('click', (e) => { e.preventDefault(); triggerSkill(idx); });
                panel.appendChild(wrapper);
            });
        }

        function updateCooldownsUI() {
            (player.abilities || []).forEach(skill => {
                const btn = document.getElementById(`btn-skill-${skill.id}`);
                const cdText = document.getElementById(`cd-text-${skill.id}`);
                const iconBox = document.getElementById(`icon-${skill.id}`);
                if (!btn) return;
                if (skill.cd > 0) {
                    btn.classList.add('opacity-50'); if (iconBox) iconBox.classList.add('text-slate-600');
                    if (cdText) { cdText.classList.remove('opacity-0'); cdText.innerText = `${Math.ceil(skill.cd)}s`; }
                } else {
                    btn.classList.remove('opacity-50'); if (iconBox) iconBox.classList.remove('text-slate-600');
                    if (cdText) cdText.classList.add('opacity-0');
                }
            });

            const healthPercent = Math.max(0, player.health);
            const hpBar = document.getElementById('player-hp-bar');
            if (currentRole === 'killer') {
                document.getElementById('hp-label').innerText = "POTENCIA KILLER:";
                hpBar.style.width = `${Math.max(0, player.health)}%`;
                document.getElementById('player-hp-text').innerText = `${Math.ceil(player.health)}%`;
            } else {
                document.getElementById('hp-label').innerText = "BATERÍA:";
                if (player.lmsBuff) { hpBar.style.width = `${Math.min(100, (player.health / 200) * 100)}%`; document.getElementById('player-hp-text').innerText = `${Math.ceil(player.health)} / 200 (LMS)`; }
                else { hpBar.style.width = `${Math.min(100, healthPercent)}%`; document.getElementById('player-hp-text').innerText = `${Math.ceil(player.health)} / 100`; }
            }
        }

        function updateSurvivorsHudList() {
            const listContainer = document.getElementById('survivors-hud-list');
            if (!listContainer) return;
            listContainer.innerHTML = '';
            const allSuvs = currentRole === 'survivor' ? survivors.concat([player]) : survivors;
            const activeKiller = currentRole === 'survivor' ? killer : player;

            allSuvs.forEach(s => {
                const inTerrorRadius = Math.hypot(s.x - activeKiller.x, s.y - activeKiller.y) < 700;
                const item = document.createElement('div');
                item.className = "flex items-center justify-end gap-1.5 md:gap-2 pointer-events-none";
                let circleClass = "w-8 h-8 rounded-full bg-white text-slate-950 flex flex-col items-center justify-center font-black text-[9px] border border-slate-700 transition-all duration-100 shadow-md";
                if (s.state === 'DOWN') circleClass = "w-8 h-8 rounded-full border-2 border-amber-500 bg-amber-100 animate-pulse text-amber-900 flex flex-col items-center justify-center font-black text-[9px]";
                else if (s.state === 'DEAD') circleClass = "w-8 h-8 rounded-full border border-red-800 bg-red-950/90 text-red-400 flex flex-col items-center justify-center font-black text-[9px]";
                else if (s.state === 'ESCAPED') circleClass = "w-8 h-8 rounded-full border-2 border-emerald-500 bg-emerald-950/90 text-emerald-400 flex flex-col items-center justify-center font-black text-[8px]";
                else if (inTerrorRadius) circleClass = "w-8 h-8 rounded-full bg-red-600 text-white animate-bounce border-2 border-red-400 flex flex-col items-center justify-center font-black text-[9px]";

                let circleContent = `<span>${Math.ceil(s.health)}</span><span class="text-[6px] font-normal leading-none">${s.lives}v</span>`;
                if (s.state === 'DEAD') circleContent = `<span>X</span>`;
                else if (s.state === 'ESCAPED') circleContent = `<span>✓</span>`;

                item.innerHTML = `
                    <span class="text-[8px] md:text-[9px] font-mono text-slate-300 bg-slate-900/60 px-1 rounded">${s.name}</span>
                    <div class="${circleClass}">
                        ${circleContent}
                    </div>
                `;
                listContainer.appendChild(item);
            });
        }

        function endGame(won, message) {
            gameActive = false;
            if (synthBgmInterval) clearInterval(synthBgmInterval);
            if (lmsSynthInterval) clearInterval(lmsSynthInterval);
            stopLmsBgmReal();

            document.getElementById('game-hud-header').classList.add('hidden');
            document.getElementById('survivors-hud-list').classList.add('hidden');
            document.getElementById('mobile-controls-container').classList.add('hidden');
            document.getElementById('spectator-banner').classList.add('hidden');

            const survivorWon = won && currentRole === 'survivor';
            const killerWon = won && currentRole === 'killer';
            if (survivorWon) startCelebration(player, false);

            if (killerWon) {
                playEndScreenTrack(null); // full host-win audio
            } else if (survivorWon) {
                playSoloWinTrack();
            }

            const screen = document.getElementById('results-screen');
            const title = document.getElementById('results-title');
            const msg = document.getElementById('results-message');

            if (won) {
                title.innerText = "¡SIMULACIÓN RESUELTA!";
                title.className = "text-4xl font-black text-emerald-500 mb-2 tracking-wide";
                msg.innerHTML = `${message}<br><br><span class="text-xs text-slate-500 font-mono">Los datos de la simulación han sido guardados.</span>`;
            } else {
                title.innerText = "¡MÓDULO INTERRUMPIDO!";
                title.className = "text-4xl font-black text-red-500 mb-2 tracking-wide";
                msg.innerHTML = `${message}<br><br><span class="text-xs text-slate-500 font-mono">Los sistemas fallaron. Inténtalo de nuevo.</span>`;
            }
            renderResultsArt(killerWon, survivorWon);
            screen.classList.remove('scale-0', 'opacity-0'); screen.classList.add('scale-100', 'opacity-100');
        }

        function renderResultsArt(killerWon, survivorWon) {
            const canvasEl = document.getElementById('results-canvas');
            if (!canvasEl) return;
            const rctx = canvasEl.getContext('2d');
            const W = canvasEl.width, H = canvasEl.height;
            rctx.clearRect(0, 0, W, H);

            const poseW = W, poseH = Math.floor(H * 0.42);
            if (killerWon) {
                const g = rctx.createLinearGradient(0, 0, 0, poseH);
                g.addColorStop(0, '#1e0a0a'); g.addColorStop(1, '#3f0d0d');
                rctx.fillStyle = g; rctx.fillRect(0, 0, poseW, poseH);
                const killerChar = KILLERS[chosenKillerId] || KILLERS.mechaGolfBall;
                rctx.save(); rctx.translate(poseW / 2, poseH / 2 + 10);
                if (killerChar.drawPortrait) killerChar.drawPortrait(rctx, poseH * 1.4);
                rctx.restore();
                rctx.fillStyle = '#fca5a5'; rctx.font = 'bold 14px monospace'; rctx.textAlign = 'center';
                rctx.fillText('¡EL KILLER GANA LA SIMULACIÓN!', poseW / 2, poseH - 14);
            } else {
                const g = rctx.createLinearGradient(0, 0, 0, poseH);
                g.addColorStop(0, '#022c1e'); g.addColorStop(1, '#065f34');
                rctx.fillStyle = g; rctx.fillRect(0, 0, poseW, poseH);
                const survChar = CHARACTERS[chosenSurvivorId] || CHARACTERS.golfBall;
                rctx.save(); rctx.translate(poseW / 2, poseH / 2 + 10);
                if (survChar.drawPortrait) survChar.drawPortrait(rctx, poseH * 1.1);
                rctx.restore();
                rctx.fillStyle = '#86efac'; rctx.font = 'bold 14px monospace'; rctx.textAlign = 'center';
                rctx.fillText('ESCAPASTE CON VIDA', poseW / 2, poseH - 14);
            }

            const wallY = poseH + 10, wallH = H - poseH - 10;
            const voidGrad = rctx.createRadialGradient(W / 2, wallY + wallH / 2, 10, W / 2, wallY + wallH / 2, W * 0.7);
            voidGrad.addColorStop(0, '#0b0f1a'); voidGrad.addColorStop(1, '#000000');
            rctx.fillStyle = voidGrad; rctx.fillRect(0, wallY, W, wallH);

            const allSuvs = currentRole === 'survivor' ? survivors.concat([player]) : survivors;
            const tvCount = Math.min(8, Math.max(allSuvs.length, 1));
            const tvW = 46, tvH = 40, gap = (W - tvCount * tvW) / (tvCount + 1);
            for (let i = 0; i < tvCount; i++) {
                const s = allSuvs[i];
                const tx = gap + i * (tvW + gap), ty = wallY + wallH / 2 - tvH / 2;

                rctx.save();
                rctx.shadowColor = 'rgba(0,0,0,0.85)'; rctx.shadowBlur = 14; rctx.shadowOffsetY = 8;
                rctx.fillStyle = '#1e293b'; rctx.strokeStyle = '#475569'; rctx.lineWidth = 2;
                rctx.beginPath(); rctx.roundRect(tx, ty, tvW, tvH, 4); rctx.fill(); rctx.stroke();
                rctx.restore();

                rctx.fillStyle = '#000814';
                rctx.fillRect(tx + 4, ty + 4, tvW - 8, tvH - 12);

                if (s) {
                    const character = CHARACTERS[s.characterId] || CHARACTERS.golfBall;
                    rctx.save();
                    rctx.beginPath(); rctx.rect(tx + 4, ty + 4, tvW - 8, tvH - 12); rctx.clip();
                    rctx.translate(tx + tvW / 2 - (tvW - 8) / 2, ty + 4 - 4);
                    if (character.drawPortrait) character.drawPortrait(rctx, tvW - 8);
                    rctx.restore();

                    rctx.fillStyle = '#94a3b8'; rctx.font = '7px monospace'; rctx.textAlign = 'center';
                    rctx.fillText(s.name.slice(0, 10), tx + tvW / 2, ty + tvH + 8);

                    if (s.state === 'ESCAPED') {
                        rctx.fillStyle = '#22c55e'; rctx.font = 'bold 7px monospace';
                        rctx.fillText('ESCAPED', tx + tvW / 2, ty - 4);
                    } else if (s.state === 'DEAD') {
                        rctx.strokeStyle = '#ef4444'; rctx.lineWidth = 3;
                        rctx.beginPath(); rctx.moveTo(tx + 6, ty + 6); rctx.lineTo(tx + tvW - 6, ty + tvH - 10);
                        rctx.moveTo(tx + tvW - 6, ty + 6); rctx.lineTo(tx + 6, ty + tvH - 10); rctx.stroke();
                    }
                }
            }
        }

        function buildCharacterSelectGrid(role) {
            const grid = document.getElementById('character-select-grid');
            grid.innerHTML = '';
            const registry = role === 'survivor' ? CHARACTERS : KILLERS;
            document.getElementById('character-select-title').innerText = role === 'survivor' ? 'SELECCIONA TU SURVIVOR' : 'SELECCIONA TU KILLER';

            Object.values(registry).forEach(character => {
                const btn = document.createElement('button');
                btn.className = "bg-slate-950/85 border border-slate-700 hover:border-cyan-400 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all hover:scale-105";
                const portraitCanvas = document.createElement('canvas');
                portraitCanvas.width = 72; portraitCanvas.height = 72;
                portraitCanvas.className = 'char-portrait-canvas';
                btn.appendChild(portraitCanvas);
                const label = document.createElement('span');
                label.className = 'text-xs font-bold text-slate-200 font-mono';
                label.innerText = character.name;
                btn.appendChild(label);
                grid.appendChild(btn);

                const pctx = portraitCanvas.getContext('2d');
                character.drawPortrait(pctx, 72);

                btn.addEventListener('click', () => {
                    playSound('boost');
                    initGame(role, character.id);
                });
            });
        }

        function buildBioGrid() {
            const grid = document.getElementById('bio-grid');
            grid.innerHTML = '';
            Object.values(CHARACTERS).forEach(c => {
                const div = document.createElement('div');
                div.className = "bg-slate-950/85 border border-emerald-500/20 p-4 rounded-2xl space-y-2";
                div.innerHTML = `
                    <h3 class="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><span>🔘</span> ${c.name} (Survivor)</h3>
                    <div class="text-[9px] text-slate-500 font-mono space-y-1">
                        <p class="text-slate-300 font-bold">HABILIDADES & PASIVA:</p>
                        ${c.abilities.map(a => `<p><b class="text-emerald-400">${a.icon} ${a.name}</b></p>`).join('')}
                        <p><b class="text-cyan-400">🛡️ ${c.passive.name}:</b> ${c.passive.desc}</p>
                        <p><b class="text-amber-400">🎉 Celebración:</b> ${c.celebration.name}</p>
                    </div>`;
                grid.appendChild(div);
            });
            Object.values(KILLERS).forEach(k => {
                const div = document.createElement('div');
                div.className = "bg-slate-950/85 border border-red-500/20 p-4 rounded-2xl space-y-2";
                div.innerHTML = `
                    <h3 class="text-sm font-bold text-red-400 flex items-center gap-1.5"><span>🤖</span> ${k.name} (Killer)</h3>
                    <div class="text-[9px] text-slate-500 font-mono space-y-1">
                        <p class="text-slate-300 font-bold">HABILIDADES:</p>
                        ${k.abilities.map(a => `<p><b class="text-red-400">${a.icon} ${a.name}</b></p>`).join('')}
                        <p><b class="text-amber-400">🎉 Celebración:</b> ${k.celebration.name}</p>
                    </div>`;
                grid.appendChild(div);
            });
            const globalDiv = document.createElement('div');
            globalDiv.className = "bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2 text-[10px] font-mono md:col-span-2";
            globalDiv.innerHTML = `
                <h4 class="text-amber-400 font-bold uppercase text-[11px] tracking-wide">Sistema de Vidas, Objetos y LMS</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                    <div class="space-y-1">
                        <p class="text-slate-200 font-bold">Vidas:</p>
                        <p>• Cada survivor tiene ${SURVIVOR_LIVES} vidas. Al perder la última, muere permanentemente.</p>
                        <p class="text-slate-200 font-bold">Objetos:</p>
                        <p>• 🩹 Botiquín: 8s de uso (te ralentiza mucho), cura vida completa. Se cancela si te golpean.</p>
                        <p>• 🗡️ Espada: 1s de preparación, luego golpea al Killer y lo aturde 2s. Ambos son de un solo uso y reaparecen cada 1:15.</p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-pink-400 font-bold">Último Sobreviviente en Pie (LMS):</p>
                        <p>• El último survivor obtiene 200 HP y todos los objetos del mapa se reabastecen.</p>
                        <p>• Habilidad de utilidad más rápida y Tracker sin penalización.</p>
                    </div>
                </div>`;
            grid.appendChild(globalDiv);
        }

        function buildHatSelectionGrid() {
            const grid = document.getElementById('hat-selection-grid');
            grid.innerHTML = '';
            HAT_TYPES.forEach(hat => {
                const isSelected = (hat === chosenPlayerHat);
                const btn = document.createElement('button');
                btn.className = `p-2.5 rounded-xl border text-xs font-mono font-bold flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 scale-105' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`;
                btn.innerHTML = `<span class="text-xl mb-1">${getHatEmoji(hat)}</span><span class="text-[9px] truncate max-w-[80px]">${HAT_NAMES[hat]}</span>`;
                btn.addEventListener('click', () => { chosenPlayerHat = hat; playSound('boost'); buildHatSelectionGrid(); });
                grid.appendChild(btn);
            });
        }

        function getHatEmoji(hat) {
            switch (hat) {
                case 'crown': return '👑'; case 'cowboy': return '🤠'; case 'tophat': return '🎩'; case 'cap': return '🧢';
                case 'beret': return '🧣'; case 'chef': return '🍳'; case 'horns': return '😈'; case 'party': return '🎉';
                default: return '🎩';
            }
        }

        const btnAlignLeft = document.getElementById('ctrl-align-left');
        const btnAlignRight = document.getElementById('ctrl-align-right');
        const controlsContainer = document.getElementById('mobile-controls-container');

        btnAlignLeft.addEventListener('click', () => {
            controlsInverted = false; controlsContainer.classList.remove('flex-row-reverse');
            btnAlignLeft.className = "bg-slate-850 hover:bg-slate-800 border-2 border-cyan-500 text-cyan-300 font-bold py-2 rounded-xl text-xs font-mono transition-all";
            btnAlignRight.className = "bg-slate-800 hover:bg-slate-750 border-2 border-slate-800 text-slate-400 font-bold py-2 rounded-xl text-xs font-mono transition-all";
            playSound('jump');
        });
        btnAlignRight.addEventListener('click', () => {
            controlsInverted = true; controlsContainer.classList.add('flex-row-reverse');
            btnAlignRight.className = "bg-slate-850 hover:bg-slate-800 border-2 border-cyan-500 text-cyan-300 font-bold py-2 rounded-xl text-xs font-mono transition-all";
            btnAlignLeft.className = "bg-slate-800 hover:bg-slate-750 border-2 border-slate-800 text-slate-400 font-bold py-2 rounded-xl text-xs font-mono transition-all";
            playSound('jump');
        });

        document.getElementById('btn-open-settings').addEventListener('click', () => { buildHatSelectionGrid(); document.getElementById('settings-modal').classList.remove('hidden'); playSound('boost'); });
        document.getElementById('btn-close-settings').addEventListener('click', () => { document.getElementById('settings-modal').classList.add('hidden'); playSound('laser'); });
        document.getElementById('btn-open-bio').addEventListener('click', () => { buildBioGrid(); document.getElementById('bio-modal').classList.remove('hidden'); playSound('boost'); });
        document.getElementById('btn-close-bio').addEventListener('click', () => { document.getElementById('bio-modal').classList.add('hidden'); playSound('laser'); });

        const sliderVolume = document.getElementById('slider-volume');
        const volumeValDisplay = document.getElementById('volume-val-display');
        sliderVolume.addEventListener('input', (e) => { const val = e.target.value; volumeValDisplay.innerText = `${val}%`; setAudioVolume(val / 100); });

        const toggleEmotes = document.getElementById('toggle-emotes');
        toggleEmotes.addEventListener('change', (e) => {
            emotesEnabled = e.target.checked;
            if (!emotesEnabled) { cancelCelebration(player); cancelCelebration(killer); survivors.forEach(s => cancelCelebration(s)); }
            playSound('jump');
        });

        document.getElementById('menu-survivor').addEventListener('click', () => { buildCharacterSelectGrid('survivor'); document.getElementById('character-select-modal').classList.remove('hidden'); playSound('boost'); });
        document.getElementById('menu-killer').addEventListener('click', () => { buildCharacterSelectGrid('killer'); document.getElementById('character-select-modal').classList.remove('hidden'); playSound('boost'); });
        document.getElementById('btn-close-character-select').addEventListener('click', () => { document.getElementById('character-select-modal').classList.add('hidden'); playSound('laser'); });

        document.getElementById('btn-play-again').addEventListener('click', () => {
            const resultsScreen = document.getElementById('results-screen');
            resultsScreen.classList.remove('scale-100', 'opacity-100');
            resultsScreen.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
            document.getElementById('game-hud-header').classList.add('hidden');
            document.getElementById('survivors-hud-list').classList.add('hidden');
            document.getElementById('mobile-controls-container').classList.add('hidden');
            document.getElementById('lobby-screen').classList.remove('hidden');
        });

