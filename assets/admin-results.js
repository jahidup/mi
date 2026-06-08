document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('resultsTab');
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const state = {
    categories: [],
    results: [],
    categoryFields: [],
    categoryMode: 'pdf',
    editingResult: null
  };

  const standardFieldMap = {
    name: 'studentName',
    student_name: 'studentName',
    student_s_name: 'studentName',
    candidate_name: 'studentName',
    father_name: 'fatherName',
    fathers_name: 'fatherName',
    father_s_name: 'fatherName',
    mother_name: 'motherName',
    mothers_name: 'motherName',
    mother_s_name: 'motherName',
    mobile: 'mobile',
    mobile_number: 'mobile',
    phone: 'mobile',
    class: 'className',
    class_name: 'className',
    roll_no: 'rollNumber',
    roll_number: 'rollNumber',
    session: 'session',
    academic_session: 'session'
  };

  function sanitize(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }

  function attr(value) {
    return sanitize(value).replace(/"/g, '&quot;');
  }

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `field_${Date.now()}`;
  }

  function toInputDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN');
  }

  function flash(message, isError = false) {
    let box = document.getElementById('adminResultMessage');
    if (!box) {
      box = document.createElement('div');
      box.id = 'adminResultMessage';
      root.prepend(box);
    }
    box.className = `result-inline-message ${isError ? 'error' : 'success'}`;
    box.textContent = message;
    window.clearTimeout(box._timer);
    box._timer = window.setTimeout(() => {
      box.textContent = '';
      box.className = 'result-inline-message';
    }, 3500);
  }

  async function requestJson(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  function showPage(page) {
    document.querySelectorAll('#resultsTab .result-page').forEach((item) => item.classList.remove('active'));
    if (page === 'category') $('adminCategoryPage')?.classList.add('active');
    else if (page === 'editor') $('adminResultEditorPage')?.classList.add('active');
    else $('adminResultListPage')?.classList.add('active');
  }

  function selectedCategory() {
    const id = $('adminResultCategorySelect')?.value;
    return state.categories.find((category) => category._id === id) || null;
  }

  function setRequired(ids, required) {
    ids.forEach((id) => {
      const element = $(id);
      if (element) element.required = required;
    });
  }

  function setCategoryMode(mode) {
    state.categoryMode = mode === 'builder' ? 'builder' : 'pdf';
    document.querySelectorAll('#adminCategoryMode button').forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === state.categoryMode);
    });
    const setup = $('adminBuilderFieldSetup');
    if (setup) setup.style.display = state.categoryMode === 'builder' ? '' : 'none';
    if (state.categoryMode === 'builder' && state.categoryFields.length === 0) {
      state.categoryFields = [
        { key: 'name', label: 'Name', type: 'text', required: true, showOnMarksheet: true },
        { key: 'father_name', label: 'Father Name', type: 'text', required: false, showOnMarksheet: true }
      ];
    }
    renderCategoryFieldList();
  }

  function renderCategoryFieldList() {
    const list = $('adminCategoryFieldList');
    if (!list) return;
    if (state.categoryMode !== 'builder') {
      list.innerHTML = '';
      return;
    }
    if (!state.categoryFields.length) {
      list.innerHTML = '<div class="result-muted">No student info titles yet.</div>';
      return;
    }
    list.innerHTML = state.categoryFields.map((field, index) => `
      <div class="result-chip">
        <div><strong>${sanitize(field.label)}</strong><small>${field.required ? 'Required' : 'Optional'}</small></div>
        <button class="btn-sm btn-danger remove-category-field" type="button" data-index="${index}">Remove</button>
      </div>
    `).join('');
    list.querySelectorAll('.remove-category-field').forEach((button) => {
      button.addEventListener('click', () => {
        state.categoryFields.splice(Number(button.dataset.index), 1);
        renderCategoryFieldList();
      });
    });
  }

  function resetCategoryForm() {
    $('adminCategoryForm')?.reset();
    $('adminCategoryId').value = '';
    state.categoryFields = [];
    setCategoryMode('pdf');
  }

  function renderCategoryList() {
    const list = $('adminCategoryList');
    if (!list) return;
    if (!state.categories.length) {
      list.innerHTML = '<div class="result-muted">No category created yet.</div>';
      return;
    }
    list.innerHTML = state.categories.map((category) => `
      <div class="result-category-item">
        <div>
          <strong>${sanitize(category.name)}</strong>
          <small>${category.mode === 'pdf' ? 'Via PDF Link' : 'Create Marksheet'}${category.fields?.length ? ` - ${category.fields.length} titles` : ''}</small>
        </div>
        <div class="result-row-actions">
          <button class="btn-sm btn-edit edit-category" type="button" data-id="${category._id}">Edit</button>
          <button class="btn-sm btn-danger delete-category" type="button" data-id="${category._id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.edit-category').forEach((button) => {
      button.addEventListener('click', () => {
        const category = state.categories.find((item) => item._id === button.dataset.id);
        if (!category) return;
        $('adminCategoryId').value = category._id;
        $('adminCategoryTitle').value = category.name || '';
        state.categoryFields = Array.isArray(category.fields) ? category.fields.map((field) => ({ ...field })) : [];
        setCategoryMode(category.mode);
      });
    });

    list.querySelectorAll('.delete-category').forEach((button) => {
      button.addEventListener('click', async () => {
        if (button.dataset.confirm !== 'true') {
          button.dataset.confirm = 'true';
          button.textContent = 'Confirm';
          window.setTimeout(() => {
            button.dataset.confirm = '';
            button.textContent = 'Delete';
          }, 3000);
          return;
        }
        try {
          await requestJson(`/api/admin/result-categories/${button.dataset.id}`, { method: 'DELETE' });
          await loadCategories();
          await loadResults();
          flash('Category deleted.');
        } catch (err) {
          flash(err.message, true);
        }
      });
    });
  }

  function renderCategoryControls() {
    const filter = $('adminResultCategoryFilter');
    const select = $('adminResultCategorySelect');
    const options = state.categories.map((category) => (
      `<option value="${category._id}">${sanitize(category.name)} (${category.mode === 'pdf' ? 'PDF' : 'Marksheet'})</option>`
    )).join('');

    if (filter) {
      filter.innerHTML = '<option value="all">All Categories</option>' + state.categories.map((category) => (
        `<option value="${sanitize(category.name)}">${sanitize(category.name)}</option>`
      )).join('');
    }
    if (select) {
      select.innerHTML = state.categories.length ? options : '<option value="">Create a category first</option>';
    }
  }

  async function loadCategories() {
    try {
      state.categories = await requestJson('/api/admin/result-categories');
      state.categories = state.categories.map((category) => ({
        ...category,
        mode: category.mode === 'pdf' ? 'pdf' : 'builder',
        fields: Array.isArray(category.fields) ? category.fields : []
      }));
      renderCategoryControls();
      renderCategoryList();
      renderResultFormFields();
    } catch (err) {
      flash(err.message || 'Could not load categories.', true);
    }
  }

  function renderResultTable() {
    const tbody = document.querySelector('#adminResultsTable tbody');
    if (!tbody) return;
    const filter = $('adminResultCategoryFilter')?.value || 'all';
    const visibleResults = filter === 'all'
      ? state.results
      : state.results.filter((result) => result.categoryName === filter);

    if (!visibleResults.length) {
      tbody.innerHTML = '<tr><td colspan="6">No results yet.</td></tr>';
      return;
    }

    tbody.innerHTML = visibleResults.map((result) => `
      <tr>
        <td>${sanitize(result.categoryName || 'General Result')}</td>
        <td>${sanitize(result.studentName)}</td>
        <td>${formatDate(result.dob)}</td>
        <td>${result.resultMode === 'pdf' ? 'PDF Link' : 'Marksheet'}</td>
        <td><span class="result-status ${result.published ? 'published' : 'draft'}">${result.published ? 'Published' : 'Draft'}</span></td>
        <td>
          <div class="result-row-actions">
            <button class="btn-sm btn-edit edit-result-page" type="button" data-id="${result._id}">Edit</button>
            <button class="btn-sm btn-danger delete-result-page" type="button" data-id="${result._id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit-result-page').forEach((button) => {
      button.addEventListener('click', () => {
        const result = state.results.find((item) => item._id === button.dataset.id);
        openResultEditor(result);
      });
    });

    tbody.querySelectorAll('.delete-result-page').forEach((button) => {
      button.addEventListener('click', async () => {
        if (button.dataset.confirm !== 'true') {
          button.dataset.confirm = 'true';
          button.textContent = 'Confirm';
          window.setTimeout(() => {
            button.dataset.confirm = '';
            button.textContent = 'Delete';
          }, 3000);
          return;
        }
        try {
          await requestJson(`/api/admin/results/${button.dataset.id}`, { method: 'DELETE' });
          await loadResults();
          flash('Result deleted.');
        } catch (err) {
          flash(err.message, true);
        }
      });
    });
  }

  async function loadResults() {
    try {
      state.results = await requestJson('/api/admin/results');
      renderResultTable();
    } catch (err) {
      const tbody = document.querySelector('#adminResultsTable tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6">Failed to load results.</td></tr>';
      flash(err.message || 'Could not load results.', true);
    }
  }

  function getStandardTarget(field) {
    return standardFieldMap[field.key] || standardFieldMap[slugify(field.label)] || '';
  }

  function getFieldValue(result, field) {
    if (!result) return '';
    const target = getStandardTarget(field);
    if (target) return result[target] || '';
    return result.customFields?.[field.key] || '';
  }

  function hasStudentNameField(category) {
    return (category?.fields || []).some((field) => getStandardTarget(field) === 'studentName');
  }

  function renderResultFormFields(result = state.editingResult) {
    const category = selectedCategory();
    const mode = category?.mode || 'pdf';
    const modeDisplay = $('adminResultModeDisplay');
    if (modeDisplay) modeDisplay.value = mode === 'pdf' ? 'Via PDF Link' : 'Create Marksheet';

    const pdfFields = $('adminPdfResultFields');
    const builderFields = $('adminBuilderResultFields');
    if (pdfFields) pdfFields.style.display = mode === 'pdf' ? '' : 'none';
    if (builderFields) builderFields.style.display = mode === 'builder' ? '' : 'none';
    setRequired(['adminPdfStudentName', 'adminPdfDob', 'adminPdfLink'], mode === 'pdf');
    setRequired(['adminBuilderDob'], mode === 'builder');

    if (mode === 'pdf') {
      $('adminPdfStudentName').value = result?.studentName || '';
      $('adminPdfDob').value = toInputDate(result?.dob);
      $('adminPdfLink').value = result?.pdfUrl || '';
      return;
    }

    $('adminBuilderDob').value = toInputDate(result?.dob);
    const fieldHost = $('adminBuilderInfoFields');
    if (!fieldHost) return;
    const fields = category?.fields || [];
    const fallbackName = hasStudentNameField(category)
      ? ''
      : `<div class="form-group"><label for="adminBuilderFallbackName">Name</label><input id="adminBuilderFallbackName" class="admin-builder-info-input" data-key="name" data-label="Name" data-standard="studentName" required value="${attr(result?.studentName || '')}"></div>`;
    fieldHost.innerHTML = fallbackName + fields.map((field) => {
      const target = getStandardTarget(field);
      const inputId = `builderField_${field.key}`;
      const required = field.required ? 'required' : '';
      return `<div class="form-group">
        <label for="${inputId}">${sanitize(field.label)}</label>
        <input id="${inputId}" class="admin-builder-info-input" data-key="${attr(field.key)}" data-label="${attr(field.label)}" data-standard="${attr(target)}" ${required} value="${attr(getFieldValue(result, field))}">
      </div>`;
    }).join('');

    $('adminMarksObtained').value = result?.marksObtained ?? '';
    $('adminTotalMarks').value = result?.totalMarks ?? '';
    $('adminPercentage').value = result?.percentage ?? '';
    $('adminGrade').value = result?.grade || '';
    $('adminSubjects').value = (result?.subjects || []).map((subject) => (
      [subject.subject, subject.marksObtained ?? '', subject.maxMarks ?? '', subject.grade || ''].join(' | ')
    )).join('\n');
    $('adminRemarks').value = result?.remarks || '';
  }

  function resetResultForm() {
    $('adminResultForm')?.reset();
    $('adminResultId').value = '';
    state.editingResult = null;
    $('adminResultEditorTitle').textContent = 'Publish Result';
    if (state.categories[0]) $('adminResultCategorySelect').value = state.categories[0]._id;
    renderResultFormFields(null);
  }

  function openResultEditor(result = null) {
    state.editingResult = result;
    $('adminResultEditorTitle').textContent = result ? 'Edit Result' : 'Publish Result';
    $('adminResultId').value = result?._id || '';
    $('adminResultForm')?.reset();
    const categoryId = result?.categoryId?._id || result?.categoryId || state.categories[0]?._id || '';
    if ($('adminResultCategorySelect')) $('adminResultCategorySelect').value = categoryId;
    $('adminResultPublished').checked = Boolean(result?.published);
    renderResultFormFields(result);
    showPage('editor');
  }

  function parseSubjects(text) {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [subject, marksObtained, maxMarks, grade] = line.split('|').map((part) => part.trim());
        return { subject, marksObtained, maxMarks, grade };
      })
      .filter((row) => row.subject);
  }

  function collectBuilderInfo() {
    const standard = {};
    const customFields = {};
    document.querySelectorAll('#adminBuilderInfoFields .admin-builder-info-input').forEach((input) => {
      const value = input.value.trim();
      const target = input.dataset.standard;
      if (target) standard[target] = value;
      else customFields[input.dataset.key] = value;
    });
    return { standard, customFields };
  }

  function appendIfValue(formData, key, value) {
    if (value !== undefined && value !== null) formData.append(key, value);
  }

  async function saveResult(event) {
    event.preventDefault();
    const category = selectedCategory();
    if (!category) {
      flash('Create and select a category first.', true);
      return;
    }

    const formData = new FormData();
    formData.append('categoryId', category._id);
    formData.append('categoryName', category.name);
    formData.append('resultMode', category.mode);
    formData.append('published', $('adminResultPublished').checked);

    if (category.mode === 'pdf') {
      appendIfValue(formData, 'studentName', $('adminPdfStudentName').value.trim());
      appendIfValue(formData, 'dob', $('adminPdfDob').value);
      appendIfValue(formData, 'pdfUrl', $('adminPdfLink').value.trim());
    } else {
      const { standard, customFields } = collectBuilderInfo();
      appendIfValue(formData, 'studentName', standard.studentName || '');
      appendIfValue(formData, 'fatherName', standard.fatherName || '');
      appendIfValue(formData, 'motherName', standard.motherName || '');
      appendIfValue(formData, 'mobile', standard.mobile || '');
      appendIfValue(formData, 'className', standard.className || '');
      appendIfValue(formData, 'rollNumber', standard.rollNumber || '');
      appendIfValue(formData, 'session', standard.session || '');
      appendIfValue(formData, 'dob', $('adminBuilderDob').value);
      appendIfValue(formData, 'marksObtained', $('adminMarksObtained').value);
      appendIfValue(formData, 'totalMarks', $('adminTotalMarks').value);
      appendIfValue(formData, 'percentage', $('adminPercentage').value);
      appendIfValue(formData, 'grade', $('adminGrade').value.trim());
      appendIfValue(formData, 'remarks', $('adminRemarks').value.trim());
      formData.append('subjects', JSON.stringify(parseSubjects($('adminSubjects').value)));
      formData.append('customFields', JSON.stringify(customFields));
      const imageFile = $('adminBuilderStudentImage').files[0];
      if (imageFile) formData.append('studentImage', imageFile);
    }

    const id = $('adminResultId').value;
    try {
      await requestJson(id ? `/api/admin/results/${id}` : '/api/admin/results', {
        method: id ? 'PUT' : 'POST',
        body: formData
      });
      await loadResults();
      resetResultForm();
      showPage('list');
      flash('Result saved.');
    } catch (err) {
      flash(err.message || 'Result save failed.', true);
    }
  }

  async function saveCategory(event) {
    event.preventDefault();
    const id = $('adminCategoryId').value;
    const payload = {
      name: $('adminCategoryTitle').value.trim(),
      mode: state.categoryMode,
      fields: state.categoryMode === 'builder' ? state.categoryFields : []
    };
    try {
      await requestJson(id ? `/api/admin/result-categories/${id}` : '/api/admin/result-categories', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      resetCategoryForm();
      await loadCategories();
      flash('Category saved.');
    } catch (err) {
      flash(err.message || 'Category save failed.', true);
    }
  }

  document.querySelectorAll('#adminCategoryMode button').forEach((button) => {
    button.addEventListener('click', () => setCategoryMode(button.dataset.mode));
  });

  $('addAdminCategoryFieldBtn')?.addEventListener('click', () => {
    const label = $('adminCategoryFieldTitle').value.trim();
    if (!label) {
      flash('Enter a student info title.', true);
      return;
    }
    const keyBase = slugify(label);
    let key = keyBase;
    let count = 2;
    while (state.categoryFields.some((field) => field.key === key)) {
      key = `${keyBase}_${count}`;
      count += 1;
    }
    state.categoryFields.push({
      key,
      label,
      type: 'text',
      required: $('adminCategoryFieldRequired').value === 'true',
      showOnMarksheet: true
    });
    $('adminCategoryFieldTitle').value = '';
    $('adminCategoryFieldRequired').value = 'false';
    renderCategoryFieldList();
  });

  $('adminCategoryForm')?.addEventListener('submit', saveCategory);
  $('resetAdminCategoryBtn')?.addEventListener('click', resetCategoryForm);
  $('adminResultForm')?.addEventListener('submit', saveResult);
  $('resetAdminResultBtn')?.addEventListener('click', resetResultForm);
  $('adminResultCategorySelect')?.addEventListener('change', () => renderResultFormFields(null));
  $('adminResultCategoryFilter')?.addEventListener('change', renderResultTable);
  $('refreshAdminResultsBtn')?.addEventListener('click', loadResults);
  $('openResultCategoryPageBtn')?.addEventListener('click', () => {
    resetCategoryForm();
    showPage('category');
  });
  $('openResultCreatePageBtn')?.addEventListener('click', () => {
    resetResultForm();
    showPage('editor');
  });
  document.querySelectorAll('.result-back-btn').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.resultPage || 'list'));
  });

  Promise.all([loadCategories(), loadResults()]).then(() => {
    if (state.categories[0]) $('adminResultCategorySelect').value = state.categories[0]._id;
    renderResultFormFields();
  });
});
