/**
 * Contract Generator Application
 * Generates DOCX contracts from predefined templates using docxtemplater
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Each module handles one concern
 * - Open/Closed: Template config is open for extension
 * - Interface Segregation: Modules expose only necessary methods
 * - Dependency Inversion: High-level modules depend on abstractions
 */

// ============================================
// CONFIGURATION
// ============================================

const VariableConfig = {
    names: [
        'day_number_text', 'month_text', 'year_text',
        'name_worker', 'id_worker', 'work_title',
        'enumerated_functions', 'domicile_worker', 'domicile_reference',
        'city_name_worker', 'province_name_worker',
        'mail_worker', 'salary_text', 'salary_cents_text', 'salary_value',
        'start_time_weekday', 'end_time_weekday', 'break_minutes_weekday',
        'start_time_saturday', 'end_time_saturday', 'province'
    ]
};

// ============================================
// POSITION SERVICE
// Loads and manages predefined job positions
// ============================================
const PositionService = {
    positions: [],

    async loadPositions() {
        try {
            const response = await fetch('cargos.json');
            if (response.ok) {
                this.positions = await response.json();
            }
        } catch (error) {
            console.warn('Could not load positions:', error);
            this.positions = [];
        }
    },

    getPositionById(id) {
        return this.positions.find(p => p.id === id);
    },

    getAllPositions() {
        return this.positions;
    },

    populateDropdown() {
        const select = document.getElementById('positionSelect');
        if (!select) return;

        this.positions.forEach(position => {
            const option = document.createElement('option');
            option.value = position.id;
            option.textContent = position.title;
            select.appendChild(option);
        });
    }
};

const StepperConfig = {
    totalSteps: 6,
    stepValidation: {
        1: ['citySelect', 'province'],
        2: ['contract_date'],
        3: ['name_worker', 'id_worker', 'mail_worker'],
        4: ['domicile_worker', 'domicile_reference', 'city_name_worker', 'province_name_worker'],
        6: ['salary_input']
    }
};

// ============================================
// SPANISH NUMBER CONVERTER SERVICE
// ============================================
const SpanishNumberConverter = {
    units: ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'],
    teens: ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'],
    tens: ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'],
    hundreds: ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'],

    convert(num) {
        if (num === 0) return 'cero';
        return this._convertMillions(Math.floor(num));
    },

    _convertHundreds(n) {
        if (n === 0) return '';
        if (n === 100) return 'cien';
        let result = '';
        if (n >= 100) {
            result += this.hundreds[Math.floor(n / 100)] + ' ';
            n %= 100;
        }
        if (n >= 10 && n < 20) {
            result += this.teens[n - 10];
        } else if (n >= 20) {
            const ten = Math.floor(n / 10);
            const unit = n % 10;
            if (ten === 2 && unit > 0) {
                result += 'veinti' + this.units[unit];
            } else if (unit > 0) {
                result += this.tens[ten] + ' y ' + this.units[unit];
            } else {
                result += this.tens[ten];
            }
        } else if (n > 0) {
            result += this.units[n];
        }
        return result.trim();
    },

    _convertThousands(n) {
        if (n === 0) return '';
        if (n === 1000) return 'mil';
        let result = '';
        if (n >= 1000) {
            const thousands = Math.floor(n / 1000);
            result += thousands === 1 ? 'mil ' : this._convertHundreds(thousands) + ' mil ';
            n %= 1000;
        }
        return (result + this._convertHundreds(n)).trim();
    },

    _convertMillions(n) {
        if (n === 0) return '';
        let result = '';
        if (n >= 1000000) {
            const millions = Math.floor(n / 1000000);
            result += millions === 1 ? 'un millón ' : this._convertThousands(millions) + ' millones ';
            n %= 1000000;
        }
        return (result + this._convertThousands(n)).trim();
    }
};

