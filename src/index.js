import './styles/main.css';

import './components/CustomButton';
import './components/DraggablePolygon';
import './components/WorkZone';

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createPolygonsInBuffer() {
    const bufferZone = document.getElementById('bufferZone');
    bufferZone.innerHTML = '';
    
    const polygonCount = getRandomNumber(5, 20);
    const polygonsContainer = document.createElement('div');
    polygonsContainer.style.display = 'flex';
    polygonsContainer.style.flexWrap = 'wrap';
    polygonsContainer.style.gap = '10px';
    polygonsContainer.style.padding = '10px';

    for (let i = 0; i < polygonCount; i++) {
        const polygon = document.createElement('draggable-polygon');
        polygon.setAttribute('vertices', getRandomNumber(3, 8));
        polygonsContainer.appendChild(polygon);
    }

    bufferZone.appendChild(polygonsContainer);
}

function initializeEventListeners() {
    const createButton = document.querySelector('custom-button[label="Создать"]');
    createButton.addEventListener('button-click', createPolygonsInBuffer);

    const saveButton = document.querySelector('custom-button[label="Сохранить"]');
    saveButton.addEventListener('button-click', () => {});

    const resetButton = document.querySelector('custom-button[label="Сбросить"]');
    resetButton.addEventListener('button-click', () => {
        const bufferZone = document.getElementById('bufferZone');
        bufferZone.innerHTML = '';
    });

    const bufferZone = document.getElementById('bufferZone');
    
    document.querySelector('work-zone').addEventListener('dragstart', (e) => {
        const polygon = e.target.closest('draggable-polygon');
        if (polygon) {
            polygon.dataset.source = 'workzone';
        }
    });

    bufferZone.addEventListener('dragstart', (e) => {
        const polygon = e.target.closest('draggable-polygon');
        if (polygon) {
            polygon.dataset.source = 'buffer';
        }
    });

    bufferZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        try {
            const dragData = e.dataTransfer.getData('application/json');
            if (dragData) {
                const data = JSON.parse(dragData);
                if (data.fromWorkZone) {
                    e.dataTransfer.dropEffect = 'none';
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking drag source:', error);
        }
        e.dataTransfer.dropEffect = 'move';
    });

    bufferZone.addEventListener('drop', (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.fromWorkZone) {
                return;
            }
            
            const polygon = document.createElement('draggable-polygon');
            polygon.setAttribute('vertices', data.vertices);
            polygon.setAttribute('points', data.points);
            polygon.setAttribute('size', data.size);
            bufferZone.appendChild(polygon);
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    });

    document.querySelector('work-zone').addEventListener('drop', (e) => {
        const draggedPolygon = document.querySelector('draggable-polygon.dragging');
        if (draggedPolygon && draggedPolygon.dataset.source === 'buffer') {
            draggedPolygon.classList.add('removing');
            draggedPolygon.addEventListener('transitionend', () => {
                draggedPolygon.remove();
            }, { once: true });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
}); 