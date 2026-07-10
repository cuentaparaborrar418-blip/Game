function decideSurvivorGoal(s) {
            const killerCoords = getKillerCoords();
            const distToKiller = Math.hypot(killerCoords.x - s.x, killerCoords.y - s.y);
            const allTeam = currentRole === 'survivor' ? survivors.concat([player]) : survivors;
            const downedAlly = allTeam.find(a => a && a !== s && a.state === 'DOWN');
            const archetype = s.archetype;

            if (distToKiller < 550) s.chaseTimer = (s.chaseTimer || 0) + 1;
            else { if (s.chaseTimer > 90) maybeCelebrateBot(s, 0.25); s.chaseTimer = 0; }
            if (s.wasThreatened && distToKiller > 500) { maybeCelebrateBot(s, 0.3); s.wasThreatened = false; }
            if (distToKiller < 200) s.wasThreatened = true;

            const archMult = {
                helper: { flee: 1.0, rescue: 1.6, heal: 1.1, fetch: 1.1, give: 1.7 },
                tactical: { flee: 0.9, rescue: 1.1, heal: 1.3, fetch: 1.3, give: 0.9 },
                coward: { flee: 1.7, rescue: 0.35, heal: 1.2, fetch: 0.6, give: 0.6 },
                juker: { flee: 0.75, rescue: 1.0, heal: 0.9, fetch: 0.9, give: 0.8 }
            }[archetype] || { flee: 1, rescue: 1, heal: 1, fetch: 1, give: 1 };

            const nearestItem = findNearestItemSource(s);
            const lowHealthAlly = allTeam.find(a => a && a !== s && a.state === 'NORMAL' && a.health < 40 && !a.heldItem && Math.hypot(a.x - s.x, a.y - s.y) < 400);

            let options = [];

            if (ringEscapesSpawned) {
                let nearestRing = null, minRingDist = Infinity;
                escapeRings.forEach(r => { const rd = Math.hypot(r.x - s.x, r.y - s.y); if (rd < minRingDist) { minRingDist = rd; nearestRing = r; } });
                if (nearestRing) options.push({ type: 'ESCAPE', weight: 100, pos: nearestRing });
            }

            // --- LÓGICA DE ESCAPE EN BORDES (EVITA QUEDAR ACORRALADO) ---
            if (distToKiller < 320) {
                let targetX = s.x + (s.x > killerCoords.x ? 400 : -400);
                
                // Margen de 100px para detectar límites del mapa mundial
                const cercaBordeIzquierdo = s.x < 100 && killerCoords.x > s.x;
                const cercaBordeDerecho = s.x > (WORLD_WIDTH - 100) && killerCoords.x < s.x;
                
                if (cercaBordeIzquierdo || cercaBordeDerecho) {
                    // Si está acorralado, avanza hacia el Killer para intentar saltarlo
                    targetX = killerCoords.x + (cercaBordeIzquierdo ? 300 : -300);
                    s.isDesperateEscape = true;
                } else {
                    s.isDesperateEscape = false;
                }

                options.push({ type: 'FLEE', weight: (60 - distToKiller / 6) * archMult.flee, pos: { x: targetX, y: s.y } });
            } else {
                s.isDesperateEscape = false;
            }

            if (downedAlly) options.push({ type: 'RESCUE', weight: 45 * archMult.rescue, pos: downedAlly });
            
            // --- SEGURIDAD AL CURARSE: Sube de 260 a 550 para evitar bucles absurdos ---
            if (s.heldItem === 'medkit' && s.health < 55 && distToKiller > 550) {
                options.push({ type: 'HEAL', weight: 40 * archMult.heal, pos: { x: s.x, y: s.y } });
            }

            if (!s.heldItem && nearestItem && nearestItem.dist < 550) options.push({ type: 'ITEM_FETCH', weight: 22 * archMult.fetch, pos: nearestItem.pos });
            if (s.heldItem && lowHealthAlly) options.push({ type: 'GIVE_ITEM', weight: 26 * archMult.give, pos: lowHealthAlly });

            options.push({ type: 'PATROL', weight: 8, pos: { x: s.patrolTargetX, y: s.y } });

            options.sort((a, b) => b.weight - a.weight);
            return options[0];
        }

        function updateSurvivorAI(s) {
            if (internalFrameCounter % 45 === 0) {
                const goal = decideSurvivorGoal(s);
                s.aiGoal = goal;

                if (Math.random() < CELEBRATION_TAUNT_CHANCE[s.archetype] && goal.type !== 'FLEE' && goal.type !== 'ESCAPE' && goal.type !== 'RESCUE') {
                    const killerCoords = getKillerCoords();
                    const d = Math.hypot(killerCoords.x - s.x, killerCoords.y - s.y);
                    if (d > 220 && d < 480) startCelebration(s, false);
                }
            }

            const goal = s.aiGoal || { type: 'PATROL', pos: { x: s.x, y: s.y } };
            const targetX = goal.pos ? goal.pos.x : s.x;
            let moveDir = 0;
            if (Math.abs(targetX - s.x) > 10) moveDir = targetX > s.x ? 1 : -1;

            if (goal.type === 'PATROL' && Math.random() < 0.1) s.patrolTargetX = s.x + (Math.random() - 0.5) * 600;

            if (goal.type === 'HEAL' && s.heldItem === 'medkit' && s.usingItemTimer <= 0) useHeldItem(s);

            if (goal.type === 'GIVE_ITEM' && goal.pos) {
                const d = Math.hypot(goal.pos.x - s.x, goal.pos.y - s.y);
                if (d < 60) { dropItemNearby(s); s.aiGoal = null; }
            }

            const killerCoords = getKillerCoords();
            const distToKiller = Math.hypot(killerCoords.x - s.x, killerCoords.y - s.y);
            if (goal.type === 'FLEE' && s.heldItem === 'sword' && distToKiller < 75 && s.swordWindup <= 0 && s.archetype !== 'coward') useHeldItem(s);
            if (goal.type === 'FLEE' && distToKiller < 130) {
                const mobilityAbility = findAbilityByRole(s, 'mobility');
                if (mobilityAbility && mobilityAbility.cd <= 0 && Math.random() < 0.03) { mobilityAbility.activate(s); mobilityAbility.cd = mobilityAbility.maxCd; }
                const utilityAbility = findAbilityByRole(s, 'utility');
                if (utilityAbility && utilityAbility.cd <= 0 && s.onGround && s.buildingSpeedpadTimer <= 0 && Math.random() < 0.03) { utilityAbility.activate(s); utilityAbility.cd = utilityAbility.maxCd; }
            }

            // --- LÓGICA DE SALTO REPARADA Y OPTIMIZADA ---
            if (goal.type === 'FLEE' && s.isDesperateEscape && s.onGround && distToKiller < 180) {
                s.vy = -s.jumpPower * 1.15; // Salto evasivo potenciado para superar la colisión del Killer
                s.isDesperateEscape = false; // Consumimos la bandera de emergencia
            } 
            // Salto normal del mapa para subir plataformas
            else if (goal.pos && goal.pos.y !== undefined && goal.pos.y < s.y - 50 && s.onGround && Math.random() < 0.07) {
                s.vy = -s.jumpPower;
            }

            let currentSpeed = s.speed;
            if (s.speedBoostTimer > 0) { currentSpeed *= 2.3; s.speedBoostTimer--; }
            if (s.usingItemTimer > 0) currentSpeed *= 0.12;
            if (s.swordWindup > 0 || s.celebrating) currentSpeed = 0;
            if (s.buildingSpeedpadTimer > 0) currentSpeed = 0;

            s.vx = moveDir * currentSpeed;
            if (moveDir !== 0) { s.faceDir = moveDir; cancelCelebration(s); }
        }


        let lastSeenSurvivor = null;
        let chaseLostTimer = 0;

        function updateKillerBot() {
            if (killer.stunTimer > 0) { killer.stunTimer--; killer.vx = 0; killer.vy += GRAVITY; killer.x += killer.vx; killer.y += killer.vy; handleCollisions(killer); return; }
            killer.vy += GRAVITY;

            if (internalFrameCounter % 45 === 0) {
                if (Math.abs(killer.x - killer.lastX) < 4.0 && killer.vx !== 0 && killer.onGround) {
                    killer.stuckFrames++;
                    if (killer.stuckFrames > 2) {
                        killer.vy = -killer.jumpPower * 1.25;
                        killer.vx = (killer.x > WORLD_WIDTH / 2) ? -killer.speed * 1.5 : killer.speed * 1.5;
                        killer.patrolGoalX = killer.x + (killer.x > WORLD_WIDTH / 2 ? -600 : 600);
                        killer.stuckFrames = 0;
                        triggerSystemAlert("¡KILLER BOT DETECTÓ BLOQUEO! Liberando sobrecarga de salto.");
                        for (let i = 0; i < 15; i++) particles.push({ x: killer.x, y: killer.y + killer.r, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 5 - 2, r: Math.random() * 4 + 2, color: '#ef4444', life: 20 });
                    }
                } else killer.stuckFrames = 0;
                killer.lastX = killer.x;
            }

            if (internalFrameCounter % 45 === 0) {
                let visibleTargets = survivors.concat([player]).filter(s => s && s.state === 'NORMAL' && Math.hypot(s.x - killer.x, s.y - killer.y) < 600);
                let nearestTarget = null, minDist = 99999;
                visibleTargets.forEach(t => { const dist = Math.hypot(t.x - killer.x, t.y - killer.y); if (dist < minDist) { minDist = dist; nearestTarget = t; } });

                if (nearestTarget) { lastSeenSurvivor = nearestTarget; chaseLostTimer = 180; }
                else if (chaseLostTimer > 0) chaseLostTimer--;

                if (nearestTarget) { killer.botGoalTarget = nearestTarget; killer.state = 'CHASING'; }
                else if (lastSeenSurvivor && chaseLostTimer > 0) { killer.botGoalTarget = lastSeenSurvivor; killer.state = 'INVESTIGATING'; }
                else { killer.state = 'PATROLLING'; killer.botGoalTarget = null; if (Math.random() < 0.08) killer.patrolGoalX = Math.random() * WORLD_WIDTH; }

                if (Math.random() < 0.03 && killer.state === 'CHASING') startCelebration(killer, true);
            }

            let goalTarget = killer.botGoalTarget;
            if (goalTarget) {
                const dirX = goalTarget.x > killer.x ? 1 : -1;
                killer.faceDir = dirX; killer.vx = dirX * killer.speed;
                if (Math.abs(goalTarget.x - killer.x) < 8) killer.vx = 0;
                if (goalTarget.y < killer.y - 50 && Math.random() < 0.06 && killer.onGround) killer.vy = -killer.jumpPower;

                const directDist = Math.hypot(goalTarget.x - killer.x, goalTarget.y - killer.y);
                if (directDist < 55 && killer.attackCd <= 0 && goalTarget.state === 'NORMAL') { applyDamage(goalTarget, 10); killer.attackCd = 60; }

                const rangedAbility = findAbilityByRole(killer, 'ranged');
                if (directDist > 120 && directDist < 380 && rangedAbility && rangedAbility.cd <= 0 && Math.random() < 0.02) {
                    playSound('laser');
                    const shootAngle = Math.atan2(goalTarget.y - killer.y, goalTarget.x - killer.x);
                    projectiles.push({ x: killer.x, y: killer.y, vx: Math.cos(shootAngle) * 11.5, vy: Math.sin(shootAngle) * 11.5, r: 10, color: '#f97316', type: 'fire', danger: true });
                    rangedAbility.cd = rangedAbility.maxCd;
                }
            } else {
                const targetX = killer.patrolGoalX || (WORLD_WIDTH / 2);
                const dirX = targetX > killer.x ? 1 : -1;
                killer.faceDir = dirX; killer.vx = dirX * (killer.speed * 0.7);
                if (Math.abs(targetX - killer.x) < 15) killer.vx = 0;
                if (Math.random() < 0.02 && killer.onGround) killer.vy = -killer.jumpPower;
            }

            const summonAbility = findAbilityByRole(killer, 'summon');
            if (summonAbility && summonAbility.cd <= 0 && Math.random() < 0.005) { summonAbility.activate(killer); summonAbility.cd = summonAbility.maxCd; triggerSystemAlert("¡El Killer desplegó un Dron!"); }

            const scanAbility = findAbilityByRole(killer, 'scan');
            if (killer.state === 'PATROLLING' && scanAbility && scanAbility.cd <= 0 && Math.random() < 0.01) { scanAbility.activate(killer); scanAbility.cd = scanAbility.maxCd; triggerSystemAlert("¡El Killer activó el radar global!"); }

            if (killer.attackCd > 0) killer.attackCd--;
            killer.abilities.forEach(a => { if (a.cd > 0) a.cd -= (1 / 60); });

            updateCelebration(killer, true);
            if (killer.celebrating) { killer.vx = 0; }

            killer.x += killer.vx; killer.y += killer.vy;
            handleCollisions(killer);
            killer.x = Math.max(killer.r, Math.min(WORLD_WIDTH - killer.r, killer.x));
        }

        function updateSurvivorBots() {
            survivors.forEach(s => {
                if (s.state === 'DEAD' || s.state === 'ESCAPED') return;

                if (s.state === 'DOWN') {
                    const killerCoords = getKillerCoords();
                    const distToKiller = Math.hypot(s.x - killerCoords.x, s.y - killerCoords.y);
                    if (distToKiller < 160) s.downTimer = Math.min(900, (s.downTimer || 0) + 1.5);
                    else s.downTimer--;
                    if (s.downTimer <= 0) { s.state = 'DEAD'; triggerSystemAlert(`Sujeto ${s.name} ha sido desactivado permanentemente.`); }
                    return;
                }

                s.vy += GRAVITY;
                tickItemUsage(s);
                checkItemPickups(s);
                updateCelebration(s, false);

                if (internalFrameCounter % 45 === 0) {
                    if (Math.abs(s.x - s.lastX) < 4.0 && s.vx !== 0 && s.onGround) {
                        s.stuckFrames++;
                        if (s.stuckFrames > 2) {
                            s.vy = -s.jumpPower * 1.3;
                            s.vx = (s.x > WORLD_WIDTH / 2) ? -s.speed * 1.4 : s.speed * 1.4;
                            s.patrolTargetX = s.x + (s.x > WORLD_WIDTH / 2 ? -500 : 500);
                            s.stuckFrames = 0;
                            for (let i = 0; i < 10; i++) particles.push({ x: s.x, y: s.y + s.r, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4 - 2, r: Math.random() * 3 + 1, color: '#10b981', life: 15 });
                        }
                    } else s.stuckFrames = 0;
                    s.lastX = s.x;
                }

                if (!(s.usingItemTimer > 0 || s.swordWindup > 0 || s.celebrating)) updateSurvivorAI(s);
                else s.vx = 0;

                if (s.rollTimer > 0) {
                    s.rollTimer--; s.vx = s.faceDir * s.speed * 2.2; s.isRolling = true;
                    if (internalFrameCounter % 3 === 0) particles.push({ x: s.x, y: s.y + s.r - 2, vx: -s.faceDir * 2, vy: -Math.random(), r: Math.random() * 3 + 1, color: '#e2e8f0', life: 15 });
                } else s.isRolling = false;

                s.abilities.forEach(a => { if (a.cd > 0) a.cd -= (1 / 60); });

                s.x += s.vx; s.y += s.vy;
                handleCollisions(s);

                if (s.onGround && s.vy === 0) {
                    const fallHeight = s.y - s.fallHeightStart;
                    if (fallHeight > 150) { s.rollTimer = 60; playSound('boost'); }
                    s.fallHeightStart = s.y;
                }

                if (s.jumpBoostCharge > 0) { s.jumpBoostCharge--; if (s.jumpBoostCharge === 0) s.jumpBoostActive = true; }
                if (s.trackerSlowTimer > 0) s.trackerSlowTimer--;
                if (s.buildingSpeedpadTimer > 0) {
                    s.buildingSpeedpadTimer--;
                    if (s.buildingSpeedpadTimer === 0) { playSound('drone'); speedPads.push({ x: s.x, y: s.y + s.r - 5, w: 60, h: 10, life: 600, maxLife: 600 }); }
                }

                s.x = Math.max(s.r, Math.min(WORLD_WIDTH - s.r, s.x));
            });
                        }
