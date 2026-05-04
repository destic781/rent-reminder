let tenants = [];
let paymentRecords = [];
let settings = {
    reminderDays: 5,
    reminderTime: '09:00'
};

const STORAGE_KEYS = {
    TENANTS: 'rent_reminder_tenants',
    RECORDS: 'rent_reminder_records',
    SETTINGS: 'rent_reminder_settings'
};

function loadData() {
    const storedTenants = localStorage.getItem(STORAGE_KEYS.TENANTS);
    const storedRecords = localStorage.getItem(STORAGE_KEYS.RECORDS);
    const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

    if (storedTenants) {
        tenants = JSON.parse(storedTenants);
    }
    if (storedRecords) {
        paymentRecords = JSON.parse(storedRecords);
    }
    if (storedSettings) {
        settings = JSON.parse(storedSettings);
        document.getElementById('reminder-days').value = settings.reminderDays;
        document.getElementById('reminder-time').value = settings.reminderTime;
    }
}

function saveTenants() {
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
}

function saveRecords() {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(paymentRecords));
}

function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatCurrency(amount) {
    return '¥' + Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0 });
}

function getNextPaymentDate(tenant) {
    const startDate = new Date(tenant.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paymentDay = tenant.paymentDay || 1;
    const cycleMonths = tenant.cycleMonths || 1;

    let nextDate = new Date(startDate);
    while (nextDate <= today) {
        nextDate.setMonth(nextDate.getMonth() + cycleMonths);
    }

    const expectedDate = new Date(nextDate);
    expectedDate.setDate(paymentDay);

    return {
        date: expectedDate,
        dateStr: formatDate(expectedDate),
        cycleMonths: cycleMonths,
        paymentDay: paymentDay
    };
}

function getPaymentStatus(tenant) {
    const next = getNextPaymentDate(tenant);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((next.date - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { status: 'overdue', days: Math.abs(diffDays), nextDate: next.dateStr };
    } else if (diffDays <= settings.reminderDays) {
        return { status: 'warning', days: diffDays, nextDate: next.dateStr };
    } else {
        return { status: 'pending', days: diffDays, nextDate: next.dateStr };
    }
}

function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`page-${pageName}`).classList.add('active');
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    if (pageName === 'home') {
        renderRentReminders();
    } else if (pageName === 'tenants') {
        renderTenantList();
    } else if (pageName === 'records') {
        renderPaymentRecords();
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showModal(title, bodyHtml, footerHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal(event) {
    if (!event || event.target.id === 'modal-overlay') {
        document.getElementById('modal-overlay').classList.remove('active');
    }
}

function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-btn').onclick = onConfirm;
    document.getElementById('confirm-modal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('active');
}

function showAddTenantModal() {
    const bodyHtml = `
        <div class="form-group">
            <label>房客姓名 *</label>
            <input type="text" id="tenant-name" placeholder="请输入房客姓名" required>
        </div>
        <div class="form-group">
            <label>联系电话</label>
            <input type="tel" id="tenant-phone" placeholder="请输入联系电话">
        </div>
        <div class="form-group">
            <label>月租金 *</label>
            <input type="number" id="tenant-rent" placeholder="请输入每月租金金额" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>起租日期 *</label>
                <input type="date" id="tenant-start-date" required>
            </div>
            <div class="form-group">
                <label>交租日期</label>
                <select id="tenant-payment-day">
                    ${Array.from({length: 28}, (_, i) => `<option value="${i + 1}" ${i === 0 ? 'selected' : ''}>${i + 1}号</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>交租周期</label>
            <select id="tenant-cycle-months">
                <option value="1">每1个月</option>
                <option value="2">每2个月</option>
                <option value="3">每3个月</option>
                <option value="6">每6个月</option>
                <option value="12">每12个月</option>
            </select>
        </div>
        <div class="form-group">
            <label>备注</label>
            <textarea id="tenant-note" rows="2" placeholder="可选备注信息"></textarea>
        </div>
    `;

    const footerHtml = `
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="saveTenant()">保存</button>
    `;

    showModal('添加房客', bodyHtml, footerHtml);

    document.getElementById('tenant-start-date').value = formatDate(new Date());
}

function saveTenant() {
    const name = document.getElementById('tenant-name').value.trim();
    const phone = document.getElementById('tenant-phone').value.trim();
    const rent = parseFloat(document.getElementById('tenant-rent').value);
    const startDate = document.getElementById('tenant-start-date').value;
    const paymentDay = parseInt(document.getElementById('tenant-payment-day').value);
    const cycleMonths = parseInt(document.getElementById('tenant-cycle-months').value);
    const note = document.getElementById('tenant-note').value.trim();

    if (!name || !rent || !startDate) {
        showToast('请填写必填项');
        return;
    }

    const tenant = {
        id: generateId(),
        name,
        phone,
        rent,
        startDate,
        paymentDay,
        cycleMonths,
        note,
        createdAt: new Date().toISOString()
    };

    tenants.push(tenant);
    saveTenants();
    closeModal();
    renderTenantList();
    showToast('房客添加成功');
}

function renderTenantList() {
    const container = document.getElementById('tenant-list');
    const noTenants = document.getElementById('no-tenants');

    if (tenants.length === 0) {
        container.innerHTML = '';
        noTenants.style.display = 'block';
        return;
    }

    noTenants.style.display = 'none';

    container.innerHTML = tenants.map(tenant => {
        const status = getPaymentStatus(tenant);
        const next = getNextPaymentDate(tenant);

        return `
            <div class="tenant-card" onclick="showTenantDetail('${tenant.id}')">
                <div class="tenant-name">${tenant.name}</div>
                <div class="tenant-info">${tenant.phone || '无电话'}</div>
                <div class="tenant-rent">${formatCurrency(tenant.rent)}/月</div>
                <div class="card-actions">
                    <button class="btn btn-success" onclick="event.stopPropagation(); showPayModal('${tenant.id}')">确认交租</button>
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); showEditTenantModal('${tenant.id}')">编辑</button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); deleteTenant('${tenant.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

function showTenantDetail(tenantId) {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const status = getPaymentStatus(tenant);
    const next = getNextPaymentDate(tenant);

    let statusText = '';
    let statusClass = '';

    if (status.status === 'overdue') {
        statusText = `已逾期${status.days}天`;
        statusClass = 'overdue';
    } else if (status.status === 'warning') {
        statusText = `还有${status.days}天到期`;
        statusClass = 'warning';
    } else {
        statusText = `${status.days}天后到期`;
        statusClass = 'pending';
    }

    const bodyHtml = `
        <div class="tenant-detail">
            <div class="tenant-detail-item">
                <span class="label">房客姓名</span>
                <span>${tenant.name}</span>
            </div>
            <div class="tenant-detail-item">
                <span class="label">联系电话</span>
                <span>${tenant.phone || '无'}</span>
            </div>
            <div class="tenant-detail-item">
                <span class="label">月租金</span>
                <span style="color: var(--primary); font-weight: 600;">${formatCurrency(tenant.rent)}</span>
            </div>
            <div class="tenant-detail-item">
                <span class="label">起租日期</span>
                <span>${tenant.startDate}</span>
            </div>
            <div class="tenant-detail-item">
                <span class="label">交租日期</span>
                <span>每月${tenant.paymentDay}号</span>
            </div>
            <div class="tenant-detail-item">
                <span class="label">交租周期</span>
                <span>每${tenant.cycleMonths}个月</span>
            </div>
            ${tenant.note ? `
            <div class="tenant-detail-item">
                <span class="label">备注</span>
                <span>${tenant.note}</span>
            </div>
            ` : ''}
            <div class="tenant-detail-item">
                <span class="label">下次交租</span>
                <span class="status-badge ${statusClass}">${statusText} (${status.nextDate})</span>
            </div>
        </div>
    `;

    const footerHtml = `
        <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        <button class="btn btn-success" onclick="closeModal(); showPayModal('${tenant.id}')">确认交租</button>
    `;

    showModal('房客详情', bodyHtml, footerHtml);
}

function showEditTenantModal(tenantId) {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const bodyHtml = `
        <div class="form-group">
            <label>房客姓名 *</label>
            <input type="text" id="edit-tenant-name" value="${tenant.name}" required>
        </div>
        <div class="form-group">
            <label>联系电话</label>
            <input type="tel" id="edit-tenant-phone" value="${tenant.phone || ''}">
        </div>
        <div class="form-group">
            <label>月租金 *</label>
            <input type="number" id="edit-tenant-rent" value="${tenant.rent}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>起租日期 *</label>
                <input type="date" id="edit-tenant-start-date" value="${tenant.startDate}" required>
            </div>
            <div class="form-group">
                <label>交租日期</label>
                <select id="edit-tenant-payment-day">
                    ${Array.from({length: 28}, (_, i) => `<option value="${i + 1}" ${tenant.paymentDay === i + 1 ? 'selected' : ''}>${i + 1}号</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>交租周期</label>
            <select id="edit-tenant-cycle-months">
                ${[1, 2, 3, 6, 12].map(m => `<option value="${m}" ${tenant.cycleMonths === m ? 'selected' : ''}>每${m}个月</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>备注</label>
            <textarea id="edit-tenant-note" rows="2">${tenant.note || ''}</textarea>
        </div>
    `;

    const footerHtml = `
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="updateTenant('${tenant.id}')">保存</button>
    `;

    showModal('编辑房客', bodyHtml, footerHtml);
}

function updateTenant(tenantId) {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const name = document.getElementById('edit-tenant-name').value.trim();
    const phone = document.getElementById('edit-tenant-phone').value.trim();
    const rent = parseFloat(document.getElementById('edit-tenant-rent').value);
    const startDate = document.getElementById('edit-tenant-start-date').value;
    const paymentDay = parseInt(document.getElementById('edit-tenant-payment-day').value);
    const cycleMonths = parseInt(document.getElementById('edit-tenant-cycle-months').value);
    const note = document.getElementById('edit-tenant-note').value.trim();

    if (!name || !rent || !startDate) {
        showToast('请填写必填项');
        return;
    }

    tenant.name = name;
    tenant.phone = phone;
    tenant.rent = rent;
    tenant.startDate = startDate;
    tenant.paymentDay = paymentDay;
    tenant.cycleMonths = cycleMonths;
    tenant.note = note;

    saveTenants();
    closeModal();
    renderTenantList();
    showToast('房客信息已更新');
}

function deleteTenant(tenantId) {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    showConfirmModal('删除房客', `确定要删除房客"${tenant.name}"吗？`, () => {
        tenants = tenants.filter(t => t.id !== tenantId);
        paymentRecords = paymentRecords.filter(r => r.tenantId !== tenantId);
        saveTenants();
        saveRecords();
        closeConfirmModal();
        renderTenantList();
        showToast('房客已删除');
    });
}

function showPayModal(tenantId) {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const next = getNextPaymentDate(tenant);

    const bodyHtml = `
        <div class="form-group">
            <label>房客</label>
            <input type="text" value="${tenant.name}" readonly>
        </div>
        <div class="form-group">
            <label>租金金额</label>
            <input type="text" value="${formatCurrency(tenant.rent)}" readonly>
        </div>
        <div class="form-group">
            <label>交租周期</label>
            <input type="text" value="每${tenant.cycleMonths}个月" readonly>
        </div>
        <div class="form-group">
            <label>本次交租月份</label>
            <input type="text" value="${next.dateStr}" readonly>
        </div>
        <div class="form-group">
            <label>确认日期 *</label>
            <input type="date" id="pay-confirm-date" value="${formatDate(new Date())}" required>
        </div>
        <div class="form-group">
            <label>确认人</label>
            <input type="text" id="pay-confirmed-by" placeholder="请输入确认人姓名">
        </div>
        <div class="form-group">
            <label>备注</label>
            <textarea id="pay-note" rows="2" placeholder="可选备注信息，如支付方式等"></textarea>
        </div>
    `;

    const footerHtml = `
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-success" onclick="confirmPayment('${tenant.id}')">确认已交租</button>
    `;

    showModal('确认交租', bodyHtml, footerHtml);
}

function confirmPayment(tenantId) {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const confirmDate = document.getElementById('pay-confirm-date').value;
    const confirmedBy = document.getElementById('pay-confirmed-by').value.trim();
    const note = document.getElementById('pay-note').value.trim();

    if (!confirmDate) {
        showToast('请选择确认日期');
        return;
    }

    const next = getNextPaymentDate(tenant);

    const record = {
        id: generateId(),
        tenantId: tenant.id,
        tenantName: tenant.name,
        amount: tenant.rent,
        period: next.dateStr,
        confirmDate: confirmDate,
        confirmedBy: confirmedBy,
        note: note,
        createdAt: new Date().toISOString()
    };

    paymentRecords.unshift(record);
    saveRecords();
    closeModal();
    renderPaymentRecords();
    renderRentReminders();
    showToast('交租确认成功');
}

function renderPaymentRecords() {
    const container = document.getElementById('payment-records');
    const noRecords = document.getElementById('no-records');

    if (paymentRecords.length === 0) {
        container.innerHTML = '';
        noRecords.style.display = 'block';
        return;
    }

    noRecords.style.display = 'none';

    container.innerHTML = paymentRecords.map(record => {
        return `
            <div class="record-card">
                <div class="record-header">
                    <span class="record-tenant">${record.tenantName}</span>
                    <span class="record-amount">${formatCurrency(record.amount)}</span>
                </div>
                <div class="record-date">
                    交租月份: ${record.period} | 确认日期: ${record.confirmDate}
                    ${record.confirmedBy ? ` | 确认人: ${record.confirmedBy}` : ''}
                </div>
                ${record.note ? `<div class="record-note">${record.note}</div>` : ''}
                <div class="card-actions">
                    <button class="btn btn-danger" onclick="deleteRecord('${record.id}')">删除记录</button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteRecord(recordId) {
    showConfirmModal('删除记录', '确定要删除这条交租记录吗？', () => {
        paymentRecords = paymentRecords.filter(r => r.id !== recordId);
        saveRecords();
        closeConfirmModal();
        renderPaymentRecords();
        showToast('记录已删除');
    });
}

function renderRentReminders() {
    const container = document.getElementById('rent-reminders');
    const noReminders = document.getElementById('no-reminders');

    const reminders = tenants.map(tenant => {
        const status = getPaymentStatus(tenant);
        const next = getNextPaymentDate(tenant);
        return {
            tenant,
            status,
            next
        };
    }).sort((a, b) => {
        const statusOrder = { overdue: 0, warning: 1, pending: 2 };
        return statusOrder[a.status.status] - statusOrder[b.status.status];
    });

    if (reminders.length === 0) {
        container.innerHTML = '';
        noReminders.style.display = 'block';
        return;
    }

    noReminders.style.display = 'none';

    container.innerHTML = reminders.map(r => {
        let statusText = '';
        let statusClass = '';

        if (r.status.status === 'overdue') {
            statusText = '已逾期';
            statusClass = 'overdue';
        } else if (r.status.status === 'warning') {
            statusText = '即将到期';
            statusClass = 'warning';
        } else {
            statusText = '待交租';
            statusClass = 'pending';
        }

        return `
            <div class="rent-card ${r.status.status}" onclick="showTenantDetail('${r.tenant.id}')">
                <div class="tenant-name">${r.tenant.name}</div>
                <div class="rent-info">
                    <span class="rent-amount">${formatCurrency(r.tenant.rent)}</span>
                    <span class="rent-date">${r.tenant.cycleMonths === 1 ? '每月' : '每' + r.tenant.cycleMonths + '月'}${r.tenant.paymentDay}号</span>
                </div>
                <div>
                    <span class="status-badge ${statusClass}">${statusText} - ${r.status.days === 0 ? '今天' : r.status.days + '天后'}</span>
                </div>
            </div>
        `;
    }).join('');
}

function exportData() {
    const data = {
        tenants,
        paymentRecords,
        settings,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent-reminder-backup-${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.tenants && data.paymentRecords) {
                showConfirmModal('导入数据', `确定要导入数据吗？这将覆盖当前所有数据。`, () => {
                    tenants = data.tenants || [];
                    paymentRecords = data.paymentRecords || [];
                    if (data.settings) {
                        settings = data.settings;
                        document.getElementById('reminder-days').value = settings.reminderDays;
                        document.getElementById('reminder-time').value = settings.reminderTime;
                    }
                    saveTenants();
                    saveRecords();
                    saveSettings();
                    closeConfirmModal();
                    renderTenantList();
                    renderPaymentRecords();
                    renderRentReminders();
                    showToast('数据导入成功');
                });
            } else {
                showToast('无效的数据文件');
            }
        } catch (err) {
            showToast('导入失败：文件格式错误');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function clearAllData() {
    showConfirmModal('清除所有数据', '确定要清除所有数据吗？此操作不可恢复！', () => {
        tenants = [];
        paymentRecords = [];
        saveTenants();
        saveRecords();
        closeConfirmModal();
        renderTenantList();
        renderPaymentRecords();
        renderRentReminders();
        showToast('所有数据已清除');
    });
}

document.getElementById('reminder-days').addEventListener('change', function() {
    settings.reminderDays = parseInt(this.value);
    saveSettings();
    renderRentReminders();
});

document.getElementById('reminder-time').addEventListener('change', function() {
    settings.reminderTime = this.value;
    saveSettings();
});

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    renderRentReminders();
    renderTenantList();
    renderPaymentRecords();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('ServiceWorker registration failed:', err);
        });
    }
});
