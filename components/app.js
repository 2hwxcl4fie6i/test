class DraggablePolygon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupDragAndDrop();
    }

    render() {
        const size = 40;
        const vertices = this.getAttribute('vertices') || getRandomNumber(3, 8);
        const points = this.getAttribute('points') || generatePolygonPoints(vertices, size);
        const hue = this.getAttribute('hue') || getRandomNumber(0, 360);

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    cursor: move;
                    transition: transform 0.2s;
                }

                :host(:hover) {
                    transform: scale(1.1);
                    z-index: 1;
                }

                svg {
                    width: ${size}px;
                    height: ${size}px;
                }

                polygon {
                    fill: hsla(${hue}, 70%, 60%, 0.8);
                    stroke: hsla(${hue}, 70%, 40%, 1);
                    stroke-width: 1;
                }
            </style>
            <svg viewBox="0 0 ${size} ${size}">
                <polygon points="${points}"></polygon>
            </svg>
        `;
    }

    setupDragAndDrop() {
        this.draggable = true;

        this.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', '');
            e.dataTransfer.effectAllowed = 'move';
            this.classList.add('dragging');
            
            const polygon = this.shadowRoot.querySelector('polygon');
            const data = {
                points: polygon.getAttribute('points'),
                vertices: this.getAttribute('vertices'),
                hue: this.shadowRoot.querySelector('polygon').style.fill.match(/\d+/)[0]
            };
            e.dataTransfer.setData('application/json', JSON.stringify(data));
        });

        this.addEventListener('dragend', () => {
            this.classList.remove('dragging');
        });
    }
}

customElements.define('draggable-polygon', DraggablePolygon);

class CustomButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['label'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const label = this.getAttribute('label') || 'Button';
        
        this.shadowRoot.innerHTML = `
            <style>
                .button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    background-color: var(--button-bg, #4CAF50);
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.3s;
                }

                .button:hover {
                    background-color: var(--button-hover, #45a049);
                }
            </style>
            <button class="button">${label}</button>
        `;

        this.shadowRoot.querySelector('button').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('button-click', {
                bubbles: true,
                composed: true
            }));
        });
    }
}

customElements.define('custom-button', CustomButton);

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePolygonPoints(vertices, size = 40) {
    const points = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 5;

    for (let i = 0; i < vertices; i++) {
        const angle = (i * 2 * Math.PI) / vertices;
        const currentRadius = radius * (0.8 + Math.random() * 0.4);
        const x = centerX + currentRadius * Math.cos(angle);
        const y = centerY + currentRadius * Math.sin(angle);
        points.push(`${x},${y}`);
    }

    return points.join(' ');
}

function createPolygon() {
    const vertices = getRandomNumber(3, 8);
    const polygon = document.createElement('draggable-polygon');
    polygon.setAttribute('vertices', vertices);
    return polygon;
}

function createPolygonsInBuffer() {
    const bufferZone = document.getElementById('bufferZone');
    bufferZone.innerHTML = '';
    
    bufferZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    bufferZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        
        const polygon = document.createElement('draggable-polygon');
        polygon.setAttribute('vertices', data.vertices);
        polygon.setAttribute('points', data.points);
        polygon.setAttribute('hue', data.hue);
        
        bufferZone.appendChild(polygon);
    });
    
    const polygonCount = getRandomNumber(5, 20);
    
    const polygonsContainer = document.createElement('div');
    polygonsContainer.style.display = 'flex';
    polygonsContainer.style.flexWrap = 'wrap';
    polygonsContainer.style.gap = '10px';
    polygonsContainer.style.padding = '10px';

    for (let i = 0; i < polygonCount; i++) {
        const polygon = createPolygon();
        polygonsContainer.appendChild(polygon);
    }

    bufferZone.appendChild(polygonsContainer);
}

class WorkZone extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.scale = 1;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.scrollLeft = 0;
        this.scrollTop = 0;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.setupDropZone();
        this.updateGridMarkers();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    position: relative;
                    overflow: hidden;
                }

                .grid-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    cursor: grab;
                }

                .grid-container.dragging {
                    cursor: grabbing;
                }

                .grid {
                    position: relative;
                    width: 200%;
                    height: 200%;
                    background-image: 
                        linear-gradient(var(--grid-color, #3a3a3a) 1px, transparent 1px),
                        linear-gradient(90deg, var(--grid-color, #3a3a3a) 1px, transparent 1px);
                    background-size: 
                        calc(20px * var(--scale, 1)) calc(20px * var(--scale, 1));
                    transform-origin: 0 0;
                }

                .markers {
                    position: absolute;
                    color: var(--grid-text, #888);
                    font-size: 12px;
                    pointer-events: none;
                }

                .vertical-markers {
                    left: 5px;
                    top: 0;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .horizontal-markers {
                    bottom: 5px;
                    left: 0;
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                }

                .marker {
                    position: absolute;
                    color: var(--grid-text, #888);
                    font-size: 12px;
                }
            </style>
            <div class="grid-container">
                <div class="grid"></div>
                <div class="markers vertical-markers"></div>
                <div class="markers horizontal-markers"></div>
            </div>
        `;
    }

    setupEventListeners() {
        const container = this.shadowRoot.querySelector('.grid-container');
        const grid = this.shadowRoot.querySelector('.grid');

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY;
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const oldScale = this.scale;
            this.scale = Math.min(Math.max(0.5, this.scale + (delta > 0 ? -0.1 : 0.1)), 3);

            grid.style.setProperty('--scale', this.scale);

            const scaleChange = this.scale / oldScale;
            container.scrollLeft = mouseX * (scaleChange - 1) + container.scrollLeft * scaleChange;
            container.scrollTop = mouseY * (scaleChange - 1) + container.scrollTop * scaleChange;

            requestAnimationFrame(() => {
                this.updateGridMarkers();
            });
        });

        container.addEventListener('mousedown', (e) => {
            if (e.target === container || e.target === grid) {
                this.isDragging = true;
                container.classList.add('dragging');
                this.startX = e.clientX;
                this.startY = e.clientY;
                this.scrollLeft = container.scrollLeft;
                this.scrollTop = container.scrollTop;
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            e.preventDefault();
            const x = e.clientX;
            const y = e.clientY;
            const walkX = (this.startX - x);
            const walkY = (this.startY - y);
            container.scrollLeft = this.scrollLeft + walkX;
            container.scrollTop = this.scrollTop + walkY;
        });

        container.addEventListener('mouseup', () => this.stopDragging());
        container.addEventListener('mouseleave', () => this.stopDragging());
    }

    stopDragging() {
        if (this.isDragging) {
            this.isDragging = false;
            this.shadowRoot.querySelector('.grid-container').classList.remove('dragging');
        }
    }

    setupDropZone() {
        const container = this.shadowRoot.querySelector('.grid-container');

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left + container.scrollLeft;
            const y = e.clientY - rect.top + container.scrollTop;

            const polygon = document.createElement('draggable-polygon');
            polygon.setAttribute('vertices', data.vertices);
            polygon.setAttribute('points', data.points);
            polygon.setAttribute('hue', data.hue);
            polygon.style.position = 'absolute';
            polygon.style.left = `${x}px`;
            polygon.style.top = `${y}px`;

            container.appendChild(polygon);
        });
    }

    updateGridMarkers() {
        const container = this.shadowRoot.querySelector('.grid-container');
        const verticalMarkers = this.shadowRoot.querySelector('.vertical-markers');
        const horizontalMarkers = this.shadowRoot.querySelector('.horizontal-markers');
        
        verticalMarkers.innerHTML = '';
        horizontalMarkers.innerHTML = '';

        const cellSize = 20 * this.scale;
        const step = Math.max(5, Math.floor(10 / this.scale));

        const visibleStartY = Math.floor(container.scrollTop / cellSize);
        const visibleEndY = Math.ceil((container.scrollTop + container.clientHeight) / cellSize);

        for (let i = Math.floor(visibleStartY / step) * step; i <= Math.ceil(visibleEndY / step) * step; i += step) {
            if (i > 0) {
                const marker = document.createElement('div');
                marker.className = 'marker';
                marker.textContent = i.toString();
                const position = ((i * cellSize - container.scrollTop) / container.clientHeight) * 100;
                if (position >= 0 && position <= 100) {
                    marker.style.top = `${position}%`;
                    verticalMarkers.appendChild(marker);
                }
            }
        }

        const visibleStartX = Math.floor(container.scrollLeft / cellSize);
        const visibleEndX = Math.ceil((container.scrollLeft + container.clientWidth) / cellSize);

        for (let i = Math.floor(visibleStartX / step) * step; i <= Math.ceil(visibleEndX / step) * step; i += step) {
            if (i > 0) {
                const marker = document.createElement('div');
                marker.className = 'marker';
                marker.textContent = i.toString();
                const position = ((i * cellSize - container.scrollLeft) / container.clientWidth) * 100;
                if (position >= 0 && position <= 100) {
                    marker.style.left = `${position}%`;
                    horizontalMarkers.appendChild(marker);
                }
            }
        }
    }
}

customElements.define('work-zone', WorkZone);

function initializeEventListeners() {
    const createButton = document.querySelector('custom-button[label="Создать"]');
    createButton.addEventListener('button-click', createPolygonsInBuffer);

    const resetButton = document.querySelector('custom-button[label="Сбросить"]');
    resetButton.addEventListener('button-click', () => {
        const bufferZone = document.getElementById('bufferZone');
        bufferZone.innerHTML = '';
    });
}

function initializeApp() {
    initializeEventListeners();
    createPolygonsInBuffer();
}

document.addEventListener('DOMContentLoaded', initializeApp); 