// Smart Study Planner JavaScript

class StudyPlanner {
    constructor() {
        this.tasks = [];
        this.currentWeekStart = this.getWeekStart(new Date());
        this.editingTaskId = null;
        this.init();
    }

    init() {
        this.loadTasks();
        this.bindEvents();
        this.updateDashboard();
        this.renderTasks();
        this.renderTimeline();
        this.updateAnalytics();
        this.setDefaultDate();
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Quick add form
        document.getElementById('quickAddForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addQuickTask();
        });

        // Add task modal
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('modalOverlay').addEventListener('click', () => this.closeTaskModal());

        // Task form
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Filters
        document.getElementById('filterStatus').addEventListener('change', () => this.renderTasks());
        document.getElementById('filterPriority').addEventListener('change', () => this.renderTasks());
        document.getElementById('searchTasks').addEventListener('input', () => this.renderTasks());

        // Timeline navigation
        document.getElementById('prevWeek').addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek').addEventListener('click', () => this.navigateWeek(1));
    }

    // Task Management Methods
    addQuickTask() {
        const title = document.getElementById('quickTaskTitle').value.trim();
        const date = document.getElementById('quickTaskDate').value;
        const priority = document.getElementById('quickTaskPriority').value;

        if (!title || !date) {
            alert('Please fill in all required fields');
            return;
        }

        const task = {
            id: Date.now().toString(),
            title,
            description: '',
            dueDate: new Date(date + 'T23:59:59'),
            priority,
            subject: '',
            estimatedTime: 1,
            tags: [],
            status: 'pending',
            createdAt: new Date(),
            completedAt: null
        };

        this.tasks.push(task);
        this.saveTasks();
        this.updateAll();
        this.addActivity('created', `Created task: ${title}`);
        
        // Reset form
        document.getElementById('quickAddForm').reset();
        this.setDefaultDate();
        
        // Show success feedback
        this.showNotification('Task added successfully!', 'success');
    }

    openTaskModal(taskId = null) {
        this.editingTaskId = taskId;
        const modal = document.getElementById('taskModal');
        const overlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                modalTitle.textContent = 'Edit Task';
                this.fillTaskForm(task);
            }
        } else {
            modalTitle.textContent = 'Add New Task';
            this.clearTaskForm();
        }
        
        modal.classList.add('active');
        overlay.classList.add('active');
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('taskTitle').focus();
        }, 100);
    }

    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        const overlay = document.getElementById('modalOverlay');
        modal.classList.remove('active');
        overlay.classList.remove('active');
        this.editingTaskId = null;
        this.clearTaskForm();
    }

    fillTaskForm(task) {
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskDueDate').value = this.formatDateTimeLocal(task.dueDate);
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskSubject').value = task.subject;
        document.getElementById('taskEstimatedTime').value = task.estimatedTime;
        document.getElementById('taskTags').value = task.tags.join(', ');
    }

    clearTaskForm() {
        document.getElementById('taskForm').reset();
        this.setDefaultDate();
    }

    saveTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const dueDate = new Date(document.getElementById('taskDueDate').value);
        const priority = document.getElementById('taskPriority').value;
        const subject = document.getElementById('taskSubject').value.trim();
        const estimatedTime = parseFloat(document.getElementById('taskEstimatedTime').value) || 1;
        const tags = document.getElementById('taskTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);

        if (!title) {
            alert('Please enter a task title');
            return;
        }

        if (this.editingTaskId) {
            const taskIndex = this.tasks.findIndex(t => t.id === this.editingTaskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = {
                    ...this.tasks[taskIndex],
                    title,
                    description,
                    dueDate,
                    priority,
                    subject,
                    estimatedTime,
                    tags
                };
                this.addActivity('updated', `Updated task: ${title}`);
                this.showNotification('Task updated successfully!', 'success');
            }
        } else {
            const task = {
                id: Date.now().toString(),
                title,
                description,
                dueDate,
                priority,
                subject,
                estimatedTime,
                tags,
                status: 'pending',
                createdAt: new Date(),
                completedAt: null
            };
            this.tasks.push(task);
            this.addActivity('created', `Created task: ${title}`);
            this.showNotification('Task created successfully!', 'success');
        }

        this.saveTasks();
        this.updateAll();
        this.closeTaskModal();
    }

    toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (task.status === 'completed') {
                task.status = 'pending';
                task.completedAt = null;
                this.addActivity('updated', `Reopened task: ${task.title}`);
                this.showNotification('Task marked as pending', 'info');
            } else {
                task.status = 'completed';
                task.completedAt = new Date();
                this.addActivity('completed', `Completed task: ${task.title}`);
                this.showNotification('Task completed! 🎉', 'success');
            }
            this.saveTasks();
            this.updateAll();
        }
    }

    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = this.tasks[taskIndex];
            this.tasks.splice(taskIndex, 1);
            this.saveTasks();
            this.updateAll();
            this.addActivity('updated', `Deleted task: ${task.title}`);
            this.showNotification('Task deleted', 'info');
        }
    }

    // Rendering Methods
    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const statusFilter = document.getElementById('filterStatus').value;
        const priorityFilter = document.getElementById('filterPriority').value;
        const searchTerm = document.getElementById('searchTasks').value.toLowerCase();

        let filteredTasks = this.tasks.filter(task => {
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
            const matchesSearch = searchTerm === '' || 
                                task.title.toLowerCase().includes(searchTerm) || 
                                task.description.toLowerCase().includes(searchTerm) ||
                                task.subject.toLowerCase().includes(searchTerm) ||
                                task.tags.some(tag => tag.toLowerCase().includes(searchTerm));
            return matchesStatus && matchesPriority && matchesSearch;
        });

        // Sort by due date, then by priority
        filteredTasks.sort((a, b) => {
            const dateA = new Date(a.dueDate);
            const dateB = new Date(b.dueDate);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        if (filteredTasks.length === 0) {
            container.innerHTML = '<p class="no-tasks">No tasks found matching your criteria.</p>';
            return;
        }

        const tasksHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
        container.innerHTML = tasksHTML;

        // Bind task action events
        this.bindTaskEvents(container);
    }

    createTaskHTML(task) {
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const isOverdue = dueDate < now && task.status !== 'completed';
        const tagsHTML = task.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        
        return `
            <div class="task-item ${task.priority} ${task.status === 'completed' ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-info">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        <span><i class="fas fa-calendar"></i> ${this.formatDate(dueDate)} ${isOverdue ? '<span class="priority-high">(Overdue)</span>' : ''}</span>
                        <span><i class="fas fa-flag"></i> <span class="priority-${task.priority}">${task.priority} priority</span></span>
                        ${task.subject ? `<span><i class="fas fa-book"></i> ${this.escapeHtml(task.subject)}</span>` : ''}
                        <span><i class="fas fa-clock"></i> ${task.estimatedTime}h</span>
                        <span class="status-badge status-${task.status}">${task.status.replace('-', ' ')}</span>
                    </div>
                    ${task.tags.length > 0 ? `<div class="task-tags">${tagsHTML}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn-complete" data-task-id="${task.id}" title="${task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}">
                        <i class="fas ${task.status === 'completed' ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button class="btn-edit" data-task-id="${task.id}" title="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-task-id="${task.id}" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    bindTaskEvents(container) {
        container.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTaskStatus(btn.dataset.taskId);
            });
        });

        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openTaskModal(btn.dataset.taskId);
            });
        });

        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteTask(btn.dataset.taskId);
                }
            });
        });
    }

    updateDashboard() {
        // Update stats
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('progressPercent').textContent = progressPercent + '%';

        // Update progress circle
        this.updateProgressCircle(progressPercent);

        // Update upcoming tasks
        this.renderUpcomingTasks();

        // Update recent activity
        this.renderRecentActivity();
    }

    updateProgressCircle(percent) {
        const circle = document.getElementById('progressCircle');
        const value = document.getElementById('progressValue');
        
        circle.style.background = `conic-gradient(#5a67d8 ${percent * 3.6}deg, #e2e8f0 0deg)`;
        value.textContent = percent + '%';
    }

    renderUpcomingTasks() {
        const container = document.getElementById('upcomingTasksList');
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const upcomingTasks = this.tasks
            .filter(task => task.status !== 'completed' && new Date(task.dueDate) <= nextWeek)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);

        if (upcomingTasks.length === 0) {
            container.innerHTML = '<p class="no-tasks">No upcoming tasks</p>';
            return;
        }

        const tasksHTML = upcomingTasks.map(task => {
            const dueDate = new Date(task.dueDate);
            const isOverdue = dueDate < now;
            return `
                <div class="task-item ${task.priority}" style="margin-bottom: 8px;">
                    <div class="task-info">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <span class="${isOverdue ? 'priority-high' : ''}">${this.formatDate(dueDate)} ${isOverdue ? '(Overdue)' : ''}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = tasksHTML;
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        const activities = this.getRecentActivities().slice(0, 5);

        if (activities.length === 0) {
            container.innerHTML = '<p class="no-activity">No recent activity</p>';
            return;
        }

        const activitiesHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-text">${this.escapeHtml(activity.message)}</div>
                <div class="activity-time">${this.getTimeAgo(activity.timestamp)}</div>
            </div>
        `).join('');

        container.innerHTML = activitiesHTML;
    }

    renderTimeline() {
        const container = document.getElementById('timelineDays');
        const weekStart = new Date(this.currentWeekStart);
        
        // Update week display
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        document.getElementById('currentWeek').textContent = 
            `${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)}`;

        const daysHTML = [];
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
            const dayTasks = this.getTasksForDay(currentDay);
            
            const tasksHTML = dayTasks.map(task => `
                <div class="timeline-task ${task.priority}" title="${this.escapeHtml(task.title)} - ${task.subject ? this.escapeHtml(task.subject) : 'No subject'}">
                    ${this.escapeHtml(task.title)}
                    ${task.status === 'completed' ? ' ✓' : ''}
                </div>
            `).join('');

            const isToday = this.isSameDay(currentDay, new Date());
            const dayHeaderClass = isToday ? 'day-header today' : 'day-header';

            daysHTML.push(`
                <div class="timeline-day">
                    <div class="${dayHeaderClass}">
                        ${this.getDayName(currentDay)}
                        <br>
                        <small>${currentDay.getDate()}</small>
                        ${isToday ? '<small style="color: #5a67d8; font-weight: bold;">Today</small>' : ''}
                    </div>
                    <div class="day-tasks">
                        ${tasksHTML || '<p style="color: #999; font-size: 0.8rem; margin-top: 20px;">No tasks</p>'}
                    </div>
                </div>
            `);
        }

        container.innerHTML = daysHTML.join('');
    }

    updateAnalytics() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        document.getElementById('completionRate').textContent = completionRate + '%';
        
        // Calculate study streak
        const streak = this.calculateStudyStreak();
        document.getElementById('studyStreak').textContent = streak;

        // Priority distribution
        this.renderPriorityChart();
        
        // Weekly progress
        this.renderWeeklyChart();
    }

    renderPriorityChart() {
        const container = document.getElementById('priorityChart');
        const priorities = { high: 0, medium: 0, low: 0 };
        
        this.tasks.forEach(task => {
            priorities[task.priority]++;
        });

        const total = this.tasks.length;
        if (total === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">No data available</p>';
            return;
        }

        const chartHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #e53e3e; font-weight: 600;">High</span>
                    <div style="flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; margin: 0 12px; overflow: hidden;">
                        <div style="width: ${total > 0 ? (priorities.high / total) * 100 : 0}%; height: 100%; background: linear-gradient(90deg, #e53e3e, #fc8181); border-radius: 5px; transition: width 0.5s ease;"></div>
                    </div>
                    <span style="font-weight: 600; min-width: 20px; text-align: right;">${priorities.high}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #dd6b20; font-weight: 600;">Medium</span>
                    <div style="flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; margin: 0 12px; overflow: hidden;">
                        <div style="width: ${total > 0 ? (priorities.medium / total) * 100 : 0}%; height: 100%; background: linear-gradient(90deg, #dd6b20, #f6ad55); border-radius: 5px; transition: width 0.5s ease;"></div>
                    </div>
                    <span style="font-weight: 600; min-width: 20px; text-align: right;">${priorities.medium}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #38a169; font-weight: 600;">Low</span>
                    <div style="flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; margin: 0 12px; overflow: hidden;">
                        <div style="width: ${total > 0 ? (priorities.low / total) * 100 : 0}%; height: 100%; background: linear-gradient(90deg, #38a169, #68d391); border-radius: 5px; transition: width 0.5s ease;"></div>
                    </div>
                    <span style="font-weight: 600; min-width: 20px; text-align: right;">${priorities.low}</span>
                </div>
            </div>
        `;

        container.innerHTML = chartHTML;
    }

    renderWeeklyChart() {
        const container = document.getElementById('weeklyChart');
        const weeklyData = this.getWeeklyCompletionData();
        
        const maxValue = Math.max(...weeklyData, 1);
        const chartHTML = weeklyData.map((value, index) => {
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index];
            return `
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                    <div style="height: 80px; display: flex; align-items: end; width: 100%;">
                        <div style="width: 24px; height: ${Math.max(height, 2)}%; background: linear-gradient(to top, #5a67d8, #667eea); border-radius: 3px 3px 0 0; margin: 0 auto; transition: height 0.5s ease;"></div>
                    </div>
                    <small style="margin-top: 8px; color: #718096; font-weight: 500;">${day}</small>
                    <small style="color: #2d3748; font-weight: 600;">${value}</small>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div style="display: flex; gap: 8px; height: 120px; align-items: end;">${chartHTML}</div>`;
    }

    // Helper Methods
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        // Refresh content based on active tab
        if (tabName === 'timeline') {
            this.renderTimeline();
        } else if (tabName === 'analytics') {
            this.updateAnalytics();
        } else if (tabName === 'tasks') {
            this.renderTasks();
        }
    }

    getTasksForDay(date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        return this.tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= dayStart && taskDate <= dayEnd;
        }).sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    navigateWeek(direction) {
        this.currentWeekStart = new Date(this.currentWeekStart.getTime() + direction * 7 * 24 * 60 * 60 * 1000);
        this.renderTimeline();
    }

    getWeekStart(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        return start;
    }

    getDayName(date) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    }

    formatDateTimeLocal(date) {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    setDefaultDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 0, 0);
        
        const quickDate = document.getElementById('quickTaskDate');
        const taskDate = document.getElementById('taskDueDate');
        
        if (quickDate) quickDate.value = tomorrow.toISOString().split('T')[0];
        if (taskDate) taskDate.value = this.formatDateTimeLocal(tomorrow);
    }

    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    calculateStudyStreak() {
        const completedDates = this.tasks
            .filter(task => task.completedAt)
            .map(task => new Date(task.completedAt).toDateString())
            .filter((date, index, arr) => arr.indexOf(date) === index)
            .sort((a, b) => new Date(b) - new Date(a));

        if (completedDates.length === 0) return 0;

        let streak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

        // Start from today or yesterday if there are completed tasks
        let startDate = null;
        if (completedDates.includes(today)) {
            startDate = today;
        } else if (completedDates.includes(yesterday)) {
            startDate = yesterday;
        } else {
            return 0;
        }

        // Count consecutive days
        let currentDate = new Date(startDate);
        while (completedDates.includes(currentDate.toDateString())) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }

    getWeeklyCompletionData() {
        const weekStart = this.getWeekStart(new Date());
        const data = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

        this.tasks.forEach(task => {
            if (task.completedAt) {
                const completedDate = new Date(task.completedAt);
                const daysDiff = Math.floor((completedDate - weekStart) / (24 * 60 * 60 * 1000));
                if (daysDiff >= 0 && daysDiff < 7) {
                    data[daysDiff]++;
                }
            }
        });

        return data;
    }

    // Activity Management
    addActivity(type, message) {
        const activities = this.getActivities();
        activities.unshift({
            type,
            message,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 activities
        const limitedActivities = activities.slice(0, 50);
        this.saveActivities(limitedActivities);
    }

    getActivities() {
        try {
            return JSON.parse(localStorage.getItem('studyPlannerActivities') || '[]');
        } catch {
            return [];
        }
    }

    saveActivities(activities) {
        try {
            localStorage.setItem('studyPlannerActivities', JSON.stringify(activities));
        } catch (e) {
            console.warn('Could not save activities:', e);
        }
    }

    getRecentActivities() {
        return this.getActivities().slice(0, 10);
    }

    getActivityIcon(type) {
        const icons = {
            completed: 'fa-check-circle',
            created: 'fa-plus-circle',
            updated: 'fa-edit'
        };
        return icons[type] || 'fa-circle';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return past.toLocaleDateString();
    }

    // Utility Methods
    updateAll() {
        this.updateDashboard();
        this.renderTasks();
        this.renderTimeline();
        this.updateAnalytics();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Local Storage Methods
    loadTasks() {
        try {
            const saved = localStorage.getItem('studyPlannerTasks');
            if (saved) {
                this.tasks = JSON.parse(saved).map(task => ({
                    ...task,
                    dueDate: new Date(task.dueDate),
                    createdAt: new Date(task.createdAt),
                    completedAt: task.completedAt ? new Date(task.completedAt) : null
                }));
            }
        } catch (e) {
            console.warn('Could not load tasks from storage:', e);
            this.tasks = [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('studyPlannerTasks', JSON.stringify(this.tasks));
        } catch (e) {
            console.warn('Could not save tasks to storage:', e);
            this.showNotification('Failed to save tasks', 'error');
        }
    }

    // Data Export/Import Methods
    exportData() {
        const data = {
            tasks: this.tasks,
            activities: this.getActivities(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.tasks && Array.isArray(data.tasks)) {
                    // Validate and restore tasks
                    this.tasks = data.tasks.map(task => ({
                        ...task,
                        dueDate: new Date(task.dueDate),
                        createdAt: new Date(task.createdAt),
                        completedAt: task.completedAt ? new Date(task.completedAt) : null
                    }));
                    
                    this.saveTasks();
                    
                    if (data.activities && Array.isArray(data.activities)) {
                        this.saveActivities(data.activities);
                    }
                    
                    this.updateAll();
                    this.showNotification('Data imported successfully!', 'success');
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('Failed to import data. Please check file format.', 'error');
            }
        };
        
        reader.readAsText(file);
    }

    // Statistics Methods
    getTaskStats() {
        const stats = {
            total: this.tasks.length,
            completed: this.tasks.filter(t => t.status === 'completed').length,
            pending: this.tasks.filter(t => t.status === 'pending').length,
            inProgress: this.tasks.filter(t => t.status === 'in-progress').length,
            overdue: this.tasks.filter(t => {
                const now = new Date();
                const dueDate = new Date(t.dueDate);
                return dueDate < now && t.status !== 'completed';
            }).length
        };
        
        stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        
        return stats;
    }

    getSubjectStats() {
        const subjects = {};
        this.tasks.forEach(task => {
            if (task.subject) {
                if (!subjects[task.subject]) {
                    subjects[task.subject] = { total: 0, completed: 0 };
                }
                subjects[task.subject].total++;
                if (task.status === 'completed') {
                    subjects[task.subject].completed++;
                }
            }
        });
        
        return Object.entries(subjects).map(([subject, data]) => ({
            subject,
            total: data.total,
            completed: data.completed,
            completionRate: Math.round((data.completed / data.total) * 100)
        }));
    }

    // Search and Filter Methods
    searchTasks(query) {
        const searchTerm = query.toLowerCase();
        return this.tasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm) ||
            task.description.toLowerCase().includes(searchTerm) ||
            task.subject.toLowerCase().includes(searchTerm) ||
            task.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    getTasksByPriority(priority) {
        return this.tasks.filter(task => task.priority === priority);
    }

    getTasksByStatus(status) {
        return this.tasks.filter(task => task.status === status);
    }

    getOverdueTasks() {
        const now = new Date();
        return this.tasks.filter(task => {
            const dueDate = new Date(task.dueDate);
            return dueDate < now && task.status !== 'completed';
        });
    }

    // Reminder Methods
    checkReminders() {
        const now = new Date();
        const reminderTime = 24 * 60 * 60 * 1000; // 24 hours before due date
        
        this.tasks.forEach(task => {
            if (task.status !== 'completed') {
                const dueDate = new Date(task.dueDate);
                const timeDiff = dueDate - now;
                
                if (timeDiff > 0 && timeDiff <= reminderTime) {
                    this.showNotification(`Reminder: "${task.title}" is due tomorrow!`, 'info');
                }
            }
        });
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N: New task
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openTaskModal();
            }
            
            // Ctrl/Cmd + F: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('searchTasks');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Escape: Close modal
            if (e.key === 'Escape') {
                this.closeTaskModal();
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const planner = new StudyPlanner();
    
    // Setup keyboard shortcuts
    planner.setupKeyboardShortcuts();
    
    // Check for reminders every 30 minutes
    setInterval(() => {
        planner.checkReminders();
    }, 30 * 60 * 1000);
    
    // Check reminders on load
    setTimeout(() => {
        planner.checkReminders();
    }, 2000);
    
    // Make planner globally accessible for debugging
    window.studyPlanner = planner;
});

// Add notification styles dynamically
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 2000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        border-left: 4px solid #5a67d8;
    }
    
    .notification.success {
        border-left-color: #48bb78;
        color: #2f855a;
    }
    
    .notification.error {
        border-left-color: #f56565;
        color: #c53030;
    }
    
    .notification.info {
        border-left-color: #4299e1;
        color: #2b6cb0;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .today {
        background: linear-gradient(135deg, #5a67d8, #667eea) !important;
        color: white !important;
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);