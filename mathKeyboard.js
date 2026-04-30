/**
 * ============================================================================
 * DESMOS-STYLE MATH KEYBOARD
 * ============================================================================
 */

class MathKeyboard {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            showPreview: options.showPreview ?? true,
            ...options
        };

        this.container = null;
        this.previewElement = null;
        this.keyDefinitions = this.getKeyDefinitions();

        this.build();
        this.attachEventListeners();
        this.updatePreview();
    }

    getKeyDefinitions() {
        return {
            equations: [
                { label: 'y =', value: 'y = ', type: 'template' },
                { label: 'x =', value: 'x = ', type: 'template' },
                { label: 'r =', value: 'r = ', type: 'template' }
            ],
            numbers: [
                { label: '7', value: '7', type: 'number' },
                { label: '8', value: '8', type: 'number' },
                { label: '9', value: '9', type: 'number' },
                { label: '/', value: '/', type: 'operator' },
                { label: '4', value: '4', type: 'number' },
                { label: '5', value: '5', type: 'number' },
                { label: '6', value: '6', type: 'number' },
                { label: '*', value: '*', type: 'operator' },
                { label: '1', value: '1', type: 'number' },
                { label: '2', value: '2', type: 'number' },
                { label: '3', value: '3', type: 'number' },
                { label: '-', value: '-', type: 'operator' },
                { label: '0', value: '0', type: 'number' },
                { label: '.', value: '.', type: 'number' },
                { label: '=', value: ' = ', type: 'operator' },
                { label: '+', value: '+', type: 'operator' }
            ],
            variables: [
                { label: 'x', value: 'x', type: 'variable' },
                { label: 'y', value: 'y', type: 'variable' },
                { label: 'theta', value: 'theta', type: 'variable' },
                { label: 't', value: 't', type: 'variable' },
                { label: 'a', value: 'a', type: 'variable' },
                { label: 'b', value: 'b', type: 'variable' },
                { label: 'pi', value: 'pi', type: 'constant' },
                { label: 'e', value: 'e', type: 'constant' }
            ],
            grouping: [
                { label: '(', value: '(', type: 'grouping' },
                { label: ')', value: ')', type: 'grouping' },
                { label: '[', value: '[', type: 'grouping' },
                { label: ']', value: ']', type: 'grouping' },
                { label: '{', value: '{', type: 'grouping' },
                { label: '}', value: '}', type: 'grouping' },
                { label: '|', value: '|', type: 'grouping' },
                { label: ',', value: ', ', type: 'grouping' }
            ],
            powers: [
                { label: 'x^2', value: '^2', type: 'power' },
                { label: 'x^3', value: '^3', type: 'power' },
                { label: 'x^n', value: '^', type: 'power' },
                { label: 'sqrt', value: 'sqrt(', type: 'function' },
                { label: '1/x', value: '1/', type: 'fraction' },
                { label: 'abs', value: 'abs(', type: 'function' },
                { label: 'cbrt', value: 'cbrt(', type: 'function' },
                { label: 'root', value: 'root(', type: 'function' }
            ],
            trig: [
                { label: 'sin', value: 'sin(', type: 'function' },
                { label: 'cos', value: 'cos(', type: 'function' },
                { label: 'tan', value: 'tan(', type: 'function' },
                { label: 'sec', value: 'sec(', type: 'function' },
                { label: 'csc', value: 'csc(', type: 'function' },
                { label: 'cot', value: 'cot(', type: 'function' },
                { label: 'asin', value: 'asin(', type: 'function' },
                { label: 'acos', value: 'acos(', type: 'function' },
                { label: 'atan', value: 'atan(', type: 'function' }
            ],
            logExp: [
                { label: 'ln', value: 'ln(', type: 'function' },
                { label: 'log', value: 'log(', type: 'function' },
                { label: 'log10', value: 'log10(', type: 'function' },
                { label: 'log2', value: 'log2(', type: 'function' },
                { label: 'e^x', value: 'e^', type: 'function' }
            ],
            utility: [
                { label: 'min', value: 'min(', type: 'function' },
                { label: 'max', value: 'max(', type: 'function' },
                { label: 'clamp', value: 'clamp(', type: 'function' },
                { label: 'floor', value: 'floor(', type: 'function' },
                { label: 'ceil', value: 'ceil(', type: 'function' },
                { label: 'round', value: 'round(', type: 'function' },
                { label: 'step', value: 'step(', type: 'function' },
                { label: 'sigmoid', value: 'sigmoid(', type: 'function' }
            ],
            comparison: [
                { label: '<', value: ' < ', type: 'operator' },
                { label: '>', value: ' > ', type: 'operator' },
                { label: '<=', value: ' <= ', type: 'operator' },
                { label: '>=', value: ' >= ', type: 'operator' },
                { label: '!=', value: ' != ', type: 'operator' }
            ]
        };
    }

    build() {
        this.container = document.createElement('div');
        this.container.className = 'math-keyboard';

        if (this.options.showPreview) {
            this.previewElement = document.createElement('div');
            this.previewElement.className = 'math-preview';
            this.previewElement.innerHTML = '<span class="preview-placeholder">Equation preview</span>';
            this.container.appendChild(this.previewElement);
        }

        const tabBar = document.createElement('div');
        tabBar.className = 'keyboard-tabs';

        [
            { id: 'basic', label: '123' },
            { id: 'functions', label: 'f(x)' },
            { id: 'advanced', label: 'More' }
        ].forEach((tab, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'keyboard-tab' + (index === 0 ? ' active' : '');
            tabBtn.dataset.panel = tab.id;
            tabBtn.type = 'button';
            tabBtn.textContent = tab.label;
            tabBtn.addEventListener('click', () => this.switchPanel(tab.id));
            tabBar.appendChild(tabBtn);
        });

        this.container.appendChild(tabBar);

        const panels = document.createElement('div');
        panels.className = 'keyboard-panel-container';

        const basicPanel = this.createPanel('basic', [
            this.createKeyGroup('Quick', 'equations', 'grid-3'),
            this.createKeyGroup('Numbers', 'numbers', 'grid-4'),
            this.createKeyGroup('Variables', 'variables', 'grid-4'),
            this.createKeyGroup('Brackets', 'grouping', 'grid-4')
        ]);
        basicPanel.classList.add('active');
        panels.appendChild(basicPanel);

        panels.appendChild(this.createPanel('functions', [
            this.createKeyGroup('Powers and roots', 'powers', 'grid-4'),
            this.createKeyGroup('Trigonometry', 'trig', 'grid-3'),
            this.createKeyGroup('Log and exp', 'logExp', 'grid-4')
        ]));

        panels.appendChild(this.createPanel('advanced', [
            this.createKeyGroup('Compare', 'comparison', 'grid-5'),
            this.createKeyGroup('Utility', 'utility', 'grid-4')
        ]));

        this.container.appendChild(panels);

        const actionBar = document.createElement('div');
        actionBar.className = 'keyboard-actions';

        [
            { label: '<', action: 'left', className: 'action-nav' },
            { label: '>', action: 'right', className: 'action-nav' },
            { label: 'Backspace', action: 'backspace', className: 'action-delete' },
            { label: 'Clear', action: 'clear', className: 'action-clear' },
            { label: 'Plot', action: 'submit', className: 'action-submit' }
        ].forEach((action) => {
            const btn = document.createElement('button');
            btn.className = 'keyboard-action ' + action.className;
            btn.textContent = action.label;
            btn.type = 'button';
            btn.addEventListener('click', () => this.handleAction(action.action));
            actionBar.appendChild(btn);
        });

        this.container.appendChild(actionBar);

        const mount = document.getElementById('mathKeyboardMount');
        if (mount) {
            mount.appendChild(this.container);
        } else {
            this.input.parentNode.insertBefore(this.container, this.input.nextSibling);
        }
    }

    createPanel(id, groups) {
        const panel = document.createElement('div');
        panel.className = 'keyboard-panel';
        panel.dataset.panel = id;
        groups.forEach((group) => panel.appendChild(group));
        return panel;
    }

    createKeyGroup(title, category, gridClass = '') {
        const group = document.createElement('div');
        group.className = 'key-group';

        const titleEl = document.createElement('div');
        titleEl.className = 'key-group-title';
        titleEl.textContent = title;
        group.appendChild(titleEl);

        const container = document.createElement('div');
        container.className = 'keys-container ' + gridClass;

        this.keyDefinitions[category].forEach((keyDef) => {
            const btn = document.createElement('button');
            btn.className = 'keyboard-key key-' + keyDef.type;
            btn.textContent = keyDef.label;
            btn.type = 'button';
            btn.addEventListener('click', () => this.insert(keyDef.value));
            container.appendChild(btn);
        });

        group.appendChild(container);
        return group;
    }

    switchPanel(panelId) {
        this.container.querySelectorAll('.keyboard-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.panel === panelId);
        });
        this.container.querySelectorAll('.keyboard-panel').forEach((panel) => {
            panel.classList.toggle('active', panel.dataset.panel === panelId);
        });
    }

    insert(value) {
        const pos = this.input.selectionStart ?? this.input.value.length;
        const before = this.input.value.slice(0, pos);
        const after = this.input.value.slice(pos);
        this.input.value = before + value + after;

        const newPos = pos + value.length;
        this.input.focus();
        this.input.setSelectionRange(newPos, newPos);
        this.updatePreview();
    }

    handleAction(action) {
        const pos = this.input.selectionStart ?? 0;
        const value = this.input.value;

        if (action === 'backspace' && pos > 0) {
            const count = this.getDeleteCount(value, pos);
            this.input.value = value.slice(0, pos - count) + value.slice(pos);
            this.input.focus();
            this.input.setSelectionRange(pos - count, pos - count);
        }

        if (action === 'clear') {
            this.input.value = '';
            this.input.focus();
        }

        if (action === 'left' && pos > 0) {
            this.input.focus();
            this.input.setSelectionRange(pos - 1, pos - 1);
        }

        if (action === 'right' && pos < value.length) {
            this.input.focus();
            this.input.setSelectionRange(pos + 1, pos + 1);
        }

        if (action === 'submit') {
            document.getElementById('addEquationBtn')?.click();
        }

        this.updatePreview();
    }

    getDeleteCount(value, pos) {
        const before = value.slice(0, pos);
        const patterns = [
            /sin\($/, /cos\($/, /tan\($/, /asin\($/, /acos\($/, /atan\($/,
            /sqrt\($/, /abs\($/, /ln\($/, /log\($/, /log10\($/,
            /floor\($/, /ceil\($/, /theta$/, /pi$/,
            / = $/, / < $/, / > $/, / <= $/, / >= $/, / != $/
        ];

        for (const pattern of patterns) {
            const match = before.match(pattern);
            if (match) return match[0].length;
        }

        return 1;
    }

    updatePreview() {
        if (!this.previewElement) return;

        const value = this.input.value.trim();
        if (!value) {
            this.previewElement.innerHTML = '<span class="preview-placeholder">Equation preview</span>';
            return;
        }

        if (typeof katex !== 'undefined') {
            try {
                katex.render(this.toLatex(value), this.previewElement, { throwOnError: false });
                return;
            } catch (error) {
                this.previewElement.textContent = value;
                return;
            }
        }

        this.previewElement.textContent = value;
    }

    toLatex(expression) {
        return expression
            .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
            .replace(/abs\(([^)]+)\)/g, '|$1|')
            .replace(/log10\(/g, '\\log_{10}(')
            .replace(/\*/g, '\\cdot ')
            .replace(/>=/g, '\\geq ')
            .replace(/<=/g, '\\leq ')
            .replace(/!=/g, '\\neq ')
            .replace(/theta/g, '\\theta')
            .replace(/pi/g, '\\pi')
            .replace(/\^(\d+)/g, '^{$1}')
            .replace(/\^([a-zA-Z])/g, '^{$1}');
    }

    attachEventListeners() {
        this.input.addEventListener('input', () => this.updatePreview());
        this.input.addEventListener('focus', () => this.container.classList.add('keyboard-focused'));
        this.input.addEventListener('blur', () => {
            setTimeout(() => {
                if (!this.container.contains(document.activeElement)) {
                    this.container.classList.remove('keyboard-focused');
                }
            }, 150);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('equationInput');
    if (input) {
        window.mathKeyboard = new MathKeyboard(input, { showPreview: true });
    }
});
