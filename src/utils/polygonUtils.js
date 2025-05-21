export function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generatePolygonPoints(vertices, size) {
    const points = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 5;

    for (let i = 0; i < vertices; i++) {
        const angle = (i * 2 * Math.PI) / vertices;
        const currentRadius = radius * (0.6 + Math.random() * 0.8);
        const x = centerX + currentRadius * Math.cos(angle);
        const y = centerY + currentRadius * Math.sin(angle);
        points.push(`${x},${y}`);
    }

    return points.join(' ');
} 