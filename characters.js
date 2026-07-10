        let emotesEnabled = true;

        const SURVIVOR_LIVES = 3;

        function makeStdAbilities(prefix, names, icons) {
            return [
                { id: prefix + '_utility', role: 'utility', name: names[0], icon: icons[0], maxCd: 12, activate: activateUtilityAbility },
                { id: prefix + '_scout', role: 'scout', name: names[1], icon: icons[1], maxCd: 15, activate: activateScoutAbility },
                { id: prefix + '_mobility', role: 'mobility', name: names[2], icon: icons[2], maxCd: 18, activate: activateMobilityAbility }
            ];
        }

        const CHARACTERS = {
            golfBall: {
                id: 'golfBall', name: 'Golf Ball', archetypeDefault: 'tactical',
                bodyGradient: ['#f8fafc', '#94a3b8'],
                stats: { r: 20, speed: 4, jumpPower: 12.5 },
                abilities: makeStdAbilities('golfBall', ['SpeedPad', 'Tracker', 'Jump Boost'], ['⚡', '🧭', '👟']),
                passive: { id: 'empRescue', name: 'Salvavidas EMP', desc: 'Si Golf Ball rescata/está campeada cerca del Killer por 2.5s, detona una onda que repele al Killer y revive.' },
                celebration: { id: 'calcDance', name: 'Baile del Cálculo Cuántico', sound: 'cheer_golfBall' },
                drawPortrait: (c, size) => drawBallPortrait(c, size, ['#f8fafc', '#94a3b8'], '👑')
            },
            bubble: {
                id: 'bubble', name: 'Bubble', archetypeDefault: 'helper',
                bodyGradient: ['#a5f3fc', '#0891b2'],
                stats: { r: 19, speed: 4.1, jumpPower: 12.0 },
                abilities: makeStdAbilities('bubble', ['Bubble Shield', 'Sonar Ping', 'Bounce Boost'], ['🫧', '📡', '🎈']),
                passive: { id: 'popShield', name: 'Piel Elástica', desc: 'La primera vez que Bubble recibiría un golpe letal en cada vida, sobrevive con 1 HP en vez de caer.' },
                celebration: { id: 'bubbleSquish', name: 'Rebote Burbujeante', sound: 'cheer_bubble' },
                drawPortrait: (c, size) => drawBallPortrait(c, size, ['#a5f3fc', '#0891b2'], '🫧')
            },
            coiny: {
                id: 'coiny', name: 'Coiny', archetypeDefault: 'juker',
                bodyGradient: ['#fef08a', '#b45309'],
                stats: { r: 19, speed: 4.2, jumpPower: 12.8 },
                abilities: makeStdAbilities('coiny', ['Lucky Pad', 'Coin Toss', 'Golden Leap'], ['🪙', '🎲', '✨']),
                passive: { id: 'luckyDodge', name: 'Suerte de Moneda', desc: 'Coiny tiene 18% de probabilidad de esquivar por completo cualquier golpe recibido.' },
                celebration: { id: 'coinSpin', name: 'Giro de Moneda de la Suerte', sound: 'cheer_coiny' },
                drawPortrait: (c, size) => drawBallPortrait(c, size, ['#fef08a', '#b45309'], '🪙')
            }
        };

        const ARCHETYPES = ['helper', 'tactical', 'coward', 'juker'];
        const CELEBRATION_CHANCE = { juker: 0.55, helper: 0.32, tactical: 0.15, coward: 0.05 };
        const CELEBRATION_TAUNT_CHANCE = { juker: 0.02, helper: 0.002, tactical: 0.0015, coward: 0.0002 };

        function getEntityCharacter(entity, isKillerEntity) {
            return isKillerEntity ? KILLERS[entity.characterId] : CHARACTERS[entity.characterId];
        }

        function startCelebration(entity, isPlayerAction) {
            if (!emotesEnabled) return;
            if (!gameActive) return;
            if (!entity || entity.state !== 'NORMAL') return;
            if (entity.celebrating) return;
            if (entity.usingItemTimer > 0 || entity.swordWindup > 0) return;
            if (isPlayerAction) {
                if ((entity.vx && Math.abs(entity.vx) > 0.1) || !entity.onGround) return;
            }
            entity.celebrating = true;
            entity.emoteTimer = 180;
            const character = getEntityCharacter(entity, entity === killer || (currentRole === 'killer' && entity === player));
            if (character) playSound(character.celebration.sound);
        }

        function cancelCelebration(entity) {
            if (entity && entity.celebrating) {
                entity.celebrating = false;
                entity.emoteTimer = 0;
            }
        }

        function updateCelebration(entity, isKillerEntity) {
            if (!entity.celebrating) return;
            entity.vx = 0;
            if (internalFrameCounter % 6 === 0) {
                const character = getEntityCharacter(entity, isKillerEntity);
                const sparkColor = isKillerEntity ? '#ef4444' : '#facc15';
                particles.push({
                    x: entity.x + (Math.random() - 0.5) * entity.r,
                    y: entity.y + (Math.random() - 0.5) * entity.r,
                    vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2 - 1,
                    r: Math.random() * 3 + 1.5, color: sparkColor, life: 25
                });
            }
            entity.emoteTimer--;
            if (entity.emoteTimer <= 0) entity.celebrating = false;
        }

        function maybeCelebrateBot(entity, baseChance) {
            if (!entity.isBot || entity.state !== 'NORMAL' || entity.celebrating) return;
            const mult = CELEBRATION_CHANCE[entity.archetype] !== undefined ? CELEBRATION_CHANCE[entity.archetype] : 0.2;
            if (Math.random() < baseChance * mult) startCelebration(entity, false);
        }

        function applyCelebrationTransform(celebrationId, entity, r) {
            if (celebrationId === 'calcDance') ctx.rotate(entity.emoteTimer * 0.14);
            else if (celebrationId === 'coinSpin') ctx.rotate(entity.emoteTimer * 0.25);
            else if (celebrationId === 'bubbleSquish') {
                const s = Math.sin(entity.emoteTimer * 0.35);
                ctx.scale(1 + s * 0.18, 1 - s * 0.18);
                ctx.translate(0, -Math.abs(s) * 8);
            } else if (celebrationId === 'mechaLaugh') {
                ctx.rotate(Math.sin(entity.emoteTimer * 0.5) * 0.25);
            }
        }


        function drawCelebrationBadge(r, celebrationName, color) {
            ctx.save();
            ctx.translate(0, -r - 35);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(-52, -18, 104, 25, 8); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-6, 7); ctx.lineTo(0, 14); ctx.lineTo(6, 7); ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; ctx.fill(); ctx.stroke();
            ctx.fillStyle = color; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`🎉 ${celebrationName}`, 0, -5);
            ctx.restore();
        }

        function drawBallPortrait(c, size, gradientColors, emojiTop) {
            c.save();
            c.translate(size / 2, size / 2 + 4);
            const r = size * 0.32;
            const grad = c.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
            grad.addColorStop(0, gradientColors[0]); grad.addColorStop(1, gradientColors[1]);
            c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = grad; c.fill();
            c.lineWidth = 2; c.strokeStyle = '#1e293b'; c.stroke();
            c.fillStyle = '#000';
            c.beginPath(); c.ellipse(-r * 0.28, -r * 0.1, r * 0.13, r * 0.32, 0, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.ellipse(r * 0.28, -r * 0.1, r * 0.13, r * 0.32, 0, 0, Math.PI * 2); c.fill();
            c.font = `${size * 0.28}px sans-serif`; c.textAlign = 'center'; c.fillText(emojiTop, 0, -r * 1.5);
            c.restore();
        }
