/* ======================== app.js – FINAL PREMIUM STREAMING CHAT (v11) ======================== */
document.addEventListener('DOMContentLoaded', function () {
  // ---------- UTILS ----------
  const API_BASE = '';

  function showToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      background: isError ? '#ef4444' : '#10b981', color: 'white', padding: '0.8rem 2rem',
      borderRadius: '50px', zIndex: 9999, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      transition: 'opacity 0.3s'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
  }

  function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ---------- MOBILE NAV (FIXED) ----------
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      navLinks.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', navLinks.classList.contains('active') ? 'true' : 'false');
    });
  }

  document.addEventListener('click', function (e) {
    if (navLinks && !e.target.closest('.navbar')) {
      navLinks.classList.remove('active');
      hamburger?.setAttribute('aria-expanded', 'false');
    }
  });

  // Active link highlighting
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === currentPath || (currentPath === '/' && a.getAttribute('href') === '/')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });

  // ---------- HOME PAGE DYNAMIC CONTENT ----------
  const homeCourses = document.getElementById('homeCourses');
  if (homeCourses) {
    fetch('/api/public/programs')
      .then(res => res.json())
      .then(programs => {
        if (programs.length) {
          homeCourses.innerHTML = programs.slice(0, 4).map(p => `
            <div class="course-card">
              <div class="course-img" style="background:var(--primary-light);">📘</div>
              <div class="course-content">
                <span class="course-tag">${p.category}</span>
                <h3>${p.title}</h3>
                <p>${p.description.substring(0, 100)}...</p>
                <a href="/courses" class="btn-primary">Learn More</a>
              </div>
            </div>
          `).join('');
        }
      }).catch(() => {});
  }

  const homeGallery = document.getElementById('homeGallery');
  if (homeGallery) {
    fetch('/api/public/gallery')
      .then(res => res.json())
      .then(items => {
        if (items.length) {
          homeGallery.innerHTML = items.slice(0, 4).map(item => `
            <div class="gallery-item card">
              <img src="${item.imageUrl}" alt="${item.caption || 'Campus'}" loading="lazy">
            </div>
          `).join('');
        }
      }).catch(() => {});
  }

  const homeEvents = document.getElementById('homeEvents');
  if (homeEvents) {
    fetch('/api/public/events')
      .then(res => res.json())
      .then(events => {
        if (events.length) {
          homeEvents.innerHTML = events.slice(0, 3).map(e => `
            <div class="event-card card" style="padding:1.5rem;">
              <h3>${e.title}</h3>
              <p><strong>${formatDate(e.date)}</strong></p>
              <p>${e.description.substring(0, 80)}...</p>
            </div>
          `).join('');
        }
      }).catch(() => {});
  }

  // Counter animation for stats
  const statNumbers = document.querySelectorAll('.stat-number[data-count]');
  if (statNumbers.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const count = parseInt(el.getAttribute('data-count'));
          let current = 0;
          const increment = Math.ceil(count / 50);
          const timer = setInterval(() => {
            current += increment;
            if (current >= count) {
              el.textContent = count + '+';
              clearInterval(timer);
            } else {
              el.textContent = current + '+';
            }
          }, 30);
          observer.unobserve(el);
        }
      });
    });
    statNumbers.forEach(el => observer.observe(el));
  }

  // Testimonials slider
  const carousel = document.getElementById('testimonialCarousel');
  if (carousel) {
    const cards = carousel.querySelectorAll('.testimonial-card');
    if (cards.length > 1) {
      let current = 0;
      const show = (idx) => { cards.forEach((c, i) => c.style.display = i === idx ? 'block' : 'none'); };
      show(0);
      setInterval(() => { current = (current + 1) % cards.length; show(current); }, 4000);
    }
  }

  // ---------- FAQ ACCORDION ----------
  document.querySelectorAll('.faq-item .faq-question').forEach(btn => {
    btn.addEventListener('click', function () {
      const item = this.closest('.faq-item');
      const parent = item.parentElement;
      parent.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!item.classList.contains('active')) item.classList.add('active');
    });
  });

  // ---------- CONTACT FORM ----------
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        mobile: document.getElementById('mobile').value.trim(),
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value.trim()
      };
      const feedback = document.getElementById('contactFeedback');
      feedback.style.display = 'block';
      feedback.textContent = 'Sending...';
      feedback.style.color = 'var(--slate)';
      try {
        const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await res.json();
        if (result.success) {
          feedback.textContent = 'Thank you! We will get back to you soon.';
          feedback.style.color = '#10b981';
          contactForm.reset();
        } else {
          feedback.textContent = 'Error: ' + (result.error || 'Something went wrong');
          feedback.style.color = '#ef4444';
        }
      } catch (err) {
        feedback.textContent = 'Network error. Please try again.';
        feedback.style.color = '#ef4444';
      }
    });
  }

  // ---------- NEWSLETTER ----------
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Subscribed successfully!');
      newsletterForm.reset();
    });
  }

  // ---------- AI SOLVER (text, image, PDF) ----------
  const solverTabs = document.querySelectorAll('.solver-tab-btn');
  const inputText = document.getElementById('input-text');
  const inputImage = document.getElementById('input-image');
  const inputPdf = document.getElementById('input-pdf');
  if (solverTabs.length) {
    solverTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        solverTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        inputText.classList.add('hidden');
        inputImage.classList.add('hidden');
        inputPdf.classList.add('hidden');
        if (type === 'text') inputText.classList.remove('hidden');
        else if (type === 'image') inputImage.classList.remove('hidden');
        else if (type === 'pdf') inputPdf.classList.remove('hidden');
      });
    });
  }

  const imageFileInput = document.getElementById('imageFileInput');
  const pickImageBtn = document.getElementById('pickImageBtn');
  const imagePreview = document.getElementById('imagePreview');
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const removeImageBtn = document.getElementById('removeImageBtn');
  if (pickImageBtn) {
    pickImageBtn.addEventListener('click', () => imageFileInput.click());
    imageFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => { imagePreviewImg.src = ev.target.result; imagePreview.style.display = 'block'; };
        reader.readAsDataURL(e.target.files[0]);
      }
    });
    removeImageBtn?.addEventListener('click', () => { imageFileInput.value = ''; imagePreview.style.display = 'none'; });
  }

  const pdfFileInput = document.getElementById('pdfFileInput');
  const pickPdfBtn = document.getElementById('pickPdfBtn');
  const pdfPreview = document.getElementById('pdfPreview');
  const pdfFileName = document.getElementById('pdfFileName');
  const removePdfBtn = document.getElementById('removePdfBtn');
  if (pickPdfBtn) {
    pickPdfBtn.addEventListener('click', () => pdfFileInput.click());
    pdfFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) { pdfFileName.textContent = e.target.files[0].name; pdfPreview.style.display = 'block'; }
    });
    removePdfBtn?.addEventListener('click', () => { pdfFileInput.value = ''; pdfPreview.style.display = 'none'; });
  }

  async function solveQuestion(type) {
    const formData = new FormData();
    formData.append('type', type);
    if (type === 'text') {
      const text = document.getElementById('questionText')?.value.trim();
      if (!text) return showToast('Please enter a question.', true);
      formData.append('question', text);
    } else if (type === 'image') {
      if (!imageFileInput.files[0]) return showToast('Please select an image.', true);
      formData.append('file', imageFileInput.files[0]);
      formData.append('question', document.getElementById('imageQuestion')?.value.trim() || '');
    } else if (type === 'pdf') {
      if (!pdfFileInput.files[0]) return showToast('Please select a PDF.', true);
      formData.append('file', pdfFileInput.files[0]);
      formData.append('question', document.getElementById('pdfQuestion')?.value.trim() || '');
    }
    const loadingIndicator = document.getElementById('loadingIndicator');
    const answerBox = document.getElementById('answerBox');
    const answerContent = document.getElementById('answerContent');
    loadingIndicator?.classList.remove('hidden');
    answerBox.style.display = 'none';
    try {
      const res = await fetch('/api/solve-question', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        answerContent.innerHTML = data.answer.replace(/\n/g, '<br>');
        answerBox.style.display = 'block';
      } else {
        answerContent.textContent = data.error || 'An error occurred.';
        answerBox.style.display = 'block';
      }
    } catch (err) {
      answerContent.textContent = 'Network error. Please try again.';
      answerBox.style.display = 'block';
    } finally { loadingIndicator?.classList.add('hidden'); }
  }

  document.getElementById('submitText')?.addEventListener('click', () => solveQuestion('text'));
  document.getElementById('submitImage')?.addEventListener('click', () => solveQuestion('image'));
  document.getElementById('submitPdf')?.addEventListener('click', () => solveQuestion('pdf'));

  document.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('questionText').value = chip.textContent;
      document.querySelector('.solver-tab-btn[data-type="text"]')?.click();
    });
  });

  // ---------- STREAMING CHATBOT (ChatGPT‑style) ----------
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendMessageBtn');
  const typingIndicator = document.getElementById('typingIndicator');

  if (chatMessages && chatInput && sendBtn) {
    let isStreaming = false;

    function createStreamingBubble() {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message bot';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const cursor = document.createElement('span');
      cursor.className = 'streaming-cursor';
      cursor.textContent = '▋';
      bubble.appendChild(cursor);
      messageDiv.appendChild(bubble);
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return { messageDiv, bubble, cursor };
    }

    function addUserMessage(text) {
      const div = document.createElement('div');
      div.className = 'message user';
      div.innerHTML = `<div class="bubble"><p>${sanitize(text)}</p></div>`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
      const msg = chatInput.value.trim();
      if (!msg || isStreaming) return;
      addUserMessage(msg);
      chatInput.value = '';
      isStreaming = true;
      typingIndicator?.classList.add('hidden');

      const { bubble, cursor } = createStreamingBubble();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg })
        });

        if (!response.ok) throw new Error('Server error');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          bubble.innerHTML = formatChatText(fullText);
          bubble.appendChild(cursor);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      } catch (err) {
        bubble.innerHTML = 'Sorry, I faced an issue. Please try again.';
      } finally {
        cursor.remove();
        if (bubble.innerHTML.trim() === '') bubble.innerHTML = 'I received an empty response.';
        isStreaming = false;
        chatInput.focus();
      }
    }

    function formatChatText(text) {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !isStreaming) sendMessage();
    });

    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (!isStreaming) {
          chatInput.value = chip.textContent;
          sendMessage();
        }
      });
    });

    // Lead capture form
    const leadForm = document.getElementById('leadCaptureForm');
    if (leadForm) {
      leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          firstName: document.getElementById('leadFirstName').value,
          class: document.getElementById('leadClass').value,
          interest: document.getElementById('leadInterest').value,
          phone: document.getElementById('leadPhone').value,
          city: document.getElementById('leadCity').value,
          parentName: document.getElementById('leadParentName').value,
          email: document.getElementById('leadEmail').value
        };
        try {
          const res = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          const result = await res.json();
          if (result.success) {
            document.getElementById('leadFeedback').textContent = 'Thank you! Our team will reach out soon.';
            document.getElementById('leadFeedback').classList.remove('hidden');
            leadForm.reset();
          } else alert('Submission failed: ' + (result.error || 'Unknown error'));
        } catch (err) { alert('Network error.'); }
      });
    }
  }

  // ---------- PUBLIC RESULT CHECKER ----------
  const resultForm = document.getElementById('resultCheckForm');
  if (resultForm) {
    resultForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = document.getElementById('studentId')?.value.trim() || document.getElementById('regNumber')?.value.trim();
      const password = document.getElementById('resultPassword')?.value || '';
      const errorDiv = document.getElementById('formError');
      errorDiv.classList.add('hidden');
      try {
        const res = await fetch('/api/result/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, password }) });
        const data = await res.json();
        if (data.success && data.result) {
          displayMarksheet(data.result);
        } else {
          errorDiv.textContent = data.error || 'No result found.';
          errorDiv.classList.remove('hidden');
          document.getElementById('marksheetSection').style.display = 'none';
        }
      } catch (err) {
        errorDiv.textContent = 'Network error.';
        errorDiv.classList.remove('hidden');
      }
    });
  }

  function displayMarksheet(result) {
    const downloadUrl = result.downloadUrl || '#';
    const viewUrl = result.viewUrl || downloadUrl;
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '';
    };

    setText('ms-category', (result.categoryName || 'Academic Marksheet').toUpperCase());
    setText('ms-studentName', result.studentName);
    setText('ms-fatherName', result.fatherName);
    setText('ms-regNumber', result.registrationNumber || result.studentId);
    setText('ms-dob', result.dob ? new Date(result.dob).toLocaleDateString('en-IN') : '');
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

    const customFields = document.getElementById('ms-customFields');
    if (customFields) {
      const fields = Object.entries(result.customFields || {}).filter(([, value]) => value);
      customFields.innerHTML = fields.map(([key, value]) => `<div><strong>${sanitize(key.replace(/_/g, ' '))}:</strong> <span>${sanitize(value)}</span></div>`).join('');
      customFields.style.display = fields.length ? 'grid' : 'none';
    }

    const upgradedSubjectsTbody = document.getElementById('ms-subjects');
    upgradedSubjectsTbody.innerHTML = (result.subjects || []).map(s => `<tr><td>${sanitize(s.subject || '')}</td><td>${s.marksObtained ?? ''}</td><td>${s.maxMarks ?? ''}</td><td>${sanitize(s.grade || '')}</td></tr>`).join('');
    setText('ms-percentage', result.percentage !== null && result.percentage !== undefined ? `${result.percentage}%` : '');
    setText('ms-total', result.totalMarks ? `${result.marksObtained || 0}/${result.totalMarks}` : '');
    setText('ms-grade', result.grade);
    setText('ms-remarks', result.remarks || '-');

    document.getElementById('marksheetSection').style.display = 'block';
    document.getElementById('downloadPdfBtn').onclick = () => { window.location.href = downloadUrl; };
    document.getElementById('printResultBtn').onclick = () => window.print();
    const viewBtn = document.getElementById('viewPdfBtn');
    if (viewBtn) viewBtn.href = viewUrl;
    const pdfPanel = document.getElementById('pdfPanel');
    const pdfFrame = document.getElementById('resultPdfFrame');
    if (pdfPanel && pdfFrame) {
      pdfFrame.src = viewUrl;
      pdfPanel.style.display = 'grid';
    }
    document.getElementById('marksheetSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
    document.getElementById('ms-studentName').textContent = result.studentName;
    document.getElementById('ms-fatherName').textContent = result.fatherName;
    document.getElementById('ms-regNumber').textContent = result.registrationNumber;
    document.getElementById('ms-dob').textContent = new Date(result.dob).toLocaleDateString('en-IN');
    document.getElementById('ms-class').textContent = result.class || '';
    document.getElementById('ms-session').textContent = result.session || '';
    document.getElementById('ms-issueDate').textContent = formatDate(result.issueDate || result.createdAt);
    const subjectsTbody = document.getElementById('ms-subjects');
    subjectsTbody.innerHTML = (result.subjects || []).map(s => `<tr><td>${s.subject}</td><td>${s.marksObtained}</td><td>${s.maxMarks}</td></tr>`).join('');
    document.getElementById('ms-percentage').textContent = (result.percentage || '') + '%';
    document.getElementById('ms-grade').textContent = result.grade || '';
    document.getElementById('ms-remarks').textContent = result.remarks || '—';
    document.getElementById('marksheetSection').style.display = 'block';
    document.getElementById('downloadPdfBtn').onclick = () => window.print();
    document.getElementById('printResultBtn').onclick = () => window.print();
  }

  // ---------- ENROLL FORM ----------
  const enrollForm = document.getElementById('enrollForm');
  if (enrollForm) {
    enrollForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const feedback = document.getElementById('enrollFeedback');
      feedback.style.display = 'block';
      feedback.textContent = 'Submitting...';
      feedback.style.color = 'var(--slate)';
      const data = {
        fullName: document.getElementById('studentName').value.trim(),
        email: document.getElementById('studentEmail').value.trim(),
        mobile: document.getElementById('studentMobile').value.trim(),
        subject: `Enrollment: ${document.getElementById('courseSelect').value}`,
        message: `Class: ${document.getElementById('studentClass').value}\nParent: ${document.getElementById('parentName').value || 'N/A'}\nCity: ${document.getElementById('city').value || 'N/A'}\nAdditional: ${document.getElementById('enrollMessage').value || 'None'}`
      };
      try {
        const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await res.json();
        if (result.success) {
          feedback.textContent = 'Enrollment submitted! We will contact you within 2-4 hours.';
          feedback.style.color = '#10b981';
          enrollForm.reset();
        } else {
          feedback.textContent = 'Error: ' + (result.error || 'Something went wrong');
          feedback.style.color = '#ef4444';
        }
      } catch (err) {
        feedback.textContent = 'Network error.';
        feedback.style.color = '#ef4444';
      }
    });
  }

  // ---------- ADMIN LOGIN ----------
  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value;
      const password = document.getElementById('adminPassword').value;
      const errorEl = document.getElementById('loginError');
      try {
        const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (data.success) window.location.href = '/admin-dashboard';
        else { errorEl.textContent = data.error || 'Login failed'; errorEl.style.display = 'block'; }
      } catch (err) { errorEl.textContent = 'Network error'; errorEl.style.display = 'block'; }
    });
  }

  // ---------- ADMIN DASHBOARD ----------
  const dashboardMain = document.getElementById('dashboardMain');
  if (dashboardMain) {
    fetch('/api/admin/check-auth')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) { window.location.href = '/admin-login'; return; }
        initDashboard();
      })
      .catch(() => { window.location.href = '/admin-login'; });

    function initDashboard() {
      const sidebarLinks = document.querySelectorAll('#sidebarMenu a[data-tab]');
      const allTabs = document.querySelectorAll('.dashboard-tab');
      sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const tabId = link.dataset.tab;
          allTabs.forEach(tab => tab.classList.remove('active'));
          document.getElementById(tabId).classList.add('active');
          sidebarLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          if (tabId === 'dashboardTab') loadDashboardStats();
          else if (tabId === 'leadsTab') loadLeads();
          else if (tabId === 'inquiriesTab') loadInquiries();
          else if (tabId === 'resultsTab') loadAdvancedResults();
          else if (tabId === 'galleryTab') loadGalleryAdmin();
          else if (tabId === 'eventsTab') loadEventsAdmin();
          else if (tabId === 'programsTab') loadProgramsAdmin();
        });
      });

      document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/admin-login';
      });

      loadDashboardStats();
    }

    async function loadDashboardStats() {
      try {
        const res = await fetch('/api/admin/dashboard');
        const data = await res.json();
        document.getElementById('dashboardStats').innerHTML = `
          <div class="stat-card-dash"><h3>AI Chats</h3><div class="stat-value">${data.stats.totalChats}</div></div>
          <div class="stat-card-dash"><h3>AI Solves</h3><div class="stat-value">${data.stats.totalSolves}</div></div>
          <div class="stat-card-dash"><h3>Leads</h3><div class="stat-value">${data.stats.totalLeads}</div></div>
          <div class="stat-card-dash"><h3>Inquiries</h3><div class="stat-value">${data.stats.totalInquiries}</div></div>
          <div class="stat-card-dash"><h3>Results</h3><div class="stat-value">${data.stats.totalResults}</div></div>
        `;
      } catch (err) { console.error(err); }
    }

    // --- INQUIRIES ---
    async function loadInquiries() {
      const tbody = document.querySelector('#inquiriesTable tbody');
      if (!tbody) return;
      const filter = document.getElementById('inquiryStatusFilter').value;
      try {
        const res = await fetch('/api/admin/inquiries');
        let inquiries = await res.json();
        if (filter !== 'all') inquiries = inquiries.filter(i => i.status === filter);
        if (inquiries.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No inquiries found.</td></tr>'; return; }
        tbody.innerHTML = inquiries.map(i => `
          <tr>
            <td>${i.fullName}</td><td>${i.email}</td><td>${i.subject}</td>
            <td>${i.status}</td><td>${formatDate(i.createdAt)}</td>
            <td>
              <select class="status-select" data-id="${i._id}">
                <option ${i.status==='new'?'selected':''}>new</option>
                <option ${i.status==='contacted'?'selected':''}>contacted</option>
                <option ${i.status==='closed'?'selected':''}>closed</option>
              </select>
              <button class="btn-sm btn-danger delete-inquiry" data-id="${i._id}">🗑️</button>
            </td>
          </tr>
        `).join('');
        document.querySelectorAll('.status-select').forEach(select => {
          select.addEventListener('change', async () => {
            await fetch(`/api/admin/inquiries/${select.dataset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: select.value }) });
            loadInquiries();
          });
        });
        document.querySelectorAll('.delete-inquiry').forEach(btn => {
          btn.addEventListener('click', async () => { if (confirm('Delete?')) { await fetch(`/api/admin/inquiries/${btn.dataset.id}`, { method: 'DELETE' }); loadInquiries(); } });
        });
      } catch (err) { console.error(err); }
    }
    document.getElementById('inquiryStatusFilter')?.addEventListener('change', loadInquiries);

    // --- LEADS ---
    async function loadLeads() {
      const tbody = document.querySelector('#leadsTable tbody');
      if (!tbody) return;
      const filter = document.getElementById('leadStatusFilter').value;
      try {
        const res = await fetch('/api/admin/leads');
        if (!res.ok) { tbody.innerHTML = '<tr><td colspan="7">Failed to load leads.</td></tr>'; return; }
        let leads = await res.json();
        if (filter !== 'all') leads = leads.filter(l => l.status === filter);
        if (leads.length === 0) { tbody.innerHTML = '<tr><td colspan="7">No leads found.</td></tr>'; return; }
        tbody.innerHTML = leads.map(l => `
          <tr>
            <td>${l.firstName}</td><td>${l.class}</td><td>${l.interest}</td>
            <td>${l.phone}</td><td>${l.leadScore}</td><td>${l.status}</td>
            <td>
              <select class="lead-status-select" data-id="${l._id}">
                <option ${l.status==='pending'?'selected':''}>pending</option>
                <option ${l.status==='contacted'?'selected':''}>contacted</option>
                <option ${l.status==='converted'?'selected':''}>converted</option>
              </select>
              <button class="btn-sm btn-danger delete-lead" data-id="${l._id}">🗑️</button>
            </td>
          </tr>
        `).join('');
        document.querySelectorAll('.lead-status-select').forEach(select => {
          select.addEventListener('change', async () => {
            await fetch(`/api/admin/leads/${select.dataset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: select.value }) });
            loadLeads();
          });
        });
        document.querySelectorAll('.delete-lead').forEach(btn => {
          btn.addEventListener('click', async () => { if (confirm('Delete?')) { await fetch(`/api/admin/leads/${btn.dataset.id}`, { method: 'DELETE' }); loadLeads(); } });
        });
      } catch (err) { console.error(err); }
    }
    document.getElementById('leadStatusFilter')?.addEventListener('change', loadLeads);

    // --- ADVANCED RESULTS MANAGER ---
    let resultCategories = [];
    let categoryDraftFields = [];
    let advancedResultsCache = [];

    function slugKey(label) {
      return String(label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `field_${Date.now()}`;
    }

    async function loadResultCategories() {
      const res = await fetch('/api/admin/result-categories');
      resultCategories = res.ok ? await res.json() : [];
      const categorySelect = document.getElementById('resCategory');
      const categoryFilter = document.getElementById('resultCategoryFilter');
      if (categorySelect) {
        categorySelect.innerHTML = '<option value="">General Result</option>' + resultCategories.map(cat => `<option value="${cat._id}">${sanitize(cat.name)}</option>`).join('');
      }
      if (categoryFilter) {
        const selected = categoryFilter.value || 'all';
        categoryFilter.innerHTML = '<option value="all">All Categories</option>' + resultCategories.map(cat => `<option value="${cat.name}">${sanitize(cat.name)}</option>`).join('');
        categoryFilter.value = [...categoryFilter.options].some(option => option.value === selected) ? selected : 'all';
      }
      renderCategoryList();
      renderResultCustomFields();
    }

    function selectedResultCategory() {
      const id = document.getElementById('resCategory')?.value;
      return resultCategories.find(cat => cat._id === id) || null;
    }

    function renderResultCustomFields(values = {}) {
      const container = document.getElementById('categoryCustomFields');
      if (!container) return;
      const category = selectedResultCategory();
      const fields = (category?.fields || []).filter(field => field.showOnMarksheet !== false);
      container.innerHTML = fields.map(field => `
        <div class="form-group">
          <label>${sanitize(field.label)}${field.required ? ' *' : ''}</label>
          ${field.type === 'textarea'
            ? `<textarea data-custom-key="${field.key}" rows="3" ${field.required ? 'required' : ''}>${sanitize(values[field.key] || '')}</textarea>`
            : `<input data-custom-key="${field.key}" type="${field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}" value="${sanitize(values[field.key] || '')}" ${field.required ? 'required' : ''}>`}
        </div>
      `).join('');
    }

    function renderCategoryDraftFields() {
      const rows = document.getElementById('categoryFieldRows');
      if (!rows) return;
      rows.innerHTML = categoryDraftFields.map((field, index) => `
        <div class="category-field-row">
          <div><strong>${sanitize(field.label)}</strong><span> ${field.type}${field.required ? ' / required' : ''}${field.showOnMarksheet ? ' / visible' : ''}</span></div>
          <button type="button" class="btn-sm btn-danger remove-category-field" data-index="${index}">Remove</button>
        </div>
      `).join('');
      rows.querySelectorAll('.remove-category-field').forEach(btn => {
        btn.addEventListener('click', () => {
          categoryDraftFields.splice(Number(btn.dataset.index), 1);
          renderCategoryDraftFields();
        });
      });
    }

    function renderCategoryList() {
      const list = document.getElementById('resultCategoryList');
      if (!list) return;
      if (!resultCategories.length) {
        list.innerHTML = '<p>No categories yet. Create one below.</p>';
        return;
      }
      list.innerHTML = resultCategories.map(cat => `
        <div class="category-list-item">
          <div><strong>${sanitize(cat.name)}</strong><br><span>${(cat.fields || []).length} detail fields</span></div>
          <div>
            <button type="button" class="btn-sm btn-edit edit-category" data-id="${cat._id}">Edit</button>
            <button type="button" class="btn-sm btn-danger delete-category" data-id="${cat._id}">Delete</button>
          </div>
        </div>
      `).join('');
      list.querySelectorAll('.edit-category').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = resultCategories.find(item => item._id === btn.dataset.id);
          if (!cat) return;
          document.getElementById('categoryId').value = cat._id;
          document.getElementById('categoryName').value = cat.name;
          document.getElementById('categoryDescription').value = cat.description || '';
          categoryDraftFields = [...(cat.fields || [])];
          renderCategoryDraftFields();
        });
      });
      list.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this category? Existing results will keep their category name.')) return;
          await fetch(`/api/admin/result-categories/${btn.dataset.id}`, { method: 'DELETE' });
          await loadResultCategories();
          loadAdvancedResults();
        });
      });
    }

    function toggleResultMode() {
      const mode = document.getElementById('resResultMode')?.value || 'builder';
      const builder = document.getElementById('builderResultFields');
      const pdf = document.getElementById('pdfResultFields');
      if (builder) builder.style.display = mode === 'builder' ? '' : 'none';
      if (pdf) pdf.style.display = mode === 'pdf' ? '' : 'none';
    }

    function parseSubjectLines(text) {
      return String(text || '').split('\n').map(row => {
        const [subject, marksObtained, maxMarks, grade] = row.split('|').map(part => part?.trim());
        return subject ? { subject, marksObtained, maxMarks, grade } : null;
      }).filter(Boolean);
    }

    function subjectLines(result) {
      return (result.subjects || []).map(s => [s.subject, s.marksObtained ?? '', s.maxMarks ?? '', s.grade || ''].join(' | ')).join('\n');
    }

    function collectCustomFields() {
      const fields = {};
      document.querySelectorAll('#categoryCustomFields [data-custom-key]').forEach(input => {
        fields[input.dataset.customKey] = input.value.trim();
      });
      return fields;
    }

    function openAdvancedResultModal(result = null) {
      document.getElementById('advancedResultModalTitle').textContent = result ? 'Edit Result' : 'Add Result';
      document.getElementById('advancedResultId').value = result?._id || '';
      document.getElementById('advancedResultForm').reset();
      document.getElementById('passwordHint').textContent = result ? '(leave blank to keep old)' : '*';
      document.getElementById('resRegNo').value = result?.registrationNumber || '';
      document.getElementById('resStudentName').value = result?.studentName || '';
      document.getElementById('resFatherName').value = result?.fatherName || '';
      document.getElementById('resMotherName').value = result?.motherName || '';
      document.getElementById('resDob').value = result?.dob ? new Date(result.dob).toISOString().split('T')[0] : '';
      document.getElementById('resMobile').value = result?.mobile || '';
      document.getElementById('resClassName').value = result?.className || '';
      document.getElementById('resRollNumber').value = result?.rollNumber || '';
      document.getElementById('resSession').value = result?.session || '';
      document.getElementById('resResultMode').value = result?.resultMode || 'builder';
      document.getElementById('resCategory').value = result?.categoryId?._id || result?.categoryId || '';
      document.getElementById('resObtain').value = result?.marksObtained ?? '';
      document.getElementById('resTotal').value = result?.totalMarks ?? '';
      document.getElementById('resPercentage').value = result?.percentage ?? '';
      document.getElementById('resGrade').value = result?.grade || '';
      document.getElementById('resSubjects').value = result ? subjectLines(result) : '';
      document.getElementById('resRemarks').value = result?.remarks || '';
      document.getElementById('resPdfUrl').value = result?.pdfUrl || '';
      document.getElementById('resPublished').checked = Boolean(result?.published);
      renderResultCustomFields(result?.customFields || {});
      toggleResultMode();
      document.getElementById('advancedResultModalOverlay').classList.add('active');
    }

    async function loadAdvancedResults() {
      const tbody = document.querySelector('#resultsTable tbody');
      if (!tbody) return;
      try {
        await loadResultCategories();
        const res = await fetch('/api/admin/results');
        advancedResultsCache = await res.json();
        const filter = document.getElementById('resultCategoryFilter')?.value || 'all';
        const results = filter === 'all' ? advancedResultsCache : advancedResultsCache.filter(r => r.categoryName === filter);
        if (!results.length) {
          tbody.innerHTML = '<tr><td colspan="7">No results yet.</td></tr>';
          return;
        }
        tbody.innerHTML = results.map(r => `
          <tr>
            <td>${sanitize(r.registrationNumber)}</td>
            <td>${sanitize(r.categoryName || 'General Result')}</td>
            <td>${sanitize(r.studentName)}</td>
            <td>${sanitize(r.mobile || '-')}</td>
            <td>${r.resultMode === 'pdf' ? 'PDF Link' : 'Generated PDF'}</td>
            <td>${r.published ? 'Published' : 'Draft'}</td>
            <td>
              <button class="btn-sm btn-edit edit-advanced-result" data-id="${r._id}">Edit</button>
              <button class="btn-sm btn-danger delete-advanced-result" data-id="${r._id}">Delete</button>
            </td>
          </tr>
        `).join('');
        document.querySelectorAll('.edit-advanced-result').forEach(btn => btn.addEventListener('click', () => {
          const result = advancedResultsCache.find(item => item._id === btn.dataset.id);
          openAdvancedResultModal(result);
        }));
        document.querySelectorAll('.delete-advanced-result').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('Delete this result?')) return;
          await fetch(`/api/admin/results/${btn.dataset.id}`, { method: 'DELETE' });
          loadAdvancedResults();
        }));
      } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="7">Failed to load results.</td></tr>';
      }
    }

    document.getElementById('addAdvancedResultBtn')?.addEventListener('click', async () => {
      await loadResultCategories();
      openAdvancedResultModal();
    });
    document.getElementById('resultCategoryFilter')?.addEventListener('change', loadAdvancedResults);
    document.getElementById('resCategory')?.addEventListener('change', () => renderResultCustomFields());
    document.getElementById('resResultMode')?.addEventListener('change', toggleResultMode);
    document.getElementById('manageResultCategoryBtn')?.addEventListener('click', async () => {
      document.getElementById('categoryId').value = '';
      document.getElementById('resultCategoryForm').reset();
      categoryDraftFields = [];
      renderCategoryDraftFields();
      await loadResultCategories();
      document.getElementById('resultCategoryModalOverlay').classList.add('active');
    });
    document.getElementById('addCategoryFieldBtn')?.addEventListener('click', () => {
      const label = document.getElementById('categoryFieldLabel').value.trim();
      if (!label) return showToast('Enter a field label.', true);
      categoryDraftFields.push({
        key: slugKey(label),
        label,
        type: document.getElementById('categoryFieldType').value,
        required: document.getElementById('categoryFieldRequired').checked,
        showOnMarksheet: document.getElementById('categoryFieldVisible').checked
      });
      document.getElementById('categoryFieldLabel').value = '';
      document.getElementById('categoryFieldRequired').checked = false;
      document.getElementById('categoryFieldVisible').checked = true;
      renderCategoryDraftFields();
    });
    document.getElementById('resultCategoryForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('categoryId').value;
      const payload = {
        name: document.getElementById('categoryName').value.trim(),
        description: document.getElementById('categoryDescription').value.trim(),
        fields: categoryDraftFields
      };
      const res = await fetch(id ? `/api/admin/result-categories/${id}` : '/api/admin/result-categories', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        return showToast(err.error || 'Category save failed.', true);
      }
      document.getElementById('categoryId').value = '';
      e.target.reset();
      categoryDraftFields = [];
      renderCategoryDraftFields();
      await loadResultCategories();
      showToast('Category saved.');
    });
    document.getElementById('advancedResultForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('advancedResultId').value;
      const formData = new FormData();
      const category = selectedResultCategory();
      formData.append('categoryId', category?._id || '');
      formData.append('categoryName', category?.name || 'General Result');
      formData.append('resultMode', document.getElementById('resResultMode').value);
      formData.append('registrationNumber', document.getElementById('resRegNo').value.trim());
      formData.append('password', document.getElementById('resPassword').value);
      formData.append('studentName', document.getElementById('resStudentName').value.trim());
      formData.append('fatherName', document.getElementById('resFatherName').value.trim());
      formData.append('motherName', document.getElementById('resMotherName').value.trim());
      formData.append('dob', document.getElementById('resDob').value);
      formData.append('mobile', document.getElementById('resMobile').value.trim());
      formData.append('className', document.getElementById('resClassName').value.trim());
      formData.append('rollNumber', document.getElementById('resRollNumber').value.trim());
      formData.append('session', document.getElementById('resSession').value.trim());
      formData.append('marksObtained', document.getElementById('resObtain').value);
      formData.append('totalMarks', document.getElementById('resTotal').value);
      formData.append('percentage', document.getElementById('resPercentage').value);
      formData.append('grade', document.getElementById('resGrade').value.trim());
      formData.append('remarks', document.getElementById('resRemarks').value.trim());
      formData.append('subjects', JSON.stringify(parseSubjectLines(document.getElementById('resSubjects').value)));
      formData.append('customFields', JSON.stringify(collectCustomFields()));
      formData.append('pdfUrl', document.getElementById('resPdfUrl').value.trim());
      formData.append('published', document.getElementById('resPublished').checked);
      const studentImage = document.getElementById('resStudentImage').files[0];
      const resultPdf = document.getElementById('resResultPdf').files[0];
      if (studentImage) formData.append('studentImage', studentImage);
      if (resultPdf) formData.append('resultPdf', resultPdf);
      const res = await fetch(id ? `/api/admin/results/${id}` : '/api/admin/results', { method: id ? 'PUT' : 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        return showToast(err.error || 'Result save failed.', true);
      }
      document.getElementById('advancedResultModalOverlay').classList.remove('active');
      showToast('Result saved.');
      loadAdvancedResults();
    });

    // --- RESULTS CRUD (SIMPLIFIED) ---
    async function loadResults() {
      const tbody = document.querySelector('#resultsTable tbody');
      if (!tbody) return;
      try {
        const res = await fetch('/api/admin/results');
        const results = await res.json();
        if (results.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No results yet.</td></tr>'; return; }
        tbody.innerHTML = results.map(r => `
          <tr>
            <td>${r.registrationNumber}</td>
            <td>${r.studentName}</td>
            <td>${r.fatherName}</td>
            <td>${new Date(r.dob).toLocaleDateString('en-IN')}</td>
            <td>${r.grade || '—'}</td>
            <td>
              <button class="btn-sm btn-edit edit-result" data-id="${r._id}">✏️</button>
              <button class="btn-sm btn-danger delete-result" data-id="${r._id}">🗑️</button>
            </td>
          </tr>
        `).join('');
        document.querySelectorAll('.edit-result').forEach(btn => btn.addEventListener('click', () => editResult(btn.dataset.id)));
        document.querySelectorAll('.delete-result').forEach(btn => btn.addEventListener('click', () => {
          if (confirm('Delete?')) { fetch(`/api/admin/results/${btn.dataset.id}`, { method: 'DELETE' }).then(loadResults); }
        }));
      } catch (err) { console.error(err); }
    }

    document.getElementById('addResultBtn')?.addEventListener('click', () => {
      document.getElementById('resultModalTitle').textContent = 'Add Result';
      document.getElementById('resultId').value = '';
      document.getElementById('resultForm').reset();
      document.getElementById('resultModalOverlay').classList.add('active');
    });

    document.getElementById('resultForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('resultId').value;
      const data = {
        registrationNumber: document.getElementById('resRegNo').value.trim(),
        studentName: document.getElementById('resStudentName').value.trim(),
        fatherName: document.getElementById('resFatherName').value.trim(),
        dob: document.getElementById('resDob').value,
        grade: document.getElementById('resGrade').value.trim(),
        remarks: document.getElementById('resRemarks').value.trim(),
        published: document.getElementById('resPublished').checked
      };
      const url = id ? `/api/admin/results/${id}` : '/api/admin/results';
      const method = id ? 'PUT' : 'POST';
      try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) {
          document.getElementById('resultModalOverlay').classList.remove('active');
          loadResults();
        } else {
          const err = await res.json();
          alert('Error: ' + (err.error || 'Save failed'));
        }
      } catch (err) { alert('Network error'); }
    });

    async function editResult(id) {
      const res = await fetch('/api/admin/results');
      const results = await res.json();
      const r = results.find(r => r._id === id);
      if (!r) return;
      document.getElementById('resultModalTitle').textContent = 'Edit Result';
      document.getElementById('resultId').value = r._id;
      document.getElementById('resRegNo').value = r.registrationNumber;
      document.getElementById('resStudentName').value = r.studentName;
      document.getElementById('resFatherName').value = r.fatherName;
      document.getElementById('resDob').value = new Date(r.dob).toISOString().split('T')[0];
      document.getElementById('resGrade').value = r.grade || '';
      document.getElementById('resRemarks').value = r.remarks || '';
      document.getElementById('resPublished').checked = r.published;
      document.getElementById('resultModalOverlay').classList.add('active');
    }

    document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(o => o.classList.remove('active'));
    }));

    // --- GALLERY ADMIN ---
    document.getElementById('galleryUploadForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('galleryImageInput').files[0];
      const caption = document.getElementById('galleryCaption').value;
      const formData = new FormData();
      formData.append('image', file);
      formData.append('caption', caption);
      await fetch('/api/admin/gallery', { method: 'POST', body: formData });
      loadGalleryAdmin();
    });

    async function loadGalleryAdmin() {
      const grid = document.getElementById('adminGalleryGrid');
      if (!grid) return;
      try {
        const res = await fetch('/api/admin/gallery');
        const items = await res.json();
        if (items.length === 0) { grid.innerHTML = '<p>No images yet.</p>'; return; }
        grid.innerHTML = items.map(item => `
          <div class="gallery-admin-item">
            <img src="${item.imageUrl}" alt="${item.caption}">
            <button class="delete-btn" data-id="${item._id}">🗑️</button>
          </div>
        `).join('');
        document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => { if (confirm('Delete?')) { await fetch(`/api/admin/gallery/${btn.dataset.id}`, { method: 'DELETE' }); loadGalleryAdmin(); } });
        });
      } catch (err) { console.error(err); }
    }

    // --- EVENTS ADMIN ---
    document.getElementById('addEventBtn')?.addEventListener('click', () => {
      document.getElementById('eventModalTitle').textContent = 'Add Event';
      document.getElementById('eventId').value = '';
      document.getElementById('eventForm').reset();
      document.getElementById('eventModalOverlay').classList.add('active');
    });

    document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('eventId').value;
      const formData = new FormData();
      formData.append('title', document.getElementById('evTitle').value);
      formData.append('description', document.getElementById('evDesc').value);
      formData.append('date', document.getElementById('evDate').value);
      const imgFile = document.getElementById('evImage').files[0];
      if (imgFile) formData.append('image', imgFile);
      const url = id ? `/api/admin/events/${id}` : '/api/admin/events';
      await fetch(url, { method: id ? 'PUT' : 'POST', body: formData });
      document.getElementById('eventModalOverlay').classList.remove('active');
      loadEventsAdmin();
    });

    async function loadEventsAdmin() {
      const list = document.getElementById('eventsList');
      if (!list) return;
      try {
        const res = await fetch('/api/admin/events');
        const events = await res.json();
        if (events.length === 0) { list.innerHTML = '<p>No events yet.</p>'; return; }
        list.innerHTML = events.map(e => `
          <div class="card" style="padding:1rem; margin-bottom:0.5rem; display:flex; justify-content:space-between;">
            <div><strong>${e.title}</strong> - ${formatDate(e.date)}</div>
            <div>
              <button class="btn-sm btn-edit edit-event" data-id="${e._id}">✏️</button>
              <button class="btn-sm btn-danger delete-event" data-id="${e._id}">🗑️</button>
            </div>
          </div>
        `).join('');
        document.querySelectorAll('.edit-event').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch('/api/admin/events');
          const events = await res.json();
          const ev = events.find(e => e._id === btn.dataset.id);
          document.getElementById('eventModalTitle').textContent = 'Edit Event';
          document.getElementById('eventId').value = ev._id;
          document.getElementById('evTitle').value = ev.title;
          document.getElementById('evDesc').value = ev.description;
          document.getElementById('evDate').value = new Date(ev.date).toISOString().split('T')[0];
          document.getElementById('eventModalOverlay').classList.add('active');
        }));
        document.querySelectorAll('.delete-event').forEach(btn => {
          btn.addEventListener('click', async () => { if (confirm('Delete?')) { await fetch(`/api/admin/events/${btn.dataset.id}`, { method: 'DELETE' }); loadEventsAdmin(); } });
        });
      } catch (err) { console.error(err); }
    }

    // --- PROGRAMS ADMIN ---
    document.getElementById('addProgramBtn')?.addEventListener('click', () => {
      document.getElementById('programModalTitle').textContent = 'Add Program';
      document.getElementById('programId').value = '';
      document.getElementById('programForm').reset();
      document.getElementById('programModalOverlay').classList.add('active');
    });

    document.getElementById('programForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('programId').value;
      const data = {
        title: document.getElementById('progTitle').value,
        category: document.getElementById('progCategory').value,
        description: document.getElementById('progDesc').value,
        features: document.getElementById('progFeatures').value.split(',').map(s => s.trim()).filter(Boolean),
        image: document.getElementById('progImage').value
      };
      const url = id ? `/api/admin/programs/${id}` : '/api/admin/programs';
      await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      document.getElementById('programModalOverlay').classList.remove('active');
      loadProgramsAdmin();
    });

    async function loadProgramsAdmin() {
      const list = document.getElementById('programsList');
      if (!list) return;
      try {
        const res = await fetch('/api/admin/programs');
        const programs = await res.json();
        if (programs.length === 0) { list.innerHTML = '<p>No programs yet.</p>'; return; }
        list.innerHTML = programs.map(p => `
          <div class="card" style="padding:1rem; margin-bottom:0.5rem; display:flex; justify-content:space-between;">
            <div><strong>${p.title}</strong> (${p.category})</div>
            <div>
              <button class="btn-sm btn-edit edit-program" data-id="${p._id}">✏️</button>
              <button class="btn-sm btn-danger delete-program" data-id="${p._id}">🗑️</button>
            </div>
          </div>
        `).join('');
        document.querySelectorAll('.edit-program').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch('/api/admin/programs');
          const programs = await res.json();
          const pr = programs.find(p => p._id === btn.dataset.id);
          document.getElementById('programModalTitle').textContent = 'Edit Program';
          document.getElementById('programId').value = pr._id;
          document.getElementById('progTitle').value = pr.title;
          document.getElementById('progCategory').value = pr.category;
          document.getElementById('progDesc').value = pr.description;
          document.getElementById('progFeatures').value = pr.features.join(', ');
          document.getElementById('progImage').value = pr.image || '';
          document.getElementById('programModalOverlay').classList.add('active');
        }));
        document.querySelectorAll('.delete-program').forEach(btn => {
          btn.addEventListener('click', async () => { if (confirm('Delete?')) { await fetch(`/api/admin/programs/${btn.dataset.id}`, { method: 'DELETE' }); loadProgramsAdmin(); } });
        });
      } catch (err) { console.error(err); }
    }
  }

  // ---------- PUBLIC GALLERY LIGHTBOX ----------
  const galleryItems = document.querySelectorAll('#galleryGrid .gallery-item');
  if (galleryItems.length) {
    let currentIndex = 0;
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    function openLightbox(index) {
      const item = galleryItems[index];
      lightboxImage.src = item.querySelector('img').src;
      lightboxCaption.textContent = item.dataset.caption || '';
      lightbox.style.display = 'flex';
      currentIndex = index;
    }
    function closeLightbox() { lightbox.style.display = 'none'; }
    function nextImage() { openLightbox((currentIndex + 1) % galleryItems.length); }
    function prevImage() { openLightbox((currentIndex - 1 + galleryItems.length) % galleryItems.length); }
    galleryItems.forEach((item, idx) => item.addEventListener('click', () => openLightbox(idx)));
    document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
    document.getElementById('lightboxOverlay')?.addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev')?.addEventListener('click', prevImage);
    document.getElementById('lightboxNext')?.addEventListener('click', nextImage);
    document.addEventListener('keydown', (e) => {
      if (lightbox.style.display === 'flex') {
        if (e.key === 'ArrowRight') nextImage();
        else if (e.key === 'ArrowLeft') prevImage();
        else if (e.key === 'Escape') closeLightbox();
      }
    });
    document.getElementById('gallerySearch')?.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase();
      galleryItems.forEach(item => {
        const caption = item.dataset.caption?.toLowerCase() || '';
        item.style.display = caption.includes(query) ? '' : 'none';
      });
    });
  }

  // ---------- PUBLIC EVENTS ----------
  const eventsGrid = document.getElementById('eventsGrid');
  if (eventsGrid) {
    fetch('/api/public/events')
      .then(res => res.json())
      .then(events => {
        if (events.length) {
          const upcoming = events.filter(e => new Date(e.date) >= new Date());
          const past = events.filter(e => new Date(e.date) < new Date());
          eventsGrid.innerHTML = upcoming.map(e => `
            <div class="event-card card" style="padding:1.5rem;">
              <h3>${e.title}</h3>
              <p><strong>${formatDate(e.date)}</strong></p>
              <p>${e.description}</p>
            </div>
          `).join('');
          const highlights = document.getElementById('highlightsGrid');
          if (highlights) {
            highlights.innerHTML = past.map(e => `
              <div class="event-card card" style="padding:1.5rem;">
                <h3>${e.title}</h3>
                <p>${formatDate(e.date)}</p>
                <p>${e.description.substring(0, 100)}...</p>
              </div>
            `).join('');
          }
        }
      }).catch(() => {});
  }

  // ---------- AI ASSISTANT PAGE TABS ----------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.assistant-tab-content');
  if (tabBtns.length) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContents.forEach(c => c.classList.add('hidden'));
        document.getElementById('tab-' + tab)?.classList.remove('hidden');
      });
    });
  }
});
