        function activateUtilityAbility(entity) {
            if (!entity.onGround) {
                if (entity === player) triggerSystemAlert("¡ERROR! Necesitas estar apoyado en el suelo.");
                return false;
            }
            if (entity === player) triggerSystemAlert("CANALIZANDO DISPOSITIVO DE UTILIDAD (1.5S)...");
            entity.buildingSpeedpadTimer = 90;
            return true;
        }
        function activateScoutAbility(entity) {
            playSound('tracker');
            entity.trackerSlowTimer = 120;
            if (entity === player) { activeTrackerArrow = 180; triggerSystemAlert("RASTREANDO COORDENADAS... SISTEMA RALENTIZADO 2S"); }
            return true;
        }
        function activateMobilityAbility(entity) {
            entity.jumpBoostCharge = 30;
            if (entity === player) triggerSystemAlert("PREPARANDO PROPULSOR HIDRÁULICO...");
            return true;
        }
        function activateKillerRanged(entity) {
            entity.fireBlastCharge = 120;
            if (entity === player) triggerSystemAlert("CALIBRANDO CAÑÓN TÉRMICO (AIMBOT)...");
            return true;
        }
        function activateKillerSummon(entity) {
            if (activeDrones.length >= 4) activeDrones.shift();
            playSound('drone');
            activeDrones.push({ x: entity.x, y: entity.y - 25, r: 15, radarRadius: 130, shootCd: 0, pulseWave: 0, buildProgress: 0, buildMax: 120 });
            if (entity === player) triggerSystemAlert("DESPLEGANDO DRON: ENSAMBLAJE EN CURSO...");
            return true;
        }
        function activateKillerScan(entity) {
            playSound('tracker');
            activeGlobalEye = 300;
            if (entity === player) triggerSystemAlert("ESCANEANDO FIRMAS DE CALOR (5S)");
            return true;
        }

        let activeTrackerArrow = 0;
        let activeGlobalEye = 0;

        function triggerSkill(index) {
            if (!gameActive || currentRole !== 'survivor' && currentRole !== 'killer') return;
            const skill = player.abilities[index];
            if (!skill || skill.cd > 0) return;
            if (player.state !== 'NORMAL' && currentRole === 'survivor') return;
            if (player.usingItemTimer > 0 || player.swordWindup > 0) return;
            if (skill.activate(player)) skill.cd = skill.maxCd;
        }

        function findAbilityByRole(entity, role) { return entity.abilities.find(a => a.role === role); }

