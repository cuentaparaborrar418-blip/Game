        const ITEM_TYPES = {
            medkit: { id: 'medkit', name: 'Botiquín', icon: '🩹', color: '#22c55e' },
            sword: { id: 'sword', name: 'Espada', icon: '🗡️', color: '#e2e8f0' }
        };
        const ITEM_RESPAWN_TIME = 75 * 60;
        const MEDKIT_USE_TIME = 8 * 60;
        const SWORD_WINDUP_TIME = 1 * 60;
        const SWORD_STUN_TIME = 2 * 60;

        function randomItemType() { return Math.random() < 0.5 ? 'medkit' : 'sword'; }

        function initItemSpawns() {
            itemSpawns = (currentMap.itemSpawnPoints || []).map(p => ({
                x: p.x, y: p.y, current: randomItemType(), respawnTimer: -1, spawnAnimTimer: 30
            }));
            groundItems = [];
        }

        function forceRespawnAllItems() {
            itemSpawns.forEach(sp => { sp.current = randomItemType(); sp.respawnTimer = -1; sp.spawnAnimTimer = 30; });
            triggerSystemAlert("¡TODOS LOS OBJETOS HAN SIDO REABASTECIDOS!");
        }

        function updateItemSpawns() {
            itemSpawns.forEach(sp => {
                if (sp.spawnAnimTimer > 0) sp.spawnAnimTimer--;
                if (sp.current === null) {
                    if (sp.respawnTimer > 0) sp.respawnTimer--;
                    else if (sp.respawnTimer === 0) { sp.current = randomItemType(); sp.spawnAnimTimer = 30; sp.respawnTimer = -1; playSound('itemSpawn'); }
                }
            });
            for (let i = groundItems.length - 1; i >= 0; i--) {
                groundItems[i].life--;
                if (groundItems[i].life <= 0) groundItems.splice(i, 1);
            }
        }

        function pickupFromSpawnPoint(entity, sp) {
            const oldItem = entity.heldItem;
            entity.heldItem = sp.current;
            sp.current = oldItem || null;
            sp.respawnTimer = sp.current ? -1 : ITEM_RESPAWN_TIME;
            sp.spawnAnimTimer = 8;
            playSound('itemPickup');
            if (entity === player) triggerSystemAlert(`¡OBJETO OBTENIDO: ${ITEM_TYPES[entity.heldItem].name.toUpperCase()}!`);
        }

        function pickupFromGround(entity, idx) {
            const gi = groundItems[idx];
            const oldItem = entity.heldItem;
            entity.heldItem = gi.type;
            groundItems.splice(idx, 1);
            if (oldItem) groundItems.push({ x: gi.x, y: gi.y, type: oldItem, life: 1800 });
            playSound('itemPickup');
            if (entity === player) triggerSystemAlert(`¡OBJETO OBTENIDO: ${ITEM_TYPES[entity.heldItem].name.toUpperCase()}!`);
        }

        function checkItemPickups(entity) {
            if (entity.usingItemTimer > 0 || entity.swordWindup > 0 || entity.celebrating || entity.state !== 'NORMAL') return;
            for (const sp of itemSpawns) {
                if (sp.current && Math.hypot(entity.x - sp.x, entity.y - sp.y) < entity.r + 26) {
                    pickupFromSpawnPoint(entity, sp);
                    return;
                }
            }
            for (let i = 0; i < groundItems.length; i++) {
                const gi = groundItems[i];
                if (Math.hypot(entity.x - gi.x, entity.y - gi.y) < entity.r + 22) {
                    pickupFromGround(entity, i);
                    return;
                }
            }
        }

        function dropItemNearby(entity) {
            if (!entity.heldItem) return;
            groundItems.push({ x: entity.x, y: entity.y - entity.r - 4, type: entity.heldItem, life: 1800 });
            entity.heldItem = null;
        }

        function useHeldItem(entity) {
            if (!gameActive || !entity.heldItem || entity.usingItemTimer > 0 || entity.swordWindup > 0 || entity.state !== 'NORMAL') return;
            if (entity.heldItem === 'medkit') {
                entity.usingItemTimer = MEDKIT_USE_TIME;
                entity.usingItemMax = MEDKIT_USE_TIME;
            } else if (entity.heldItem === 'sword') {
                entity.swordWindup = SWORD_WINDUP_TIME;
            }
            cancelCelebration(entity);
        }

        function performSwordStrike(entity) {
            const dir = entity.faceDir || 1;
            const hitX = entity.x + dir * 45;
            particles.push({ x: hitX, y: entity.y, vx: dir * 4, vy: 0, r: 18, color: 'rgba(226,232,240,0.85)', life: 14, style: 'melee_slash' });
            playSound('stun');
            const killerEnt = getKillerEntity();
            if (killerEnt && Math.hypot(killerEnt.x - hitX, killerEnt.y - entity.y) < killerEnt.r + 40) {
                killerEnt.stunTimer = SWORD_STUN_TIME;
                triggerSystemAlert(`¡${entity.name} ATURDIÓ AL KILLER CON SU ESPADA!`);
            }
            entity.heldItem = null;
        }

        function tickItemUsage(entity) {
            if (entity.state !== 'NORMAL') return;
            if (entity.usingItemTimer > 0) {
                entity.usingItemTimer--;
                if (entity.usingItemTimer <= 0) {
                    entity.health = entity.maxHealth || 100;
                    entity.heldItem = null;
                    entity.usingItemMax = 0;
                    playSound('boost');
                    if (entity === player) triggerSystemAlert("¡CURACIÓN COMPLETA!");
                }
            }
            if (entity.swordWindup > 0) {
                entity.swordWindup--;
                if (entity.swordWindup <= 0) performSwordStrike(entity);
            }
        }

        function findNearestItemSource(entity) {
            let best = null, bestDist = Infinity;
            itemSpawns.forEach(sp => { if (sp.current) { const d = Math.hypot(sp.x - entity.x, sp.y - entity.y); if (d < bestDist) { bestDist = d; best = { x: sp.x, y: sp.y }; } } });
            groundItems.forEach(gi => { const d = Math.hypot(gi.x - entity.x, gi.y - entity.y); if (d < bestDist) { bestDist = d; best = { x: gi.x, y: gi.y }; } });
            return best ? { pos: best, dist: bestDist } : null;
        }


        function updateItemHudButton() {
            if (currentRole !== 'survivor') { btnMobileItem.classList.add('hidden'); return; }
            if (player.heldItem) {
                btnMobileItem.classList.remove('hidden');
                btnMobileItem.innerText = ITEM_TYPES[player.heldItem].icon;
            } else btnMobileItem.classList.add('hidden');
        }


        function drawItemSpawns() {
            itemSpawns.forEach(sp => {
                if (!sp.current) {
                    if (sp.respawnTimer > 0) {
                        ctx.save(); ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2 * (1 - sp.respawnTimer / ITEM_RESPAWN_TIME)); ctx.stroke();
                        ctx.restore();
                    }
                    return;
                }
                const it = ITEM_TYPES[sp.current];
                const scale = sp.spawnAnimTimer > 0 ? (1 - sp.spawnAnimTimer / 30) : 1;
                ctx.save();
                ctx.translate(sp.x, sp.y - 8 + Math.sin(internalFrameCounter * 0.08) * 4);
                ctx.scale(scale, scale);
                ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowColor = it.color; ctx.shadowBlur = 12;
                ctx.fillText(it.icon, 0, 0);
                ctx.restore();
            });
            groundItems.forEach(gi => {
                const it = ITEM_TYPES[gi.type];
                ctx.save(); ctx.translate(gi.x, gi.y - 8 + Math.sin(internalFrameCounter * 0.08) * 4);
                ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.globalAlpha = Math.min(1, gi.life / 60);
                ctx.fillText(it.icon, 0, 0); ctx.restore();
            });
        }

