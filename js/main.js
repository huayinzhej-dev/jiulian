(() => {
  let currentLang = 'en';

  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const header = document.getElementById('header');
  const inquiryForm = document.getElementById('inquiryForm');
  const productModal = document.getElementById('productModal');
  const modalClose = document.querySelector('.modal-close');

  // 后端：把官网询价写进共享线索池（配置见 js/sb-config.js）
  const CFG = window.JL_SB || {};
  const sb = (CFG.url && CFG.key && window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(CFG.url, CFG.key)
    : null;

  const pricingData = {
    M1: [
      { sku: 'M1-1', size: '24×22×4', prices: ['1.67', '2.38', '2.49', '1.25', '1.93', '1.36', '1.80'] },
      { sku: 'M1-2', size: '15×14×4.3', prices: ['1.32', '1.85', '2.08', '0.95', '1.48', '1.10', '1.54'] },
      { sku: 'M1-4', size: '18.5×18.5×5', prices: ['1.63', '2.32', '2.55', '1.18', '1.85', '1.30', '1.74'] },
      { sku: 'M1-5', size: '33×21.6×5', prices: ['2.65', '3.77', '4.13', '1.95', '3.15', '1.60', '2.04'] },
      { sku: 'M1-6', size: '22×11.5×5.5', prices: ['1.53', '2.10', '2.39', '1.08', '1.70', '1.20', '1.64'] },
      { sku: 'M1-7', size: '27×10×5.5', prices: ['1.43', '1.97', '2.23', '1.08', '1.71', '1.20', '1.64'] },
      { sku: 'M1-8', size: '28×10×6', prices: ['2.65', '3.67', '4.03', '1.72', '2.83', '1.51', '1.95'] },
      { sku: 'M1-10', size: '30.4×16.5×6.2', prices: ['2.40', '3.34', '3.70', '1.73', '2.40', '1.53', '1.96'] },
      { sku: 'M1-11', size: '28×35.4×6.3', prices: ['3.13', '4.44', '4.80', '2.22', '3.60', '2.08', '2.51'] },
      { sku: 'M1-12', size: '27×27×6.5', prices: ['2.90', '4.10', '4.37', '2.10', '3.46', '1.80', '2.24'] },
      { sku: 'M1-13', size: '30×21×6.5', prices: ['2.80', '3.90', '4.23', '1.99', '3.30', '1.68', '2.11'] }
    ],
    M2: [
      { sku: 'M2-1', size: '24×22×7', prices: ['1.85', '2.60', '2.75', '1.40', '2.10', '1.50', '1.95'] },
      { sku: 'M2-2', size: '15×14×8', prices: ['1.50', '2.05', '2.30', '1.10', '1.65', '1.25', '1.70'] },
      { sku: 'M2-3', size: '20×20×9', prices: ['1.80', '2.55', '2.80', '1.30', '2.00', '1.45', '1.90'] }
    ],
    M3: [
      { sku: 'M3-1', size: '24×22×10', prices: ['2.10', '2.90', '3.10', '1.60', '2.40', '1.70', '2.20'] },
      { sku: 'M3-2', size: '30×25×12', prices: ['2.80', '3.80', '4.10', '2.00', '3.00', '2.10', '2.70'] },
      { sku: 'M3-3', size: '35×30×15', prices: ['3.50', '4.70', '5.10', '2.50', '3.70', '2.60', '3.30'] }
    ]
  };

  function switchLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang === 'bm' ? 'ms' : 'en';

    document.querySelectorAll('[data-en]').forEach(el => {
      const text = el.getAttribute(`data-${lang}`);
      if (text) {
        if (el.tagName === 'OPTION') {
          el.textContent = text;
        } else if (el.childElementCount === 0) {
          el.textContent = text;
        } else {
          const textNode = el.childNodes[0];
          if (textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = text;
          }
        }
      }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    const textarea = document.getElementById('notes') || document.getElementById('message');
    if (textarea) {
      const placeholder = textarea.getAttribute(`data-${lang}-placeholder`);
      if (placeholder) textarea.placeholder = placeholder;
    }
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchLanguage(btn.dataset.lang);
    });
  });

  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
  });

  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
    });
  });

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // FAQ 折叠：用委托绑在容器上，因为内容可能随后由后台数据重新渲染
  const faqList = document.querySelector('.faq-list');
  if (faqList) {
    faqList.addEventListener('click', (e) => {
      const btn = e.target.closest('.faq-question');
      if (!btn) return;
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('active');

      faqList.querySelectorAll('.faq-item.active').forEach(openItem => {
        openItem.classList.remove('active');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // Product Modal
  function openProductModalFromCard(card) {
    const nameEn = card.dataset.nameEn;
    const nameZh = card.dataset.nameZh;
    const descEn = card.dataset.descEn;
    const descZh = card.dataset.descZh;
    const price = card.dataset.price;
    const moq = card.dataset.moq;

    const zh = currentLang === 'zh';
    document.getElementById('modalProductName').textContent = zh ? nameZh : nameEn;
    document.getElementById('modalProductDesc').textContent = zh ? descZh : descEn;
    // 后台没填价格/起订量时整行藏掉，别显示「起价 RM 0.00」这种假数字
    const showLine = (id, txt) => {
      const el = document.getElementById(id);
      el.textContent = txt;
      el.style.display = txt ? '' : 'none';
    };
    showLine('modalPrice', price ? (zh ? `起价 RM ${price}` : `from RM ${price}`) : '');
    showLine('modalMOQ', moq ? (zh ? `起订量: ${moq}件` : `MOQ: ${moq} pcs`) : '');

    renderPricingTable('M1');
    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  const productsGrid = document.querySelector('.products-grid');
  if (productsGrid) {
    productsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (card) openProductModalFromCard(card);
    });
  }

  function renderPricingTable(tab) {
    const tbody = document.getElementById('pricingTableBody');
    const data = pricingData[tab];
    tbody.innerHTML = data.map(row => `
      <tr>
        <td><strong>${row.sku}</strong></td>
        <td>${row.size}</td>
        ${row.prices.map(p => `<td>RM ${p}</td>`).join('')}
      </tr>
    `).join('');
  }

  document.querySelectorAll('.pricing-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pricing-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.textContent.trim().split(' ')[0];
      renderPricingTable(tabName);
    });
  });

  modalClose.addEventListener('click', closeModal);
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeModal();
  });

  function closeModal() {
    productModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.querySelector('.modal-quote-btn').addEventListener('click', () => {
    closeModal();
  });

  // WhatsApp Form Submission
  inquiryForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const boxType = document.getElementById('boxType').value;
    const size = document.getElementById('size').value;
    const quantity = document.getElementById('quantity').value;
    const printing = document.getElementById('printing').value;
    const finishing = document.getElementById('finishing').value;
    const name = document.getElementById('name').value;
    const company = document.getElementById('company').value;
    const notes = document.getElementById('notes').value;

    let message = `Hello Jiulian Packaging! I'd like to get a quote:\n\n`;
    if (boxType) message += `Box Type: ${boxType}\n`;
    if (size) message += `Size: ${size}\n`;
    if (quantity) message += `Quantity: ${quantity}\n`;
    if (printing) message += `Printing: ${printing}\n`;
    if (finishing) message += `Finishing: ${finishing}\n`;
    if (name) message += `\nName: ${name}\n`;
    if (company) message += `Company: ${company}\n`;
    if (notes) message += `\nNotes: ${notes}\n`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/60167241814?text=${encodedMessage}`, '_blank');

    saveLead({ boxType, size, quantity, printing, finishing, name, company, notes });
  });

  function showInquiryStatus(text, tone) {
    let el = document.getElementById('inquiryStatus');
    if (!el) {
      el = document.createElement('p');
      el.id = 'inquiryStatus';
      el.style.cssText = 'margin:10px 0 0;font-size:13px;line-height:1.5';
      inquiryForm.appendChild(el);
    }
    el.textContent = text;
    el.style.color = tone === 'err' ? '#c0392b' : tone === 'ok' ? '#1a5632' : '#6b7280';
  }

  async function saveLead(f) {
    if (!sb) return;                       // 未配置后端时保持原有 WhatsApp 行为
    if (!f.name || !f.name.trim()) {
      showInquiryStatus('请填写姓名，方便我们称呼你 / Please add your name', 'err');
      return;
    }
    const lang = document.documentElement.lang || 'en';
    const id = 'LD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    const payload = {
      id,
      name: f.name.trim(),
      company: (f.company || '').trim(),
      phone: '',
      email: '',
      source: '官网表单',
      boxType: f.boxType || '',
      size: (f.size || '').trim(),
      quantity: parseInt(f.quantity, 10) || 0,
      printing: f.printing || '',
      finishing: f.finishing || '',
      status: 'new',
      assignee: '',
      notes: (f.notes || '').trim(),
      lang,
      created: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '),
      followUps: []
    };
    showInquiryStatus('正在提交…', 'muted');
    try {
      const { error } = await sb.from('jl_records').insert({
        id: 'leads:' + id, collection: 'leads', payload, updated_at: new Date().toISOString()
      });
      if (error) throw new Error(error.message);
      showInquiryStatus('已收到，我们会尽快给你报价 / Received, we will quote you shortly', 'ok');
      inquiryForm.reset();
    } catch (e) {
      showInquiryStatus('提交失败：' + e.message, 'err');
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = header.offsetHeight + 16;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // Guide Modals
  const guideModalMap = {
    measure: document.getElementById('guideModalMeasure'),
    printing: document.getElementById('guideModalPrinting'),
    finishing: document.getElementById('guideModalFinishing')
  };

  document.querySelectorAll('[data-guide]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = link.dataset.guide;
      const modal = guideModalMap[key];
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        navMenu.classList.remove('open');
      }
    });
  });

  // Policy Modals
  const policyModalMap = {
    privacy: document.getElementById('policyModalPrivacy'),
    returns: document.getElementById('policyModalReturns'),
    terms: document.getElementById('policyModalTerms')
  };

  document.querySelectorAll('[data-policy]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = link.dataset.policy;
      const modal = policyModalMap[key];
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        navMenu.classList.remove('open');
      }
    });
  });

  document.querySelectorAll('.guide-modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.guide-modal-overlay').classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  document.querySelectorAll('.guide-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Certificate Modal
  const certData = {
    fsc: {
      img: 'images/certificates/FSC认证证书.png',
      badge: { en: 'FSC® Certified', bm: 'Pensijilan FSC®', zh: 'FSC®认证' },
      title: { en: 'FSC® Certification', bm: 'Pensijilan FSC®', zh: 'FSC®认证' },
      desc: {
        en: 'We are honored to hold Forest Stewardship Council® certification, qualifying us to produce FSC® certified printed products — meeting the highest standards of environmentally responsible and socially beneficial forestry.',
        bm: 'Kami berbesar hati memegang pensijilan Majlis Pemantauan Hutan®, layak menghasilkan produk bercetak FSC® — memenuhi piawaian tertinggi perhutanan yang bertanggungjawab terhadap alam sekitar dan bermanfaat secara sosial.',
        zh: '我们很荣幸获得森林管理委员会®的认证，并有资格生产FSC®认证的印刷产品——符合对环境负责且对社会有益的林业的最高标准。'
      },
      download: { en: 'Download FSC® Certificate ↓', bm: 'Muat Turun Sijil FSC® ↓', zh: '下载 FSC® 证书 ↓' }
    },
    gmi: {
      img: 'images/certificates/GMI认证证书.jpg',
      badge: { en: 'GMI Certified', bm: 'Pensijilan GMI', zh: 'GMI 认证' },
      title: { en: 'GMI Certification', bm: 'Pensijilan GMI', zh: 'GMI 认证' },
      desc: {
        en: 'Certified by SGS & Co as a print facility achieving excellence in lithographic process color and spot color printing. Only FSC® certified companies have the right to label products with the FSC® mark.',
        bm: 'Disahkan oleh SGS & Co sebagai kemudahan cetakan yang mencapai kecemerlangan dalam warna proses litografi dan cetakan warna spot.',
        zh: '通过SGS & Co认证，在胶印过程色和专色印刷方面达到卓越品质。我们的认证涵盖包装盒、纸袋和营销材料。'
      },
      download: { en: 'Download GMI Certificate ↓', bm: 'Muat Turun Sijil GMI ↓', zh: '下载 GMI 证书 ↓' }
    },
    lowes: {
      img: 'images/certificates/LOWES认证证书.png',
      badge: { en: 'LOWES Approved', bm: 'Diluluskan LOWES', zh: 'LOWES 认证' },
      title: { en: 'LOWES Certification', bm: 'Pensijilan LOWES', zh: 'LOWES 认证' },
      desc: {
        en: 'Approved LOWES supplier — meeting strict quality and compliance standards for retail packaging. Certified by SGS & Co for lithographic process color and spot color printing excellence.',
        bm: 'Pembekal LOWES yang diluluskan — memenuhi piawaian kualiti dan pematuhan yang ketat untuk pembungkusan runcit.',
        zh: 'LOWES认证供应商——满足零售包装的严格质量和合规标准。通过SGS & Co胶印过程色和专色印刷认证。'
      },
      download: { en: 'Download LOWES Certificate ↓', bm: 'Muat Turun Sijil LOWES ↓', zh: '下载 LOWES 证书 ↓' }
    },
    iso: {
      img: 'images/certificates/ISO认证证书.png',
      badge: { en: 'ISO 9001:2015', bm: 'ISO 9001:2015', zh: 'ISO 9001:2015' },
      title: { en: 'ISO 9001:2015', bm: 'ISO 9001:2015', zh: 'ISO 9001:2015' },
      desc: {
        en: 'ISO 9001:2015 certified quality management system ensuring consistent product quality, continuous improvement, and customer satisfaction across all our packaging manufacturing processes.',
        bm: 'Sistem pengurusan kualiti ISO 9001:2015 yang disahkan memastikan kualiti produk yang konsisten, penambahbaikan berterusan, dan kepuasan pelanggan.',
        zh: 'ISO 9001:2015认证质量管理体系，确保我们所有包装制造过程中产品质量一致、持续改进和客户满意。'
      },
      download: { en: 'Download ISO Certificate ↓', bm: 'Muat Turun Sijil ISO ↓', zh: '下载 ISO 证书 ↓' }
    }
  };

  const certModal = document.getElementById('certModal');
  const certModalOverlay = document.getElementById('certModalOverlay');
  const certModalClose = document.getElementById('certModalClose');

  function openCertModal(certKey) {
    const data = certData[certKey];
    if (!data) return;

    document.getElementById('certModalImg').src = data.img;
    document.getElementById('certModalImg').alt = data.title[currentLang] || data.title.en;

    const badge = document.getElementById('certModalBadge');
    badge.textContent = data.badge[currentLang] || data.badge.en;
    badge.className = 'cert-modal-badge cert-modal-badge-' + certKey;

    document.getElementById('certModalTitle').textContent = data.title[currentLang] || data.title.en;
    document.getElementById('certModalDesc').textContent = data.desc[currentLang] || data.desc.en;
    document.getElementById('certModalDownloadText').textContent = data.download[currentLang] || data.download.en;
    document.getElementById('certModalDownload').href = data.img;

    certModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCertModal() {
    certModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.cert-card').forEach(card => {
    card.addEventListener('click', () => openCertModal(card.dataset.cert));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCertModal(card.dataset.cert);
      }
    });
  });

  certModalClose.addEventListener('click', closeCertModal);
  certModalOverlay.addEventListener('click', closeCertModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && certModal.classList.contains('active')) {
      closeCertModal();
    }
  });

  // ===== 前台公开内容：从后端读取，读不到就保留页面里写死的兜底 =====
  // 白名单必须与 supabase/schema.sql 的 jl_public_read_content 一致。
  // 多列一个集合 = 对全网访客多暴露一类数据，所以这里绝不写「读全部」。
  const PUBLIC_COLS = ['clients', 'products', 'testimonials', 'faqs'];
  const ROW_COLS = new Set(['clients', 'products', 'testimonials', 'faqs']);

  // 后台每段文字目前只存英文 + 可选中文，马来文沿用英文（与页面原有写法一致）
  function i18nText(node, en, zh) {
    node.setAttribute('data-en', en);
    node.setAttribute('data-bm', en);
    node.setAttribute('data-zh', zh || en);
    node.textContent = en;
    return node;
  }

  function make(tag, cls, en, zh) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (en != null) i18nText(n, String(en), zh);
    return n;
  }

  // 只放行 http(s) 和站内相对路径，挡掉 javascript: 这类伪协议
  function safeUrl(u) {
    if (typeof u !== 'string') return '';
    const s = u.trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (s.indexOf('//') === 0) return '';
    if (s.split(/[?#]/)[0].split('/')[0].indexOf(':') !== -1) return '';
    // 项目里的图片叫「食品包装盒 (12).jpg」，空格不编码的话 img.src 加载不到
    return s.replace(/ /g, '%20');
  }

  const PRODUCT_ICON = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  const FAQ_CHEVRON = '<svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

  function renderClients(list) {
    const host = document.querySelector('.clients-logos');
    const rows = (list || []).filter(c => c && c.name && c.active !== false);
    if (!host || !rows.length) return false;
    host.textContent = '';
    rows.forEach(c => {
      const box = make('div', 'client-logo');
      const url = safeUrl(c.logoUrl || c.logo || c.image);
      if (url) {
        const img = document.createElement('img');
        img.className = 'client-logo-img';
        img.src = url;
        img.alt = c.name;
        img.loading = 'lazy';
        box.appendChild(img);
      } else {
        box.appendChild(make('span', null, c.name));
      }
      host.appendChild(box);
    });
    return true;
  }

  function renderProducts(list) {
    const host = document.querySelector('.products-grid');
    const rows = (list || []).filter(p => p && p.name && p.status !== 'inactive');
    if (!host || !rows.length) return false;
    host.textContent = '';
    rows.forEach(p => {
      const card = make('div', 'product-card');
      card.dataset.product = p.id || '';
      card.dataset.nameEn = p.name;
      card.dataset.nameZh = p.nameZh || p.name;
      card.dataset.descEn = p.desc || '';
      card.dataset.descZh = p.descZh || p.desc || '';
      card.dataset.price = Number(p.price) > 0 ? Number(p.price).toFixed(2) : '';
      card.dataset.moq = Number(p.moq) > 0 ? String(p.moq) : '';

      const pic = make('div', 'product-image');
      const url = safeUrl(p.image);
      if (url) {
        const img = document.createElement('img');
        img.className = 'product-photo';
        img.src = url;
        img.alt = p.name;
        img.loading = 'lazy';
        pic.appendChild(img);
      } else {
        pic.innerHTML = PRODUCT_ICON;
      }
      card.appendChild(pic);

      const info = make('div', 'product-info');
      info.appendChild(make('h3', null, p.name, p.nameZh));
      if (p.desc) info.appendChild(make('p', null, p.desc, p.descZh));

      const meta = make('div', 'product-meta');
      if (card.dataset.price) {
        meta.appendChild(make('span', 'product-price', `from RM ${card.dataset.price}`, `起价 RM ${card.dataset.price}`));
      }
      if (card.dataset.moq) {
        const unit = p.moqUnit || 'pcs';
        meta.appendChild(make('span', 'product-moq', `MOQ: ${card.dataset.moq} ${unit}`, `起订量: ${card.dataset.moq}件`));
      }
      if (meta.childElementCount) info.appendChild(meta);
      card.appendChild(info);
      host.appendChild(card);
    });
    return true;
  }

  function renderTestimonials(list) {
    const host = document.querySelector('.testimonials-grid');
    const rows = (list || []).filter(t => t && t.content && t.active !== false);
    if (!host || !rows.length) return false;
    host.textContent = '';
    rows.forEach(t => {
      const card = make('div', 'testimonial-card');
      const stars = Math.max(1, Math.min(5, parseInt(t.rating, 10) || 5));
      card.appendChild(make('div', 'testimonial-stars', '★'.repeat(stars)));
      card.appendChild(make('blockquote', null, `“${t.content}”`, t.contentZh ? `“${t.contentZh}”` : ''));

      const author = make('div', 'testimonial-author');
      author.appendChild(make('div', 'author-avatar', (t.avatar || (t.name || '?').charAt(0)).toUpperCase()));
      const who = make('div');
      if (t.name) who.appendChild(make('strong', null, t.name));
      const role = [t.position, t.company].filter(Boolean).join(', ');
      if (role) who.appendChild(make('span', null, role));
      author.appendChild(who);
      card.appendChild(author);
      host.appendChild(card);
    });
    return true;
  }

  function renderFaqs(list) {
    const host = document.querySelector('.faq-list');
    const rows = (list || []).filter(f => f && f.question && f.answer)
      .slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
    if (!host || !rows.length) return false;
    host.textContent = '';
    rows.forEach(f => {
      const item = make('div', 'faq-item');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'faq-question';
      btn.setAttribute('aria-expanded', 'false');
      btn.appendChild(make('span', null, f.question, f.questionZh));
      btn.insertAdjacentHTML('beforeend', FAQ_CHEVRON);
      const ans = make('div', 'faq-answer');
      ans.appendChild(make('p', null, f.answer, f.answerZh));
      item.appendChild(btn);
      item.appendChild(ans);
      host.appendChild(item);
    });
    return true;
  }

  async function loadPublicContent() {
    if (!sb) return;
    let rows;
    try {
      const { data, error } = await sb.from('jl_records')
        .select('collection, payload')
        .in('collection', PUBLIC_COLS);
      if (error) return;
      rows = data || [];
    } catch (e) {
      return;
    }
    if (!rows.length) return;

    const bag = {};
    rows.forEach(r => {
      if (ROW_COLS.has(r.collection)) (bag[r.collection] = bag[r.collection] || []).push(r.payload);
    });

    let changed = false;
    const parts = [
      [renderClients, bag.clients],
      [renderProducts, bag.products],
      [renderTestimonials, bag.testimonials],
      [renderFaqs, bag.faqs]
    ];
    parts.forEach(([fn, data]) => {
      // 单个版块渲染失败不影响整页，保留写死内容
      try { if (fn(data)) changed = true; } catch (e) {}
    });
    if (changed) switchLanguage(currentLang);
  }

  loadPublicContent();

  switchLanguage('en');
})();