// ============================================
// SPANISH DATE CONVERTER SERVICE
// ============================================
const SpanishDateConverter = {
    days: [
        '', 'un', 'dos', 'tres', 'cuatro', 'cinco',
        'seis', 'siete', 'ocho', 'nueve', 'diez',
        'once', 'doce', 'trece', 'catorce', 'quince',
        'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
        'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco',
        'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve', 'treinta',
        'treinta y un'
    ],
    months: [
        '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ],

    convert(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        const dayText = this.days[day] || day.toString();
        const dayWithSuffix = day === 1 ? dayText + ' día' : dayText + ' días';
        return {
            day: dayWithSuffix,
            month: this.months[month] || month.toString(),
            year: year.toString()
        };
    }
};

// ============================================
// SALARY CONVERTER SERVICE
// ============================================
const SalaryConverter = {
    convert(value) {
        const dollars = Math.floor(value);
        const cents = Math.round((value - dollars) * 100);
        return {
            value: value.toFixed(2),
            text: SpanishNumberConverter.convert(dollars).toUpperCase(),
            cents: cents.toString().padStart(2, '0') + '/100'
        };
    }
};

// ============================================
// FORM DATA SERVICE
// ============================================
const FormDataService = {
    collect() {
        const data = {};
        VariableConfig.names.forEach(name => {
            const input = document.getElementById(name);
            if (input) data[name] = input.value.trim();
        });

        // Override with predefined values if in predefined mode
        const modeRadio = document.querySelector('input[name="position_mode"]:checked');
        if (modeRadio && modeRadio.value === 'predefined') {
            const positionSelect = document.getElementById('positionSelect');
            if (positionSelect && positionSelect.value) {
                const position = PositionService.getPositionById(positionSelect.value);
                if (position) {
                    data['work_title'] = position.title;
                    data['enumerated_functions'] = position.functions;
                }
            }
        }

        if (data.name_worker) {
            data.name_worker = data.name_worker.toUpperCase();
        }
        return data;
    },

    validate(data) {
        for (const [key, value] of Object.entries(data)) {
            if (!value) {
                const input = document.getElementById(key);
                const label = input?.previousElementSibling?.textContent || key;
                return { valid: false, field: label, element: input };
            }
        }
        return { valid: true };
    }
};

// ============================================
// TEMPLATE SERVICE
// ============================================
const TemplateService = {
    async fetchTemplate(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('No se pudo cargar la plantilla');
        return await response.arrayBuffer();
    },

    processTemplate(content, data) {
        const zip = new PizZip(content);
        const doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{', end: '}' }
        });
        doc.render(data);
        return doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    },

    generateFileName(workerName) {
        const cleanName = workerName.replace(/\s+/g, '_');
        const date = new Date().toISOString().split('T')[0];
        return `Contrato_${cleanName}_${date}.docx`;
    }
};

