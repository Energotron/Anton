/**
 * Space Rangers 3: Children of Eltan
 * Machpella Reality Distortion Field Effect System
 * 
 * Этот модуль управляет эффектами "Полей Искажения Махпеллы" (Machpella Distortion Fields).
 * Искажения влияют на навигацию, сенсоры и целостность корпуса корабля.
 * 
 * @module game/webgl/src/distortionFieldEffect
 */

// Уровни интенсивности искажения
export const DISTORTION_LEVELS = {
    STABLE: 0.1,    // Стабильное пространство
    FLUX: 0.3,      // Локальные флуктуации
    WARP: 0.6,      // Деформация реальности
    CRITICAL: 0.9,  // Критическая нестабильность
    COLLAPSE: 1.0   // Коллапс реальности
};

/**
 * Расчет локальной интенсивности искажения на основе источников.
 * 
 * @param {Object} pos - Текущая позиция корабля {x, y, z}
 * @param {Array<Object>} sources - Список источников {pos: {x,y,z}, power: number}
 * @returns {number} Интенсивность от 0.0 до 1.0
 */
export function getLocalDistortion(pos, sources = []) {
    if (!sources || sources.length === 0) return 0;

    let intensity = 0;
    for (const source of sources) {
        const dx = pos.x - source.pos.x;
        const dy = pos.y - source.pos.y;
        const dz = pos.z - source.pos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        
        // Закон обратных квадратов с мягким ограничением в центре
        intensity += source.power / (distSq + 100);
    }

    return Math.min(intensity, 1.0);
}

/**
 * Применение дебаффов искажения к параметрам корабля.
 * 
 * @param {Object} stats - Объект характеристик корабля
 * @param {number} intensity - Интенсивность (0-1)
 * @returns {Object} Измененные характеристики
 */
export function applyDistortionToStats(stats, intensity) {
    const result = { ...stats };

    // Искажение сенсоров (радар)
    if (intensity > DISTORTION_LEVELS.STABLE) {
        const radarPenalty = 1 - (intensity * 0.45);
        result.radarRange = Math.max(1, (stats.radarRange || 100) * radarPenalty);
    }

    // Влияние на гипердвигатель и маневренность
    if (intensity > DISTORTION_LEVELS.FLUX) {
        const enginePenalty = 1 - (intensity * 0.3);
        result.speed = (stats.speed || 400) * enginePenalty;
        result.agility = (stats.agility || 10) * enginePenalty;
    }

    // Шанс спонтанного повреждения корпуса при критических уровнях
    if (intensity > DISTORTION_LEVELS.WARP) {
        result.hullDegradation = (intensity - DISTORTION_LEVELS.WARP) * 0.05;
    }

    return result;
}

/**
 * Возвращает описание состояния для бортового компьютера.
 * 
 * @param {number} intensity 
 * @returns {string} Текст уведомления (RU)
 */
export function getDistortionStatusMessage(intensity) {
    if (intensity < DISTORTION_LEVELS.STABLE) return 'Пространство в пределах нормы.';
    if (intensity < DISTORTION_LEVELS.FLUX) return 'Обнаружены фоновые искажения метрики.';
    if (intensity < DISTORTION_LEVELS.WARP) return 'Внимание: Поле Махпеллы вызывает сбои в работе радара.';
    if (intensity < DISTORTION_LEVELS.CRITICAL) return 'ОПАСНОСТЬ: Деформация реальности! Системы корабля работают на пределе.';
    return 'КРИТИЧЕСКИЙ СБОЙ: Угроза дезинтеграции материи. Срочно покиньте зону!';
}

/**
 * Вычисляет визуальное дрожание (jitter) для камеры или моделей.
 * 
 * @param {number} intensity 
 * @param {number} time - Текущее игровое время
 * @returns {Object} Смещение {x, y, z}
 */
export function calculateVisualJitter(intensity, time) {
    if (intensity < DISTORTION_LEVELS.FLUX) return { x: 0, y: 0, z: 0 };

    const amplitude = (intensity - DISTORTION_LEVELS.FLUX) * 0.5;
    const freq = 20.0;

    return {
        x: Math.sin(time * freq) * amplitude * Math.random(),
        y: Math.cos(time * freq * 1.1) * amplitude * Math.random(),
        z: Math.sin(time * freq * 0.8) * amplitude * Math.random()
    };
}
