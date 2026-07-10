        const KILLERS = {
            mechaGolfBall: {
                id: 'mechaGolfBall', name: 'Mecha Golf Ball',
                stats: { r: 26, speed: 5.0, jumpPower: 13.8 },
                abilities: [
                    { id: 'mecha_ranged', role: 'ranged', name: 'Fire Blast', icon: '🔥', maxCd: 10, activate: activateKillerRanged },
                    { id: 'mecha_summon', role: 'summon', name: 'Sentinel Drone', icon: '🛸', maxCd: 16, activate: activateKillerSummon },
                    { id: 'mecha_scan', role: 'scan', name: 'Survivor Eye', icon: '👁️', maxCd: 20, activate: activateKillerScan }
                ],
                celebration: { id: 'mechaLaugh', name: 'Risa Mecánica', sound: 'cheer_mecha' },
                drawPortrait: (c, size) => drawMechaPortrait(c, size)
            }
        };

        function createKillerEntity(opts) {
            const character = KILLERS[opts.characterId];
            return {
                id: opts.id, name: opts.name, x: opts.x, y: opts.y, vx: 0, vy: 0,
                r: character.stats.r, speed: character.stats.speed, jumpPower: character.stats.jumpPower,
                health: 100, isBot: !!opts.isBot, isPlayer: !!opts.isPlayer, characterId: opts.characterId,
                meleeCd: 0, attackCd: 0, faceDir: -1, lives: 1, state: 'NORMAL', burnTimer: 0, burnStrength: 0, speedBoostTimer: 0,
                hatStyle: null, buildingSpeedpadTimer: 0, trackerSlowTimer: 0, jumpBoostActive: false, jumpBoostCharge: 0,
                rollTimer: 0, onGround: false, campTimer: 0, lastX: opts.x, stuckFrames: 0,
                emoteTimer: 0, celebrating: false, stunTimer: 0,
                abilities: character.abilities.map(a => ({ ...a, cd: 0 }))
            };
        }

        function drawMechaPortrait(c, size) {
            c.save();
            c.translate(size / 2, size / 2 + 4);
            const r = size * 0.34;
            const grad = c.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
            grad.addColorStop(0, '#475569'); grad.addColorStop(1, '#0f172a');
            c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = grad; c.fill();
            c.lineWidth = 2.5; c.strokeStyle = '#1e293b'; c.stroke();
            c.fillStyle = '#0f172a';
            c.beginPath(); c.ellipse(-r * 0.32, -r * 0.1, r * 0.16, r * 0.34, 0, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.ellipse(r * 0.32, -r * 0.1, r * 0.16, r * 0.34, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#ff3333';
            c.beginPath(); c.ellipse(-r * 0.32, -r * 0.1, r * 0.09, r * 0.22, 0, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.ellipse(r * 0.32, -r * 0.1, r * 0.09, r * 0.22, 0, 0, Math.PI * 2); c.fill();
            c.restore();
        }

        function drawKillerEntity(entity) {
            ctx.save();
            ctx.translate(entity.x, entity.y);
            const character = KILLERS[entity.characterId] || KILLERS.mechaGolfBall;

            if (entity.celebrating) applyCelebrationTransform(character.celebration.id, entity, entity.r);

            const grad = ctx.createRadialGradient(-entity.r * 0.2, -entity.r * 0.2, entity.r * 0.1, 0, 0, entity.r);
            grad.addColorStop(0, '#475569'); grad.addColorStop(1, '#0f172a');
            ctx.beginPath(); ctx.arc(0, 0, entity.r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = entity.stunTimer > 0 ? '#facc15' : '#1e293b'; ctx.stroke();

            ctx.fillStyle = '#ef4444';
            [[-12, -8], [10, -10], [-14, 5], [12, 8]].forEach(d => { ctx.beginPath(); ctx.arc(d[0], d[1], 3, 0, Math.PI * 2); ctx.fill(); });

            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.ellipse(-6, -2, 4.5, 8.5, 0, 0, Math.PI * 2); ctx.ellipse(6, -2, 4.5, 8.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#ff3333'; ctx.beginPath(); ctx.ellipse(-6, -2, 2.5, 6, 0, 0, Math.PI * 2); ctx.ellipse(6, -2, 2.5, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-5, -4, 1, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(7, -4, 1, 2.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, 7); ctx.lineTo(6, 7); ctx.stroke();
            ctx.fillStyle = '#1e293b'; ctx.fillRect(-10, 10, 20, 5); ctx.strokeStyle = '#475569'; ctx.strokeRect(-10, 10, 20, 5);
            ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -entity.r); ctx.lineTo(0, -entity.r - 12); ctx.stroke();
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, -entity.r - 12, 4, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.5; ctx.beginPath();
            const robotWalkOffset = (entity.vx !== 0 && entity.onGround) ? Math.sin(entity.x * 0.2) * 5 : 0;
            ctx.moveTo(-6, entity.r - 2); ctx.lineTo(-8 + robotWalkOffset, entity.r + 9);
            ctx.moveTo(6, entity.r - 2); ctx.lineTo(8 - robotWalkOffset, entity.r + 9); ctx.stroke();

            ctx.fillStyle = '#f87171'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(entity.name, 0, -entity.r - 18);

            if (entity.fireBlastCharge && entity.fireBlastCharge > 0) {
                const ratio = (120 - entity.fireBlastCharge) / 120;
                ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; ctx.fillRect(-20, -entity.r - 28, 40, 5);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(-20, -entity.r - 28, 40 * ratio, 5);
            }
            if (entity.stunTimer > 0) { ctx.fillStyle = '#facc15'; ctx.font = 'bold 8px monospace'; ctx.fillText("¡ATURDIDO!", 0, -entity.r - 30); }

            if (entity.celebrating) drawCelebrationBadge(entity.r + 5, character.celebration.name, '#ef4444');

            ctx.restore();
        }