// ============================================
// STEPPER SERVICE
// ============================================
const StepperService = {
    currentStep: 1,

    init() {
        this.updateUI();
    },

    goToStep(step) {
        if (step < 1 || step > StepperConfig.totalSteps) return;
        this.currentStep = step;
        this.updateUI();
    },

    next() {
        if (this.validateCurrentStep()) {
            this.markStepCompleted(this.currentStep);
            if (this.currentStep < StepperConfig.totalSteps) {
                this.currentStep++;
                this.updateUI();
            }
        }
    },

    previous() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateUI();
        }
    },

    validateCurrentStep() {
        if (this.currentStep === 5) {
            const mode = document.querySelector('input[name="position_mode"]:checked').value;
            if (mode === 'predefined') {
                const positionSelect = document.getElementById('positionSelect');
                if (!positionSelect.value) {
                    UIService.showToast('Por favor seleccione un cargo predefinido', 'error');
                    positionSelect.focus();
                    return false;
                }
                return true;
            } else {
                const workTitle = document.getElementById('work_title');
                const functions = document.getElementById('enumerated_functions');
                if (!workTitle.value.trim()) {
                    UIService.showToast('Por favor ingrese el Cargo', 'error');
                    workTitle.focus();
                    return false;
                }
                if (!functions.value.trim()) {
                    UIService.showToast('Por favor ingrese las Funciones', 'error');
                    functions.focus();
                    return false;
                }
                return true;
            }
        }

        if (this.currentStep === 5) {
            const scheduleFields = ['start_time_weekday', 'end_time_weekday', 'break_minutes_weekday', 'start_time_saturday', 'end_time_saturday'];
            for (const fieldId of scheduleFields) {
                const element = document.getElementById(fieldId);
                if (!element || !element.value.trim()) {
                    const label = element?.previousElementSibling?.textContent || fieldId;
                    UIService.showToast(`Por favor complete: ${label}`, 'error');
                    element?.focus();
                    return false;
                }
            }
        }

        const fields = StepperConfig.stepValidation[this.currentStep] || [];
        for (const fieldId of fields) {
            const element = document.getElementById(fieldId);
            if (!element) continue;

            const value = element.value.trim();
            if (!value) {
                const label = element.previousElementSibling?.textContent || fieldId;
                UIService.showToast(`Por favor complete: ${label}`, 'error');
                element.focus();
                return false;
            }
        }
        return true;
    },

    markStepCompleted(step) {
        const indicator = document.querySelector(`.step-indicator[data-step="${step}"]`);
        if (indicator) indicator.classList.add('completed');

        // Mark line before next step as completed
        const lines = document.querySelectorAll('.step-line');
        if (step < StepperConfig.totalSteps && lines[step - 1]) {
            lines[step - 1].classList.add('completed');
        }
    },

    updateUI() {
        // Update step content visibility
        document.querySelectorAll('.step-content').forEach(content => {
            const stepNum = parseInt(content.dataset.step);
            content.classList.toggle('active', stepNum === this.currentStep);
        });

        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach(indicator => {
            const stepNum = parseInt(indicator.dataset.step);
            indicator.classList.toggle('active', stepNum === this.currentStep);
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const generateBtn = document.getElementById('generateBtn');

        if (prevBtn) prevBtn.disabled = this.currentStep === 1;

        if (this.currentStep === StepperConfig.totalSteps) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (generateBtn) generateBtn.style.display = 'flex';
        } else {
            if (nextBtn) nextBtn.style.display = 'flex';
            if (generateBtn) generateBtn.style.display = 'none';
        }
    },

    isComplete() {
        return this.currentStep === StepperConfig.totalSteps && this.validateCurrentStep();
    },

    reset() {
        this.currentStep = 1;

        // Clear completed states
        document.querySelectorAll('.step-indicator').forEach(indicator => {
            indicator.classList.remove('completed');
        });
        document.querySelectorAll('.step-line').forEach(line => {
            line.classList.remove('completed');
        });

        // Hide new contract button
        const newContractBtn = document.getElementById('newContractBtn');
        if (newContractBtn) newContractBtn.style.display = 'none';

        this.updateUI();
    }
};

// ============================================
// UI SERVICE
// ============================================
const UIService = {
    elements: {},

    init() {
        this.elements = {
            form: document.getElementById('contractForm'),
            citySelect: document.getElementById('citySelect'),
            generateBtn: document.getElementById('generateBtn'),
            newContractBtn: document.getElementById('newContractBtn'),
            toast: document.getElementById('toast'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn')
        };
        this.initTimeSelects();
    },

    initTimeSelects() {
        const timeSelects = ['start_time_weekday', 'end_time_weekday', 'start_time_saturday', 'end_time_saturday'];
        const options = ['<option value="">-- Seleccione --</option>'];
        
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 10) {
                const hour = h.toString().padStart(2, '0');
                const min = m.toString().padStart(2, '0');
                const timeStr = `${hour}:${min}`;
                options.push(`<option value="${timeStr}">${timeStr}</option>`);
            }
        }
        
        const optionsHtml = options.join('');
        timeSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = optionsHtml;
            }
        });
    },

    updateDatePreview(dateData) {
        const preview = document.getElementById('datePreview');
        if (!preview) return;
        document.getElementById('dayPreview').textContent = dateData.day;
        document.getElementById('monthPreview').textContent = dateData.month;
        document.getElementById('yearPreview').textContent = dateData.year;
        preview.classList.remove('hidden');
        document.getElementById('day_number_text').value = dateData.day;
        document.getElementById('month_text').value = dateData.month;
        document.getElementById('year_text').value = dateData.year;
    },

    updateSalaryPreview(salaryData) {
        const preview = document.getElementById('salaryPreview');
        if (!preview) return;
        document.getElementById('salaryValuePreview').textContent = '$' + salaryData.value;
        document.getElementById('salaryTextPreview').textContent = salaryData.text;
        document.getElementById('salaryCentsPreview').textContent = salaryData.cents;
        preview.classList.remove('hidden');
        document.getElementById('salary_value').value = salaryData.value;
        document.getElementById('salary_text').value = salaryData.text;
        document.getElementById('salary_cents_text').value = salaryData.cents;
    },

    clearPreview(previewId) {
        const preview = document.getElementById(previewId);
        if (preview) preview.classList.add('hidden');
    },

    showToast(message, type = 'success') {
        const toast = this.elements.toast;
        toast.querySelector('.toast-message').textContent = message;
        toast.querySelector('.toast-icon').textContent = type === 'success' ? '✓' : '⚠';
        toast.classList.remove('error');
        if (type === 'error') toast.classList.add('error');
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 4000);
    },

    setLoading(loading) {
        const btn = this.elements.generateBtn;
        if (loading) {
            btn.classList.add('loading');
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = 'Generando';
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = 'Generar Contrato';
        }
    },

    addInputAnimations() {
        document.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.toggle('filled', !!input.value);
            });
            input.addEventListener('change', () => {
                input.classList.toggle('filled', !!input.value);
            });
            if (input.value) input.classList.add('filled');
        });
    },

    showNewContractButton() {
        const { generateBtn, newContractBtn, prevBtn } = this.elements;
        if (generateBtn) generateBtn.style.display = 'none';
        if (newContractBtn) newContractBtn.style.display = 'flex';
        if (prevBtn) prevBtn.style.display = 'none';
    },

    resetForm() {
        const { form } = this.elements;
        if (form) form.reset();

        // Clear previews
        this.clearPreview('datePreview');
        this.clearPreview('salaryPreview');

        // Reset position mode to predefined
        const predefinedRadio = document.querySelector('input[name="position_mode"][value="predefined"]');
        if (predefinedRadio) predefinedRadio.checked = true;
        const predefinedSection = document.getElementById('predefined_section');
        const manualSection = document.getElementById('manual_section');
        if (predefinedSection) predefinedSection.style.display = 'block';
        if (manualSection) manualSection.style.display = 'none';

        // Remove filled classes
        document.querySelectorAll('.filled').forEach(el => el.classList.remove('filled'));

        // Show prev button again
        const { prevBtn } = this.elements;
        if (prevBtn) prevBtn.style.display = 'flex';
    }
};

