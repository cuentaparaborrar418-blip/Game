        const keys = {};
        window.addEventListener('keydown', e => {
            keys[e.key.toLowerCase()] = true;
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) e.preventDefault();
            if (e.key === '1') triggerSkill(0);
            if (e.key === '2') triggerSkill(1);
            if (e.key === '3') triggerSkill(2);
            if (e.key === '4') useHeldItem(player);
            if (e.key.toLowerCase() === 'e') startCelebration(player, true);
        });
        window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

        let gameActive = false;
        let currentRole = 'survivor';
        let chosenSurvivorId = 'golfBall';
        let chosenKillerId = 'mechaGolfBall';
        let timeRemaining = 315;
        let totalSurvivorsCount = 8;
        let isLmsMode = false;
        let postTimerSeconds = 0;
        let ringEscapesSpawned = false;
        let escapeRings = [];
        let isSpectating = false;
        let spectatorTarget = null;

        let internalFrameCounter = 0;
        let lmsCinematicTimer = 0;

        let player = {};
        let killer = {};
        let survivors = [];
        let speedPads = [];
        let activeDrones = [];
        let projectiles = [];
        let itemSpawns = [];
        let groundItems = [];

        const isKiller = (entity) => {
            if (!entity) return false;
            if (currentRole === 'survivor' && entity === killer) return true;
            if (currentRole === 'killer' && entity === player) return true;
            return false;
        };

        const getKillerCoords = () => currentRole === 'survivor' ? { x: killer.x, y: killer.y } : { x: player.x, y: player.y };
        const getKillerEntity = () => currentRole === 'survivor' ? killer : player;

        function triggerLmsCinematic() {
            lmsCinematicTimer = 150;
            cameraShake = 25;
            playSound('down');
            const overlay = document.getElementById('lms-cinematic-overlay');
            overlay.classList.remove('opacity-0', 'scale-95');
            overlay.classList.add('opacity-100', 'scale-100');
            setTimeout(() => {
                overlay.classList.add('opacity-0', 'scale-95');
                overlay.classList.remove('opacity-100', 'scale-100');
            }, 2500);
        }

        function initGame(role, characterId) {
            currentRole = role;
            if (role === 'survivor') chosenSurvivorId = characterId; else chosenKillerId = characterId;
            gameActive = true;
            timeRemaining = 315;
            isLmsMode = false;
            postTimerSeconds = 0;
            internalFrameCounter = 0;
            lmsCinematicTimer = 0;
            cameraShake = 0;
            ringEscapesSpawned = false;
            escapeRings = [];
            isSpectating = false;
            spectatorTarget = null;
            document.getElementById('spectator-banner').classList.add('hidden');
            projectiles = [];
            speedPads = [];
            activeDrones = [];
            particles = [];

            currentMap = MAPS[Math.floor(Math.random() * MAPS.length)];
            WORLD_WIDTH = currentMap.WORLD_WIDTH;
            WORLD_HEIGHT = currentMap.WORLD_HEIGHT;
            platforms = currentMap.platforms.map(p => ({ ...p }));
            initItemSpawns();

            document.getElementById('game-hud-header').classList.remove('hidden');
            document.getElementById('survivors-hud-list').classList.remove('hidden');
            document.getElementById('mobile-controls-container').classList.remove('hidden');

            platforms.forEach(p => { if (p.type === 'fragile') p.health = p.maxHealth; });

            const resultsScreen = document.getElementById('results-screen');
            resultsScreen.classList.remove('scale-100', 'opacity-100');
            resultsScreen.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
            document.getElementById('lms-badge').classList.add('hidden');

            const remainingHats = HAT_TYPES.filter(hat => hat !== chosenPlayerHat);
            totalSurvivorsCount = 8;

            if (role === 'survivor') {
                document.getElementById('role-badge').innerText = "SOBREVIVIENTE";
                document.getElementById('role-badge').className = "bg-emerald-950 text-emerald-400 tracking-wider uppercase font-bold px-2 py-0.5 rounded text-[10px]";

                player = createSurvivorEntity({
                    id: 0, name: CHARACTERS[characterId].name + " (Tú)", x: 150, y: WORLD_HEIGHT - 120,
                    characterId, isPlayer: true, archetype: 'player', hatStyle: chosenPlayerHat
                });

                const killerId = Object.keys(KILLERS)[Math.floor(Math.random() * Object.keys(KILLERS).length)];
                killer = createKillerEntity({ id: 'killer', name: KILLERS[killerId].name + " (Bot)", x: WORLD_WIDTH - 250, y: WORLD_HEIGHT - 150, characterId: killerId, isBot: true });

                survivors = [];
                const usedChars = new Set([characterId]);
                for (let i = 0; i < 7; i++) {
                    const cId = pickRandomCharacterId(usedChars);
                    const arch = pickRandomArchetype();
                    survivors.push(createSurvivorEntity({
                        id: i + 1, name: CHARACTERS[cId].name + ` #${i + 1}`, x: 350 + i * 380, y: WORLD_HEIGHT - 120,
                        characterId: cId, isBot: true, archetype: arch, hatStyle: remainingHats[i % remainingHats.length]
                    }));
                }
            } else {
                document.getElementById('role-badge').innerText = "ASESINO";
                document.getElementById('role-badge').className = "bg-red-950 text-red-400 tracking-wider uppercase font-bold px-2 py-0.5 rounded text-[10px]";

                player = createKillerEntity({ id: 'player-killer', name: KILLERS[characterId].name + " (Tú)", x: WORLD_WIDTH - 250, y: WORLD_HEIGHT - 150, characterId, isPlayer: true });

                survivors = [];
                const usedCharsKiller = new Set();
                for (let i = 0; i < 8; i++) {
                    const cId = pickRandomCharacterId(usedCharsKiller);
                    const arch = pickRandomArchetype();
                    survivors.push(createSurvivorEntity({
                        id: i, name: CHARACTERS[cId].name + ` #${i + 1}`, x: 200 + i * 360, y: WORLD_HEIGHT - 120,
                        characterId: cId, isBot: true, archetype: arch, hatStyle: remainingHats[i % remainingHats.length]
                    }));
                }
            }

            document.getElementById('lobby-screen').classList.add('hidden');
            document.getElementById('character-select-modal').classList.add('hidden');

            buildAbilityButtons();
           stopAllRealTracks();
                startBgmSystem();

            resizeCanvas();
            camera.x = player.x - canvas.width / 2;
            camera.y = player.y - canvas.height / 2;
            camera.x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, camera.x));
            camera.y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, camera.y));

            triggerSystemAlert(`¡PARTIDA INICIADA EN ${currentMap.name.toUpperCase()}!`);
        }

        function triggerMeleeStrike() {
            if (currentRole !== 'killer') return;
            if (player.meleeCd > 0 || player.stunTimer > 0) return;
            player.meleeCd = 1.0;
            playSound('laser');
            const dir = player.faceDir;
            particles.push({ x: player.x + dir * 35, y: player.y, vx: dir * 5, vy: -0.5, r: 16, color: 'rgba(239,68,68,0.85)', life: 12, style: 'melee_slash' });
            survivors.forEach(s => {
                if (s.state === 'NORMAL') {
                    const dist = Math.hypot(s.x - (player.x + dir * 35), s.y - player.y);
                    if (dist < s.r + 35) applyDamage(s, 10);
                }
            });
        }

        function applyDamage(target, damage) {
            if (!target || target.state !== 'NORMAL' || isKiller(target)) return;

            const character = CHARACTERS[target.characterId];
            let finalDamage = damage;
            if (target.lmsBuff) finalDamage = damage * 0.5;

            if (character && character.passive.id === 'luckyDodge' && Math.random() < 0.18) {
                triggerSystemAlert(`¡${target.name} ESQUIVÓ EL GOLPE! (Suerte de Moneda)`);
                return;
            }

            target.health -= finalDamage;
            playSound('hurt');
            cameraShake = Math.max(cameraShake, 15);

            for (let i = 0; i < 12; i++) {
                particles.push({ x: target.x, y: target.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 - 2, r: Math.random() * 4 + 1, color: '#ef4444', life: 25 });
            }

            target.speedBoostTimer = 240;
            cancelCelebration(target);
            if (target.usingItemTimer > 0) { target.usingItemTimer = 0; }
            if (target.swordWindup > 0) { target.swordWindup = 0; }

            if (target.health <= 0) {
                if (character && character.passive.id === 'popShield' && !target.usedPassiveThisLife) {
                    target.usedPassiveThisLife = true;
                    target.health = 1;
                    triggerSystemAlert(`¡${target.name} SOBREVIVIÓ AL GOLPE LETAL! (Piel Elástica)`);
                    return;
                }
                if (target.lives > 1) {
                    target.state = 'DOWN';
                    target.health = 0;
                    target.lives -= 1;
                    target.downTimer = 900;
                    target.campTimer = 0;
                    target.usedPassiveThisLife = false;
                    playSound('down');
                    triggerSystemAlert(`¡${target.name} ESTÁ DOWN! (${target.lives} vida(s) restante(s))`);
                } else {
                    target.state = 'DEAD';
                    triggerSystemAlert(`Sujeto ${target.name} ha sido completamente asimilado.`);
                    timeRemaining += 30;
                }
            }
        }

        function updateGame() {
            if (!gameActive) return;
            if (cameraShake > 0) { cameraShake *= 0.9; if (cameraShake < 0.2) cameraShake = 0; }
            if (lmsCinematicTimer > 0) lmsCinematicTimer--;

            const currentSpeedDilation = (lmsCinematicTimer > 0) ? 0.25 : 1.0;

            internalFrameCounter++;
            if (internalFrameCounter >= 60) {
                internalFrameCounter = 0;
                if (timeRemaining > 0) timeRemaining--;
                else postTimerSeconds++;
            }

            if (timeRemaining > 0) {
                const mins = Math.floor(timeRemaining / 60);
                const secs = timeRemaining % 60;
                document.getElementById('timer-display').innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                document.getElementById('timer-display').classList.remove('text-red-500');
            } else {
                if (!ringEscapesSpawned) {
                    ringEscapesSpawned = true;
                    triggerSystemAlert("¡HOLOGRADO DE EVACUACIÓN DESPLEGADO! Ve a las zonas verdes.");
                    escapeRings = [
                        { x: 300, y: WORLD_HEIGHT - 350, r: 40 },
                        { x: 2100, y: WORLD_HEIGHT - 650, r: 40 },
                        { x: 4700, y: WORLD_HEIGHT - 120, r: 40 }
                    ];
                }
                const negativeSecs = postTimerSeconds;
                document.getElementById('timer-display').innerText = `-${negativeSecs}s`;
                document.getElementById('timer-display').classList.add('text-red-500');
                if (negativeSecs >= 100 && !(currentRole === 'survivor' && player.state === 'ESCAPED')) endGame(false, "El colapso energético de la fábrica sepultó a los sobrevivientes.");
            }

            player.abilities.forEach(s => { if (s.cd > 0) { const reduction = player.lmsBuff ? 1.4 : 1; s.cd -= (1 / 60) * reduction; } });
            if (currentRole === 'killer') { if (player.meleeCd > 0) player.meleeCd -= (1 / 60); if (player.stunTimer > 0) player.stunTimer--; }

            const allSuvs = currentRole === 'survivor' ? survivors.concat([player]) : survivors;
            const countAlive = allSuvs.filter(s => s && s.state === 'NORMAL' || s && s.state === 'DOWN').length;
            document.getElementById('allies-counter').innerText = `${countAlive}/${totalSurvivorsCount}`;

            if (countAlive === 1 && !isLmsMode) {
                isLmsMode = true;
                document.getElementById('lms-badge').classList.remove('hidden');
                triggerLmsCinematic();
                forceRespawnAllItems();

                if (currentRole === 'survivor' && player.state === 'NORMAL') {
                    player.lmsBuff = true; player.health = 200;
                    document.getElementById('player-hp-bar').className = "bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-100";
                    triggerSystemAlert("¡ÚLTIMO SOBREVIENTE! Escudos de emergencia maximizados.");
                } else {
                    const lastBot = survivors.find(s => s && s.state === 'NORMAL');
                    if (lastBot) { lastBot.lmsBuff = true; lastBot.health = 200; triggerSystemAlert(`¡${lastBot.name} es el último en pie! Sobrecarga de energía.`); }
                }
                const lmsCharId = (currentRole === 'survivor') ? player.characterId : (survivors.find(s => s && s.state === 'NORMAL') || {}).characterId;
                timeRemaining = getLmsTimerSeconds();
                startLmsBgm(lmsCharId);
            }

            if (currentRole === 'survivor') {
                if (player.trackerSlowTimer > 0) { if (isLmsMode) player.trackerSlowTimer = 0; else player.trackerSlowTimer--; }
                if (player.buildingSpeedpadTimer > 0) {
                    if (isLmsMode) { player.buildingSpeedpadTimer -= 2; if (player.buildingSpeedpadTimer < 0) player.buildingSpeedpadTimer = 0; }
                    else player.buildingSpeedpadTimer--;
                    if (player.buildingSpeedpadTimer === 0) {
                        playSound('drone');
                        speedPads.push({ x: player.x, y: player.y + player.r - 5, w: 60, h: 10, life: 600, maxLife: 600, isLmsPad: isLmsMode });
                        triggerSystemAlert(isLmsMode ? "¡DISPOSITIVO EXPRESS (1 USO) CONSTRUIDO!" : "¡DISPOSITIVO CONSTRUIDO CON ÉXITO!");
                    }
                }
                if (player.state !== 'DOWN') player.vy += GRAVITY * currentSpeedDilation;
                if (player.jumpBoostCharge > 0) { player.jumpBoostCharge--; if (player.jumpBoostCharge === 0) { player.jumpBoostActive = true; triggerSystemAlert("TURBINA LISTA. Próximo salto duplicado."); } }
                tickItemUsage(player);
                checkItemPickups(player);
            } else {
                player.vy += GRAVITY * currentSpeedDilation;
                if (player.fireBlastCharge > 0) {
                    player.fireBlastCharge--;
                    if (player.fireBlastCharge === 0) {
                        let shootAngle = player.faceDir === 1 ? 0 : Math.PI;
                        const activeSuvs = survivors.filter(s => s && s.state === 'NORMAL');
                        let targetSuv = null, closestDist = 700;
                        activeSuvs.forEach(s => { const d = Math.hypot(s.x - player.x, s.y - player.y); if (d < closestDist) { closestDist = d; targetSuv = s; } });
                        if (targetSuv) { shootAngle = Math.atan2(targetSuv.y - player.y, targetSuv.x - player.x); triggerSystemAlert(`[AIMBOT] Objetivo fijado en ${targetSuv.name}. ¡Disparo térmico!`); }
                        else triggerSystemAlert("Disparo manual liberado (Sin objetivos en el radio de terror).");
                        playSound('laser');
                        projectiles.push({ x: player.x, y: player.y, vx: Math.cos(shootAngle) * 11.5, vy: Math.sin(shootAngle) * 11.5, r: 10, color: '#f97316', type: 'fire', danger: true });
                    }
                }
            }

            let moveX = 0;
            if (keys['a'] || keys['arrowleft']) moveX = -1;
            if (keys['d'] || keys['arrowright']) moveX = 1;
            if (joystickActive) moveX = joystickMove.x / maxJoystickDist;
            if (currentRole === 'survivor' && player.buildingSpeedpadTimer > 0) moveX = 0;
            if (player.usingItemTimer > 0 || player.swordWindup > 0) moveX = 0;

            if (moveX !== 0 || player.vy !== 0) cancelCelebration(player);
            if (moveX === 0 && (currentRole === 'killer' || player.onGround)) {
                player.idleTimer = (player.idleTimer || 0) + 1;
                if (player.idleTimer > 300 && !player.celebrating) startCelebration(player, true);
            } else player.idleTimer = 0;

            const activeKillerCoords = getKillerCoords();
            const downedSurvivors = (currentRole === 'survivor' ? survivors.concat([player]) : survivors).filter(s => s && s.state === 'DOWN');
            let leadSurvivor = currentRole === 'survivor' ? player : survivors[0];

            downedSurvivors.forEach(ds => {
                const distToKillerEnt = Math.hypot(ds.x - activeKillerCoords.x, ds.y - activeKillerCoords.y);
                if (distToKillerEnt < 160) {
                    ds.downTimer = Math.min(900, (ds.downTimer || 0) + 1.5);
                    const dsCharacter = CHARACTERS[ds.characterId];
                    let isRescuingGolfBall = false;
                    if (dsCharacter && dsCharacter.passive.id === 'empRescue') isRescuingGolfBall = true;
                    else {
                        const rescuer = (currentRole === 'survivor' ? survivors.concat([player]) : survivors).find(r => r && r.state === 'NORMAL' && CHARACTERS[r.characterId] && CHARACTERS[r.characterId].passive.id === 'empRescue' && Math.hypot(ds.x - r.x, ds.y - r.y) < 180);
                        if (rescuer) isRescuingGolfBall = true;
                    }
                    if (isRescuingGolfBall) {
                        ds.campTimer = (ds.campTimer || 0) + 1;
                        if (ds.campTimer > 150) {
                            const angle = Math.atan2(activeKillerCoords.y - ds.y, activeKillerCoords.x - ds.x);
                            const pushForce = 22;
                            const killerEnt = getKillerEntity();
                            killerEnt.vx = Math.cos(angle) * pushForce; killerEnt.vy = -10; killerEnt.stuckFrames = 0;
                            ds.state = 'NORMAL'; ds.health = 50; ds.speedBoostTimer = 240; ds.campTimer = 0;
                            triggerSystemAlert(`¡PASIVA EMP: ONDA DETONADORA ANTICAMPEO!`);
                            playSound('boost');
                            for (let i = 0; i < 35; i++) { const angleP = Math.random() * Math.PI * 2, speedP = Math.random() * 10 + 5; particles.push({ x: ds.x, y: ds.y, vx: Math.cos(angleP) * speedP, vy: Math.sin(angleP) * speedP, r: Math.random() * 5 + 3, color: '#22d3ee', life: 40 }); }
                        }
                    }
                } else ds.campTimer = Math.max(0, (ds.campTimer || 0) - 1.5);
            });

            if (currentRole === 'survivor') {
                if (player.state === 'NORMAL') {
                    let currentSpeed = player.speed;
                    if (player.speedBoostTimer > 0) { currentSpeed *= 2.3; player.speedBoostTimer--; }
                    if (player.trackerSlowTimer > 0) currentSpeed *= 0.35;
                    player.vx = moveX * currentSpeed;
                    if (moveX !== 0) player.faceDir = moveX > 0 ? 1 : -1;

                    if (player.rollTimer > 0) {
                        player.rollTimer--; player.vx = player.faceDir * player.speed * 2.5; player.isRolling = true;
                        if (internalFrameCounter % 2 === 0) particles.push({ x: player.x, y: player.y + player.r - 2, vx: -player.faceDir * 3, vy: -Math.random() * 2, r: Math.random() * 4 + 1.5, color: '#e2e8f0', life: 15 });
                    } else player.isRolling = false;

                    const wantsToJump = keys['w'] || keys['arrowup'] || keys[' '] || mobileJumpActive;
                    if (wantsToJump && player.onGround && !(player.buildingSpeedpadTimer > 0)) {
                        let jPower = player.jumpPower;
                        if (player.jumpBoostActive) {
                            jPower *= 1.8; player.jumpBoostActive = false; playSound('boost');
                            for (let i = 0; i < 10; i++) particles.push({ x: player.x, y: player.y + player.r, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 1, r: Math.random() * 3 + 1, color: '#38bdf8', life: 20 });
                        } else playSound('jump');
                        player.vy = -jPower; player.onGround = false; player.fallHeightStart = player.y;
                    }
                } else if (player.state === 'DOWN') {
                    player.vx = moveX * 0.5; player.vy = 2;
                    const distToKillerEnt = Math.hypot(player.x - activeKillerCoords.x, player.y - activeKillerCoords.y);
                    if (distToKillerEnt < 160) player.downTimer = Math.min(900, player.downTimer + 1.5);
                    else player.downTimer--;
                    if (player.downTimer <= 0) { player.state = 'DEAD'; triggerSystemAlert("Tu núcleo de energía colapsó permanentemente."); }
                }
            } else {
                player.vx = moveX * player.speed;
                if (moveX !== 0) player.faceDir = moveX > 0 ? 1 : -1;
                if (player.stunTimer > 0) player.vx = 0;
                const wantsToJump = keys['w'] || keys['arrowup'] || keys[' '] || mobileJumpActive;
                if (wantsToJump && player.onGround && player.stunTimer <= 0) { player.vy = -player.jumpPower; player.onGround = false; playSound('jump'); }
            }

            updateCelebration(player, currentRole === 'killer');
            if (player.celebrating) player.vx = 0;

            if (internalFrameCounter % 10 === 0) player.lastX = player.x;

            player.x += player.vx * currentSpeedDilation;
            player.y += player.vy * currentSpeedDilation;
            handleCollisions(player);

            if (player.onGround && player.vy === 0) {
                const fallHeight = player.y - player.fallHeightStart;
                if (fallHeight > 150) { player.rollTimer = 60; if (currentRole === 'survivor') { triggerSystemAlert("¡RODAMIENTO TÁCTICO AMORTIGUADOR!"); playSound('boost'); } }
                player.fallHeightStart = player.y;
            }

            if (currentRole === 'survivor') updateKillerBot();
            updateSurvivorBots();
            updateItemSpawns();

            for (let pIdx = speedPads.length - 1; pIdx >= 0; pIdx--) {
                const pad = speedPads[pIdx];
                pad.life--;
                let usedPad = false;
                const checkBoost = (entity) => {
                    if (entity.x > pad.x - pad.w / 2 && entity.x < pad.x + pad.w / 2 && entity.y + entity.r >= pad.y - 12 && entity.y + entity.r <= pad.y + 12) {
                        entity.speedBoostTimer = 180; usedPad = true;
                        for (let i = 0; i < 3; i++) particles.push({ x: entity.x, y: entity.y + entity.r, vx: entity.faceDir * 4, vy: (Math.random() - 0.5) * 2, r: Math.random() * 2 + 1, color: '#38bdf8', life: 20, style: 'arrow_speed' });
                    }
                };
                checkBoost(player); survivors.forEach(checkBoost);
                if ((pad.isLmsPad && usedPad) || pad.life <= 0) speedPads.splice(pIdx, 1);
            }

            activeDrones.forEach(drone => {
                if (drone.buildProgress < drone.buildMax) { drone.buildProgress += 1; return; }
                drone.pulseWave += 0.05; if (drone.pulseWave > 1) drone.pulseWave = 0;
                const targets = (currentRole === 'survivor' ? survivors.concat([player]) : survivors).filter(s => s && s.state === 'NORMAL');
                targets.forEach(t => {
                    const dist = Math.hypot(t.x - drone.x, t.y - drone.y);
                    if (dist < drone.radarRadius && drone.shootCd <= 0) {
                        applyBurnEffect(t, 2, 180); drone.shootCd = 350; playSound('laser');
                        particles.push({ x: drone.x, y: drone.y, targetX: t.x, targetY: t.y, color: '#ef4444', life: 25, style: 'laser_beam' });
                    }
                });
                if (drone.shootCd > 0) drone.shootCd--;
            });

            const applyBurnTick = (entity) => {
                if (!entity || entity.state !== 'NORMAL' || isKiller(entity)) return;
                if (entity.burnTimer > 0) {
                    entity.burnTimer--;
                    if (entity.burnTimer % 45 === 0) {
                        entity.health -= entity.burnStrength;
                        particles.push({ x: entity.x + (Math.random() - 0.5) * 10, y: entity.y + (Math.random() - 0.5) * 10, vx: 0, vy: -1.5, r: Math.random() * 3 + 1, color: '#f97316', life: 20 });
                        if (entity.health <= 0) applyDamage(entity, 0);
                    }
                }
            };
            applyBurnTick(player); survivors.forEach(applyBurnTick);

            for (let i = projectiles.length - 1; i >= 0; i--) {
                const proj = projectiles[i];
                if (!proj) continue;
                proj.x += proj.vx * currentSpeedDilation; proj.y += proj.vy * currentSpeedDilation;
                if (proj.x < 0 || proj.x > WORLD_WIDTH || proj.y > WORLD_HEIGHT) { projectiles.splice(i, 1); continue; }
                if (proj.danger) {
                    let targetList = currentRole === 'survivor' ? survivors.concat([player]) : survivors;
                    let hitRegistered = false;
                    for (let t of targetList) {
                        if (t && t.state === 'NORMAL') {
                            const dist = Math.hypot(t.x - proj.x, t.y - proj.y);
                            if (dist < t.r + proj.r) { applyDamage(t, 12); applyBurnEffect(t, 1, 300); hitRegistered = true; break; }
                        }
                    }
                    if (hitRegistered) { projectiles.splice(i, 1); continue; }
                }
            }

            if (ringEscapesSpawned) {
                escapeRings.forEach(ring => {
                    const dist = Math.hypot(player.x - ring.x, player.y - ring.y);
                    if (dist < player.r + ring.r && currentRole === 'survivor' && player.state === 'NORMAL') {
                        player.state = 'ESCAPED';
                        const stillAlive = survivors.filter(s => s && (s.state === 'NORMAL' || s.state === 'DOWN')).length;
                        if (stillAlive > 0) {
                            isSpectating = true;
                            spectatorTarget = null;
                            const banner = document.getElementById('spectator-banner');
                            banner.classList.remove('hidden');
                            document.getElementById('mobile-controls-container').classList.add('hidden');
                            triggerSystemAlert("¡ESCAPASTE! Modo espectador activado: observa al resto de la flota.");
                            playSound('boost');
                        } else {
                            endGame(true, "¡Escapaste con vida! Tus destrezas mecánicas superaron a la IA.");
                        }
                    }
                    survivors.forEach(s => {
                        if (s.state === 'NORMAL') {
                            const sDist = Math.hypot(s.x - ring.x, s.y - ring.y);
                            if (sDist < s.r + ring.r) { s.state = 'ESCAPED'; triggerSystemAlert(`¡${s.name} ha evacuado de la fábrica!`); }
                        }
                    });
                });
            }

            const allActiveEntities = currentRole === 'survivor' ? survivors.concat([player]) : survivors;
            const allDownedEntities = currentRole === 'survivor' ? survivors.concat([player]) : survivors;
            allActiveEntities.forEach(activator => {
                if (activator && activator.state === 'NORMAL') {
                    allDownedEntities.forEach(downed => {
                        if (downed && downed.state === 'DOWN' && activator !== downed) {
                            const dist = Math.hypot(activator.x - downed.x, activator.y - downed.y);
                            if (dist < (activator.r + downed.r + 15)) {
                                downed.state = 'NORMAL'; downed.health = 50; downed.downTimer = 0;
                                playSound('boost'); triggerSystemAlert(`¡${activator.name} reactivó y salvó a ${downed.name}!`);
                                maybeCelebrateBot(activator, 0.4);
                                for (let i = 0; i < 12; i++) particles.push({ x: downed.x, y: downed.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 1, r: Math.random() * 3 + 2, color: '#10b981', life: 30 });
                            }
                        }
                    });
                }
            });

            player.x = Math.max(player.r, Math.min(WORLD_WIDTH - player.r, player.x));
            player.y = Math.max(player.r, Math.min(WORLD_HEIGHT - player.r, player.y));

            let cw = canvas.width || 800, ch = canvas.height || 600;
            let camFocusX = player.x, camFocusY = player.y;
            if (isSpectating) {
                if (!spectatorTarget || spectatorTarget.state !== 'NORMAL') {
                    spectatorTarget = survivors.find(s => s && (s.state === 'NORMAL' || s.state === 'DOWN')) || null;
                }
                if (spectatorTarget) { camFocusX = spectatorTarget.x; camFocusY = spectatorTarget.y; }
            }
            let targetCamX = camFocusX - cw / 2, targetCamY = camFocusY - ch / 2;
            camera.x += (targetCamX - camera.x) * 0.15; camera.y += (targetCamY - camera.y) * 0.15;
            if (isNaN(camera.x) || camera.x === undefined) camera.x = 0;
            if (isNaN(camera.y) || camera.y === undefined) camera.y = 0;
            camera.x = Math.max(0, Math.min(WORLD_WIDTH - cw, camera.x));
            camera.y = Math.max(0, Math.min(WORLD_HEIGHT - ch, camera.y));

            updateParticles();
            if (activeTrackerArrow > 0) activeTrackerArrow--;
            if (activeGlobalEye > 0) activeGlobalEye--;

            if (currentRole === 'survivor') {
                if (player.state === 'DEAD') endGame(false, "El Killer asimiló tu núcleo cuántico.");
                const activeOnes = survivors.filter(s => s.state === 'NORMAL' || s.state === 'DOWN').length;
                if (activeOnes === 0 && player.state === 'DEAD') endGame(false, "Toda la flota de sobrevivientes fue reducida.");
                if (isSpectating && activeOnes === 0) endGame(true, "¡Escapaste con vida! Observaste el destino final de tu flota desde el modo espectador.");
            } else {
                const survivorsLeft = survivors.filter(s => s.state === 'NORMAL' || s.state === 'DOWN').length;
                if (survivorsLeft === 0) endGame(true, "Captura absoluta. La fábrica ha sido depurada.");
                if (ringEscapesSpawned && survivorsLeft > 0 && postTimerSeconds >= 100) endGame(false, "Demasiados objetivos escaparon por el portal holográfico.");
            }

            updateSurvivorsHudList();
            updateItemHudButton();
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!gameActive && document.getElementById('lobby-screen').className.indexOf('hidden') === -1) {
                ctx.fillStyle = '#050811'; ctx.fillRect(0, 0, canvas.width, canvas.height); return;
            }

            ctx.save();
            let shakeX = (Math.random() - 0.5) * cameraShake, shakeY = (Math.random() - 0.5) * cameraShake;
            ctx.translate(-camera.x + shakeX, -camera.y + shakeY);

            if (timeRemaining <= 0) { ctx.fillStyle = 'rgba(10, 15, 30, 0.45)'; ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); }

            ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)'; ctx.lineWidth = 1;
            const size = 50;
            for (let x = 0; x < WORLD_WIDTH; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke(); }

            ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
            ctx.fillRect(400, 200, 100, 800); ctx.fillRect(1700, 100, 140, 900); ctx.fillRect(3200, 250, 90, 750); ctx.fillRect(4400, 150, 110, 850);

            speedPads.forEach(pad => {
                ctx.fillStyle = '#0284c7'; ctx.fillRect(pad.x - pad.w / 2, pad.y, pad.w, pad.h);
                ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(pad.x - 15, pad.y + 5); ctx.lineTo(pad.x, pad.y + 2); ctx.lineTo(pad.x + 15, pad.y + 5); ctx.stroke();
                const lifePct = Math.max(0, pad.life / (pad.maxLife || 600));
                ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; ctx.fillRect(pad.x - pad.w / 2, pad.y + pad.h + 2, pad.w, 4);
                ctx.fillStyle = pad.isLmsPad ? '#ec4899' : '#38bdf8'; ctx.fillRect(pad.x - pad.w / 2, pad.y + pad.h + 2, pad.w * lifePct, 4);
            });

            if (ringEscapesSpawned) {
                escapeRings.forEach(ring => {
                    ctx.save(); ctx.shadowColor = '#10b981'; ctx.shadowBlur = 20; ctx.strokeStyle = '#10b981'; ctx.lineWidth = 6;
                    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2); ctx.stroke();
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'; ctx.fill(); ctx.restore();
                });
            }

            drawItemSpawns();

            platforms.forEach(plat => {
                if (plat.type === 'fragile' && plat.health <= 0) return;
                ctx.save();
                if (plat.type === 'fragile') {
                    const lifeFactor = plat.health / plat.maxHealth;
                    ctx.fillStyle = `rgba(245, 158, 11, ${0.4 + lifeFactor * 0.6})`; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
                    ctx.fillRect(plat.x, plat.y, plat.w, plat.h); ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                } else if (plat.type === 'moving') {
                    ctx.fillStyle = '#475569'; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                } else if (plat.type === 'conveyor') {
                    ctx.fillStyle = '#334155'; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
                    const offset = (internalFrameCounter * 2 * plat.dir) % 20;
                    for (let lx = plat.x + offset - 20; lx < plat.x + plat.w; lx += 20) {
                        if (lx >= plat.x && lx <= plat.x + plat.w) { ctx.beginPath(); ctx.moveTo(lx, plat.y); ctx.lineTo(lx + 8, plat.y + plat.h); ctx.stroke(); }
                    }
                } else if (plat.type === 'spring') {
                    ctx.fillStyle = '#64748b'; ctx.fillRect(plat.x, plat.y + 15, plat.w, plat.h - 15);
                    ctx.fillStyle = '#94a3b8'; ctx.fillRect(plat.x - 4, plat.y, plat.w + 8, 8);
                    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.strokeRect(plat.x, plat.y + 15, plat.w, plat.h - 15);
                } else if (plat.type === 'ramp') {
                    ctx.fillStyle = '#1e293b'; ctx.beginPath();
                    if (plat.slope === -1) { ctx.moveTo(plat.x, plat.y + plat.h); ctx.lineTo(plat.x + plat.w, plat.y); ctx.lineTo(plat.x + plat.w, plat.y + plat.h); }
                    else { ctx.moveTo(plat.x, plat.y); ctx.lineTo(plat.x + plat.w, plat.y + plat.h); ctx.lineTo(plat.x, plat.y + plat.h); }
                    ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#334155'; ctx.stroke();
                } else {
                    if (plat.oneWay) {
                        ctx.fillStyle = '#475569'; ctx.fillRect(plat.x, plat.y, plat.w, 8);
                        ctx.fillStyle = '#334155';
                        for (let gx = plat.x + 8; gx < plat.x + plat.w; gx += 20) ctx.fillRect(gx, plat.y + 8, 4, plat.h - 8);
                        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                    } else {
                        ctx.fillStyle = '#111827'; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                        ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2; ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                    }
                }
                ctx.restore();
            });

            activeDrones.forEach(drone => {
                ctx.save();
                if (drone.buildProgress < drone.buildMax) {
                    const ratio = drone.buildProgress / drone.buildMax;
                    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(drone.x, drone.y, drone.r + 5, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * ratio)); ctx.stroke();
                    ctx.fillStyle = '#38bdf8'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText("BUILDING...", drone.x, drone.y - 18);
                } else {
                    ctx.beginPath(); ctx.arc(drone.x, drone.y, drone.radarRadius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.05)'; ctx.fill();
                    ctx.strokeStyle = `rgba(239, 68, 68, ${0.1 + drone.pulseWave * 0.2})`; ctx.lineWidth = 2; ctx.stroke();
                }
                ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(drone.x, drone.y, drone.r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = (drone.buildProgress < drone.buildMax) ? '#475569' : '#ef4444'; ctx.lineWidth = 3; ctx.stroke();
                ctx.fillStyle = (drone.buildProgress < drone.buildMax) ? '#94a3b8' : '#ef4444';
                ctx.shadowColor = '#ef4444'; ctx.shadowBlur = (drone.buildProgress < drone.buildMax) ? 0 : 8;
                ctx.beginPath(); ctx.arc(drone.x, drone.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });

            projectiles.forEach(proj => {
                ctx.save(); ctx.fillStyle = proj.color; ctx.shadowColor = proj.color; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });

            particles.forEach((p) => {
                ctx.save();
                if (p.style === 'laser_beam') { ctx.strokeStyle = p.color; ctx.lineWidth = 4 * (p.life / 25); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.targetX, p.targetY); ctx.stroke(); }
                else if (p.style === 'melee_slash') { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life / 12), 0, Math.PI * 2); ctx.fill(); }
                else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
                ctx.restore();
            });

            survivors.forEach(s => { if (s.state !== 'DEAD' && s.state !== 'ESCAPED') drawSurvivorEntity(s); });
            if (currentRole === 'survivor') drawKillerEntity(killer);
            if (currentRole === 'survivor') { if (player.state !== 'DEAD') drawSurvivorEntity(player); }
            else drawKillerEntity(player);

            ctx.restore();

            const activeTeam = currentRole === 'survivor' ? survivors.concat([player]) : survivors;
            const downedTarget = activeTeam.find(s => s && s.state === 'DOWN' && s !== player);

            if (downedTarget && player.state === 'NORMAL') {
                const dx = downedTarget.x - player.x, dy = downedTarget.y - player.y, angle = Math.atan2(dy, dx);
                ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2 - 120); ctx.rotate(angle);
                const opacity = 0.5 + Math.sin(internalFrameCounter * 0.1) * 0.5;
                ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(15, -12); ctx.lineTo(20, -4); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.lineTo(20, 4); ctx.lineTo(15, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.rotate(-angle); ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
                ctx.fillText(`¡REVIVE A ${downedTarget.name.toUpperCase()}!`, 0, -22); ctx.restore();
            }

            if (currentRole === 'survivor' && activeTrackerArrow > 0) {
                const dx = killer.x - player.x, dy = killer.y - player.y, dist = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
                const arrowSize = Math.max(10, Math.min(35, (dist / 12)));
                ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2 - 60); ctx.rotate(angle);
                ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(arrowSize, 0); ctx.lineTo(-arrowSize, -arrowSize / 2); ctx.lineTo(-arrowSize / 2, 0); ctx.lineTo(-arrowSize, arrowSize / 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
            }

            if (currentRole === 'killer' && activeGlobalEye > 0) {
                survivors.forEach(s => {
                    if (s.state === 'NORMAL') {
                        const dx = s.x - player.x, dy = s.y - player.y, angle = Math.atan2(dy, dx);
                        ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(angle);
                        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(120, -10); ctx.lineTo(140, 0); ctx.lineTo(120, 10); ctx.fill(); ctx.restore();
                    }
                });
            }

            if (ringEscapesSpawned && currentRole === 'survivor') {
                let nearestRing = escapeRings[0], minDist = 9999;
                escapeRings.forEach(r => { const d = Math.hypot(r.x - player.x, r.y - player.y); if (d < minDist) { minDist = d; nearestRing = r; } });
                const dx = nearestRing.x - player.x, dy = nearestRing.y - player.y, angle = Math.atan2(dy, dx);
                ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2 - 90); ctx.rotate(angle);
                ctx.fillStyle = '#10b981'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(-10, -12); ctx.lineTo(-5, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
            }
        }

         function loop() { updateGame(); draw(); updateCooldownsUI(); requestAnimationFrame(loop); }

        window.onload = () => {
            currentMap = MAPS[0];
            WORLD_WIDTH = currentMap.WORLD_WIDTH; WORLD_HEIGHT = currentMap.WORLD_HEIGHT;
            platforms = currentMap.platforms.map(p => ({ ...p }));
            player = { x: 300, y: WORLD_HEIGHT - 120, r: 20, vy: 0, vx: 0, name: "Menú", state: 'NORMAL', hatStyle: HAT_TYPES[0], abilities: [] };
            killer = { x: WORLD_WIDTH - 200, y: WORLD_HEIGHT - 120, r: 26, vy: 0, vx: 0, name: "Killer", hatStyle: null, abilities: [] };
            
            resizeCanvas();

            // =========================================================
            // CONTROL AUTOMÁTICO DE LA MÚSICA DEL LOBBY (Lobby.mp3)
            // =========================================================

            // 1. INICIAR: Despierta el motor de audio del juego y reproduce el Lobby al primer clic
            document.addEventListener('click', () => {
                const lobby = document.getElementById('lobby-screen');
                if (lobby && !lobby.classList.contains('hidden')) {
                    // Despertamos el AudioContext del juego usando tu lógica original
                    if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
                        audioCtx.resume();
                    }
                    // Ejecutamos la pista del lobby
                    if (typeof playLobbyTrack === 'function') {
                        playLobbyTrack();
                    }
                }
            }, { once: true });

            // 2. PARAR: Limpia y detiene todas las canciones del menú cuando eligen bando para jugar
            function apagarMusicaMenu() {
                if (typeof stopAllRealTracks === 'function') {
                    stopAllRealTracks(); // Función nativa de tu audio.js para apagar todo
                }
            }
            document.getElementById('menu-survivor')?.addEventListener('click', apagarMusicaMenu);
            document.getElementById('menu-killer')?.addEventListener('click', apagarMusicaMenu);

            // 3. REPETIR: Vuelve a encenderse cuando regresan de la partida haciendo clic en "Volver al Lobby"
            document.getElementById('btn-play-again')?.addEventListener('click', () => {
                if (typeof playLobbyTrack === 'function') {
                    playLobbyTrack();
                }
            });

            // =========================================================
            // INICIO DEL LOOP
            // =========================================================
            loop(); 
        };
