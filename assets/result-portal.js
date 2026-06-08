document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dobResultCheckForm');
  if (!form) return;

  const categorySelect = document.getElementById('publicResultCategory');
  const errorBox = document.getElementById('dobResultError');
  let categories = [];

  function sanitize(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || '';
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function hideError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/public/result-categories');
      categories = res.ok ? await res.json() : [];
      if (!categorySelect) return;
      if (!categories.length) {
        categorySelect.innerHTML = '<option value="">No category published yet</option>';
        return;
      }
      categorySelect.innerHTML = categories.map((category) => (
        `<option value="${sanitize(category._id)}">${sanitize(category.name)}</option>`
      )).join('');
    } catch (err) {
      if (categorySelect) categorySelect.innerHTML = '<option value="">Could not load categories</option>';
    }
  }

  function renderCustomFields(result) {
    const customFields = document.getElementById('ms-customFields');
    if (!customFields) return;
    const rows = Object.entries(result.customFields || {})
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
      .map(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        return `<div><strong>${sanitize(label)}:</strong> <span>${sanitize(value)}</span></div>`;
      });
    customFields.innerHTML = rows.join('');
    customFields.style.display = rows.length ? 'grid' : 'none';
  }

  function renderSubjects(result) {
    const tbody = document.getElementById('ms-subjects');
    const tableWrap = document.getElementById('marksTableWrap');
    if (!tbody || !tableWrap) return;
    const subjects = Array.isArray(result.subjects) ? result.subjects : [];
    tbody.innerHTML = subjects.map((subject) => `
      <tr>
        <td>${sanitize(subject.subject || '')}</td>
        <td style="text-align:center;">${subject.marksObtained ?? ''}</td>
        <td style="text-align:center;">${subject.maxMarks ?? ''}</td>
        <td style="text-align:center;">${sanitize(subject.grade || '')}</td>
      </tr>
    `).join('');
    tableWrap.style.display = subjects.length ? '' : 'none';
  }

  function renderSummary(result) {
    const summaryWrap = document.getElementById('marksSummaryWrap');
    const hasSummary = result.percentage !== null && result.percentage !== undefined
      || result.totalMarks !== null && result.totalMarks !== undefined
      || result.grade
      || result.remarks;
    if (summaryWrap) summaryWrap.style.display = hasSummary ? 'flex' : 'none';
    setText('ms-percentage', result.percentage !== null && result.percentage !== undefined ? `${result.percentage}%` : '');
    setText('ms-total', result.totalMarks ? `${result.marksObtained || 0}/${result.totalMarks}` : '');
    setText('ms-grade', result.grade || '');
    setText('ms-remarks', result.remarks || '');
  }

  function displayResult(result) {
    const downloadUrl = result.downloadUrl || '#';
    const viewUrl = result.viewUrl || downloadUrl;

    setText('ms-category', (result.categoryName || 'Academic Result').toUpperCase());
    setText('ms-studentName', result.studentName);
    setText('ms-fatherName', result.fatherName);
    setText('ms-regNumber', result.registrationNumber || result.studentId);
    setText('ms-dob', formatDate(result.dob));
    setText('ms-class', result.className || result.class);
    setText('ms-session', result.session);
    setText('ms-rollNumber', result.rollNumber);
    setText('ms-mobile', result.mobile);
    setText('ms-issueDate', formatDate(result.updatedAt || result.issueDate || result.createdAt));

    const photo = document.getElementById('ms-studentPhoto');
    if (photo) {
      if (result.studentImageUrl) {
        photo.src = result.studentImageUrl;
        photo.style.display = '';
      } else {
        photo.style.display = 'none';
      }
    }

    renderCustomFields(result);
    renderSubjects(result);
    renderSummary(result);

    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) downloadBtn.onclick = () => { window.location.href = downloadUrl; };
    const printBtn = document.getElementById('printResultBtn');
    if (printBtn) printBtn.onclick = () => window.print();
    const viewBtn = document.getElementById('viewPdfBtn');
    if (viewBtn) viewBtn.href = viewUrl;

    const pdfPanel = document.getElementById('pdfPanel');
    const pdfFrame = document.getElementById('resultPdfFrame');
    if (pdfPanel && pdfFrame) {
      pdfPanel.style.display = 'grid';
      pdfFrame.src = viewUrl;
    }

    const section = document.getElementById('marksheetSection');
    if (section) {
      section.style.display = 'block';
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError();
    const payload = {
      categoryId: categorySelect?.value || '',
      studentName: document.getElementById('publicStudentName')?.value.trim() || '',
      dob: document.getElementById('publicResultDob')?.value || ''
    };
    if (!payload.studentName || !payload.dob) {
      showError('Student name and DOB are required.');
      return;
    }
    try {
      const res = await fetch('/api/result/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No result found.');
      }
      displayResult(data.result);
    } catch (err) {
      showError(err.message || 'Could not load result.');
      const section = document.getElementById('marksheetSection');
      if (section) section.style.display = 'none';
    }
  });

  loadCategories();
});