// ============================================
// CONTRACT GENERATOR
// ============================================
const ContractGenerator = {
    async generate(cityId) {
        let templateFile = 'templates/template_contrato.docx';

        // Sincronizar campos ocultos antes de recolectar para evitar errores de validación si no se disparó el evento 'change'
        const dateInput = document.getElementById('contract_date')?.value;
        if (dateInput) {
            const converted = SpanishDateConverter.convert(dateInput);
            document.getElementById('day_number_text').value = converted.day;
            document.getElementById('month_text').value = converted.month;
            document.getElementById('year_text').value = converted.year;
        }

        const salaryInput = document.getElementById('salary_input')?.value;
        if (salaryInput) {
            const converted = SalaryConverter.convert(parseFloat(salaryInput));
            document.getElementById('salary_value').value = converted.value;
            document.getElementById('salary_text').value = converted.text;
            document.getElementById('salary_cents_text').value = converted.cents;
        }
        
        const formData = FormDataService.collect();
        
        // Agregar las variables dependiendo de la ciudad seleccionada
        if (cityId === 'Samborondón') {
            formData.city = 'Samborondón';
            formData.city_working_place = 'Centro Comercial “Samborondón Plaza”, planta baja, local No. 13, Km. 1.5 vía a Samborondón, provincia de ' + formData.province;
        } else if (cityId === 'Quito') {
            formData.city = 'Quito';
            formData.city_working_place = 'Eloy Alfaro y Amazonas';
        }
        
        // Convertir la lista de funciones a un formato de array para permitir listas nativas en Word
        if (formData.enumerated_functions) {
            formData.funciones_lista = formData.enumerated_functions
                .split('\n')
                .map(line => line.replace(/^[0-9]+[\.\-\)]\s*/, '').trim())
                .filter(line => line.length > 0)
                .map(line => ({ item: line }));
        }

        // Convertir minutos de descanso a texto
        if (formData.break_minutes_weekday) {
            const minutes = parseInt(formData.break_minutes_weekday);
            if (!isNaN(minutes)) {
                formData.break_minutes_weekday_text = SpanishNumberConverter.convert(minutes);
            }
        }

        const validation = FormDataService.validate(formData);

        if (!validation.valid) {
            UIService.showToast(`Por favor complete el campo: ${validation.field}`, 'error');
            validation.element?.focus();
            return false;
        }

        UIService.setLoading(true);

        try {
            const content = await TemplateService.fetchTemplate(templateFile);
            const output = TemplateService.processTemplate(content, formData);
            const fileName = TemplateService.generateFileName(formData.name_worker);

            // Usar mecanismo de descarga nativo en lugar de file-saver para mayor confiabilidad
            const url = window.URL.createObjectURL(output);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

            UIService.showToast('¡Contrato generado exitosamente!', 'success');
            UIService.showNewContractButton();
            return true;
        } catch (error) {
            console.error('Error generating contract:', error);
            UIService.showToast('Error al generar el contrato: ' + error.message, 'error');
            return false;
        } finally {
            UIService.setLoading(false);
        }
    }
};

