/**
 * ============================================================================
 * DESMOS-STYLE MATH KEYBOARD - FIXED VERSION
 * ============================================================================
 */

class MathKeyboard {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            showPreview: options.showPreview ?? true,
            autoInsertParens: options.autoInsertParens ?? true,
            ...options
        };

        this.activePopup = null;
        this.container = null;
        this.previewElement = null;
        this.keyDefinitions = this.getKeyDefinitions();

        this.build();
        this.attachEventListeners();
        this.updatePreview();
    }

    getKeyDefinitions() {
        return {
            numbers: [
                { label: '7', value: '7', type: 'number' },
                { label: '8', value: '8', type: 'number' },
                { label: '9', value: '9', type: 'number' },
                { label: '÷', value: '/', type: 'operator' },
                { label: '4', value: '4', type: 'number' },
                { label: '5', value: '5', type: 'number' },
                { label: '6', value: '6', type: 'number' },
                { label: '×', value: '*', type: 'operator' },
                { label: '1', value: '1', type: 'number' },
                { label: '2', value: '2', type: 'number' },
                { label: '3', value: '3', type: 'number' },
                { label: '−', value: '-', type: 'operator' },
                { label: '0', value: '0', type: 'number' },
                { label: '.', value: '.', type: 'number' },
                { label: '=', value: ' = ', type: 'operator' },
                { label: '+', value: '+', type: 'operator' }
            ],
            variables: [
                { label: 'x', value: 'x', type: 'variable' },
                { label: 'y', value: 'y', type: 'variable' },
                { label: 'r', value: 'r', type: 'variable' },
                { label: 'θ', value: 'theta', type: 'variable' },
                { label: 't', value: 't', type: 'variable' },
                { label: 'n', value: 'n', type: 'variable' },
                { label: 'a', value: 'a', type: 'variable' },
                { label: 'b', value: 'b', type: 'variable' }
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
                { label: 'x²', value: '^2', type: 'power' },
                { label: 'x³', value: '^3', type: 'power' },
                { label: 'xⁿ', value: '^', type: 'power' },
                { label: '√', value: 'sqrt(', type: 'function' },
                { label: 'ⁿ√', value: 'nthroot(', type: 'function' },
                { label: '1/x', value: '1/', type: 'fraction' },
                { label: 'π', value: 'pi', type: 'constant' },
                { label: 'e', value: 'e', type: 'constant' }
            ],
            trig: [
                { label: 'sin', value: 'sin(', type: 'function' },
                { label: 'cos', value: 'cos(', type: 'function' },
                { label: 'tan', value: 'tan(', type: 'function' },
                { label: 'sec', value: 'sec(', type: 'function' },
                { label: 'csc', value: 'csc(', type: 'function' },
                { label: 'cot', value: 'cot(', type: 'function' }
            ],
            invTrig: [
                { label: 'sin⁻¹', value: 'arcsin(', type: 'function' },
                { label: 'cos⁻¹', value: 'arccos(', type: 'function' },
                { label: 'tan⁻¹', value: 'arctan(', type: 'function' }
            ],
            hyperbolic: [
                { label: 'sinh', value: 'sinh(', type: 'function' },
                { label: 'cosh', value: 'cosh(', type: 'function' },
                { label: 'tanh', value: 'tanh(', type: 'function' }
            ],
            logExp: [
                { label: 'ln', value: 'ln(', type: 'function' },
                { label: 'log', value: 'log(', type: 'function' },
                { label: 'log₁₀', value: 'log10(', type: 'function' },
                { label: 'eˣ', value: 'e^', type: 'function' }
            ],
            special: [
                { label: '|x|', value: 'abs(', type: 'function' },
                { label: '⌊x⌋', value: 'floor(', type: 'function' },
                { label: '⌈x⌉', value: 'ceil(', type: 'function' },
                { label: 'sign', value: 'sign(', type: 'function' },
                { label: 'mod', value: '%', type: 'operator' }
            ],
            comparison: [
                { label: '<', value: ' < ', type: 'operator' },
                { label: '>', value: ' > ', type: 'operator' },
                { label: '≤', value: ' <= ', type: 'operator' },
                { label: '≥', value: ' >= ', type: 'operator' },
                { label: '≠', value: ' != ', type: 'operator' }
            ],
            equations: [
                { label: 'y =', value: 'y = ', type: 'template' },
                { label: 'x =', value: 'x = ', type: 'template' },
                { label: 'r =', value: 'r = ', type: 'template' }
            ]
        };
    }

    build() {
        this.container = document.createElement('div');
        this.container.className = 'math-keyboard';

        // Preview
        if (this.options.showPreview) {
            this.previewElement = document.createElement('div');
            this.previewElement.className = 'math-preview';
            this.previewElement.innerHTML = '<span class="preview-placeholder">Preview will appear here</span>';
            this.container.appendChild(this.previewElement);
        }

        // Tabs
        const tabBar = document.createElement('div');
        tabBar.className = 'keyboard-tabs';

        const tabs = [
            { id: 'basic', label: '123', icon: '🔢' },
            { id: 'functions', label: 'f(x)', icon: '𝑓' },
            { id: 'advanced', label: 'More', icon: '∞' }
        ];

        tabs.forEach((tab, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'keyboard-tab' + (index === 0 ? ' active' : '');
            tabBtn.dataset.panel = tab.id;
            tabBtn.type = 'button';
            tabBtn.innerHTML = `<span class="tab-icon">${tab.icon}</span><span class="tab-label">${tab.label}</span>`;
            tabBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPanel(tab.id);
            });
            tabBar.appendChild(tabBtn);
        });

        this.container.appendChild(tabBar);

        // Panels
        const panelsDiv = document.createElement('div');
        panelsDiv.className = 'keyboard-panel-container';

        // Basic
        const basicPanel = this.createPanel('basic', [
            this.createKeyGroup('Quick', 'equations'),
            this.createKeyGroup('Numbers', 'numbers', 'grid-4'),
            this.createKeyGroup('Variables', 'variables', 'grid-4'),
            this.createKeyGroup('Brackets', 'grouping', 'grid-4')
        ]);
        basicPanel.classList.add('active');
        panelsDiv.appendChild(basicPanel);

        // Functions
        const functionsPanel = this.createPanel('functions', [
            this.createKeyGroup('Powers & Roots', 'powers', 'grid-4'),
            this.createKeyGroup('Trigonometry', 'trig', 'grid-3'),
            this.createKeyGroup('Inverse Trig', 'invTrig', 'grid-3'),
            this.createKeyGroup('Log & Exp', 'logExp', 'grid-4')
        ]);
        panelsDiv.appendChild(functionsPanel);

        // Advanced
        const advancedPanel = this.createPanel('advanced', [
            this.createKeyGroup('Special', 'special', 'grid-5'),
            this.createKeyGroup('Hyperbolic', 'hyperbolic', 'grid-3'),
            this.createKeyGroup('Compare', 'comparison', 'grid-5')
        ]);
        panelsDiv.appendChild(advancedPanel);

        this.container.appendChild(panelsDiv);

        // Actions
        const actionBar = document.createElement('div');
        actionBar.className = 'keyboard-actions';

        const actions = [
            { label: '←', action: 'left', className: 'action-nav' },
            { label: '→', action: 'right', className: 'action-nav' },
            { label: '⌫', action: 'backspace', className: 'action-delete' },
            { label: 'Clear', action: 'clear', className: 'action-clear' },
            { label: '✓ Add', action: 'submit', className: 'action-submit' }
        ];

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'keyboard-action ' + action.className;
            btn.textContent = action.label;
            btn.type = 'button';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAction(action.action);
            });
            actionBar.appendChild(btn);
        });

        this.container.appendChild(actionBar);

        // Insert after input
        this.input.parentNode.insertBefore(this.container, this.input.nextSibling);
    }

    createPanel(id, groups) {
        const panel = document.createElement('div');
        panel.className = 'keyboard-panel';
        panel.dataset.panel = id;
        groups.forEach(g => g && panel.appendChild(g));
        return panel;
    }

    createKeyGroup(title, category, gridClass = '') {
        const group = document.createElement('div');
        group.className = 'key-group';

        if (title) {
            const titleEl = document.createElement('div');
            titleEl.className = 'key-group-title';
            titleEl.textContent = title;
            group.appendChild(titleEl);
        }

        const container = document.createElement('div');
        container.className = 'keys-container ' + gridClass;

        const keys = this.keyDefinitions[category];
        if (keys) {
            keys.forEach(keyDef => {
                const btn = document.createElement('button');
                btn.className = 'keyboard-key key-' + keyDef.type;
                btn.textContent = keyDef.label;
                btn.type = 'button';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.insert(keyDef.value);
                });
                container.appendChild(btn);
            });
        }

        group.appendChild(container);
        return group;
    }

    switchPanel(panelId) {
        this.container.querySelectorAll('.keyboard-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panel === panelId);
        });
        this.container.querySelectorAll('.keyboard-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === panelId);
        });
    }

    insert(value) {
        const pos = this.input.selectionStart || this.input.value.length;
        const before = this.input.value.slice(0, pos);
        const after = this.input.value.slice(pos);

        this.input.value = before + value + after;

        const newPos = pos + value.length;
        this.input.focus();
        this.input.setSelectionRange(newPos, newPos);

        this.updatePreview();
    }

    handleAction(action) {
        const pos = this.input.selectionStart || 0;
        const val = this.input.value;

        switch (action) {
            case 'backspace':
                if (pos > 0) {
                    // Smart delete
                    const count = this.getDeleteCount(val, pos);
                    this.input.value = val.slice(0, pos - count) + val.slice(pos);
                    this.input.focus();
                    this.input.setSelectionRange(pos - count, pos - count);
                }
                break;
            case 'clear':
                this.input.value = '';
                this.input.focus();
                break;
            case 'left':
                if (pos > 0) {
                    this.input.focus();
                    this.input.setSelectionRange(pos - 1, pos - 1);
                }
                break;
            case 'right':
                if (pos < val.length) {
                    this.input.focus();
                    this.input.setSelectionRange(pos + 1, pos + 1);
                }
                break;
            case 'submit':
                const addBtn = document.getElementById('addEquationBtn');
                if (addBtn) addBtn.click();
                break;
        }

        this.updatePreview();
    }

    getDeleteCount(value, pos) {
        const before = value.slice(0, pos);
        const patterns = [
            /sin\($/, /cos\($/, /tan\($/, /sec\($/, /csc\($/, /cot\($/,
            /sinh\($/, /cosh\($/, /tanh\($/,
            /arcsin\($/, /arccos\($/, /arctan\($/,
            /sqrt\($/, /abs\($/, /ln\($/, /log\($/, /log10\($/,
            /floor\($/, /ceil\($/, /sign\($/,
            /nthroot\($/,
            /theta$/, /pi$/,
            / = $/, / < $/, / > $/, / <= $/, / >= $/, / != $/
        ];

        for (const p of patterns) {
            const m = before.match(p);
            if (m) return m[0].length;
        }
        return 1;
    }

    updatePreview() {
        if (!this.previewElement) return;

        const val = this.input.value.trim();
        if (!val) {
            this.previewElement.innerHTML = '<span class="preview-placeholder">Preview will appear here</span>';
            return;
        }

        const formatted = this.formatDisplay(val);

        if (typeof katex !== 'undefined') {
            try {
                const latex = this.toLatex(val);
                katex.render(latex, this.previewElement, { throwOnError: false, displayMode: false });
            } catch (e) {
                this.previewElement.textContent = formatted;
            }
        } else {
            this.previewElement.textContent = formatted;
        }
    }

    toLatex(expr) {
        let latex = expr;

        // Order matters - do complex patterns first
        latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
        latex = latex.replace(/abs\(([^)]+)\)/g, '|$1|');
        latex = latex.replace(/log10\(/g, '\\log_{10}(');

        // Functions
        const funcs = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh', 'cosh', 'tanh',
            'arcsin', 'arccos', 'arctan', 'ln', 'log', 'floor', 'ceil', 'sign'];
        funcs.forEach(f => {
            latex = latex.replace(new RegExp(f + '\\(', 'g'), '\\' + f + '(');
        });

        // Symbols
        latex = latex.replace(/theta/g, '\\theta');
        latex = latex.replace(/pi/g, '\\pi');
        latex = latex.replace(/\*/g, '\\cdot ');
        latex = latex.replace(/>=/g, '\\geq ');
        latex = latex.replace(/<=/g, '\\leq ');
        latex = latex.replace(/!=/g, '\\neq ');

        // Powers
        latex = latex.replace(/\^(\d+)/g, '^{$1}');
        latex = latex.replace(/\^([a-zA-Z])/g, '^{$1}');

        return latex;
    }

    formatDisplay(expr) {
        return expr
            .replace(/\*/g, '×')
            .replace(/\//g, '÷')
            .replace(/sqrt/g, '√')
            .replace(/theta/g, 'θ')
            .replace(/pi/g, 'π')
            .replace(/>=/g, '≥')
            .replace(/<=/g, '≤')
            .replace(/!=/g, '≠');
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('equationInput');
    if (input) {
        window.mathKeyboard = new MathKeyboard(input, { showPreview: true });
    }
});
