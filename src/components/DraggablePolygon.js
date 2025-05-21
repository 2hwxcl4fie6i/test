import { getRandomNumber, generatePolygonPoints } from '../utils/polygonUtils';

export class DraggablePolygon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._size = 40;
    }

    connectedCallback() {
        this.render();
        this.setupDragAndDrop();
    }

    render() {
        const vertices = this.getAttribute('vertices') || getRandomNumber(3, 8);
        const points = this.getAttribute('points') || generatePolygonPoints(vertices, this._size);
        const viewBox = `0 0 ${this._size} ${this._size}`;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    cursor: move;
                    transition: transform 0.2s;
                    width: ${this._size}px;
                    height: ${this._size}px;
                }

                :host(:hover) {
                    transform: scale(1.1);
                    z-index: 1;
                }

                svg {
                    width: 100%;
                    height: 100%;
                    display: block;
                }

                polygon {
                    fill: rgba(220, 53, 69, 0.6);
                    stroke: rgba(220, 53, 69, 0.8);
                    stroke-width: 1;
                    vector-effect: non-scaling-stroke;
                }
            </style>
            <svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">
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
            const svg = this.shadowRoot.querySelector('svg');
            const data = {
                points: polygon.getAttribute('points'),
                vertices: this.getAttribute('vertices'),
                size: this._size,
                viewBox: svg.getAttribute('viewBox')
            };
            e.dataTransfer.setData('application/json', JSON.stringify(data));
        });

        this.addEventListener('dragend', () => {
            this.classList.remove('dragging');
        });
    }
}

customElements.define('draggable-polygon', DraggablePolygon); 