// ============================================
// EVENT HANDLERS
// ============================================
const EventHandlers = {

    onDateChange(event) {
        const value = event.target.value;
        if (!value) {
            UIService.clearPreview('datePreview');
            return;
        }
        UIService.updateDatePreview(SpanishDateConverter.convert(value));
    },

    onSalaryChange(event) {
        const value = parseFloat(event.target.value);
        if (isNaN(value) || value < 0) {
            UIService.clearPreview('salaryPreview');
            return;
        }
        UIService.updateSalaryPreview(SalaryConverter.convert(value));
    },

    onPrevClick() {
        StepperService.previous();
    },

    onNextClick() {
        StepperService.next();
    },

    async onFormSubmit(event) {
        event.preventDefault();

        if (!StepperService.validateCurrentStep()) return;

        const cityId = UIService.elements.citySelect?.value;
        if (!cityId) {
            UIService.showToast('Por favor seleccione una ciudad', 'error');
            StepperService.goToStep(1);
            return;
        }

        await ContractGenerator.generate(cityId);
    },

    onStepIndicatorClick(event) {
        const indicator = event.target.closest('.step-indicator');
        if (!indicator) return;

        const targetStep = parseInt(indicator.dataset.step);

        // Only allow going back or to completed steps
        if (targetStep < StepperService.currentStep || indicator.classList.contains('completed')) {
            StepperService.goToStep(targetStep);
        }
    },

    onNewContractClick() {
        UIService.resetForm();
        StepperService.reset();
    },

    onPositionSelect(event) {
        // Just used for filling when predefined, the collect function ensures correct logic
        const positionId = event.target.value;
        const workTitleInput = document.getElementById('work_title');
        const functionsInput = document.getElementById('enumerated_functions');

        if (positionId) {
            const position = PositionService.getPositionById(positionId);
            if (position) {
                workTitleInput.value = position.title;
                functionsInput.value = position.functions;
                workTitleInput.classList.add('filled');
                functionsInput.classList.add('filled');
            }
        }
    },

    onPositionModeChange(event) {
        const mode = event.target.value;
        const predefinedSection = document.getElementById('predefined_section');
        const manualSection = document.getElementById('manual_section');
        
        if (mode === 'predefined') {
            predefinedSection.style.display = 'block';
            manualSection.style.display = 'none';
        } else {
            predefinedSection.style.display = 'none';
            manualSection.style.display = 'block';
        }
    }
};

// ============================================
// APPLICATION
// ============================================
const App = {
    async init() {
        UIService.init();
        UIService.addInputAnimations();
        StepperService.init();

        // Load predefined positions
        await PositionService.loadPositions();
        PositionService.populateDropdown();

        // Bind events
        const { form, prevBtn, nextBtn, newContractBtn } = UIService.elements;

        form?.addEventListener('submit', EventHandlers.onFormSubmit);
        prevBtn?.addEventListener('click', EventHandlers.onPrevClick);
        nextBtn?.addEventListener('click', EventHandlers.onNextClick);
        newContractBtn?.addEventListener('click', EventHandlers.onNewContractClick);

        document.getElementById('contract_date')?.addEventListener('change', EventHandlers.onDateChange);
        document.getElementById('salary_input')?.addEventListener('input', EventHandlers.onSalaryChange);
        document.getElementById('positionSelect')?.addEventListener('change', EventHandlers.onPositionSelect);

        // Step indicator clicks
        document.querySelectorAll('.step-indicator').forEach(indicator => {
            indicator.addEventListener('click', EventHandlers.onStepIndicatorClick);
        });

        document.querySelectorAll('input[name="position_mode"]').forEach(radio => {
            radio.addEventListener('change', EventHandlers.onPositionModeChange);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
