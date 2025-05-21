export class CustomButton extends HTMLElement {
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
                    background-color: var(--color-button);
                    color: var(--color-text);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 700;
                    transition: background-color 0.3s;
                }

                .button:hover {
                    background-color: var(--color-button-hover);
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