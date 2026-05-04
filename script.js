// Workflow Visualizer Class
class WorkflowVisualizer {
    constructor(containerId, data) {
        this.container = document.getElementById(containerId);
        this.nodesContainer = this.container.querySelector('.workflow-nodes');
        this.svgContainer = this.container.querySelector('.workflow-connections');
        this.data = data;
        this.scale = 0.75;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.init();
    }

    init() {
        this.render();
        this.updateConnections();
        this.setupDragEvents();
        this.applyTransform();
    }

    setupDragEvents() {
        const isCanvasTarget = (target) => {
            return target === this.container ||
                target.classList.contains('workflow-canvas') ||
                target.classList.contains('workflow-nodes') ||
                target.classList.contains('workflow-connections');
        };

        this.container.addEventListener('mousedown', (e) => {
            if (isCanvasTarget(e.target)) {
                this.isDragging = true;
                this.dragStartX = e.clientX - this.offsetX;
                this.dragStartY = e.clientY - this.offsetY;
                this.container.style.cursor = 'grabbing';
            }
        });

        this.container.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.offsetX = e.clientX - this.dragStartX;
                this.offsetY = e.clientY - this.dragStartY;
                this.applyTransform();
            }
        });

        this.container.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.container.style.cursor = 'grab';
        });

        this.container.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.container.style.cursor = 'grab';
        });

        this.container.addEventListener('touchstart', (e) => {
            if (!isCanvasTarget(e.target) || e.touches.length !== 1) {
                return;
            }
            const touch = e.touches[0];
            this.isDragging = true;
            this.dragStartX = touch.clientX - this.offsetX;
            this.dragStartY = touch.clientY - this.offsetY;
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (!this.isDragging || e.touches.length !== 1) {
                return;
            }
            e.preventDefault();
            const touch = e.touches[0];
            this.offsetX = touch.clientX - this.dragStartX;
            this.offsetY = touch.clientY - this.dragStartY;
            this.applyTransform();
        }, { passive: false });

        this.container.addEventListener('touchend', () => {
            this.isDragging = false;
        }, { passive: true });

        this.container.addEventListener('touchcancel', () => {
            this.isDragging = false;
        }, { passive: true });
    }

    render() {
        this.nodesContainer.innerHTML = '';
        
        this.data.nodes.forEach(node => {
            const nodeEl = this.createNode(node);
            this.nodesContainer.appendChild(nodeEl);
        });
    }

    createNode(node) {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'workflow-node';
        nodeEl.setAttribute('data-type', node.type);
        nodeEl.setAttribute('data-id', node.id);
        nodeEl.style.left = `${node.x}px`;
        nodeEl.style.top = `${node.y}px`;

        const icons = {
            trigger: '▶',
            function: 'ƒ',
            integration: '⚡',
            database: '◆'
        };

        nodeEl.innerHTML = `
            <div class="workflow-node-port input"></div>
            <div class="workflow-node-port output"></div>
            <div class="workflow-node-header">
                <div class="workflow-node-icon">${icons[node.type] || '●'}</div>
                <div class="workflow-node-content">
                    <h4 class="workflow-node-title">${node.label}</h4>
                </div>
            </div>
        `;

        nodeEl.addEventListener('dblclick', () => {
            this.openNodeModal(node);
        });

        return nodeEl;
    }

    updateConnections() {
        const svgNS = 'http://www.w3.org/2000/svg';
        this.svgContainer.innerHTML = '';

        const nodeWidth = 180;
        const nodeHeight = 88;

        // Создаем SVG элемент с фиксированными размерами для всех нод
        this.svgContainer.style.position = 'absolute';
        this.svgContainer.style.top = '0';
        this.svgContainer.style.left = '0';
        this.svgContainer.style.width = '6000px';
        this.svgContainer.style.height = '1000px';
        this.svgContainer.style.pointerEvents = 'none';

        this.data.connections.forEach(conn => {
            const fromNode = this.data.nodes.find(n => n.id === conn.from);
            const toNode = this.data.nodes.find(n => n.id === conn.to);

            if (fromNode && toNode) {
                // Output port (правая сторона fromNode, по центру)
                const fromX = fromNode.x + nodeWidth;
                const fromY = fromNode.y + nodeHeight / 2;
                
                // Input port (левая сторона toNode, по центру)
                const toX = toNode.x;
                const toY = toNode.y + nodeHeight / 2;

                const path = document.createElementNS(svgNS, 'path');
                
                // Расстояние между нодами
                const dx = toX - fromX;
                const dy = toY - fromY;
                
                // Радиус скругления углов
                const cornerRadius = 18;
                
                let pathData = '';
                
                // Если линия идет назад (справа налево) - делаем изгиб вниз
                if (dx < 0) {
                    const loopY = 520; // Y координата для loop линии (ниже всех нод)
                    pathData = `M ${fromX} ${fromY}
                               L ${fromX + 50} ${fromY}
                               Q ${fromX + 70} ${fromY} ${fromX + 70} ${fromY + cornerRadius}
                               L ${fromX + 70} ${loopY - cornerRadius}
                               Q ${fromX + 70} ${loopY} ${fromX + 50} ${loopY}
                               L ${toX - 50} ${loopY}
                               Q ${toX - 70} ${loopY} ${toX - 70} ${loopY - cornerRadius}
                               L ${toX - 70} ${toY + cornerRadius}
                               Q ${toX - 70} ${toY} ${toX - 50} ${toY}
                               L ${toX} ${toY}`;
                }
                // Если ноды на одной горизонтали (разница по Y меньше 10px)
                else if (Math.abs(dy) < 10) {
                    // Прямая горизонтальная линия
                    pathData = `M ${fromX} ${fromY} L ${toX} ${toY}`;
                } else {
                    // Линия с изгибом и скругленными углами
                    const midX = fromX + dx / 2;
                    
                    if (dy > 0) {
                        // Идем вниз
                        pathData = `M ${fromX} ${fromY} 
                                   L ${midX - cornerRadius} ${fromY} 
                                   Q ${midX} ${fromY} ${midX} ${fromY + cornerRadius}
                                   L ${midX} ${toY - cornerRadius}
                                   Q ${midX} ${toY} ${midX + cornerRadius} ${toY}
                                   L ${toX} ${toY}`;
                    } else {
                        // Идем вверх
                        pathData = `M ${fromX} ${fromY} 
                                   L ${midX - cornerRadius} ${fromY} 
                                   Q ${midX} ${fromY} ${midX} ${fromY - cornerRadius}
                                   L ${midX} ${toY + cornerRadius}
                                   Q ${midX} ${toY} ${midX + cornerRadius} ${toY}
                                   L ${toX} ${toY}`;
                    }
                }
                
                path.setAttribute('d', pathData);
                path.setAttribute('stroke', '#86a0b8');
                path.setAttribute('stroke-width', '1.8');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');

                this.svgContainer.appendChild(path);
            }
        });
    }

    openNodeModal(node) {
        const modal = document.getElementById('nodeModal');
        document.getElementById('modalNodeName').textContent = node.label;
        document.getElementById('modalNodeDescription').textContent = node.description;
        document.getElementById('modalNodeParams').textContent = node.params;
        modal.classList.add('active');
    }

    loadProject(projectData) {
        this.data = projectData;
        this.offsetX = 0;
        this.offsetY = 0;
        this.render();
        setTimeout(() => this.updateConnections(), 50);
    }

    zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 3);
        this.applyTransform();
    }

    zoomOut() {
        this.scale = Math.max(this.scale * 0.8, 0.5);
        this.applyTransform();
    }

    resetView() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.applyTransform();
    }

    applyTransform() {
        this.nodesContainer.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        this.nodesContainer.style.transformOrigin = '0 0';
        this.svgContainer.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        this.svgContainer.style.transformOrigin = '0 0';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    function setAppHeight() {
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    }

    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    window.addEventListener('pageshow', setAppHeight);

    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const sidebar = document.querySelector('.sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    function closeMobileNav() {
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (mobileNavToggle) {
            mobileNavToggle.setAttribute('aria-expanded', 'false');
        }
    }

    if (mobileNavToggle && sidebar) {
        mobileNavToggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            mobileNavToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        document.addEventListener('click', (e) => {
            const clickedInsideSidebar = sidebar.contains(e.target);
            const clickedToggle = mobileNavToggle.contains(e.target);
            if (!clickedInsideSidebar && !clickedToggle && sidebar.classList.contains('open')) {
                closeMobileNav();
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(targetSection).classList.add('active');
            
            if (targetSection === 'projects') {
                setTimeout(() => initWorkflowCanvas(), 100);
            }

            if (window.innerWidth <= 992) {
                closeMobileNav();
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileNav();
        }
    });

    // Category Toggle Logic
    const categoryBtns = document.querySelectorAll('.category-btn');
    const automationsContent = document.getElementById('automations-content');
    const websitesContent = document.getElementById('websites-content');

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Update active button
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Toggle content visibility
            if (category === 'automations') {
                automationsContent.style.display = 'block';
                websitesContent.style.display = 'none';
                setTimeout(() => {
                    if (workflowVisualizer) {
                        workflowVisualizer.updateConnections();
                    }
                }, 100);
            } else if (category === 'websites') {
                automationsContent.style.display = 'none';
                websitesContent.style.display = 'block';
            }
        });
    });

    // Workflow Visualizer
    let workflowVisualizer = null;

    const projectData = {
        hhautootklik: {
            nodes: [
                { id: 1, x: 100, y: 200, label: 'Manual Trigger\nЗапуск', type: 'trigger', description: 'Запуск воркфлоу вручную', params: 'Кнопка Execute workflow' },
                { id: 2, x: 350, y: 200, label: 'HTTP Request\nПарсинг HH.ru', type: 'function', description: 'Запрос к API HH.ru для получения вакансий', params: 'GET https://api.hh.ru/vacancies?text=n8n' },
                { id: 3, x: 600, y: 200, label: 'Code JS\nИзвлечение ID', type: 'function', description: 'Парсинг JSON ответа и извлечение ID вакансий', params: 'JavaScript Code' },
                { id: 4, x: 850, y: 100, label: 'Merge\nОбъединение', type: 'function', description: 'Объединение данных из API и базы', params: 'Merge node' },
                { id: 5, x: 600, y: 380, label: 'Airtable\nПоиск записей', type: 'database', description: 'Поиск уже обработанных вакансий в базе', params: 'Airtable: Search records' },
                { id: 6, x: 1100, y: 100, label: 'Code JS\nДедупликация', type: 'function', description: 'Фильтрация только новых вакансий', params: 'JavaScript: дедупликация' },
                { id: 7, x: 1350, y: 100, label: 'Loop Over Items\nЦикл', type: 'function', description: 'Цикл по каждой вакансии', params: 'Split in Batches' },
                { id: 8, x: 1600, y: 100, label: 'Playwright\nПроверка отклика', type: 'integration', description: 'Проверка через Playwright: уже откликались?', params: 'Playwright: Firefox headless' },
                { id: 9, x: 1850, y: 100, label: 'If\nНе откликались?', type: 'function', description: 'Условие: если еще не откликались', params: 'IF node: applied === false' },
                { id: 10, x: 2100, y: 100, label: 'If\nЕсть анкета?', type: 'function', description: 'Проверка наличия анкеты/теста', params: 'IF node: has_test === true' },
                { id: 11, x: 2350, y: 0, label: 'HTTP Request\nОписание вакансии', type: 'integration', description: 'Получение полного описания вакансии', params: 'HTTP: GET /vacancies/{id}' },
                { id: 12, x: 2600, y: 0, label: 'Edit Fields\nПодготовка данных', type: 'function', description: 'Подготовка данных для AI', params: 'Set: description field' },
                { id: 13, x: 2850, y: 0, label: 'OpenAI GPT-4\nПисьмо', type: 'integration', description: 'Генерация сопроводительного письма через GPT-4', params: 'OpenAI: GPT-4.1-mini' },
                { id: 14, x: 3100, y: 0, label: 'Edit Fields\nФорматирование', type: 'function', description: 'Форматирование письма', params: 'Set: coverLetter, vacancyId' },
                { id: 15, x: 3350, y: 0, label: 'Playwright\nПарсинг анкеты', type: 'integration', description: 'Playwright: парсинг вопросов анкеты', params: 'Playwright: извлечение dataForAI' },
                { id: 16, x: 3600, y: 0, label: 'Set\nПрофиль', type: 'function', description: 'Загрузка профиля пользователя', params: 'Set: skills, background' },
                { id: 17, x: 3850, y: 0, label: 'OpenAI GPT-4\nОтветы', type: 'integration', description: 'Генерация ответов на анкету через GPT-4', params: 'OpenAI: заполнение анкеты' },
                { id: 18, x: 4100, y: 0, label: 'Edit Fields\nПодготовка', type: 'function', description: 'Подготовка данных для отправки', params: 'Set: vacancyUrl, aiAnswers' },
                { id: 19, x: 4350, y: 0, label: 'Playwright\nОтправка анкеты', type: 'integration', description: 'Playwright: отправка анкеты и отклика', params: 'Executor: автозаполнение + submit' },
                { id: 20, x: 4600, y: 0, label: 'Airtable\nСохранить', type: 'database', description: 'Сохранение результата в Airtable', params: 'Create record: status, date, info' },
                { id: 21, x: 2350, y: 200, label: 'HTTP Request\nОписание', type: 'integration', description: 'Получение описания вакансии (простой отклик)', params: 'HTTP: GET /vacancies/{id}' },
                { id: 22, x: 2600, y: 200, label: 'Edit Fields\nДанные', type: 'function', description: 'Подготовка данных', params: 'Set: description' },
                { id: 23, x: 2850, y: 200, label: 'OpenAI GPT-4\nПисьмо', type: 'integration', description: 'AI генерация письма', params: 'OpenAI: GPT-4.1-mini' },
                { id: 24, x: 3100, y: 200, label: 'Edit Fields\nФормат', type: 'function', description: 'Форматирование', params: 'Set: coverLetter, vacancyId' },
                { id: 25, x: 3350, y: 200, label: 'Playwright\nОтклик', type: 'integration', description: 'Отклик без анкеты', params: 'Playwright: click + paste letter' },
                { id: 26, x: 3600, y: 200, label: 'Airtable\nСохранить', type: 'database', description: 'Сохранение простого отклика', params: 'Airtable: Create record' },
                { id: 27, x: 2100, y: 300, label: 'Airtable\nПропущено', type: 'database', description: 'Сохранение пропущенных вакансий', params: 'Airtable: status=skipped' },
                { id: 28, x: 4850, y: 100, label: 'Wait\n40 секунд', type: 'function', description: 'Задержка между откликами', params: 'Wait: 40 seconds' }
            ],
            connections: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 2, to: 5 },
                { from: 3, to: 4 },
                { from: 5, to: 4 },
                { from: 4, to: 6 },
                { from: 6, to: 7 },
                { from: 7, to: 8 },
                { from: 8, to: 9 },
                { from: 9, to: 10 },
                { from: 9, to: 27 },
                { from: 10, to: 11 },
                { from: 10, to: 21 },
                { from: 11, to: 12 },
                { from: 12, to: 13 },
                { from: 13, to: 14 },
                { from: 14, to: 15 },
                { from: 15, to: 16 },
                { from: 16, to: 17 },
                { from: 17, to: 18 },
                { from: 18, to: 19 },
                { from: 19, to: 20 },
                { from: 20, to: 28 },
                { from: 21, to: 22 },
                { from: 22, to: 23 },
                { from: 23, to: 24 },
                { from: 24, to: 25 },
                { from: 25, to: 26 },
                { from: 26, to: 28 },
                { from: 27, to: 28 },
                { from: 28, to: 7 }
            ]
        },
        telegrambot: {
            nodes: [
                { id: 1, x: 100, y: 200, label: 'Telegram Trigger\nЗапуск', type: 'trigger', description: 'Telegram webhook триггер', params: 'Updates: all' },
                { id: 2, x: 350, y: 200, label: 'Code JS\nПолучить состояние', type: 'function', description: 'Получение состояния пользователя из workflow static data', params: 'Get State from global storage' },
                { id: 3, x: 600, y: 200, label: 'If\nНовый пользователь?', type: 'function', description: 'Проверка: userState === unknown', params: 'Condition: userState equals unknown' },
                { id: 4, x: 850, y: 80, label: 'Telegram\nПоказать меню', type: 'integration', description: 'Отправка клавиатуры с выбором: Картинка/Видео', params: 'Reply keyboard: Картинка, Видео' },
                { id: 5, x: 1100, y: 80, label: 'Code JS\nУстановить состояние', type: 'function', description: 'Установка состояния user для нового пользователя', params: 'Set state[chatId] = user' },
                { id: 6, x: 850, y: 320, label: 'Switch\nМаршрутизация', type: 'function', description: 'Маршрутизация по тексту сообщения и состоянию', params: '4 ветки: image, video, state-img, state-vid' },
                { id: 7, x: 1100, y: 200, label: 'Code JS\nСостояние: картинка', type: 'function', description: 'Установка состояния image', params: 'Set state[chatId] = image' },
                { id: 8, x: 1100, y: 320, label: 'Code JS\nСостояние: видео', type: 'function', description: 'Установка состояния video', params: 'Set state[chatId] = video' },
                { id: 9, x: 1350, y: 260, label: 'Telegram\nЗапрос промта', type: 'integration', description: 'Запрос текста промта у пользователя', params: 'Text: Напишите свой промт' },
                { id: 10, x: 1100, y: 440, label: 'Telegram\nГенерирую картинку', type: 'integration', description: 'Уведомление о начале генерации', params: 'Text: генерирую картинку...' },
                { id: 11, x: 1350, y: 440, label: 'OpenAI\nГенерация картинки', type: 'integration', description: 'Генерация изображения через OpenAI DALL-E', params: 'Model: gpt-image-1, Size: 1024x1024' },
                { id: 12, x: 1600, y: 440, label: 'Telegram\nОтправить фото', type: 'integration', description: 'Отправка сгенерированного изображения', params: 'Operation: sendPhoto, Caption: Готово!' },
                { id: 13, x: 1850, y: 440, label: 'Code JS\nОчистить состояние', type: 'function', description: 'Удаление состояния пользователя', params: 'Delete state[chatId]' },
                { id: 14, x: 1100, y: 580, label: 'Telegram\nГенерирую видео', type: 'integration', description: 'Уведомление о начале генерации видео', params: 'Text: генерирую видео...' },
                { id: 15, x: 1350, y: 580, label: 'OpenAI\nГенерация видео', type: 'integration', description: 'Генерация видео через OpenAI Sora', params: 'Model: sora-2' },
                { id: 16, x: 1600, y: 580, label: 'Telegram\nОтправить видео', type: 'integration', description: 'Отправка сгенерированного видео', params: 'Operation: sendVideo, Caption: Готово!' },
                { id: 17, x: 1850, y: 580, label: 'Code JS\nОчистить состояние', type: 'function', description: 'Удаление состояния пользователя', params: 'Delete state[chatId]' }
            ],
            connections: [
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 3, to: 6 },
                { from: 4, to: 5 },
                { from: 6, to: 7 },
                { from: 6, to: 8 },
                { from: 6, to: 10 },
                { from: 6, to: 14 },
                { from: 7, to: 9 },
                { from: 8, to: 9 },
                { from: 10, to: 11 },
                { from: 11, to: 12 },
                { from: 12, to: 13 },
                { from: 14, to: 15 },
                { from: 15, to: 16 },
                { from: 16, to: 17 }
            ]
        },
        autopost: {
            nodes: [
                { id: 1, x: 100, y: 300, label: 'Manual Trigger\nЗапуск', type: 'trigger', description: 'Ручной запуск воркфлоу', params: 'Execute workflow button' },
                { id: 2, x: 350, y: 100, label: 'HTTP Request\niTicket API', type: 'integration', description: 'Парсинг 5 страниц концертов с iTicket', params: 'GET api.iticket.uz/events (pages 1-5)' },
                { id: 3, x: 350, y: 300, label: 'HTTP Request\nAfisha API', type: 'integration', description: 'Парсинг 8 страниц событий с Afisha.uz', params: 'GET afisha.uz/api/event_schedules' },
                { id: 4, x: 350, y: 500, label: 'HTTP Request\nTicketon API', type: 'integration', description: 'Парсинг 3 страниц событий с Ticketon', params: 'GET ticketon.uz/api/v1/event (pages 1-3)' },
                { id: 5, x: 600, y: 100, label: 'Merge\nОбъединение iTicket', type: 'function', description: 'Объединение 5 страниц iTicket', params: 'Merge 5 inputs' },
                { id: 6, x: 850, y: 100, label: 'Split Out\nРазбор событий', type: 'function', description: 'Разбор массива событий на отдельные элементы', params: 'Split response.events.data' },
                { id: 7, x: 600, y: 300, label: 'Merge\nОбъединение Afisha', type: 'function', description: 'Объединение 8 страниц Afisha', params: 'Merge 8 inputs' },
                { id: 8, x: 850, y: 300, label: 'Code JS\nПарсинг Afisha', type: 'function', description: 'Декодирование base64 и извлечение данных', params: 'Decode permalinkCanonical, extract URLs' },
                { id: 9, x: 600, y: 500, label: 'Merge\nОбъединение Ticketon', type: 'function', description: 'Объединение 3 страниц Ticketon', params: 'Merge 3 inputs' },
                { id: 10, x: 850, y: 500, label: 'Code JS\nПарсинг Ticketon', type: 'function', description: 'Извлечение данных из Ticketon API', params: 'Extract events from data.data' },
                { id: 11, x: 1100, y: 300, label: 'Merge\nВсе источники', type: 'function', description: 'Объединение всех трех источников', params: 'Merge iTicket + Afisha + Ticketon' },
                { id: 12, x: 1350, y: 300, label: 'Code JS\nНормализация', type: 'function', description: 'Приведение к единому формату', params: 'Normalize: source, title, date, url, image' },
                { id: 13, x: 1600, y: 300, label: 'Code JS\nГруппировка', type: 'function', description: 'Создание массива concerts', params: 'Group all concerts into array' },
                { id: 14, x: 1600, y: 450, label: 'Airtable\nПоиск записей', type: 'database', description: 'Получение уже опубликованных событий', params: 'Search all records from Table 1' },
                { id: 15, x: 1850, y: 300, label: 'Merge\nДанные + БД', type: 'function', description: 'Объединение новых и существующих', params: 'Merge concerts with Airtable' },
                { id: 16, x: 2100, y: 300, label: 'Code JS\nДедупликация', type: 'function', description: 'Фильтрация дубликатов по source_id', params: 'Filter out existing concerts' },
                { id: 17, x: 2350, y: 300, label: 'Code JS\nПодготовка списка', type: 'function', description: 'Подготовка данных для AI', params: 'Create concert_list JSON' },
                { id: 18, x: 2600, y: 300, label: 'Code JS\nФильтр пустых', type: 'function', description: 'Удаление событий без названия', params: 'Filter empty titles' },
                { id: 19, x: 2850, y: 300, label: 'OpenAI GPT-4\nПоиск дубликатов', type: 'integration', description: 'AI анализ дубликатов по названию и дате', params: 'GPT-4.1-mini: fuzzy duplicate detection' },
                { id: 20, x: 3100, y: 300, label: 'Code JS\nОбработка дубликатов', type: 'function', description: 'Применение результатов AI дедупликации', params: 'Remove duplicates based on AI response' },
                { id: 21, x: 3350, y: 300, label: 'Loop Over Items\nЦикл по событиям', type: 'function', description: 'Обработка каждого события отдельно', params: 'Split in Batches: 1 item per batch' },
                { id: 22, x: 3600, y: 150, label: 'If\nИсточник iTicket?', type: 'function', description: 'Проверка источника события', params: 'IF source === iticket' },
                { id: 23, x: 3600, y: 350, label: 'If\nИсточник Afisha?', type: 'function', description: 'Проверка источника события', params: 'IF source === afisha' },
                { id: 24, x: 3850, y: 50, label: 'HTTP Request\nПарсинг iTicket', type: 'integration', description: 'Получение полного описания события', params: 'GET iticket.uz/events/{slug}' },
                { id: 25, x: 4100, y: 50, label: 'Code JS\nИзвлечение данных', type: 'function', description: 'Парсинг HTML: описание, цена, дата', params: 'Extract description, price, schedule' },
                { id: 26, x: 4350, y: 50, label: 'Merge\nДанные iTicket', type: 'function', description: 'Объединение с исходными данными', params: 'Merge loop item + parsed data' },
                { id: 27, x: 3850, y: 250, label: 'HTTP Request\nПарсинг Afisha', type: 'integration', description: 'Получение полного описания события', params: 'GET afisha.uz/{path}' },
                { id: 28, x: 4100, y: 250, label: 'Code JS\nИзвлечение данных', type: 'function', description: 'Парсинг HTML: описание, расписание', params: 'Extract description, schedule, price' },
                { id: 29, x: 4350, y: 250, label: 'Merge\nДанные Afisha', type: 'function', description: 'Объединение с исходными данными', params: 'Merge loop item + parsed data' },
                { id: 30, x: 3850, y: 450, label: 'HTTP Request\nПарсинг Ticketon', type: 'integration', description: 'Получение полного описания события', params: 'GET ticketon.uz/{url}' },
                { id: 31, x: 4100, y: 450, label: 'Code JS\nИзвлечение данных', type: 'function', description: 'Парсинг HTML: описание', params: 'Extract description from HTML' },
                { id: 32, x: 4350, y: 450, label: 'Merge\nДанные Ticketon', type: 'function', description: 'Объединение с исходными данными', params: 'Merge loop item + parsed data' },
                { id: 33, x: 4600, y: 50, label: 'OpenAI GPT-4\nГенерация поста', type: 'integration', description: 'AI генерация поста для Telegram', params: 'GPT-4.1-mini: format post with emoji' },
                { id: 34, x: 4600, y: 250, label: 'OpenAI GPT-4\nГенерация поста', type: 'integration', description: 'AI генерация поста для Telegram', params: 'GPT-4.1-mini: format post with emoji' },
                { id: 35, x: 4600, y: 450, label: 'OpenAI GPT-4\nГенерация поста', type: 'integration', description: 'AI генерация поста для Telegram', params: 'GPT-4.1-mini: format post with emoji' },
                { id: 36, x: 4850, y: 50, label: 'Telegram\nОтправка поста', type: 'integration', description: 'Публикация в канал Афиша Ташкента', params: 'sendPhoto to Telegram channel' },
                { id: 37, x: 4850, y: 250, label: 'Code JS\nКонвертация фото', type: 'function', description: 'Оптимизация изображения через Sharp', params: 'Resize 1280px, JPEG quality 85' },
                { id: 38, x: 5100, y: 250, label: 'Telegram\nОтправка поста', type: 'integration', description: 'Публикация в канал Афиша Ташкента', params: 'sendPhoto to Telegram channel' },
                { id: 39, x: 4850, y: 450, label: 'Telegram\nОтправка поста', type: 'integration', description: 'Публикация в канал Афиша Ташкента', params: 'sendPhoto to Telegram channel' },
                { id: 40, x: 5350, y: 300, label: 'Wait\n2 секунды', type: 'function', description: 'Задержка между постами', params: 'Wait 2 seconds' },
                { id: 41, x: 5600, y: 300, label: 'Airtable\nСохранить запись', type: 'database', description: 'Сохранение опубликованного события', params: 'Create record: source, title, date, url' }
            ],
            connections: [
                { from: 1, to: 2 },
                { from: 1, to: 3 },
                { from: 1, to: 4 },
                { from: 2, to: 5 },
                { from: 3, to: 7 },
                { from: 4, to: 9 },
                { from: 5, to: 6 },
                { from: 6, to: 11 },
                { from: 7, to: 8 },
                { from: 8, to: 11 },
                { from: 9, to: 10 },
                { from: 10, to: 11 },
                { from: 11, to: 12 },
                { from: 12, to: 13 },
                { from: 13, to: 15 },
                { from: 14, to: 15 },
                { from: 15, to: 16 },
                { from: 16, to: 17 },
                { from: 17, to: 18 },
                { from: 18, to: 19 },
                { from: 19, to: 20 },
                { from: 20, to: 21 },
                { from: 21, to: 22 },
                { from: 21, to: 23 },
                { from: 22, to: 24 },
                { from: 23, to: 27 },
                { from: 23, to: 30 },
                { from: 24, to: 25 },
                { from: 25, to: 26 },
                { from: 26, to: 33 },
                { from: 27, to: 28 },
                { from: 28, to: 29 },
                { from: 29, to: 34 },
                { from: 30, to: 31 },
                { from: 31, to: 32 },
                { from: 32, to: 35 },
                { from: 33, to: 36 },
                { from: 34, to: 37 },
                { from: 35, to: 39 },
                { from: 36, to: 40 },
                { from: 37, to: 38 },
                { from: 38, to: 40 },
                { from: 39, to: 40 },
                { from: 40, to: 41 },
                { from: 41, to: 21 }
            ]
        }
    };

    function initWorkflowCanvas() {
        if (!workflowVisualizer) {
            workflowVisualizer = new WorkflowVisualizer('workflowCanvas', projectData.hhautootklik);
        }
        
        window.addEventListener('resize', () => {
            if (workflowVisualizer) {
                workflowVisualizer.updateConnections();
            }
        });
    }

    // Zoom controls for workflow
    const workflowZoomInBtn = document.getElementById('zoomIn');
    const workflowZoomOutBtn = document.getElementById('zoomOut');
    const workflowResetViewBtn = document.getElementById('resetView');

    if (workflowZoomInBtn) {
        workflowZoomInBtn.addEventListener('click', () => {
            if (workflowVisualizer) {
                workflowVisualizer.zoomIn();
            }
        });
    }

    if (workflowZoomOutBtn) {
        workflowZoomOutBtn.addEventListener('click', () => {
            if (workflowVisualizer) {
                workflowVisualizer.zoomOut();
            }
        });
    }

    if (workflowResetViewBtn) {
        workflowResetViewBtn.addEventListener('click', () => {
            if (workflowVisualizer) {
                workflowVisualizer.resetView();
            }
        });
    }

    // Project selection
    const projectItems = document.querySelectorAll('.project-item');
    projectItems.forEach(item => {
        item.addEventListener('click', function() {
            projectItems.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            
            const projectId = this.getAttribute('data-project');
            if (workflowVisualizer && projectData[projectId]) {
                workflowVisualizer.loadProject(projectData[projectId]);
            }
        });
    });

    // Modal
    const modal = document.getElementById('nodeModal');
    const closeModalBtn = document.getElementById('closeModal');

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    // Gallery functionality
    let galleriesInitialized = false;

    function initGalleries() {
        if (galleriesInitialized) {
            return;
        }

        const galleries = document.querySelectorAll('.gallery-container');
        
        galleries.forEach(gallery => {
            const images = gallery.querySelectorAll('.gallery-image');
            const dots = gallery.querySelectorAll('.dot');
            const prevBtn = gallery.querySelector('.prev');
            const nextBtn = gallery.querySelector('.next');
            let currentIndex = 0;

            function showImage(index) {
                images.forEach(img => img.classList.remove('active'));
                dots.forEach(dot => dot.classList.remove('active'));
                
                images[index].classList.add('active');
                dots[index].classList.add('active');
                currentIndex = index;
            }

            function nextImage() {
                const nextIndex = (currentIndex + 1) % images.length;
                showImage(nextIndex);
            }

            function prevImage() {
                const prevIndex = (currentIndex - 1 + images.length) % images.length;
                showImage(prevIndex);
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    nextImage();
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    prevImage();
                });
            }

            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const index = parseInt(dot.getAttribute('data-index'));
                    showImage(index);
                });
            });

            // Add click event to images for fullscreen view
            images.forEach((img, index) => {
                img.addEventListener('click', () => {
                    openImageModal(gallery, index);
                });
            });

            // Auto-play (optional)
            // setInterval(nextImage, 5000);
        });

        galleriesInitialized = true;
    }

    // Image Modal functionality
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const imageContainer = document.getElementById('imageContainer');
    const closeImageModalBtn = document.getElementById('closeImageModal');
    const imageModalPrev = document.getElementById('imageModalPrev');
    const imageModalNext = document.getElementById('imageModalNext');
    const modalImageCounter = document.getElementById('modalImageCounter');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    
    let currentGallery = null;
    let currentModalIndex = 0;
    let galleryImages = [];
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    function openImageModal(gallery, index) {
        currentGallery = gallery;
        currentModalIndex = index;
        galleryImages = Array.from(gallery.querySelectorAll('.gallery-image'));
        
        resetZoom();
        updateModalImage();
        imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function updateModalImage() {
        const currentImage = galleryImages[currentModalIndex];
        modalImage.src = currentImage.src;
        modalImage.alt = currentImage.alt;
        modalImageCounter.textContent = `${currentModalIndex + 1} / ${galleryImages.length}`;
        resetZoom();
    }

    function closeImageModal() {
        imageModal.classList.remove('active');
        document.body.style.overflow = '';
        currentGallery = null;
        resetZoom();
    }

    function nextModalImage() {
        currentModalIndex = (currentModalIndex + 1) % galleryImages.length;
        updateModalImage();
    }

    function prevModalImage() {
        currentModalIndex = (currentModalIndex - 1 + galleryImages.length) % galleryImages.length;
        updateModalImage();
    }

    function resetZoom() {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateImageTransform();
        modalImage.classList.remove('zoomed');
        imageContainer.style.cursor = 'grab';
    }

    function zoomIn() {
        scale = Math.min(scale * 1.3, 5);
        updateImageTransform();
        if (scale > 1) {
            modalImage.classList.add('zoomed');
        }
    }

    function zoomOut() {
        scale = Math.max(scale / 1.3, 1);
        if (scale === 1) {
            translateX = 0;
            translateY = 0;
            modalImage.classList.remove('zoomed');
        }
        updateImageTransform();
    }

    function updateImageTransform() {
        modalImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    // Zoom controls
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', zoomIn);
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', zoomOut);
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', resetZoom);
    }

    // Mouse wheel zoom
    if (imageContainer) {
        imageContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        });
    }

    // Drag functionality
    if (modalImage) {
        modalImage.addEventListener('mousedown', (e) => {
            if (scale > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                imageContainer.classList.add('dragging');
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && scale > 1) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateImageTransform();
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            imageContainer.classList.remove('dragging');
        });
    }

    if (closeImageModalBtn) {
        closeImageModalBtn.addEventListener('click', closeImageModal);
    }

    if (imageModalPrev) {
        imageModalPrev.addEventListener('click', prevModalImage);
    }

    if (imageModalNext) {
        imageModalNext.addEventListener('click', nextModalImage);
    }

    // Close modal on background click
    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                closeImageModal();
            }
        });
    }

    // Keyboard navigation for modal
    document.addEventListener('keydown', (e) => {
        if (imageModal.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeImageModal();
            } else if (e.key === 'ArrowLeft') {
                prevModalImage();
            } else if (e.key === 'ArrowRight') {
                nextModalImage();
            } else if (e.key === '+' || e.key === '=') {
                zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoom();
            }
        }
    });

    // Initialize galleries when websites section is shown
    const websitesBtn = document.querySelector('[data-category="websites"]');
    if (websitesBtn) {
        websitesBtn.addEventListener('click', () => {
            setTimeout(initGalleries, 100);
        });
    }

    const websitesSectionVisible = document.getElementById('websites-content');
    if (websitesSectionVisible && websitesSectionVisible.style.display !== 'none') {
        initGalleries();
    }
});
