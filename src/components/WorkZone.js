export class WorkZone extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.scale = 1;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.scrollLeft = 0;
        this.scrollTop = 0;
        this.draggedPolygon = null;
        this.viewportStart = { x: 0, y: 0 };
        this.maxValues = { x: 100, y: 50 };
        this.minValues = { x: 0, y: 0 };
        this.currentValues = { x: 100, y: 50 };
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.setupDropZone();
        this.updateGridMarkers();
        this.loadPolygons();
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

                .workspace {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    padding-left: 30px;
                    padding-bottom: 25px;
                    box-sizing: border-box;
                }

                .grid-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    cursor: grab;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }

                .grid-container::-webkit-scrollbar {
                    display: none;
                }

                .grid-container.dragging {
                    cursor: grabbing;
                }

                .grid {
                    position: relative;
                    width: 200%;
                    height: 200%;
                    background-image: 
                        linear-gradient(var(--color-grid) 1px, transparent 1px),
                        linear-gradient(90deg, var(--color-grid) 1px, transparent 1px);
                    background-size: 
                        calc(20px * var(--scale, 1)) calc(20px * var(--scale, 1));
                    transform-origin: 0 0;
                }

                .polygons-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 200%;
                    height: 200%;
                    transform-origin: 0 0;
                    pointer-events: none;
                    z-index: 1;
                }

                .polygons-container draggable-polygon {
                    pointer-events: all;
                    position: absolute;
                    transform-origin: center center;
                    z-index: 2;
                    cursor: grab;
                }

                .polygons-container draggable-polygon.dragging {
                    cursor: grabbing;
                }

                .markers {
                    position: absolute;
                    background-color: var(--color-background);
                    color: var(--color-text);
                    font-size: 12px;
                    font-weight: 700;
                    pointer-events: none;
                    display: flex;
                    z-index: 1;
                }

                .vertical-markers {
                    left: 0;
                    top: 0;
                    width: 30px;
                    height: calc(100% - 25px);
                    flex-direction: column;
                    justify-content: flex-start;
                    border-right: 1px solid var(--color-border);
                    box-sizing: border-box;
                }

                .horizontal-markers {
                    left: 30px;
                    bottom: 0;
                    width: calc(100% - 30px);
                    height: 25px;
                    flex-direction: row;
                    justify-content: flex-start;
                    border-top: 1px solid var(--color-border);
                    box-sizing: border-box;
                }

                .marker {
                    position: absolute;
                    color: var(--color-text);
                    font-size: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                }

                .vertical-marker {
                    width: 100%;
                    height: 20px;
                    padding: 0 2px;
                }

                .horizontal-marker {
                    height: 100%;
                    width: 30px;
                    padding: 2px 0;
                }

                .corner-marker {
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    width: 30px;
                    height: 25px;
                    background-color: var(--color-background);
                    border-right: 1px solid var(--color-border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    color: var(--color-text);
                    font-size: 12px;
                    font-weight: 700;
                    box-sizing: border-box;
                }
            </style>
            <div class="workspace">
                <div class="markers vertical-markers"></div>
                <div class="markers horizontal-markers"></div>
                <div class="corner-marker">0</div>
                <div class="grid-container">
                    <div class="grid"></div>
                    <div class="polygons-container"></div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const container = this.shadowRoot.querySelector('.grid-container');
        const grid = this.shadowRoot.querySelector('.grid');
        const polygonsContainer = this.shadowRoot.querySelector('.polygons-container');

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY;
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const oldScale = this.scale;
            this.scale = Math.min(Math.max(0.5, this.scale + (delta > 0 ? -0.1 : 0.1)), 3);

            grid.style.setProperty('--scale', this.scale);
            if (polygonsContainer) {
                polygonsContainer.style.transform = `scale(${this.scale})`;
            }

            const scaleChange = this.scale / oldScale;
            container.scrollLeft = mouseX * (scaleChange - 1) + container.scrollLeft * scaleChange;
            container.scrollTop = mouseY * (scaleChange - 1) + container.scrollTop * scaleChange;

            requestAnimationFrame(() => {
                this.updateViewport();
                this.updateGridMarkers();
            });
        });

        container.addEventListener('mousedown', (e) => {
            if (e.target === container || e.target === grid || e.target === polygonsContainer) {
                this.isDragging = true;
                container.classList.add('dragging');
                this.startX = e.clientX;
                this.startY = e.clientY;
                this.initialScrollLeft = container.scrollLeft;
                this.initialScrollTop = container.scrollTop;
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            e.preventDefault();
            
            const x = e.clientX;
            const y = e.clientY;
            
            const walkX = (this.startX - x);
            const walkY = (this.startY - y);
            
            container.scrollLeft = Math.max(0, this.initialScrollLeft + walkX);
            container.scrollTop = Math.max(0, this.initialScrollTop + walkY);

            this.updateViewport();
            this.updateGridMarkers();
        });

        container.addEventListener('scroll', () => {
            requestAnimationFrame(() => {
                this.updateViewport();
                this.updateGridMarkers();
            });
        });

        container.addEventListener('mouseup', () => this.stopDragging());
        container.addEventListener('mouseleave', () => this.stopDragging());

        document.addEventListener('button-click', (e) => {
            const button = e.target;
            const label = button.getAttribute('label');

            if (label === 'Сохранить') {
                this.savePolygons();
            } else if (label === 'Сбросить') {
                this.resetPolygons();
            }
        });
    }

    stopDragging() {
        if (this.isDragging) {
            this.isDragging = false;
            this.shadowRoot.querySelector('.grid-container').classList.remove('dragging');
        }
    }

    setupDropZone() {
        const gridContainer = this.shadowRoot.querySelector('.grid-container');
        const polygonsContainer = this.shadowRoot.querySelector('.polygons-container');

        gridContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        gridContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const rect = gridContainer.getBoundingClientRect();
            const x = (e.clientX - rect.left + gridContainer.scrollLeft) / this.scale;
            const y = (e.clientY - rect.top + gridContainer.scrollTop) / this.scale;

            if (this.draggedPolygon && polygonsContainer.contains(this.draggedPolygon)) {
                this.draggedPolygon.style.left = `${x}px`;
                this.draggedPolygon.style.top = `${y}px`;
                this.draggedPolygon.classList.remove('dragging');
            } else {
                try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    const polygon = document.createElement('draggable-polygon');
                    
                    polygon.setAttribute('vertices', data.vertices);
                    polygon.setAttribute('points', data.points);
                    polygon.setAttribute('size', data.size);
                    if (data.viewBox) {
                        polygon.shadowRoot?.querySelector('svg')?.setAttribute('viewBox', data.viewBox);
                    }
                    
                    polygon.style.position = 'absolute';
                    polygon.style.left = `${x}px`;
                    polygon.style.top = `${y}px`;
                    polygon.setAttribute('data-in-workzone', 'true');
                    
                    polygonsContainer.appendChild(polygon);

                    const originalPolygon = document.querySelector('draggable-polygon.dragging');
                    if (originalPolygon) {
                        originalPolygon.remove();
                    }
                } catch (error) {
                    console.error('Error creating new polygon:', error);
                }
            }

            this.draggedPolygon = null;
        });

        polygonsContainer.addEventListener('dragstart', (e) => {
            const polygon = e.target.closest('draggable-polygon');
            if (polygon && polygonsContainer.contains(polygon)) {
                this.draggedPolygon = polygon;
                polygon.classList.add('dragging');
                
                const svg = polygon.shadowRoot?.querySelector('svg');
                const data = {
                    points: polygon.getAttribute('points'),
                    vertices: polygon.getAttribute('vertices'),
                    size: polygon.getAttribute('size'),
                    viewBox: svg?.getAttribute('viewBox'),
                    fromWorkZone: true
                };
                e.dataTransfer.setData('application/json', JSON.stringify(data));
            }
        });

        polygonsContainer.addEventListener('dragend', (e) => {
            if (this.draggedPolygon) {
                this.draggedPolygon.classList.remove('dragging');
                this.draggedPolygon = null;
            }
        });
    }

    updateViewport() {
        const container = this.shadowRoot.querySelector('.grid-container');
        const { scrollLeft, scrollTop, clientWidth, clientHeight } = container;

        const cellSize = 20 * this.scale;

        const visibleCellsX = Math.ceil(clientWidth / cellSize);
        const visibleCellsY = Math.ceil(clientHeight / cellSize);

        const currentX = Math.floor(scrollLeft / cellSize);
        const currentY = Math.floor(scrollTop / cellSize);

        this.viewportStart = {
            x: Math.max(0, currentX),
            y: Math.max(0, currentY)
        };

        this.currentValues = {
            x: Math.max(this.maxValues.x, currentX + visibleCellsX),
            y: Math.max(this.maxValues.y, currentY + visibleCellsY)
        };

        const grid = this.shadowRoot.querySelector('.grid');
        const polygonsContainer = this.shadowRoot.querySelector('.polygons-container');
        
        const minWidth = Math.max(this.currentValues.x * cellSize, clientWidth * 2);
        const minHeight = Math.max(this.currentValues.y * cellSize, clientHeight * 2);
        
        grid.style.width = `${minWidth}px`;
        grid.style.height = `${minHeight}px`;
        
        if (polygonsContainer) {
            polygonsContainer.style.width = `${minWidth}px`;
            polygonsContainer.style.height = `${minHeight}px`;
        }
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
                marker.className = 'marker vertical-marker';
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
                marker.className = 'marker horizontal-marker';
                marker.textContent = i.toString();
                const position = ((i * cellSize - container.scrollLeft) / container.clientWidth) * 100;
                if (position >= 0 && position <= 100) {
                    marker.style.left = `${position}%`;
                    horizontalMarkers.appendChild(marker);
                }
            }
        }
    }

    savePolygons() {
        const container = this.shadowRoot.querySelector('.polygons-container');
        const polygons = container.querySelectorAll('draggable-polygon');
        const polygonsData = Array.from(polygons).map(polygon => {
            const svgPolygon = polygon.shadowRoot?.querySelector('polygon');
            return {
                vertices: polygon.getAttribute('vertices'),
                points: svgPolygon?.getAttribute('points') || polygon.getAttribute('points'),
                size: polygon.getAttribute('size'),
                position: {
                    left: polygon.style.left,
                    top: polygon.style.top
                },
                transform: polygon.style.transform,
                scale: this.scale
            };
        });

        localStorage.setItem('workzone-polygons', JSON.stringify(polygonsData));
    }

    loadPolygons() {
        const savedData = localStorage.getItem('workzone-polygons');
        if (!savedData) return;

        try {
            const container = this.shadowRoot.querySelector('.polygons-container');
            container.innerHTML = '';
            
            const polygonsData = JSON.parse(savedData);

            polygonsData.forEach(data => {
                const polygon = document.createElement('draggable-polygon');
                polygon.setAttribute('vertices', data.vertices);
                polygon.setAttribute('points', data.points);
                polygon.setAttribute('size', data.size);
                polygon.style.position = 'absolute';
                polygon.style.left = data.position.left;
                polygon.style.top = data.position.top;
                
                if (data.scale && this.scale !== data.scale) {
                    const scaleRatio = this.scale / data.scale;
                    polygon.style.transform = `scale(${scaleRatio})`;
                } else {
                    polygon.style.transform = data.transform || 'scale(1)';
                }
                
                container.appendChild(polygon);
            });
        } catch (error) {
            console.error('Error loading polygons:', error);
        }
    }

    resetPolygons() {
        const container = this.shadowRoot.querySelector('.polygons-container');
        container.innerHTML = '';
        localStorage.removeItem('workzone-polygons');
    }
}

customElements.define('work-zone', WorkZone); 