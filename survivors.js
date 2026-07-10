        const HAT_TYPES = ['crown', 'cowboy', 'tophat', 'cap', 'beret', 'chef', 'horns', 'party'];
        let chosenPlayerHat = 'crown';
        let controlsInverted = false;
        const HAT_NAMES = { crown: '👑 Realeza', cowboy: '🤠 Cowboy', tophat: '🎩 Elegante', cap: '🧢 Deportiva', beret: '🧣 Boina', chef: '🍳 Chef', horns: '😈 Cuernos', party: '🎉 Fiesta' };


        function createSurvivorEntity(opts) {
            const character = CHARACTERS[opts.characterId];
            return {
                id: opts.id, name: opts.name, x: opts.x, y: opts.y, vx: 0, vy: 0,
                r: character.stats.r, speed: character.stats.speed, jumpPower: character.stats.jumpPower,
                health: 100, maxHealth: 100, lives: SURVIVOR_LIVES,
                isBot: !!opts.isBot, isPlayer: !!opts.isPlayer, characterId: opts.characterId,
                archetype: opts.archetype || character.archetypeDefault,
                state: 'NORMAL', downTimer: 0, speedBoostTimer: 0, burnTimer: 0, burnStrength: 0,
                campTimer: 0, rollTimer: 0, isRolling: false, fallHeightStart: opts.y, lastX: opts.x,
                stuckFrames: 0, faceDir: 1, hatStyle: opts.hatStyle,
                abilities: character.abilities.map(a => ({ ...a, cd: 0 })),
                heldItem: null, usingItemTimer: 0, usingItemMax: 0, swordWindup: 0,
                buildingSpeedpadTimer: 0, trackerSlowTimer: 0, jumpBoostCharge: 0, jumpBoostActive: false,
                emoteTimer: 0, celebrating: false, onGround: false,
                patrolTargetX: opts.x, decisionTimer: 0, chaseTimer: 0, wasThreatened: false,
                usedPassiveThisLife: false
            };
        }

        function pickRandomCharacterId(excludeSet) {
            const keys = Object.keys(CHARACTERS);
            const available = keys.filter(k => !excludeSet.has(k));
            const pool = available.length ? available : keys;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            excludeSet.add(pick);
            return pick;
        }

        function pickRandomArchetype() { return ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]; }

        function drawEntityHat(hat, r) {
            ctx.save(); ctx.translate(0, -r + 2);
            if (hat === 'crown') {
                ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-12, -10); ctx.lineTo(-6, -4); ctx.lineTo(0, -14); ctx.lineTo(6, -4); ctx.lineTo(12, -10); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-12, -10, 1.8, 0, Math.PI * 2); ctx.arc(0, -14, 1.8, 0, Math.PI * 2); ctx.arc(12, -10, 1.8, 0, Math.PI * 2); ctx.fill();
            } else if (hat === 'cowboy') {
                ctx.fillStyle = '#78350f'; ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(0, 0, 18, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-11, -12, -8, -12); ctx.quadraticCurveTo(0, -15, 8, -12); ctx.quadraticCurveTo(11, -12, 10, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#000000'; ctx.fillRect(-9, -3, 18, 3);
            } else if (hat === 'tophat') {
                ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillRect(-10, -18, 20, 18); ctx.strokeRect(-10, -18, 20, 18);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(-10, -4, 20, 4);
            } else if (hat === 'cap') {
                ctx.fillStyle = '#3b82f6'; ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI, 0); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0, -3, 16, 4);
            } else if (hat === 'beret') {
                ctx.fillStyle = '#dc2626'; ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(-2, -2, 14, 5, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-3, -10); ctx.stroke();
            } else if (hat === 'chef') {
                ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-10, -10); ctx.bezierCurveTo(-14, -22, 14, -22, 10, -10); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            } else if (hat === 'horns') {
                ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(-8, 2); ctx.quadraticCurveTo(-18, -2, -18, -12); ctx.quadraticCurveTo(-12, -4, -4, 0); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(8, 2); ctx.quadraticCurveTo(18, -2, 18, -12); ctx.quadraticCurveTo(12, -4, 4, 0); ctx.fill(); ctx.stroke();
            } else if (hat === 'party') {
                ctx.fillStyle = '#f43f5e'; ctx.strokeStyle = '#be123c'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -22); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(5, -12); ctx.stroke();
                ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, -23, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        function drawSurvivorEntity(entity) {
            ctx.save();
            ctx.translate(entity.x, entity.y);

            const character = CHARACTERS[entity.characterId] || CHARACTERS.golfBall;

            if (entity.celebrating) applyCelebrationTransform(character.celebration.id, entity, entity.r);
            else if (entity.rollTimer && entity.rollTimer > 0) ctx.rotate((entity.x * 0.12) * entity.faceDir);

            const grad = ctx.createRadialGradient(-entity.r * 0.2, -entity.r * 0.2, entity.r * 0.1, 0, 0, entity.r);
            grad.addColorStop(0, character.bodyGradient[0]); grad.addColorStop(1, character.bodyGradient[1]);

            ctx.beginPath(); ctx.arc(0, 0, entity.r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = '#1e293b'; ctx.stroke();

            if (entity.hatStyle) drawEntityHat(entity.hatStyle, entity.r);

            if (entity.state === 'DOWN') {
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-2, 0); ctx.moveTo(-2, -6); ctx.lineTo(-8, 0); ctx.moveTo(2, -6); ctx.lineTo(8, 0); ctx.moveTo(8, -6); ctx.lineTo(2, 0); ctx.stroke();
                ctx.strokeStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0, 6, 4, 0, Math.PI, true); ctx.stroke();

                const activeKiller = currentRole === 'survivor' ? killer : player;
                const distToKillerEnt = Math.hypot(entity.x - activeKiller.x, entity.y - activeKiller.y);
                if (distToKillerEnt < 160) {
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; ctx.fillRect(-22, -entity.r - 28, 44, 6);
                    if (character.passive.id === 'empRescue') {
                        const pct = (entity.campTimer || 0) / 150;
                        ctx.fillStyle = '#06b6d4'; ctx.fillRect(-22, -entity.r - 28, 44 * pct, 6);
                        ctx.fillStyle = '#22d3ee'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText("ESCUDO CARGANDO", 0, -entity.r - 33);
                    } else {
                        ctx.fillStyle = '#10b981'; ctx.fillRect(-22, -entity.r - 28, 44, 6);
                        ctx.fillStyle = '#34d399'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText("BATERÍA BLOQUEADA", 0, -entity.r - 33);
                    }
                }
            } else {
                ctx.fillStyle = '#000000';
                ctx.beginPath(); ctx.ellipse(-5, -2, 2.5, 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(5, -2, 2.5, 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.0; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-2, -8); ctx.moveTo(2, -8); ctx.lineTo(8, -10); ctx.stroke();
                ctx.strokeStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(4, 5); ctx.stroke();
            }

            if (entity.burnTimer > 0) { ctx.fillStyle = 'rgba(249, 115, 22, 0.4)'; ctx.beginPath(); ctx.arc(0, -5, entity.r * 0.8, 0, Math.PI * 2); ctx.fill(); }

            ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-5, entity.r - 2);
            const walkOffset = (entity.vx !== 0 && entity.onGround && !entity.isRolling) ? Math.sin(entity.x * 0.25) * 6 : 0;
            ctx.lineTo(-7 + walkOffset, entity.r + 8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, entity.r - 2); ctx.lineTo(7 - walkOffset, entity.r + 8); ctx.stroke();

            if (entity.characterId === 'bubble' || entity.characterId === 'coiny') {
                const armSwing = (entity.vx !== 0 && entity.onGround && !entity.isRolling) ? Math.sin(entity.x * 0.25 + Math.PI) * 5 : 0;
                const armY = entity.r * 0.35;
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(-entity.r + 2, armY);
                ctx.lineTo(-entity.r - 6 + armSwing, armY + 9); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(entity.r - 2, armY);
                ctx.lineTo(entity.r + 6 - armSwing, armY + 9); ctx.stroke();
            }

            ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(entity.name, 0, -entity.r - 12);

            if (entity.buildingSpeedpadTimer > 0) {
                const progressRatio = (90 - entity.buildingSpeedpadTimer) / 90;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; ctx.fillRect(-22, -entity.r - 28, 44, 6);
                ctx.fillStyle = '#38bdf8'; ctx.fillRect(-22, -entity.r - 28, 44 * progressRatio, 6);
            }
            if (entity.usingItemTimer > 0 && entity.usingItemMax > 0) {
                const progressRatio = (entity.usingItemMax - entity.usingItemTimer) / entity.usingItemMax;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; ctx.fillRect(-24, -entity.r - 36, 48, 7);
                ctx.fillStyle = '#22c55e'; ctx.fillRect(-24, -entity.r - 36, 48 * progressRatio, 7);
                ctx.fillStyle = '#4ade80'; ctx.font = 'bold 7px monospace'; ctx.fillText("CURANDO...", 0, -entity.r - 42);
            }
            if (entity.swordWindup > 0) {
                ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 8px monospace'; ctx.fillText("¡PREPARANDO ESPADA!", 0, -entity.r - 40);
            }
            if (entity.heldItem && entity.usingItemTimer <= 0 && entity.swordWindup <= 0) {
                ctx.font = '13px sans-serif'; ctx.fillText(ITEM_TYPES[entity.heldItem].icon, entity.r * 0.75, -entity.r * 0.75);
            }

            if (entity.celebrating) drawCelebrationBadge(entity.r, character.celebration.name, '#facc15');

            ctx.restore();
        }
