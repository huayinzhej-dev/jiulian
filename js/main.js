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
    cb: {
      // 后台「内容管理 → 跨境电商卡片」维护；这里只是后台一条都没填时的兜底
      img: '',
      type: 'contact',
      wa: '60167241814',
      badge: { en: 'Cross-border', bm: 'Lintas Sempadan', zh: '跨境电商' },
      title: { en: 'Cross-border E-commerce', bm: 'E-dagang Lintas Sempadan', zh: '跨境电商' },
      desc: {
        en: 'One-stop packaging for cross-border sellers — retail-ready cartons and mailers that meet overseas marketplace labelling and transit requirements, made from FSC® certified material with low MOQ and export-direct delivery.',
        bm: 'Pembungkusan sehala untuk penjual lintas sempadan — karton dan penghantar sedia runcit yang memenuhi keperluan penandaan serta pengangkutan pasaran luar, dihasilkan daripada bahan bersijil FSC® dengan MOQ rendah dan penghantaran terus eksport.',
        zh: '为跨境卖家提供一站式包装：符合海外平台贴标与运输要求的零售就绪纸箱与快递盒，采用 FSC® 认证材料，低起订量、可直接出口发货。'
      },
      download: { en: 'Contact Us', bm: 'Hubungi Kami', zh: '联系我们' }
    }
  };

  const certModal = document.getElementById('certModal');
  const certModalOverlay = document.getElementById('certModalOverlay');
  const certModalClose = document.getElementById('certModalClose');

  function openCertModal(certKey) {
    const data = certData[certKey];
    if (!data) return;

    const img = document.getElementById('certModalImg');
    const url = safeUrl(data.img);
    // 没传图也保留左边那一栏、摆占位框：弹窗版式不随「有没有上传图」跳变
    document.getElementById('certModalImage').classList.toggle('is-empty', !url);
    if (url) img.src = url; else img.removeAttribute('src');
    img.alt = data.title[currentLang] || data.title.en;

    const badge = document.getElementById('certModalBadge');
    badge.textContent = data.badge[currentLang] || data.badge.en;
    badge.className = 'cert-modal-badge cert-modal-badge-' + certKey;

    document.getElementById('certModalTitle').textContent = data.title[currentLang] || data.title.en;
    document.getElementById('certModalDesc').textContent = data.desc[currentLang] || data.desc.en;
    document.getElementById('certModalDownloadText').textContent = data.download[currentLang] || data.download.en;

    const dl = document.getElementById('certModalDownload');
    // 类名带 is- 前缀：单叫 contact 会被首页联系版块那条 .contact{padding:96px 0} 命中，按钮被撑成竖条
    dl.classList.toggle('is-contact', data.type === 'contact');
    if (data.type === 'contact') {
      // 前缀写死 + 号码只留数字，后台那一栏填什么都拼不出 javascript: 这类伪协议
      dl.href = 'https://wa.me/' + String(data.wa || '').replace(/\D/g, '');
      dl.target = '_blank';
      dl.rel = 'noopener';
      dl.removeAttribute('download');
    } else {
      dl.href = url;
      dl.removeAttribute('target');
      dl.removeAttribute('rel');
      dl.setAttribute('download', '');
    }

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
  // 首页文案类：整块存成一条文档，后台「内容管理」改了前台就跟着变
  const DOC_COLS = ['settings_banner', 'settings_advantages', 'settings_stats', 'settings_about', 'settings_process'];

  // 三语文案：马来文 / 中文留空时沿用英文，英文也留空时用已经填了的那一语兜底，
  // 否则后台清空一个栏位就会把前台整块刷成空白。
  const str = v => String(v == null ? '' : v).trim();
  function i18nText(node, en, zh, bm) {
    const e = str(en) || str(bm) || str(zh);
    node.setAttribute('data-en', e);
    node.setAttribute('data-bm', str(bm) || e);
    node.setAttribute('data-zh', str(zh) || e);
    node.textContent = e;
    return node;
  }

  function make(tag, cls, en, zh, bm) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (en != null) i18nText(n, String(en), zh, bm);
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

  // 商品没传图时按顺序用这套配色+线框图标（取自 index.html 里那 6 张写死的卡片）。
  // 只放固定字面量，后台填什么都不会进到这里，所以 innerHTML 是安全的。
  const PRODUCT_ART = [
    { bg:'#e8f5e9', stroke:'#1a5632', svg:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' },
    { bg:'#fff3e0', stroke:'#e65100', svg:'<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
    { bg:'#fce4ec', stroke:'#c62828', svg:'<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/>' },
    { bg:'#e3f2fd', stroke:'#1565c0', svg:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
    { bg:'#f3e5f5', stroke:'#7b1fa2', svg:'<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
    { bg:'#e0f2f1', stroke:'#00695c', svg:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>' }
  ];
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
    rows.forEach((p, i) => {
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
        const art = PRODUCT_ART[i % PRODUCT_ART.length];
        pic.style.backgroundColor = art.bg;
        pic.innerHTML = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="' + art.stroke + '" stroke-width="1" aria-hidden="true">' + art.svg + '</svg>';
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

  // 只覆盖后台填了的语言：英文没填就整条不动，中文/马来文没填就各自保留原有内容或沿用英文，
  // 否则会出现「后台只改英文，中文页突然变英文」的倒退。
  function swap(el, en, zh, bm) {
    if (!el) return false;
    const e = String(en == null ? '' : en).trim();
    const z = String(zh == null ? '' : zh).trim();
    const b = String(bm == null ? '' : bm).trim();
    if (!e && !z && !b) return false;
    if (e) { el.setAttribute('data-en', e); el.setAttribute('data-bm', b || e); }
    else if (b) el.setAttribute('data-bm', b);
    if (z) el.setAttribute('data-zh', z);
    return true;
  }

  const zhAttr = els => Array.from(els).map(el => (el ? el.getAttribute('data-zh') || '' : ''));

  // 抓下页面上这一版三语原文，供「后台某一栏留空」时回填；重建 DOM 的版块没有 swap 那样的
  // 「不改就保留原文」能力，不回填就会出现空白洞。
  const orig3 = els => Array.from(els).map(el => ({
    en: el ? str(el.getAttribute('data-en') || el.textContent) : '',
    bm: el ? str(el.getAttribute('data-bm')) : '',
    zh: el ? str(el.getAttribute('data-zh')) : ''
  }));
  const BLANK3 = { en: '', bm: '', zh: '' };

  // 任一语种有内容就算这一行还在；只看英文会让后台只填中文的行整条消失
  const anyText = (o, keys) => !!o && typeof o === 'object' && keys.some(k => str(o[k]));

  // 「1-2 days」这类工期在中文页写成「1-2 天」、马来文页写成「1-2 hari」，后台不用再单独填一遍
  const unitDays = (d, unit, working) => String(d == null ? '' : d)
    .replace(/\bworking\s+days?\b/gi, working).replace(/\bdays?\b/gi, unit).trim();
  const zhDays = d => unitDays(d, '天', '个工作日');
  const bmDays = d => unitDays(d, 'hari', 'hari bekerja');

  function applyBanner(d) {
    if (!d || typeof d !== 'object') return false;
    const ctas = document.querySelectorAll('.hero-ctas a');
    let hit = false;
    hit = swap(document.querySelector('.hero-badge'), d.badge, d.badgeZh, d.badgeBm) || hit;
    hit = swap(document.querySelector('.hero-title'), d.title, d.titleZh, d.titleBm) || hit;
    hit = swap(document.querySelector('.hero-subtitle'), d.subtitle, d.subtitleZh, d.subtitleBm) || hit;
    hit = swap(ctas[0], d.cta1, d.cta1Zh, d.cta1Bm) || hit;
    hit = swap(ctas[1], d.cta2, d.cta2Zh, d.cta2Bm) || hit;
    const bg = document.querySelector('.hero-bg');
    const url = safeUrl(d.bg || d.bgUrl || '');
    if (bg && url) bg.style.backgroundImage = `url("${url}")`;
    return hit;
  }

  function applyAdvantages(list) {
    const cards = document.querySelectorAll('.advantages-grid .advantage-card');
    const rows = (Array.isArray(list) ? list : []).filter(a => anyText(a, ['title', 'desc', 'titleBm', 'descBm', 'titleZh', 'descZh']));
    if (!cards.length || !rows.length) return false;
    const zhH = zhAttr(Array.from(cards).map(c => c.querySelector('h3')));
    const zhP = zhAttr(Array.from(cards).map(c => c.querySelector('p')));
    let hit = false;
    rows.slice(0, cards.length).forEach((a, i) => {
      hit = swap(cards[i].querySelector('h3'), a.title, a.titleZh || zhH[i], a.titleBm) || hit;
      hit = swap(cards[i].querySelector('p'), a.desc, a.descZh || zhP[i], a.descBm) || hit;
    });
    return hit;
  }

  // 后台「数据展示」的大字栏常填成中文词（精工/速达这类），这里给这几个词固定翻译，
  // 否则英文页会直接显示中文；用词刻意跟中文一样短，太长会在卡片里换行。
  // 后台单独填了某一语种时以填写的为准。
  const STAT_WORD = {
    '精工': { en: 'Craft', bm: 'Teliti' },
    '速达': { en: 'Rapid', bm: 'Pantas' },
    '合规': { en: 'Certified', bm: 'Pematuhan' },
    '定制': { en: 'Custom', bm: 'Tempahan' }
  };
  function statNum(raw, lang) {
    const w = STAT_WORD[str(raw)];
    if (!w) return str(raw);
    return lang === 'zh' ? str(raw) : str(w[lang]);
  }

  function applyStats(list) {
    const host = document.querySelector('.about-stats');
    const rows = (Array.isArray(list) ? list : []).filter(s => anyText(s, ['num', 'numBm', 'numZh', 'label', 'labelBm', 'labelZh']));
    if (!host || !rows.length) return false;
    const on = orig3(host.querySelectorAll('.about-stat-number'));
    const ol = orig3(host.querySelectorAll('.about-stat-label'));
    host.textContent = '';
    rows.forEach((s, i) => {
      const n = on[i] || BLANK3, o = ol[i] || BLANK3;
      // 大字那栏也可能是文字（精工/速达这类），同样分三语；某一栏没填就先退回本页原文，
      // 再退回这行已经填过的任一种语言，避免出现一张空卡
      const base = str(s.num) || n.en || str(s.numBm) || str(s.numZh);
      const label = str(s.label) || o.en || str(s.labelBm) || str(s.labelZh);
      const box = make('div', 'about-stat');
      box.appendChild(make('span', 'about-stat-number', statNum(base, 'en'), str(s.numZh) || statNum(base, 'zh'), str(s.numBm) || statNum(base, 'bm')));
      box.appendChild(make('span', 'about-stat-label', label, str(s.labelZh) || o.zh || label, str(s.labelBm) || label));
      host.appendChild(box);
    });
    return true;
  }

  // About 视频区：后台填了链接才允许点开播放；没链接时这块只是封面位，不能装作是按钮
  const VIDEO_HOSTS = [
    { re: /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/i, make: id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` },
    { re: /vimeo\.com\/(?:video\/|channels\/[\w\/]+?\/)?(\d{4,12})/i, make: id => `https://player.vimeo.com/video/${id}?autoplay=1` }
  ];

  function videoSource(url) {
    const s = str(url);
    if (!s) return null;
    for (const h of VIDEO_HOSTS) {
      const m = s.match(h.re);
      if (m) return { tag: 'iframe', src: h.make(m[1]) };
    }
    const direct = safeUrl(s);
    if (/^https:/i.test(direct) && /\.(mp4|webm|ogg|m4v)(\?|#|$)/i.test(direct)) return { tag: 'video', src: direct };
    return null;
  }

  const aboutVideoBox = document.querySelector('.video-placeholder');
  const aboutVideoModal = document.getElementById('aboutVideoModal');
  const aboutVideoFrame = document.getElementById('aboutVideoFrame');

  function closeAboutVideo() {
    if (aboutVideoModal) aboutVideoModal.classList.remove('active');
    if (aboutVideoFrame) aboutVideoFrame.textContent = '';
    document.body.style.overflow = '';
  }

  function openAboutVideo(url) {
    const v = videoSource(url);
    if (!v || !aboutVideoModal || !aboutVideoFrame) return false;
    aboutVideoFrame.textContent = '';
    const node = document.createElement(v.tag);
    node.src = v.src;
    if (v.tag === 'iframe') {
      node.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
      node.allowFullscreen = true;
      node.title = 'Jiulian Packaging';
    } else {
      node.controls = true;
      node.autoplay = true;
      node.playsInline = true;
    }
    aboutVideoFrame.appendChild(node);
    aboutVideoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    return true;
  }

  if (aboutVideoBox) {
    aboutVideoBox.addEventListener('click', () => {
      if (aboutVideoBox.dataset.video) openAboutVideo(aboutVideoBox.dataset.video);
    });
  }
  if (aboutVideoModal && aboutVideoFrame) {
    // 关掉时把播放器摘掉，否则视频在已经看不见的弹窗里还在出声
    aboutVideoModal.addEventListener('click', e => {
      if (e.target === aboutVideoModal || e.target.closest('.guide-modal-close')) closeAboutVideo();
    });
  }

  function applyAbout(d) {
    if (!d || typeof d !== 'object') return false;
    let hit = false;
    const content = document.querySelector('.about-content');
    const h2 = content && content.querySelector('h2.section-title');
    const intro = h2 && h2.nextElementSibling;
    hit = swap(content && content.querySelector('.section-label'), d.label, d.labelZh, d.labelBm) || hit;
    hit = swap(h2, d.title, d.titleZh, d.titleBm) || hit;
    if (intro && intro.tagName === 'P') hit = swap(intro, d.intro, d.introZh, d.introBm) || hit;
    if (aboutVideoBox) {
      hit = swap(aboutVideoBox.querySelector('p'), d.videoText, d.videoTextZh, d.videoTextBm) || hit;
      const poster = safeUrl(d.videoPoster || d.videoPosterUrl || '').replace(/"/g, '%22');
      aboutVideoBox.classList.toggle('has-poster', !!poster);
      aboutVideoBox.style.backgroundImage = poster ? `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)), url("${poster}")` : '';
      // 判据是「这个链接放得出视频吗」，不是「链接框里有没有字」——
      // 填了个网页地址或 javascript: 时不该装作能点
      const vs = videoSource(d.videoUrl);
      aboutVideoBox.classList.toggle('is-inert', !vs);
      aboutVideoBox.dataset.video = vs ? str(d.videoUrl) : '';
      hit = true;
    }
    return hit;
  }

  // 认证区第 4 张卡「跨境电商」：文案、产品组合图、WhatsApp 号码都存在 settings_about 的 cb* 字段里。
  // 不另起一个集合，是因为前台匿名只读已经放行 settings_about；新集合要重新执行一次数据库策略，
  // 用户漏跑就是「后台明明改了，前台却没反应」。
  function applyCb(d) {
    if (!d || typeof d !== 'object') return false;
    // 后台每一栏都是三个字段：英文 cbTitle，马来文 cbTitleBm，中文 cbTitleZh
    const three = base => ({ en: str(d[base]), bm: str(d[base + 'Bm']), zh: str(d[base + 'Zh']) });
    const merge = (target, t) => {
      let got = false;
      ['en', 'bm', 'zh'].forEach(l => { if (t[l]) { target[l] = t[l]; got = true; } });
      return got;
    };
    const cb = certData.cb;
    const title = three('cbTitle');
    const sub = three('cbSub');
    let hit = merge(cb.title, title);
    hit = merge(cb.badge, three('cbBadge')) || hit;
    hit = merge(cb.desc, three('cbDesc')) || hit;
    hit = merge(cb.download, three('cbBtn')) || hit;
    const img = safeUrl(d.cbImage);
    if (img) { cb.img = img; hit = true; }
    const wa = String(d.cbWhatsapp == null ? '' : d.cbWhatsapp).replace(/\D/g, '');
    // 至少 7 位才当号码：「javascript:alert(1)」去掉非数字只剩 1，当号码用会把联系按钮指到一个空号
    if (wa.length >= 7) { cb.wa = wa; hit = true; }

    const card = document.querySelector('.cert-card[data-cert="cb"]');
    if (card) {
      // 卡片上那两行走 swap：某一栏留空就保留 index.html 里写死的原文
      hit = swap(card.querySelector('h3'), title.en, title.zh, title.bm) || hit;
      hit = swap(card.querySelector('p'), sub.en, sub.zh, sub.bm) || hit;
    }
    return hit;
  }

  function applyProcess(steps) {
    const host = document.querySelector('.process-steps');
    const rows = (Array.isArray(steps) ? steps : [])
      .filter(s => anyText(s, ['title', 'desc', 'days', 'titleBm', 'descBm', 'titleZh', 'descZh']));
    if (!host || !rows.length) return false;
    const cards = host.querySelectorAll('.process-step');
    const oh = orig3(Array.from(cards).map(c => c.querySelector('h3')));
    const op = orig3(Array.from(cards).map(c => c.querySelector('p')));
    host.textContent = '';
    rows.forEach((s, i) => {
      if (i) host.appendChild(make('div', 'process-connector'));
      const h = oh[i] || BLANK3, p = op[i] || BLANK3;
      const title = str(s.title) || h.en;
      const en = [str(s.desc) || p.en, str(s.days)].filter(Boolean).join(' ');
      const zh = s.descZh ? [str(s.descZh), zhDays(s.days)].filter(Boolean).join(' ') : (p.zh || en);
      const bm = s.descBm ? [str(s.descBm), bmDays(s.days)].filter(Boolean).join(' ') : (p.bm || en);
      const card = make('div', 'process-step');
      card.appendChild(make('div', 'step-number', String(i + 1).padStart(2, '0')));
      card.appendChild(make('h3', null, title, str(s.titleZh) || h.zh || title, str(s.titleBm) || title));
      card.appendChild(make('p', null, en, zh, bm));
      host.appendChild(card);
    });
    return true;
  }

  // ===== Hero 商品轮播 =====
  // 圆点和箭头只有在真的有多张图时才出现，只有一张时就是个静态图，不显示假控件。
  const HERO_CAR_MS = 5000;

  function heroSlidesOf(car) {
    const host = car.querySelector('.hero-slides');
    return host ? Array.from(host.querySelectorAll('.hero-slide')) : [];
  }

  function initHeroCarousel() {
    const car = document.getElementById('heroCarousel');
    if (!car || car.dataset.heroReady) return;
    car.dataset.heroReady = '1';

    const dotsHost = car.querySelector('.hero-car-dots');
    const host = car.querySelector('.hero-slides');
    if (!host || !dotsHost) return;
    let timer = null;

    const activeIndex = () => heroSlidesOf(car).findIndex(s => s.classList.contains('is-active'));

    function show(i) {
      const list = heroSlidesOf(car);
      if (!list.length) return;
      const n = (i + list.length) % list.length;
      list.forEach((s, k) => s.classList.toggle('is-active', k === n));
      Array.from(dotsHost.children).forEach((d, k) => d.classList.toggle('is-active', k === n));
    }

    function buildUi() {
      const list = heroSlidesOf(car);
      car.classList.toggle('has-many', list.length > 1);
      dotsHost.textContent = '';
      if (list.length < 2) return;
      list.forEach((s, k) => {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'hero-car-dot';
        d.setAttribute('aria-label', 'Image ' + (k + 1));
        d.addEventListener('click', () => { show(k); restart(); });
        dotsHost.appendChild(d);
      });
    }

    // 鼠标悬停或切到别的标签页时停住，免得看着看着自己跳走
    function start() {
      if (timer || heroSlidesOf(car).length < 2) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      timer = setInterval(() => show(activeIndex() + 1), HERO_CAR_MS);
    }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    const prev = car.querySelector('.hero-car-nav.prev');
    const next = car.querySelector('.hero-car-nav.next');
    if (prev) prev.addEventListener('click', () => { show(activeIndex() - 1); restart(); });
    if (next) next.addEventListener('click', () => { show(activeIndex() + 1); restart(); });
    car.addEventListener('mouseenter', stop);
    car.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

    buildUi();
    show(0);
    start();
    // 后台换成新图后要重建圆点，所以把 buildUi 挂在元素上给外面用
    car._heroRefresh = () => { buildUi(); show(0); restart(); };
  }

  function applyHeroShowcase(list) {
    const car = document.getElementById('heroCarousel');
    const host = car && car.querySelector('.hero-slides');
    if (!host) return false;
    const rows = (list || []).filter(p => p && p.status !== 'inactive');
    const built = [];
    rows.forEach(p => {
      const url = safeUrl(p.image || p.imagePath || '');
      if (!url) return;
      const slide = document.createElement('div');
      slide.className = 'hero-slide';
      const img = document.createElement('img');
      img.src = url;
      img.alt = p.name;
      img.addEventListener('error', () => {
        slide.remove();
        if (car._heroRefresh) car._heroRefresh();
      });
      slide.appendChild(img);
      const shade = document.createElement('div');
      shade.className = 'hero-slide-shade';
      slide.appendChild(shade);
      slide.appendChild(make('p', 'hero-slide-caption', p.name, p.nameZh || p.name));
      built.push(slide);
    });
    // 后台还没给商品配图就保留页面里那张演示图，不至于把首页开天窗
    if (!built.length) return false;
    host.textContent = '';
    built.slice(0, 6).forEach(s => host.appendChild(s));
    initHeroCarousel();
    if (car._heroRefresh) car._heroRefresh();
    return true;
  }

  async function loadPublicContent() {
    if (!sb) return;
    let rows;
    try {
      const { data, error } = await sb.from('jl_records')
        .select('collection, payload')
        .in('collection', PUBLIC_COLS.concat(DOC_COLS));
      if (error) return;
      rows = data || [];
    } catch (e) {
      return;
    }
    if (!rows.length) return;

    const bag = {};
    const docs = {};
    rows.forEach(r => {
      if (ROW_COLS.has(r.collection)) (bag[r.collection] = bag[r.collection] || []).push(r.payload);
      else if (DOC_COLS.includes(r.collection) && !docs[r.collection]) docs[r.collection] = r.payload;
    });

    let changed = false;
    const parts = [
      [renderClients, bag.clients],
      [renderProducts, bag.products],
      [applyHeroShowcase, bag.products],
      [renderTestimonials, bag.testimonials],
      [renderFaqs, bag.faqs],
      [applyBanner, docs.settings_banner],
      [applyAdvantages, docs.settings_advantages],
      [applyStats, docs.settings_stats],
      [applyAbout, docs.settings_about],
      [applyCb, docs.settings_about],
      [applyProcess, docs.settings_process]
    ];
    parts.forEach(([fn, data]) => {
      // 单个版块渲染失败不影响整页，保留写死内容
      try { if (fn(data)) changed = true; } catch (e) {}
    });
    if (changed) switchLanguage(currentLang);
  }

  initHeroCarousel();
  initHeroCarousel();
  loadPublicContent();

  switchLanguage('en');
})();
